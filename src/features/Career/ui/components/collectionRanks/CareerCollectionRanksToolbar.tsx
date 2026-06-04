import React from "react";
import NorthRoundedIcon from "@mui/icons-material/NorthRounded";
import SouthRoundedIcon from "@mui/icons-material/SouthRounded";
import { MuizoSelect, type MuizoSelectOption } from "@shared/ui/select";

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
  { value: "recentRank", label: "最佳名次" },
  { value: "delta", label: "Δ 排名變動" },
  { value: "matchScore", label: "最佳分數" },
  { value: "playCount", label: "遊玩場次" },
  { value: "lastPlayedAt", label: "最近遊玩" },
];

const CareerCollectionRanksToolbar: React.FC<
  CareerCollectionRanksToolbarProps
> = ({ sortKey, sortOrder, setSortKey, setSortOrder }) => {
  const nextSortOrder = sortOrder === "asc" ? "desc" : "asc";
  const selectOptions: MuizoSelectOption[] = sortOptions.map((option) => ({
    value: option.value,
    label: option.label,
    hideThumbnail: true,
  }));

  return (
    <div className="flex items-center justify-end gap-2">
      <MuizoSelect
        value={sortKey}
        options={selectOptions}
        placeholder="選擇排序"
        size="compact"
        className="min-w-0 flex-1 sm:max-w-[220px]"
        onChange={(value) => setSortKey(value as CareerCollectionRankSortKey)}
      />

      <button
        type="button"
        title={
          sortOrder === "asc"
            ? "目前正序，點擊切換倒序"
            : "目前倒序，點擊切換正序"
        }
        aria-label={sortOrder === "asc" ? "切換為倒序" : "切換為正序"}
        onClick={() => setSortOrder(nextSortOrder)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-amber-300/22 bg-amber-300/10 text-amber-50 transition hover:border-amber-300/42 hover:bg-amber-300/18 focus:outline-none focus:ring-2 focus:ring-amber-200/28"
      >
        {sortOrder === "asc" ? (
          <NorthRoundedIcon sx={{ fontSize: 19 }} />
        ) : (
          <SouthRoundedIcon sx={{ fontSize: 19 }} />
        )}
      </button>
    </div>
  );
};

export default CareerCollectionRanksToolbar;
