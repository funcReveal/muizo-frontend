import React, { useMemo } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import type {
  ChallengeProjectedMyStanding,
  ChallengeProjectionState,
} from "../../model/projectionTypes";
import type {
  ScoreboardBorderAnimationId,
  ScoreboardBorderLineStyleId,
  ScoreboardBorderThemeId,
} from "../../../Setting/model/scoreboardBorderEffects";
import { buildChallengeLeaderboardDisplayRows } from "../../model/buildChallengeLeaderboardDisplayRows";
import {
  ChallengeSeparatorRow,
  ChallengeSelfRow,
  ChallengeEllipsisRow,
} from "./ChallengeLeaderboardRow";
import { ChallengeAnimatedRows } from "./ChallengeAnimatedRows";
import type { SelfRowBaseProps } from "./ChallengeAnimatedRows";
import { useScoreboardWheelScroll } from "./useScoreboardWheelScroll";

// ---------------------------------------------------------------------------
// Skeleton row (loading state)
// ---------------------------------------------------------------------------

const SkeletonRow: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <div
    className="game-room-score-row leaderboard-compact-row flex items-center justify-between animate-pulse"
    style={{ opacity }}
  >
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <div className="h-3.5 w-5 shrink-0 rounded bg-white/10" />
      <div className="game-room-score-row-avatar-skeleton shrink-0 rounded-full bg-white/10" />
      <div className="h-2.5 w-24 rounded bg-white/10" />
    </span>
    <div className="h-2.5 w-12 shrink-0 rounded bg-white/10" />
  </div>
);

// ---------------------------------------------------------------------------
// Panel props
// ---------------------------------------------------------------------------

interface ChallengeLeaderboardPanelProps {
  state: ChallengeProjectionState;
  isSettled?: boolean;
  onRefresh?: () => void;
  viewerDisplayName?: string;
  viewerAvatarUrl?: string | null;
  viewerCombo?: number;
  viewerScore?: number;
  /** Controls nearby self placement: bottom, one-up, then centered. */
  sessionPassCount?: number;
  scoreboardBorderEnabled?: boolean;
  scoreboardBorderMaskEnabled?: boolean;
  scoreboardBorderAnimation?: ScoreboardBorderAnimationId;
  scoreboardBorderLineStyle?: ScoreboardBorderLineStyleId;
  scoreboardBorderTheme?: ScoreboardBorderThemeId;
  scoreboardBorderParticleCount?: number;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export const ChallengeLeaderboardPanel = React.memo(
  function ChallengeLeaderboardPanel({
    state,
    isSettled = false,
    onRefresh,
    viewerDisplayName,
    viewerAvatarUrl,
    viewerCombo = 0,
    viewerScore = 0,
    sessionPassCount = 0,
    scoreboardBorderEnabled,
    scoreboardBorderMaskEnabled,
    scoreboardBorderAnimation,
    scoreboardBorderLineStyle,
    scoreboardBorderTheme,
    scoreboardBorderParticleCount,
  }: ChallengeLeaderboardPanelProps) {
    const { setScrollNodeRef, onWheel } =
      useScoreboardWheelScroll<HTMLDivElement>();

    const data = state.status === "loaded" ? state.data : null;

    const meUserId = data?.myStanding.viewerDbUserId ?? null;

    // -----------------------------------------------------------------------
    // Self row base props (without gapToNext — supplied by display row model)
    // -----------------------------------------------------------------------

    const skeletonStanding = useMemo<ChallengeProjectedMyStanding>(
      () => ({
        liveScore: viewerScore,
        officialBestScore: null,
        projectedRank: null,
        officialRank: null,
        totalPlayers: 0,
        rankIsFinal: false,
        viewerDbUserId: null,
        nextTarget: null,
      }),
      [viewerScore],
    );

    const liveStanding = useMemo<ChallengeProjectedMyStanding | null>(
      () =>
        data
          ? { ...data.myStanding, liveScore: viewerScore }
          : null,
      [data, viewerScore],
    );

    const selfRowBaseProps = useMemo<SelfRowBaseProps>(
      () =>
        data && liveStanding
          ? {
            standing: liveStanding,
            isSettled,
            displayName: viewerDisplayName,
            avatarUrl: viewerAvatarUrl,
            combo: viewerCombo,
            scoreboardBorderEnabled,
            scoreboardBorderMaskEnabled,
            scoreboardBorderAnimation,
            scoreboardBorderLineStyle,
            scoreboardBorderTheme,
            scoreboardBorderParticleCount,
          }
          : {
            standing: skeletonStanding,
            isSettled: false,
            displayName: viewerDisplayName,
            avatarUrl: viewerAvatarUrl,
            combo: viewerCombo,
            scoreboardBorderEnabled,
            scoreboardBorderMaskEnabled,
            scoreboardBorderAnimation,
            scoreboardBorderLineStyle,
            scoreboardBorderTheme,
            scoreboardBorderParticleCount,
          },
      [
        data,
        liveStanding,
        isSettled,
        viewerDisplayName,
        viewerAvatarUrl,
        viewerCombo,
        skeletonStanding,
        scoreboardBorderEnabled,
        scoreboardBorderMaskEnabled,
        scoreboardBorderAnimation,
        scoreboardBorderLineStyle,
        scoreboardBorderTheme,
        scoreboardBorderParticleCount,
      ],
    );

    const hasSelfInfo = Boolean(viewerDisplayName);

    // -----------------------------------------------------------------------
    // Build display rows (pure function — no side-effects)
    // -----------------------------------------------------------------------

    const { listRows } = useMemo(
      () =>
        data
          ? buildChallengeLeaderboardDisplayRows({
            data,
            viewerScore,
            meUserId,
            sessionPassCount,
          })
          : { layoutMode: "nearby" as const, listRows: [] },
      [data, viewerScore, meUserId, sessionPassCount],
    );

    const stickySelfRowBaseProps = useMemo<SelfRowBaseProps>(() => {
      const listSelfRank =
        listRows.find((row) => row.kind === "self")?.displayRank ?? null;
      if (!data || listSelfRank === null) return selfRowBaseProps;

      return {
        ...selfRowBaseProps,
        standing: {
          ...selfRowBaseProps.standing,
          projectedRank: listSelfRank,
        },
      };
    }, [data, listRows, selfRowBaseProps]);

    // -----------------------------------------------------------------------
    // Loading state
    // -----------------------------------------------------------------------

    if (state.status === "idle" || state.status === "loading") {
      return (
        <div
          className="challenge-lb-panel game-room-scoreboard-body h-full"
          onWheel={onWheel}
        >
          <div
            ref={setScrollNodeRef}
            className="game-room-scoreboard-list mq-autohide-scrollbar px-1 py-1"
          >
            <div className="game-room-scoreboard-stack challenge-lb-animated-stack">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} opacity={1 - i * 0.1} />
              ))}
              <ChallengeEllipsisRow />
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={`n${i}`} opacity={0.55 - i * 0.07} />
              ))}
              {hasSelfInfo ? (
                <ChallengeSelfRow {...selfRowBaseProps} />
              ) : (
                <SkeletonRow opacity={0.4} />
              )}
            </div>
          </div>
          <div className="game-room-scoreboard-self-sticky-bar px-1">
            <ChallengeSeparatorRow />
            {hasSelfInfo ? (
              <ChallengeSelfRow {...selfRowBaseProps} variant="sticky" />
            ) : (
              <SkeletonRow opacity={0.7} />
            )}
          </div>
        </div>
      );
    }

    // -----------------------------------------------------------------------
    // Error state
    // -----------------------------------------------------------------------

    if (state.status === "error") {
      return (
        <div className="challenge-lb-panel flex flex-col items-center justify-center h-full gap-3 text-center px-4">
          <p className="text-sm text-slate-400">{state.message}</p>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/15 transition-colors"
            >
              <RefreshRoundedIcon fontSize="inherit" />
              重新載入
            </button>
          )}
        </div>
      );
    }

    if (!data) return null;

    // -----------------------------------------------------------------------
    // Loaded render
    //
    // Layout is fully determined by buildChallengeLeaderboardDisplayRows:
    //   top-window  (projectedRank ≤ 11) — self injected into Top-11 list
    //   top-eleven  (projectedRank = 12) — Top-11 + self at #12, no ellipsis
    //   nearby      (projectedRank ≥ 13 or null) — Top-6 + ellipsis + nearby
    //
    // ChallengeAnimatedRows handles move / enter / exit animations.
    // The sticky self bar is rendered separately and never participates in
    // the list's layout animations.
    // -----------------------------------------------------------------------

    return (
      <div
        className="challenge-lb-panel game-room-scoreboard-body h-full"
        onWheel={onWheel}
      >
        <div
          ref={setScrollNodeRef}
          className="game-room-scoreboard-list mq-autohide-scrollbar relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1 py-1"
        >
          <div className="game-room-scoreboard-stack challenge-lb-animated-stack">
            <ChallengeAnimatedRows
              rows={listRows}
              selfRowBaseProps={selfRowBaseProps}
            />
          </div>
        </div>

        {/* Sticky self bar — always visible, separate from animated list */}
        <div className="game-room-scoreboard-self-sticky-bar px-1">
          <ChallengeSeparatorRow />
          <ChallengeSelfRow {...stickySelfRowBaseProps} variant="sticky" />
        </div>
      </div>
    );
  },
);
