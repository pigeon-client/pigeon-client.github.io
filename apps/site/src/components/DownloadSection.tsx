import type { CSSProperties } from "react";
import { getInstallCmd } from "../lib/constants";
import { InstallBox } from "./CopyButton";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

const AppleIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15.5 8.5c-1.5 0-2.5 1-3.5 1s-2-1-3.5-1C6 8.5 4 10.5 4 13.5S6.5 21 8.5 21c1 0 1.5-.7 3-.7s2 .7 3 .7c2 0 4.5-4.5 4.5-7.5 0-2-1.5-3.5-3.5-5zM12 8c0-2 1.5-4 3.5-4 0 2-1.5 4-3.5 4z" />
  </svg>
);

export function DownloadSection() {
  const installCmd = getInstallCmd();

  return (
    <section id="download" className="center">
      <div className="wrap">
        <p className="kicker reveal">download</p>
        <h2 className="reveal">Send your first request in 30 seconds.</h2>
        <p className="lead reveal" style={delay(0.1)}>
          Free forever. No account required.
        </p>
        <div
          className="dl-grid"
          style={{ gridTemplateColumns: "1fr", maxWidth: 640, margin: "0 auto" }}
        >
          <div className="dl-card active reveal">
            <div className="os-icon">{AppleIcon}</div>
            <h3>macOS</h3>
            <p className="meta">Apple Silicon &amp; Intel · terminal install</p>
            <InstallBox command={installCmd} />
            <p className="meta" style={{ marginTop: 14 }}>
              or via Homebrew
            </p>
            <InstallBox command="brew install --cask pigeon-client/pigeon/pigeon" />
          </div>
        </div>
      </div>
    </section>
  );
}
