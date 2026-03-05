import React from "react";

import LandingHero from "./components/LandingHero";
import GoogleLoginCard from "./components/GoogleLoginCard";
import GuestEntryCard from "./components/GuestEntryCard";
import HowItWorksSection from "./components/HowItWorksSection";
import AuthComparisonSection from "./components/AuthComparisonSection";
import RecentUpdatesSection from "./components/RecentUpdatesSection";
import type { LandingPageProps } from "./types";
import "./LandingPage.css";

const LandingPage: React.FC<LandingPageProps> = ({
  usernameInput,
  onInputChange,
  onConfirm,
  onGoogleLogin,
  googleLoading = false,
  nicknameMaxLength = 16,
}) => {
  return (
    <section className="landing-shell relative overflow-hidden p-5 sm:p-6 lg:p-8">
      <div className="relative grid gap-6 lg:grid-cols-[1.08fr,0.92fr] lg:gap-7">
        <LandingHero />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <GoogleLoginCard
            onGoogleLogin={onGoogleLogin}
            googleLoading={googleLoading}
          />
          <GuestEntryCard
            usernameInput={usernameInput}
            onInputChange={onInputChange}
            onConfirm={onConfirm}
            nicknameMaxLength={nicknameMaxLength}
          />
        </div>
      </div>

      <div className="landing-info-grid mt-8 grid gap-4 lg:grid-cols-3">
        <HowItWorksSection />
        <AuthComparisonSection />
        <RecentUpdatesSection />
      </div>
    </section>
  );
};

export default LandingPage;
