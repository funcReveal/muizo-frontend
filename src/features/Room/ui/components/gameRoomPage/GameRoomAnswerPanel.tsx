import React from "react";
import { Button, Chip, LinearProgress } from "@mui/material";

import type { GameState, PlaylistItem } from "../../../model/types";
import { normalizeRoomDisplayText } from "../../../model/roomProviderUtils";
import type {
  ChoiceCommitFxState,
  MyFeedbackModel,
} from "./gameRoomPageTypes";

interface GameRoomAnswerPanelProps {
  isMobileView?: boolean;
  answerPanelRef: React.RefObject<HTMLDivElement | null>;
  isInitialCountdown: boolean;
  countdownTone: string;
  startCountdownSec: number;
  isReveal: boolean;
  revealTone: "neutral" | "locked" | "correct" | "wrong";
  isInterTrackWait: boolean;
  phaseLabel: string;
  phaseRemainingMs: number;
  gamePhase: GameState["phase"];
  isGuessUrgency: boolean;
  progressPct: number;
  choices: GameState["choices"];
  selectedChoice: number | null;
  correctChoiceIndex: number;
  isEnded: boolean;
  playlist: PlaylistItem[];
  choiceCommitFxState: ChoiceCommitFxState | null;
  trackSessionKey: string;
  hasActiveComboStreak: boolean;
  myComboTier: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  myComboNow: number;
  isComboBreakThisQuestion: boolean;
  myIsCorrect: boolean;
  myComboMilestone: boolean;
  comboBreakTier: 0 | 1 | 2 | 3 | 4;
  waitingToStart: boolean;
  shouldShowGestureOverlay: boolean;
  canAnswerNow: boolean;
  onSubmitChoice: (choiceIndex: number) => void;
  keyBindings: Record<number, string>;
  myHasChangedAnswer: boolean;
  myFeedback: MyFeedbackModel;
  gameStatus: GameState["status"];
  revealCountdownMs: number;
  resolvedAnswerTitle: string;
  onOpenExitConfirm: () => void;
  isPendingFeedbackCard: boolean;
  allAnsweredReadyForReveal: boolean;
  isRevealPendingServerSync: boolean;
  isRevealPendingOptimisticSync: boolean;
}

const GameRoomAnswerPanel: React.FC<GameRoomAnswerPanelProps> = ({
  isMobileView = false,
  answerPanelRef,
  isInitialCountdown,
  countdownTone,
  startCountdownSec,
  isReveal,
  revealTone,
  isInterTrackWait,
  phaseLabel,
  phaseRemainingMs,
  gamePhase,
  isGuessUrgency,
  progressPct,
  choices,
  selectedChoice,
  correctChoiceIndex,
  isEnded,
  playlist,
  choiceCommitFxState,
  trackSessionKey,
  hasActiveComboStreak,
  myComboTier,
  myComboNow,
  isComboBreakThisQuestion,
  myIsCorrect,
  myComboMilestone,
  comboBreakTier,
  waitingToStart,
  shouldShowGestureOverlay,
  canAnswerNow,
  onSubmitChoice,
  keyBindings,
  myHasChangedAnswer,
  myFeedback,
  gameStatus,
  revealCountdownMs,
  resolvedAnswerTitle,
  onOpenExitConfirm,
  isPendingFeedbackCard,
  allAnsweredReadyForReveal,
  isRevealPendingServerSync,
  isRevealPendingOptimisticSync,
}) => {
  const showGuessComboAtmosphere =
    !isReveal && hasActiveComboStreak && myComboTier > 0;
  const guessComboPanelClass = showGuessComboAtmosphere
    ? `game-room-panel--combo-live game-room-panel--combo-tier-${myComboTier}`
    : "";
  const guessComboLayoutClass = showGuessComboAtmosphere
    ? `game-room-answer-layout--combo-live game-room-answer-layout--combo-tier-${myComboTier}`
    : "";

  return (
    <div
      ref={answerPanelRef}
      className={`game-room-panel game-room-panel--warm game-room-panel--blaze ${guessComboPanelClass} ${
        isMobileView ? "game-room-answer-panel--mobile" : ""
      } flex min-h-0 flex-col p-3 text-slate-50 lg:flex-1`}
    >
      {isInitialCountdown ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
            即將開始
          </div>
          <div
            className={`mt-5 flex h-28 w-28 items-center justify-center rounded-full border ${countdownTone}`}
          >
            <span className="text-5xl font-black tracking-widest sm:text-6xl">
              {startCountdownSec}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">請準備，歌曲即將開始。</p>
        </div>
      ) : (
        <div
          className={`game-room-answer-layout ${
            isReveal
              ? "game-room-answer-layout--reveal"
              : "game-room-answer-layout--guess"
          } ${
            !isReveal && revealTone === "neutral"
              ? "game-room-answer-layout--neutral"
              : ""
          } ${guessComboLayoutClass} ${
            isMobileView ? "game-room-answer-layout--mobile" : ""
          }`}
        >
          <div className="game-room-answer-body">
            <div className="game-room-answer-head flex items-center gap-3">
              <div>
                <p className="game-room-kicker">階段</p>
                <p className="game-room-title">
                  {isInterTrackWait ? "下一題準備中" : phaseLabel}
                </p>
              </div>
              <Chip
                label={
                  isInterTrackWait
                    ? `${startCountdownSec}s`
                    : allAnsweredReadyForReveal
                      ? "READY"
                      : `${Math.ceil(phaseRemainingMs / 1000)}s`
                }
                size="small"
                color={
                  isInterTrackWait
                    ? "info"
                    : allAnsweredReadyForReveal
                      ? "success"
                    : gamePhase === "guess"
                      ? "warning"
                      : "success"
                }
                variant={allAnsweredReadyForReveal ? "filled" : "outlined"}
                className={`game-room-chip ${
                  isGuessUrgency ? "game-room-chip--urgent" : ""
                } ${allAnsweredReadyForReveal ? "game-room-chip--ready" : ""}`}
              />
            </div>

            <div
              className={`game-room-phase-progress ${isGuessUrgency ? "game-room-phase-progress--urgent" : ""}`}
            >
              <LinearProgress
                variant={isInterTrackWait ? "indeterminate" : "determinate"}
                value={
                  isInterTrackWait ? undefined : Math.min(100, Math.max(0, progressPct))
                }
                color={
                  isInterTrackWait
                    ? "info"
                    : gamePhase === "guess"
                      ? "warning"
                      : "success"
                }
                className="game-room-phase-progress-bar"
              />
            </div>
            {isRevealPendingServerSync && (
              <div className="mt-2 rounded-lg border border-emerald-300/45 bg-emerald-500/14 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                正在等待全員同步，答案即將公布...
              </div>
            )}
            {!isRevealPendingServerSync && isRevealPendingOptimisticSync && (
              <div className="mt-2 rounded-lg border border-sky-300/40 bg-sky-500/14 px-3 py-1.5 text-xs font-semibold text-sky-100">
                已收到最後作答，正在整理揭曉資訊...
              </div>
            )}
            <div
              className={`game-room-options-grid game-room-options-grid--blaze grid grid-cols-1 gap-2 md:grid-cols-2 ${
                isMobileView ? "game-room-options-grid--mobile" : ""
              }`}
            >
              {isInterTrackWait
                ? Array.from(
                    {
                      length: Math.max(4, choices.length),
                    },
                    (_, idx) => (
                      <Button
                        key={`placeholder-${idx}`}
                        fullWidth
                        size="large"
                        disabled
                        variant="outlined"
                        className="game-room-choice-button game-room-choice-placeholder justify-start"
                      >
                        <div className="game-room-choice-content flex w-full items-start justify-between gap-2">
                          <span className="game-room-choice-title text-slate-500">下一題準備中</span>
                          <span className="game-room-choice-key ml-3 inline-flex h-6 w-6 flex-none items-center justify-center rounded border border-slate-800 text-[11px] font-semibold text-slate-500">
                            --
                          </span>
                        </div>
                      </Button>
                    ),
                  )
                : choices.map((choice, idx) => {
                    const isSelected = selectedChoice === choice.index;
                    const isCorrect = choice.index === correctChoiceIndex;
                    const isLocked = isReveal || isEnded;
                    const choiceDisplayTitle = normalizeRoomDisplayText(
                      choice.title?.trim() ||
                        playlist[choice.index]?.answerText?.trim() ||
                        playlist[choice.index]?.title?.trim(),
                      "未命名選項",
                    );
                    const isMyChoice = selectedChoice === choice.index;
                    const showCorrectTag = isReveal && isCorrect;
                    const showMyChoiceTag = isReveal && isMyChoice;
                    const showMyCorrectTag = isReveal && isMyChoice && isCorrect;
                    const choiceCommitFxKind =
                      choiceCommitFxState &&
                      choiceCommitFxState.trackSessionKey === trackSessionKey &&
                      choiceCommitFxState.choiceIndex === choice.index
                        ? choiceCommitFxState.kind
                        : null;
                    const showGuessLockTag = !isReveal && isMyChoice;
                    const showComboLiveStyle =
                      !isReveal && isMyChoice && hasActiveComboStreak;
                    const showComboOverdriveStyle =
                      showComboLiveStyle && myComboTier >= 10 && myComboNow >= 10;
                    const showComboBreakStyle =
                      isReveal && isMyChoice && isComboBreakThisQuestion;
                    const showComboMilestoneStyle =
                      isReveal &&
                      isMyChoice &&
                      myIsCorrect &&
                      myComboTier > 0 &&
                      myComboMilestone;
                    const comboLiveTierClass =
                      showComboLiveStyle && myComboTier > 0
                        ? `game-room-choice-button--combo-live-tier-${myComboTier}`
                        : "";
                    const comboBreakTierClass =
                      showComboBreakStyle && comboBreakTier > 0
                        ? `game-room-choice-button--combo-break-tier-${comboBreakTier}`
                        : "";
                    const comboMilestoneTierClass = showComboMilestoneStyle
                      ? `game-room-choice-button--combo-milestone-tier-${myComboTier}`
                      : "";

                    return (
                      <Button
                        key={`${choice.index}-${idx}`}
                        fullWidth
                        size="large"
                        disableRipple
                        aria-disabled={isLocked || waitingToStart || shouldShowGestureOverlay}
                        tabIndex={
                          isLocked || waitingToStart || shouldShowGestureOverlay ? -1 : 0
                        }
                        variant={
                          isReveal
                            ? isCorrect || isSelected
                              ? "contained"
                              : "outlined"
                            : isSelected
                              ? "contained"
                              : "outlined"
                        }
                        color={
                          isReveal
                            ? isCorrect
                              ? "success"
                              : isSelected
                                ? "error"
                                : "info"
                            : isSelected
                              ? "info"
                              : "info"
                        }
                        className={`game-room-choice-button justify-start ${
                          choiceCommitFxKind === "lock"
                            ? "game-room-choice-button--commit-lock"
                            : choiceCommitFxKind === "reselect"
                              ? "game-room-choice-button--commit-reselect"
                              : ""
                        } ${
                          choiceCommitFxKind
                            ? "game-room-choice-button--commit-burst"
                            : ""
                        } ${
                          choiceCommitFxKind
                            ? "game-room-choice-button--press-hit"
                            : ""
                        } ${
                          !isReveal && isSelected
                            ? "game-room-choice-button--selected-live"
                            : ""
                        } ${
                          showComboLiveStyle
                            ? "game-room-choice-button--combo-live"
                            : ""
                        } ${comboLiveTierClass} ${
                          showComboOverdriveStyle
                            ? "game-room-choice-button--combo-overdrive"
                            : ""
                        } ${
                          showComboBreakStyle
                            ? "game-room-choice-button--combo-break"
                            : ""
                        } ${comboBreakTierClass} ${
                          showComboMilestoneStyle
                            ? "game-room-choice-button--combo-milestone"
                            : ""
                        } ${comboMilestoneTierClass} ${
                          isLocked || waitingToStart || shouldShowGestureOverlay
                            ? "pointer-events-none"
                            : ""
                        } ${isMobileView ? "game-room-choice-button--mobile" : ""}`}
                        disabled={false}
                        onClick={() => {
                          if (isLocked || !canAnswerNow) return;
                          onSubmitChoice(choice.index);
                        }}
                      >
                        {choiceCommitFxKind && (
                          <span aria-hidden="true" className="game-room-choice-press-flash" />
                        )}
                        {choiceCommitFxKind && (
                          <span
                            aria-hidden="true"
                            className={`game-room-choice-burst game-room-choice-burst--${choiceCommitFxKind}`}
                          />
                        )}
                        {choiceCommitFxKind && (
                          <span
                            aria-hidden="true"
                            className={`game-room-choice-particle-burst game-room-choice-particle-burst--${choiceCommitFxKind}`}
                          />
                        )}
                        {showComboMilestoneStyle && (
                          <span
                            aria-hidden="true"
                            className={`game-room-choice-burst game-room-choice-burst--combo-milestone game-room-choice-burst--combo-tier-${myComboTier}`}
                          />
                        )}
                        {showComboMilestoneStyle && (
                          <span
                            aria-hidden="true"
                            className={`game-room-choice-particle-burst game-room-choice-particle-burst--combo-tier-${myComboTier}`}
                          />
                        )}
                        {showComboBreakStyle && (
                          <span
                            aria-hidden="true"
                            className={`game-room-choice-particle-burst game-room-choice-particle-burst--combo-break game-room-choice-particle-burst--combo-break-tier-${comboBreakTier}`}
                          />
                        )}
                        {showComboLiveStyle && (
                          <span
                            aria-hidden="true"
                            className={`game-room-choice-combo-aura game-room-choice-combo-aura--tier-${myComboTier} ${
                              showComboOverdriveStyle
                                ? "game-room-choice-combo-aura--overdrive"
                                : ""
                            }`}
                          />
                        )}
                        <div className="game-room-choice-content flex w-full items-start justify-between gap-2">
                          <span className="game-room-choice-title" title={choiceDisplayTitle}>
                            {choiceDisplayTitle}
                          </span>
                          <span className="game-room-choice-meta ml-3 inline-flex items-center gap-1">
                            {showGuessLockTag && (
                              <span
                                className={`game-room-choice-tag ${
                                  myHasChangedAnswer
                                    ? "game-room-choice-tag--reselect"
                                    : "game-room-choice-tag--lock"
                                }`}
                              >
                                {myHasChangedAnswer ? "改答已鎖" : "已鎖定"}
                              </span>
                            )}
                            {isMyChoice && myComboTier > 0 && (
                              <span
                                className={`game-room-choice-tag game-room-choice-tag--combo game-room-choice-tag--combo-tier-${myComboTier}`}
                                title={`Combo x${myComboNow}`}
                              >
                                Combo x{myComboNow}
                              </span>
                            )}
                            {showCorrectTag && (
                              <span className="game-room-choice-tag game-room-choice-tag--correct">
                                正解
                              </span>
                            )}
                            {showMyChoiceTag && (
                              <span
                                className={`game-room-choice-tag ${
                                  showMyCorrectTag
                                    ? "game-room-choice-tag--you-correct"
                                    : "game-room-choice-tag--you"
                                }`}
                              >
                                {showMyCorrectTag ? "你答對" : "你作答"}
                              </span>
                            )}
                            <span className="game-room-choice-key inline-flex h-6 w-6 flex-none items-center justify-center rounded border border-slate-700 bg-slate-800 text-[11px] font-semibold text-slate-200">
                              {(keyBindings[idx] ?? "").toUpperCase()}
                            </span>
                          </span>
                        </div>
                      </Button>
                    );
                  })}
            </div>
          </div>

          <div className="game-room-reveal">
            <div
              className={`game-room-reveal-card rounded-lg border game-room-reveal-card--${revealTone} ${
                isReveal ? "game-room-reveal-card--result game-room-reveal-card--result-burst" : ""
              } ${isPendingFeedbackCard ? "game-room-reveal-card--pending" : ""} ${
                isComboBreakThisQuestion && comboBreakTier > 0
                  ? `game-room-reveal-card--combo-break game-room-reveal-card--combo-break-tier-${comboBreakTier}`
                  : ""
              }`}
            >
              <div
                className={`game-room-feedback-head ${
                  isReveal ? "game-room-feedback-head--reveal" : ""
                }`}
              >
                <p className="game-room-feedback-title">{myFeedback.title}</p>
                {isReveal && myFeedback.inlineMeta && (
                  <span
                    className={`game-room-feedback-inline-meta game-room-feedback-inline-meta--${revealTone}`}
                    title={myFeedback.inlineMeta}
                  >
                    {myFeedback.inlineMeta}
                  </span>
                )}
                {isReveal && (
                  <span
                    className={`game-room-feedback-pill game-room-feedback-pill--${revealTone} ${
                      myFeedback.pillText ?? myFeedback.detail
                        ? ""
                        : "game-room-feedback-pill--placeholder"
                    }`}
                    title={myFeedback.pillText ?? myFeedback.detail ?? ""}
                  >
                    {(myFeedback.pillText ?? myFeedback.detail) || "等待揭曉"}
                  </span>
                )}
              </div>
              {!isReveal && (!Array.isArray(myFeedback.lines) || myFeedback.lines.length === 0) ? (
                myFeedback.detail && <p className="game-room-feedback-detail">{myFeedback.detail}</p>
              ) : !isReveal && (
                <div className={`game-room-feedback-lines ${isReveal ? "mt-1" : "mt-1.5"}`}>
                  {(Array.isArray(myFeedback.lines) ? myFeedback.lines : [])
                    .slice(0, 2)
                    .map((line, idx) => (
                      <p
                        key={`${trackSessionKey}-feedback-line-${idx}`}
                        className="game-room-feedback-line"
                        title={line}
                      >
                        {line}
                      </p>
                    ))}
                </div>
              )}
              {!isReveal &&
                (!Array.isArray(myFeedback.lines) || myFeedback.lines.length === 0) &&
                myFeedback.badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {myFeedback.badges.map((badge) => (
                    <span
                      key={`${trackSessionKey}-${badge}`}
                      className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/35 px-2 py-0.5 text-[10px] font-semibold text-slate-200"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              {isReveal && (
                <>
                  <p
                    className="game-room-reveal-answer mt-1 text-sm text-emerald-50"
                    title={resolvedAnswerTitle}
                  >
                    <span className="mr-1 text-[11px] font-semibold text-emerald-200">正解</span>
                    {resolvedAnswerTitle}
                  </p>
                  {gameStatus === "playing" ? (
                    <p className="mt-1 text-xs text-emerald-200">
                      {Math.ceil(revealCountdownMs / 1000)} 秒後下一題
                    </p>
                  ) : (
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-emerald-200">
                        對戰已結束，可返回房間或直接離開遊戲。
                      </p>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={onOpenExitConfirm}
                      >
                        離開遊戲
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoomAnswerPanel;
