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
  latestRecentEntry: RoomSettlementHistorySummary | null;
  recentRoomSpread: number;
  onOpenReplay: (summary: RoomSettlementHistorySummary) => void;
  onBackToRooms: () => void;
  formatRankFraction: (rank: number | null, playerCount: number | null | undefined) => string;
  formatRelative: (timestamp: number) => string;
  formatDateTime: (timestamp: number) => string;
}

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
  latestRecentEntry,
  recentRoomSpread,
  onOpenReplay,
  onBackToRooms,
  formatRankFraction,
  formatRelative,
  formatDateTime,
}) => (
  <section className="relative overflow-hidden rounded-[26px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.94),rgba(8,7,5,0.98))] p-4 shadow-[0_16px_36px_-28px_rgba(0,0,0,0.72)] sm:p-5">
    <div className="relative grid gap-4 lg:grid-cols-1">
      <div className="min-w-0">
        <div className="mb-4 inline-flex min-w-[180px] items-center rounded-2xl border border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface-strong)_86%,black_14%)] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--mc-text-muted)]">
              Match Archive
            </div>
            <h1 className="truncate text-lg font-semibold text-[var(--mc-text)] sm:text-xl">
              對戰歷史
            </h1>
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-6 text-[var(--mc-text-muted)] sm:text-[15px]">
          近 {historyPageLimit} 場對戰快照，點擊指標可直接開啟對應回顧。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-100/90">
            已載入 {recentItemsLength} / {historyPageLimit} 場
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/28 bg-amber-300/8 p-1">
            <button
              type="button"
              aria-pressed={historyDisplayMode === "expanded"}
              onClick={() => onHistoryDisplayModeChange("expanded")}
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] transition ${
                historyDisplayMode === "expanded"
                  ? "border border-emerald-300/35 bg-emerald-300/14 text-emerald-100"
                  : "border border-transparent text-amber-100/80 hover:border-amber-300/25 hover:bg-amber-300/10"
              }`}
            >
              完整顯示
            </button>
            <button
              type="button"
              aria-pressed={historyDisplayMode === "collapsed"}
              onClick={() => onHistoryDisplayModeChange("collapsed")}
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] transition ${
                historyDisplayMode === "collapsed"
                  ? "border border-amber-300/40 bg-amber-300/16 text-amber-50"
                  : "border border-transparent text-amber-100/80 hover:border-amber-300/25 hover:bg-amber-300/10"
              }`}
            >
              摺疊顯示
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            disabled={!recentTopScoreEntry}
            onClick={() => {
              if (!recentTopScoreEntry) return;
              onOpenReplay(recentTopScoreEntry);
            }}
            className={`min-h-[112px] rounded-2xl border p-3.5 text-left transition ${
              recentTopScoreEntry
                ? "border-emerald-300/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(5,30,24,0.78))] hover:-translate-y-0.5 hover:border-emerald-300/45"
                : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                近10把最高分
              </div>
              <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
                {loadingList
                  ? "-"
                  : (recentTopScoreEntry?.selfPlayer?.finalScore ?? "-")}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[var(--mc-text-muted)]">
                <span className="min-w-0 truncate whitespace-nowrap">
                  {recentTopScoreEntry
                    ? `第 ${recentTopScoreEntry.roundNo} 場`
                    : "尚無可用分數資料"}
                </span>
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
            className={`min-h-[112px] rounded-2xl border p-3.5 text-left transition ${
              recentBestRankEntry
                ? "border-amber-300/28 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(40,24,8,0.78))] hover:-translate-y-0.5 hover:border-amber-300/50"
                : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                近10把最佳名次
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
              <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[var(--mc-text-muted)]">
                <span className="min-w-0 truncate whitespace-nowrap">
                  {recentBestRankEntry
                    ? `第 ${recentBestRankEntry.item.roundNo} 場`
                    : "尚無可用名次資料"}
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
            className={`min-h-[112px] rounded-2xl border p-3.5 text-left transition ${
              recentBestComboEntry
                ? "border-fuchsia-300/22 bg-[linear-gradient(180deg,rgba(116,58,176,0.14),rgba(22,12,32,0.78))] hover:-translate-y-0.5 hover:border-fuchsia-300/38"
                : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                近10把最佳 COMBO
              </div>
              <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
                {loadingList
                  ? "-"
                  : recentBestComboEntry?.selfPlayer
                    ? `x${recentBestComboEntry.selfPlayer.maxCombo}`
                    : "-"}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[var(--mc-text-muted)]">
                <span className="min-w-0 truncate whitespace-nowrap">
                  {recentBestComboEntry
                    ? `第 ${recentBestComboEntry.roundNo} 場`
                    : "尚無可用 Combo 資料"}
                </span>
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
            className={`min-h-[112px] rounded-2xl border p-3.5 text-left transition ${
              recentBestAccuracyEntry
                ? "border-sky-300/24 bg-[linear-gradient(180deg,rgba(14,116,144,0.16),rgba(7,23,38,0.8))] hover:-translate-y-0.5 hover:border-sky-300/45"
                : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                近10把最佳答對率
              </div>
              <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
                {loadingList
                  ? "-"
                  : recentBestAccuracyEntry
                    ? `${Math.round(recentBestAccuracyEntry.rate * 100)}%`
                    : "-"}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[var(--mc-text-muted)]">
                <span className="min-w-0 truncate whitespace-nowrap">
                  {recentBestAccuracyEntry
                    ? `第 ${recentBestAccuracyEntry.item.roundNo} 場`
                    : "尚無可用答對率資料"}
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

        <div className="mt-2 text-xs text-[var(--mc-text-muted)]/80">
          近況：
          {latestRecentEntry
            ? `分布 ${recentRoomSpread} 個房間，最近一場在 ${formatRelative(latestRecentEntry.endedAt) || formatDateTime(latestRecentEntry.endedAt)}`
            : "尚無對戰資料"}
        </div>
      </div>

      <div className="hidden rounded-2xl border border-amber-300/18 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(245,158,11,0.02))] p-4 sm:p-5">
        <div className="text-xs uppercase tracking-[0.22em] text-amber-200/80">
          使用提示
        </div>
        <ol className="mt-3 space-y-3 text-sm leading-6 text-[var(--mc-text-muted)]">
          <li>1. 點擊房間群組可展開同一房間的多場對戰紀錄。</li>
          <li>2. 每場紀錄會顯示分數、答對數、最大 Combo 與歌單來源。</li>
          <li>3. 點進詳情後可查看完整結算回顧與題目紀錄。</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-[var(--mc-accent)]/55 bg-[var(--mc-accent)]/16 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-[var(--mc-text)] transition hover:bg-[var(--mc-accent)]/22"
            onClick={onBackToRooms}
          >
            返回房間列表
          </button>
        </div>
      </div>
    </div>
  </section>
);

export default HistoryArchiveHeader;
