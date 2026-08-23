import { type RefObject, useEffect, useRef } from "react";
import { HERO_DEMO_STEPS } from "../lib/heroDemoSteps";

const URL_PRE = "https://jsonplaceholder.typicode.com";
const URL_PATH = "/todos/1";

/**
 * Drives the looping hero demo from `HERO_DEMO_STEPS`.
 * Each beat: soft veil blurs/dims the rest; focus targets stay sharp.
 * Calls `onFirstComplete` once after the first full cycle.
 */
export function useHeroDemo(appRef: RefObject<HTMLElement | null>, onFirstComplete?: () => void) {
  const onDone = useRef(onFirstComplete);
  onDone.current = onFirstComplete;

  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const $ = (id: string) => app.querySelector<HTMLElement>(`#${id}`);
    const urlEl = $("demo-url");
    const sendEl = $("demo-send");
    const spinEl = $("demo-spin");
    const statusEl = $("demo-status");
    const timeEl = $("demo-time");
    const sizeEl = $("demo-size");
    const lines = Array.from(app.querySelectorAll<HTMLElement>("#demo-json .ln"));
    const folderEl = $("demo-folder");
    const folderLabel = $("demo-folder-label");
    const folderChild = $("demo-folder-child");
    const cntEl = $("demo-cnt");
    const reqsEl = $("demo-reqs");
    const tabEl = $("demo-tab");
    const tabNameEl = $("demo-tabname");
    const plusEl = $("demo-plus");
    const methodEl = $("demo-method");
    const draftBadge = $("demo-draft-badge");
    const draftTab = $("demo-draft-tab");
    const launchEl = $("demo-launch");
    const launchFast = $("demo-launch-fast");
    const launchSlow = $("demo-launch-slow");
    const dockWrap = $("demo-launch-dock");
    const dockIcon = $("demo-dock-icon");
    const launchCompare = $("demo-launch-compare");
    const launchHeadline = $("demo-launch-headline");
    const jsonEl = $("demo-json");

    if (
      !(
        urlEl &&
        sendEl &&
        spinEl &&
        statusEl &&
        timeEl &&
        sizeEl &&
        folderEl &&
        folderLabel &&
        folderChild &&
        cntEl &&
        reqsEl &&
        tabEl &&
        tabNameEl &&
        plusEl &&
        methodEl &&
        draftBadge &&
        draftTab &&
        launchEl &&
        launchFast &&
        launchSlow &&
        dockWrap &&
        dockIcon &&
        launchCompare &&
        launchHeadline &&
        jsonEl
      )
    ) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const intervals: number[] = [];
    let firstDone = false;
    const STEP_HOLD = 2200;
    let inView = false;
    const shouldRun = () => inView && !document.hidden;

    const after = (ms: number, fn: () => void) => {
      timers.push(
        window.setTimeout(() => {
          if (!shouldRun()) {
            after(200, fn);
            return;
          }
          fn();
        }, ms),
      );
    };

    const setUrl = (preLen: number, pathLen: number, caret: boolean) => {
      urlEl.replaceChildren();
      urlEl.append(URL_PRE.slice(0, preLen));
      if (pathLen > 0) {
        const path = document.createElement("span");
        path.className = "path";
        path.textContent = URL_PATH.slice(0, pathLen);
        urlEl.append(path);
      }
      if (caret) {
        const caretEl = document.createElement("span");
        caretEl.className = "caret";
        urlEl.append(caretEl);
      }
    };

    const closeFolder = () => {
      folderEl.classList.remove("show", "flash", "open");
      folderChild.classList.remove("show");
      folderLabel.textContent = "▸ 📁 jsonplaceholder…";
      cntEl.classList.remove("pop");
    };

    const openFolder = () => {
      folderEl.classList.add("show", "open");
      folderLabel.textContent = "▾ 📁 jsonplaceholder…";
      folderChild.classList.add("show");
    };

    const clearHighlights = () => {
      for (const el of app.querySelectorAll(".hl")) el.classList.remove("hl");
    };

    const focusStep = (idx: number) => {
      const step = HERO_DEMO_STEPS[idx];
      if (!step) return;
      clearHighlights();
      for (const sel of step.highlight) {
        const el = app.querySelector<HTMLElement>(sel);
        if (el) el.classList.add("hl");
      }
    };

    const hideFocus = () => clearHighlights();

    const enterStep = (idx: number) => {
      plusEl.classList.remove("press");
      sendEl.classList.remove("firing");
      spinEl.classList.remove("on");
      dockIcon.classList.remove("press");
      requestAnimationFrame(() => focusStep(idx));
    };

    const showFinal = () => {
      hideFocus();
      setUrl(URL_PRE.length, URL_PATH.length, false);
      statusEl.style.display = "";
      timeEl.style.display = "";
      sizeEl.style.display = "";
      for (const l of lines) l.classList.add("show");
      openFolder();
      reqsEl.textContent = "38";
      tabEl.classList.add("show");
      tabNameEl.textContent = URL_PATH;
      draftBadge.classList.add("show");
      if (!firstDone) {
        firstDone = true;
        onDone.current?.();
      }
    };

    if (reduced) {
      app.classList.add("booted");
      launchEl.classList.add("hide");
      showFinal();
      return;
    }

    const resetDemo = () => {
      hideFocus();
      statusEl.style.display = "none";
      timeEl.style.display = "none";
      sizeEl.style.display = "none";
      for (const l of lines) l.classList.remove("show");
      closeFolder();
      reqsEl.textContent = "37";
      tabEl.classList.remove("show");
      tabNameEl.textContent = "Untitled Request";
      setUrl(0, 0, true);
      launchFast.style.transform = "scaleX(0)";
      launchSlow.style.transform = "scaleX(0)";
      launchEl.classList.remove("hide");
      app.classList.remove("booted");
      dockWrap.classList.remove("clicked");
      launchCompare.classList.remove("show");
      launchHeadline.classList.remove("show");
      draftBadge.classList.remove("show");
    };

    const boot = (done: () => void) => {
      enterStep(0);
      after(280, () => dockIcon.classList.add("press"));
      after(620, () => {
        dockIcon.classList.remove("press");
        dockWrap.classList.add("clicked");
      });
      after(750, () => launchCompare.classList.add("show"));
      after(950, () => {
        launchFast.style.transform = "scaleX(1)";
      });
      after(1250, () => {
        // Bar widths stay relative (fast vs slow) — no fixed timing claims.
        launchSlow.style.transform = "scaleX(0.09)";
      });
      after(1800, () => launchHeadline.classList.add("show"));
      after(STEP_HOLD, () => {
        app.classList.add("booted");
        launchEl.classList.add("hide");
        hideFocus();
        done();
      });
    };

    const openTab = (done: () => void) => {
      enterStep(1);
      plusEl.classList.add("press");
      after(320, () => tabEl.classList.add("show"));
      after(STEP_HOLD, () => {
        plusEl.classList.remove("press");
        done();
      });
    };

    const typeUrl = (done: () => void) => {
      enterStep(2);
      const started = performance.now();
      const total = URL_PRE.length + URL_PATH.length;
      let i = 0;
      let nameStarted = false;
      const t = window.setInterval(() => {
        i++;
        const preLen = Math.min(i, URL_PRE.length);
        const pathLen = Math.max(0, i - URL_PRE.length);
        setUrl(preLen, pathLen, true);
        if (pathLen > 0) {
          tabNameEl.textContent = URL_PATH.slice(0, pathLen);
          if (!nameStarted) {
            tabNameEl.classList.add("renamed");
            nameStarted = true;
            // Retarget spotlight now that tab name has content size.
            focusStep(2);
          }
        }
        if (i >= total) {
          window.clearInterval(t);
          setUrl(URL_PRE.length, URL_PATH.length, false);
          const left = Math.max(0, STEP_HOLD - (performance.now() - started));
          after(left, done);
        }
      }, 32);
      intervals.push(t);
    };

    const fireSend = (done: () => void) => {
      enterStep(3);
      sendEl.classList.add("firing");
      spinEl.classList.add("on");
      after(STEP_HOLD, () => {
        sendEl.classList.remove("firing");
        spinEl.classList.remove("on");
        done();
      });
    };

    const showResponse = (done: () => void) => {
      statusEl.style.display = "";
      timeEl.style.display = "";
      sizeEl.style.display = "";
      enterStep(4);
      lines.forEach((l, i) => {
        after(120 * i, () => l.classList.add("show"));
      });
      after(Math.max(STEP_HOLD, 120 * lines.length + 900), done);
    };

    const saveDraft = (done: () => void) => {
      draftBadge.classList.add("show");
      enterStep(5);
      after(STEP_HOLD, done);
    };

    const createFolder = (done: () => void) => {
      openFolder();
      enterStep(6);
      after(700, () => {
        folderEl.classList.add("flash");
        cntEl.classList.add("pop");
        reqsEl.textContent = "38";
      });
      after(STEP_HOLD, () => {
        if (!firstDone) {
          firstDone = true;
          onDone.current?.();
        }
      });
      after(STEP_HOLD + 1600, () => {
        hideFocus();
        done();
      });
    };

    const loop = () => {
      if (!shouldRun()) {
        after(400, loop);
        return;
      }
      resetDemo();
      after(600, () => {
        boot(() => {
          openTab(() => {
            typeUrl(() => {
              after(800, () => {
                fireSend(() => {
                  showResponse(() => {
                    saveDraft(() => createFolder(loop));
                  });
                });
              });
            });
          });
        });
      });
    };

    let started = false;

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false;
        if (inView && !started) {
          started = true;
          loop();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(app);

    return () => {
      io.disconnect();
      for (const t of timers) window.clearTimeout(t);
      for (const i of intervals) window.clearInterval(i);
    };
  }, [appRef]);
}
