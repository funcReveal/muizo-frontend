import React from "react";
import { List, type RowComponentProps } from "react-window";

import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import type { CareerCollectionRankShortcutItem } from "../../../types/career";
import {
  formatCareerDelta,
  formatCareerRank,
  getCareerDeltaClassName,
} from "../../../model/careerUiFormatters";

interface CareerRecentPlaysListProps {
  items: CareerCollectionRankShortcutItem[];
  activeScopeKind: "casual" | "leaderboard";
  onOpenCollectionRanks: () => void;
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
  compact?: boolean;
}

type CareerRecentPlayRow = {
  key: string;
  item: CareerCollectionRankShortcutItem;
};

interface CareerRecentPlayRowProps {
  rows: CareerRecentPlayRow[];
  activeScopeKind: "casual" | "leaderboard";
  onOpenCollectionRanks: () => void;
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
}

const formatRecentRank = (
  item: CareerCollectionRankShortcutItem,
  activeScopeKind: "casual" | "leaderboard",
) => {
  if (item.recentRank === null || !Number.isFinite(item.recentRank)) {
    return "名次 -";
  }

  const rankPrefix = activeScopeKind === "leaderboard" ? "當時 #" : "第 ";
  const rankSuffix = activeScopeKind === "leaderboard" ? "" : " 名";

  if (
    item.recentPlayerCount !== null &&
    Number.isFinite(item.recentPlayerCount) &&
    item.recentPlayerCount > 0
  ) {
    return `${rankPrefix}${item.recentRank}/${item.recentPlayerCount}${rankSuffix}`;
  }

  return `${rankPrefix}${item.recentRank}${rankSuffix}`;
};

const CareerRecentPlaysList: React.FC<CareerRecentPlaysListProps> = ({
  items,
  activeScopeKind,
  onOpenCollectionRanks,
  onOpenMatch,
  compact = false,
}) => {
  const visibleItems = items.slice(0, 6);
  const placeholderCount = Math.max(0, 6 - visibleItems.length);
  const mobileRows = React.useMemo<CareerRecentPlayRow[]>(
    () => visibleItems.map((item) => ({ key: item.id, item })),
    [visibleItems],
  );
  const rows = [
    ...visibleItems.map((item) => ({ key: item.id, item })),
    ...Array.from({ length: placeholderCount }, (_, index) => ({
      key: `placeholder-${index}`,
      item: null,
    })),
  ];
  const mobileRowProps = React.useMemo<CareerRecentPlayRowProps>(
    () => ({
      rows: mobileRows,
      activeScopeKind,
      onOpenCollectionRanks,
      onOpenMatch,
    }),
    [activeScopeKind, mobileRows, onOpenCollectionRanks, onOpenMatch],
  );

  return (
    <>
      <div className="min-h-0 flex-1 sm:hidden">
        {mobileRows.length > 0 ? (
          <List
            className="pr-1"
            defaultHeight={360}
            rowComponent={CareerRecentPlayVirtualRow}
            rowCount={mobileRows.length}
            rowHeight={104}
            rowProps={mobileRowProps}
            overscanCount={3}
            style={{ height: "100%", width: "100%" }}
          />
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center rounded-[14px] border border-dashed border-white/8 bg-white/[0.018] px-4 text-sm text-[var(--mc-text-muted)]/70">
            尚無近期遊玩
          </div>
        )}
      </div>

      <div
        className={`hidden h-full min-h-0 flex-1 gap-2 sm:grid sm:overflow-hidden ${
          compact ? "sm:grid-cols-2" : ""
        }`}
        style={{
          gridTemplateRows: compact
            ? "repeat(3, minmax(0, 1fr))"
            : "repeat(6, minmax(0, 1fr))",
        }}
      >
        {rows.map(({ key, item }) =>
          item ? (
            <CareerRecentPlayCard
              key={key}
              item={item}
              activeScopeKind={activeScopeKind}
              onOpenCollectionRanks={onOpenCollectionRanks}
              onOpenMatch={onOpenMatch}
              className={`sm:h-full sm:w-full ${
                compact
                  ? "grid-cols-[88px_minmax(0,1fr)]"
                  : "sm:grid-cols-[92px_minmax(0,1fr)]"
              }`}
            />
          ) : (
            <div
              key={key}
              className={`hidden h-full min-h-0 w-full overflow-hidden rounded-[14px] border border-dashed border-white/8 bg-white/[0.018] sm:grid ${
                compact
                  ? "grid-cols-[88px_minmax(0,1fr)]"
                  : "grid-cols-[92px_minmax(0,1fr)]"
              }`}
            >
              <div className="h-full min-h-0 bg-white/[0.025]" />
              <div className="flex min-h-0 min-w-0 items-center px-2.5 text-[11px] text-[var(--mc-text-muted)]/60">
                {visibleItems.length === 0 ? "尚無近期遊玩" : "預留紀錄"}
              </div>
            </div>
          ),
        )}
      </div>
    </>
  );
};

const CareerRecentPlayVirtualRow = ({
  index,
  style,
  rows,
  activeScopeKind,
  onOpenCollectionRanks,
  onOpenMatch,
}: RowComponentProps<CareerRecentPlayRowProps>) => {
  const row = rows[index];
  if (!row) return <div style={style} />;

  return (
    <div style={style} className="px-0.5 py-1">
      <CareerRecentPlayCard
        item={row.item}
        activeScopeKind={activeScopeKind}
        onOpenCollectionRanks={onOpenCollectionRanks}
        onOpenMatch={onOpenMatch}
        className="h-full w-full grid-cols-[78px_minmax(0,1fr)]"
      />
    </div>
  );
};

const CareerRecentPlayCard: React.FC<{
  item: CareerCollectionRankShortcutItem;
  activeScopeKind: "casual" | "leaderboard";
  onOpenCollectionRanks: () => void;
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
  className?: string;
}> = ({
  item,
  activeScopeKind,
  onOpenCollectionRanks,
  onOpenMatch,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={() => {
        if (item.matchSummary) {
          onOpenMatch(item.matchSummary);
          return;
        }
        onOpenCollectionRanks();
      }}
      className={`grid min-h-0 overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.04] text-left transition hover:border-amber-200/20 hover:bg-white/[0.06] ${className}`}
    >
      <div className="relative h-full min-h-0 overflow-hidden bg-[linear-gradient(135deg,rgba(245,158,11,0.24),rgba(15,23,42,0.58))]">
        {item.coverThumbnailUrl ? (
          <img
            src={item.coverThumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-amber-100/80">
            {item.title.trim().slice(0, 1) || "題"}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/48 to-transparent" />
      </div>

      <div className="flex min-h-0 min-w-0 items-center justify-between gap-2 overflow-hidden p-2">
        <div className="min-w-0 overflow-hidden">
          <div className="truncate text-[13px] font-semibold text-[var(--mc-text)]">
            {item.title}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]">
            {item.lastPlayedAt ? `最近 ${item.lastPlayedAt}` : "最近時間未知"}
          </div>
          <div className="mt-1.5 flex max-h-6 flex-wrap items-center gap-1.5 overflow-hidden text-[11px] font-semibold">
            <span className="rounded-full border border-amber-200/16 bg-amber-300/10 px-2 py-0.5 text-amber-100">
              {formatRecentRank(item, activeScopeKind)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[var(--mc-text-muted)]">
              {activeScopeKind === "leaderboard"
                ? `榜單 ${formatCareerRank(item.leaderboardRank)}`
                : (item.sourceLabel ?? "題庫來源未知")}
            </span>
          </div>
        </div>

        {activeScopeKind === "leaderboard" && (
          <div
            className={`shrink-0 text-xs font-semibold ${getCareerDeltaClassName(
              item.delta,
            )}`}
          >
            {formatCareerDelta(item.delta)}
          </div>
        )}
      </div>
    </button>
  );
};

export default CareerRecentPlaysList;
