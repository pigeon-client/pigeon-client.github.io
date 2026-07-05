import { type CSSProperties, type ReactNode, useState } from "react";
import type { PlatformAsset } from "../types/release";

interface DownloadSectionProps {
  assets: PlatformAsset[];
  detectedOS: PlatformAsset["platform"];
}

const OS_LABEL: Record<PlatformAsset["platform"], { os: string; arch: string }> = {
  "darwin-arm64": { os: "macOS", arch: "Apple Silicon" },
  "darwin-x64": { os: "macOS", arch: "Intel" },
  windows: { os: "Windows", arch: "x64 installer" },
  linux: { os: "Linux", arch: "AppImage / deb" },
};

const OS_ICON: Record<PlatformAsset["platform"], ReactNode> = {
  "darwin-arm64": <AppleIcon />,
  "darwin-x64": <AppleIcon />,
  windows: <WindowsIcon />,
  linux: <LinuxIcon />,
};

const INSTALL_SCRIPT_URL =
  "https://raw.githubusercontent.com/pigeon-client/pigeon/main/scripts/install.sh";
const CURL_COMMAND = `curl -fsSL ${INSTALL_SCRIPT_URL} | sh`;
const RELEASES_URL = "https://github.com/pigeon-client/pigeon/releases";

export function DownloadSection({ assets, detectedOS }: DownloadSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CURL_COMMAND);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = CURL_COMMAND;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sorted = [...assets].sort((a, a2) =>
    a.platform === detectedOS ? -1 : a2.platform === detectedOS ? 1 : 0,
  );

  return (
    <section className="band" id="download">
      <div className="section-head reveal">
        <span className="eyebrow">Install</span>
        <h2>Up and running in seconds.</h2>
        <p>One command, or a single click for your platform. Your call.</p>
      </div>

      <div className="dl-wrap">
        {/* curl one-liner */}
        <div className="curl-card reveal">
          <div className="curl-top">
            <span className="curl-badge">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </span>
            <div>
              <h3>Install from the terminal</h3>
              <p>macOS, Linux &amp; WSL — grabs the right binary automatically.</p>
            </div>
          </div>

          <div className="curl-line">
            <code>
              <span className="prompt">$</span>
              {CURL_COMMAND}
            </code>
            <button
              type="button"
              className={`copy-btn${copied ? " done" : ""}`}
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy command"}
            >
              {copied ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          <div className="curl-perks">
            <span className="perk">
              <Check /> Detects your platform
            </span>
            <span className="perk">
              <Check /> No admin prompts
            </span>
            <span className="perk">
              <Check /> Ready instantly
            </span>
          </div>
        </div>

        {/* direct downloads */}
        {sorted.length > 0 ? (
          <div className="dl-grid-card reveal" style={{ "--d": "0.08s" } as CSSProperties}>
            <div className="label"># or download a build</div>
            <div className="dl-grid">
              {sorted.map((asset) => {
                const meta = OS_LABEL[asset.platform];
                const rec = asset.platform === detectedOS;
                return (
                  <a
                    key={asset.platform}
                    className={`dl-btn${rec ? " rec" : ""}`}
                    href={asset.downloadUrl}
                  >
                    {OS_ICON[asset.platform]}
                    <span>
                      <span className="os">{meta.os}</span>
                      <span className="arch">{meta.arch}</span>
                    </span>
                    {rec && <span className="rec-tag">you</span>}
                  </a>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="dl-empty reveal">
            <p>No builds published yet.</p>
            <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
              Track releases on GitHub →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.55.02-2.98.9-3.77 2.29-1.61 2.79-.41 6.92 1.15 9.19.76 1.11 1.67 2.36 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.13 2.76-2.25.87-1.29 1.23-2.54 1.25-2.6-.03-.02-2.4-.92-2.42-3.65zM14.13 5.6c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.68 1.37-.59.67-1.1 1.76-.96 2.79 1.02.08 2.06-.52 2.7-1.26z" />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.5 10.5 4.4v7.1H3zM3 12.5h7.5v7.1L3 18.5zM11.5 4.25 21 3v8.5h-9.5zM11.5 12.5H21V21l-9.5-1.25z" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3.5c-1.2.9-1.5 2.6-1.3 4.2.2 1.4-.4 2.3-1.3 3.6C5.3 12.7 4.5 14 4.5 15.5c0 1.6 1.3 2.5 3 3 .8.9 1.9 1.5 4.5 1.5s3.7-.6 4.5-1.5c1.7-.5 3-1.4 3-3 0-1.5-.8-2.8-1.9-4.2-.9-1.3-1.5-2.2-1.3-3.6.2-1.6-.1-3.3-1.3-4.2-.8-.6-2-1-3-1s-2.2.4-3 1z" />
      <path d="M10 9.5h.01M14 9.5h.01M10.5 13c.5.5 2.5.5 3 0" />
    </svg>
  );
}
