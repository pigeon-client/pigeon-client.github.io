import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { useInViewPlay } from "../hooks/useInViewPlay";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

interface Feature {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  demo: ReactNode;
  /** Short story line shown under the mini demo while it plays */
  story: string;
}

const FEATURES: Feature[] = [
  {
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
    title: "Request builder",
    body: "Color-coded methods, smart URL bar, clean param & auth editors.",
    story: "Method → URL → params → Send",
    demo: (
      <div className="sc-story sc-builder">
        <div className="sc-bar">
          <span className="sc-method sc-a-method">GET</span>
          <span className="sc-url">
            <span className="sc-a-host">api.example.com</span>
            <span className="sc-a-path">/users/42</span>
            <span className="sc-a-caret" />
          </span>
          <span className="sc-send sc-a-send">Send</span>
        </div>
        <div className="sc-tabs">
          <span className="sc-a-tab0">Params</span>
          <span className="sc-a-tab1">Auth</span>
          <span className="sc-a-tab2">Headers</span>
          <span className="sc-a-tab3">Body</span>
        </div>
        <div className="sc-field sc-a-field">
          <span>page</span>
          <span className="val sc-a-val">2</span>
        </div>
        <div className="sc-caps" aria-hidden="true">
          <span className="sc-cap c0">Pick method</span>
          <span className="sc-cap c1">Type URL</span>
          <span className="sc-cap c2">Edit params</span>
          <span className="sc-cap c3">Hit Send</span>
        </div>
      </div>
    ),
  },
  {
    icon: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
    title: "Native speed",
    body: "Native engine — no CORS pain, instant startup, lighter than typical API clients.",
    story: "Pigeon finishes before other clients start",
    demo: (
      <div className="sc-story sc-speed-demo">
        <div className="sc-speed">
          <span className="lbl">Pigeon</span>
          <span className="bar-track">
            <span className="bar-fill sc-a-fast" />
          </span>
          <span className="ms fast sc-a-ms-fast">12ms</span>
        </div>
        <div className="sc-speed">
          <span className="lbl">Others</span>
          <span className="bar-track">
            <span className="bar-fill slow sc-a-slow" />
          </span>
          <span className="ms slow sc-a-ms-slow">240ms</span>
        </div>
        <div className="sc-caps" aria-hidden="true">
          <span className="sc-cap c0">Fire request</span>
          <span className="sc-cap c1">Pigeon done</span>
          <span className="sc-cap c2">Others still going…</span>
        </div>
      </div>
    ),
  },
  {
    icon: (
      <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
    ),
    title: "Environments",
    body: (
      <>
        <code>{"{{var}}"}</code> for dev, staging, prod — secret masking, plus a red confirm
        guardrail before destructive methods hit production.
      </>
    ),
    story: "Flip env → vars swap → secrets stay blurred",
    demo: (
      <div className="sc-story sc-env-demo">
        <div className="sc-env-url">
          <span className="sc-a-interp">{"{{baseUrl}}"}</span>
          <span className="sc-a-resolved">/login</span>
        </div>
        <div className="sc-env">
          <div className="sc-env-row sc-a-env0">
            <span className="tag dev">dev</span>
            <span className="val">localhost:3000</span>
          </div>
          <div className="sc-env-row sc-a-env1">
            <span className="tag staging">staging</span>
            <span className="val">stg.api.dev</span>
          </div>
          <div className="sc-env-row sc-a-env2">
            <span className="tag prod">prod</span>
            <span className="val masked">sk_live_•••••</span>
          </div>
        </div>
        <div className="sc-caps" aria-hidden="true">
          <span className="sc-cap c0">dev active</span>
          <span className="sc-cap c1">staging active</span>
          <span className="sc-cap c2">prod · secret masked</span>
        </div>
      </div>
    ),
  },
  {
    icon: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
    title: "Collections",
    body: (
      <>
        Auto-filed drafts + curated saves (<code>⌘S</code>). All local.
      </>
    ),
    story: "Folder appears → requests nest → count ticks",
    demo: (
      <div className="sc-story sc-tree-demo">
        <div className="sc-tree">
          <div className="sc-a-root">
            <span className="org-chev">▾</span> 📁 api.example.com{" "}
            <span className="cnt sc-a-cnt">4</span>
          </div>
          <div className="ind sc-a-folder">
            <span className="org-chev">▾</span> 📁 users <span className="cnt">2</span>
          </div>
          <div className="ind2 sc-a-req0">
            <span className="m">GET</span>/users/42
          </div>
          <div className="ind2 sc-a-req1">
            <span className="m p2">POST</span>/users
          </div>
        </div>
        <div className="sc-caps" aria-hidden="true">
          <span className="sc-cap c0">Domain folder</span>
          <span className="sc-cap c1">Nest requests</span>
          <span className="sc-cap c2">Count updates</span>
        </div>
      </div>
    ),
  },
  {
    icon: <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14" />,
    title: "cURL in & out",
    body: (
      <>
        Paste any <code>curl</code> → instant request. Copy back out anytime.
      </>
    ),
    story: "Paste curl → parse → ready request",
    demo: (
      <div className="sc-story sc-curl-demo">
        <div className="sc-curl">
          <div className="line sc-a-curl">
            <span className="kw">curl</span> -X <span className="str">POST</span> api.dev/login
          </div>
          <div className="arrow sc-a-arrow">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            <span>parsed</span>
          </div>
          <div className="line sc-a-result">
            <span className="kw">POST</span> /login <span className="str">ready</span>
          </div>
        </div>
        <div className="sc-caps" aria-hidden="true">
          <span className="sc-cap c0">Paste curl</span>
          <span className="sc-cap c1">Parse</span>
          <span className="sc-cap c2">Request ready</span>
        </div>
      </div>
    ),
  },
  {
    icon: <path d="M12 4v4M12 20a8 8 0 100-16 8 8 0 000 16zM12 12l3 1.5" />,
    title: "SSE streaming",
    body: "Live event streams render as they arrive — newest on top, Stop anytime.",
    story: "Open stream → events land live → Stop",
    demo: (
      <div className="sc-story sc-sse-demo">
        <div className="sc-curl">
          <div className="line">
            <span className="kw">GET</span> /events <span className="str">text/event-stream</span>
          </div>
          <div className="line">
            <span className="kw">event</span> tick <span className="str">{"{...}"}</span>
          </div>
          <div className="line">
            <span className="kw">event</span> tick <span className="str">{"{...}"}</span>
          </div>
        </div>
        <div className="sc-caps" aria-hidden="true">
          <span className="sc-cap c0">Open stream</span>
          <span className="sc-cap c1">Events arrive live</span>
          <span className="sc-cap c2">Stop anytime</span>
        </div>
      </div>
    ),
  },
  {
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 15h4M7 9h.01M11 9h.01M15 9h.01" />
      </>
    ),
    title: "Keyboard-first",
    body: (
      <>
        Send <code>⌘↵</code>, environments <code>⌘⇧E</code>, help <code>⌘/</code>.
      </>
    ),
    story: "Shortcuts fire one by one — no mouse needed",
    demo: (
      <div className="sc-story sc-keys-demo">
        <div className="sc-keys">
          <span className="sc-key sc-a-key0">
            <kbd>⌘</kbd>
            <kbd>↵</kbd> <span className="act">send</span>
          </span>
          <span className="sc-key sc-a-key1">
            <kbd>⌘</kbd>
            <kbd>⇧</kbd>
            <kbd>E</kbd> <span className="act">envs</span>
          </span>
          <span className="sc-key sc-a-key2">
            <kbd>⌘</kbd>
            <kbd>/</kbd> <span className="act">help</span>
          </span>
        </div>
        <div className="sc-caps" aria-hidden="true">
          <span className="sc-cap c0">Send request</span>
          <span className="sc-cap c1">Switch envs</span>
          <span className="sc-cap c2">Open help</span>
        </div>
      </div>
    ),
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const sectionPlaying = useInViewPlay(sectionRef);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <section id="features" ref={sectionRef}>
      <div className="wrap">
        <p className="kicker reveal">features</p>
        <h2 className="reveal">Everything you need. Nothing you don't.</h2>
        <p className="lead reveal" style={delay(0.1)}>
          A focused toolset for testing REST APIs — built for speed, not for upselling.
        </p>
        <div className="grid">
          {FEATURES.map((f, i) => {
            const active = hoverIdx === i;
            return (
              <article
                className={`card${sectionPlaying ? " playing" : ""}${active ? " active" : ""}`}
                key={f.title}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
              >
                <div className="icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {f.icon}
                  </svg>
                </div>
                <div className="showcase" aria-hidden="true">
                  {f.demo}
                </div>
                <p className="sc-story-line">{f.story}</p>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
