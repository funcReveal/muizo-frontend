import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
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
} from "@features/RoomSession";
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
const ROW_ATTACHED_BURST_STAGGER_MS = 1200;

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
};

// Burst 的 shell：只描述「有哪些 burst 存在」，不含位置。
// 位置 (top/left) 由 rAF loop 直接寫到 DOM ref，不進 React state，
// 避免每 frame 觸發 re-render。
type SidebarOverlayBurst = FloatingScoreBurst & {
  clientId: string;
};

type FloatingScoreBreakdownPart =
  | "base"
  | "speed"
  | "decision"
  | "difficulty"
  | "combo"
  | "other";

const FLOATING_SCORE_PART_LABEL: Record<FloatingScoreBreakdownPart, string> = {
  base: "基礎",
  speed: "速度",
  decision: "首答",
  difficulty: "難度",
  combo: "連擊",
  other: "",
};

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
  scoreBreakdown?: QuestionScoreBreakdown;
  isMeRow: boolean;
  answerDotClass: string;
  answerDotTitle: string;
  answerChipColor: "default" | "success" | "error" | "warning";
  rowSwapStyle?: React.CSSProperties;
  rowClassName: string;
  rowShellRef?: (node: HTMLDivElement | null) => void;
  rowElementRef?: (node: HTMLDivElement | null) => void;
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
  enableSegmentedScoreAnimation: boolean;
  enableFloatingScoreBursts: boolean;
  /**
   * Additional delay (ms) before showing the floating score burst.
   * Set to `rowSwapDelayMs + rowSwapDurationMs + buffer` when the row is
   * undergoing a rank-swap animation so the burst fires at the new position
   * after the row has finished moving, not at the old position.
   */
  burstDelayMs: number;
  onFloatingBurstsChange?: (clientId: string, bursts: FloatingScoreBurst[]) => void;
}

const GameRoomScorePlayerRow = React.memo(function GameRoomScorePlayerRow({
  player,
  isReveal,
  answerRank,
  scoreBreakdown,
  isMeRow,
  answerDotClass,
  answerDotTitle,
  answerChipColor,
  rowSwapStyle,
  rowClassName,
  rowShellRef,
  rowElementRef,
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
  enableSegmentedScoreAnimation,
  enableFloatingScoreBursts,
  burstDelayMs,
  onFloatingBurstsChange,
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
   * Tracks the last "settled" score displayed to the user. Used as the
   * authoritative base for segmented score animation so we do not rely on
   * `player.score - scoreBreakdown.totalGainPoints`, which is unreliable:
   * `player.score` and `scoreBreakdown` frequently arrive in separate React
   * commits during reveal, producing races where the computed base is wrong
   * (seen as the total score briefly jumping backward, or the animation
   * skipping entirely on the first few questions).
   *
   * Only updated when `!isReveal` — during reveal it holds the pre-reveal
   * value so we always know the correct animation starting point.
   */
  const [stableScore, setStableScore] = React.useState(player.score);
  // Actual score delta we need to animate across. Prefer the observed
  // score delta (`player.score - stableScore`) since it is the ground truth,
  // but during reveal the new `player.score` frequently only arrives at the
  // END of reveal — in that window we fall back to
  // `scoreBreakdown.totalGainPoints` so the animation can proceed using the
  // server-provided gain even before `player.score` has been updated.
  const scoreDeltaFromStable = player.score - stableScore;
  const breakdownGain = scoreBreakdown?.totalGainPoints ?? 0;
  const derivedGain = isReveal
    ? (scoreDeltaFromStable !== 0 ? scoreDeltaFromStable : breakdownGain)
    : scoreDeltaFromStable;
  const shouldAnimateSegmentedScore =
    enableSegmentedScoreAnimation && isReveal && derivedGain !== 0;
  const shouldShowLocalFloatingBursts =
    enableFloatingScoreBursts && isReveal && isMeRow && derivedGain !== 0;
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
  /**
   * Desktop-only animated score display.
   * null  → show player.score directly (mobile, pre-reveal, or no gain).
   * number → the score value being stepped through segment-by-segment.
   */
  const [animatedDisplayScore, setAnimatedDisplayScore] = React.useState<number | null>(null);
  const animatedDisplayScoreRef = React.useRef<number | null>(null);
  const scoreIncrementTimerIdsRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    animatedDisplayScoreRef.current = animatedDisplayScore;
  }, [animatedDisplayScore]);

  React.useEffect(() => {
    if (enableFloatingScoreBursts || enableSegmentedScoreAnimation) return;
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
  }, [enableFloatingScoreBursts, enableSegmentedScoreAnimation]);

  React.useEffect(() => {
    if (enableSegmentedScoreAnimation) return;
    scoreIncrementTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
    scoreIncrementTimerIdsRef.current = [];
    setAnimatedDisplayScore(null);
  }, [enableSegmentedScoreAnimation]);

  React.useEffect(() => {
    onFloatingBurstsChange?.(
      player.clientId,
      shouldShowLocalFloatingBursts ? floatingBursts : [],
    );
  }, [
    floatingBursts,
    onFloatingBurstsChange,
    player.clientId,
    shouldShowLocalFloatingBursts,
  ]);

  React.useEffect(() => {
    return () => {
      onFloatingBurstsChange?.(player.clientId, []);
    };
  }, [onFloatingBurstsChange, player.clientId]);

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

  // Keep the stable score ref synced to the current score whenever we are
  // outside the reveal phase. This is the only safe window to update it:
  // during reveal the score is in flight and we need the previous value as
  // the animation base.
  React.useLayoutEffect(() => {
    if (!isReveal && stableScore !== player.score) {
      setStableScore(player.score);
    }
  }, [isReveal, player.score, stableScore]);

  React.useEffect(() => {
    if (!shouldAnimateSegmentedScore) {
      if (!isReveal) {
        setAnimatedDisplayScore(null);
        if (stableScore !== player.score) setStableScore(player.score);
        scoreIncrementTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
        scoreIncrementTimerIdsRef.current = [];
      } else if (
        derivedGain === 0 &&
        scoreIncrementTimerIdsRef.current.length === 0 &&
        animatedDisplayScoreRef.current === null
      ) {
        setAnimatedDisplayScore(stableScore);
      }
      return;
    }

    const combo = Math.max(0, player.combo ?? 0);
    let segments = resolveFloatingScoreSegments(
      derivedGain,
      combo,
      scoreBreakdown,
    );
    const segmentsSum = segments.reduce((sum, seg) => sum + seg.amount, 0);
    if (segmentsSum !== derivedGain) {
      segments = derivedGain === 0
        ? []
        : [
          {
            amount: derivedGain,
            tier: resolveFloatingScoreTier(derivedGain, combo),
            kind: derivedGain >= 0 ? ("gain" as const) : ("loss" as const),
            part: "other" as FloatingScoreBreakdownPart,
          },
        ];
    }
    if (segments.length === 0) return;

    scoreIncrementTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
    scoreIncrementTimerIdsRef.current = [];
    setAnimatedDisplayScore(stableScore);
    let runningScore = stableScore;
    segments.forEach((segment, index) => {
      runningScore += segment.amount;
      const targetScore = runningScore;
      const incrTimerId = window.setTimeout(() => {
        setAnimatedDisplayScore(targetScore);
        scoreIncrementTimerIdsRef.current = scoreIncrementTimerIdsRef.current.filter(
          (id) => id !== incrTimerId,
        );
      }, index * ROW_ATTACHED_BURST_STAGGER_MS + 180);
      scoreIncrementTimerIdsRef.current.push(incrTimerId);
    });
  }, [
    isReveal,
    player.combo,
    player.score,
    derivedGain,
    stableScore,
    scoreBreakdown,
    shouldAnimateSegmentedScore,
  ]);

  React.useEffect(() => {
    if (!shouldShowLocalFloatingBursts) {
      consumedBurstKeyRef.current = null;
      scheduledBurstRef.current = null;
      if (swapPendingTimerRef.current !== null) {
        window.clearTimeout(swapPendingTimerRef.current);
        swapPendingTimerRef.current = null;
      }
      setFloatingBursts([]);
      removalTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
      removalTimerIdsRef.current = [];
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
    const burstKey = `${player.clientId}:${stableScore}:${derivedGain}:${player.combo}:${breakdownKey}:${isReveal ? "reveal" : "idle"}`;
    const effectiveDelayMs = Math.max(0, burstDelayMsRef.current);
    if (consumedBurstKeyRef.current === burstKey) return;
    if (
      scheduledBurstRef.current?.key === burstKey &&
      scheduledBurstRef.current.delayMs === effectiveDelayMs
    ) {
      return;
    }

    const combo = Math.max(0, player.combo ?? 0);
    let segments = resolveFloatingScoreSegments(
      derivedGain,
      combo,
      scoreBreakdown,
    );
    const segmentsSum = segments.reduce((sum, seg) => sum + seg.amount, 0);
    if (segmentsSum !== derivedGain) {
      segments = derivedGain === 0
        ? []
        : [
          {
            amount: derivedGain,
            tier: resolveFloatingScoreTier(derivedGain, combo),
            kind: derivedGain >= 0 ? ("gain" as const) : ("loss" as const),
            part: "other" as FloatingScoreBreakdownPart,
          },
        ];
    }
    const nextBursts = segments.map((segment, index) => {
      burstSequenceRef.current += 1;
      return {
        id: `${player.clientId}-${burstSequenceRef.current}`,
        amount: segment.amount,
        combo,
        kind: segment.kind,
        tier: segment.tier,
        part: segment.part,
        delayMs: index * ROW_ATTACHED_BURST_STAGGER_MS,
      } satisfies FloatingScoreBurst;
    });
    if (nextBursts.length === 0) return;

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
      removalTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
      removalTimerIdsRef.current = [];
      setFloatingBursts(nextBursts);
      nextBursts.forEach((nextBurst) => {
        const timerId = window.setTimeout(() => {
          setFloatingBursts((current) => current.filter((burst) => burst.id !== nextBurst.id));
          removalTimerIdsRef.current = removalTimerIdsRef.current.filter((id) => id !== timerId);
        }, FLOATING_SCORE_BURST_LIFETIME_MS + nextBurst.delayMs);
        removalTimerIdsRef.current.push(timerId);
      });
    };

    if (effectiveDelayMs > 0) {
      swapPendingTimerRef.current = window.setTimeout(() => {
        swapPendingTimerRef.current = null;
        fireBursts();
      }, effectiveDelayMs);
      return;
    }

    fireBursts();
  }, [
    isReveal,
    player.clientId,
    player.combo,
    derivedGain,
    stableScore,
    scoreBreakdown,
    shouldShowLocalFloatingBursts,
  ]);

  return (
    <>
      <div className="game-room-score-row-shell relative overflow-visible" ref={rowShellRef}>
        <div ref={rowElementRef} className={rowClassName} style={rowSwapStyle}>
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
                size={32}
                contentSize={24}
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
            <span className="relative font-semibold text-emerald-300 tabular-nums">
              {(enableSegmentedScoreAnimation && isReveal && animatedDisplayScore !== null
                ? animatedDisplayScore
                : player.score
              ).toLocaleString()}
              <AnimatePresence mode="popLayout">
                {player.combo > 0 && (
                  <motion.span
                    key={player.combo}
                    className="ml-1"
                    initial={{
                      scale: 1.5 + Math.min(player.combo - 1, 9) * 0.05,
                      opacity: 0,
                      y: -7,
                    }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.55, opacity: 0, y: 4, transition: { duration: 0.09, ease: "easeIn" } }}
                    transition={{ type: "spring", stiffness: 480, damping: 22, mass: 0.85 }}
                    style={{ display: "inline-block", transformOrigin: "50% 60%" }}
                  >
                    <span
                      className={`game-room-combo-breathe game-room-combo-breathe-tier-${resolveComboTier(player.combo)} ${comboDisplayClass}`}
                    >
                      x{player.combo}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </div>
        </div>
      </div>
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
  const sidebarRef = React.useRef<HTMLElement | null>(null);
  const rowShellByClientIdRef = React.useRef(new Map<string, HTMLDivElement>());
  const rowElementByClientIdRef = React.useRef(new Map<string, HTMLDivElement>());
  const previousDesktopTopByClientIdRef = React.useRef(new Map<string, number>());
  const desktopFlipAnimationsRef = React.useRef<Animation[]>([]);
  const desktopFlipBurstClientIdByAnimationRef = React.useRef(
    new Map<Animation, string>(),
  );
  const flipPrevScoreByClientIdRef = React.useRef<Map<string, number>>(new Map());
  const [desktopFlipBurstDelayByClientId, setDesktopFlipBurstDelayByClientId] =
    React.useState<Record<string, number>>({});
  const [floatingBurstsByClientId, setFloatingBurstsByClientId] = React.useState<
    Record<string, FloatingScoreBurst[]>
  >({});
  const [sidebarOverlayBursts, setSidebarOverlayBursts] = React.useState<SidebarOverlayBurst[]>(
    [],
  );

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

  const handleFloatingBurstsChange = React.useCallback(
    (clientId: string, bursts: FloatingScoreBurst[]) => {
      setFloatingBurstsByClientId((current) => {
        const nextBursts = bursts.slice();
        const existingBursts = current[clientId] ?? [];
        const isSame =
          existingBursts.length === nextBursts.length &&
          existingBursts.every((burst, index) => {
            const nextBurst = nextBursts[index];
            return (
              nextBurst &&
              burst.id === nextBurst.id &&
              burst.delayMs === nextBurst.delayMs
            );
          });
        if (isSame) return current;

        if (nextBursts.length === 0) {
          if (!(clientId in current)) return current;
          const next = { ...current };
          delete next[clientId];
          return next;
        }

        return {
          ...current,
          [clientId]: nextBursts,
        };
      });
    },
    [],
  );

  // DOM 元素池：每個 burst 的 <span> mount 時註冊，unmount 時清除。
  // rAF loop 靠這個 Map 直寫 style.top/left，避開 React state update。
  const burstElementByIdRef = React.useRef(new Map<string, HTMLSpanElement>());

  // 讀一次 me 的 row 矩形，直接寫進所有 burst 元素的 style。
  // 帶 early-exit：位置沒變就完全不寫（避免無謂的 style recalc）。
  const lastBurstTopRef = React.useRef<number>(Number.NaN);
  const lastBurstLeftRef = React.useRef<number>(Number.NaN);
  const writeBurstPositions = React.useCallback(() => {
    if (!meClientId) return;
    const rowShell = rowShellByClientIdRef.current.get(meClientId);
    if (!rowShell) return;
    const rect = rowShell.getBoundingClientRect();
    const top = rect.top + rect.height / 2;
    const left = rect.right + 10;
    if (top === lastBurstTopRef.current && left === lastBurstLeftRef.current) {
      return;
    }
    lastBurstTopRef.current = top;
    lastBurstLeftRef.current = left;
    const topPx = `${top}px`;
    const leftPx = `${left}px`;
    burstElementByIdRef.current.forEach((el) => {
      el.style.top = topPx;
      el.style.left = leftPx;
    });
  }, [meClientId]);

  const recomputeSidebarOverlayBursts = React.useCallback(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) {
      setSidebarOverlayBursts((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const nextOverlayBursts: SidebarOverlayBurst[] = [];
    Object.entries(floatingBurstsByClientId).forEach(([clientId, bursts]) => {
      if (bursts.length === 0 || clientId !== meClientId) return;
      bursts.forEach((burst) => {
        nextOverlayBursts.push({ ...burst, clientId });
      });
    });

    // Bail-out：id 集合一樣就不 setState（避免 re-render cascade）。
    setSidebarOverlayBursts((prev) => {
      if (
        prev.length === nextOverlayBursts.length &&
        prev.every((p, i) => p.id === nextOverlayBursts[i]?.id)
      ) {
        return prev;
      }
      return nextOverlayBursts;
    });
  }, [floatingBurstsByClientId, meClientId]);

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

  React.useLayoutEffect(() => {
    recomputeSidebarOverlayBursts();
  }, [recomputeSidebarOverlayBursts, scoreboardRows]);

  // Burst 新增/移除後立刻寫入一次 position（避免首幀位置為 0,0 閃爍）。
  // 也讓 sidebarOverlayBursts 相同時保持 ref 不動，不會重複 work。
  React.useLayoutEffect(() => {
    if (sidebarOverlayBursts.length === 0) {
      lastBurstTopRef.current = Number.NaN;
      lastBurstLeftRef.current = Number.NaN;
      return;
    }
    // 重置對比基準，強制這次寫入（新元素 ref 剛綁上）
    lastBurstTopRef.current = Number.NaN;
    lastBurstLeftRef.current = Number.NaN;
    writeBurstPositions();
  }, [sidebarOverlayBursts, writeBurstPositions]);

  // rAF loop：在 bursts 生命週期內每 frame 寫 DOM style（ref 直寫，不走 setState）。
  // writeBurstPositions 內建 early-exit，row 不動時等於 noop。
  // 壽命由 burst 集合控制：sidebarOverlayBursts 空陣列時停，否則每 frame 跑。
  // 另外掛 visibilitychange：tab 被隱藏時 cancel rAF，真正讓手機進入 sleep；
  // 切回來再啟動，避免前景時漏掉一幀位置同步。
  React.useEffect(() => {
    if (mobileOverlayMode || sidebarOverlayBursts.length === 0) {
      return undefined;
    }
    let frameId = 0;
    const start = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(function sync() {
        writeBurstPositions();
        frameId = window.requestAnimationFrame(sync);
      });
    };
    const stop = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        // Paint one synchronous frame so bursts don't linger at a stale
        // position while we wait for the first rAF tick.
        writeBurstPositions();
        start();
      }
    };
    if (!document.hidden) {
      start();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stop();
    };
  }, [mobileOverlayMode, sidebarOverlayBursts, writeBurstPositions]);

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

  const sidebarContent = (
    <aside
      ref={sidebarRef}
      className={`game-room-panel game-room-panel--left game-room-panel--blaze flex h-full w-full flex-col gap-3 overflow-x-visible overflow-y-hidden p-3 text-slate-50 ${mobileOverlayMode ? "game-room-left-sidebar--mobile-overlay" : ""
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
      <div className="relative min-h-0 overflow-visible">
      <div className="game-room-scoreboard-stack space-y-1.5 overflow-visible">
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
                    rowShellByClientIdRef.current.set(p.clientId, node);
                    return;
                  }
                  rowShellByClientIdRef.current.delete(p.clientId);
                }}
              >
                <GameRoomScorePlayerRow
                  player={p}
                  isReveal={isReveal}
                  answerRank={answerRank}
                  scoreBreakdown={scoreBreakdown}
                  isMeRow={isMeRow}
                  answerDotClass={answerDotClass}
                  answerDotTitle={answerDotTitle}
                  answerChipColor={answerChipColor}
                  rowSwapStyle={rowSwapStyle}
                  rowClassName={rowClassName}
                  rowShellRef={undefined}
                  rowElementRef={(node) => {
                    if (node) {
                      rowElementByClientIdRef.current.set(p.clientId, node);
                      return;
                    }
                    rowElementByClientIdRef.current.delete(p.clientId);
                  }}
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
                  enableSegmentedScoreAnimation={enableDesktopFloatingScoreBursts}
                  enableFloatingScoreBursts={enableDesktopFloatingScoreBursts && isMeRow}
                  burstDelayMs={Math.max(
                    hasRowSwapAnimation
                      ? rowSwapDelayMs + rowSwapDurationMs + 80
                      : 0,
                    desktopFlipBurstDelayMs,
                  )}
                  onFloatingBurstsChange={handleFloatingBurstsChange}
                />
              </div>
            );
          })
        )}
      </div>
      </div>

    </aside>
  );

  return (
    <>
      {sidebarContent}
      {typeof document !== "undefined" && sidebarOverlayBursts.length > 0 && createPortal(
        <div
          className="pointer-events-none fixed inset-0 z-[9999] overflow-visible"
          aria-hidden="true"
        >
          {sidebarOverlayBursts.map((burst) => {
            const label =
              burst.kind === "loss"
                ? "扣分"
                : (FLOATING_SCORE_PART_LABEL[burst.part] ?? "");
            return (
              <span
                key={burst.id}
                ref={(node) => {
                  const map = burstElementByIdRef.current;
                  if (node) {
                    map.set(burst.id, node);
                  } else {
                    map.delete(burst.id);
                  }
                }}
                style={{
                  position: "fixed",
                  // top/left 由 writeBurstPositions() 透過 ref 直寫，
                  // 不放 React state，避免每 frame re-render。
                  // 初始寫入由 useLayoutEffect 負責，首幀不會停在原點。
                  "--gr-floating-score-x": "0px",
                  "--gr-fs-combo-ratio": Math.min(1, Math.max(0, burst.combo) / 10).toFixed(3),
                  animationDelay: `${burst.delayMs}ms`,
                } as React.CSSProperties}
                className={[
                  "game-room-floating-score",
                  "game-room-floating-score--desktop-portal",
                  `game-room-floating-score--${burst.kind}`,
                  `game-room-floating-score--tier-${burst.tier}`,
                ].filter(Boolean).join(" ")}
              >
                <span className="game-room-floating-score__amount">
                  {burst.amount > 0 ? `+${burst.amount}` : burst.amount}
                </span>
                {label && (
                  <span className="game-room-floating-score__label-inline">{label}</span>
                )}
              </span>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
};

export default React.memo(GameRoomLeftSidebar);

