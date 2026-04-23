import React from "react";

import type {
  CareerShareCardData,
  CareerShareTemplate,
} from "../../types/career";

interface CareerShareTabProps {
  activeTemplate: CareerShareTemplate;
  setActiveTemplate: (value: CareerShareTemplate) => void;
  templates: Array<{
    key: CareerShareTemplate;
    label: string;
    description: string;
  }>;
  preview: CareerShareCardData;
  caption: string;
  isLoading: boolean;
  error: string | null;
}

const panelClass =
  "rounded-[22px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))] p-4 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)]";

const formatScore = (score: number | null) => {
  if (score === null || !Number.isFinite(score)) return "-";
  return Math.floor(score).toLocaleString("zh-TW");
};

const formatRank = (rank: number | null) => {
  if (rank === null || !Number.isFinite(rank)) return "-";
  return `#${rank}`;
};

const formatPlayTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const CareerShareTab: React.FC<CareerShareTabProps> = ({
  activeTemplate,
  setActiveTemplate,
  templates,
  preview,
  caption,
  isLoading,
  error,
}) => {
  return (
    <div className="h-full min-h-0 overflow-auto pr-1 xl:overflow-hidden xl:pr-0">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <section className={`${panelClass} min-h-0`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--mc-text)]">
                分享
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--mc-text-muted)]">
                先把模板、預覽、文案位置定住，之後再接實際輸出能力。
              </p>
            </div>

            <div className="inline-flex items-center rounded-full border border-emerald-300/26 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-emerald-100">
              SHARE V1
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {templates.map((template) => {
              const active = template.key === activeTemplate;
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => setActiveTemplate(template.key)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.08em] transition ${
                    active
                      ? "border-sky-300/40 bg-sky-300/12 text-sky-100"
                      : "border-[var(--mc-border)] bg-transparent text-[var(--mc-text-muted)] hover:border-sky-300/24 hover:bg-sky-300/8"
                  }`}
                >
                  {template.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-xs text-[var(--mc-text-muted)]">
            {templates.find((item) => item.key === activeTemplate)?.description}
          </div>

          <div className="mt-4 rounded-[24px] border border-sky-300/18 bg-[linear-gradient(135deg,rgba(11,24,49,0.98),rgba(6,12,24,0.98))] p-5">
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
                  {formatRank(preview.bestRank)}
                </div>
              </div>

              <div className="rounded-[16px] border border-sky-300/14 bg-white/5 p-3">
                <div className="text-[11px] tracking-[0.12em] text-slate-300">
                  最高分
                </div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {formatScore(preview.bestScore)}
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
              <span>總分 {formatScore(preview.totalScore)}</span>
              <span>{formatPlayTime(preview.playTimeSec)}</span>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 gap-4 xl:grid-rows-[auto_minmax(0,1fr)]">
          <section className={panelClass}>
            <div className="text-sm font-semibold tracking-[0.08em] text-[var(--mc-text)]">
              快速動作
            </div>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                className="rounded-[16px] border border-sky-300/30 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/16"
              >
                下載 PNG
              </button>

              <button
                type="button"
                className="rounded-[16px] border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/16"
              >
                複製分享文案
              </button>
            </div>
          </section>

          <section className={`${panelClass} min-h-0`}>
            <div className="text-sm font-semibold tracking-[0.08em] text-[var(--mc-text)]">
              分享文案
            </div>

            {isLoading ? (
              <div className="mt-4 rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)] p-4 text-sm text-[var(--mc-text-muted)]">
                載入分享內容中...
              </div>
            ) : error ? (
              <div className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-200">
                {error}
              </div>
            ) : (
              <div className="mt-4 h-[calc(100%-32px)] min-h-[220px] rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)] p-4 text-sm leading-6 text-[var(--mc-text-muted)] xl:min-h-0">
                {caption}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CareerShareTab;
