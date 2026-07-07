import type { CSSProperties } from "react";
import { INSTALL_CMD, RELEASES_LATEST_URL, RELEASES_URL } from "../lib/constants";
import type { PlatformAsset } from "../types/release";
import { InstallBox } from "./CopyButton";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

const AppleIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15.5 8.5c-1.5 0-2.5 1-3.5 1s-2-1-3.5-1C6 8.5 4 10.5 4 13.5S6.5 21 8.5 21c1 0 1.5-.7 3-.7s2 .7 3 .7c2 0 4.5-4.5 4.5-7.5 0-2-1.5-3.5-3.5-5zM12 8c0-2 1.5-4 3.5-4 0 2-1.5 4-3.5 4z" />
  </svg>
);

export function DownloadSection({ assets }: { assets: PlatformAsset[] }) {
  const macAsset =
    assets.find((a) => a.platform === "darwin-arm64") ||
    assets.find((a) => a.platform === "darwin-x64") ||
    null;
  const linux = assets.find((a) => a.platform === "linux") ?? null;
  const windows = assets.find((a) => a.platform === "windows") ?? null;

  return (
    <section id="download" className="center">
      <div className="wrap">
        <p className="kicker reveal">download</p>
        <h2 className="reveal">Send your first request in 30 seconds.</h2>
        <p className="lead reveal" style={delay(0.1)}>
          Free forever. No account required.
        </p>
        <div className="dl-grid">
          <div className="dl-card active reveal">
            <div className="os-icon">{AppleIcon}</div>
            <h3>macOS</h3>
            <p className="meta">Apple Silicon &amp; Intel · one command</p>
            <InstallBox command={INSTALL_CMD} />
            <a
              className="rel-link"
              href={macAsset?.downloadUrl ?? RELEASES_LATEST_URL}
              aria-label="Download the macOS dmg from GitHub releases"
            >
              or grab the .dmg from Releases →
            </a>
          </div>

          <ComingOrDownload name="Linux" meta=".deb & .AppImage" asset={linux} style={delay(0.1)} />
          <ComingOrDownload
            name="Windows"
            meta=".msi installer"
            asset={windows}
            style={delay(0.2)}
          />
        </div>
      </div>
    </section>
  );
}

function ComingOrDownload({
  name,
  meta,
  asset,
  style,
}: {
  name: string;
  meta: string;
  asset: PlatformAsset | null;
  style: CSSProperties;
}) {
  return (
    <div className="dl-card reveal" style={style}>
      {asset ? (
        <>
          <h3>{name}</h3>
          <p className="meta">{meta} · ready</p>
          <a
            className="btn btn-primary"
            href={asset.downloadUrl}
            aria-label={`Download for ${name}`}
          >
            Download
          </a>
        </>
      ) : (
        <>
          <span className="soon">Coming soon</span>
          <h3>{name}</h3>
          <p className="meta">{meta} planned</p>
          <a
            className="btn btn-ghost"
            href={RELEASES_URL}
            aria-label={`Watch GitHub releases for the ${name} build`}
          >
            Watch releases
          </a>
        </>
      )}
    </div>
  );
}
