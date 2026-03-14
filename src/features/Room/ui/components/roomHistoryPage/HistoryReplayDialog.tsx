import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Dialog, DialogContent } from "@mui/material";
import React from "react";

import type {
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
} from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import HistoryReplayCompactView from "../HistoryReplayCompactView";

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
  <div className="space-y-4 animate-pulse">
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
  const playlistTitle = selectedReplay?.room.playlist.title?.trim();
  const selectedRelatedIndex = React.useMemo(
    () =>
      selectedSummary
        ? Math.max(
            0,
            relatedSummaries.findIndex(
              (summary) => summary.matchId === selectedSummary.matchId,
            ),
          )
        : 0,
    [relatedSummaries, selectedSummary],
  );
  const visibleRoundCount = relatedSummaries.length <= 4 ? relatedSummaries.length : 5;
  const relatedWindowStart = Math.max(
    0,
    Math.min(
      selectedRelatedIndex - Math.floor(visibleRoundCount / 2),
      Math.max(0, relatedSummaries.length - visibleRoundCount),
    ),
  );
  const visibleRelatedSummaries = relatedSummaries.slice(
    relatedWindowStart,
    relatedWindowStart + visibleRoundCount,
  );
  const canShiftPrev = selectedRelatedIndex > 0;
  const canShiftNext = selectedRelatedIndex < relatedSummaries.length - 1;

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          onClose();
        }
      }}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      maxWidth={false}
      BackdropProps={{
        sx: {
          background:
            "radial-gradient(circle at top, rgba(15,23,42,0.18), rgba(2,6,16,0.34))",
          backdropFilter: "blur(2px)",
        },
      }}
      sx={{
        "& .MuiDialog-container": {
          alignItems: { xs: "flex-start", lg: "center" },
          justifyContent: "center",
          px: { xs: 0.5, sm: 1, lg: 1.2 },
          py: { xs: 0.5, sm: 0.85, lg: 1.1 },
        },
      }}
      PaperProps={{
        sx: {
          m: 0,
          width: {
            xs: "calc(100vw - 12px)",
            sm: "calc(100vw - 24px)",
            lg: "min(1456px, calc(100vw - 28px))",
          },
          maxWidth: {
            xs: "calc(100vw - 12px)",
            sm: "calc(100vw - 24px)",
            lg: "min(1456px, calc(100vw - 28px))",
          },
          maxHeight: { xs: "calc(100vh - 8px)", sm: "calc(100vh - 20px)" },
          borderRadius: { xs: "28px", sm: "32px" },
          overflow: "hidden",
          background:
            "linear-gradient(180deg,rgba(11,18,31,0.97),rgba(5,9,18,0.992))",
          boxShadow:
            "0 28px 78px -36px rgba(0,0,0,0.82), 0 0 0 1px rgba(148,163,184,0.1)",
          backdropFilter: "blur(12px)",
        },
      }}
    >
      <DialogContent
        sx={{
          p: { xs: 0.75, sm: 0.9, lg: 1 },
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col">
          {selectedSummary && (
            <section className="mb-3 rounded-[26px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(13,17,28,0.86),rgba(5,8,16,0.96))] px-4 py-4 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.86)] sm:px-5">
              <div className="relative pr-[94px] sm:pr-[112px]">
                <button
                  type="button"
                  className="absolute right-0 top-0 z-10 rounded-full border border-slate-500/70 bg-slate-900/74 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-900/90"
                  onClick={onClose}
                >
                  關閉回放
                </button>

                <div className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-900/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                  Match Replay
                </div>
                <h2 className="mt-3 truncate text-xl font-semibold text-[var(--mc-text)] sm:text-2xl">
                  {selectedSummary.roomName || selectedSummary.roomId}
                </h2>

                <div className="mt-3 flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-amber-300/28 bg-amber-300/10 px-3 py-1">
                      第 {selectedSummary.roundNo} 場
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1">
                      {selectedSummary.playerCount} 人
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1">
                      {selectedSummary.questionCount} 題
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1">
                      局長 {formatDuration(
                        getMatchDurationMs(
                          selectedSummary.startedAt,
                          selectedSummary.endedAt,
                        ),
                      )}
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1">
                      結束 {formatDateTime(selectedSummary.endedAt)}
                    </span>
                    {playlistTitle && (
                      <span className="rounded-full border border-cyan-300/26 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                        {playlistTitle}
                      </span>
                    )}
                  </div>

                  {relatedSummaries.length > 1 && (
                    <div className="flex min-w-0 items-center gap-2 xl:max-w-[min(48vw,660px)] xl:justify-end">
                      <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        同房局次
                      </span>
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-amber-300/12 bg-slate-950/46 px-1.5 py-1.5">
                        <span className="shrink-0 rounded-full border border-slate-600/70 bg-slate-900/65 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                          共 {relatedSummaries.length} 場
                        </span>
                        <button
                          type="button"
                          aria-label="查看前一場"
                          disabled={!canShiftPrev}
                          onClick={() => {
                            if (!canShiftPrev) return;
                            onSelectSummary(relatedSummaries[selectedRelatedIndex - 1]);
                          }}
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                            canShiftPrev
                              ? "border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-400 hover:bg-slate-900/90"
                              : "cursor-default border-slate-800/80 bg-slate-950/50 text-slate-600"
                          }`}
                        >
                          <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
                          {visibleRelatedSummaries.map((summary) => {
                            const active = summary.matchId === selectedSummary.matchId;
                            return (
                              <button
                                key={summary.matchId}
                                type="button"
                                onClick={() => onSelectSummary(summary)}
                                className={`min-w-[74px] rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                  active
                                    ? "border-amber-300/48 bg-amber-300/14 text-amber-50 shadow-[0_10px_20px_-18px_rgba(251,191,36,0.72)]"
                                    : "border-slate-600/70 bg-slate-900/55 text-slate-200 hover:border-slate-400 hover:bg-slate-900/72"
                                }`}
                              >
                                第 {summary.roundNo} 場
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          aria-label="查看下一場"
                          disabled={!canShiftNext}
                          onClick={() => {
                            if (!canShiftNext) return;
                            onSelectSummary(relatedSummaries[selectedRelatedIndex + 1]);
                          }}
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                            canShiftNext
                              ? "border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-400 hover:bg-slate-900/90"
                              : "cursor-default border-slate-800/80 bg-slate-950/50 text-slate-600"
                          }`}
                        >
                          <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoadingSelectedReplay && !selectedReplay ? (
              <HistoryReplaySkeleton />
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
              <div className="rounded-[24px] border border-amber-300/16 bg-amber-300/5 px-4 py-5 text-sm text-amber-100/90">
                目前沒有可用的回放資料，請返回對戰歷史列表後重新開啟。
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryReplayDialog;
