import React from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import { Button } from "@mui/material";
import RoomUiTooltip from "../../../../../shared/ui/RoomUiTooltip";

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

const MetaPill = ({
  icon,
  label,
  accentClass,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  accentClass: string;
  compact?: boolean;
}) => (
  <div
    className={`inline-flex items-center gap-2 rounded-full border border-white/6 bg-[linear-gradient(180deg,rgba(16,21,31,0.78),rgba(8,12,20,0.9))] pl-2 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_-20px_rgba(2,6,23,0.82)] backdrop-blur-sm ${compact ? "py-1" : "py-1.5"}`}
  >
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.04)] ${accentClass}`}>
      {icon}
    </span>
    <span className={`${compact ? "text-[10.5px]" : "text-[11px]"} font-semibold tracking-[0.03em] text-slate-100`}>{label}</span>
  </div>
);

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
            <MetaPill
              compact
              icon={<QuizRoundedIcon sx={{ fontSize: 14 }} />}
              label={`題數 ${playedQuestionCount}`}
              accentClass="bg-amber-400/16 text-amber-100"
            />
            <MetaPill
              compact
              icon={<Groups2RoundedIcon sx={{ fontSize: 14 }} />}
              label={`玩家 ${participantsLength}`}
              accentClass="bg-sky-400/16 text-sky-100"
            />
            {mobileMetaExpanded && elapsedLabel && (
              <MetaPill
                compact
                icon={<TimerRoundedIcon sx={{ fontSize: 14 }} />}
                label={`局長 ${elapsedLabel}`}
                accentClass="bg-emerald-400/16 text-emerald-100"
              />
            )}
            {mobileMetaExpanded && settlementTimeChipLabel && (
              <MetaPill
                compact
                icon={<EventRoundedIcon sx={{ fontSize: 14 }} />}
                label={settlementTimeChipLabel}
                accentClass="bg-violet-400/14 text-violet-100"
              />
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
            <MetaPill
              icon={<QuizRoundedIcon sx={{ fontSize: 15 }} />}
              label={`題數 ${playedQuestionCount}`}
              accentClass="bg-amber-400/16 text-amber-100"
            />
            <MetaPill
              icon={<Groups2RoundedIcon sx={{ fontSize: 15 }} />}
              label={`玩家 ${participantsLength}`}
              accentClass="bg-sky-400/16 text-sky-100"
            />
            {elapsedLabel && (
              <MetaPill
                icon={<TimerRoundedIcon sx={{ fontSize: 15 }} />}
                label={`局長 ${elapsedLabel}`}
                accentClass="bg-emerald-400/16 text-emerald-100"
              />
            )}
            {settlementTimeChipLabel && (
              <MetaPill
                icon={<EventRoundedIcon sx={{ fontSize: 15 }} />}
                label={settlementTimeChipLabel}
                accentClass="bg-violet-400/14 text-violet-100"
              />
            )}
          </div>
        )}
      </header>

      <nav className="game-settlement-stage-tab-nav flex flex-wrap items-center justify-between gap-2">
        <div className="game-settlement-stage-tab-list flex min-w-0 flex-wrap items-center gap-2">
          {tabOrder.map((tab) => (
            <RoomUiTooltip key={tab} title={tabHints[tab]}>
              <button
                type="button"
                className={`${activeTabButtonClass(tab)} game-settlement-stage-tab-btn`}
                onClick={() => onGoToTab(tab)}
              >
                {tabLabels[tab]}
              </button>
            </RoomUiTooltip>
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
