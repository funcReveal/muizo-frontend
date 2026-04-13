import React from "react";
import { Button, Chip, LinearProgress } from "@mui/material";

import RevealChoiceAvatarRow from "./RevealChoiceAvatarRow";
import type { GameState, PlaylistItem } from "../../../Room/model/types";
import { normalizeRoomDisplayText } from "../../../../shared/utils/text";
import type {
  MyFeedbackModel,
  RevealChoicePickMap,
} from "../../model/gameRoomTypes";

interface GameRoomAnswerPanelProps {
  isMobileView?: boolean;
  answerPanelRef: React.RefObject<HTMLDivElement | null>;
  isInitialCountdown: boolean;
  countdownTone: string;
  isReveal: boolean;
  revealTone: "neutral" | "locked" | "correct" | "wrong";
  isInterTrackWait: boolean;
  phaseLabel: string;
  activePhaseDurationMs: number;
  phaseEndsAt: number;
  gamePhase: GameState["phase"];
  startedAt: number;
  choices: GameState["choices"];
  selectedChoice: number | null;
  correctChoiceIndex: number;
  isEnded: boolean;
  playlist: PlaylistItem[];
  trackSessionKey: string;
  myComboTier: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  myComboNow: number;
  isComboBreakThisQuestion: boolean;
  comboBreakTier: 0 | 1 | 2 | 3 | 4;
  waitingToStart: boolean;
  shouldShowGestureOverlay: boolean;
  canAnswerNow: boolean;
  onSubmitChoice: (choiceIndex: number) => void;
  keyBindings: Record<number, string>;
  myHasChangedAnswer: boolean;
  myFeedback: MyFeedbackModel;
  gameStatus: GameState["status"];
  revealEndsAt: number;
  resolvedAnswerTitle: string;
  onOpenExitConfirm: () => void;
  isPendingFeedbackCard: boolean;
  allAnsweredReadyForReveal: boolean;
  isRevealPendingServerSync: boolean;
  isRevealPendingOptimisticSync: boolean;
  revealChoicePickMap: RevealChoicePickMap;
  serverOffsetMs: number;
  mobileHeaderAction?: React.ReactNode;
  liveParticipantCount: number;
  liveAnsweredCount: number;
  liveCorrectCount: number | null;
  liveWrongCount: number | null;
  liveUnansweredCount: number | null;
  /** True while the socket is disconnected and resumeSession is in-flight.
   *  Suppresses the normal countdown / progress bar and shows a reconnecting
   *  indicator so players don't think the game is stuck at 0 seconds. */
  isRecoveringConnection?: boolean;
  /** Human-readable text describing the current recovery stage. */
  recoveryStatusText?: string | null;
}

type InlineStatusSegmentTone =
  | "neutral"
  | "muted"
  | "correct"
  | "wrong"
  | "answer"
  | "score"
  | "accent";

interface InlineStatusSegment {
  text: string;
  tone: InlineStatusSegmentTone;
}

const resolveInlineStatusTone = (text: string): InlineStatusSegmentTone => {
  if (/^[+-]\d+/.test(text) || text.startsWith("分數")) return "score";
  if (text.startsWith("答對")) return "correct";
  if (text.startsWith("答錯")) return "wrong";
  if (text.startsWith("未作答") || text.startsWith("待答")) return "muted";
  if (text.startsWith("正解")) return "answer";
  if (text.startsWith("全場答對率") || text.startsWith("第")) return "accent";
  return "neutral";
};

const splitInlineStatusSegments = (
  text: string,
  options?: { omitAnswered?: boolean },
): InlineStatusSegment[] =>
  text
    .split("·")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) =>
      options?.omitAnswered ? !segment.startsWith("已答 ") : true,
    )
    .map((segment) => ({
      text: segment,
      tone: resolveInlineStatusTone(segment),
    }));

const GameRoomStartCountdownDisplay = React.memo(function GameRoomStartCountdownDisplay({
  startedAt,
  countdownTone,
  getLocalNowMs,
}: {
  startedAt: number;
  countdownTone: string;
  getLocalNowMs: () => number;
}) {
  const [countdownSec, setCountdownSec] = React.useState(() =>
    Math.max(1, Math.ceil(Math.max(0, startedAt - getLocalNowMs()) / 1000)),
  );

  React.useEffect(() => {
    let timerId: number | null = null;
    const tick = () => {
      const remainingMs = Math.max(0, startedAt - getLocalNowMs());
      const nextCountdownSec = Math.max(1, Math.ceil(remainingMs / 1000));
      setCountdownSec((current) =>
        current === nextCountdownSec ? current : nextCountdownSec,
      );
      timerId = window.setTimeout(tick, remainingMs <= 4200 ? 125 : 1000);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [getLocalNowMs, startedAt]);

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
        即將開始
      </div>
      <div
        className={`mt-5 flex h-28 w-28 items-center justify-center rounded-full border ${countdownTone}`}
      >
        <span className="text-5xl font-black tracking-widest sm:text-6xl">
          {countdownSec}
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-400">請準備，歌曲即將開始。</p>
    </div>
  );
});

const GameRoomPhaseStatusChip = React.memo(function GameRoomPhaseStatusChip({
  isInterTrackWait,
  allAnsweredReadyForReveal,
  gamePhase,
  startedAt,
  phaseEndsAt,
  getLocalNowMs,
  isGuessUrgency,
  urgentChipPingActive,
}: {
  isInterTrackWait: boolean;
  allAnsweredReadyForReveal: boolean;
  gamePhase: GameState["phase"];
  startedAt: number;
  phaseEndsAt: number;
  getLocalNowMs: () => number;
  isGuessUrgency: boolean;
  urgentChipPingActive: boolean;
}) {
  const resolveLabel = React.useCallback(() => {
    const now = getLocalNowMs();
    if (isInterTrackWait) {
      return `${Math.max(1, Math.ceil(Math.max(0, startedAt - now) / 1000))}s`;
    }
    if (allAnsweredReadyForReveal) return "READY";
    return `${Math.ceil(Math.max(0, phaseEndsAt - now) / 1000)}s`;
  }, [
    allAnsweredReadyForReveal,
    getLocalNowMs,
    isInterTrackWait,
    phaseEndsAt,
    startedAt,
  ]);
  const [label, setLabel] = React.useState(resolveLabel);
  const isNumericCountdownLabel = /^\d+s$/.test(label);

  React.useEffect(() => {
    if (allAnsweredReadyForReveal) {
      setLabel("READY");
      return;
    }
    let timerId: number | null = null;
    const tick = () => {
      if (document.visibilityState !== "visible") {
        timerId = window.setTimeout(tick, 1000);
        return;
      }
      setLabel(resolveLabel());
      const now = getLocalNowMs();
      const remainingMs = isInterTrackWait
        ? Math.max(0, startedAt - now)
        : Math.max(0, phaseEndsAt - now);
      const nextDelay =
        !isInterTrackWait &&
        gamePhase === "guess" &&
        remainingMs > 0 &&
        remainingMs <= 4500
          ? 125
          : 1000;
      timerId = window.setTimeout(tick, nextDelay);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [
    allAnsweredReadyForReveal,
    gamePhase,
    getLocalNowMs,
    isInterTrackWait,
    phaseEndsAt,
    resolveLabel,
    startedAt,
  ]);

  return (
    <Chip
      label={
        <span
          className={`game-room-phase-chip-label ${
            isNumericCountdownLabel ? "game-room-phase-chip-label--countdown" : ""
          }`}
        >
          {label}
        </span>
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
      className={`game-room-chip ${isNumericCountdownLabel ? "game-room-chip--countdown" : ""} ${isGuessUrgency ? "game-room-chip--urgent" : ""} ${urgentChipPingActive ? "game-room-chip--urgent-ping" : ""} ${allAnsweredReadyForReveal ? "game-room-chip--ready" : ""}`}
    />
  );
});

const GameRoomRevealCountdownText = React.memo(function GameRoomRevealCountdownText({
  revealEndsAt,
  getLocalNowMs,
}: {
  revealEndsAt: number;
  getLocalNowMs: () => number;
}) {
  const [countdownSec, setCountdownSec] = React.useState(() =>
    Math.max(0, Math.ceil(Math.max(0, revealEndsAt - getLocalNowMs()) / 1000)),
  );

  React.useEffect(() => {
    let timerId: number | null = null;
    const tick = () => {
      if (document.visibilityState === "visible") {
        const nextCountdownSec = Math.max(
          0,
          Math.ceil(Math.max(0, revealEndsAt - getLocalNowMs()) / 1000),
        );
        setCountdownSec((current) =>
          current === nextCountdownSec ? current : nextCountdownSec,
        );
      }
      timerId = window.setTimeout(tick, 250);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [getLocalNowMs, revealEndsAt]);

  return <p className="mt-1 text-xs text-emerald-200">{countdownSec} 秒後下一題</p>;
});

const GameRoomAnswerPanel: React.FC<GameRoomAnswerPanelProps> = ({
  isMobileView = false,
  answerPanelRef,
  isInitialCountdown,
  countdownTone,
  isReveal,
  revealTone,
  isInterTrackWait,
  phaseLabel,
  activePhaseDurationMs,
  phaseEndsAt,
  gamePhase,
  startedAt,
  choices,
  selectedChoice,
  correctChoiceIndex,
  isEnded,
  playlist,
  trackSessionKey,
  myComboTier,
  myComboNow,
  isComboBreakThisQuestion,
  comboBreakTier,
  waitingToStart,
  shouldShowGestureOverlay,
  canAnswerNow,
  onSubmitChoice,
  keyBindings,
  myHasChangedAnswer,
  myFeedback,
  gameStatus,
  revealEndsAt,
  resolvedAnswerTitle,
  onOpenExitConfirm,
  isPendingFeedbackCard,
  allAnsweredReadyForReveal,
  revealChoicePickMap,
  serverOffsetMs,
  mobileHeaderAction,
  liveParticipantCount,
  liveAnsweredCount,
  liveCorrectCount,
  liveWrongCount,
  liveUnansweredCount,
  isRecoveringConnection = false,
  recoveryStatusText = null,
}) => {
  const getLocalNowMs = React.useCallback(
    () => Date.now() + serverOffsetMs,
    [serverOffsetMs],
  );
  const [isGuessUrgency, setIsGuessUrgency] = React.useState(() => {
    if (
      gamePhase !== "guess" ||
      isInterTrackWait ||
      isReveal ||
      isEnded ||
      allAnsweredReadyForReveal
    ) {
      return false;
    }
    const remainingMs = Math.max(0, phaseEndsAt - getLocalNowMs());
    return remainingMs > 0 && remainingMs <= 3000;
  });
  const [urgentChipPingActive, setUrgentChipPingActive] = React.useState(false);
  const progressBarFillRef = React.useRef<HTMLDivElement>(null);
  const shouldHideDesktopRevealCard = !isMobileView;
  const shouldShowInlinePhaseStatus = !isInitialCountdown;
  const desktopStatusLabel = isReveal
    ? myFeedback.tone === "correct"
      ? "答對"
      : myFeedback.tone === "wrong"
        ? "答錯"
        : "未作答"
    : myFeedback.tone === "locked"
      ? "已作答"
      : "待答";
  const desktopStatusPrimary = isReveal
    ? ""
    : myFeedback.lines?.[0]?.trim() || myFeedback.detail?.trim() || "";
  const desktopStatusSecondary = isReveal
    ? myFeedback.inlineMeta?.trim() || ""
    : myFeedback.lines?.[1]?.trim() ||
      myFeedback.badges?.[0]?.trim() ||
      "";
  const inlineAnsweredText =
    liveParticipantCount > 0
      ? `已答 ${liveAnsweredCount}/${liveParticipantCount} 人`
      : "";
  const inlineMetaSegments = React.useMemo(() => {
    if (!desktopStatusSecondary) return [];
    if (!isReveal && desktopStatusSecondary === inlineAnsweredText) return [];
    return splitInlineStatusSegments(desktopStatusSecondary, {
      omitAnswered: true,
    });
  }, [desktopStatusSecondary, inlineAnsweredText, isReveal]);
  const inlineBreakdownSegments = React.useMemo(() => {
    if (
      liveParticipantCount <= 0 ||
      liveCorrectCount === null ||
      liveWrongCount === null ||
      liveUnansweredCount === null
    ) {
      return [];
    }
    return [
      { text: `答對 ${liveCorrectCount}`, tone: "correct" as const },
      { text: `答錯 ${liveWrongCount}`, tone: "wrong" as const },
      { text: `未作答 ${liveUnansweredCount}`, tone: "muted" as const },
    ];
  }, [
    liveCorrectCount,
    liveParticipantCount,
    liveUnansweredCount,
    liveWrongCount,
  ]);

  React.useLayoutEffect(() => {
    const fill = progressBarFillRef.current;
    if (!fill) return;

    // During reconnection the server clock is unreliable and we don't want
    // the bar to animate (it would race to 0 and look like the game froze).
    // Hide the custom bar entirely — the recovery overlay takes over.
    if (isRecoveringConnection) {
      fill.style.transition = "none";
      fill.style.transform = "scaleX(0)";
      return;
    }

    if (isInitialCountdown || isInterTrackWait || activePhaseDurationMs <= 0) {
      fill.style.transition = "none";
      fill.style.transform = "scaleX(0)";
      return;
    }

    const remainingMs = Math.max(0, phaseEndsAt - getLocalNowMs());
    const remainingFraction = Math.max(
      0,
      Math.min(1, remainingMs / Math.max(1, activePhaseDurationMs)),
    );

    fill.style.transition = "none";
    fill.style.transform = `scaleX(${remainingFraction})`;
    void fill.offsetWidth;

    if (allAnsweredReadyForReveal) {
      fill.style.transition = "transform 220ms ease-out";
      fill.style.transform = "scaleX(0)";
      return;
    }

    if (remainingMs > 0) {
      fill.style.transition = `transform ${remainingMs}ms linear`;
      fill.style.transform = "scaleX(0)";
    }
  }, [
    activePhaseDurationMs,
    allAnsweredReadyForReveal,
    getLocalNowMs,
    isInitialCountdown,
    isInterTrackWait,
    isRecoveringConnection,
    phaseEndsAt,
    trackSessionKey,
  ]);

  React.useEffect(() => {
    if (
      gamePhase !== "guess" ||
      isInterTrackWait ||
      isReveal ||
      isEnded ||
      allAnsweredReadyForReveal
    ) {
      setIsGuessUrgency(false);
      return;
    }
    const now = getLocalNowMs();
    const remainingMs = Math.max(0, phaseEndsAt - now);
    const nextUrgency = remainingMs > 0 && remainingMs <= 3000;
    setIsGuessUrgency(nextUrgency);
    let timerId: number | null = null;
    if (remainingMs > 3000) {
      timerId = window.setTimeout(() => {
        setIsGuessUrgency(true);
      }, remainingMs - 3000);
    } else if (remainingMs > 0) {
      timerId = window.setTimeout(() => {
        setIsGuessUrgency(false);
      }, remainingMs);
    }
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [
    allAnsweredReadyForReveal,
    gamePhase,
    getLocalNowMs,
    isEnded,
    isInterTrackWait,
    isReveal,
    phaseEndsAt,
    trackSessionKey,
  ]);

  React.useEffect(() => {
    if (!isGuessUrgency) {
      setUrgentChipPingActive(false);
      return;
    }
    setUrgentChipPingActive(true);
    const timer = window.setTimeout(() => {
      setUrgentChipPingActive(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [isGuessUrgency, trackSessionKey]);

  const handleChoiceClick = React.useCallback(
    (choiceIndex: number) => {
      if (isReveal || isEnded || !canAnswerNow || isRecoveringConnection) return;
      onSubmitChoice(choiceIndex);
    },
    [canAnswerNow, isEnded, isRecoveringConnection, isReveal, onSubmitChoice],
  );

  return (
    <div
      ref={answerPanelRef}
      className={`game-room-panel game-room-panel--warm game-room-panel--blaze ${isMobileView ? "game-room-answer-panel--mobile" : ""
        } ${!isMobileView ? "game-room-answer-panel--desktop" : ""} flex min-h-0 flex-col p-3 text-slate-50 lg:flex-1`}
    >
      {isInitialCountdown && !isRecoveringConnection ? (
        <GameRoomStartCountdownDisplay
          startedAt={startedAt}
          countdownTone={countdownTone}
          getLocalNowMs={getLocalNowMs}
        />
      ) : (
        <div
          className={`game-room-answer-layout ${isReveal
            ? "game-room-answer-layout--reveal"
            : "game-room-answer-layout--guess"
            } ${!isReveal && revealTone === "neutral"
              ? "game-room-answer-layout--neutral"
              : ""
            } ${!isMobileView
              ? "game-room-answer-layout--desktop-status-inline"
              : ""
            } ${isMobileView ? "game-room-answer-layout--mobile" : ""
            }`}
        >
          <div className="game-room-answer-body">
            <div className="game-room-answer-head flex items-center gap-3">
              <div className="game-room-answer-head__main min-w-0 flex-1">
                {isRecoveringConnection ? (
                  /* ── Recovery chip: replaces the normal countdown chip ──── */
                  <Chip
                    label={
                      <span className="game-room-phase-chip-label">
                        重新連線中
                      </span>
                    }
                    size="small"
                    color="default"
                    variant="outlined"
                    className="game-room-chip"
                  />
                ) : (
                  <GameRoomPhaseStatusChip
                    isInterTrackWait={isInterTrackWait}
                    allAnsweredReadyForReveal={allAnsweredReadyForReveal}
                    gamePhase={gamePhase}
                    startedAt={startedAt}
                    phaseEndsAt={phaseEndsAt}
                    getLocalNowMs={getLocalNowMs}
                    isGuessUrgency={isGuessUrgency}
                    urgentChipPingActive={urgentChipPingActive}
                  />
                )}
                <p className="game-room-title">
                  {isRecoveringConnection
                    ? (recoveryStatusText ?? "正在恢復房間狀態...")
                    : isInterTrackWait
                      ? "下一題準備中"
                      : phaseLabel}
                </p>
                {shouldShowInlinePhaseStatus && !isMobileView && !isRecoveringConnection ? (
                  <div className="game-room-guess-inline-status">
                    <span
                      className={`game-room-guess-status-pill game-room-guess-status-pill--${myFeedback.tone}`}
                    >
                      {desktopStatusLabel}
                    </span>
                    {desktopStatusPrimary ? (
                      <span
                        className={`game-room-guess-status-text ${isReveal ? "game-room-guess-status-text--answer" : ""}`}
                      >
                        {desktopStatusPrimary}
                      </span>
                    ) : null}
                    {inlineAnsweredText ? (
                      <span className="game-room-guess-status-text game-room-guess-status-text--answered">
                        {inlineAnsweredText}
                      </span>
                    ) : null}
                    {inlineMetaSegments.map((segment) => (
                      <span
                        key={`meta-${segment.text}`}
                        className={`game-room-guess-status-text game-room-guess-status-text--${segment.tone}`}
                      >
                        {segment.text}
                      </span>
                    ))}
                    {inlineBreakdownSegments.map((segment) => (
                      <span
                        key={`breakdown-${segment.text}`}
                        className={`game-room-guess-status-text game-room-guess-status-text--${segment.tone}`}
                      >
                        {segment.text}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {isMobileView && mobileHeaderAction ? (
                <div className="game-room-answer-head__action">
                  {mobileHeaderAction}
                </div>
              ) : null}
            </div>

            <div
              className={`game-room-phase-progress ${isGuessUrgency && !isRecoveringConnection ? "game-room-phase-progress--urgent" : ""}`}
            >
              {/* Recovery: indeterminate bar shows the system is working */}
              {isRecoveringConnection ? (
                <LinearProgress
                  variant="indeterminate"
                  color="inherit"
                  className="game-room-phase-progress-bar"
                  sx={{ opacity: 0.45 }}
                />
              ) : isInterTrackWait ? (
                <LinearProgress
                  variant="indeterminate"
                  color="info"
                  className="game-room-phase-progress-bar"
                />
              ) : (
                <div className="game-room-phase-progress-bar">
                  <div
                    ref={progressBarFillRef}
                    className={`game-room-phase-progress-bar-fill ${gamePhase === "guess" ? "game-room-phase-progress-bar-fill--guess" : "game-room-phase-progress-bar-fill--reveal"}`}
                  />
                </div>
              )}
            </div>
            <div
              className={`game-room-options-grid game-room-options-grid--blaze grid grid-cols-1 gap-3 md:grid-cols-2 ${isMobileView ? "game-room-options-grid--mobile" : ""
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
                  const revealPicks = revealChoicePickMap[choice.index] ?? [];
                  const hasRevealPicks = isReveal && revealPicks.length > 0;
                  const isMyChoice = selectedChoice === choice.index;
                  const showCorrectTag = isReveal && isCorrect;
                  const showMyChoiceTag = isReveal && isMyChoice;
                  const showMyCorrectTag = isReveal && isMyChoice && isCorrect;
                  const showGuessLockTag = !isReveal && isMyChoice;
                  const hasChoiceStatusTag =
                    showGuessLockTag ||
                    (isMyChoice && myComboTier > 0) ||
                    showCorrectTag ||
                    showMyChoiceTag;
                  const showComboFocusStyle =
                    !isReveal && isMyChoice && myComboTier > 0 && myComboNow > 0;
                  const comboFocusTierClass = showComboFocusStyle
                    ? `game-room-choice-button--combo-focus-tier-${myComboTier}`
                    : "";
                  const comboLiveTierClass = showComboFocusStyle
                    ? `game-room-choice-button--combo-live-tier-${Math.min(
                      10,
                      Math.max(1, myComboTier),
                    )}`
                    : "";

                  return (
                    <div
                      key={`${choice.index}`}
                      className={`game-room-choice-shell ${hasRevealPicks ? "game-room-choice-shell--with-avatars" : ""
                        }`}
                    >
                      {hasRevealPicks && (
                        <div className="game-room-choice-avatar-anchor">
                          <RevealChoiceAvatarRow picks={revealPicks} />
                        </div>
                      )}
                      <Button
                        fullWidth
                        size="large"
                        disableRipple
                        aria-disabled={isLocked || waitingToStart || shouldShowGestureOverlay || isRecoveringConnection}
                        tabIndex={
                          isLocked || waitingToStart || shouldShowGestureOverlay || isRecoveringConnection ? -1 : 0
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
                        className={`game-room-choice-button justify-start ${!isReveal && isSelected
                            ? "game-room-choice-button--selected-live"
                            : ""
                          } ${showComboFocusStyle
                            ? "game-room-choice-button--combo-focus game-room-choice-button--combo-live game-room-choice-button--combo-live-active"
                            : ""
                          } ${comboFocusTierClass
                            ? comboFocusTierClass
                            : ""
                          } ${comboLiveTierClass
                            ? comboLiveTierClass
                            : ""
                          } ${isLocked || waitingToStart || shouldShowGestureOverlay
                            ? "pointer-events-none"
                            : ""
                          } ${isMobileView && hasChoiceStatusTag
                            ? "game-room-choice-button--mobile-has-tags"
                            : ""
                          } ${isMobileView ? "game-room-choice-button--mobile" : ""
                          } ${isMobileView && !isReveal && !isSelected ? "game-room-choice-button--mobile-idle" : ""}`}
                        disabled={false}
                        onClick={() => handleChoiceClick(choice.index)}
                      >
                        <div className="game-room-choice-content flex w-full items-start justify-between gap-2">
                          <span className="game-room-choice-title">
                            {choiceDisplayTitle}
                          </span>

                          <span className={`game-room-choice-meta inline-flex items-center gap-1 ${isMobileView ? "" : "ml-3"}`}>
                            <span className="game-room-choice-badges inline-flex items-center gap-1">
                              {showGuessLockTag && (
                                <span
                                  className={`game-room-choice-tag ${myHasChangedAnswer
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
                                  className={`game-room-choice-tag ${showMyCorrectTag
                                    ? "game-room-choice-tag--you-correct"
                                    : "game-room-choice-tag--you"
                                    }`}
                                >
                                  {showMyCorrectTag ? "你答對" : "你作答"}
                                </span>
                              )}
                            </span>

                            <span className="game-room-choice-key inline-flex h-6 w-6 flex-none items-center justify-center rounded border border-slate-700 bg-slate-800 text-[11px] font-semibold text-slate-200">
                              {(keyBindings[idx] ?? "").toUpperCase()}
                            </span>
                          </span>
                        </div>

                      </Button>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className={`game-room-reveal ${shouldHideDesktopRevealCard ? "game-room-reveal--hidden-desktop" : ""}`}>
            <div
              className={`game-room-reveal-card rounded-lg border game-room-reveal-card--${revealTone} ${isReveal ? "game-room-reveal-card--result game-room-reveal-card--result-burst" : ""
                } ${isPendingFeedbackCard ? "game-room-reveal-card--pending" : ""} ${isComboBreakThisQuestion && comboBreakTier > 0
                  ? `game-room-reveal-card--combo-break game-room-reveal-card--combo-break-tier-${comboBreakTier}`
                  : ""
                }`}
            >
              <div
                className={`game-room-feedback-head ${isReveal ? "game-room-feedback-head--reveal" : ""
                  }`}
              >
                <p className="game-room-feedback-title">{myFeedback.title}</p>
                {isReveal && myFeedback.inlineMeta && (
                  <span
                    className={`game-room-feedback-inline-meta game-room-feedback-inline-meta--${revealTone}`}
                  >
                    {myFeedback.inlineMeta}
                  </span>
                )}
                {isReveal && (
                  <span
                    className={`game-room-feedback-pill game-room-feedback-pill--${revealTone} ${myFeedback.pillText ?? myFeedback.detail
                      ? ""
                      : "game-room-feedback-pill--placeholder"
                      }`}
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
                  <p className="game-room-reveal-answer mt-1 text-sm text-emerald-50">
                    <span className="mr-1 text-[11px] font-semibold text-emerald-200">正解</span>
                    {resolvedAnswerTitle}
                  </p>
                  {gameStatus === "playing" ? (
                    <GameRoomRevealCountdownText
                      revealEndsAt={revealEndsAt}
                      getLocalNowMs={getLocalNowMs}
                    />
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

export default React.memo(GameRoomAnswerPanel);
