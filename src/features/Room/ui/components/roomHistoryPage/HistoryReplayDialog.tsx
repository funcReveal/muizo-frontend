import React from "react";

import type {
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
} from "../../../model/types";
import HistoryReplayCompactView from "../HistoryReplayCompactView";
import HistoryReplayModal from "../HistoryReplayModal";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";

interface HistoryReplayDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSummary: RoomSettlementHistorySummary | null;
  relatedSummaries: RoomSettlementHistorySummary[];
  selectedReplay: RoomSettlementSnapshot | null;
  isLoadingSelectedReplay: boolean;
  onSelectSummary: (summary: RoomSettlementHistorySummary) => void;
  meClientId: string;
  questionRecaps?: SettlementQuestionRecap[];
  formatDateTime: (timestamp: number) => string;
  getMatchDurationMs: (startedAt: number, endedAt: number) => number | null;
  formatDuration: (durationMs: number | null) => string;
}

const HistoryReplaySkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <section className="rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(8,14,24,0.9),rgba(4,8,16,0.96))] p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
        <div className="min-w-0">
          <div className="h-8 w-28 rounded-full bg-slate-800/75" />
          <div className="mt-4 h-9 w-64 max-w-full rounded-xl bg-slate-800/75" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`history-summary-pill-${index}`}
                className="h-8 w-20 rounded-full bg-slate-800/65"
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/55 px-4 py-3">
          <div className="h-3 w-20 rounded bg-slate-800/75" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full rounded bg-slate-800/70" />
            <div className="h-4 w-[88%] rounded bg-slate-800/70" />
            <div className="h-4 w-[72%] rounded bg-slate-800/70" />
          </div>
        </div>
      </div>
    </section>

    <section className="space-y-3">
      <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3">
        <div className="h-4 w-16 rounded bg-slate-800/75" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`history-player-skeleton-${index}`}
              className="rounded-xl border border-slate-700/65 bg-slate-900/55 px-3 py-3"
            >
              <div className="h-4 w-3/4 rounded bg-slate-800/75" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-900/85" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3">
          <div className="h-4 w-14 rounded bg-slate-800/75" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`history-question-skeleton-${index}`}
                className="rounded-xl border border-slate-700/65 bg-slate-900/55 px-3 py-3"
              >
                <div className="h-4 w-[82%] rounded bg-slate-800/75" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3 sm:p-4">
          <div className="h-4 w-20 rounded bg-slate-800/75" />
          <div className="mt-3 h-8 w-[70%] rounded-xl bg-slate-800/80" />
          <div className="mt-2 h-5 w-40 rounded-lg bg-slate-900/80" />

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`history-stat-skeleton-${index}`}
                className="rounded-xl border border-slate-700/65 bg-slate-900/55 px-3 py-3"
              >
                <div className="h-3 w-16 rounded bg-slate-800/75" />
                <div className="mt-2 h-7 w-20 rounded bg-slate-800/85" />
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-900/55 px-3 py-3">
            <div className="h-3 w-16 rounded bg-slate-800/75" />
            <div className="mt-2 h-4 w-[75%] rounded bg-slate-800/70" />
          </div>

          <div className="mt-3 rounded-2xl border border-slate-700/70 bg-slate-900/55 p-3 sm:p-4">
            <div className="h-4 w-28 rounded bg-slate-800/75" />
            <div className="mt-1 h-3 w-44 rounded bg-slate-900/85" />
            <div className="mt-3 grid gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`history-choice-skeleton-${index}`}
                  className="rounded-xl border border-slate-700/65 bg-slate-900/50 px-3 py-3"
                >
                  <div className="h-4 w-[84%] rounded bg-slate-800/75" />
                  <div className="mt-3 h-1.5 rounded-full bg-slate-800/80" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const HistoryReplayDialog: React.FC<HistoryReplayDialogProps> = ({
  open,
  onClose,
  selectedSummary,
  relatedSummaries,
  selectedReplay,
  isLoadingSelectedReplay,
  onSelectSummary,
  meClientId,
  questionRecaps,
  formatDateTime,
  getMatchDurationMs,
  formatDuration,
}) => {
  return (
    <HistoryReplayModal
      open={open}
      onClose={onClose}
      selectedSummary={selectedSummary}
      relatedSummaries={relatedSummaries}
      onSelectSummary={onSelectSummary}
      formatDateTime={formatDateTime}
      getMatchDurationMs={getMatchDurationMs}
      formatDuration={formatDuration}
    >
      {isLoadingSelectedReplay && !selectedReplay ? (
        <HistoryReplaySkeleton />
      ) : selectedReplay ? (
          <HistoryReplayCompactView
            key={selectedSummary?.roundKey ?? selectedSummary?.matchId}
            room={selectedReplay.room}
          participants={selectedReplay.participants}
          messages={selectedReplay.messages}
          playlistItems={selectedReplay.playlistItems ?? []}
          trackOrder={selectedReplay.trackOrder}
          playedQuestionCount={selectedReplay.playedQuestionCount}
          startedAt={selectedReplay.startedAt}
          endedAt={selectedReplay.endedAt}
          meClientId={meClientId}
          questionRecaps={questionRecaps}
        />
      ) : (
        <div className="rounded-[24px] border border-amber-300/16 bg-amber-300/5 px-4 py-5 text-sm text-amber-100/90">
          找不到可顯示的回放資料，請稍後再試。
        </div>
      )}
    </HistoryReplayModal>
  );
};

export default HistoryReplayDialog;
