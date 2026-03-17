import React from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Button, Chip } from "@mui/material";

type LiveSettlementTab = "overview" | "recommend";

interface SettlementStageHeaderProps {
  isMobileView?: boolean;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  roomName: string;
  playlistTitle?: string | null;
  playedQuestionCount: number;
  participantsLength: number;
  elapsedLabel: string | null;
  settlementTimeChipLabel: string | null;
  activeTab: LiveSettlementTab;
  tabOrder: LiveSettlementTab[];
  tabLabels: Record<LiveSettlementTab, string>;
  tabHints: Record<LiveSettlementTab, string>;
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
  headingRef,
  roomName,
  playlistTitle,
  playedQuestionCount,
  participantsLength,
  elapsedLabel,
  settlementTimeChipLabel,
  activeTab,
  tabOrder,
  tabLabels,
  tabHints,
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
    `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${activeTab === tab
      ? "border-amber-300/60 bg-amber-300/15 text-amber-100"
      : "border-slate-500/60 bg-slate-900/60 text-slate-300"
    }`;

  return (
    <>
      <header className="game-settlement-stage-header flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            ref={headingRef}
            className={`${isMobileView ? "mt-0 scroll-mt-4" : "mt-3"} text-2xl font-black tracking-tight text-slate-100 sm:text-3xl`}
          >
            對戰結算
          </h2>
          <p className="mt-1 truncate text-sm text-slate-300">
            {roomName}
            {playlistTitle ? ` ・ ${playlistTitle}` : ""}
          </p>
        </div>
        {isMobileView ? (
          <div className="game-settlement-mobile-meta flex w-full flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-amber-400/14 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
              題數 {playedQuestionCount}
            </span>
            <span className="rounded-full bg-sky-400/14 px-2 py-0.5 text-[11px] font-semibold text-sky-100">
              玩家 {participantsLength}
            </span>
            {mobileMetaExpanded && elapsedLabel && (
              <span className="rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-100">
                局長 {elapsedLabel}
              </span>
            )}
            {mobileMetaExpanded && settlementTimeChipLabel && (
              <span className="rounded-full border border-slate-500/50 bg-slate-900/65 px-2.5 py-1 text-[10.5px] font-semibold text-slate-200">
                {settlementTimeChipLabel}
              </span>
            )}
            <button
              type="button"
              className="rounded-full border border-slate-500/70 bg-slate-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200 transition hover:border-slate-300/70"
              onClick={() => setMobileMetaExpanded((prev) => !prev)}
            >
              {mobileMetaExpanded ? "收合" : "更多"}
            </button>
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

      <nav className="game-settlement-stage-tab-nav flex flex-wrap items-center justify-between gap-2">
        <div className="game-settlement-stage-tab-list flex min-w-0 flex-wrap items-center gap-2">
          {tabOrder.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${activeTabButtonClass(tab)} game-settlement-stage-tab-btn`}
              onClick={() => onGoToTab(tab)}
              title={tabHints[tab]}
            >
              {tabLabels[tab]}
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
            className="game-settlement-desktop-action game-settlement-desktop-action--ghost"
            startIcon={<ArrowBackRoundedIcon fontSize="small" />}
          >
            上一步
          </Button>
          {hasNextStep ? (
            <Button
              variant="contained"
              color="warning"
              size="small"
              onClick={onGoNextStep}
              className="game-settlement-desktop-action game-settlement-desktop-action--next"
              endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
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
              className="game-settlement-desktop-action game-settlement-desktop-action--finish"
              endIcon={<CheckRoundedIcon fontSize="small" />}
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
              className="game-settlement-desktop-action game-settlement-desktop-action--exit"
              startIcon={<LogoutRoundedIcon fontSize="small" />}
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
