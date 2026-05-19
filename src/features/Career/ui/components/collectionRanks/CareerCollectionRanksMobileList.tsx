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
          className="overflow-hidden rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.36)]"
        >
          <div className="grid grid-cols-[92px_minmax(0,1fr)]">
            <div className="relative min-h-[96px] overflow-hidden bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(15,23,42,0.56))]">
              {item.coverThumbnailUrl ? (
                <img
                  src={item.coverThumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-semibold text-amber-100/80">
                  {item.title.trim().slice(0, 1) || "題"}
                </div>
              )}
            </div>

            <div className="min-w-0 p-3">
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

              <div className="mt-3 grid grid-cols-2 gap-2">
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
          </div>
        </div>
      ))}
    </div>
  );
};

export default CareerCollectionRanksMobileList;
