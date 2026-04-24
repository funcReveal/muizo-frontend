import React from "react";

import type { CareerHeroStats } from "../../types/career";
import {
  formatCareerPlayTime,
  formatCareerRank,
  formatCareerScore,
} from "../../model/careerUiFormatters";

interface CareerTopOverviewStripProps {
  hero: CareerHeroStats;
}

const quickCardClass =
  "rounded-[16px] border border-white/8 bg-white/[0.045] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]";

const CareerTopOverviewStrip: React.FC<CareerTopOverviewStripProps> = ({
  hero,
}) => {
  return (
    <section className="relative shrink-0 overflow-hidden rounded-[26px] border border-cyan-100/14 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(251,191,36,0.13),transparent_30%),linear-gradient(180deg,rgba(8,15,28,0.98),rgba(2,6,23,0.99))] p-4 shadow-[0_22px_54px_-34px_rgba(34,211,238,0.7),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/28 bg-[radial-gradient(circle_at_30%_25%,rgba(125,211,252,0.95),rgba(8,47,73,0.95))] text-lg font-bold text-white shadow-[0_0_0_6px_rgba(34,211,238,0.08),0_18px_34px_-24px_rgba(34,211,238,0.9)]">
              {hero.displayName.trim().slice(0, 2).toUpperCase() || "MU"}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--mc-text)]">
                戰績總覽
              </h1>
              <div className="mt-0.5 truncate text-sm font-semibold text-sky-300">
                {hero.displayName} · {hero.descriptor}
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
                依照你的真實對戰紀錄同步總分、名次、題庫表現與近期成長。
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center self-start rounded-full border border-cyan-200/24 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-cyan-100">
          LIVE CAREER DATA
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
        <div className={quickCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            總場次
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {hero.totalMatches.toLocaleString("zh-TW")}
          </div>
        </div>

        <div className={quickCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            總分數
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {formatCareerScore(hero.totalScore)}
          </div>
        </div>

        <div className={quickCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            最高分
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {formatCareerScore(hero.bestScore)}
          </div>
        </div>

        <div className={quickCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            最佳名次
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {formatCareerRank(hero.bestRank)}
          </div>
        </div>

        <div className={quickCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            遊玩時數
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {formatCareerPlayTime(hero.playTimeSec)}
          </div>
        </div>

        <div className={quickCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            最高 Combo
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {hero.bestCombo ? `x${hero.bestCombo}` : "-"}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareerTopOverviewStrip;
