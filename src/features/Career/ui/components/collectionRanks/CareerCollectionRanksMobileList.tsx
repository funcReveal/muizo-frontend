import React from "react";

import type { CareerCollectionRankRow } from "../../../types/career";
import {
  formatCareerDelta,
  formatCareerRank,
  formatCareerScore,
  getCareerDeltaClassName,
} from "../../../model/careerUiFormatters";
import CareerStatCard from "../primitives/CareerStatCard";

interface CareerCollectionRanksMobileListProps {
  items: CareerCollectionRankRow[];
}

const CareerCollectionRanksMobileList: React.FC<
  CareerCollectionRanksMobileListProps
> = ({ items }) => {
  return (
    <div className="space-y-3 lg:hidden">
      {items.map((item) => (
        <div
          key={`${item.id}-mobile`}
          className="rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.36)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                {item.title}
              </div>
              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                最近遊玩 {item.lastPlayedAt ?? "-"}
              </div>
            </div>

            <div
              className={`text-sm font-semibold ${getCareerDeltaClassName(item.delta)}`}
            >
              {formatCareerDelta(item.delta)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <CareerStatCard
              label="榜單名次"
              value={formatCareerRank(item.leaderboardRank)}
              emphasis="soft"
            />

            <CareerStatCard
              label="前期名次"
              value={formatCareerRank(item.previousLeaderboardRank)}
              emphasis="soft"
            />

            <CareerStatCard
              label="最佳分數"
              value={formatCareerScore(item.bestScore)}
              emphasis="soft"
            />

            <CareerStatCard
              label="遊玩場次"
              value={item.playCount.toLocaleString("zh-TW")}
              emphasis="soft"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CareerCollectionRanksMobileList;
