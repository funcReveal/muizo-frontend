import React from "react";

import type { CareerShareCardData } from "../../../types/career";
import {
  formatCareerPlayTime,
  formatCareerRank,
  formatCareerScore,
} from "../../../model/careerUiFormatters";
import CareerShareSurface from "./CareerShareSurface";

interface CareerSharePreviewSectionProps {
  preview: CareerShareCardData;
}

const CareerSharePreviewSection: React.FC<CareerSharePreviewSectionProps> = ({
  preview,
}) => {
  return (
    <CareerShareSurface className="min-h-0">
      <div className="rounded-[24px] border border-sky-300/18 bg-[linear-gradient(135deg,rgba(11,24,49,0.98),rgba(6,12,24,0.98))] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-3xl font-bold tracking-tight text-white">
              Muizo
            </div>
            <div className="mt-2 text-sm font-semibold text-sky-300">
              Career Snapshot
            </div>
          </div>

          <div className="rounded-full border border-sky-300/28 bg-sky-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-sky-100">
            {preview.descriptor}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[16px] border border-sky-300/14 bg-white/5 p-3">
            <div className="text-[11px] tracking-[0.12em] text-slate-300">
              對戰數
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {preview.totalMatches.toLocaleString("zh-TW")}
            </div>
          </div>

          <div className="rounded-[16px] border border-sky-300/14 bg-white/5 p-3">
            <div className="text-[11px] tracking-[0.12em] text-slate-300">
              最佳名次
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {formatCareerRank(preview.bestRank)}
            </div>
          </div>

          <div className="rounded-[16px] border border-sky-300/14 bg-white/5 p-3">
            <div className="text-[11px] tracking-[0.12em] text-slate-300">
              最高分
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {formatCareerScore(preview.bestScore)}
            </div>
          </div>

          <div className="rounded-[16px] border border-sky-300/14 bg-white/5 p-3">
            <div className="text-[11px] tracking-[0.12em] text-slate-300">
              最高 Combo
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {preview.bestCombo ? `x${preview.bestCombo}` : "-"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-[11px] tracking-[0.12em] text-slate-300">
            {preview.highlightTitle}
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {preview.highlightValue}
          </div>
          <div className="mt-2 text-sm text-slate-200/80">
            {preview.highlightSubtitle}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-300">
          <span>{preview.playerName}</span>
          <span>總分 {formatCareerScore(preview.totalScore)}</span>
          <span>{formatCareerPlayTime(preview.playTimeSec)}</span>
        </div>
      </div>
    </CareerShareSurface>
  );
};

export default CareerSharePreviewSection;
