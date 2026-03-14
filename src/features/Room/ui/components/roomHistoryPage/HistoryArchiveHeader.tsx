import ViewAgendaRoundedIcon from "@mui/icons-material/ViewAgendaRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import React from "react";

import type { RoomSettlementHistorySummary } from "../../../model/types";

type HistoryListDisplayMode = "expanded" | "collapsed";

interface HistoryArchiveHeaderProps {
  historyPageLimit: number;
  loadingList: boolean;
  recentItemsLength: number;
  historyDisplayMode: HistoryListDisplayMode;
  onHistoryDisplayModeChange: (mode: HistoryListDisplayMode) => void;
  recentTopScoreEntry: RoomSettlementHistorySummary | null;
  recentBestRankEntry: { item: RoomSettlementHistorySummary; rank: number } | null;
  recentBestComboEntry: RoomSettlementHistorySummary | null;
  recentBestAccuracyEntry: { item: RoomSettlementHistorySummary; rate: number } | null;
  onOpenReplay: (summary: RoomSettlementHistorySummary) => void;
  onBackToRooms: () => void;
  formatRankFraction: (rank: number | null, playerCount: number | null | undefined) => string;
}

const metricButtonBase =
  "min-h-[96px] rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5";

const HistoryArchiveHeader: React.FC<HistoryArchiveHeaderProps> = ({
  historyPageLimit,
  loadingList,
  recentItemsLength,
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
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))] p-4 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="inline-flex items-center rounded-2xl border border-amber-300/18 bg-[color-mix(in_srgb,var(--mc-surface-strong)_88%,black_12%)] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--mc-text-muted)]">
                Match Archive
              </div>
              <h1 className="mt-1 text-lg font-semibold text-[var(--mc-text)] sm:text-xl">
                對戰歷史
              </h1>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)] sm:text-[15px]">
            依房間整理最近 {historyPageLimit} 場對戰快照，展開房間後可直接切換局次並打開回放。
          </p>

        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-[var(--mc-accent)]/55 bg-[var(--mc-accent)]/16 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-[var(--mc-text)] transition hover:bg-[var(--mc-accent)]/24"
            onClick={onBackToRooms}
          >
            返回房間列表
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
              近期最高分
            </div>
            <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
              {loadingList ? "-" : (recentTopScoreEntry?.selfPlayer?.finalScore ?? "-")}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-[var(--mc-text-muted)]">
              <span>{recentTopScoreEntry ? `第 ${recentTopScoreEntry.roundNo} 場` : "尚無資料"}</span>
              {recentTopScoreEntry && (
                <span className="rounded-full border border-emerald-300/35 bg-emerald-300/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-emerald-100">
                  查看
                </span>
              )}
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
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
              近期最佳名次
            </div>
            <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
              {loadingList
                ? "-"
                : recentBestRankEntry
                  ? formatRankFraction(
                      recentBestRankEntry.rank,
                      recentBestRankEntry.item.playerCount,
                    )
                  : "-"}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-[var(--mc-text-muted)]">
              <span>
                {recentBestRankEntry ? `第 ${recentBestRankEntry.item.roundNo} 場` : "尚無資料"}
              </span>
              {recentBestRankEntry && (
                <span className="rounded-full border border-amber-300/38 bg-amber-300/14 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-amber-50">
                  查看
                </span>
              )}
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
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
              近期最佳 Combo
            </div>
            <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
              {loadingList
                ? "-"
                : recentBestComboEntry?.selfPlayer
                  ? `x${recentBestComboEntry.selfPlayer.maxCombo}`
                  : "-"}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-[var(--mc-text-muted)]">
              <span>{recentBestComboEntry ? `第 ${recentBestComboEntry.roundNo} 場` : "尚無資料"}</span>
              {recentBestComboEntry && (
                <span className="rounded-full border border-fuchsia-300/35 bg-fuchsia-300/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-fuchsia-100">
                  查看
                </span>
              )}
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
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
              近期最佳答對率
            </div>
            <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
              {loadingList
                ? "-"
                : recentBestAccuracyEntry
                  ? `${Math.round(recentBestAccuracyEntry.rate * 100)}%`
                  : "-"}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-[var(--mc-text-muted)]">
              <span>
                {recentBestAccuracyEntry
                  ? `第 ${recentBestAccuracyEntry.item.roundNo} 場`
                  : "尚無資料"}
              </span>
              {recentBestAccuracyEntry && (
                <span className="rounded-full border border-sky-300/35 bg-sky-300/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-sky-100">
                  查看
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-2.5 border-t border-amber-300/12 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center self-start rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-100/90">
          已載入 {recentItemsLength} / {historyPageLimit} 場
        </div>

        <div className="flex items-center justify-end gap-2 self-end sm:self-auto">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
            列表顯示
          </span>
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
              完整顯示
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
              摺疊顯示
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HistoryArchiveHeader;
