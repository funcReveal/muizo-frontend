import React from "react";

import type { CareerCompositeStats } from "../../../types/career";
import {
  formatCareerPercent,
  formatCareerScore,
} from "../../../model/careerUiFormatters";
import CareerSurface, { careerMiniCardClass } from "./CareerSurface";

interface CareerCompositeSectionProps {
  composite: CareerCompositeStats;
}

const CareerCompositeSection: React.FC<CareerCompositeSectionProps> = ({
  composite,
}) => {
  const maxTrend = Math.max(...composite.trend.map((item) => item.score), 1);

  return (
    <CareerSurface className="min-h-0 flex-1">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-text)]">
            綜合表現
          </h3>
          <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
            不看單場而已，也看整體穩定度
          </p>
        </div>

        <div className="rounded-full border border-sky-300/24 bg-sky-300/10 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-sky-100">
          OVERALL
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            平均名次
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {composite.averagePlacement?.toFixed(1) ?? "-"}
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            平均得分
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {formatCareerScore(composite.averageScore)}
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            Top 3 率
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {formatCareerPercent(composite.top3Rate)}
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            第一名
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {composite.firstPlaceCount.toLocaleString("zh-TW")}
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            平均答對率
          </div>
          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {formatCareerPercent(composite.averageAccuracyRate)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-[180px] items-end gap-2">
        {composite.trend.map((point) => {
          const height = Math.max(
            18,
            Math.round((point.score / maxTrend) * 120),
          );

          return (
            <div
              key={`${point.label}-${point.score}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="text-[10px] text-slate-300">
                {point.score.toLocaleString("zh-TW")}
              </div>

              <div className="flex h-[124px] items-end">
                <div
                  className="w-7 rounded-t-lg bg-[linear-gradient(180deg,rgba(56,189,248,0.95),rgba(29,78,216,0.88))] shadow-[0_0_18px_rgba(14,165,233,0.28)]"
                  style={{ height }}
                />
              </div>

              <div className="text-[10px] text-[var(--mc-text-muted)]">
                {point.label}
              </div>
            </div>
          );
        })}
      </div>
    </CareerSurface>
  );
};

export default CareerCompositeSection;
