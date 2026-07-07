import { DownloadSection } from "./components/DownloadSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { OpenSourceSection } from "./components/OpenSourceSection";
import { OrganizeSection } from "./components/OrganizeSection";
import { WhySection } from "./components/WhySection";
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
    <>
      <Header />
      <main>
        <HeroSection primaryDownload={primaryAsset} />
        <OrganizeSection />
        <FeaturesSection />
        <WhySection />
        <OpenSourceSection />
        <DownloadSection assets={parsed.assets} />
      </main>
      <Footer />
    </>
  );
}

export default App;
