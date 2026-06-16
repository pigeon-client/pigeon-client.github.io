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
