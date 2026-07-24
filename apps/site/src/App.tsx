import { DownloadSection } from "./components/DownloadSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { OpenSourceSection } from "./components/OpenSourceSection";
import { OrganizeSection } from "./components/OrganizeSection";
import { StatsBand } from "./components/StatsBand";
import { WhySection } from "./components/WhySection";
import { useScrollReveal } from "./hooks/useScrollReveal";

function App() {
  useScrollReveal();

  return (
    <>
      {/* First viewport = header + hero = 100vh */}
      <div className="hero-screen">
        <Header />
        <HeroSection />
      </div>
      <main>
        <StatsBand />
        <OrganizeSection />
        <FeaturesSection />
        <WhySection />
        <OpenSourceSection />
        <DownloadSection />
      </main>
      <Footer />
    </>
  );
}

export default App;
