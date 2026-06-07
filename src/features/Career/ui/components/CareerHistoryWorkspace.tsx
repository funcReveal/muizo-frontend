import { CircularProgress } from "@mui/material";
import { KeyboardArrowUpRounded } from "@mui/icons-material";
import React from "react";

import HistoryReplayDialog from "@features/Settlement/ui/components/roomHistoryPage/HistoryReplayDialog";
import { recordDbActionEvent } from "@shared/analytics/actionEvents";
import { useAuth } from "@shared/auth/AuthContext";
import { MuizoSelect, type MuizoSelectOption } from "@shared/ui/select";

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
    authToken,
    clientId: analyticsClientId,
    displayUsername,
    refreshAuthToken,
  } = useAuth();
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
    modeHistoryItemCount,
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
  const shouldShowFilterBar = !listError && totalHistoryItemCount > 0;
  const hasVisibleHistoryItems = groupedHistoryItems.length > 0;
  const isFilteredEmpty =
    shouldShowFilterBar && totalHistoryItemCount > 0 && !hasVisibleHistoryItems;
  const recordFilterChange = React.useCallback(
    (filterName: "mode" | "collection", filterValue: string) => {
      if (!authToken) return;
      void recordDbActionEvent({
        eventName: "career.history.filter.changed",
        authToken,
        clientId: analyticsClientId,
        username: displayUsername,
        refreshAuthToken,
        collectionId:
          filterName === "collection" && filterValue !== "all"
            ? filterValue
            : null,
        metadata: {
          source: "career",
          filterName,
          filterValue,
        },
      }).catch((error) => {
        console.error("[career] failed to record history filter event", error);
      });
    },
    [authToken, analyticsClientId, displayUsername, refreshAuthToken],
  );
  const handleModeFilterChange = React.useCallback(
    (value: "all" | "casual" | "leaderboard") => {
      setHistoryModeFilter(value);
      setHistoryCollectionFilterId("all");
      recordFilterChange("mode", value);
    },
    [recordFilterChange, setHistoryCollectionFilterId, setHistoryModeFilter],
  );
  const handleCollectionFilterChange = React.useCallback(
    (value: string) => {
      setHistoryCollectionFilterId(value);
      recordFilterChange("collection", value);
    },
    [recordFilterChange, setHistoryCollectionFilterId],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2.5 sm:gap-4">
      {shouldShowFilterBar && (
        <CareerHistoryFilterBar
          modeFilter={historyModeFilter}
          onModeFilterChange={handleModeFilterChange}
          collectionFilterId={historyCollectionFilterId}
          onCollectionFilterChange={handleCollectionFilterChange}
          collectionOptions={historyCollectionFilterOptions}
          modeCount={modeHistoryItemCount}
        />
      )}

      {isHistoryRequestBlocked && (
        <div className="shrink-0 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          你的查詢頻率過高，已暫時限制歷史請求，請稍後再試。
        </div>
      )}

      <div className="min-h-0 flex-1">
        {loadingList || listError || !hasVisibleHistoryItems ? (
          <div ref={scrollHostRef} className="h-full overflow-auto pr-1">
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
          </div>
        ) : (
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
    thumbnail?: string | null;
  }>;
  modeCount: number;
};

const modeFilterOptions: Array<{
  value: "all" | "casual" | "leaderboard";
  label: string;
}> = [
  {
    value: "all",
    label: "全部",
  },
  {
    value: "casual",
    label: "休閒派對",
  },
  {
    value: "leaderboard",
    label: "排行挑戰",
  },
];

const CareerHistoryFilterBar: React.FC<CareerHistoryFilterBarProps> = ({
  modeFilter,
  onModeFilterChange,
  collectionFilterId,
  onCollectionFilterChange,
  collectionOptions,
  modeCount,
}) => {
  const modeSelectOptions: MuizoSelectOption[] = modeFilterOptions.map(
    (option) => ({
      value: option.value,
      label: option.label,
      hideThumbnail: true,
    }),
  );
  const modeSelectTone =
    modeFilter === "casual"
      ? "casual"
      : modeFilter === "leaderboard"
        ? "leaderboard"
        : "default";
  const collectionSelectOptions: MuizoSelectOption[] = [
    {
      value: "all",
      label: "全部收藏庫",
      hideThumbnail: true,
      meta: `${modeCount} 筆`,
    },
    ...collectionOptions.map((option) => ({
      value: option.id,
      label: option.title,
      thumbnail: option.thumbnail ?? undefined,
      meta: `${option.matchCount} 筆`,
    })),
  ];

  return (
    <section className="shrink-0 sm:rounded-[20px] sm:border sm:border-[var(--mc-border)] sm:bg-[linear-gradient(180deg,rgba(20,17,13,0.92),rgba(8,7,5,0.98))] sm:px-3 sm:py-3 sm:shadow-[0_16px_32px_-28px_rgba(0,0,0,0.72)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-2 sm:grid-cols-[220px_minmax(260px,320px)] lg:ml-auto">
          <MuizoSelect
            value={modeFilter}
            options={modeSelectOptions}
            placeholder="選擇模式"
            tone={modeSelectTone}
            size="compact"
            className="min-w-0"
            opaque
            onChange={(value) =>
              onModeFilterChange(
                value as CareerHistoryFilterBarProps["modeFilter"],
              )
            }
          />

          <MuizoSelect
            value={collectionFilterId}
            options={collectionSelectOptions}
            placeholder="選擇收藏庫"
            size="compact"
            className="min-w-0"
            opaque
            onChange={onCollectionFilterChange}
          />
        </div>
      </div>
    </section>
  );
};

export default CareerHistoryWorkspace;
