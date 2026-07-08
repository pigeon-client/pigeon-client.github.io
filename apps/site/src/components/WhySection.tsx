import type { CSSProperties } from "react";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

const ITEMS = [
  {
    title: "No account, ever",
    body: 'Open the app and send a request. No sign-up walls, no workspace invitations, no "sync to continue".',
  },
  {
    title: "Local by default",
    body: "Collections, history, and environments live on your disk. Your API keys never touch anyone's cloud.",
  },
  {
    title: "Native, not Electron",
    body: "Built with Tauri and Rust — a fraction of the memory and disk footprint of browser-in-a-box API clients.",
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
            <div className="why-item reveal" key={it.title} style={delay(i * 0.1)}>
              <h3>
                <span>→</span>
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
