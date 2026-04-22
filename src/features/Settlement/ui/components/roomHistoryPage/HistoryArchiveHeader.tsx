import ViewAgendaRoundedIcon from "@mui/icons-material/ViewAgendaRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import React from "react";

import type { RoomSettlementHistorySummary } from "@features/RoomSession";

type HistoryListDisplayMode = "expanded" | "collapsed";

interface HistoryArchiveHeaderProps {
  loadingList: boolean;
  historyDisplayMode: HistoryListDisplayMode;
  onHistoryDisplayModeChange: (mode: HistoryListDisplayMode) => void;
  recentTopScoreEntry: RoomSettlementHistorySummary | null;
  recentBestRankEntry: {
    item: RoomSettlementHistorySummary;
    rank: number;
  } | null;
  recentBestComboEntry: RoomSettlementHistorySummary | null;
  recentBestAccuracyEntry: {
    item: RoomSettlementHistorySummary;
    rate: number;
  } | null;
  onOpenReplay: (summary: RoomSettlementHistorySummary) => void;
  onBackToRooms: () => void;
  formatRankFraction: (
    rank: number | null,
    playerCount: number | null | undefined,
  ) => string;
}

const metricButtonBase =
  "min-h-[82px] rounded-[20px] border p-3 text-left transition hover:-translate-y-0.5 sm:min-h-[96px] sm:rounded-2xl sm:p-3.5";

const HistoryArchiveHeader: React.FC<HistoryArchiveHeaderProps> = ({
  loadingList,
  historyDisplayMode,
  onHistoryDisplayModeChange,
  recentTopScoreEntry,
  recentBestRankEntry,
  recentBestComboEntry,
  recentBestAccuracyEntry,
  onOpenReplay,
  onBackToRooms,
  formatRankFraction,
}) => {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))] p-3.5 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)] sm:rounded-[28px] sm:p-5">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-semibold tracking-tight text-[var(--mc-text)] sm:text-xl">
            生涯總覽
          </h1>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-[var(--mc-accent)]/55 bg-[var(--mc-accent)]/16 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-[var(--mc-text)] transition hover:bg-[var(--mc-accent)]/24"
            onClick={onBackToRooms}
          >
            返回房間列表
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 xl:grid-cols-4">
        <button
          type="button"
          disabled={!recentTopScoreEntry}
          onClick={() => {
            if (!recentTopScoreEntry) return;
            onOpenReplay(recentTopScoreEntry);
          }}
          className={`${metricButtonBase} ${
            recentTopScoreEntry
              ? "border-emerald-300/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(5,30,24,0.78))] hover:border-emerald-300/45"
              : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
              近期最高分
            </div>
            <div className="mt-1.5 text-[1.95rem] font-semibold leading-none text-[var(--mc-text)] sm:mt-2 sm:text-4xl">
              {loadingList
                ? "-"
                : (recentTopScoreEntry?.selfPlayer?.finalScore ?? "-")}
            </div>
            <div className="mt-auto pt-2 text-[11px] text-[var(--mc-text-muted)] sm:pt-3 sm:text-xs">
              {recentTopScoreEntry
                ? `第 ${recentTopScoreEntry.roundNo} 場`
                : "暫無資料"}
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={!recentBestRankEntry}
          onClick={() => {
            if (!recentBestRankEntry) return;
            onOpenReplay(recentBestRankEntry.item);
          }}
          className={`${metricButtonBase} ${
            recentBestRankEntry
              ? "border-amber-300/28 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(40,24,8,0.78))] hover:border-amber-300/50"
              : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
              近期最佳名次
            </div>
            <div className="mt-1.5 text-[1.95rem] font-semibold leading-none text-[var(--mc-text)] sm:mt-2 sm:text-4xl">
              {loadingList
                ? "-"
                : recentBestRankEntry
                  ? formatRankFraction(
                      recentBestRankEntry.rank,
                      recentBestRankEntry.item.playerCount,
                    )
                  : "-"}
            </div>
            <div className="mt-auto pt-2 text-[11px] text-[var(--mc-text-muted)] sm:pt-3 sm:text-xs">
              {recentBestRankEntry
                ? `第 ${recentBestRankEntry.item.roundNo} 場`
                : "暫無資料"}
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={!recentBestComboEntry}
          onClick={() => {
            if (!recentBestComboEntry) return;
            onOpenReplay(recentBestComboEntry);
          }}
          className={`${metricButtonBase} ${
            recentBestComboEntry
              ? "border-fuchsia-300/22 bg-[linear-gradient(180deg,rgba(116,58,176,0.14),rgba(22,12,32,0.78))] hover:border-fuchsia-300/38"
              : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
              近期最佳 Combo
            </div>
            <div className="mt-1.5 text-[1.95rem] font-semibold leading-none text-[var(--mc-text)] sm:mt-2 sm:text-4xl">
              {loadingList
                ? "-"
                : recentBestComboEntry?.selfPlayer
                  ? `x${recentBestComboEntry.selfPlayer.maxCombo}`
                  : "-"}
            </div>
            <div className="mt-auto pt-2 text-[11px] text-[var(--mc-text-muted)] sm:pt-3 sm:text-xs">
              {recentBestComboEntry
                ? `第 ${recentBestComboEntry.roundNo} 場`
                : "暫無資料"}
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={!recentBestAccuracyEntry}
          onClick={() => {
            if (!recentBestAccuracyEntry) return;
            onOpenReplay(recentBestAccuracyEntry.item);
          }}
          className={`${metricButtonBase} ${
            recentBestAccuracyEntry
              ? "border-sky-300/24 bg-[linear-gradient(180deg,rgba(14,116,144,0.16),rgba(7,23,38,0.8))] hover:border-sky-300/45"
              : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
              近期最佳答對率
            </div>
            <div className="mt-1.5 text-[1.95rem] font-semibold leading-none text-[var(--mc-text)] sm:mt-2 sm:text-4xl">
              {loadingList
                ? "-"
                : recentBestAccuracyEntry
                  ? `${Math.round(recentBestAccuracyEntry.rate * 100)}%`
                  : "-"}
            </div>
            <div className="mt-auto pt-2 text-[11px] text-[var(--mc-text-muted)] sm:pt-3 sm:text-xs">
              {recentBestAccuracyEntry
                ? `第 ${recentBestAccuracyEntry.item.roundNo} 場`
                : "暫無資料"}
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4 flex justify-end border-t border-amber-300/12 pt-3.5 sm:mt-5 sm:pt-4">
        <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/28 bg-amber-300/8 p-1 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.05)]">
          <button
            type="button"
            aria-pressed={historyDisplayMode === "expanded"}
            onClick={() => onHistoryDisplayModeChange("expanded")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.06em] transition ${
              historyDisplayMode === "expanded"
                ? "border border-emerald-300/35 bg-emerald-300/14 text-emerald-100"
                : "border border-transparent text-amber-100/80 hover:border-amber-300/25 hover:bg-amber-300/10"
            }`}
          >
            <ViewAgendaRoundedIcon sx={{ fontSize: 15 }} />
            完整展開
          </button>
          <button
            type="button"
            aria-pressed={historyDisplayMode === "collapsed"}
            onClick={() => onHistoryDisplayModeChange("collapsed")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.06em] transition ${
              historyDisplayMode === "collapsed"
                ? "border border-amber-300/40 bg-amber-300/16 text-amber-50"
                : "border border-transparent text-amber-100/80 hover:border-amber-300/25 hover:bg-amber-300/10"
            }`}
          >
            <ViewListRoundedIcon sx={{ fontSize: 15 }} />
            群組收合
          </button>
        </div>
      </div>
    </section>
  );
};

export default HistoryArchiveHeader;
