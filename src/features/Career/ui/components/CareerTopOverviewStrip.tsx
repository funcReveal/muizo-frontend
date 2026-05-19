import React from "react";

import type { CareerHeroStats } from "../../types/career";
import {
  formatCareerPlayTime,
  formatCareerScore,
} from "../../model/careerUiFormatters";

interface CareerTopOverviewStripProps {
  hero: CareerHeroStats;
  avatarUrl?: string | null;
  children?: React.ReactNode;
}

const quickCardClass =
  "rounded-[12px] border border-white/8 bg-white/[0.045] px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:min-w-[104px]";

const CareerTopOverviewStrip: React.FC<CareerTopOverviewStripProps> = ({
  hero,
  avatarUrl,
  children,
}) => {
  const avatarLabel = hero.displayName.trim().slice(0, 2).toUpperCase() || "MU";

  const stats = [
    {
      label: "總場次",
      value: hero.totalMatches.toLocaleString("zh-TW"),
    },
    {
      label: "總分數",
      value: formatCareerScore(hero.totalScore),
    },
    {
      label: "遊玩時數",
      value: formatCareerPlayTime(hero.playTimeSec),
    },
  ];

  return (
    <section className="relative shrink-0 overflow-hidden rounded-[20px] border border-[var(--mc-border)] bg-[radial-gradient(circle_at_16%_0%,rgba(245,158,11,0.16),transparent_34%),linear-gradient(180deg,rgba(20,17,13,0.98),rgba(8,7,5,0.99))] p-3 shadow-[0_20px_46px_-34px_var(--mc-glow),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-amber-200/28 bg-[radial-gradient(circle_at_30%_25%,rgba(251,191,36,0.95),rgba(120,53,15,0.95))] text-sm font-bold text-white shadow-[0_0_0_5px_rgba(245,158,11,0.08),0_16px_30px_-24px_rgba(245,158,11,0.9)]">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={hero.displayName}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              avatarLabel
            )}
            <span className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/18" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-[var(--mc-text)] sm:text-lg">
              {hero.displayName}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:w-auto">
          {stats.map((stat) => (
            <div key={stat.label} className={quickCardClass}>
              <div className="text-[10px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                {stat.label}
              </div>
              <div className="mt-0.5 truncate text-base font-semibold text-[var(--mc-text)]">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {children && (
        <div className="mt-3 border-t border-white/8 pt-2.5">{children}</div>
      )}
    </section>
  );
};

export default CareerTopOverviewStrip;
