import { DownloadSection } from "./components/DownloadSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { detectOS, parseRelease } from "./lib/github";
import releaseData from "./release.json";
import type { Release } from "./types/release";

/**
 * release.json is fetched at BUILD TIME by the GitHub Actions deploy workflow.
 * This avoids GitHub API rate limiting at runtime.
 */
const release = releaseData as Release;
const parsed = parseRelease(release);
const detectedOS = detectOS();
const primaryAsset =
  parsed.assets.find((a) => a.platform === detectedOS) || parsed.assets[0] || null;

function App() {
  useScrollReveal();

  return (
    <div className="app">
      <div className="bg-fx" aria-hidden="true" />
      <Header release={parsed} />
      <main>
        <HeroSection
          primaryDownload={primaryAsset}
          detectedOS={detectedOS}
          version={parsed.version}
        />
        <FeaturesSection />
        <DownloadSection assets={parsed.assets} detectedOS={detectedOS} />
      </main>
      <Footer version={parsed.version} />
    </div>
  );
}

export default App;
