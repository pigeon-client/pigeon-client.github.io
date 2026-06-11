import { PlatformAsset } from '../types/release';

interface HeroSectionProps {
  primaryDownload: PlatformAsset | null;
  detectedOS: string;
}

export function HeroSection({ primaryDownload, detectedOS }: HeroSectionProps) {
  const handleGetStarted = () => {
    if (primaryDownload) {
      window.open(primaryDownload.downloadUrl, '_blank');
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">PIGEON</h1>
        <p className="hero-tagline">API Testing, Simplified.</p>

        <button
          className="hero-cta"
          onClick={handleGetStarted}
          disabled={!primaryDownload}
        >
          Get Started for Your Platform ▼
        </button>
        <p className="hero-subtext">or scroll to learn more</p>
      </div>
    </section>
  );
}