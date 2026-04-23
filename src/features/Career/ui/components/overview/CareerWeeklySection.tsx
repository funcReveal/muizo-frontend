import React from "react";

import type { CareerWeeklyStats } from "../../../types/career";
import {
  formatCareerPercent,
  formatCareerScore,
  formatCareerSignedInt,
  formatCareerSignedPercent,
} from "../../../model/careerUiFormatters";
import CareerSurface, { careerMiniCardClass } from "./CareerSurface";

interface CareerWeeklySectionProps {
  weekly: CareerWeeklyStats;
}

const CareerWeeklySection: React.FC<CareerWeeklySectionProps> = ({
  weekly,
}) => {
  return (
    <CareerSurface>
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-[var(--mc-text)]">
          本週進度
        </h3>
        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
          這區只講最近有沒有往前推
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            本週對戰
          </div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="text-2xl font-semibold text-[var(--mc-text)]">
              {weekly.currentMatches.toLocaleString("zh-TW")}
            </div>
            <div className="text-sm font-semibold text-emerald-300">
              {formatCareerSignedInt(weekly.matchesDelta)}
            </div>
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            本週總分
          </div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="text-2xl font-semibold text-[var(--mc-text)]">
              {formatCareerScore(weekly.currentScore)}
            </div>
            <div className="text-sm font-semibold text-emerald-300">
              {formatCareerSignedInt(weekly.scoreDelta)}
            </div>
          </div>
        </div>

        <div className={careerMiniCardClass}>
          <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
            本週答對率
          </div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="text-2xl font-semibold text-[var(--mc-text)]">
              {formatCareerPercent(weekly.currentAccuracyRate)}
            </div>
            <div className="text-sm font-semibold text-emerald-300">
              {formatCareerSignedPercent(weekly.accuracyDelta)}
            </div>
          </div>
        </div>
      </div>
    </CareerSurface>
  );
};

export default CareerWeeklySection;
