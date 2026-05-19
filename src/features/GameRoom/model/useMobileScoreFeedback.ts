import { useCallback, useEffect, useRef, useState } from "react";

import type { GameState, RoomParticipant } from "@features/RoomSession";

import {
  buildMobileScoreFeedbackEvent,
  buildMobileScoreFeedbackSnapshot,
  type MobileScoreFeedbackEvent,
  type MobileScoreFeedbackSnapshot,
  type MobileScoreFeedbackScope,
} from "./mobileScoreFeedback";
import { shouldDelayChallengeScoreFeedbackForProjection } from "./challengeProjectionRefreshPolicy";
import { deferStateUpdate } from "./gameRoomUtils";
import type { ChallengeProjectedLeaderboardResponse } from "./projectionTypes";

type ScoreFeedbackEvent = Extract<MobileScoreFeedbackEvent, { type: "score" }>;
type PassedFeedbackEvent = Extract<MobileScoreFeedbackEvent, { type: "passed" }>;

type PendingChallengeRankFeedback = {
  prevSnapshot: MobileScoreFeedbackSnapshot;
  scoreEvent: ScoreFeedbackEvent;
  expiresAt: number;
};

type UseMobileScoreFeedbackParams = {
  participants: RoomParticipant[];
  meClientId?: string;
  enabled: boolean;
  gameStatus: GameState["status"];
  scope: MobileScoreFeedbackScope;
  challengeProjection?: ChallengeProjectedLeaderboardResponse | null;
  resetKey?: string;
  scoreDurationMs?: number;
  rankDurationMs?: number;
};

const MOBILE_REVEAL_FEEDBACK_TOTAL_MS = 5000;
const MOBILE_SCORE_GAIN_PHASE_MS = 5000;
const MOBILE_RANK_SWAP_PHASE_MS = 2500;
const SCORE_EVENT_REUSE_WINDOW_MS = 15_000;

const shouldWaitForChallengeTarget = (event: ScoreFeedbackEvent) =>
  event.scope === "challenge" &&
  event.me.rank > 1 &&
  (event.nextTargetGap === null || !event.nextTargetName?.trim());

export const shouldDelayChallengeScoreFeedback = (
  event: ScoreFeedbackEvent,
  challengeProjection: ChallengeProjectedLeaderboardResponse | null,
) =>
  event.scope === "challenge" &&
  shouldDelayChallengeScoreFeedbackForProjection({
    score: event.me.score,
    data: challengeProjection,
  });

function buildScoreFeedbackEventFromPassed(
  event: PassedFeedbackEvent,
): ScoreFeedbackEvent {
  return {
    type: "score",
    scope: event.scope,
    scoreGain: event.scoreGain,
    me: event.me,
    target: null,
    remainingScore: null,
    runnerUp: event.runnerUp,
    leadScore: event.leadScore,
    nextTargetGap: event.nextTargetGap,
    nextTargetName: event.nextTargetName,
  };
}

const useMobileScoreFeedback = ({
  participants,
  meClientId,
  enabled,
  gameStatus,
  scope,
  challengeProjection = null,
  resetKey = "",
  scoreDurationMs = MOBILE_SCORE_GAIN_PHASE_MS,
  rankDurationMs = MOBILE_RANK_SWAP_PHASE_MS,
}: UseMobileScoreFeedbackParams): MobileScoreFeedbackEvent | null => {
  const [event, setEvent] = useState<MobileScoreFeedbackEvent | null>(null);
  const prevSnapshotRef = useRef<MobileScoreFeedbackSnapshot | null>(null);
  const prevScopeRef = useRef<MobileScoreFeedbackScope | null>(null);
  const prevResetKeyRef = useRef(resetKey);
  const clearTimerRef = useRef<number | null>(null);
  const rankTimerRef = useRef<number | null>(null);
  const scorePhaseUntilRef = useRef(0);
  const latestScoreEventRef = useRef<{
    event: ScoreFeedbackEvent;
    expiresAt: number;
  } | null>(null);
  const pendingChallengeRankRef =
    useRef<PendingChallengeRankFeedback | null>(null);
  const mountedRef = useRef(true);
  const isActive = enabled && gameStatus === "playing" && Boolean(meClientId);

  const clearTimers = useCallback((resetScorePhase = true) => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    if (rankTimerRef.current !== null) {
      window.clearTimeout(rankTimerRef.current);
      rankTimerRef.current = null;
    }
    if (resetScorePhase) {
      scorePhaseUntilRef.current = 0;
    }
  }, []);

  useEffect(() => {
    const publishEvent = (nextEvent: MobileScoreFeedbackEvent | null) => {
      deferStateUpdate(() => {
        if (mountedRef.current) {
          setEvent(nextEvent);
        }
      });
    };

    if (!isActive) {
      prevSnapshotRef.current = null;
      prevScopeRef.current = null;
      prevResetKeyRef.current = resetKey;
      latestScoreEventRef.current = null;
      pendingChallengeRankRef.current = null;
      clearTimers();
      publishEvent(null);
      return;
    }

    const nextSnapshot = buildMobileScoreFeedbackSnapshot({
      scope,
      participants,
      meClientId,
      challengeProjection,
    });
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      prevScopeRef.current = scope;
      prevSnapshotRef.current = nextSnapshot;
      latestScoreEventRef.current = null;
      pendingChallengeRankRef.current = null;
      clearTimers();
      publishEvent(null);
      return;
    }

    const pendingRankFeedback = pendingChallengeRankRef.current;
    const prevSnapshot =
      pendingRankFeedback?.prevSnapshot ?? prevSnapshotRef.current;
    const scopeChanged = prevScopeRef.current !== scope;

    prevScopeRef.current = scope;

    if (!prevSnapshot || scopeChanged) {
      latestScoreEventRef.current = null;
      pendingChallengeRankRef.current = null;
      prevSnapshotRef.current = nextSnapshot;
      clearTimers();
      publishEvent(null);
      return;
    }

    if (!prevSnapshot || prevSnapshot.scope !== nextSnapshot.scope) {
      prevSnapshotRef.current = nextSnapshot;
      pendingChallengeRankRef.current = null;
      return;
    }

    const nextEvent = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);
    if (!nextEvent) {
      if (
        pendingRankFeedback !== null &&
        pendingRankFeedback.expiresAt > Date.now() &&
        shouldDelayChallengeScoreFeedback(
          pendingRankFeedback.scoreEvent,
          challengeProjection,
        )
      ) {
        prevSnapshotRef.current = nextSnapshot;
        return;
      }
      if (pendingRankFeedback !== null) {
        pendingChallengeRankRef.current = null;
      }
      const latestScoreEvent = latestScoreEventRef.current;
      const canPublishDelayedScore =
        latestScoreEvent !== null &&
        latestScoreEvent.expiresAt > Date.now() &&
        latestScoreEvent.event.scope === "challenge" &&
        latestScoreEvent.event.me.clientId === nextSnapshot.me?.clientId &&
        latestScoreEvent.event.me.score <= (nextSnapshot.me?.score ?? -1) &&
        !shouldDelayChallengeScoreFeedback(
          latestScoreEvent.event,
          challengeProjection,
        );
      if (
        canPublishDelayedScore &&
        (!shouldWaitForChallengeTarget(latestScoreEvent.event) ||
          (nextSnapshot.nextTargetGap !== null &&
            nextSnapshot.nextTargetName?.trim()))
      ) {
        const enrichedScoreEvent: ScoreFeedbackEvent = {
          ...latestScoreEvent.event,
          me: nextSnapshot.me,
          nextTargetGap:
            nextSnapshot.nextTargetGap ?? latestScoreEvent.event.nextTargetGap,
          nextTargetName:
            nextSnapshot.nextTargetName ??
            latestScoreEvent.event.nextTargetName,
        };
        latestScoreEventRef.current = {
          event: enrichedScoreEvent,
          expiresAt: Date.now() + SCORE_EVENT_REUSE_WINDOW_MS,
        };
        clearTimers(false);
        scorePhaseUntilRef.current = Date.now() + scoreDurationMs;
        publishEvent(enrichedScoreEvent);
        clearTimerRef.current = window.setTimeout(() => {
          setEvent(null);
          clearTimerRef.current = null;
        }, scoreDurationMs);
      }
      prevSnapshotRef.current = nextSnapshot;
      return;
    }

    if (rankTimerRef.current !== null && nextEvent.type === "score") {
      latestScoreEventRef.current = {
        event: nextEvent,
        expiresAt: Date.now() + SCORE_EVENT_REUSE_WINDOW_MS,
      };
      prevSnapshotRef.current = nextSnapshot;
      return;
    }

    if (
      nextEvent.type === "passed" &&
      shouldDelayChallengeScoreFeedbackForProjection({
        score: nextEvent.me.score,
        data: challengeProjection,
      })
    ) {
      if (nextEvent.scoreGain > 0) {
        const scoreEvent = buildScoreFeedbackEventFromPassed(nextEvent);
        const expiresAt = Date.now() + SCORE_EVENT_REUSE_WINDOW_MS;
        latestScoreEventRef.current = {
          event: scoreEvent,
          expiresAt,
        };
        pendingChallengeRankRef.current = {
          prevSnapshot,
          scoreEvent,
          expiresAt,
        };
      }
      prevSnapshotRef.current = nextSnapshot;
      return;
    }

    clearTimers(false);

    const clearAfter = (durationMs: number) => {
      clearTimerRef.current = window.setTimeout(() => {
        setEvent(null);
        clearTimerRef.current = null;
      }, durationMs);
    };

    const publishRankEvent = () => {
      publishEvent(nextEvent);
      clearAfter(rankDurationMs);
    };

    if (nextEvent.type === "score") {
      latestScoreEventRef.current = {
        event: nextEvent,
        expiresAt: Date.now() + SCORE_EVENT_REUSE_WINDOW_MS,
      };
      const shouldDelayForProjection = shouldDelayChallengeScoreFeedback(
        nextEvent,
        challengeProjection,
      );
      if (shouldDelayForProjection) {
        pendingChallengeRankRef.current = {
          prevSnapshot,
          scoreEvent: nextEvent,
          expiresAt: Date.now() + SCORE_EVENT_REUSE_WINDOW_MS,
        };
      }
      if (
        shouldDelayForProjection ||
        shouldWaitForChallengeTarget(nextEvent)
      ) {
        prevSnapshotRef.current = nextSnapshot;
        return;
      }
      pendingChallengeRankRef.current = null;
      prevSnapshotRef.current = nextSnapshot;
      scorePhaseUntilRef.current = Date.now() + scoreDurationMs;
      publishEvent(nextEvent);
      clearAfter(scoreDurationMs);
      return;
    }

    if (nextEvent.type === "passed") {
      pendingChallengeRankRef.current = null;
      prevSnapshotRef.current = nextSnapshot;
      const latestScoreEvent = latestScoreEventRef.current;
      const canReuseLatestScore =
        latestScoreEvent !== null &&
        latestScoreEvent.expiresAt > Date.now() &&
        latestScoreEvent.event.scope === nextEvent.scope &&
        latestScoreEvent.event.me.clientId === nextEvent.me.clientId &&
        latestScoreEvent.event.me.score <= nextEvent.me.score &&
        latestScoreEvent.event.scoreGain > 0;
      const scoreFollowUp: ScoreFeedbackEvent | null =
        nextEvent.scoreGain > 0
          ? {
              type: "score",
              scope: nextEvent.scope,
              scoreGain: nextEvent.scoreGain,
              me: nextEvent.me,
              target: null,
              remainingScore: null,
              runnerUp: nextEvent.runnerUp,
              leadScore: nextEvent.leadScore,
              nextTargetGap: nextEvent.nextTargetGap,
              nextTargetName: nextEvent.nextTargetName,
            }
          : canReuseLatestScore
            ? {
                ...latestScoreEvent.event,
                me: nextEvent.me,
                nextTargetGap:
                  nextEvent.nextTargetGap ?? latestScoreEvent.event.nextTargetGap,
                nextTargetName:
                  nextEvent.nextTargetName ??
                  latestScoreEvent.event.nextTargetName,
              }
            : null;
      scorePhaseUntilRef.current = 0;
      publishEvent(nextEvent);
      if (scoreFollowUp !== null) {
        rankTimerRef.current = window.setTimeout(() => {
          rankTimerRef.current = null;
          publishEvent(scoreFollowUp);
          clearAfter(rankDurationMs);
        }, rankDurationMs);
      } else {
        clearAfter(rankDurationMs);
      }
    } else {
      pendingChallengeRankRef.current = null;
      prevSnapshotRef.current = nextSnapshot;
      const scorePhaseRemainingMs = Math.max(
        0,
        scorePhaseUntilRef.current - Date.now(),
      );
      if (scorePhaseRemainingMs > 0) {
        rankTimerRef.current = window.setTimeout(() => {
          rankTimerRef.current = null;
          publishRankEvent();
        }, Math.min(scorePhaseRemainingMs, MOBILE_REVEAL_FEEDBACK_TOTAL_MS));
      } else {
        publishRankEvent();
      }
    }

  }, [
    challengeProjection,
    clearTimers,
    isActive,
    meClientId,
    participants,
    rankDurationMs,
    resetKey,
    scope,
    scoreDurationMs,
  ]);

  useEffect(
    () => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        clearTimers();
      };
    },
    [clearTimers],
  );

  return event;
};

export default useMobileScoreFeedback;
