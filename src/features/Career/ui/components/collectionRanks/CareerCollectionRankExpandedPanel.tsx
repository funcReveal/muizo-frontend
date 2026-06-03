import React from "react";

import type { CareerCollectionRankRow } from "../../../types/career";
import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import {
  formatCareerHistoryMonthDayTime,
  formatCareerHistoryRankFraction,
  formatCareerHistoryScore,
} from "../../../model/careerHistoryFormatters";
import { formatCareerScore } from "../../../model/careerUiFormatters";

interface CareerCollectionRankExpandedPanelProps {
  item: CareerCollectionRankRow;
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
}

const detailCellClassName =
  "rounded-[12px] border border-stone-300/12 bg-white/[0.035] px-3 py-2";

const CareerCollectionRankExpandedPanel: React.FC<
  CareerCollectionRankExpandedPanelProps
> = ({ item, onOpenMatch }) => {
  const summary = item.matchSummary ?? null;
  const selfPlayer = summary?.selfPlayer ?? null;
  const displayPlayerCount =
    summary?.playerCount ?? item.recentPlayerCount ?? null;

  return (
    <div className="rounded-[16px] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(24,22,18,0.86),rgba(10,9,8,0.96))] p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-amber-100/76">
            最近一場
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-[var(--mc-text)]">
            {summary?.roomName || item.title}
          </div>
          <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
            {summary
              ? formatCareerHistoryMonthDayTime(summary.endedAt)
              : (item.lastPlayedAt ?? "時間未知")}
          </div>
        </div>

        {summary && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenMatch(summary);
            }}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-sky-300/28 bg-sky-300/10 px-3 text-xs font-semibold text-sky-100 transition hover:border-sky-300/48 hover:bg-sky-300/16"
          >
            查看回顧
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className={detailCellClassName}>
          <div className="text-[11px] text-[var(--mc-text-muted)]">名次</div>
          <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
            {summary
              ? formatCareerHistoryRankFraction(
                  summary.selfRank ?? item.recentRank ?? null,
                  summary.playerCount,
                )
              : formatCareerHistoryRankFraction(
                  item.recentRank ?? null,
                  item.recentPlayerCount ?? null,
                )}
          </div>
        </div>

        <div className={detailCellClassName}>
          <div className="text-[11px] text-[var(--mc-text-muted)]">分數</div>
          <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
            {summary
              ? formatCareerHistoryScore(selfPlayer?.finalScore)
              : formatCareerScore(item.bestScore)}
          </div>
        </div>

        <div className={detailCellClassName}>
          <div className="text-[11px] text-[var(--mc-text-muted)]">答對</div>
          <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
            {summary && selfPlayer
              ? `${selfPlayer.correctCount}/${summary.questionCount}`
              : "-"}
          </div>
        </div>

        <div className={detailCellClassName}>
          <div className="text-[11px] text-[var(--mc-text-muted)]">Combo</div>
          <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
            {typeof selfPlayer?.maxCombo === "number"
              ? `x${selfPlayer.maxCombo}`
              : "-"}
          </div>
        </div>

        <div className={detailCellClassName}>
          <div className="text-[11px] text-[var(--mc-text-muted)]">人數</div>
          <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
            {displayPlayerCount
              ? `${displayPlayerCount.toLocaleString("zh-TW")} 人`
              : "-"}
          </div>
        </div>
      </div>

      {!summary && (
        <div className="mt-3 rounded-[12px] border border-amber-200/12 bg-amber-200/[0.045] px-3 py-2 text-xs text-amber-50/76">
          目前只有題庫榜單統計，尚未取得最近一場的完整回顧資料。
        </div>
      )}
    </div>
  );
};

export default CareerCollectionRankExpandedPanel;
