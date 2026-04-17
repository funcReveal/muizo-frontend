import React from "react";
import { createPortal } from "react-dom";
import { Badge, Chip } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";

import {
  DEFAULT_SCOREBOARD_BORDER_ANIMATION_ID,
  DEFAULT_SCOREBOARD_BORDER_ENABLED_VALUE,
  DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT_VALUE,
  DEFAULT_SCOREBOARD_BORDER_LINE_STYLE_ID,
  DEFAULT_SCOREBOARD_BORDER_THEME_ID,
  DEFAULT_AVATAR_EFFECT_LEVEL_VALUE,
} from "../../../Setting/model/settingsContext";
import type {
  ScoreboardBorderAnimationId,
  ScoreboardBorderLineStyleId,
  ScoreboardBorderThemeId,
} from "../../../Setting/model/scoreboardBorderEffects";
import {
  getScoreboardBorderThemeClassName,
  resolveScoreboardBorderMotionByTheme,
} from "../../../Setting/model/scoreboardBorderEffects";
import AnimatedScoreboardBorder from "../../../../shared/ui/AnimatedScoreboardBorder";
import RoomUiTooltip from "../../../../shared/ui/RoomUiTooltip";
import PlayerAvatar from "../../../../shared/ui/playerAvatar/PlayerAvatar";
import type {
  QuestionScoreBreakdown,
  RoomParticipant,
} from "../../../Room/model/types";
import { normalizeRoomDisplayText } from "../../../../shared/utils/text";
import type { TopTwoSwapState } from "../../model/gameRoomTypes";
import { resolveComboTier } from "../lib/gameRoomUiUtils";
import type { ScoreboardRow } from "../../model/gameRoomDerivations";
import type { AvatarEffectLevel } from "../../../../shared/ui/playerAvatar/playerAvatarTheme";

interface GameRoomLeftSidebarProps {
  scoreboardRows: ScoreboardRow[];
  answeredClientIdSet: Set<string>;
  answeredRankByClientId: Map<string, number>;
  scorePartsByClientId: Map<string, { base: number; gain: number }>;
  scoreBreakdownByClientId?: Map<string, QuestionScoreBreakdown>;
  isReveal: boolean;
  meClientId?: string;
  topTwoSwapState: TopTwoSwapState | null;
  className?: string;
  onOpenMobileChat?: () => void;
  mobileChatUnread?: number;
  mobileOverlayMode?: boolean;
  mobileMinimalHeader?: boolean;
  swapAnimationEnabled?: boolean;
  swapReplayToken?: number;
  // Settings — passed from parent so React.memo can isolate scoreboard re-renders
  // from unrelated settings changes (e.g. volume) that don't affect the sidebar.
  avatarEffectLevel?: AvatarEffectLevel;
  scoreboardBorderEnabled?: boolean;
  scoreboardBorderMaskEnabled?: boolean;
  scoreboardBorderAnimation?: ScoreboardBorderAnimationId;
  scoreboardBorderLineStyle?: ScoreboardBorderLineStyleId;
  scoreboardBorderTheme?: ScoreboardBorderThemeId;
  scoreboardBorderParticleCount?: number;
}

const RANK_SWAP_DURATION_MS = 960;
const MAX_RANK_SWAP_OFFSET_ROWS = 6;
const DESKTOP_FLIP_BASE_DURATION_MS = 860;
const DESKTOP_FLIP_MAX_DURATION_MS = 1680;
const DESKTOP_FLIP_ROW_HEIGHT_PX = 60;
const DESKTOP_FLIP_BURST_BUFFER_MS = 90;
const SCOREBOARD_DEBUG_STORAGE_KEY = "musicquiz:debug-sync";
// Must exceed the CSS animation duration (2200ms) so cleanup fires after the
// animation ends, not during it.
const FLOATING_SCORE_BURST_LIFETIME_MS = 3000;

type FloatingScoreTier = "normal" | "boost" | "hot" | "legend";

type FloatingScoreBurst = {
  id: string;
  amount: number;
  combo: number;
  kind: "gain" | "loss";
  tier: FloatingScoreTier;
  /** which breakdown segment this burst represents — drives the label */
  part: FloatingScoreBreakdownPart;
  delayMs: number;
  /** viewport-fixed Y coordinate captured at burst creation time (stable anchor) */
  fixedTop: number;
  /** viewport-fixed X (left) coordinate — just outside the row's right edge */
  fixedLeft: number;
  offsetY: number;
};

/** Short Chinese label for each score breakdown part shown under the amount. */
const FLOATING_SCORE_PART_LABEL: Record<FloatingScoreBreakdownPart, string> = {
  base: "基礎",
  speed: "速度",
  decision: "首答",
  difficulty: "難度",
  combo: "連擊",
  other: "",
};

type FloatingScoreBreakdownPart =
  | "base"
  | "speed"
  | "decision"
  | "difficulty"
  | "combo"
  | "other";

const resolveFloatingScoreTier = (
  amount: number,
  combo: number,
  part: FloatingScoreBreakdownPart = "other",
): FloatingScoreTier => {
  if (amount < 0) return combo >= 6 ? "hot" : "boost";
  if (part === "combo") {
    if (combo >= 8 || amount >= 70) return "legend";
    if (combo >= 5 || amount >= 40) return "hot";
    return "boost";
  }
  if (combo >= 8 || amount >= 120) return "legend";
  if (combo >= 5 || amount >= 80) return "hot";
  if (combo >= 3 || amount >= 36) return "boost";
  return "normal";
};

const resolveFloatingScoreSegments = (
  gain: number,
  combo: number,
  breakdown?: QuestionScoreBreakdown,
) => {
  const resolvedTotal = breakdown?.totalGainPoints ?? gain;
  if (!breakdown) {
    return gain === 0
      ? []
      : [
        {
          amount: gain,
          tier: resolveFloatingScoreTier(gain, combo),
          kind: gain >= 0 ? ("gain" as const) : ("loss" as const),
          part: "other" as FloatingScoreBreakdownPart,
        },
      ];
  }

  const segments: Array<{
    amount: number;
    tier: FloatingScoreTier;
    kind: "gain" | "loss";
    part: FloatingScoreBreakdownPart;
  }> = [];
  const pushSegment = (amount: number, part: FloatingScoreBreakdownPart) => {
    if (!amount) return;
    segments.push({
      amount,
      tier: resolveFloatingScoreTier(amount, combo, part),
      kind: amount >= 0 ? "gain" : "loss",
      part,
    });
  };

  pushSegment(breakdown.basePoints, "base");
  pushSegment(breakdown.speedBonusPoints, "speed");
  pushSegment(breakdown.decisionBonusPoints, "decision");
  pushSegment(breakdown.difficultyBonusPoints, "difficulty");
  pushSegment(breakdown.comboBonusPoints, "combo");

  const knownTotal = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const remainder = resolvedTotal - knownTotal;
  if (remainder !== 0) {
    pushSegment(remainder, "other");
  }

  if (segments.length === 0 && resolvedTotal !== 0) {
    pushSegment(resolvedTotal, "other");
  }

  return segments;
};

const WaitingJoinDots = React.memo(function WaitingJoinDots() {
  return (
    <span className="game-room-waiting-join">
      <span>等待加入</span>
      <span className="game-room-waiting-join__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  );
});

const PlaceholderAvatarIcon = React.memo(function PlaceholderAvatarIcon() {
  return (
    <span className="game-room-score-row-placeholder-avatar" aria-hidden="true">
      <PersonOutlineRoundedIcon sx={{ fontSize: 16 }} />
    </span>
  );
});

const LockedAvatarIcon = React.memo(function LockedAvatarIcon() {
  return (
    <span
      className="game-room-score-row-placeholder-avatar game-room-score-row-placeholder-avatar--locked"
      aria-hidden="true"
    >
      <LockRoundedIcon sx={{ fontSize: 14 }} />
    </span>
  );
});

type RankSwapState = {
  key: number;
  offsetByClientId: Record<string, number>;
};

interface GameRoomScorePlayerRowProps {
  player: RoomParticipant;
  isReveal: boolean;
  answerRank?: number;
  scoreParts: { base: number; gain: number };
  scoreBreakdown?: QuestionScoreBreakdown;
  isMeRow: boolean;
  answerDotClass: string;
  answerDotTitle: string;
  answerChipColor: "default" | "success" | "error" | "warning";
  rowSwapStyle?: React.CSSProperties;
  rowClassName: string;
  displayName: string;
  comboDisplayClass: string;
  shouldShowComboChampion: boolean;
  rowComboTier: number;
  effectiveScoreboardBorderMotion: ScoreboardBorderAnimationId;
  scoreboardBorderTheme: ScoreboardBorderThemeId;
  scoreboardBorderMaskEnabled: boolean;
  scoreboardBorderLineStyle: ScoreboardBorderLineStyleId;
  scoreboardBorderParticleCount: number;
  avatarEffectLevel: "off" | "simple" | "full";
  enableFloatingScoreBursts: boolean;
  /**
   * Additional delay (ms) before showing the floating score burst.
   * Set to `rowSwapDelayMs + rowSwapDurationMs + buffer` when the row is
   * undergoing a rank-swap animation so the burst fires at the new position
   * after the row has finished moving, not at the old position.
   */
  burstDelayMs: number;
}

const GameRoomScorePlayerRow = React.memo(function GameRoomScorePlayerRow({
  player,
  isReveal,
  answerRank,
  scoreParts,
  scoreBreakdown,
  isMeRow,
  answerDotClass,
  answerDotTitle,
  answerChipColor,
  rowSwapStyle,
  rowClassName,
  displayName,
  comboDisplayClass,
  shouldShowComboChampion,
  rowComboTier,
  effectiveScoreboardBorderMotion,
  scoreboardBorderTheme,
  scoreboardBorderMaskEnabled,
  scoreboardBorderLineStyle,
  scoreboardBorderParticleCount,
  avatarEffectLevel,
  enableFloatingScoreBursts,
  burstDelayMs,
}: GameRoomScorePlayerRowProps) {
  const [floatingBursts, setFloatingBursts] = React.useState<FloatingScoreBurst[]>([]);
  const burstSequenceRef = React.useRef(0);
  const consumedBurstKeyRef = React.useRef<string | null>(null);
  const scheduledBurstRef = React.useRef<{
    key: string;
    delayMs: number;
  } | null>(null);
  const removalTimerIdsRef = React.useRef<number[]>([]);
  /**
   * Timer that defers burst creation until after a rank-swap animation
   * finishes. Cleared on every effect re-run and on unmount.
   */
  const swapPendingTimerRef = React.useRef<number | null>(null);
  /** Ref that always holds the latest burstDelayMs without being a dep */
  const burstDelayMsRef = React.useRef(burstDelayMs);
  React.useEffect(() => {
    burstDelayMsRef.current = burstDelayMs;
  }, [burstDelayMs]);
  /** ref to the shell div — fallback anchor for portal bursts */
  const shellRef = React.useRef<HTMLDivElement>(null);
  /**
   * ref to the score text span — primary anchor for portal bursts.
   * Anchoring to the score text (rather than the sidebar's right edge) means
   * each player's bursts start from their own row's X/Y position, so bursts
   * from different players can never visually overlap — they're in separate
   * vertical bands of the viewport.
   */
  const scoreRef = React.useRef<HTMLSpanElement>(null);
  /**
   * Desktop-only animated score display.
   * null  → show player.score directly (mobile, pre-reveal, or no gain).
   * number → the score value being stepped through segment-by-segment.
   */
  const [animatedDisplayScore, setAnimatedDisplayScore] = React.useState<number | null>(null);
  const scoreIncrementTimerIdsRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    if (enableFloatingScoreBursts) return;
    if (swapPendingTimerRef.current !== null) {
      window.clearTimeout(swapPendingTimerRef.current);
      swapPendingTimerRef.current = null;
    }
    setFloatingBursts([]);
    setAnimatedDisplayScore(null);
    consumedBurstKeyRef.current = null;
    scheduledBurstRef.current = null;
    removalTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    removalTimerIdsRef.current = [];
    scoreIncrementTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
    scoreIncrementTimerIdsRef.current = [];
  }, [enableFloatingScoreBursts]);

  React.useEffect(() => () => {
    if (swapPendingTimerRef.current !== null) {
      window.clearTimeout(swapPendingTimerRef.current);
      swapPendingTimerRef.current = null;
    }
    scheduledBurstRef.current = null;
    removalTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    removalTimerIdsRef.current = [];
    scoreIncrementTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
    scoreIncrementTimerIdsRef.current = [];
  }, []);

  React.useEffect(() => {
    if (!enableFloatingScoreBursts || !isReveal || scoreParts.gain === 0) {
      if (!isReveal || scoreParts.gain === 0) {
        consumedBurstKeyRef.current = null;
        scheduledBurstRef.current = null;
        if (swapPendingTimerRef.current !== null) {
          window.clearTimeout(swapPendingTimerRef.current);
          swapPendingTimerRef.current = null;
        }
        // Reveal ended or no gain — snap back to the true score immediately.
        setAnimatedDisplayScore(null);
        scoreIncrementTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
        scoreIncrementTimerIdsRef.current = [];
      }
      return;
    }

    const breakdownKey = scoreBreakdown
      ? [
        scoreBreakdown.basePoints,
        scoreBreakdown.speedBonusPoints,
        scoreBreakdown.decisionBonusPoints,
        scoreBreakdown.difficultyBonusPoints,
        scoreBreakdown.comboBonusPoints,
        scoreBreakdown.totalGainPoints,
      ].join(":")
      : "none";
    const burstKey = `${player.clientId}:${player.score}:${scoreParts.base}:${scoreParts.gain}:${player.combo}:${breakdownKey}`;
    const effectiveDelayMs = Math.max(0, burstDelayMsRef.current);
    if (consumedBurstKeyRef.current === burstKey) return;
    if (
      scheduledBurstRef.current?.key === burstKey &&
      scheduledBurstRef.current.delayMs === effectiveDelayMs
    ) {
      return;
    }

    const combo = Math.max(0, player.combo ?? 0);

    // Capture values used inside the deferred callback so they're not stale.
    const capturedClientId = player.clientId;
    const capturedBase = scoreParts.base;
    const capturedGain = scoreParts.gain;
    const capturedCombo = combo;
    const capturedBreakdown = scoreBreakdown;

    // Cancel any previously pending swap-delay timer for this player.
    if (swapPendingTimerRef.current !== null) {
      window.clearTimeout(swapPendingTimerRef.current);
      swapPendingTimerRef.current = null;
    }
    scheduledBurstRef.current = {
      key: burstKey,
      delayMs: effectiveDelayMs,
    };

    const fireBursts = () => {
      consumedBurstKeyRef.current = burstKey;
      scheduledBurstRef.current = null;
      // ─── Per-player anchor: score text right edge ──────────────────────
      // Measured HERE (inside the deferred callback) so that when the row
      // is undergoing a rank-swap animation we capture the NEW position
      // after the row has finished moving.
      const scoreRect = scoreRef.current?.getBoundingClientRect();
      const shellRect = shellRef.current?.getBoundingClientRect();
      const anchorRect = scoreRect ?? shellRect;
      const burstFixedTop = anchorRect
        ? anchorRect.top + anchorRect.height * 0.5
        : 0;
      const burstFixedLeft = scoreRect
        ? scoreRect.right + 8
        : shellRect
          ? shellRect.right + 10
          : 0;

      const segments = resolveFloatingScoreSegments(
        capturedGain,
        capturedCombo,
        capturedBreakdown,
      );
      const nextBursts = segments.map((segment, index) => {
        burstSequenceRef.current += 1;
        return {
          id: `${capturedClientId}-${burstSequenceRef.current}`,
          amount: segment.amount,
          combo: capturedCombo,
          kind: segment.kind,
          tier: segment.tier,
          part: segment.part,
          // ─── Within-player segment separation ──────────────────────────
          // ALL segments start from the exact same base Y (offsetY: 0).
          // They appear strictly one-at-a-time via delayMs so each one has
          // time to visibly rise before the next pops in.
          delayMs: index * 700,
          fixedTop: burstFixedTop,
          fixedLeft: burstFixedLeft,
          offsetY: 0,
        } satisfies FloatingScoreBurst;
      });
      if (nextBursts.length === 0) return;

      setFloatingBursts((current) => [...current.slice(-2), ...nextBursts].slice(-6));
      nextBursts.forEach((nextBurst) => {
        const timerId = window.setTimeout(() => {
          setFloatingBursts((current) => current.filter((burst) => burst.id !== nextBurst.id));
          removalTimerIdsRef.current = removalTimerIdsRef.current.filter((id) => id !== timerId);
        }, FLOATING_SCORE_BURST_LIFETIME_MS + nextBurst.delayMs);
        removalTimerIdsRef.current.push(timerId);
      });

      // — Animated displayed score: tick up one segment at a time.
      // Start from the base (pre-reveal) score then add each segment's amount
      // 60 ms after its floating label appears, so the user sees the label first.
      scoreIncrementTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
      scoreIncrementTimerIdsRef.current = [];
      setAnimatedDisplayScore(capturedBase);
      let runningScore = capturedBase;
      nextBursts.forEach((burst) => {
        runningScore += burst.amount;
        const targetScore = runningScore;
        const incrTimerId = window.setTimeout(() => {
          setAnimatedDisplayScore(targetScore);
          scoreIncrementTimerIdsRef.current = scoreIncrementTimerIdsRef.current.filter(
            (id) => id !== incrTimerId,
          );
          // 180 ms after the burst appears → lands inside the hold phase where the
          // floating label is fully visible, so the score tick and "+XX" feel in sync.
        }, burst.delayMs + 180);
        scoreIncrementTimerIdsRef.current.push(incrTimerId);
      });
    };

    if (effectiveDelayMs > 0) {
      // Row is mid-animation. Defer until the swap finishes so we measure the
      // score element's new viewport position, not its old one.
      swapPendingTimerRef.current = window.setTimeout(() => {
        swapPendingTimerRef.current = null;
        fireBursts();
      }, effectiveDelayMs);
    } else {
      fireBursts();
    }
  }, [
    enableFloatingScoreBursts,
    isReveal,
    player.clientId,
    player.combo,
    player.score,
    scoreBreakdown,
    scoreParts.base,
    scoreParts.gain,
  ]);

  return (
    <>
      <div className="game-room-score-row-shell" ref={shellRef}>
        <div className={rowClassName} style={rowSwapStyle}>
          {shouldShowComboChampion && (
            <AnimatedScoreboardBorder
              animationId={effectiveScoreboardBorderMotion}
              lineStyleId={scoreboardBorderLineStyle}
              themeId={scoreboardBorderTheme}
              maskEnabled={scoreboardBorderMaskEnabled}
              particleCount={scoreboardBorderParticleCount}
              intensity={rowComboTier / 10}
              variant="attached"
              className="scoreboard-border-effect"
            />
          )}
          <span className="truncate flex items-center gap-2">
            <span className="game-room-score-row-avatar-wrap">
              <PlayerAvatar
                username={displayName}
                clientId={player.clientId}
                avatarUrl={player.avatar_url ?? player.avatarUrl ?? undefined}
                rank={null}
                combo={player.combo}
                isMe={isMeRow}
                size={24}
                effectLevel={avatarEffectLevel}
                className="player-avatar--scoreboard"
              />
              <RoomUiTooltip title={answerDotTitle}>
                <span
                  className={`game-room-score-row-answer-dot-badge ${answerDotClass}`}
                />
              </RoomUiTooltip>
            </span>
            <span className="truncate">
              {displayName}
            </span>
            {isMeRow && (
              <span className="game-room-score-row-you-badge">YOU</span>
            )}
          </span>
          <div className="relative flex items-center gap-2 overflow-visible">
            {typeof answerRank === "number" ? (
              <Chip
                label={`第 ${answerRank} 答`}
                size="small"
                color={answerChipColor}
                variant="filled"
                className="game-room-chip game-room-chip--scoreboard-state"
              />
            ) : (
              <Chip
                label={isReveal ? "未作答" : "待答"}
                size="small"
                variant="outlined"
                className="game-room-chip game-room-chip--scoreboard-state"
              />
            )}
            <span ref={scoreRef} className="relative font-semibold text-emerald-300 tabular-nums">
              {(enableFloatingScoreBursts && animatedDisplayScore !== null
                ? animatedDisplayScore
                : player.score
              ).toLocaleString()}
              {!enableFloatingScoreBursts && isReveal && scoreParts.gain !== 0 && (
                <span
                  className={`ml-1 ${scoreParts.gain > 0
                    ? "text-sky-300 game-room-score-gain-pop"
                    : "text-rose-300 game-room-score-loss-pop"
                    }`}
                >
                  {scoreParts.gain > 0 ? `+${scoreParts.gain}` : scoreParts.gain}
                </span>
              )}
              {player.combo > 0 && (
                <span className={`ml-1 ${comboDisplayClass}`}>x{player.combo}</span>
              )}
            </span>
          </div>
        </div>
      </div>
      {enableFloatingScoreBursts && floatingBursts.length > 0 && createPortal(
        <>
          {floatingBursts.map((burst) => {
            const label = burst.kind === "loss"
              ? "扣分"
              : (FLOATING_SCORE_PART_LABEL[burst.part] ?? "");
            // combo parts get the slam-down entrance animation for extra impact
            const isCombo = burst.part === "combo";
            return (
              <span
                key={burst.id}
                aria-hidden="true"
                style={{
                  position: "fixed",
                  top: burst.fixedTop + burst.offsetY,
                  left: burst.fixedLeft,
                  "--gr-floating-score-x": "0px",
                  "--gr-fs-combo-ratio": Math.min(1, Math.max(0, burst.combo) / 10).toFixed(3),
                  animationDelay: `${burst.delayMs}ms`,
                  zIndex: 9999,
                  pointerEvents: "none",
                } as React.CSSProperties}
                className={[
                  "game-room-floating-score",
                  "game-room-floating-score--desktop-portal",
                  `game-room-floating-score--${burst.kind}`,
                  `game-room-floating-score--tier-${burst.tier}`,
                  // combo segment: slam-down entrance instead of normal pop-in
                  isCombo ? "game-room-floating-score--combo-slam" : "",
                ].filter(Boolean).join(" ")}
              >
                {/* amount + label on one line so the text is compact and readable */}
                <span className="game-room-floating-score__amount">
                  {burst.amount > 0 ? `+${burst.amount}` : burst.amount}
                </span>
                {label && (
                  <span className="game-room-floating-score__label-inline">{label}</span>
                )}
              </span>
            );
          })}
        </>,
        document.body,
      )}
    </>
  );
});

const clampRankSwapOffsetRows = (value: number) =>
  Math.max(-MAX_RANK_SWAP_OFFSET_ROWS, Math.min(MAX_RANK_SWAP_OFFSET_ROWS, value));

const resolveScoreboardPlayerOrder = (rows: ScoreboardRow[]) =>
  rows.flatMap((row) => (row.type === "player" ? [row.player.clientId] : []));

const resolveScoreboardScores = (rows: ScoreboardRow[]) =>
  new Map(
    rows.flatMap((row) =>
      row.type === "player" ? [[row.player.clientId, row.player.score] as const] : [],
    ),
  );

const GameRoomLeftSidebar: React.FC<GameRoomLeftSidebarProps> = ({
  scoreboardRows,
  answeredClientIdSet,
  answeredRankByClientId,
  scorePartsByClientId,
  scoreBreakdownByClientId,
  isReveal,
  meClientId,
  topTwoSwapState,
  className,
  onOpenMobileChat,
  mobileChatUnread = 0,
  mobileOverlayMode = false,
  mobileMinimalHeader = false,
  swapAnimationEnabled = true,
  swapReplayToken = 0,
  avatarEffectLevel = DEFAULT_AVATAR_EFFECT_LEVEL_VALUE,
  scoreboardBorderEnabled = DEFAULT_SCOREBOARD_BORDER_ENABLED_VALUE,
  scoreboardBorderMaskEnabled = true,
  scoreboardBorderAnimation = DEFAULT_SCOREBOARD_BORDER_ANIMATION_ID,
  scoreboardBorderLineStyle = DEFAULT_SCOREBOARD_BORDER_LINE_STYLE_ID,
  scoreboardBorderTheme = DEFAULT_SCOREBOARD_BORDER_THEME_ID,
  scoreboardBorderParticleCount = DEFAULT_SCOREBOARD_BORDER_PARTICLE_COUNT_VALUE,
}) => {
  const enableDesktopFloatingScoreBursts = !mobileOverlayMode;
  const effectiveScoreboardBorderMotion = React.useMemo<ScoreboardBorderAnimationId>(() => {
    if (!scoreboardBorderEnabled) return "none";
    if (scoreboardBorderAnimation === "none") return "none";
    return resolveScoreboardBorderMotionByTheme(scoreboardBorderTheme);
  }, [
    scoreboardBorderAnimation,
    scoreboardBorderEnabled,
    scoreboardBorderTheme,
  ]);
  const playerRowCount = React.useMemo(
    () => scoreboardRows.filter((row) => row.type === "player").length,
    [scoreboardRows],
  );
  const answeredCount = Math.min(answeredClientIdSet.size, playerRowCount);
  const displayedPlayerOrder = React.useMemo(
    () => resolveScoreboardPlayerOrder(scoreboardRows),
    [scoreboardRows],
  );
  const scoreByClientId = React.useMemo(
    () => resolveScoreboardScores(scoreboardRows),
    [scoreboardRows],
  );
  const comboLeaderClientId = React.useMemo(() => {
    let bestClientId: string | null = null;
    let bestCombo = 0;
    let bestRank = Number.MAX_SAFE_INTEGER;

    scoreboardRows.forEach((row, idx) => {
      if (row.type !== "player") return;

      const combo = row.player.combo ?? 0;
      const rank = idx + 1;

      if (combo <= 0) return;

      if (combo > bestCombo) {
        bestClientId = row.player.clientId;
        bestCombo = combo;
        bestRank = rank;
        return;
      }

      if (combo === bestCombo && rank < bestRank) {
        bestClientId = row.player.clientId;
        bestRank = rank;
      }
    });

    return bestClientId;
  }, [scoreboardRows]);
  const [rankSwapState, setRankSwapState] = React.useState<RankSwapState | null>(
    null,
  );
  const lastDisplayedPlayerOrderRef = React.useRef<string[]>([]);
  const lastScoreByClientIdRef = React.useRef<Map<string, number>>(new Map());
  const rankSwapTimerRef = React.useRef<number | null>(null);
  const rankSwapKeyRef = React.useRef(0);
  const rowElementByClientIdRef = React.useRef(new Map<string, HTMLDivElement>());
  const previousDesktopTopByClientIdRef = React.useRef(new Map<string, number>());
  const desktopFlipAnimationsRef = React.useRef<Animation[]>([]);
  const desktopFlipBurstClientIdByAnimationRef = React.useRef(
    new Map<Animation, string>(),
  );
  const flipPrevScoreByClientIdRef = React.useRef<Map<string, number>>(new Map());
  const [desktopFlipBurstDelayByClientId, setDesktopFlipBurstDelayByClientId] =
    React.useState<Record<string, number>>({});

  const debugScoreboard = React.useCallback(
    (label: string, payload: Record<string, unknown>) => {
      if (typeof window === "undefined") return;
      const enabled =
        window.localStorage.getItem(SCOREBOARD_DEBUG_STORAGE_KEY) === "1" ||
        window.location.search.includes("debugSync=1");
      if (!enabled) return;
      console.debug(`[mq-scoreboard] ${label}`, payload);
    },
    [],
  );

  const clearDesktopFlipBurstDelays = React.useCallback((clientIds?: string[]) => {
    setDesktopFlipBurstDelayByClientId((prev) => {
      if (clientIds === undefined) {
        return Object.keys(prev).length === 0 ? prev : {};
      }
      let changed = false;
      const next = { ...prev };
      clientIds.forEach((clientId) => {
        if (!(clientId in next)) return;
        delete next[clientId];
        changed = true;
      });
      return changed ? next : prev;
    });
  }, []);

  const cancelDesktopFlipAnimations = React.useCallback(() => {
    const animations = desktopFlipAnimationsRef.current;
    const affectedClientIds = Array.from(
      new Set(
        animations
          .map((animation) =>
            desktopFlipBurstClientIdByAnimationRef.current.get(animation),
          )
          .filter((clientId): clientId is string => Boolean(clientId)),
      ),
    );
    animations.forEach((animation) => animation.cancel());
    desktopFlipAnimationsRef.current = [];
    desktopFlipBurstClientIdByAnimationRef.current.clear();
    clearDesktopFlipBurstDelays(affectedClientIds);
  }, [clearDesktopFlipBurstDelays]);

  React.useLayoutEffect(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      lastDisplayedPlayerOrderRef.current = displayedPlayerOrder;
      lastScoreByClientIdRef.current = scoreByClientId;
      return;
    }
    if (displayedPlayerOrder.length === 0) {
      lastDisplayedPlayerOrderRef.current = [];
      if (rankSwapTimerRef.current !== null) {
        window.clearTimeout(rankSwapTimerRef.current);
        rankSwapTimerRef.current = null;
      }
      setRankSwapState(null);
      return;
    }

    const previousOrder = lastDisplayedPlayerOrderRef.current;
    const previousScoreByClientId = lastScoreByClientIdRef.current;
    if (previousOrder.length === 0) {
      lastDisplayedPlayerOrderRef.current = displayedPlayerOrder;
      lastScoreByClientIdRef.current = scoreByClientId;
      return;
    }

    if (!swapAnimationEnabled) {
      if (rankSwapTimerRef.current !== null) {
        window.clearTimeout(rankSwapTimerRef.current);
        rankSwapTimerRef.current = null;
      }
      setRankSwapState(null);
      return;
    }

    const previousOrderIndexByClientId = new Map<string, number>(
      previousOrder.map((clientId, index) => [clientId, index]),
    );
    const offsetByClientId: Record<string, number> = {};
    const movedClientIds: string[] = [];
    displayedPlayerOrder.forEach((clientId, nextIndex) => {
      const previousIndex = previousOrderIndexByClientId.get(clientId);
      if (typeof previousIndex !== "number" || previousIndex === nextIndex) return;
      const offsetRows = clampRankSwapOffsetRows(previousIndex - nextIndex);
      if (offsetRows !== 0) {
        offsetByClientId[clientId] = offsetRows;
        movedClientIds.push(clientId);
      }
    });

    lastDisplayedPlayerOrderRef.current = displayedPlayerOrder;
    lastScoreByClientIdRef.current = scoreByClientId;
    const movedOffsets = Object.values(offsetByClientId);
    if (movedOffsets.length === 0) return;
    const didScoreChangeForMovedClients = movedClientIds.some((clientId) => {
      const prevScore = previousScoreByClientId.get(clientId);
      const nextScore = scoreByClientId.get(clientId);
      return typeof prevScore === "number" && typeof nextScore === "number" && prevScore !== nextScore;
    });
    if (!didScoreChangeForMovedClients) {
      debugScoreboard("rank-swap-skipped", {
        trigger: "rank-swap",
        prevOrder: previousOrder,
        nextOrder: displayedPlayerOrder,
        movedClientIds,
        prevScores: Object.fromEntries(
          movedClientIds.map((clientId) => [clientId, previousScoreByClientId.get(clientId) ?? null]),
        ),
        nextScores: Object.fromEntries(
          movedClientIds.map((clientId) => [clientId, scoreByClientId.get(clientId) ?? null]),
        ),
      });
      return;
    }

    if (rankSwapTimerRef.current !== null) {
      window.clearTimeout(rankSwapTimerRef.current);
      rankSwapTimerRef.current = null;
    }
    rankSwapKeyRef.current += 1;
    const animationKey = rankSwapKeyRef.current;
    setRankSwapState({
      key: animationKey,
      offsetByClientId,
    });
    const farthestOffsetRows = movedOffsets.reduce(
      (max, offsetRows) => Math.max(max, Math.abs(offsetRows)),
      1,
    );
    const releaseDelayMs = Math.min(
      220,
      70 + Math.max(0, farthestOffsetRows - 1) * 36,
    );
    rankSwapTimerRef.current = window.setTimeout(() => {
      setRankSwapState((current) =>
        current?.key === animationKey ? null : current,
      );
      rankSwapTimerRef.current = null;
    }, RANK_SWAP_DURATION_MS + releaseDelayMs + 160);
    debugScoreboard("rank-swap", {
      trigger: "rank-swap",
      prevOrder: previousOrder,
      nextOrder: displayedPlayerOrder,
      movedClientIds,
      prevScores: Object.fromEntries(
        movedClientIds.map((clientId) => [clientId, previousScoreByClientId.get(clientId) ?? null]),
      ),
      nextScores: Object.fromEntries(
        movedClientIds.map((clientId) => [clientId, scoreByClientId.get(clientId) ?? null]),
      ),
    });
  }, [debugScoreboard, displayedPlayerOrder, scoreByClientId, swapAnimationEnabled, swapReplayToken]);

  React.useLayoutEffect(() => {
    if (mobileOverlayMode) {
      cancelDesktopFlipAnimations();
      previousDesktopTopByClientIdRef.current.clear();
      return;
    }
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      cancelDesktopFlipAnimations();
      previousDesktopTopByClientIdRef.current.clear();
      return;
    }

    const nextTopByClientId = new Map<string, number>();
    displayedPlayerOrder.forEach((clientId) => {
      const rowElement = rowElementByClientIdRef.current.get(clientId);
      if (!rowElement) return;
      nextTopByClientId.set(clientId, rowElement.getBoundingClientRect().top);
    });

    const previousTopByClientId = previousDesktopTopByClientIdRef.current;
    if (!swapAnimationEnabled || previousTopByClientId.size === 0) {
      previousDesktopTopByClientIdRef.current = nextTopByClientId;
      return;
    }

    const flipPrevScore = flipPrevScoreByClientIdRef.current;

    const movedRows: Array<{
      element: HTMLDivElement;
      deltaY: number;
      clientId: string;
    }> = [];
    nextTopByClientId.forEach((nextTop, clientId) => {
      const prevTop = previousTopByClientId.get(clientId);
      if (typeof prevTop !== "number") return;
      const deltaY = prevTop - nextTop;
      if (Math.abs(deltaY) < 1) return;
      const rowElement = rowElementByClientIdRef.current.get(clientId);
      if (!rowElement) return;
      movedRows.push({ element: rowElement, deltaY, clientId });
    });

    if (movedRows.length === 0) {
      previousDesktopTopByClientIdRef.current = nextTopByClientId;
      flipPrevScoreByClientIdRef.current = new Map(scoreByClientId);
      return;
    }

    const movedClientIds = movedRows.map((r) => r.clientId);
    const didScoreChangeForMovedClients = movedClientIds.some((clientId) => {
      const prevScore = flipPrevScore.get(clientId);
      const nextScore = scoreByClientId.get(clientId);
      return typeof prevScore === "number" && typeof nextScore === "number" && prevScore !== nextScore;
    });
    if (!didScoreChangeForMovedClients) {
      previousDesktopTopByClientIdRef.current = nextTopByClientId;
      flipPrevScoreByClientIdRef.current = new Map(scoreByClientId);
      return;
    }

    cancelDesktopFlipAnimations();

    movedRows.forEach(({ element, deltaY, clientId }) => {
      const distanceRows = Math.max(
        1,
        Math.min(
          MAX_RANK_SWAP_OFFSET_ROWS,
          Math.abs(deltaY) / DESKTOP_FLIP_ROW_HEIGHT_PX,
        ),
      );
      const durationMs = Math.min(
        DESKTOP_FLIP_MAX_DURATION_MS,
        DESKTOP_FLIP_BASE_DURATION_MS + Math.max(0, distanceRows - 1) * 160,
      );
      const overshootY = deltaY > 0 ? -10 : 10;
      const animation = element.animate(
        [
          {
            transform: `translateY(${deltaY}px) scale(0.97)`,
            opacity: 0.72,
          },
          {
            transform: `translateY(${Math.round(deltaY * 0.5)}px) scale(1.02)`,
            opacity: 1,
            offset: 0.48,
          },
          {
            transform: `translateY(${overshootY}px) scale(1.01)`,
            opacity: 1,
            offset: 0.82,
          },
          {
            transform: "translateY(0) scale(1)",
            opacity: 1,
          },
        ],
        {
          duration: Math.round(durationMs),
          easing: "cubic-bezier(0.2, 0.82, 0.24, 1)",
          fill: "both",
        },
      );
      setDesktopFlipBurstDelayByClientId((prev) => ({
        ...prev,
        [clientId]: Math.round(durationMs) + DESKTOP_FLIP_BURST_BUFFER_MS,
      }));
      animation.onfinish = () => {
        desktopFlipAnimationsRef.current = desktopFlipAnimationsRef.current.filter(
          (a) => a !== animation,
        );
        desktopFlipBurstClientIdByAnimationRef.current.delete(animation);
        clearDesktopFlipBurstDelays([clientId]);
      };
      animation.oncancel = () => {
        desktopFlipAnimationsRef.current = desktopFlipAnimationsRef.current.filter(
          (a) => a !== animation,
        );
        desktopFlipBurstClientIdByAnimationRef.current.delete(animation);
        clearDesktopFlipBurstDelays([clientId]);
      };
      desktopFlipBurstClientIdByAnimationRef.current.set(animation, clientId);
      desktopFlipAnimationsRef.current.push(animation);
    });

    previousDesktopTopByClientIdRef.current = nextTopByClientId;
    flipPrevScoreByClientIdRef.current = new Map(scoreByClientId);
    if (movedClientIds.length > 0) {
      debugScoreboard("flip", {
        trigger: "flip",
        prevOrder: lastDisplayedPlayerOrderRef.current,
        nextOrder: displayedPlayerOrder,
        movedClientIds,
        prevScores: Object.fromEntries(
          movedClientIds.map((clientId) => [clientId, flipPrevScore.get(clientId) ?? null]),
        ),
        nextScores: Object.fromEntries(
          movedClientIds.map((clientId) => [clientId, scoreByClientId.get(clientId) ?? null]),
        ),
      });
    }
  }, [
    cancelDesktopFlipAnimations,
    clearDesktopFlipBurstDelays,
    debugScoreboard,
    displayedPlayerOrder,
    mobileOverlayMode,
    scoreByClientId,
    swapAnimationEnabled,
    swapReplayToken,
  ]);

  React.useEffect(
    () => () => {
      if (rankSwapTimerRef.current !== null) {
        window.clearTimeout(rankSwapTimerRef.current);
        rankSwapTimerRef.current = null;
      }
      cancelDesktopFlipAnimations();
    },
    [cancelDesktopFlipAnimations],
  );

  return (
    <aside
      className={`game-room-panel game-room-panel--left game-room-panel--blaze flex h-full w-full flex-col gap-3 overflow-hidden p-3 text-slate-50 ${mobileOverlayMode ? "game-room-left-sidebar--mobile-overlay" : ""
        } ${mobileMinimalHeader ? "game-room-left-sidebar--mobile-minimal-header" : ""} ${className ?? ""
        }`}
    >
      {!mobileMinimalHeader && (
        <>
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="game-room-title">排行榜</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {onOpenMobileChat && (
                <button
                  type="button"
                  onClick={onOpenMobileChat}
                  className="game-room-mobile-chat-entry inline-flex items-center gap-1 rounded-full border border-cyan-300/45 bg-cyan-500/12 px-2 py-1 text-[11px] font-semibold text-cyan-100"
                >
                  <Badge
                    color="error"
                    badgeContent={mobileChatUnread > 99 ? "99+" : mobileChatUnread}
                    invisible={mobileChatUnread <= 0}
                  >
                    <ChatBubbleRoundedIcon className="text-[0.9rem]" />
                  </Badge>
                  聊天室
                </button>
              )}
              <Chip
                label={`已答 ${answeredCount}/${playerRowCount}`}
                size="small"
                color="success"
                variant="outlined"
                className="game-room-chip"
              />
            </div>
          </div>
        </>
      )}

      <div className="game-room-scoreboard-stack space-y-1.5">
        {playerRowCount === 0 ? (
          <>
            <div className="text-xs text-slate-500">目前正在等待玩家進入排行榜...</div>
            <div className="text-xs text-slate-500">玩家加入後，這裡會即時顯示分數與排名變化。</div>
          </>
        ) : (
          scoreboardRows.map((row, idx) => {
            if (row.type === "locked") {
              return (
                <div
                  key={row.key}
                  className="game-room-score-row game-room-score-row--locked flex items-center justify-between text-sm"
                  aria-hidden="true"
                >
                  <span className="truncate flex items-center gap-2 opacity-35">
                    <span className="game-room-score-row-avatar-wrap">
                      <LockedAvatarIcon />
                      <span className="game-room-score-row-answer-dot-badge game-room-score-row-answer-dot-badge--locked" />
                    </span>
                    已鎖定
                  </span>
                  <span className="text-[11px] text-slate-600">--</span>
                </div>
              );
            }
            if (row.type === "placeholder") {
              return (
                <div
                  key={row.key}
                  className="game-room-score-row game-room-score-row--placeholder flex items-center justify-between text-sm"
                  aria-hidden="true"
                >
                  <span className="truncate flex items-center gap-2">
                    <span className="game-room-score-row-avatar-wrap">
                      <PlaceholderAvatarIcon />
                      <span className="game-room-score-row-answer-dot-badge game-room-score-row-answer-dot-badge--vacant" />
                    </span>
                    <span className="truncate">
                      <WaitingJoinDots />
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500">--</span>
                </div>
              );
            }

            const p = row.player as RoomParticipant;
            const hasAnswered = answeredClientIdSet.has(p.clientId);
            const answerRank = answeredRankByClientId.get(p.clientId);
            const scoreParts = scorePartsByClientId.get(p.clientId) ?? {
              base: p.score,
              gain: 0,
            };
            const scoreBreakdown = scoreBreakdownByClientId?.get(p.clientId);
            const isMeRow = p.clientId === meClientId;
            const rowAnswerState = isReveal
              ? hasAnswered
                ? scoreParts.gain > 0
                  ? "correct"
                  : "wrong"
                : "unanswered"
              : hasAnswered
                ? "answered"
                : "pending";
            // The dot badge now shows only online/offline status, NOT answer state.
            // Answer state (correct/wrong/answered) is still tracked via rowAnswerState
            // for the chip color and row CSS class — just no longer on the dot.
            const answerDotClass = p.isOnline ? "bg-emerald-400" : "bg-slate-500";
            const answerDotTitle = p.isOnline ? "在線" : "離線";
            const answerChipColor: "default" | "success" | "error" | "warning" =
              rowAnswerState === "correct"
                ? "success"
                : rowAnswerState === "wrong"
                  ? "error"
                  : rowAnswerState === "answered"
                    ? "warning"
                    : "default";

            const rankSwapOffsetRows =
              rankSwapState?.offsetByClientId[p.clientId] ?? 0;
            const topSwapRole =
              topTwoSwapState &&
                idx === 0 &&
                p.clientId === topTwoSwapState.firstClientId
                ? "first"
                : topTwoSwapState &&
                  idx === 1 &&
                  p.clientId === topTwoSwapState.secondClientId
                  ? "second"
                  : null;
            const shouldUseCssSwapAnimation = mobileOverlayMode;
            const hasTopSwapAnimation = topSwapRole !== null && !mobileOverlayMode;
            const topSwapOffsetRows =
              topSwapRole === "first"
                ? (topTwoSwapState?.firstOffsetRows ?? 1)
                : topSwapRole === "second"
                  ? (topTwoSwapState?.secondOffsetRows ?? -1)
                  : 0;
            const rowSwapOffsetRows =
              rankSwapOffsetRows !== 0 ? rankSwapOffsetRows : topSwapOffsetRows;
            const hasRowSwapAnimation = rowSwapOffsetRows !== 0;
            const isTopSwapParticipant = Boolean(
              topTwoSwapState &&
              (p.clientId === topTwoSwapState.firstClientId ||
                p.clientId === topTwoSwapState.secondClientId),
            );
            const rowSwapDistanceRows = Math.abs(rowSwapOffsetRows);
            const swapRowHeightPx = mobileOverlayMode ? 58 : 60;
            const rowSwapStartPx = rowSwapOffsetRows * swapRowHeightPx;
            const rowSwapMidPx = Math.round(rowSwapStartPx * 0.52);
            const rowSwapOvershootPx =
              rowSwapOffsetRows > 0
                ? -Math.min(12, 6 + rowSwapDistanceRows * 1.8)
                : Math.min(12, 6 + rowSwapDistanceRows * 1.8);
            const rowSwapDurationMs = Math.min(
              1680,
              RANK_SWAP_DURATION_MS +
              Math.max(0, rowSwapDistanceRows - 1) * 128,
            );
            const rowSwapDelayMs =
              rowSwapOffsetRows < 0
                ? Math.min(
                  260,
                  90 + Math.max(0, rowSwapDistanceRows - 1) * 40,
                )
                : 0;
            const topSwapDistanceRows = Math.max(1, Math.abs(topSwapOffsetRows));
            const topSwapStartPx = topSwapOffsetRows * swapRowHeightPx;
            const topSwapMidPx = Math.round(topSwapStartPx * 0.42);
            const topSwapOvershootPx =
              topSwapOffsetRows > 0
                ? -Math.min(12, 5 + topSwapDistanceRows * 1.2)
                : Math.min(12, 5 + topSwapDistanceRows * 1.2);
            const topSwapDurationMs = Math.min(
              1880,
              1320 + Math.max(0, topSwapDistanceRows - 1) * 130,
            );
            const topSwapDelayMs = topSwapRole === "second" ? 80 : 0;
            const swapReplayNudgeMs =
              rankSwapState !== null ? (rankSwapState.key % 17) * 0.07 : 0;
            const rowSwapStyle = shouldUseCssSwapAnimation && hasRowSwapAnimation
              ? ({
                "--game-room-rank-swap-start": `${rowSwapStartPx}px`,
                "--game-room-rank-swap-mid": `${rowSwapMidPx}px`,
                "--game-room-rank-swap-overshoot": `${rowSwapOvershootPx}px`,
                "--game-room-rank-swap-duration": `${rowSwapDurationMs + swapReplayNudgeMs}ms`,
                "--game-room-rank-swap-delay": `${rowSwapDelayMs}ms`,
                ...(hasTopSwapAnimation
                  ? {
                    "--game-room-swap-start": `${topSwapStartPx}px`,
                    "--game-room-swap-mid": `${topSwapMidPx}px`,
                    "--game-room-swap-overshoot": `${topSwapOvershootPx}px`,
                    "--game-room-swap-duration": `${topSwapDurationMs}ms`,
                    "--game-room-swap-second-delay": `${topSwapDelayMs}ms`,
                    "--game-room-swap-tilt-start":
                      topSwapRole === "first" ? "-2.2deg" : "1.6deg",
                    "--game-room-swap-tilt-end":
                      topSwapRole === "first" ? "1.1deg" : "-1deg",
                  }
                  : {}),
              } as React.CSSProperties)
              : undefined;
            const desktopFlipBurstDelayMs =
              desktopFlipBurstDelayByClientId[p.clientId] ?? 0;

            const isComboLeader = p.clientId === comboLeaderClientId;
            const rowComboTier = isComboLeader ? resolveComboTier(p.combo ?? 0) : 0;
            const rowComboTierClass =
              rowComboTier > 0 ? `game-room-score-row--combo-tier-${rowComboTier}` : "";
            const comboDisplayTier = resolveComboTier(p.combo ?? 0);
            const comboDisplayClass =
              comboDisplayTier > 0
                ? `game-room-score-row-combo-text game-room-score-row-combo-text--tier-${comboDisplayTier}`
                : "";
            const shouldShowComboFlare = isComboLeader && rowComboTier > 0;
            const shouldShowComboChampion =
              shouldShowComboFlare && scoreboardBorderEnabled;
            const rowComboThemeClass = shouldShowComboFlare
              ? getScoreboardBorderThemeClassName(scoreboardBorderTheme)
              : "";
            const displayName = normalizeRoomDisplayText(
              p.username,
              `玩家 ${idx + 1}`,
            );

            const rowClassName = `game-room-score-row flex items-center justify-between text-sm ${enableDesktopFloatingScoreBursts ? "game-room-score-row--desktop-floating-score" : ""} ${isReveal ? "game-room-score-row--revealed" : ""
              } ${rowAnswerState === "correct"
                ? "game-room-score-row--correct"
                : rowAnswerState === "wrong"
                  ? "game-room-score-row--wrong"
                  : rowAnswerState === "answered"
                    ? "game-room-score-row--answered"
                    : rowAnswerState === "unanswered"
                      ? "game-room-score-row--unanswered"
                      : ""
              } ${isMeRow ? "game-room-score-row--me" : ""} ${shouldUseCssSwapAnimation && hasTopSwapAnimation
                ? topSwapRole === "first"
                  ? "game-room-score-row--top-swap-first"
                  : "game-room-score-row--top-swap-second"
                : ""
              } ${shouldUseCssSwapAnimation && hasRowSwapAnimation
                ? rowSwapOffsetRows > 0
                  ? "game-room-score-row--rank-swap-up"
                  : "game-room-score-row--rank-swap-down"
                : ""
              } ${hasRowSwapAnimation && isTopSwapParticipant
                ? "game-room-score-row--rank-swap-focus"
                : ""
              } ${rowComboTierClass} ${shouldShowComboFlare ? "game-room-score-row--combo-flare" : ""
              } ${shouldShowComboFlare ? "game-room-score-row--combo-flare-active" : ""
              } ${shouldShowComboChampion ? "game-room-score-row--combo-champion game-room-score-row--combo-champion-active" : ""
              } ${rowComboThemeClass}`;

            return (
              <div
                key={p.clientId}
                ref={(node) => {
                  if (node) {
                    rowElementByClientIdRef.current.set(p.clientId, node);
                    return;
                  }
                  rowElementByClientIdRef.current.delete(p.clientId);
                }}
              >
                <GameRoomScorePlayerRow
                  player={p}
                  isReveal={isReveal}
                  answerRank={answerRank}
                  scoreParts={scoreParts}
                  scoreBreakdown={scoreBreakdown}
                  isMeRow={isMeRow}
                  answerDotClass={answerDotClass}
                  answerDotTitle={answerDotTitle}
                  answerChipColor={answerChipColor}
                  rowSwapStyle={rowSwapStyle}
                  rowClassName={rowClassName}
                  displayName={displayName}
                  comboDisplayClass={comboDisplayClass}
                  shouldShowComboChampion={shouldShowComboChampion}
                  rowComboTier={rowComboTier}
                  effectiveScoreboardBorderMotion={effectiveScoreboardBorderMotion}
                  scoreboardBorderTheme={scoreboardBorderTheme}
                  scoreboardBorderMaskEnabled={scoreboardBorderMaskEnabled}
                  scoreboardBorderLineStyle={scoreboardBorderLineStyle}
                  scoreboardBorderParticleCount={scoreboardBorderParticleCount}
                  avatarEffectLevel={avatarEffectLevel}
                  enableFloatingScoreBursts={enableDesktopFloatingScoreBursts}
                  burstDelayMs={Math.max(
                    hasRowSwapAnimation
                      ? rowSwapDelayMs + rowSwapDurationMs + 80
                      : 0,
                    desktopFlipBurstDelayMs,
                  )}
                />
              </div>
            );
          })
        )}
      </div>

    </aside>
  );
};

export default React.memo(GameRoomLeftSidebar);
