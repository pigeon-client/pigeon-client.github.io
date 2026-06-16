import type { PlatformAsset } from "../types/release";

interface HeroSectionProps {
  primaryDownload: PlatformAsset | null;
  detectedOS: string;
}

export function HeroSection({ primaryDownload, detectedOS: _detectedOS }: HeroSectionProps) {
  const handleGetStarted = () => {
    if (primaryDownload) {
      window.open(primaryDownload.downloadUrl, "_blank");
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">PIGEON</h1>
        <p className="hero-tagline">API Testing, Simplified.</p>

        {primaryDownload ? (
          <button type="button" className="hero-cta" onClick={handleGetStarted}>
            Download for Your Platform ▼
          </button>
        ) : (
          <a
            href="https://github.com/pigeon-client/pigeon-client.github.io/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="hero-cta"
          >
            View Releases on GitHub ↗
          </a>
        )}
        <p className="hero-subtext">or scroll to learn more</p>
      </div>
    </section>
  );
}
