import type { CSSProperties, ReactNode } from "react";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

interface WhyItem {
  title: string;
  body: string;
  vis: ReactNode;
}

const ITEMS: WhyItem[] = [
  {
    title: "No account, ever",
    body: "Open the app and send a request. No sign-up walls, no workspace invites, no cloud sync prompts.",
    vis: (
      <div className="why-vis-lock">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
      </div>
    ),
  },
  {
    title: "Local by default",
    body: "Collections, history, and environments live on your disk. Your API keys never touch anyone's cloud.",
    vis: (
      <div className="why-vis-disk">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
          <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
        </svg>
        <span className="lbl">on-disk only</span>
      </div>
    ),
  },
  {
    title: "Native, not bloated",
    body: "Built for API work — a fraction of the memory and disk of typical desktop API clients.",
    vis: (
      <div className="why-vis-bolt">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
        <span className="vs">vs</span>
        <span className="elec">others</span>
      </div>
    ),
  },
];

export function WhySection() {
  return (
    <section className="why">
      <div className="wrap">
        <p className="kicker reveal">why pigeon</p>
        <h2 className="reveal">API clients got heavy. We went the other way.</h2>
        <div className="why-grid">
          {ITEMS.map((it, i) => (
            <div className="why-card reveal" key={it.title} style={delay(i * 0.1)}>
              <div className="vis" aria-hidden="true">
                {it.vis}
              </div>
              <h3>
                <span className="ico">→</span>
                {it.title}
              </h3>
              <p>{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
