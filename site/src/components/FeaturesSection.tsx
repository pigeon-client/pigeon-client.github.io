import type { CSSProperties, ReactNode } from "react";

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
  keys?: string[];
}

const I = (children: ReactNode) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const features: Feature[] = [
  {
    icon: I(
      <>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </>,
    ),
    title: "Every HTTP method",
    desc: "GET, POST, PUT, PATCH, DELETE and more — with headers, query params, auth and typed request bodies.",
    keys: ["⌘", "↵"],
  },
  {
    icon: I(
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
    ),
    title: "Collections & folders",
    desc: "Organize saved requests into a nested folder tree. Drag, rename and reorder — your whole API in one place.",
    keys: ["⌘", "S"],
  },
  {
    icon: I(
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </>,
    ),
    title: "Environments",
    desc: "Define {{baseUrl}} once and flip between dev, staging and prod. Variables resolve everywhere, instantly.",
    keys: ["⌘", "⇧", "E"],
  },
  {
    icon: I(
      <>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </>,
    ),
    title: "History & drafts",
    desc: "Every request is auto-saved to a searchable timeline. That call you forgot to save is already there.",
  },
  {
    icon: I(
      <>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </>,
    ),
    title: "cURL in & out",
    desc: "Paste a curl command into the URL bar and it becomes a full request. Export any request back to curl in a click.",
  },
  {
    icon: I(
      <>
        <path d="M12 2 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>,
    ),
    title: "No CORS, ever",
    desc: "Requests are sent from a native Rust core — not the browser. No preflight walls, no proxy hacks, no surprises.",
  },
  {
    icon: I(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>,
    ),
    title: "Dark & light themes",
    desc: "A polished dark theme by default, plus light — with syntax highlighting that adapts to whichever you pick.",
  },
  {
    icon: I(
      <>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <polyline points="21 4 21 10 15 10" />
      </>,
    ),
    title: "Auto-updates",
    desc: "Signed background updates via the Tauri updater. You're always on the latest — no manual reinstalls.",
  },
  {
    icon: I(
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M7 13h10M7 16h6" />
      </>,
    ),
    title: "Keyboard-first",
    desc: "New tab, save, search, switch environments, open settings — the whole workflow without lifting your hands.",
    keys: ["⌘", "K"],
  },
];

const marquee = [
  "Tauri v2",
  "Rust core",
  "React 19",
  "Zustand",
  "SQLite",
  "reqwest",
  "TypeScript",
  "TailwindCSS",
];

export function FeaturesSection() {
  return (
    <section className="band" id="features">
      <div className="section-head reveal">
        <span className="eyebrow">Features</span>
        <h2>Everything you need. Nothing you don't.</h2>
        <p>
          A focused toolset that makes API work feel effortless — fast, native, and out of your way.
        </p>
      </div>

      <div className="feat-grid">
        {features.map((f, i) => (
          <article
            key={f.title}
            className="feat reveal"
            style={{ "--d": `${(i % 3) * 0.07}s` } as CSSProperties}
          >
            <span className="feat-ic">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            {f.keys && (
              <span className="kbd">
                {f.keys.map((k) => (
                  <b key={`${f.title}-${k}`}>{k}</b>
                ))}
              </span>
            )}
          </article>
        ))}
      </div>

      <div className="wrap" style={{ marginTop: 44 }}>
        <div className="marquee reveal">
          <div className="marquee-track">
            {[...marquee, ...marquee].map((m, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: doubled list needs positional keys for the seamless loop
              <span className="mq-item" key={`${m}-${i}`}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
