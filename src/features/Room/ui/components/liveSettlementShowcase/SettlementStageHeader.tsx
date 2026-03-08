import React from "react";
import { Button, Chip } from "@mui/material";

type LiveSettlementTab = "overview" | "recommend";

interface SettlementStageHeaderProps {
  isMobileView?: boolean;
  roomName: string;
  playlistTitle?: string | null;
  playedQuestionCount: number;
  participantsLength: number;
  elapsedLabel: string | null;
  settlementTimeChipLabel: string | null;
  stepIndex: number;
  totalSteps: number;
  activeTab: LiveSettlementTab;
  tabOrder: LiveSettlementTab[];
  tabLabels: Record<LiveSettlementTab, string>;
  tabHints: Record<LiveSettlementTab, string>;
  progressPercent: number;
  onGoToTab: (tab: LiveSettlementTab) => void;
  onGoPrevStep: () => void;
  onGoNextStep: () => void;
  onOpenExitConfirm?: () => void;
  canGoPrev: boolean;
  hasNextStep: boolean;
  canFinish: boolean;
}

const SettlementStageHeader: React.FC<SettlementStageHeaderProps> = ({
  isMobileView = false,
  roomName,
  playlistTitle,
  playedQuestionCount,
  participantsLength,
  elapsedLabel,
  settlementTimeChipLabel,
  stepIndex,
  totalSteps,
  activeTab,
  tabOrder,
  tabLabels,
  tabHints,
  progressPercent,
  onGoToTab,
  onGoPrevStep,
  onGoNextStep,
  onOpenExitConfirm,
  canGoPrev,
  hasNextStep,
  canFinish,
}) => {
  const [mobileMetaExpanded, setMobileMetaExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!isMobileView) {
      setMobileMetaExpanded(false);
    }
  }, [isMobileView]);

  const activeTabButtonClass = (tab: LiveSettlementTab) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
      activeTab === tab
        ? "border-amber-300/60 bg-amber-300/15 text-amber-100"
        : "border-slate-500/60 bg-slate-900/60 text-slate-300"
    }`;

  return (
    <>
      <header className="game-settlement-stage-header flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200">
            Match Settlement
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
            對戰結算
          </h2>
          <p className="mt-1 truncate text-sm text-slate-300">
            {roomName}
            {playlistTitle ? ` · ${playlistTitle}` : ""}
          </p>
        </div>
        {isMobileView ? (
          <div className="game-settlement-mobile-meta flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="rounded-full bg-amber-400/14 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
                題數 {playedQuestionCount}
              </span>
              <span className="rounded-full bg-sky-400/14 px-2 py-0.5 text-[11px] font-semibold text-sky-100">
                玩家 {participantsLength}
              </span>
              <button
                type="button"
                className="rounded-full border border-slate-500/70 bg-slate-900/60 px-2 py-0.5 text-[11px] font-semibold text-slate-200 transition hover:border-slate-300/70"
                onClick={() => setMobileMetaExpanded((prev) => !prev)}
              >
                {mobileMetaExpanded ? "收合" : "更多"}
              </button>
            </div>
            {mobileMetaExpanded && (
              <div className="w-full max-w-[300px] rounded-xl bg-slate-900/55 px-2.5 py-2 text-[11px] text-slate-200">
                {elapsedLabel && <p>局長 {elapsedLabel}</p>}
                {settlementTimeChipLabel && (
                  <p className="mt-0.5 text-slate-300">{settlementTimeChipLabel}</p>
                )}
                <p className="mt-1 text-slate-400">{tabHints[activeTab]}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              size="small"
              label={`題數 ${playedQuestionCount}`}
              variant="outlined"
              className="border-amber-300/40 text-amber-100"
            />
            <Chip
              size="small"
              label={`玩家 ${participantsLength}`}
              variant="outlined"
              className="border-sky-400/45 text-sky-100"
            />
            {elapsedLabel && (
              <Chip
                size="small"
                label={`局長 ${elapsedLabel}`}
                variant="outlined"
                className="border-emerald-300/45 text-emerald-100"
              />
            )}
            {settlementTimeChipLabel && (
              <Chip
                size="small"
                label={settlementTimeChipLabel}
                variant="outlined"
                className="border-slate-400/50 text-slate-200"
              />
            )}
          </div>
        )}
      </header>

      <div className="game-settlement-stage-progress rounded-2xl border border-slate-700/70 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              結算導覽
            </p>
            <p className="text-sm font-semibold text-slate-100">
              Step {stepIndex + 1}/{totalSteps} ·{" "}
              {isMobileView && !mobileMetaExpanded
                ? tabLabels[activeTab]
                : tabHints[activeTab]}
            </p>
          </div>
          <div className="text-xs font-semibold text-amber-100">
            {progressPercent}%
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300/90 via-amber-200 to-sky-300 transition-[width] duration-500"
            style={{ width: `${Math.max(8, progressPercent)}%` }}
          />
        </div>
      </div>

      <nav className="game-settlement-stage-tab-nav flex flex-wrap items-center justify-between gap-2">
        <div className="game-settlement-stage-tab-list flex min-w-0 flex-wrap items-center gap-2">
          {tabOrder.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`${activeTabButtonClass(tab)} game-settlement-stage-tab-btn`}
              onClick={() => onGoToTab(tab)}
              title={tabHints[tab]}
            >
              {index + 1}. {tabLabels[tab]}
            </button>
          ))}
        </div>
        <div className="hidden items-center justify-end gap-2 lg:flex">
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={onGoPrevStep}
            disabled={!canGoPrev}
          >
            上一步
          </Button>
          {hasNextStep ? (
            <Button
              variant="contained"
              color="warning"
              size="small"
              onClick={onGoNextStep}
            >
              下一步
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={onGoNextStep}
              disabled={!canFinish}
            >
              完成結算
            </Button>
          )}
          {onOpenExitConfirm && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={onOpenExitConfirm}
            >
              離開房間
            </Button>
          )}
        </div>
      </nav>
    </>
  );
};

export default SettlementStageHeader;
