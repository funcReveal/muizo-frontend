import React from "react";

import type { CareerHighlightItem } from "../../../types/career";
import CareerSurface from "./CareerSurface";

interface CareerHighlightsSectionProps {
  highlights: CareerHighlightItem[];
  onOpenShare: () => void;
}

const CareerHighlightsSection: React.FC<CareerHighlightsSectionProps> = ({
  highlights,
  onOpenShare,
}) => {
  return (
    <CareerSurface className="min-h-0 overflow-hidden">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-text)]">
            高光紀錄
          </h3>
          <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
            值得炫耀的代表表現
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenShare}
          className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/16"
        >
          前往分享
        </button>
      </div>

      <div className="mt-4 grid h-[calc(100%-56px)] min-h-0 gap-3 sm:grid-cols-2">
        {highlights.map((item) => (
          <div
            key={`${item.key}-${item.label}`}
            className={`rounded-[18px] border p-3 ${item.accentClass}`}
          >
            <div className="text-[11px] tracking-[0.12em] text-slate-200/90">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {item.value}
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-200/80">
              {item.subtitle}
            </div>
          </div>
        ))}
      </div>
    </CareerSurface>
  );
};

export default CareerHighlightsSection;
