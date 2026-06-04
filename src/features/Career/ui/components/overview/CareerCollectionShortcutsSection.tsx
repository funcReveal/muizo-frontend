import React from "react";

import type { CareerCollectionRankShortcutItem } from "../../../types/career";
import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import {
  formatCareerDelta,
  formatCareerRank,
  getCareerDeltaClassName,
} from "../../../model/careerUiFormatters";
import CareerSurface from "./CareerSurface";

interface CareerCollectionShortcutsSectionProps {
  items: CareerCollectionRankShortcutItem[];
  activeScopeKind: "casual" | "leaderboard";
  onOpenCollectionRanks: () => void;
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
}

const CareerCollectionShortcutsSection: React.FC<
  CareerCollectionShortcutsSectionProps
> = ({ items, activeScopeKind, onOpenCollectionRanks, onOpenMatch }) => {
  const visibleItems = items.slice(0, 6);
  const placeholderCount = Math.max(0, 6 - visibleItems.length);
  const rows = [
    ...visibleItems.map((item) => ({ key: item.id, item })),
    ...Array.from({ length: placeholderCount }, (_, index) => ({
      key: `placeholder-${index}`,
      item: null,
    })),
  ];
  const formatRecentRank = (item: CareerCollectionRankShortcutItem) => {
    if (item.recentRank === null || !Number.isFinite(item.recentRank)) {
      return "名次 -";
    }

    const rankPrefix = activeScopeKind === "leaderboard" ? "當時 #" : "第 ";
    const rankSuffix = activeScopeKind === "leaderboard" ? "" : " 名";

    if (
      item.recentPlayerCount !== null &&
      Number.isFinite(item.recentPlayerCount) &&
      item.recentPlayerCount > 0
    ) {
      return `${rankPrefix}${item.recentRank}/${item.recentPlayerCount}${rankSuffix}`;
    }

    return `${rankPrefix}${item.recentRank}${rankSuffix}`;
  };

  return (
    <CareerSurface className="flex min-h-0 flex-1 flex-col sm:min-h-[360px] xl:min-h-[420px]">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-[var(--mc-text)]">
          近期遊玩
        </h3>

        <button
          type="button"
          onClick={onOpenCollectionRanks}
          className="rounded-full border border-[var(--mc-border)] bg-amber-300/12 px-3 py-1.5 text-[11px] font-semibold text-[var(--mc-text)] transition hover:border-[var(--mc-accent)] hover:bg-amber-300/20"
        >
          全部
        </button>
      </div>

      <div
        className="mt-2.5 flex min-h-0 gap-2 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] sm:grid sm:flex-1 sm:overflow-hidden sm:pb-0 [&::-webkit-scrollbar]:hidden"
        style={{
          gridTemplateRows: "repeat(6, minmax(0, 1fr))",
        }}
      >
        {rows.map(({ key, item }) =>
          item ? (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (item.matchSummary) {
                  onOpenMatch(item.matchSummary);
                  return;
                }
                onOpenCollectionRanks();
              }}
              className="grid h-[132px] min-h-0 w-[274px] shrink-0 grid-cols-[86px_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.04] text-left transition hover:border-amber-200/20 hover:bg-white/[0.06] sm:h-full sm:w-full sm:grid-cols-[76px_minmax(0,1fr)]"
            >
              <div className="relative h-full min-h-0 overflow-hidden bg-[linear-gradient(135deg,rgba(245,158,11,0.24),rgba(15,23,42,0.58))]">
                {item.coverThumbnailUrl ? (
                  <img
                    src={item.coverThumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-amber-100/80">
                    {item.title.trim().slice(0, 1) || "題"}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/48 to-transparent" />
              </div>

              <div className="flex min-h-0 min-w-0 items-center justify-between gap-2 overflow-hidden p-2">
                <div className="min-w-0 overflow-hidden">
                  <div className="truncate text-[13px] font-semibold text-[var(--mc-text)]">
                    {item.title}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]">
                    {item.lastPlayedAt
                      ? `最近 ${item.lastPlayedAt}`
                      : "最近時間未知"}
                  </div>
                  <div className="mt-1.5 flex max-h-6 flex-wrap items-center gap-1.5 overflow-hidden text-[11px] font-semibold">
                    <span className="rounded-full border border-amber-200/16 bg-amber-300/10 px-2 py-0.5 text-amber-100">
                      {formatRecentRank(item)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[var(--mc-text-muted)]">
                      {activeScopeKind === "leaderboard"
                        ? `榜單 ${formatCareerRank(item.leaderboardRank)}`
                        : (item.sourceLabel ?? "題庫來源未知")}
                    </span>
                  </div>
                </div>

                {activeScopeKind === "leaderboard" && (
                  <div
                    className={`shrink-0 text-xs font-semibold ${getCareerDeltaClassName(
                      item.delta,
                    )}`}
                  >
                    {formatCareerDelta(item.delta)}
                  </div>
                )}
              </div>
            </button>
          ) : (
            <div
              key={key}
              className="hidden h-full min-h-0 w-full grid-cols-[76px_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-dashed border-white/8 bg-white/[0.018] sm:grid"
            >
              <div className="h-full min-h-0 bg-white/[0.025]" />
              <div className="flex min-h-0 min-w-0 items-center px-2.5 text-[11px] text-[var(--mc-text-muted)]/60">
                {visibleItems.length === 0 ? "尚無題庫戰績" : "預留紀錄"}
              </div>
            </div>
          )
        )}
      </div>
    </CareerSurface>
  );
};

export default CareerCollectionShortcutsSection;
