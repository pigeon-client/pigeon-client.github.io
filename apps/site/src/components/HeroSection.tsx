import { useRef, useState } from "react";
import { useHeroDemo } from "../hooks/useHeroDemo";
import { REPO_URL } from "../lib/constants";
import { HERO_DEMO_STEPS } from "../lib/heroDemoSteps";

export function HeroSection() {
  const appRef = useRef<HTMLDivElement>(null);
  const [offerOn, setOfferOn] = useState(false);
  useHeroDemo(appRef, () => setOfferOn(true));

  return (
    <section className={`hero${offerOn ? " offer-on" : ""}`}>
      <div className="orbs" aria-hidden="true">
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
      </div>

      <div className="hero-stage">
        <div
          ref={appRef}
          className="app demo-app"
          role="img"
          aria-label="Animated demo: Pigeon launches instantly, auto-names a tab from the URL, sends a GET request, receives a 200 OK JSON response, auto-saves as draft, and files it by domain"
        >
          <div className="demo-launch" id="demo-launch" aria-hidden="true">
            <div className="mac-desktop" id="demo-launch-dock">
              <div className="mac-menubar">
                <span className="mac-apple" aria-hidden="true" />
                <span className="mac-menu-items">Pigeon File Edit View</span>
                <span className="mac-menu-clock">9:41</span>
              </div>
              <div className="mac-wallpaper" aria-hidden="true" />
              <div className="launch-center">
                <img className="launch-mark" src="/pigeon-mark.svg" alt="" aria-hidden="true" />
                <p className="launch-kicker">native · local · free</p>
                <p className="launch-title">
                  Launch in <strong>0.3s</strong>
                </p>
                <p className="launch-sub">
                  Click the dock icon — other API clients are still waking up
                </p>
              </div>
              <div className="mac-dock">
                <span className="dock-icon slot" aria-hidden="true" />
                <span className="dock-icon slot" aria-hidden="true" />
                <button
                  className="dock-icon pigeon"
                  id="demo-dock-icon"
                  type="button"
                  tabIndex={-1}
                >
                  <img src="/pigeon-mark.svg" alt="" />
                </button>
                <span className="dock-icon slot" aria-hidden="true" />
                <span className="dock-icon slot" aria-hidden="true" />
              </div>
              <span className="launch-dock-hint">click to open</span>
            </div>
            <div className="launch-compare" id="demo-launch-compare">
              <div className="launch-row">
                <span className="launch-lbl">Pigeon</span>
                <span className="launch-bar">
                  <span className="launch-fill fast" id="demo-launch-fast" />
                </span>
                <span className="launch-ms fast" id="demo-launch-ms">
                  0.3s
                </span>
              </div>
              <div className="launch-row">
                <span className="launch-lbl muted">Others</span>
                <span className="launch-bar">
                  <span className="launch-fill slow" id="demo-launch-slow" />
                </span>
                <span className="launch-ms slow">3.4s</span>
              </div>
            </div>
            <p className="launch-headline" id="demo-launch-headline">
              Opens in <strong>0.3s</strong> — ahead of other API clients
            </p>
          </div>

          <div className="app-titlebar">
            <div className="tb-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <img className="tb-mark" src="/pigeon-mark.svg" alt="" />
            <span className="tb-name">Pigeon</span>
            <span className="tb-search">
              Search… <kbd>⌘F</kbd>
            </span>
            <span className="tb-env">No environment</span>
            <span className="tb-proto">
              <span className="on">REST</span>
              <span>MCP</span>
              <span>GraphQL</span>
            </span>
          </div>
          <div className="app-body">
            <aside className="sb" aria-hidden="true">
              <div className="sb-new">+ New Request</div>
              <div className="sb-tabs">
                <span>History</span>
                <span className="on" id="demo-draft-tab">
                  Draft
                </span>
                <span>Collections</span>
              </div>
              <div className="sb-tree">
                <div className="sb-item newf" id="demo-folder">
                  <span id="demo-folder-label">▸ 📁 jsonplaceholder…</span>
                  <span className="cnt" id="demo-cnt">
                    1
                  </span>
                </div>
                <div className="sb-item newf-child" id="demo-folder-child">
                  <span className="m">GET</span>
                  <span>/todos/1</span>
                </div>
                <div className="sb-item">
                  <span>▸ 📁 reqres.in</span>
                  <span className="cnt">1</span>
                </div>
                <div className="sb-item">
                  <span>▸ 📁 httpbin.org</span>
                  <span className="cnt">1</span>
                </div>
                <div className="sb-item">
                  <span>▸ 📁 localhost</span>
                  <span className="cnt">2</span>
                </div>
                <div className="sb-item">
                  <span>▸ 📁 dummyjson.com</span>
                  <span className="cnt">5</span>
                </div>
              </div>
              <div className="sb-foot">
                <span id="demo-reqs">37</span> requests · 19 drafts
              </div>
            </aside>
            <div className="mn" aria-hidden="true">
              <div className="mn-tabs">
                <span className="on tab" id="demo-tab">
                  <span className="m">GET</span>
                  <span className="demo-tabname" id="demo-tabname">
                    Untitled Request
                  </span>
                  <span className="x">✕</span>
                </span>
                <span className="plus" id="demo-plus">
                  +
                </span>
              </div>
              <div className="urlrow">
                <span className="method" id="demo-method">
                  GET <i />
                </span>
                <span className="url" id="demo-url">
                  <span className="caret" />
                </span>
                <span className="send" id="demo-send">
                  <span className="send-label">Send</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </span>
              </div>
              <div className="ed-tabs">
                <span className="on">Params</span>
                <span>Auth</span>
                <span>
                  Headers <sup>1</sup>
                </span>
                <span>Body</span>
              </div>
              <div className="ed-pane" aria-hidden="true">
                <div className="kv-head">
                  <span />
                  <span>Key</span>
                  <span>Value</span>
                  <span />
                </div>
                <div className="kv-row">
                  <span className="kv-chk on">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="kv-ph">Key</span>
                  <span className="kv-ph">Value</span>
                  <svg className="kv-del" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <span className="kv-add">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add param
                </span>
              </div>
              <div className="resp">
                <div className="resp-bar">
                  <span className="spinner" id="demo-spin" />
                  <span id="demo-status" style={{ display: "none" }} className="status">
                    200 OK
                  </span>
                  <span id="demo-time" style={{ display: "none" }}>
                    355 ms
                  </span>
                  <span id="demo-size" style={{ display: "none" }}>
                    83 B
                  </span>
                  <span className="right">
                    <span className="resp-tab on">Body</span>
                    <span className="resp-tab">Headers 25</span>
                    <span className="pill">
                      <span className="on">Pretty</span>
                      <span>Raw</span>
                    </span>
                  </span>
                </div>
                <div className="resp-body" id="demo-json">
                  <div className="ln">
                    <span className="no">1</span>
                    <span className="p">{"{"}</span>
                  </div>
                  <div className="ln">
                    <span className="no">2</span>
                    <span>
                      &nbsp;&nbsp;<span className="k">"userId"</span>
                      <span className="p">:</span> <span className="n">1</span>
                      <span className="p">,</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span className="no">3</span>
                    <span>
                      &nbsp;&nbsp;<span className="k">"id"</span>
                      <span className="p">:</span> <span className="n">1</span>
                      <span className="p">,</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span className="no">4</span>
                    <span>
                      &nbsp;&nbsp;<span className="k">"title"</span>
                      <span className="p">:</span> <span className="s">"delectus aut autem"</span>
                      <span className="p">,</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span className="no">5</span>
                    <span>
                      &nbsp;&nbsp;<span className="k">"completed"</span>
                      <span className="p">:</span> <span className="b">false</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span className="no">6</span>
                    <span className="p">{"}"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="demo-draft-badge" id="demo-draft-badge" aria-hidden="true">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            Draft saved
          </div>
        </div>

        <div className="demo-steps" aria-hidden="true">
          {HERO_DEMO_STEPS.map((step, i) => (
            <span key={step.id} className="demo-step-wrap">
              {i > 0 ? <span className="step-sep">→</span> : null}
              <span className="step" id={`step-${i}`}>
                <span className="step-ico">{step.ico}</span> {step.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Tagline + CTAs — reveal after first demo cycle */}
      <div className="hero-offer" aria-hidden={offerOn ? undefined : true}>
        <span className="badge">
          <span className="dot" aria-hidden="true" /> free &amp; open source · MIT licensed
        </span>
        <h1>
          Never <span className="accent">save a request</span> again
          <span className="cursor" aria-hidden="true" />
        </h1>
        <p className="sub">
          Pigeon names, files, and remembers every request automatically — and finds any of them in
          3 keystrokes. Local, private, no account.
        </p>
        <div className="hero-ctas">
          <a
            className="btn btn-primary"
            href="#download"
            aria-label="Get the install command for macOS"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
            Install for macOS
          </a>
          <a
            className="btn btn-ghost"
            href={REPO_URL}
            aria-label="View Pigeon source code on GitHub"
          >
            Star on GitHub
          </a>
        </div>
        <p className="hero-note">macOS · Apple Silicon &amp; Intel · free forever</p>
      </div>
    </section>
  );
}
