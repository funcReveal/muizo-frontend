import React from "react";

import type {
  CareerCollectionRankSortKey,
  CareerCollectionRankSortOrder,
} from "../../../types/career";

interface CareerCollectionRanksToolbarProps {
  sortKey: CareerCollectionRankSortKey;
  sortOrder: CareerCollectionRankSortOrder;
  setSortKey: (value: CareerCollectionRankSortKey) => void;
  setSortOrder: (value: CareerCollectionRankSortOrder) => void;
}

const sortOptions: Array<{
  value: CareerCollectionRankSortKey;
  label: string;
}> = [
  { value: "leaderboardRank", label: "榜單名次" },
  { value: "delta", label: "Δ 排名變動" },
  { value: "bestScore", label: "最佳分數" },
  { value: "playCount", label: "遊玩場次" },
  { value: "lastPlayedAt", label: "最近遊玩" },
];

const buttonBaseClass =
  "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition";

const CareerCollectionRanksToolbar: React.FC<
  CareerCollectionRanksToolbarProps
> = ({ sortKey, sortOrder, setSortKey, setSortOrder }) => {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.4)] p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          htmlFor="career-collection-rank-sort"
          className="text-[11px] font-semibold tracking-[0.12em] text-[var(--mc-text-muted)]"
        >
          排序
        </label>

        <select
          id="career-collection-rank-sort"
          value={sortKey}
          onChange={(event) =>
            setSortKey(event.target.value as CareerCollectionRankSortKey)
          }
          className="rounded-[12px] border border-[var(--mc-border)] bg-[rgba(8,14,24,0.92)] px-3 py-2 text-sm text-[var(--mc-text)] outline-none transition focus:border-sky-300/40"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSortOrder("asc")}
          className={`${buttonBaseClass} ${
            sortOrder === "asc"
              ? "border-sky-300/40 bg-sky-300/12 text-sky-100"
              : "border-[var(--mc-border)] bg-transparent text-[var(--mc-text-muted)] hover:border-sky-300/24 hover:bg-sky-300/8"
          }`}
        >
          升冪
        </button>

        <button
          type="button"
          onClick={() => setSortOrder("desc")}
          className={`${buttonBaseClass} ${
            sortOrder === "desc"
              ? "border-sky-300/40 bg-sky-300/12 text-sky-100"
              : "border-[var(--mc-border)] bg-transparent text-[var(--mc-text-muted)] hover:border-sky-300/24 hover:bg-sky-300/8"
          }`}
        >
          降冪
        </button>
      </div>
    </div>
  );
};

export default CareerCollectionRanksToolbar;
