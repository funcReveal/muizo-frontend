import { CircularProgress, Dialog, DialogContent } from "@mui/material";
import React from "react";

import type { RoomSettlementHistorySummary, RoomSettlementSnapshot } from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import HistoryReplayCompactView from "../HistoryReplayCompactView";

interface HistoryReplayDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSummary: RoomSettlementHistorySummary | null;
  selectedReplay: RoomSettlementSnapshot | null;
  isLoadingSelectedReplay: boolean;
  meClientId: string;
  questionRecaps?: SettlementQuestionRecap[];
  formatDateTime: (timestamp: number) => string;
  getMatchDurationMs: (startedAt: number, endedAt: number) => number | null;
  formatDuration: (durationMs: number | null) => string;
}

const HistoryReplayDialog: React.FC<HistoryReplayDialogProps> = ({
  open,
  onClose,
  selectedSummary,
  selectedReplay,
  isLoadingSelectedReplay,
  meClientId,
  questionRecaps,
  formatDateTime,
  getMatchDurationMs,
  formatDuration,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullScreen
    PaperProps={{
      sx: {
        background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.9))",
      },
    }}
  >
    <DialogContent
      sx={{
        p: { xs: 1.5, sm: 2 },
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {selectedSummary && (
        <div className="mb-3 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                Match Replay
              </p>
              <p className="mt-1 truncate text-base font-semibold text-[var(--mc-text)]">
                {selectedSummary.roomName || selectedSummary.roomId}
              </p>
              <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                第 {selectedSummary.roundNo} 場 · {selectedSummary.playerCount} 人 ·{" "}
                {selectedSummary.questionCount} 題 · 開始{" "}
                {formatDateTime(selectedSummary.startedAt)} · 結束{" "}
                {formatDateTime(selectedSummary.endedAt)} · 遊玩{" "}
                {formatDuration(
                  getMatchDurationMs(
                    selectedSummary.startedAt,
                    selectedSummary.endedAt,
                  ),
                )}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-500/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-slate-400"
              onClick={onClose}
            >
              關閉回放
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isLoadingSelectedReplay && !selectedReplay ? (
          <div className="rounded-[20px] border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-6">
            <div className="flex items-center justify-center rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/50 px-4 py-12 text-[var(--mc-text-muted)]">
              <div className="inline-flex items-center gap-3">
                <CircularProgress size={18} thickness={5} sx={{ color: "#f59e0b" }} />
                載入對戰回顧中...
              </div>
            </div>
          </div>
        ) : selectedReplay ? (
          <HistoryReplayCompactView
            key={selectedSummary?.matchId}
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
          <div className="rounded-[20px] border border-amber-300/16 bg-amber-300/5 px-4 py-5 text-sm text-amber-100/90">
            這場對戰尚未取得完整回放內容，可能已被精簡或仍在同步中，請稍後再試。
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default HistoryReplayDialog;
