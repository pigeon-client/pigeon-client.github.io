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
            <p className="meta">Apple Silicon &amp; Intel · one command</p>
            <InstallBox command={installCmd} />
            <p className="dl-note">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1 1 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>
                Pigeon isn&apos;t Apple-notarized yet, so the installer clears the Gatekeeper
                quarantine flag for you — no &quot;unidentified developer&quot; dialog, no
                right-click → Open dance.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
