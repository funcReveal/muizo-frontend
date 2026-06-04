import React from "react";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import NorthRoundedIcon from "@mui/icons-material/NorthRounded";
import SouthRoundedIcon from "@mui/icons-material/SouthRounded";

import type {
  CareerCollectionRankRow,
  CareerCollectionRankSortKey,
  CareerCollectionRankSortOrder,
} from "../../../types/career";
import {
  formatCareerDelta,
  formatCareerRank,
  formatCareerScore,
  getCareerDeltaClassName,
} from "../../../model/careerUiFormatters";

interface CareerCollectionRanksTableProps {
  items: CareerCollectionRankRow[];
  selectedItemId: string | null;
  sortKey: CareerCollectionRankSortKey;
  sortOrder: CareerCollectionRankSortOrder;
  setSortKey: (value: CareerCollectionRankSortKey) => void;
  setSortOrder: (value: CareerCollectionRankSortOrder) => void;
  onSelectItem: (item: CareerCollectionRankRow) => void;
}

const gridClassName =
  "grid grid-cols-[minmax(280px,2fr)_112px_112px_104px_128px_132px_34px] gap-3";

const sortableHeaders: Array<{
  key: CareerCollectionRankSortKey | null;
  label: string;
  defaultOrder?: CareerCollectionRankSortOrder;
  align?: "left" | "right" | "center";
}> = [
  { key: null, label: "題庫" },
  { key: "leaderboardRank", label: "榜單名次", defaultOrder: "asc", align: "right" },
  { key: "previousLeaderboardRank", label: "前期名次", defaultOrder: "asc", align: "right" },
  { key: "delta", label: "Δ 變動", defaultOrder: "desc", align: "right" },
  { key: "matchScore", label: "最佳分數", defaultOrder: "desc", align: "right" },
  { key: "lastPlayedAt", label: "最近遊玩", defaultOrder: "desc", align: "right" },
  { key: null, label: "", align: "center" },
];

const CareerCollectionRanksTable: React.FC<CareerCollectionRanksTableProps> = ({
  items,
  selectedItemId,
  sortKey,
  sortOrder,
  setSortKey,
  setSortOrder,
  onSelectItem,
}) => {
  const handleHeaderSort = React.useCallback(
    (
      nextKey: CareerCollectionRankSortKey,
      defaultOrder: CareerCollectionRankSortOrder,
    ) => {
      if (sortKey === nextKey) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        return;
      }

      setSortKey(nextKey);
      setSortOrder(defaultOrder);
    },
    [setSortKey, setSortOrder, sortKey, sortOrder],
  );

  return (
    <div className="hidden lg:block">
      <div
        className={`${gridClassName} border-b border-[var(--mc-border)] px-1 pb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--mc-text-muted)]`}
      >
        {sortableHeaders.map((header) =>
          header.key ? (
            <button
              key={header.label}
              type="button"
              onClick={() =>
                handleHeaderSort(header.key, header.defaultOrder ?? "asc")
              }
              className={`inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-1.5 py-1 transition hover:bg-amber-300/8 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200/22 ${
                header.align === "right"
                  ? "justify-end text-right"
                  : "justify-start text-left"
              } ${
                sortKey === header.key ? "text-amber-100" : ""
              }`}
            >
              <span className="truncate">{header.label}</span>
              {sortKey === header.key ? (
                sortOrder === "asc" ? (
                  <NorthRoundedIcon sx={{ fontSize: 13 }} />
                ) : (
                  <SouthRoundedIcon sx={{ fontSize: 13 }} />
                )
              ) : null}
            </button>
          ) : (
            <div
              key={header.label}
              className={
                header.align === "center"
                  ? "text-center"
                  : header.align === "right"
                    ? "text-right"
                    : ""
              }
            >
              {header.label}
            </div>
          ),
        )}
      </div>

      <div className="divide-y divide-[var(--mc-border)]">
        {items.map((item) => {
          const selected = selectedItemId === item.id;
          const matchScore =
            item.matchScore ?? item.matchSummary?.selfPlayer?.finalScore ?? null;

          return (
            <div key={item.id} className="px-1 py-3">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectItem(item)}
                className={`${gridClassName} w-full cursor-pointer rounded-[14px] border px-2 py-2 text-left text-sm transition ${
                  selected
                    ? "border-amber-200/22 bg-amber-200/[0.055]"
                    : "border-transparent hover:border-white/8 hover:bg-white/[0.035]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(15,23,42,0.56))]">
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
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[var(--mc-text)]">
                      {item.title}
                    </div>
                  </div>
                </div>

                <div className="self-center text-right font-semibold text-[var(--mc-text)]">
                  {formatCareerRank(item.leaderboardRank)}
                </div>

                <div className="self-center text-right font-semibold text-[var(--mc-text)]">
                  {formatCareerRank(item.previousLeaderboardRank)}
                </div>

                <div
                  className={`self-center text-right font-semibold ${getCareerDeltaClassName(
                    item.delta,
                  )}`}
                >
                  {formatCareerDelta(item.delta)}
                </div>

                <div className="self-center text-right font-semibold text-[var(--mc-text)]">
                  {formatCareerScore(matchScore)}
                </div>

                <div className="self-center text-right text-[var(--mc-text-muted)]">
                  {item.lastPlayedAt ?? "-"}
                </div>

                <div className="flex items-center justify-center self-center">
                  <KeyboardArrowDownRounded
                    sx={{ fontSize: 22 }}
                    className={`text-[var(--mc-text-muted)] transition ${
                      selected ? "-rotate-90 text-amber-100" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CareerCollectionRanksTable;
