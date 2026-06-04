import React from "react";
import EditRounded from "@mui/icons-material/EditRounded";

import type { CareerHeroStats } from "../../types/career";
import {
  formatCareerPlayTime,
  formatCareerScore,
} from "../../model/careerUiFormatters";

interface CareerTopOverviewStripProps {
  hero: CareerHeroStats;
  avatarUrl?: string | null;
  onEditProfile?: () => void;
}

const quickCardClass =
  "rounded-[11px] border border-white/8 bg-white/[0.045] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:min-w-[104px] sm:rounded-[12px] sm:px-2.5";

const CareerTopOverviewStrip: React.FC<CareerTopOverviewStripProps> = ({
  hero,
  avatarUrl,
  onEditProfile,
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
    <section className="relative shrink-0 overflow-hidden rounded-[18px] border border-[var(--mc-border)] bg-[radial-gradient(circle_at_16%_0%,rgba(245,158,11,0.16),transparent_34%),linear-gradient(180deg,rgba(20,17,13,0.98),rgba(8,7,5,0.99))] p-2.5 shadow-[0_20px_46px_-34px_var(--mc-glow),inset_0_1px_0_rgba(255,255,255,0.055)] sm:rounded-[20px] sm:p-3">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-amber-200/28 bg-[radial-gradient(circle_at_30%_25%,rgba(251,191,36,0.95),rgba(120,53,15,0.95))] text-sm font-bold text-white shadow-[0_0_0_5px_rgba(245,158,11,0.08),0_16px_30px_-24px_rgba(245,158,11,0.9)] sm:h-11 sm:w-11 sm:rounded-[14px]">
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
            <button
              type="button"
              onClick={onEditProfile}
              className="group/name inline-flex max-w-full items-center gap-1.5 rounded-[10px] text-left outline-none transition hover:bg-white/[0.055] focus-visible:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-amber-200/42"
            >
              <span className="truncate px-1 py-0.5 text-[15px] font-semibold tracking-tight text-[var(--mc-text)] sm:text-lg">
                {hero.displayName}
              </span>
              <EditRounded
                sx={{ fontSize: 15 }}
                className="shrink-0 text-amber-100/54 transition group-hover/name:text-amber-100"
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:w-auto">
          {stats.map((stat) => (
            <div key={stat.label} className={quickCardClass}>
              <div className="truncate text-[9px] tracking-[0.1em] text-[var(--mc-text-muted)] sm:text-[10px] sm:tracking-[0.12em]">
                {stat.label}
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-[var(--mc-text)] sm:text-base">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CareerTopOverviewStrip;
