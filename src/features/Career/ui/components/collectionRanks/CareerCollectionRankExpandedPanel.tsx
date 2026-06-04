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
  const recentSummaries =
    item.matchSummaries && item.matchSummaries.length > 0
      ? item.matchSummaries
      : summary
        ? [summary]
        : [];
  const rankDeltaLabel =
    typeof item.delta === "number" && Number.isFinite(item.delta)
      ? item.delta > 0
        ? `進步 ${item.delta}`
        : item.delta < 0
          ? `下降 ${Math.abs(item.delta)}`
          : "持平"
      : "-";

  return (
    <div className="space-y-3">
      <section className="rounded-[16px] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(24,22,18,0.86),rgba(10,9,8,0.96))] p-3">
        <div className="text-xs font-semibold text-amber-100/76">
          最佳紀錄
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className={detailCellClassName}>
            <div className="text-[11px] text-[var(--mc-text-muted)]">
              榜單名次
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
              {formatCareerHistoryRankFraction(item.leaderboardRank, null)}
            </div>
          </div>

          <div className={detailCellClassName}>
            <div className="text-[11px] text-[var(--mc-text-muted)]">
              最佳分數
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
              {formatCareerScore(item.bestScore)}
            </div>
          </div>

          <div className={detailCellClassName}>
            <div className="text-[11px] text-[var(--mc-text-muted)]">
              排名變動
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
              {rankDeltaLabel}
            </div>
          </div>

          <div className={detailCellClassName}>
            <div className="text-[11px] text-[var(--mc-text-muted)]">
              遊玩場次
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--mc-text)]">
              {item.playCount.toLocaleString("zh-TW")}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[16px] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(24,22,18,0.86),rgba(10,9,8,0.96))] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-amber-100/76">
            近期遊玩
          </div>
          <div className="text-xs text-[var(--mc-text-muted)]">
            {item.playCount.toLocaleString("zh-TW")} 場
          </div>
        </div>

        {recentSummaries.length > 0 ? (
          <div className="mt-3 space-y-2">
            {recentSummaries.map((recentSummary) => {
              const recentSelfPlayer = recentSummary.selfPlayer ?? null;
              const rankLabel = formatCareerHistoryRankFraction(
                recentSummary.selfRank ?? null,
                recentSummary.playerCount,
              );
              const correctLabel = recentSelfPlayer
                ? `${recentSelfPlayer.correctCount}/${recentSummary.questionCount}`
                : "-";
              const comboLabel =
                typeof recentSelfPlayer?.maxCombo === "number"
                  ? `x${recentSelfPlayer.maxCombo}`
                  : "-";

              return (
                <button
                  key={recentSummary.matchId}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenMatch(recentSummary);
                  }}
                  className="grid w-full cursor-pointer grid-cols-1 gap-2 rounded-[14px] border border-white/10 bg-white/[0.035] px-3 py-2.5 text-left transition hover:border-sky-300/30 hover:bg-sky-300/[0.06] sm:grid-cols-[minmax(0,1.25fr)_86px_96px_84px_74px]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-xs font-semibold text-amber-100">
                      {recentSelfPlayer?.avatarUrl ? (
                        <img
                          src={recentSelfPlayer.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        recentSelfPlayer?.usernameSnapshot?.trim().slice(0, 1) ||
                        "玩"
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                        {recentSummary.roomName || item.title}
                      </div>
                      <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                        {formatCareerHistoryMonthDayTime(recentSummary.endedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:block">
                    <div className="text-[11px] text-[var(--mc-text-muted)]">
                      名次
                    </div>
                    <div className="text-sm font-semibold text-[var(--mc-text)] sm:mt-1">
                      {rankLabel}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:block">
                    <div className="text-[11px] text-[var(--mc-text-muted)]">
                      分數
                    </div>
                    <div className="text-sm font-semibold text-[var(--mc-text)] sm:mt-1">
                      {formatCareerHistoryScore(recentSelfPlayer?.finalScore)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:block">
                    <div className="text-[11px] text-[var(--mc-text-muted)]">
                      答對
                    </div>
                    <div className="text-sm font-semibold text-[var(--mc-text)] sm:mt-1">
                      {correctLabel}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:block">
                    <div className="text-[11px] text-[var(--mc-text-muted)]">
                      Combo
                    </div>
                    <div className="text-sm font-semibold text-[var(--mc-text)] sm:mt-1">
                      {comboLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-[12px] border border-amber-200/12 bg-amber-200/[0.045] px-3 py-2 text-xs text-amber-50/76">
            目前只有題庫榜單統計，尚未取得近期遊玩的完整回顧資料。
          </div>
        )}
      </section>
    </div>
  );
};

export default CareerCollectionRankExpandedPanel;
