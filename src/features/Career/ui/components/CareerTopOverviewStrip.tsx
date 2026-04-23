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
  "rounded-[16px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.5)] px-3 py-2.5";

const CareerTopOverviewStrip: React.FC<CareerTopOverviewStripProps> = ({
  hero,
}) => {
  return (
    <section className="shrink-0 rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))] p-4 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-sky-300/40 bg-[radial-gradient(circle_at_30%_30%,rgba(61,160,255,0.9),rgba(18,49,91,1))] text-lg font-bold text-white shadow-[0_0_0_6px_rgba(14,165,233,0.08)]">
              ZY
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--mc-text)]">
                戰績總覽
              </h1>
              <div className="mt-0.5 truncate text-sm font-semibold text-sky-300">
                {hero.displayName} · {hero.descriptor}
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--mc-text-muted)]">
                先把核心 overview 固定在上方，tabs
                與各工作區再放下面，讓整頁更像單頁 workbench。
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center self-start rounded-full border border-sky-300/28 bg-sky-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-sky-100">
          CAREER WORKBENCH
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
