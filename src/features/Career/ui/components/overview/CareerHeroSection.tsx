import React from "react";

import type { CareerHeroStats } from "../../../types/career";
import {
  formatCareerPlayTime,
  formatCareerRank,
  formatCareerScore,
} from "../../../model/careerUiFormatters";
import CareerSurface, { careerMiniCardClass } from "./CareerSurface";

interface CareerHeroSectionProps {
  hero: CareerHeroStats;
}

const CareerHeroSection: React.FC<CareerHeroSectionProps> = ({ hero }) => {
  return (
    <CareerSurface className="shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-sky-300/40 bg-[radial-gradient(circle_at_30%_30%,rgba(61,160,255,0.9),rgba(18,49,91,1))] text-xl font-bold text-white shadow-[0_0_0_6px_rgba(14,165,233,0.08)]">
          ZY
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-[var(--mc-text)]">
            {hero.displayName}
          </h2>
          <div className="mt-1 text-sm font-semibold text-sky-300">
            {hero.descriptor}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-300/28 bg-sky-300/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-sky-100">
              綜合表現
            </span>
            <span className="rounded-full border border-emerald-300/28 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-emerald-100">
              本週 delta
            </span>
            <span className="rounded-full border border-amber-300/28 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-amber-100">
              題庫變動
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            總場次
          </div>
          <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
            {hero.totalMatches.toLocaleString("zh-TW")}
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            總分數
          </div>
          <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
            {formatCareerScore(hero.totalScore)}
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            最高分
          </div>
          <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
            {formatCareerScore(hero.bestScore)}
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            最佳名次
          </div>
          <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
            {formatCareerRank(hero.bestRank)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            遊玩時數
          </div>
          <div className="mt-1 text-lg font-semibold text-[var(--mc-text)]">
            {formatCareerPlayTime(hero.playTimeSec)}
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            最高 Combo
          </div>
          <div className="mt-1 text-lg font-semibold text-[var(--mc-text)]">
            {hero.bestCombo ? `x${hero.bestCombo}` : "-"}
          </div>
        </div>
      </div>
    </CareerSurface>
  );
};

export default CareerHeroSection;
