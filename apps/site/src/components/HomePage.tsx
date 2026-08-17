import { useScrollReveal } from "../hooks/useScrollReveal";
import { DownloadSection } from "./DownloadSection";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import { MomentsSection } from "./MomentsSection";
import { OpenSourceSection } from "./OpenSourceSection";
import { OrganizeSection } from "./OrganizeSection";
import { StatsBand } from "./StatsBand";
import { WhySection } from "./WhySection";

/** Landing page body — SSR'd by Astro, hydrated for demos / scroll reveal. */
export default function HomePage() {
  useScrollReveal();

  return (
    <>
      <div className="hero-screen">
        <HeroSection />
      </div>
      <main>
        <StatsBand />
        <OrganizeSection />
        <MomentsSection />
        <FeaturesSection />
        <WhySection />
        <OpenSourceSection />
        <DownloadSection />
      </main>
    </>
  );
}
