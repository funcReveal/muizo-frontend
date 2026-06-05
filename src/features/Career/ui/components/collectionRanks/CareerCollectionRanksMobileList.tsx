import React from "react";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";

import type { CareerCollectionRankRow } from "../../../types/career";
import {
  formatCareerDelta,
  formatCareerRank,
  formatCareerScore,
  getCareerDeltaClassName,
} from "../../../model/careerUiFormatters";

interface CareerCollectionRanksMobileListProps {
  items: CareerCollectionRankRow[];
  selectedItemId: string | null;
  onSelectItem: (item: CareerCollectionRankRow) => void;
}

const CareerCollectionRanksMobileList: React.FC<
  CareerCollectionRanksMobileListProps
> = ({ items, selectedItemId, onSelectItem }) => {
  return (
    <div className="space-y-3 lg:hidden">
      {items.map((item) => {
        const selected = selectedItemId === item.id;
        const matchScore =
          item.matchScore ?? item.matchSummary?.selfPlayer?.finalScore ?? null;
        const currentRank = formatCareerRank(item.leaderboardRank);

        return (
          <div
            key={`${item.id}-mobile`}
            className={`overflow-hidden rounded-[16px] border shadow-[0_16px_32px_-30px_rgba(15,23,42,0.9)] transition ${
              selected
                ? "border-amber-200/28 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(15,23,42,0.32))]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.38),rgba(2,6,23,0.22))] hover:border-white/16 hover:bg-white/[0.035]"
            }`}
          >
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectItem(item)}
              className="grid min-h-[86px] w-full cursor-pointer grid-cols-[82px_minmax(0,1fr)] text-left"
            >
              <div className="relative min-h-[86px] overflow-hidden bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(15,23,42,0.56))]">
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

              <div className="min-w-0 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                      {item.title}
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2 truncate text-[11px] text-[var(--mc-text-muted)]">
                      <span className="shrink-0">
                        {item.playCount.toLocaleString("zh-TW")} 場
                      </span>
                      <span className="min-w-0 truncate">
                        最近遊玩 {item.lastPlayedAt ?? "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <KeyboardArrowDownRounded
                      sx={{ fontSize: 21 }}
                      className={`text-[var(--mc-text-muted)] transition ${
                        selected ? "-rotate-90 text-amber-100" : ""
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/18 bg-amber-300/10 px-2 py-0.5 text-amber-50">
                    <span className="text-amber-100/68">目前</span>
                    {currentRank}
                    <span
                      className={`ml-0.5 border-l border-current/18 pl-1.5 ${getCareerDeltaClassName(
                        item.delta,
                      )}`}
                    >
                      {formatCareerDelta(item.delta)}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[var(--mc-text-muted)]">
                    <span>分數</span>
                    {formatCareerScore(matchScore)}
                  </span>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CareerCollectionRanksMobileList;
