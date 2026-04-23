import { CircularProgress } from "@mui/material";
import { KeyboardArrowUpRounded } from "@mui/icons-material";
import React from "react";
import { useNavigate } from "react-router-dom";

import HistoryArchiveHeader from "@features/Settlement/ui/components/roomHistoryPage/HistoryArchiveHeader";
import HistoryReplayDialog from "@features/Settlement/ui/components/roomHistoryPage/HistoryReplayDialog";

import useCareerHistoryWorkspace from "../../model/useCareerHistoryWorkspace";
import CareerHistoryGroupedList from "./history/CareerHistoryGroupedList";

const CareerHistoryWorkspace: React.FC = () => {
  const navigate = useNavigate();

  const {
    clientId,
    scrollHostRef,
    loadingList,
    loadingMoreList,
    listError,
    nextCursorToken,
    isHistoryRequestBlocked,
    showBackToTop,
    historyDisplayMode,
    setHistoryDisplayMode,
    groupedHistoryItems,
    isGroupCollapsed,
    toggleGroup,
    setGroupContainerRef,
    getSelfRankForSummary,
    recentTopScoreEntry,
    recentBestRankEntry,
    recentBestComboEntry,
    recentBestAccuracyEntry,
    selectedSummary,
    selectedRelatedSummaries,
    selectedReplay,
    isLoadingSelectedReplay,
    normalizedSelectedQuestionRecaps,
    openReplayDetail,
    closeReplayDetail,
    handleLoadMoreHistory,
    handleBackToTop,
    formatDateTime,
    getMatchDurationMs,
    formatDuration,
    formatRankFraction,
  } = useCareerHistoryWorkspace();

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <HistoryArchiveHeader
          loadingList={loadingList}
          historyDisplayMode={historyDisplayMode}
          onHistoryDisplayModeChange={setHistoryDisplayMode}
          recentTopScoreEntry={recentTopScoreEntry}
          recentBestRankEntry={recentBestRankEntry}
          recentBestComboEntry={recentBestComboEntry}
          recentBestAccuracyEntry={recentBestAccuracyEntry}
          onOpenReplay={(summary) => {
            void openReplayDetail(summary);
          }}
          onBackToRooms={() => navigate("/rooms", { replace: true })}
          formatRankFraction={formatRankFraction}
        />
      </div>

      <div ref={scrollHostRef} className="min-h-0 flex-1 overflow-auto pr-1">
        <section className="space-y-4">
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
          ) : groupedHistoryItems.length === 0 ? (
            <div className="relative overflow-hidden rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.86),rgba(8,7,5,0.96))] p-6 text-center">
              <h2 className="text-lg font-semibold text-[var(--mc-text)]">
                尚無對戰紀錄
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)]">
                完成一場遊戲後，系統會將結算摘要與回顧資料存到歷史頁。之後可以回來查看分數、答對數與
                Combo 表現。
              </p>
            </div>
          ) : (
            <CareerHistoryGroupedList
              groupedHistoryItems={groupedHistoryItems}
              historyDisplayMode={historyDisplayMode}
              isGroupCollapsed={isGroupCollapsed}
              onToggleGroup={toggleGroup}
              setGroupContainerRef={setGroupContainerRef}
              getSelfRankForSummary={getSelfRankForSummary}
              onOpenReplay={(summary) => {
                void openReplayDetail(summary);
              }}
              nextCursorToken={nextCursorToken}
              loadingMoreList={loadingMoreList}
              onLoadMore={() => {
                void handleLoadMoreHistory();
              }}
            />
          )}
        </section>
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

export default CareerHistoryWorkspace;
