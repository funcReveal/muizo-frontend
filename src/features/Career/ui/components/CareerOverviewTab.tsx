import React from "react";

import type {
  CareerCollectionRankShortcutItem,
  CareerCompositeStats,
  CareerHeroStats,
  CareerHighlightItem,
  CareerWeeklyStats,
} from "../../types/career";

interface CareerOverviewTabProps {
  hero: CareerHeroStats;
  composite: CareerCompositeStats;
  weekly: CareerWeeklyStats;
  highlights: CareerHighlightItem[];
  collectionShortcuts: CareerCollectionRankShortcutItem[];
  onOpenCollectionRanks: () => void;
  onOpenShare: () => void;
}

const panelClass =
  "rounded-[22px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))] p-4 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)]";

const miniCardClass =
  "rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)] p-3";

const formatScore = (score: number | null) => {
  if (score === null || !Number.isFinite(score)) return "-";
  return Math.floor(score).toLocaleString("zh-TW");
};

const formatRank = (rank: number | null) => {
  if (rank === null || !Number.isFinite(rank)) return "-";
  return `#${rank}`;
};

const formatPercent = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
};

const formatSignedInt = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value > 0) return `+${Math.round(value)}`;
  if (value < 0) return `${Math.round(value)}`;
  return "±0";
};

const formatSignedPercent = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100);
  if (rounded > 0) return `+${rounded}%`;
  if (rounded < 0) return `${rounded}%`;
  return "±0%";
};

const formatPlayTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDelta = (delta: number | null) => {
  if (delta === null || !Number.isFinite(delta)) return "—";
  if (delta > 0) return `↑ +${delta}`;
  if (delta < 0) return `↓ ${delta}`;
  return "→ 0";
};

const deltaClassName = (delta: number | null) => {
  if (delta === null || !Number.isFinite(delta)) return "text-slate-300";
  if (delta > 0) return "text-emerald-300";
  if (delta < 0) return "text-rose-300";
  return "text-slate-300";
};

const CareerOverviewTab: React.FC<CareerOverviewTabProps> = ({
  hero,
  composite,
  weekly,
  highlights,
  collectionShortcuts,
  onOpenCollectionRanks,
  onOpenShare,
}) => {
  const maxTrend = Math.max(...composite.trend.map((item) => item.score), 1);

  return (
    <div className="h-full min-h-0 overflow-auto pr-1 xl:overflow-hidden xl:pr-0">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="flex min-h-0 flex-col gap-4">
          <section className={`${panelClass} shrink-0`}>
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
              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  總場次
                </div>
                <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                  {hero.totalMatches.toLocaleString("zh-TW")}
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  總分數
                </div>
                <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                  {formatScore(hero.totalScore)}
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  最高分
                </div>
                <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                  {formatScore(hero.bestScore)}
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  最佳名次
                </div>
                <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                  {formatRank(hero.bestRank)}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  遊玩時數
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--mc-text)]">
                  {formatPlayTime(hero.playTimeSec)}
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  最高 Combo
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--mc-text)]">
                  {hero.bestCombo ? `x${hero.bestCombo}` : "-"}
                </div>
              </div>
            </div>
          </section>

          <section className={`${panelClass} min-h-0 flex-1`}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-text)]">
                  綜合表現
                </h3>
                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  不看單場而已，也看整體穩定度
                </p>
              </div>

              <div className="rounded-full border border-sky-300/24 bg-sky-300/10 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-sky-100">
                OVERALL
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  平均名次
                </div>
                <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
                  {composite.averagePlacement?.toFixed(1) ?? "-"}
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  平均得分
                </div>
                <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
                  {formatScore(composite.averageScore)}
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  Top 3 率
                </div>
                <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
                  {formatPercent(composite.top3Rate)}
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  第一名
                </div>
                <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
                  {composite.firstPlaceCount.toLocaleString("zh-TW")}
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  平均答對率
                </div>
                <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
                  {formatPercent(composite.averageAccuracyRate)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex min-h-[180px] items-end gap-2">
              {composite.trend.map((point) => {
                const height = Math.max(
                  18,
                  Math.round((point.score / maxTrend) * 120),
                );

                return (
                  <div
                    key={`${point.label}-${point.score}`}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div className="text-[10px] text-slate-300">
                      {point.score.toLocaleString("zh-TW")}
                    </div>

                    <div className="flex h-[124px] items-end">
                      <div
                        className="w-7 rounded-t-lg bg-[linear-gradient(180deg,rgba(56,189,248,0.95),rgba(29,78,216,0.88))] shadow-[0_0_18px_rgba(14,165,233,0.28)]"
                        style={{ height }}
                      />
                    </div>

                    <div className="text-[10px] text-[var(--mc-text-muted)]">
                      {point.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid min-h-0 gap-4 xl:grid-rows-[auto_auto_minmax(0,1fr)]">
          <section className={panelClass}>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-text)]">
                本週進度
              </h3>
              <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                這區只講最近有沒有往前推
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  本週對戰
                </div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="text-2xl font-semibold text-[var(--mc-text)]">
                    {weekly.currentMatches.toLocaleString("zh-TW")}
                  </div>
                  <div className="text-sm font-semibold text-emerald-300">
                    {formatSignedInt(weekly.matchesDelta)}
                  </div>
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  本週總分
                </div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="text-2xl font-semibold text-[var(--mc-text)]">
                    {formatScore(weekly.currentScore)}
                  </div>
                  <div className="text-sm font-semibold text-emerald-300">
                    {formatSignedInt(weekly.scoreDelta)}
                  </div>
                </div>
              </div>

              <div className={miniCardClass}>
                <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
                  本週答對率
                </div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="text-2xl font-semibold text-[var(--mc-text)]">
                    {formatPercent(weekly.currentAccuracyRate)}
                  </div>
                  <div className="text-sm font-semibold text-emerald-300">
                    {formatSignedPercent(weekly.accuracyDelta)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={panelClass}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-text)]">
                  題庫戰績捷徑
                </h3>
                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  先看最近變動最大的題庫
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenCollectionRanks}
                className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/16"
              >
                查看全部
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {collectionShortcuts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-[16px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--mc-text-muted)]">
                      榜單名次 {formatRank(item.leaderboardRank)}
                    </div>
                  </div>

                  <div
                    className={`shrink-0 text-sm font-semibold ${deltaClassName(
                      item.delta,
                    )}`}
                  >
                    {formatDelta(item.delta)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${panelClass} min-h-0 overflow-hidden`}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-text)]">
                  高光紀錄
                </h3>
                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  值得炫耀的代表表現
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenShare}
                className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/16"
              >
                前往分享
              </button>
            </div>

            <div className="mt-4 grid h-[calc(100%-56px)] min-h-0 gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={`${item.key}-${item.label}`}
                  className={`rounded-[18px] border p-3 ${item.accentClass}`}
                >
                  <div className="text-[11px] tracking-[0.12em] text-slate-200/90">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {item.value}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-200/80">
                    {item.subtitle}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CareerOverviewTab;
