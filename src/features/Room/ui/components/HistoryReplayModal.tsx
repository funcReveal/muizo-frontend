import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Dialog, DialogContent } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import React from "react";

import type { RoomSettlementHistorySummary } from "../../model/types";

interface HistoryReplayModalProps {
  open: boolean;
  onClose: () => void;
  selectedSummary: RoomSettlementHistorySummary | null;
  relatedSummaries: RoomSettlementHistorySummary[];
  onSelectSummary: (summary: RoomSettlementHistorySummary) => void;
  formatDateTime: (timestamp: number) => string;
  getMatchDurationMs: (startedAt: number, endedAt: number) => number | null;
  formatDuration: (durationMs: number | null) => string;
  children: React.ReactNode;
}

const HistoryReplayModal: React.FC<HistoryReplayModalProps> = ({
  open,
  onClose,
  selectedSummary,
  relatedSummaries,
  onSelectSummary,
  formatDateTime,
  getMatchDurationMs,
  formatDuration,
  children,
}) => {
  const playlistTitle = selectedSummary?.playlistTitle?.trim();
  const isWide = useMediaQuery("(min-width: 640px)");
  const visibleRoundCount = Math.min(relatedSummaries.length, isWide ? 5 : 3);
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
          overflowX: "hidden",
        }}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col">
          {selectedSummary ? (
            isWide ? (
              <section className="mb-3 rounded-[26px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(13,17,28,0.86),rgba(5,8,16,0.96))] px-4 py-4 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.86)] sm:px-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-900/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                        Match Replay
                      </div>
                      <h2 className="mt-3 truncate text-2xl font-semibold text-[var(--mc-text)]">
                        {selectedSummary.roomName || selectedSummary.roomId}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer rounded-full border border-slate-500/70 bg-slate-900/74 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-300 hover:bg-slate-900/92 hover:text-white hover:shadow-[0_10px_24px_-18px_rgba(148,163,184,0.65)]"
                      onClick={onClose}
                    >
                      關閉回放
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-amber-300/28 bg-amber-300/10 px-3 py-1">
                        第 {selectedSummary.roundNo} 局
                      </span>
                      <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1">
                        {selectedSummary.playerCount} 人
                      </span>
                      <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1">
                        {selectedSummary.questionCount} 題
                      </span>
                      <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1">
                        局長{" "}
                        {formatDuration(
                          getMatchDurationMs(
                            selectedSummary.startedAt,
                            selectedSummary.endedAt,
                          ),
                        )}
                      </span>
                      <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1">
                        結束 {formatDateTime(selectedSummary.endedAt)}
                      </span>
                      {playlistTitle ? (
                        <span className="rounded-full border border-cyan-300/26 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                          {playlistTitle}
                        </span>
                      ) : null}
                    </div>

                    {relatedSummaries.length > 1 ? (
                      <div className="flex min-w-0 items-center justify-end gap-2 xl:ml-auto xl:flex-1">
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          同房局次
                        </span>
                        <div className="ml-auto inline-flex min-w-0 max-w-full items-center gap-0.5 rounded-full border border-amber-300/12 bg-slate-950/46 px-0.5 py-0.5">
                          <button
                            type="button"
                            aria-label="查看前一局"
                            disabled={!canShiftPrev}
                            onClick={() => {
                              if (!canShiftPrev) return;
                              onSelectSummary(relatedSummaries[selectedRelatedIndex - 1]);
                            }}
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                              canShiftPrev
                                ? "cursor-pointer border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-300 hover:bg-slate-900/92 hover:text-white"
                                : "cursor-default border-slate-800/80 bg-slate-950/50 text-slate-600"
                            }`}
                          >
                            <ChevronLeftRoundedIcon sx={{ fontSize: 16 }} />
                          </button>
                          <div className="flex min-w-0 items-center justify-end gap-0.5">
                            {visibleRelatedSummaries.map((summary) => {
                              const active = summary.matchId === selectedSummary.matchId;
                              return (
                                <button
                                  key={summary.matchId}
                                  type="button"
                                  onClick={() => onSelectSummary(summary)}
                                  className={`inline-flex min-w-[80px] cursor-pointer justify-center rounded-full border px-2.25 py-1.5 text-center text-[11px] font-semibold tabular-nums transition ${
                                    active
                                      ? "border-amber-300/48 bg-amber-300/14 text-amber-50 shadow-[0_10px_20px_-18px_rgba(251,191,36,0.72)]"
                                      : "border-slate-600/70 bg-slate-900/55 text-slate-200 hover:border-slate-300 hover:bg-slate-900/78 hover:text-white"
                                  }`}
                                >
                                  第 {summary.roundNo} 局
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            aria-label="查看下一局"
                            disabled={!canShiftNext}
                            onClick={() => {
                              if (!canShiftNext) return;
                              onSelectSummary(relatedSummaries[selectedRelatedIndex + 1]);
                            }}
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                              canShiftNext
                                ? "cursor-pointer border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-300 hover:bg-slate-900/92 hover:text-white"
                                : "cursor-default border-slate-800/80 bg-slate-950/50 text-slate-600"
                            }`}
                          >
                            <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : (
              <section className="mb-3 rounded-[22px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(13,17,28,0.92),rgba(5,8,16,0.98))] px-3 py-3 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.86)]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-900/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                        Match Replay
                      </div>
                      <h2 className="mt-2 truncate text-xl font-semibold text-[var(--mc-text)]">
                        {selectedSummary.roomName || selectedSummary.roomId}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer rounded-full border border-slate-500/70 bg-slate-900/74 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-300 hover:bg-slate-900/92 hover:text-white hover:shadow-[0_10px_24px_-18px_rgba(148,163,184,0.65)]"
                      onClick={onClose}
                    >
                      關閉回放
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
                    <span className="rounded-full border border-amber-300/28 bg-amber-300/10 px-2.5 py-1">
                      第 {selectedSummary.roundNo} 局
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2.5 py-1">
                      {selectedSummary.playerCount} 人
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2.5 py-1">
                      {selectedSummary.questionCount} 題
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2.5 py-1">
                      局長 {formatDuration(getMatchDurationMs(selectedSummary.startedAt, selectedSummary.endedAt))}
                    </span>
                  </div>

                  <div className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                    {formatDateTime(selectedSummary.endedAt)}
                  </div>

                  {relatedSummaries.length > 1 ? (
                    <div className="rounded-[18px] border border-amber-300/12 bg-slate-950/46 p-1.5">
                      <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="查看前一局"
                          disabled={!canShiftPrev}
                          onClick={() => {
                            if (!canShiftPrev) return;
                            onSelectSummary(relatedSummaries[selectedRelatedIndex - 1]);
                          }}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                            canShiftPrev
                              ? "cursor-pointer border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-300 hover:bg-slate-900/92 hover:text-white"
                              : "cursor-default border-slate-800/80 bg-slate-950/50 text-slate-600"
                          }`}
                        >
                          <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                        <div className="grid grid-cols-3 gap-1">
                          {visibleRelatedSummaries.map((summary) => {
                            const active = summary.matchId === selectedSummary.matchId;
                            return (
                              <button
                                key={summary.matchId}
                                type="button"
                                onClick={() => onSelectSummary(summary)}
                                className={`inline-flex w-full cursor-pointer justify-center rounded-full border px-1.5 py-1.5 text-center text-[10px] font-semibold tabular-nums transition ${
                                  active
                                    ? "border-amber-300/48 bg-amber-300/14 text-amber-50 shadow-[0_10px_20px_-18px_rgba(251,191,36,0.72)]"
                                    : "border-slate-600/70 bg-slate-900/55 text-slate-200 hover:border-slate-300 hover:bg-slate-900/78 hover:text-white"
                                }`}
                              >
                                第 {summary.roundNo} 局
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          aria-label="查看下一局"
                          disabled={!canShiftNext}
                          onClick={() => {
                            if (!canShiftNext) return;
                            onSelectSummary(relatedSummaries[selectedRelatedIndex + 1]);
                          }}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                            canShiftNext
                              ? "cursor-pointer border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-300 hover:bg-slate-900/92 hover:text-white"
                              : "cursor-default border-slate-800/80 bg-slate-950/50 text-slate-600"
                          }`}
                        >
                          <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            )
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryReplayModal;
