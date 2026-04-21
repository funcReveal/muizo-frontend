import React, { useEffect, useRef } from "react";

import LandingHero from "./components/LandingHero";
import GoogleLoginCard from "./components/GoogleLoginCard";
import GuestEntryCard from "./components/GuestEntryCard";
import HowItWorksSection from "./components/HowItWorksSection";
import AuthComparisonSection from "./components/AuthComparisonSection";
import CommunityCallout from "./components/CommunityCallout";
import SearchDiscoverySection from "./components/SearchDiscoverySection";
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
  const shellRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const isMobileViewport = window.matchMedia("(max-width: 640px)").matches;
    const stageElements = Array.from(
      shell.querySelectorAll<HTMLElement>("[data-landing-stage]"),
    );
    if (stageElements.length === 0) return;

    stageElements[0]?.classList.add("is-visible");
    if (!("IntersectionObserver" in window)) {
      stageElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio;
          if (isMobileViewport) {
            const visibleHeight = entry.intersectionRect.height;
            if (entry.isIntersecting && visibleHeight >= 56) {
              entry.target.classList.add("is-visible");
              entry.target.classList.remove("is-peek");
              observer.unobserve(entry.target);
            }
            return;
          }
          if (ratio >= 0.24) {
            entry.target.classList.add("is-visible");
            entry.target.classList.remove("is-peek");
            return;
          }
          if (ratio > 0) {
            entry.target.classList.remove("is-visible");
            entry.target.classList.add("is-peek");
            return;
          }
          entry.target.classList.remove("is-peek");
          entry.target.classList.remove("is-visible");
        });
      },
      { threshold: [0, 0.08, 0.24], rootMargin: "0px 0px -10% 0px" },
    );

    stageElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const updateGuidePeekByScroll = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!isDesktop) {
        shell.style.setProperty("--landing-guide-peek", "0");
        return;
      }

      const scrollY = window.scrollY || window.pageYOffset || 0;
      const fadeDistance = 300;
      const progress = Math.min(Math.max(scrollY / fadeDistance, 0), 1);
      const peekStrength = 1 - progress;
      shell.style.setProperty("--landing-guide-peek", peekStrength.toFixed(3));
    };

    updateGuidePeekByScroll();
    window.addEventListener("scroll", updateGuidePeekByScroll, {
      passive: true,
    });
    window.addEventListener("resize", updateGuidePeekByScroll);

    return () => {
      window.removeEventListener("scroll", updateGuidePeekByScroll);
      window.removeEventListener("resize", updateGuidePeekByScroll);
    };
  }, []);

  return (
    <section
      ref={shellRef}
      className="landing-shell relative overflow-hidden p-5 sm:p-6 lg:p-8"
    >
      <section
        className="landing-stage landing-stage-plain is-visible"
        data-landing-stage
      >
        <div className="landing-stage-content">
          <div className="landing-top-grid relative grid gap-6 lg:grid-cols-[1.08fr,0.92fr] lg:gap-7">
            <LandingHero />

            <div className="landing-entry-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
        </div>
      </section>

      <section
        className="landing-stage landing-stage-guide landing-stage-scroll-fade"
        data-landing-stage
      >
        <div className="landing-stage-head">
          <p className="landing-stage-kicker">快速導覽</p>
          <h2 className="landing-stage-title">開始前，先看這 2 件重點</h2>
        </div>
        <div className="landing-stage-content landing-info-grid landing-info-grid-mobile-scroll mt-8 grid gap-4 lg:grid-cols-2">
          <HowItWorksSection />
          <AuthComparisonSection />
        </div>
      </section>

      <section
        className="landing-stage landing-stage-search landing-stage-scroll-fade"
        data-landing-stage
      >
        <div className="landing-stage-head">
          <p className="landing-stage-kicker">搜尋與玩法</p>
          <h2 className="landing-stage-title">線上猜歌遊戲與歌曲問答平台</h2>
        </div>
        <div className="landing-stage-content mt-4">
          <SearchDiscoverySection />
        </div>
      </section>

      <section
        className="landing-stage landing-stage-community landing-stage-scroll-fade"
        data-landing-stage
      >
        <div className="landing-stage-head">
          <p className="landing-stage-kicker">參與開發</p>
          <h2 className="landing-stage-title">一起定義下一版 Muizo</h2>
        </div>
        <div className="landing-stage-content mt-4">
          <CommunityCallout />
        </div>
      </section>
    </section>
  );
};

export default LandingPage;
