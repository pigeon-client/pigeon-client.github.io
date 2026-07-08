import type { CSSProperties, ReactNode } from "react";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

interface Feature {
  icon: ReactNode;
  title: string;
  body: ReactNode;
}

const FEATURES: Feature[] = [
  {
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
    title: "Request builder",
    body: "Tabs with color-coded methods, a smart URL bar, and clean editors for params, auth, headers, and body — JSON to multipart.",
  },
  {
    icon: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
    title: "Native speed",
    body: "A Rust engine sends your requests — no CORS pain, full control over redirects, SSL verification, and proxies. Starts instantly.",
  },
  {
    icon: (
      <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
    ),
    title: "Environments",
    body: (
      <>
        <code>{"{{var}}"}</code> sets for dev, staging, and prod — with secret masking and red
        production guardrails so you never hit prod by accident.
      </>
    ),
  },
  {
    icon: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
    title: "Collections on your terms",
    body: (
      <>
        Auto-organization handles the daily grind; curated collections (<code>⌘S</code>) are there
        when you want deliberate structure. All stored locally.
      </>
    ),
  },
  {
    icon: <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14" />,
    title: "cURL in & out",
    body: (
      <>
        Paste any <code>curl</code> command and Pigeon builds the request instantly. Copy any
        request back as cURL to share with your team.
      </>
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
        Send with <code>⌘↵</code>, manage environments with <code>⌘⇧E</code>, and fly through
        everything else with a full shortcut reference (<code>⌘/</code>).
      </>
    ),
  },
];

export function FeaturesSection() {
  return (
    <section id="features">
      <div className="wrap">
        <p className="kicker reveal">features</p>
        <h2 className="reveal">Everything you need. Nothing you don't.</h2>
        <p className="lead reveal" style={delay(0.1)}>
          A focused toolset for testing REST APIs — built for speed, not for upselling you a
          workspace plan.
        </p>
        <div className="grid">
          {FEATURES.map((f, i) => (
            <article className="card reveal" key={f.title} style={delay((i % 3) * 0.1)}>
              <div className="icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {f.icon}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
