import type { PlatformAsset } from "../types/release";

interface HeroSectionProps {
  primaryDownload: PlatformAsset | null;
  detectedOS: string;
}

export function HeroSection({ primaryDownload }: HeroSectionProps) {
  const handleInstall = () => {
    window.open(
      "https://raw.githubusercontent.com/pigeon-client/pigeon/main/scripts/install.sh",
      "_blank",
    );
  };

  const isMac =
    primaryDownload?.platform === "darwin-arm64" || primaryDownload?.platform === "darwin-x64";

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          v0.1.1 Available
        </div>

        <h1 className="hero-title">
          <span className="hero-title-pigeon">PIGEON</span>
        </h1>

        <p className="hero-tagline">API Testing Tool for Lazy Devs</p>
        <p className="hero-subtitle">
          Send HTTP requests, manage collections, handle environments — without the mental overhead.
        </p>

        <div className="hero-actions">
          {primaryDownload ? (
            isMac ? (
              <button type="button" className="hero-cta" onClick={handleInstall}>
                <span className="cta-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </span>
                Install via Terminal
              </button>
            ) : (
              <button
                type="button"
                className="hero-cta"
                onClick={() =>
                  primaryDownload && window.open(primaryDownload.downloadUrl, "_blank")
                }
              >
                <span className="cta-icon">
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
                </span>
                Download for $
                {{
                  "darwin-arm64": "macOS",
                  "darwin-x64": "macOS",
                  windows: "Windows",
                  linux: "Linux",
                }[primaryDownload.platform] ?? "Your Platform"}
              </button>
            )
          ) : (
            <a
              href="https://github.com/pigeon-client/pigeon-client.github.io/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-cta"
            >
              View Releases on GitHub
            </a>
          )}

          <a href="#features" className="hero-secondary-cta">
            See all features
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </a>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">7</span>
            <span className="stat-label">HTTP Methods</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">3</span>
            <span className="stat-label">Platforms</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">0</span>
            <span className="stat-label">Setup Headache</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="code-window">
          <div className="code-window-header">
            <span className="code-dot red" />
            <span className="code-dot yellow" />
            <span className="code-dot green" />
            <span className="code-title">Pigeon</span>
          </div>
          <pre className="code-content">
            <code>
              <span className="code-method get">GET</span>{" "}
              <span className="code-url">/api/users</span>
              {"\n"}
              {"\n"}
              <span className="code-header"># Headers</span>
              {"\n"}
              <span className="code-key">Authorization:</span>{" "}
              <span className="code-value">Bearer {"{{token}}"}</span>
              {"\n"}
              {"\n"}
              <span className="code-header"># Response 200 OK</span>
              {"\n"}
              <span className="code-bracket">{"{"}</span>
              {"\n"} <span className="code-string">"users"</span>:{" "}
              <span className="code-bracket">[</span>
              {"\n"} <span className="code-bracket">{"{"}</span>
              {"\n"} <span className="code-string">"id"</span>:{" "}
              <span className="code-number">1</span>,{"\n"}{" "}
              <span className="code-string">"name"</span>:{" "}
              <span className="code-string">"Alice"</span>
              {"\n"} <span className="code-bracket">{"}"}</span>
              {"\n"} <span className="code-bracket">]</span>
              {"\n"}
              <span className="code-bracket">{"}"}</span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
