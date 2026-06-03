import React from "react";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";

import type { CareerCollectionRankRow } from "../../../types/career";
import {
  formatCareerDelta,
  formatCareerRank,
  formatCareerScore,
  getCareerDeltaClassName,
} from "../../../model/careerUiFormatters";

interface CareerCollectionRanksTableProps {
  items: CareerCollectionRankRow[];
  selectedItemId: string | null;
  onSelectItem: (item: CareerCollectionRankRow) => void;
}

const gridClassName =
  "grid grid-cols-[minmax(260px,2fr)_110px_110px_110px_120px_100px_130px_34px] gap-3";

const CareerCollectionRanksTable: React.FC<CareerCollectionRanksTableProps> = ({
  items,
  selectedItemId,
  onSelectItem,
}) => {
  return (
    <div className="hidden lg:block">
      <div
        className={`${gridClassName} border-b border-[var(--mc-border)] px-1 pb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--mc-text-muted)]`}
      >
        <div>題庫</div>
        <div>榜單名次</div>
        <div>前期名次</div>
        <div>Δ 變動</div>
        <div>最佳分數</div>
        <div>場次</div>
        <div>最近遊玩</div>
        <div />
      </div>

      <div className="divide-y divide-[var(--mc-border)]">
        {items.map((item) => {
          const selected = selectedItemId === item.id;

          return (
            <div key={item.id} className="px-1 py-3">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectItem(item)}
                className={`${gridClassName} w-full rounded-[14px] border px-2 py-2 text-left text-sm transition ${
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

                <div className="self-center font-semibold text-[var(--mc-text)]">
                  {formatCareerRank(item.leaderboardRank)}
                </div>

                <div className="self-center font-semibold text-[var(--mc-text)]">
                  {formatCareerRank(item.previousLeaderboardRank)}
                </div>

                <div
                  className={`self-center font-semibold ${getCareerDeltaClassName(
                    item.delta,
                  )}`}
                >
                  {formatCareerDelta(item.delta)}
                </div>

                <div className="self-center font-semibold text-[var(--mc-text)]">
                  {formatCareerScore(item.bestScore)}
                </div>

                <div className="self-center text-[var(--mc-text-muted)]">
                  {item.playCount.toLocaleString("zh-TW")}
                </div>

                <div className="self-center text-[var(--mc-text-muted)]">
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
