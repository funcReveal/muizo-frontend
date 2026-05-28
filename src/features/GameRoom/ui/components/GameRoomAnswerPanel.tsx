import React from "react";
import { Alert, Button, Chip, LinearProgress, Snackbar } from "@mui/material";

import RevealChoiceAvatarRow from "./RevealChoiceAvatarRow";
import type {
  GameState,
  PlaylistItem,
  SubmitAnswerResult,
} from "@features/RoomSession";
import { normalizeRoomDisplayText } from "../../../../shared/utils/text";
import type {
  MyFeedbackModel,
  RevealChoicePickMap,
} from "../../model/gameRoomTypes";

interface GameRoomAnswerPanelProps {
  isMobileView?: boolean;
  isInitialCountdown: boolean;
  isReveal: boolean;
  revealTone: "neutral" | "locked" | "correct" | "wrong";
  isInterTrackWait: boolean;
  phaseLabel: string;
  activePhaseDurationMs: number;
  phaseEndsAt: number;
  gamePhase: GameState["phase"];
  startedAt: number;
  isTimeAttackMode?: boolean;
  timeAttackTimeLimitMs?: number | null;
  timeAttackRemainingMs?: number | null;
  timeAttackEndReason?: "time_over" | "completed_all" | null;
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
  onSubmitChoice: (choiceIndex: number) => Promise<SubmitAnswerResult | void> | void;
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
  isLeaderboardRoom?: boolean;
  leaderboardLockShakeKey?: number;
  /** When true, the embedded player HUD already shows phase chrome (chip,
   *  title, progress bar). Hide these in the answer panel to avoid duplication.
   *  Covers both guess and reveal embedded HUD modes. */
  shouldHideAnswerPhaseChrome?: boolean;
  shouldHideMobileAnswerPhaseChrome?: boolean;
  /**
   * Rate-limit feedback props — managed by GameRoomPage and driven directly
   * from the flow layer so the feedback fires reliably regardless of async
   * result propagation timing.
   */
  /** Incrementing key; each increment triggers the shake animation. */
  rateLimitShakeKey?: number;
  /** When true the "操作過於頻繁" Snackbar is open. */
  showRateLimitToast?: boolean;
  /** Called when the Snackbar requests to be closed. */
  onRateLimitToastClose?: () => void;
  /** When true the selected choice row shows the inline rate-limit tip. */
  isRateLimitTooltipVisible?: boolean;
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
const GameRoomChoiceText = React.memo(function GameRoomChoiceText({
  text,
}: {
  text: string;
}) {
  return (
    <span
      className="game-room-choice-text"
      title={text}
      aria-label={text}
    >
      {text}
    </span>
  );
});

function formatTimeAttackCountdown(valueMs: number | null | undefined): string {
  if (typeof valueMs !== "number" || !Number.isFinite(valueMs)) return "--:--";

  const totalSec = Math.max(0, Math.ceil(valueMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const resolveInlineStatusTone = (text: string): InlineStatusSegmentTone => {
  if (/^[+-]\d+/.test(text) || text.startsWith("分數")) return "score";
  if (text.startsWith("答對")) return "correct";
  if (text.startsWith("答錯")) return "wrong";
  if (text.startsWith("未作答") || text.startsWith("等待")) return "muted";
  if (text.startsWith("答案")) return "answer";
  if (text.startsWith("全場答對") || text.startsWith("連擊")) return "accent";
  return "neutral";
};

const splitInlineStatusSegments = (
  text: string,
  options?: { omitAnswered?: boolean },
): InlineStatusSegment[] =>
  text
    .split("繚")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) =>
      options?.omitAnswered ? !segment.startsWith("已答 ") : true,
    )
    .map((segment) => ({
      text: segment,
      tone: resolveInlineStatusTone(segment),
    }));

const GameRoomPhaseStatusChip = React.memo(function GameRoomPhaseStatusChip({
  isInterTrackWait,
  allAnsweredReadyForReveal,
  isTimeAttackMode,
  timeAttackRemainingMs,
  gamePhase,
  startedAt,
  phaseEndsAt,
  getLocalNowMs,
  isGuessUrgency,
  urgentChipPingActive,
}: {
  isInterTrackWait: boolean;
  allAnsweredReadyForReveal: boolean;
  isTimeAttackMode: boolean;
  timeAttackRemainingMs: number | null;
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
    if (isTimeAttackMode && gamePhase === "guess") {
      const stableRemainingMs =
        typeof timeAttackRemainingMs === "number" && Number.isFinite(timeAttackRemainingMs)
          ? Math.max(0, timeAttackRemainingMs)
          : 0;
      return formatTimeAttackCountdown(
        Math.max(0, stableRemainingMs - Math.max(0, now - startedAt)),
      );
    }
    return `${Math.ceil(Math.max(0, phaseEndsAt - now) / 1000)}s`;
  }, [
    allAnsweredReadyForReveal,
    getLocalNowMs,
    isTimeAttackMode,
    isInterTrackWait,
    gamePhase,
    phaseEndsAt,
    startedAt,
    timeAttackRemainingMs,
  ]);
  const [label, setLabel] = React.useState(resolveLabel);
  const isNumericCountdownLabel = /^(\d+s|\d+:\d{2})$/.test(label);

  // ?? ?芸?隤芣? ????????????????????????????????????????????????????????????????
  // ?甇賊敺?甇?timer嚗hase 蝯?敺撩??????銝?蝜潛?頛芾岷嚗?
  // ???敺?4.5 蝘 125ms嚗?蝘?8 甈?wakeup嚗? setLabel ??string bail-out嚗?
  // ?迤 re-render ?芸蝘???潛??????????瘥??憭?1 甈?wakeup??
  // Urgency 閬死???梁撅?isGuessUrgency / urgentChipPingActive ?血??批嚗?
  // 頝迨 tick ?餌??⊿???
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
        : isTimeAttackMode && gamePhase === "guess"
          ? Math.max(
            0,
            (typeof timeAttackRemainingMs === "number" &&
              Number.isFinite(timeAttackRemainingMs)
              ? Math.max(0, timeAttackRemainingMs)
              : 0) - Math.max(0, now - startedAt),
          )
          : Math.max(0, phaseEndsAt - now);
      // ???0 ???迫嚗撩??券?銝??phase ??props ?湔嚗ffect ??
      if (remainingMs <= 0) {
        timerId = null;
        return;
      }
      // ?賢銝??蝘????敺?1 蝘靽? 250ms ?踵?嚗?
      const nextDelay =
        remainingMs > 1000
          ? (remainingMs % 1000) || 1000
          : Math.min(250, remainingMs);
      timerId = window.setTimeout(tick, nextDelay);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [
    allAnsweredReadyForReveal,
    getLocalNowMs,
    isTimeAttackMode,
    isInterTrackWait,
    gamePhase,
    phaseEndsAt,
    resolveLabel,
    startedAt,
    timeAttackRemainingMs,
  ]);

  return (
    <Chip
      label={
        <span
          className={`game-room-phase-chip-label ${isNumericCountdownLabel ? "game-room-phase-chip-label--countdown" : ""
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

  // ?? ?芸?隤芣? ????????????????????????????????????????????????????????????????
  // ???箏? 250ms 頛芾岷嚗?蝘?4 甈?render嚗?
  // ?啁??寧???賊??孛?潦?閮?頝銝活?渡???撟?ms ??蝔?
  // 銝??0 ???餃?甇ｇ?銝?畾? timer??
  React.useEffect(() => {
    let timerId: number | null = null;
    const tick = () => {
      const remainingMs = Math.max(0, revealEndsAt - getLocalNowMs());
      const nextCountdownSec = Math.max(0, Math.ceil(remainingMs / 1000));
      if (document.visibilityState === "visible") {
        setCountdownSec((current) =>
          current === nextCountdownSec ? current : nextCountdownSec,
        );
      }
      if (remainingMs <= 0) {
        // ?蝯?嚗?甇?timer嚗撩??銝???phase
        timerId = null;
        return;
      }
      // ???其?銝?蝘??孛?潘??敺?1 蝘??250ms 靽??踵?嚗?
      const nextDelay =
        remainingMs > 1000
          ? (remainingMs % 1000) || 1000
          : Math.min(250, remainingMs);
      timerId = window.setTimeout(tick, nextDelay);
    };
    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [getLocalNowMs, revealEndsAt]);

  return <p className="mt-1 text-xs text-emerald-200">{countdownSec} 秒後繼續</p>;
});

interface GameRoomChoiceRowProps {
  choice: GameState["choices"][number];
  choiceDisplayTitle: string;
  keyBinding: string;
  isSelected: boolean;
  isCorrect: boolean;
  isReveal: boolean;
  isEnded: boolean;
  isLeaderboardRoom: boolean;
  hasAnySelectedChoice: boolean;
  revealPicks: RevealChoicePickMap[number];
  myComboTier: GameRoomAnswerPanelProps["myComboTier"];
  myComboNow: number;
  waitingToStart: boolean;
  shouldShowGestureOverlay: boolean;
  isRecoveringConnection: boolean;
  isMobileView: boolean;
  onChoiceClick: (choiceIndex: number) => void;
  selectedShellRef: React.RefCallback<HTMLDivElement>;
  /** When true and this row is selected, show the rate-limit tooltip. */
  isRateLimitTooltipVisible?: boolean;
}

const GameRoomChoiceRow = React.memo(function GameRoomChoiceRow({
  choice,
  choiceDisplayTitle,
  keyBinding,
  isSelected,
  isCorrect,
  isReveal,
  isEnded,
  isLeaderboardRoom,
  hasAnySelectedChoice,
  revealPicks,
  myComboTier,
  myComboNow,
  waitingToStart,
  shouldShowGestureOverlay,
  isRecoveringConnection,
  isMobileView,
  onChoiceClick,
  selectedShellRef,
  isRateLimitTooltipVisible = false,
}: GameRoomChoiceRowProps) {
  const isLocked = isReveal || isEnded;
  const isLeaderboardAnswerLocked =
    isLeaderboardRoom && hasAnySelectedChoice && !isReveal;
  const hasRevealPicks = isReveal && revealPicks.length > 0;
  const showComboFocusStyle =
    !isReveal && isSelected && myComboTier > 0 && myComboNow > 0;
  const revealChoiceStateClass = isReveal
    ? isCorrect
      ? "game-room-choice-button--reveal-correct"
      : isSelected
        ? "game-room-choice-button--reveal-wrong"
        : "game-room-choice-button--reveal-neutral"
    : "";
  const comboFocusTierClass = showComboFocusStyle
    ? `game-room-choice-button--combo-focus-tier-${myComboTier}`
    : "";
  const comboLiveTierClass = showComboFocusStyle
    ? `game-room-choice-button--combo-live-tier-${Math.min(
      10,
      Math.max(1, myComboTier),
    )}`
    : "";

  const handleClick = React.useCallback(() => {
    onChoiceClick(choice.index);
  }, [choice.index, onChoiceClick]);

  const handleAnimationEnd = React.useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (!isSelected) return;
      e.currentTarget.classList.remove("game-room-choice-shake");
    },
    [isSelected],
  );

  return (
    <div
      ref={isSelected ? selectedShellRef : undefined}
      className={`relative game-room-choice-shell ${hasRevealPicks ? "game-room-choice-shell--with-avatars" : ""
        }`}
      onAnimationEnd={isSelected ? handleAnimationEnd : undefined}
    >
      {hasRevealPicks && (
        <div className="game-room-choice-avatar-anchor">
          <RevealChoiceAvatarRow picks={revealPicks} />
        </div>
      )}
      {isLeaderboardAnswerLocked && !isSelected && (
        <div className="game-room-choice-leaderboard-lock-overlay" aria-hidden="true" />
      )}
      <Button
        fullWidth
        size="large"
        disableRipple
        title={choiceDisplayTitle}
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
          } ${revealChoiceStateClass
            ? `game-room-choice-button--reveal ${revealChoiceStateClass}`
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
          } ${isLocked ||
            waitingToStart ||
            shouldShowGestureOverlay ||
            (isLeaderboardAnswerLocked && !isSelected)
            ? "pointer-events-none"
            : ""
          } ${isMobileView ? "game-room-choice-button--mobile" : ""
          } ${isMobileView && !isReveal && !isSelected
            ? "game-room-choice-button--mobile-idle"
            : ""
          }`}
        disabled={false}
        onClick={handleClick}
      >
        <div className="game-room-choice-content game-room-choice-content--text-only">
          <span className="game-room-choice-main">
            <GameRoomChoiceText text={choiceDisplayTitle} />
          </span>
          <span className="game-room-choice-key inline-flex h-6 w-6 flex-none items-center justify-center rounded border border-slate-700 bg-slate-800 text-[11px] font-semibold text-slate-200">
            {keyBinding.toUpperCase()}
          </span>
        </div>
      </Button>
      {/* Rate-limit inline tip — absolutely positioned above the button.
          Avoids MUI Tooltip which conflicts with the Button's native title attr. */}
      {isSelected && isRateLimitTooltipVisible && (
        <div
          className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-amber-500/30 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-amber-200 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          操作過於頻繁，請稍後再試
          {/* Down-pointing arrow */}
          <span
            className="absolute left-1/2 top-full -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-slate-900/95"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
});

const GameRoomAnswerPanel: React.FC<GameRoomAnswerPanelProps> = ({
  isMobileView = false,
  isInitialCountdown,
  isReveal,
  revealTone,
  isInterTrackWait,
  phaseLabel,
  activePhaseDurationMs,
  phaseEndsAt,
  gamePhase,
  startedAt,
  isTimeAttackMode = false,
  timeAttackRemainingMs = null,
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
  myFeedback,
  gameStatus,
  revealEndsAt,
  resolvedAnswerTitle,
  onOpenExitConfirm,
  isPendingFeedbackCard,
  allAnsweredReadyForReveal,
  revealChoicePickMap,
  serverOffsetMs,
  liveParticipantCount,
  liveAnsweredCount,
  liveCorrectCount,
  liveWrongCount,
  liveUnansweredCount,
  isRecoveringConnection = false,
  recoveryStatusText = null,
  isLeaderboardRoom = false,
  leaderboardLockShakeKey = 0,
  shouldHideAnswerPhaseChrome = false,
  shouldHideMobileAnswerPhaseChrome = false,
  rateLimitShakeKey = 0,
  showRateLimitToast = false,
  onRateLimitToastClose,
  isRateLimitTooltipVisible = false,
}) => {
  const hideAnswerPhaseChrome =
    shouldHideAnswerPhaseChrome || shouldHideMobileAnswerPhaseChrome;
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
  const shakeSelectedRef = React.useRef<HTMLDivElement | null>(null);
  const [localSelectedChoiceState, setLocalSelectedChoiceState] = React.useState<{
    trackSessionKey: string;
    choiceIndex: number | null;
  } | null>(null);
  const localSubmitSeqRef = React.useRef(0);
  const canUseLocalSelectedChoice =
    gamePhase === "guess" && !isReveal && !isEnded;
  const localSelectedChoice =
    canUseLocalSelectedChoice &&
      localSelectedChoiceState?.trackSessionKey === trackSessionKey
      ? localSelectedChoiceState.choiceIndex
      : null;
  const displaySelectedChoice = localSelectedChoice ?? selectedChoice;
  const displaySelectedChoiceRef = React.useRef(displaySelectedChoice);

  React.useEffect(() => {
    displaySelectedChoiceRef.current = displaySelectedChoice;
  }, [displaySelectedChoice]);

  React.useEffect(() => {
    setLocalSelectedChoiceState((prev) => {
      if (!prev || prev.trackSessionKey !== trackSessionKey) return null;
      if (selectedChoice === null || prev.choiceIndex !== selectedChoice) {
        return prev;
      }
      return null;
    });
  }, [selectedChoice, trackSessionKey]);

  React.useEffect(() => {
    setLocalSelectedChoiceState((prev) =>
      prev?.trackSessionKey === trackSessionKey ? prev : null,
    );
  }, [trackSessionKey]);

  React.useEffect(() => {
    if (canUseLocalSelectedChoice) return;
    setLocalSelectedChoiceState(null);
  }, [canUseLocalSelectedChoice]);

  React.useEffect(() => {
    if (!leaderboardLockShakeKey) return;
    const el = shakeSelectedRef.current;
    if (!el) return;
    el.classList.remove("game-room-choice-shake");
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add("game-room-choice-shake");
  }, [leaderboardLockShakeKey]);

  React.useEffect(() => {
    if (!rateLimitShakeKey) return;
    const el = shakeSelectedRef.current;
    if (!el) return;
    el.classList.remove("game-room-choice-shake");
    void el.offsetWidth;
    el.classList.add("game-room-choice-shake");
  }, [rateLimitShakeKey]);

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
  const mobileInlineAnsweredText =
    liveParticipantCount > 0
      ? `已答 ${liveAnsweredCount}/${liveParticipantCount}`
      : "";
  const mobileGuessAnsweredText =
    isMobileView && !isReveal && !isInterTrackWait && !isEnded
      ? mobileInlineAnsweredText
      : "";
  const feedbackLines = React.useMemo(() => {
    const rawLines = Array.isArray(myFeedback.lines) ? myFeedback.lines : [];
    if (!isMobileView || isReveal) return rawLines;
    return rawLines.filter((line) => !line.trim().startsWith("已答 "));
  }, [isMobileView, isReveal, myFeedback.lines]);
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
    // Hide the custom bar entirely ??the recovery overlay takes over.
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
      if (isLeaderboardRoom && displaySelectedChoiceRef.current !== null) return;
      setLocalSelectedChoiceState({
        trackSessionKey,
        choiceIndex,
      });
      const submitSeq = (localSubmitSeqRef.current += 1);
      void Promise.resolve(onSubmitChoice(choiceIndex))
        .then((result) => {
          if (localSubmitSeqRef.current !== submitSeq) return;
          if (!result) return;
          if (!result.ok) {
            setLocalSelectedChoiceState((prev) =>
              prev?.trackSessionKey === trackSessionKey &&
              prev.choiceIndex === choiceIndex
                ? null
                : prev,
            );
            return;
          }
          const acceptedChoiceIndex = result.data.choiceIndex;
          if (typeof acceptedChoiceIndex !== "number") return;
          setLocalSelectedChoiceState((prev) =>
            prev?.trackSessionKey === trackSessionKey
              ? {
                trackSessionKey,
                choiceIndex: acceptedChoiceIndex,
              }
              : prev,
          );
        })
        .catch(() => {
          if (localSubmitSeqRef.current !== submitSeq) return;
          setLocalSelectedChoiceState((prev) =>
            prev?.trackSessionKey === trackSessionKey &&
            prev.choiceIndex === choiceIndex
              ? null
              : prev,
          );
        });
    },
    [
      canAnswerNow,
      isEnded,
      isLeaderboardRoom,
      isRecoveringConnection,
      isReveal,
      onSubmitChoice,
      trackSessionKey,
    ],
  );
  const handleSelectedShellRef = React.useCallback((node: HTMLDivElement | null) => {
    shakeSelectedRef.current = node;
  }, []);

  return (
    <>
    <div
      className={`game-room-panel game-room-panel--warm game-room-panel--blaze ${isMobileView ? "game-room-answer-panel--mobile" : ""
        } ${!isMobileView ? "game-room-answer-panel--desktop" : ""} flex min-h-0 flex-col text-slate-50 lg:flex-1`}
    >
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
                {!hideAnswerPhaseChrome && (
                  isRecoveringConnection ? (
                    /* ?? Recovery chip: replaces the normal countdown chip ???? */
                    <Chip
                      label={
                        <span className="game-room-phase-chip-label">
                          同步中
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
                      isTimeAttackMode={isTimeAttackMode}
                      timeAttackRemainingMs={timeAttackRemainingMs}
                      gamePhase={gamePhase}
                      startedAt={startedAt}
                      phaseEndsAt={phaseEndsAt}
                      getLocalNowMs={getLocalNowMs}
                      isGuessUrgency={isGuessUrgency}
                      urgentChipPingActive={urgentChipPingActive}
                    />
                  )
                )}
                {!hideAnswerPhaseChrome && (
                  <p className="game-room-title">
                    {isRecoveringConnection
                      ? (recoveryStatusText ?? "正在恢復連線...")
                      : isInterTrackWait
                        ? "等待下一題"
                        : phaseLabel}
                  </p>
                )}
                {shouldShowInlinePhaseStatus && !hideAnswerPhaseChrome && !isMobileView && !isRecoveringConnection ? (
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
            </div>

            {!hideAnswerPhaseChrome && (
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
            )}
            <div
              className={`game-room-options-grid game-room-options-grid--blaze grid gap-3 ${
                isMobileView
                  ? "game-room-options-grid--mobile grid-cols-1"
                  : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {isInitialCountdown || isInterTrackWait
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
                        <span className="game-room-choice-placeholder-lines">
                          <span className="game-room-choice-placeholder-line game-room-choice-placeholder-line--title" />
                          <span className="game-room-choice-placeholder-line game-room-choice-placeholder-line--meta" />
                        </span>
                        <span className="game-room-choice-key game-room-choice-key--placeholder ml-3 inline-flex h-6 w-6 flex-none items-center justify-center rounded border border-slate-800 text-[11px] font-semibold text-slate-500" />
                      </div>
                    </Button>
                  ),
                )
                : choices.map((choice, idx) => {
                  const isSelected = displaySelectedChoice === choice.index;
                  const isCorrect = choice.index === correctChoiceIndex;
                  const choiceDisplayTitle = normalizeRoomDisplayText(
                    choice.title?.trim() ||
                    playlist[choice.index]?.answerText?.trim() ||
                    playlist[choice.index]?.title?.trim(),
                    "未知選項",
                  );
                  const revealPicks = revealChoicePickMap[choice.index] ?? [];

                  return (
                    <GameRoomChoiceRow
                      key={`${choice.index}`}
                      choice={choice}
                      choiceDisplayTitle={choiceDisplayTitle}
                      keyBinding={keyBindings[idx] ?? ""}
                      isSelected={isSelected}
                      isCorrect={isCorrect}
                      isReveal={isReveal}
                      isEnded={isEnded}
                      isLeaderboardRoom={isLeaderboardRoom}
                      hasAnySelectedChoice={displaySelectedChoice !== null}
                      revealPicks={revealPicks}
                      myComboTier={myComboTier}
                      myComboNow={myComboNow}
                      waitingToStart={waitingToStart}
                      shouldShowGestureOverlay={shouldShowGestureOverlay}
                      isRecoveringConnection={isRecoveringConnection}
                      isMobileView={isMobileView}
                      onChoiceClick={handleChoiceClick}
                      selectedShellRef={handleSelectedShellRef}
                      isRateLimitTooltipVisible={isRateLimitTooltipVisible}
                    />
                  );
                })}
            </div>
          </div>

          {!hideAnswerPhaseChrome && (
            <div className="game-room-reveal">
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
                      {(myFeedback.pillText ?? myFeedback.detail) || "等待結果"}
                    </span>
                  )}
                </div>
                {!isReveal && feedbackLines.length === 0 ? (
                  myFeedback.detail && (
                    <p
                      className={`game-room-feedback-detail ${isMobileView ? "game-room-feedback-detail--mobile-compact" : ""}`}
                    >
                      {myFeedback.detail}
                    </p>
                  )
                ) : !isReveal && (
                  <div
                    className={`game-room-feedback-lines ${isReveal ? "mt-1" : "mt-1.5"} ${isMobileView ? "game-room-feedback-lines--mobile-compact" : ""}`}
                  >
                    {feedbackLines
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
                  feedbackLines.length === 0 &&
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
                {!isReveal && isMobileView && mobileGuessAnsweredText && !isRecoveringConnection ? (
                  <p className="mt-0.5 text-[11px] font-semibold text-cyan-100">
                    {mobileGuessAnsweredText}
                  </p>
                ) : null}
                {isReveal && (
                  <>
                    <p className="game-room-reveal-answer mt-1 text-sm text-emerald-50">
                      <span className="mr-1 text-[11px] font-semibold text-emerald-200">答案</span>
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
                          撠撌脩????航?????湔?ａ????
                        </p>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={onOpenExitConfirm}
                        >
                          ?ａ??
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
    {/* Rate-limit toast — rendered via MUI Portal at document body level,
        so it floats above all game UI regardless of layout stacking context. */}
    <Snackbar
      open={showRateLimitToast}
      autoHideDuration={2500}
      onClose={onRateLimitToastClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        severity="warning"
        variant="filled"
        onClose={onRateLimitToastClose}
        sx={{ width: "100%", fontWeight: 600 }}
      >
        操作過於頻繁，請稍後再試
      </Alert>
    </Snackbar>
    </>
  );
};

export default React.memo(GameRoomAnswerPanel);

