import { useMemo } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { DownloadSection } from './components/DownloadSection';
import { Footer } from './components/Footer';
import { parseRelease, detectOS } from './lib/github';
import type { Release } from './types/release';
import releaseData from './release.json';

/**
 * release.json is fetched at BUILD TIME by the GitHub Actions deploy workflow.
 * This avoids GitHub API rate limiting at runtime.
 */
const release = releaseData as Release;
const parsed = parseRelease(release);
const detectedOS = detectOS();
const primaryAsset = parsed.assets.find(a => a.platform === detectedOS) || parsed.assets[0] || null;

function App() {
  return (
    <div className="app">
      <Header release={parsed} />
      <main>
        <HeroSection primaryDownload={primaryAsset} detectedOS={detectedOS} />
        <FeaturesSection />
        <DownloadSection assets={parsed.assets} detectedOS={detectedOS} />
      </main>
      <Footer />
    </div>
  );
}

export default App;