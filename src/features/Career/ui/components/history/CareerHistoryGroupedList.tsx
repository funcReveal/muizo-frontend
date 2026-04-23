import { ChevronRightRounded } from "@mui/icons-material";
import React from "react";

import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import {
  formatCareerHistoryMonthDayTime,
  formatCareerHistoryRankFraction,
  formatCareerHistoryScore,
  getCareerHistoryGroupKeyFromSummary,
  isBetterCareerHistoryRankResult,
} from "../../../model/careerHistoryFormatters";
import type { HistoryListDisplayMode } from "../../../model/useCareerHistoryWorkspace";
import CareerHistoryMatchCard from "./CareerHistoryMatchCard";

interface CareerHistoryGroup {
  roomId: string;
  roomName: string;
  items: RoomSettlementHistorySummary[];
}

interface CareerHistoryGroupedListProps {
  groupedHistoryItems: CareerHistoryGroup[];
  historyDisplayMode: HistoryListDisplayMode;
  isGroupCollapsed: (groupKey: string) => boolean;
  onToggleGroup: (groupKey: string) => void;
  setGroupContainerRef: (groupKey: string, node: HTMLDivElement | null) => void;
  getSelfRankForSummary: (
    summary: RoomSettlementHistorySummary,
  ) => number | null;
  onOpenReplay: (summary: RoomSettlementHistorySummary) => void;
  nextCursorToken: string | null;
  loadingMoreList: boolean;
  onLoadMore: () => void;
}

const CareerHistoryGroupedList: React.FC<CareerHistoryGroupedListProps> = ({
  groupedHistoryItems,
  historyDisplayMode,
  isGroupCollapsed,
  onToggleGroup,
  setGroupContainerRef,
  getSelfRankForSummary,
  onOpenReplay,
  nextCursorToken,
  loadingMoreList,
  onLoadMore,
}) => {
  return (
    <>
      <div className="space-y-4">
        {groupedHistoryItems.map((group, groupIndex) => {
          const groupKey = group.items[0]
            ? getCareerHistoryGroupKeyFromSummary(group.items[0])
            : null;
          if (!groupKey) return null;

          const collapsed = isGroupCollapsed(groupKey);

          const groupBestScore = group.items.reduce(
            (max, entry) => Math.max(max, entry.selfPlayer?.finalScore ?? 0),
            0,
          );

          const groupBestRank = group.items.reduce<{
            rank: number;
            playerCount: number;
            endedAt: number;
          } | null>((best, entry) => {
            const rank = getSelfRankForSummary(entry);
            if (rank === null) return best;

            const next = {
              rank,
              playerCount: entry.playerCount,
              endedAt: entry.endedAt,
            };

            return isBetterCareerHistoryRankResult(next, best) ? next : best;
          }, null);

          const latestItem = group.items[0] ?? null;
          const latestPlayedAt =
            latestItem?.endedAt ?? latestItem?.startedAt ?? 0;
          const groupTotalQuestionCount = group.items.reduce(
            (sum, entry) => sum + Math.max(0, entry.questionCount),
            0,
          );

          const groupSummaryItems = [
            `最近遊玩 ${formatCareerHistoryMonthDayTime(latestPlayedAt)}`,
            `共 ${group.items.length} 場`,
            ...(groupBestScore > 0
              ? [`最佳分數 ${formatCareerHistoryScore(groupBestScore)}`]
              : []),
            `最佳名次 ${formatCareerHistoryRankFraction(
              groupBestRank?.rank ?? null,
              groupBestRank?.playerCount,
            )}`,
            ...(groupTotalQuestionCount > 0
              ? [`累計題數 ${groupTotalQuestionCount} 題`]
              : []),
          ];

          return (
            <div
              key={groupKey}
              className="relative space-y-1.5"
              ref={(node) => setGroupContainerRef(groupKey, node)}
            >
              <div className="relative">
                {collapsed && (
                  <>
                    <span
                      className="pointer-events-none absolute inset-x-4 top-0 z-0 h-full rounded-[16px] border border-amber-300/10 bg-[linear-gradient(180deg,rgba(14,11,9,0.86),rgba(7,6,4,0.94))]"
                      style={{ transform: "translateY(9px)" }}
                    />
                    <span
                      className="pointer-events-none absolute inset-x-2 top-0 z-10 h-full rounded-[16px] border border-amber-300/14 bg-[linear-gradient(180deg,rgba(16,13,10,0.9),rgba(8,7,5,0.97))]"
                      style={{ transform: "translateY(5px)" }}
                    />
                  </>
                )}

                <button
                  type="button"
                  className={`group relative z-20 block w-full min-w-0 overflow-hidden rounded-[16px] border px-3 py-3 text-left transition duration-200 ${
                    historyDisplayMode === "expanded"
                      ? "cursor-default border-amber-300/45 bg-[linear-gradient(180deg,rgba(24,20,14,0.97),rgba(10,8,6,1))] shadow-[0_12px_24px_-20px_rgba(245,158,11,0.38)]"
                      : collapsed
                        ? "border-amber-300/42 bg-[linear-gradient(180deg,rgba(22,18,13,0.98),rgba(10,8,6,1))] shadow-[0_10px_22px_-22px_rgba(245,158,11,0.3)] hover:border-amber-300/58"
                        : "border-amber-300/55 bg-[linear-gradient(180deg,rgba(24,20,14,0.97),rgba(10,8,6,1))] shadow-[0_12px_24px_-20px_rgba(245,158,11,0.42)]"
                  }`}
                  disabled={historyDisplayMode === "expanded"}
                  aria-expanded={!collapsed}
                  onClick={() => onToggleGroup(groupKey)}
                >
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-amber-300/45 opacity-85 transition group-hover:opacity-100" />

                  <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:gap-5">
                    <div className="min-w-0 pr-1">
                      <div className="truncate text-lg font-semibold tracking-tight text-[var(--mc-text)]">
                        {group.roomName || group.roomId}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--mc-text-muted)]">
                        {groupSummaryItems.map((summaryItem, index) => (
                          <React.Fragment key={summaryItem}>
                            {index > 0 && (
                              <span className="text-[var(--mc-text-muted)]/40">
                                •
                              </span>
                            )}
                            <span className="truncate">{summaryItem}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 self-start text-right xl:self-center">
                      <span
                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.12em] transition ${
                          historyDisplayMode === "expanded"
                            ? "border-emerald-300/42 bg-emerald-300/14 text-emerald-100"
                            : collapsed
                              ? "border-amber-300/45 bg-amber-300/16 text-amber-50"
                              : "border-amber-300/52 bg-amber-300/18 text-amber-50"
                        }`}
                      >
                        {historyDisplayMode === "expanded"
                          ? "完整顯示"
                          : collapsed
                            ? "展開"
                            : "收合"}

                        {historyDisplayMode !== "expanded" && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300/45 bg-amber-300/12">
                            <ChevronRightRounded
                              sx={{
                                fontSize: 14,
                                transform: collapsed
                                  ? "rotate(90deg)"
                                  : "rotate(270deg)",
                                transition: "transform 180ms ease",
                              }}
                            />
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              <div
                className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
                  collapsed
                    ? "mt-0 grid-rows-[0fr] opacity-0"
                    : "mt-1 grid-rows-[1fr] opacity-100"
                }`}
              >
                <div
                  className={
                    collapsed
                      ? "pointer-events-none min-h-0 overflow-hidden"
                      : "min-h-0 overflow-hidden"
                  }
                >
                  <div className="space-y-1.5 border-l border-amber-300/26 pl-3">
                    {group.items.map((item, itemIndex) => (
                      <div
                        key={item.matchId}
                        className={`relative transition-all duration-300 ease-out motion-reduce:transition-none ${
                          collapsed
                            ? "translate-y-2 opacity-0"
                            : "translate-y-0 opacity-100"
                        }`}
                        style={{
                          transitionDelay: collapsed
                            ? "0ms"
                            : `${50 + itemIndex * 35}ms`,
                        }}
                      >
                        <span
                          className={`pointer-events-none absolute -left-3 top-1/2 h-px w-3 -translate-y-1/2 bg-amber-300/48 transition-opacity duration-300 ${
                            collapsed ? "opacity-0" : "opacity-100"
                          }`}
                        />

                        <CareerHistoryMatchCard
                          item={item}
                          onOpenReplay={onOpenReplay}
                          getSelfRankForSummary={getSelfRankForSummary}
                          animationDelayMs={groupIndex * 40 + itemIndex * 28}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {nextCursorToken && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMoreList}
            className="inline-flex min-w-[132px] items-center justify-center rounded-full border border-sky-300/24 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingMoreList ? "載入中..." : "載入更多"}
          </button>
        </div>
      )}
    </>
  );
};

export default CareerHistoryGroupedList;
