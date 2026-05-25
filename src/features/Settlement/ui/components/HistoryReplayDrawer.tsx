import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import { Drawer } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import React from "react";

import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import { getHistorySummaryPlaylistTitle } from "../../model/historySummaryAdapter";

interface HistoryReplayDrawerProps {
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

const HistoryReplayDrawer: React.FC<HistoryReplayDrawerProps> = ({
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
  const playlistTitle = selectedSummary
    ? getHistorySummaryPlaylistTitle(selectedSummary)
    : null;
  const isWide = useMediaQuery("(min-width: 640px)");
  const isMobileDrawer = useMediaQuery("(max-width: 639.95px)");
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
  const metadataItems = selectedSummary
    ? [
        {
          key: "round",
          icon: <SportsEsportsRoundedIcon sx={{ fontSize: 16 }} />,
          label: `第 ${selectedSummary.roundNo} 局`,
          accent: "text-amber-100",
        },
        {
          key: "duration",
          icon: <AccessTimeRoundedIcon sx={{ fontSize: 16 }} />,
          label: formatDuration(
            getMatchDurationMs(selectedSummary.startedAt, selectedSummary.endedAt),
          ),
          accent: "text-slate-200",
        },
        {
          key: "endedAt",
          icon: <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />,
          label: formatDateTime(selectedSummary.endedAt),
          accent: "text-slate-200",
        },
        {
          key: "questionCount",
          icon: <FormatListNumberedRoundedIcon sx={{ fontSize: 16 }} />,
          label: `${selectedSummary.questionCount} 題`,
          accent: "text-sky-100",
        },
      ]
    : [];

  return (
    <Drawer
      anchor={isMobileDrawer ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        className:
          "!overflow-hidden !bg-slate-950 !text-slate-100 !shadow-2xl !shadow-slate-950/80 max-sm:!h-[92dvh] max-sm:!w-full max-sm:!rounded-t-[24px] max-sm:!border-t max-sm:!border-white/10 sm:!h-dvh sm:!w-[min(1180px,calc(100vw-24px))] sm:!max-w-none sm:!rounded-l-[24px] sm:!border-l sm:!border-white/10",
      }}
    >
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-2 sm:p-3">
          {selectedSummary ? (
            <section
              className={`mb-3 border border-[var(--mc-border)] bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,rgba(13,17,28,0.9),rgba(5,8,16,0.98))] shadow-[0_18px_42px_-32px_rgba(0,0,0,0.86)] ${
                isWide ? "rounded-[26px] px-4 py-4 sm:px-5" : "rounded-[22px] px-3 py-3"
              }`}
            >
              <div className={`flex flex-col ${isWide ? "gap-4" : "gap-3.5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      className={`truncate font-semibold tracking-tight text-[var(--mc-text)] ${
                        isWide ? "text-2xl" : "text-xl"
                      }`}
                    >
                      {selectedSummary.roomName || selectedSummary.roomId}
                    </h2>
                    {playlistTitle ? (
                      <p
                        className={`mt-1 truncate font-medium text-cyan-100/88 ${
                          isWide ? "text-sm" : "text-[13px]"
                        }`}
                      >
                        {playlistTitle}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="關閉詳情"
                    className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-500/70 bg-slate-900/74 text-slate-200 transition hover:border-slate-300 hover:bg-slate-900/92 hover:text-white hover:shadow-[0_10px_24px_-18px_rgba(148,163,184,0.65)] ${
                      isWide ? "h-10 w-10" : "h-9 w-9"
                    }`}
                    onClick={onClose}
                  >
                    <CloseRoundedIcon sx={{ fontSize: isWide ? 19 : 18 }} />
                  </button>
                </div>

                <div
                  className={
                    isWide
                      ? "flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between"
                      : "flex flex-col gap-3"
                  }
                >
                  <div
                    className={
                      isWide
                        ? "flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300"
                        : "grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-slate-300"
                    }
                  >
                    {metadataItems.map((item) => (
                      <span
                        key={item.key}
                        className={`inline-flex items-center gap-1.5 ${item.accent}`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <Groups2RoundedIcon sx={{ fontSize: isWide ? 16 : 15 }} />
                      <span>{selectedSummary.playerCount} 人</span>
                    </span>
                  </div>

                  {relatedSummaries.length > 1 ? (
                    <div
                      className={
                        isWide
                          ? "flex min-w-0 items-center justify-end gap-2 xl:ml-auto xl:flex-1"
                          : "rounded-[18px] border border-amber-300/12 bg-slate-950/46 p-1.5"
                      }
                    >
                      {isWide ? (
                        <>
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
                        </>
                      ) : (
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
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {children}
          </div>
        </div>
    </Drawer>
  );
};

export default HistoryReplayDrawer;
