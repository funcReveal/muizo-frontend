import React from "react";
import LandingHero from "./components/LandingHero";
import LandingFeatures from "./components/LandingFeatures";
import GoogleLoginCard from "./components/GoogleLoginCard";
import HowItWorksSection from "./components/HowItWorksSection";
import CommunityCallout from "./components/CommunityCallout";
import SearchDiscoverySection from "./components/SearchDiscoverySection";
import type { LandingPageProps } from "./types";
import "./LandingPage.css";

const LandingPage: React.FC<LandingPageProps> = ({authUser, ...authProps}) => (
  <section className="landing-shell">
    <div className="landing-top-grid">
      <LandingHero />
      <div className="landing-entry-grid">
        <GoogleLoginCard authUser={authUser} {...authProps} authLoading={authProps.authLoading ?? false} />
      </div>
      <LandingFeatures />
    </div>
    <div className="landing-lower-stack">
      <HowItWorksSection />
      <SearchDiscoverySection />
      <CommunityCallout />
    </div>
  </section>
);
export default LandingPage;
