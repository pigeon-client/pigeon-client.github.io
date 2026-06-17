import { useState } from "react";
import type { PlatformAsset } from "../types/release";
import { PlatformCard } from "./PlatformCard";

interface DownloadSectionProps {
  assets: PlatformAsset[];
  detectedOS: PlatformAsset["platform"];
}

const labels: Record<PlatformAsset["platform"], string> = {
  "darwin-arm64": "macOS (Apple Silicon)",
  "darwin-x64": "macOS (Intel)",
  windows: "Windows",
  linux: "Linux",
};

const platformIcons: Record<PlatformAsset["platform"], JSX.Element> = {
  "darwin-arm64": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  ),
  "darwin-x64": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  ),
  windows: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 12V6.75L9 5.43V11.91L3 12M20 3V11.75L10 11.9V5.21L20 3M3 13L9 13.09V19.9L3 18.75V13M20 13.25V22L10 20.09V13.1L20 13.25Z" />
    </svg>
  ),
  linux: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.5 2C8.92 2 6 4.92 6 8.5c0 2.31 1.21 4.34 3.11 5.59L9 22h2l.17-2.37c.32-.02.66-.04 1-.04s.68.02 1 .04L12.83 22H15l-.11-7.91A5.49 5.49 0 0 0 18 8.5C18 4.92 15.08 2 12.5 2M12.5 4a4.5 4.5 0 0 0-4.5 4.5 4.5 4.5 0 0 0 4.5 4.5 4.5 4.5 0 0 0 4.5-4.5A4.5 4.5 0 0 0 12.5 4M9 8a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1m5 0a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1" />
    </svg>
  ),
};

const INSTALL_SCRIPT_URL =
  "https://raw.githubusercontent.com/pigeon-client/pigeon/main/scripts/install.sh";
const CURL_COMMAND = `curl -fsSL ${INSTALL_SCRIPT_URL} | sh`;

export function DownloadSection({ assets, detectedOS }: DownloadSectionProps) {
  const [selected, setSelected] = useState<PlatformAsset["platform"]>(detectedOS);
  const [copied, setCopied] = useState(false);

  const selectedAsset = assets.find((a) => a.platform === selected) || null;
  const isMac = selected === "darwin-arm64" || selected === "darwin-x64";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CURL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = CURL_COMMAND;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="download-section" id="download">
      <div className="download-header">
        <h2 className="section-title">Get Started</h2>
        <p className="section-subtitle">Download Pigeon and start testing APIs in seconds.</p>
      </div>

      <div className="download-content">
        {assets.length === 0 ? (
          <div className="download-unavailable">
            <p>No builds available yet.</p>
            <a
              href="https://github.com/pigeon-client/pigeon-client.github.io/releases"
              target="_blank"
              rel="noopener noreferrer"
            >
              Check GitHub Releases
            </a>
          </div>
        ) : (
          <>
            {isMac ? (
              <div className="curl-install-card">
                <div className="curl-header">
                  <div className="curl-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="curl-title">Install via Terminal</h3>
                    <p className="curl-desc">One command installation</p>
                  </div>
                </div>

                <div className="curl-command-wrapper">
                  <pre className="curl-command">
                    <code>{CURL_COMMAND}</code>
                  </pre>
                  <button type="button" className="curl-copy-btn" onClick={handleCopy}>
                    {copied ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="curl-benefits">
                  <div className="curl-benefit">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Automatic quarantine removal
                  </div>
                  <div className="curl-benefit">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    No Gatekeeper warnings
                  </div>
                  <div className="curl-benefit">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Ready to run instantly
                  </div>
                </div>
              </div>
            ) : selectedAsset ? (
              <div className="primary-download-card">
                <div className="download-info">
                  <div className="download-platform">
                    {platformIcons[selectedAsset.platform]}
                    <h3 className="download-title">{labels[selectedAsset.platform]}</h3>
                  </div>
                  <p className="download-version">
                    Download the installer for {labels[selectedAsset.platform]}
                  </p>
                </div>
                <button
                  type="button"
                  className="download-btn"
                  onClick={() => window.open(selectedAsset.downloadUrl, "_blank")}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
              </div>
            ) : null}

            {assets.length > 1 && (
              <div className="other-platforms">
                <p className="other-platforms-label">Other platforms:</p>
                <div className="platform-grid">
                  {assets
                    .filter((a) => a.platform !== selected)
                    .map((asset) => (
                      <PlatformCard
                        key={asset.platform}
                        asset={asset}
                        onClick={() => setSelected(asset.platform)}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
