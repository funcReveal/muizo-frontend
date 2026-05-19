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
      <div className="grid grid-cols-[minmax(260px,2fr)_110px_110px_110px_120px_100px_130px] gap-3 border-b border-[var(--mc-border)] px-1 pb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--mc-text-muted)]">
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
            className="grid grid-cols-[minmax(260px,2fr)_110px_110px_110px_120px_100px_130px] gap-3 px-1 py-3 text-sm"
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
