//! macOS-only WKWebView tweaks so Mission Control / App Exposé show a real
//! window thumbnail instead of a blank dark rectangle when Pigeon is backgrounded.

use std::collections::HashSet;
use std::panic::AssertUnwindSafe;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock, Mutex};

use tauri::{WebviewWindow, Wry};

static CONFIGURED: LazyLock<Mutex<HashSet<String>>> = LazyLock::new(|| Mutex::new(HashSet::new()));

/// JS injected once the webview can run script — keeps rAF alive and spoofs visibility
/// so WebKit does not throttle the compositor while the window is in the background.
const COMPOSITOR_KEEPALIVE_SCRIPT: &str = r#"
(function () {
  if (window.__pigeonMacCompositorKeepAlive) return;
  window.__pigeonMacCompositorKeepAlive = true;
  try {
    Object.defineProperty(Document.prototype, "visibilityState", {
      configurable: true,
      get() { return "visible"; },
    });
    Object.defineProperty(Document.prototype, "hidden", {
      configurable: true,
      get() { return false; },
    });
  } catch (_) {}
  (function warm() { requestAnimationFrame(warm); })();
})();
"#;

/// Apply native + JS survival tweaks once the webview is live (never during app setup).
pub fn ensure_configured(window: &WebviewWindow<Wry>) {
    let label = window.label().to_string();
    {
        let configured = CONFIGURED.lock().expect("macos window set lock");
        if configured.contains(&label) {
            return;
        }
    }

    let configured_ok = Arc::new(AtomicBool::new(false));
    let configured_flag = configured_ok.clone();
    let result = window.with_webview(move |platform| {
        configured_flag.store(
            objc2::exception::catch(AssertUnwindSafe(|| {
                apply_native_survival_tweaks(platform.ns_window(), platform.inner())
            }))
            .unwrap_or(false),
            Ordering::Relaxed,
        );
    });

    let native_ok = result.is_ok() && configured_ok.load(Ordering::Relaxed);
    let js_ok = window.eval(COMPOSITOR_KEEPALIVE_SCRIPT).is_ok();

    if native_ok || js_ok {
        let mut configured = CONFIGURED.lock().expect("macos window set lock");
        configured.insert(label);
    }
}

/// Nudge WebKit to commit the latest frame before macOS snapshots the window.
pub fn flush_presentation(window: &WebviewWindow<Wry>) {
    ensure_configured(window);
    let _ = window.with_webview(|platform| {
        let _ = objc2::exception::catch(AssertUnwindSafe(|| {
            flush_webview_presentation(platform.inner());
        }));
    });
}

#[cfg(target_os = "macos")]
fn apply_native_survival_tweaks(
    ns_window_ptr: *mut std::ffi::c_void,
    wk_webview_ptr: *mut std::ffi::c_void,
) -> bool {
    let mut ok = false;
    if objc2::exception::catch(AssertUnwindSafe(|| {
        disable_window_occlusion_detection(ns_window_ptr);
    }))
    .is_ok()
    {
        ok = true;
    }
    if objc2::exception::catch(AssertUnwindSafe(|| {
        set_webview_visibility_visible(wk_webview_ptr);
    }))
    .is_ok()
    {
        ok = true;
    }
    ok
}

#[cfg(target_os = "macos")]
fn disable_window_occlusion_detection(ns_window_ptr: *mut std::ffi::c_void) {
    unsafe {
        use objc2_app_kit::NSWindow;
        use objc2_foundation::{ns_string, NSNumber, NSObjectNSKeyValueCoding};

        let ns_window: &NSWindow = &*ns_window_ptr.cast();
        let no = NSNumber::numberWithBool(false);
        ns_window.setValue_forKey(Some(&no), ns_string!("windowOcclusionDetectionEnabled"));
    }
}

#[cfg(target_os = "macos")]
fn set_webview_visibility_visible(wk_webview_ptr: *mut std::ffi::c_void) {
    unsafe {
        use objc2::msg_send;
        use objc2_web_kit::WKWebView;

        let wk_webview: &WKWebView = &*wk_webview_ptr.cast();
        // PageVisibilityState::Visible — tell WebKit the page stays visible when backgrounded.
        let _: () = msg_send![wk_webview, _setVisibilityState: 0isize];
    }
}

#[cfg(target_os = "macos")]
fn flush_webview_presentation(wk_webview_ptr: *mut std::ffi::c_void) {
    unsafe {
        use block2::RcBlock;
        use objc2::msg_send;
        use objc2_web_kit::WKWebView;

        let wk_webview: &WKWebView = &*wk_webview_ptr.cast();
        let handler = RcBlock::new(|| {});
        let _: () = msg_send![wk_webview, _doAfterNextPresentationUpdate: &*handler];
    }
}
