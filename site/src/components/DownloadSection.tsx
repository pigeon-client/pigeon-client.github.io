import { useState } from "react";
import type { PlatformAsset } from "../types/release";
import { PlatformCard } from "./PlatformCard";

interface DownloadSectionProps {
  assets: PlatformAsset[];
  detectedOS: PlatformAsset["platform"];
}

export function DownloadSection({ assets, detectedOS }: DownloadSectionProps) {
  const [selected, setSelected] = useState<PlatformAsset["platform"]>(detectedOS);

  const selectedAsset = assets.find((a) => a.platform === selected) || null;

  const handleDownload = () => {
    if (selectedAsset) {
      window.open(selectedAsset.downloadUrl, "_blank");
    }
  };

  const labels: Record<PlatformAsset["platform"], string> = {
    "darwin-arm64": "macOS (Apple Silicon)",
    "darwin-x64": "macOS (Intel)",
    windows: "Windows",
    linux: "Linux",
  };

  const isMac = selected === "darwin-arm64" || selected === "darwin-x64";

  return (
    <section className="download-section">
      <h2 className="section-title">Download</h2>

      <div className="download-content">
        <p className="detected-os">
          Detected: <strong>{labels[detectedOS]}</strong>
        </p>

        {selectedAsset ? (
          <div className="primary-download-card">
            <div className="download-info">
              <h3 className="download-title">{labels[selectedAsset.platform]}</h3>
              <p className="download-version">Version displayed on site</p>
            </div>
            <button type="button" className="download-btn" onClick={handleDownload}>
              Download
            </button>
          </div>
        ) : (
          <div className="download-unavailable">
            <p>No builds available yet.</p>
            <a
              href="https://github.com/pigeon-client/pigeon-client.github.io/releases"
              target="_blank"
              rel="noopener noreferrer"
            >
              Check GitHub Releases ↗
            </a>
          </div>
        )}

        {selectedAsset && isMac && (
          <div className="install-note">
            <p className="install-note-title">First launch on macOS</p>
            <p>
              Pigeon isn't notarized by Apple, so the first launch shows{" "}
              <em>"Apple could not verify…"</em>. This is expected — open it once this way:
            </p>
            <ol>
              <li>Open the .dmg and drag Pigeon into Applications.</li>
              <li>
                Double-click Pigeon, then click {""}
                <strong>Done</strong> on the warning.
              </li>
              <li>
                Go to <strong>System Settings → Privacy &amp; Security</strong>, scroll down, and
                click <strong>Open Anyway</strong>.
              </li>
            </ol>
            <p>Or skip all that with one Terminal command:</p>
            <pre>
              <code>xattr -cr /Applications/Pigeon.app</code>
            </pre>
            <p className="install-note-foot">You only need to do this once.</p>
          </div>
        )}

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
      </div>
    </section>
  );
}
