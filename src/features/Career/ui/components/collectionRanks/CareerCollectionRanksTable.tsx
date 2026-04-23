import React from "react";

import type { CareerCollectionRankRow } from "../../../types/career";
import {
  formatCareerDelta,
  formatCareerRank,
  formatCareerScore,
  getCareerDeltaClassName,
} from "../../../model/careerUiFormatters";

interface CareerCollectionRanksTableProps {
  items: CareerCollectionRankRow[];
}

const CareerCollectionRanksTable: React.FC<CareerCollectionRanksTableProps> = ({
  items,
}) => {
  return (
    <div className="hidden lg:block">
      <div className="grid grid-cols-[minmax(0,2fr)_110px_110px_110px_120px_100px_130px] gap-3 border-b border-[var(--mc-border)] px-1 pb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--mc-text-muted)]">
        <div>題庫</div>
        <div>榜單名次</div>
        <div>前期名次</div>
        <div>Δ 變動</div>
        <div>最佳分數</div>
        <div>場次</div>
        <div>最近遊玩</div>
      </div>

      <div className="divide-y divide-[var(--mc-border)]">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[minmax(0,2fr)_110px_110px_110px_120px_100px_130px] gap-3 px-1 py-3 text-sm"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold text-[var(--mc-text)]">
                {item.title}
              </div>
            </div>

            <div className="font-semibold text-[var(--mc-text)]">
              {formatCareerRank(item.leaderboardRank)}
            </div>

            <div className="font-semibold text-[var(--mc-text)]">
              {formatCareerRank(item.previousLeaderboardRank)}
            </div>

            <div
              className={`font-semibold ${getCareerDeltaClassName(item.delta)}`}
            >
              {formatCareerDelta(item.delta)}
            </div>

            <div className="font-semibold text-[var(--mc-text)]">
              {formatCareerScore(item.bestScore)}
            </div>

            <div className="text-[var(--mc-text-muted)]">
              {item.playCount.toLocaleString("zh-TW")}
            </div>

            <div className="text-[var(--mc-text-muted)]">
              {item.lastPlayedAt ?? "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareerCollectionRanksTable;
