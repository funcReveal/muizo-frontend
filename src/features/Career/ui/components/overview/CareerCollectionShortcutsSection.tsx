import React from "react";

import type { CareerCollectionRankShortcutItem } from "../../../types/career";
import {
  formatCareerDelta,
  formatCareerRank,
  getCareerDeltaClassName,
} from "../../../model/careerUiFormatters";
import CareerSurface from "./CareerSurface";

interface CareerCollectionShortcutsSectionProps {
  items: CareerCollectionRankShortcutItem[];
  onOpenCollectionRanks: () => void;
}

const CareerCollectionShortcutsSection: React.FC<
  CareerCollectionShortcutsSectionProps
> = ({ items, onOpenCollectionRanks }) => {
  return (
    <CareerSurface>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-text)]">
            題庫戰績捷徑
          </h3>
          <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
            先看最近變動最大的題庫
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCollectionRanks}
          className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/16"
        >
          查看全部
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-[16px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)] px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                {item.title}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--mc-text-muted)]">
                榜單名次 {formatCareerRank(item.leaderboardRank)}
              </div>
            </div>

            <div
              className={`shrink-0 text-sm font-semibold ${getCareerDeltaClassName(
                item.delta,
              )}`}
            >
              {formatCareerDelta(item.delta)}
            </div>
          </div>
        ))}
      </div>
    </CareerSurface>
  );
};

export default CareerCollectionShortcutsSection;
