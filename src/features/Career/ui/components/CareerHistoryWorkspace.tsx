import { CircularProgress } from "@mui/material";
import { KeyboardArrowUpRounded } from "@mui/icons-material";
import React from "react";

import HistoryReplayDialog from "@features/Settlement/ui/components/roomHistoryPage/HistoryReplayDialog";

import useCareerHistoryWorkspace from "../../model/useCareerHistoryWorkspace";
import CareerHistoryGroupedList from "./history/CareerHistoryGroupedList";

type CareerHistoryWorkspaceController = ReturnType<
  typeof useCareerHistoryWorkspace
>;

interface CareerHistoryWorkspaceProps {
  workspace: CareerHistoryWorkspaceController;
}

const CareerHistoryWorkspace: React.FC<CareerHistoryWorkspaceProps> = ({
  workspace,
}) => {
  const {
    clientId,
    scrollHostRef,
    loadingList,
    loadingMoreList,
    listError,
    nextCursorToken,
    isHistoryRequestBlocked,
    showBackToTop,
    groupedHistoryItems,
    historyModeFilter,
    setHistoryModeFilter,
    historyCollectionFilterId,
    setHistoryCollectionFilterId,
    historyCollectionFilterOptions,
    filteredHistoryItemCount,
    totalHistoryItemCount,
    selectedSummary,
    selectedRelatedSummaries,
    selectedReplay,
    isLoadingSelectedReplay,
    normalizedSelectedQuestionRecaps,
    openReplayDetail,
    closeReplayDetail,
    handleLoadMoreHistory,
    handleBackToTop,
    handleHistoryScroll,
    formatDateTime,
    getMatchDurationMs,
    formatDuration,
  } = workspace;
  const shouldShowFilterBar =
    !loadingList && !listError && totalHistoryItemCount > 0;
  const hasVisibleHistoryItems = groupedHistoryItems.length > 0;
  const isFilteredEmpty =
    shouldShowFilterBar && totalHistoryItemCount > 0 && !hasVisibleHistoryItems;

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4">
      <div className="min-h-0 flex-1">
        {loadingList || listError || !hasVisibleHistoryItems ? (
          <div ref={scrollHostRef} className="h-full overflow-auto pr-1">
            <section className="space-y-4">
              {shouldShowFilterBar && (
                <CareerHistoryFilterBar
                  modeFilter={historyModeFilter}
                  onModeFilterChange={setHistoryModeFilter}
                  collectionFilterId={historyCollectionFilterId}
                  onCollectionFilterChange={setHistoryCollectionFilterId}
                  collectionOptions={historyCollectionFilterOptions}
                  filteredCount={filteredHistoryItemCount}
                  totalCount={totalHistoryItemCount}
                />
              )}

              {isHistoryRequestBlocked && (
                <div className="rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  你的查詢頻率過高，已暫時限制歷史請求，請稍後再試。
                </div>
              )}

              {loadingList ? (
                <div className="flex items-center justify-center rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.86),rgba(8,7,5,0.96))] px-6 py-10 text-[var(--mc-text-muted)]">
                  <div className="inline-flex items-center gap-3">
                    <CircularProgress
                      size={18}
                      thickness={5}
                      sx={{ color: "#f59e0b" }}
                    />
                    載入對戰歷史中...
                  </div>
                </div>
              ) : listError ? (
                <div className="rounded-[24px] border border-rose-400/20 bg-rose-950/20 px-6 py-5 text-sm text-rose-100">
                  {listError}
                </div>
              ) : isFilteredEmpty ? (
                <div className="relative overflow-hidden rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.86),rgba(8,7,5,0.96))] p-6 text-center">
                  <h2 className="text-lg font-semibold text-[var(--mc-text)]">
                    沒有符合篩選的對戰紀錄
                  </h2>
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)]">
                    調整休閒、排行或收藏庫篩選後，可以重新查看已載入的紀錄。
                  </p>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.86),rgba(8,7,5,0.96))] p-6 text-center">
                  <h2 className="text-lg font-semibold text-[var(--mc-text)]">
                    尚無對戰紀錄
                  </h2>
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)]">
                    完成一場遊戲後，系統會將結算摘要與回顧資料存到歷史頁。之後可以回來查看分數、答對數與
                    Combo 表現。
                  </p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            {shouldShowFilterBar && (
              <CareerHistoryFilterBar
                modeFilter={historyModeFilter}
                onModeFilterChange={setHistoryModeFilter}
                collectionFilterId={historyCollectionFilterId}
                onCollectionFilterChange={setHistoryCollectionFilterId}
                collectionOptions={historyCollectionFilterOptions}
                filteredCount={filteredHistoryItemCount}
                totalCount={totalHistoryItemCount}
              />
            )}

            {isHistoryRequestBlocked && (
              <div className="shrink-0 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                你的查詢頻率過高，已暫時限制歷史請求，請稍後再試。
              </div>
            )}
            <div className="min-h-0 flex-1">
              <CareerHistoryGroupedList
                groupedHistoryItems={groupedHistoryItems}
                onOpenReplay={(summary) => {
                  void openReplayDetail(summary);
                }}
                nextCursorToken={nextCursorToken}
                loadingMoreList={loadingMoreList}
                onLoadMore={() => {
                  void handleLoadMoreHistory();
                }}
                onScroll={handleHistoryScroll}
              />
            </div>
          </div>
        )}
      </div>

      {showBackToTop && (
        <button
          type="button"
          aria-label="回到頂部"
          onClick={handleBackToTop}
          className="absolute bottom-4 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-300/30 bg-[linear-gradient(180deg,rgba(10,26,42,0.92),rgba(6,14,24,0.96))] text-sky-100 shadow-[0_18px_34px_-22px_rgba(14,165,233,0.55)] transition hover:-translate-y-0.5 hover:border-sky-300/50 hover:bg-sky-300/14"
        >
          <KeyboardArrowUpRounded sx={{ fontSize: 24 }} />
        </button>
      )}

      <HistoryReplayDialog
        open={Boolean(selectedSummary)}
        onClose={closeReplayDetail}
        selectedSummary={selectedSummary}
        relatedSummaries={selectedRelatedSummaries}
        selectedReplay={selectedReplay}
        isLoadingSelectedReplay={isLoadingSelectedReplay}
        onSelectSummary={(summary) => {
          void openReplayDetail(summary);
        }}
        meClientId={clientId}
        questionRecaps={normalizedSelectedQuestionRecaps}
        formatDateTime={formatDateTime}
        getMatchDurationMs={getMatchDurationMs}
        formatDuration={formatDuration}
      />
    </div>
  );
};

type CareerHistoryFilterBarProps = {
  modeFilter: "all" | "casual" | "leaderboard";
  onModeFilterChange: (value: "all" | "casual" | "leaderboard") => void;
  collectionFilterId: string;
  onCollectionFilterChange: (value: string) => void;
  collectionOptions: Array<{
    id: string;
    title: string;
    matchCount: number;
  }>;
  filteredCount: number;
  totalCount: number;
};

const modeFilterOptions: Array<{
  value: "all" | "casual" | "leaderboard";
  label: string;
  className: string;
}> = [
  {
    value: "all",
    label: "全部",
    className:
      "border-stone-300/18 text-stone-200 hover:border-stone-300/34 hover:bg-stone-300/8",
  },
  {
    value: "casual",
    label: "休閒",
    className:
      "border-emerald-300/20 text-emerald-100 hover:border-emerald-300/42 hover:bg-emerald-300/10",
  },
  {
    value: "leaderboard",
    label: "排行",
    className:
      "border-amber-300/20 text-amber-100 hover:border-amber-300/42 hover:bg-amber-300/10",
  },
];

const getModeFilterActiveClassName = (
  value: CareerHistoryFilterBarProps["modeFilter"],
) => {
  switch (value) {
    case "casual":
      return "border-emerald-300/48 bg-emerald-300/14 text-emerald-50 shadow-[0_12px_26px_-22px_rgba(52,211,153,0.7)]";
    case "leaderboard":
      return "border-amber-300/48 bg-amber-300/14 text-amber-50 shadow-[0_12px_26px_-22px_rgba(245,158,11,0.7)]";
    default:
      return "border-stone-200/34 bg-stone-200/10 text-stone-50";
  }
};

const CareerHistoryFilterBar: React.FC<CareerHistoryFilterBarProps> = ({
  modeFilter,
  onModeFilterChange,
  collectionFilterId,
  onCollectionFilterChange,
  collectionOptions,
  filteredCount,
  totalCount,
}) => {
  return (
    <section className="shrink-0 rounded-[20px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.92),rgba(8,7,5,0.98))] px-3 py-3 shadow-[0_16px_32px_-28px_rgba(0,0,0,0.72)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {modeFilterOptions.map((option) => {
            const active = modeFilter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onModeFilterChange(option.value)}
                className={`inline-flex h-9 items-center justify-center rounded-[12px] border px-3 text-sm font-semibold transition ${
                  active
                    ? getModeFilterActiveClassName(option.value)
                    : option.className
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label
            htmlFor="career-history-collection-filter"
            className="text-xs font-semibold text-[var(--mc-text-muted)]"
          >
            收藏庫
          </label>
          <select
            id="career-history-collection-filter"
            value={collectionFilterId}
            onChange={(event) => onCollectionFilterChange(event.target.value)}
            className="h-9 min-w-0 rounded-[12px] border border-white/10 bg-stone-950/70 px-3 text-sm font-medium text-[var(--mc-text)] outline-none transition hover:border-white/18 focus:border-amber-200/45 sm:w-[260px]"
          >
            <option value="all">全部收藏庫</option>
            {collectionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}（{option.matchCount}）
              </option>
            ))}
          </select>

          <span className="whitespace-nowrap text-xs text-[var(--mc-text-muted)]">
            {filteredCount}/{totalCount} 筆
          </span>
        </div>
      </div>
    </section>
  );
};

export default CareerHistoryWorkspace;
