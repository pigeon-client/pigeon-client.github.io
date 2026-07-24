import type { CSSProperties } from "react";
import { ISSUES_URL, REPO_URL } from "../lib/constants";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

const STEPS = [
  { title: "Star the repo", body: "Helps other devs discover Pigeon." },
  { title: "Report or request", body: "Found a bug or missing feature? Open an issue." },
  { title: "Send a PR", body: "TypeScript + React + Rust. Good-first-issues labeled." },
];

export function OpenSourceSection() {
  return (
    <section id="open-source">
      <div className="wrap">
        <p className="kicker reveal">open source</p>
        <h2 className="reveal">Built in the open. Owned by no one.</h2>
        <div className="oss-flex">
          <div className="reveal" style={delay(0.1)}>
            <p className="lead">
              MIT-licensed and built publicly on GitHub. Every decision in the open. If it doesn't
              do what you need, you can change it.
            </p>
            <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                className="btn btn-primary"
                href={REPO_URL}
                aria-label="View Pigeon repository on GitHub"
              >
                View on GitHub
              </a>
              <a className="btn btn-ghost" href={ISSUES_URL} aria-label="Open an issue on GitHub">
                Open an issue
              </a>
            </div>
          </div>
          <div className="reveal" style={delay(0.2)}>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="num">{i + 1}</span>
                  <p>
                    <strong>{s.title}</strong>
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
