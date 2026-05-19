import type { RoomParticipant } from "@features/RoomSession";

import { sortParticipantsByScore } from "./gameRoomDerivations";
import { buildChallengeLeaderboardDisplayRows } from "./buildChallengeLeaderboardDisplayRows";
import type {
  ChallengeProjectedLeaderboardResponse,
  GameRoomScoreboardTab,
} from "./projectionTypes";

export type MobileScoreFeedbackScope = GameRoomScoreboardTab;

export type FeedbackPlayer = {
  clientId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  rank: number;
  combo: number | null;
};

export type MobileScoreFeedbackEvent =
  | {
      type: "passed";
      scope: MobileScoreFeedbackScope;
      scoreGain: number;
      oldRank: number;
      newRank: number;
      me: FeedbackPlayer;
      /** The player who was just passed (now displaced to newRank+1). */
      target: FeedbackPlayer | null;
      /** The player directly above the new rank (newRank-1); null when me is rank 1. */
      nextTarget: FeedbackPlayer | null;
      /** max(0, nextTarget.score - me.score); 0 when tied; null when nextTarget is null and no snapshot fallback. */
      nextTargetGap: number | null;
      /** Display name for the next target; from nextTarget.username or snapshot fallback. */
      nextTargetName: string | null;
      /** Runner-up at rank 2; populated only when me reaches rank 1. */
      runnerUp: FeedbackPlayer | null;
      /** me.score - runnerUp.score; populated only when me reaches rank 1. */
      leadScore: number | null;
    }
  | {
      type: "overtaken";
      scope: MobileScoreFeedbackScope;
      oldRank: number;
      newRank: number;
      me: FeedbackPlayer;
      target: FeedbackPlayer | null;
      targetScoreGain: number | null;
    }
  | {
      type: "score";
      scope: MobileScoreFeedbackScope;
      scoreGain: number;
      me: FeedbackPlayer;
      target: FeedbackPlayer | null;
      remainingScore: number | null;
      runnerUp: FeedbackPlayer | null;
      leadScore: number | null;
      /** Points needed to overtake the next opponent; null when rank 1. */
      nextTargetGap: number | null;
      /** Display name of the next opponent to overtake; null when rank 1. */
      nextTargetName: string | null;
    }
  | {
      type: "unanswered";
      scope: MobileScoreFeedbackScope;
      questionKey: string;
    };

export type MobileScoreFeedbackSnapshot = {
  scope: MobileScoreFeedbackScope;
  me: FeedbackPlayer | null;
  players: FeedbackPlayer[];
  rankByClientId: Map<string, number>;
  scoreByClientId: Map<string, number>;
  /** Points needed to overtake the next opponent; null when rank 1 or unknown. */
  nextTargetGap: number | null;
  /** Display name of the next opponent; null when rank 1 or unknown. */
  nextTargetName: string | null;
};

const ME_CHALLENGE_CLIENT_ID = "__challenge_me__";

const toFeedbackPlayer = (
  participant: RoomParticipant,
  rank: number,
): FeedbackPlayer => ({
  clientId: participant.clientId,
  username: participant.username,
  avatarUrl: participant.avatar_url ?? participant.avatarUrl ?? null,
  score: participant.score,
  rank,
  combo: participant.combo ?? 0,
});

const createSnapshot = (
  scope: MobileScoreFeedbackScope,
  players: FeedbackPlayer[],
  me: FeedbackPlayer | null,
  nextTargetGap: number | null = null,
  nextTargetName: string | null = null,
): MobileScoreFeedbackSnapshot => ({
  scope,
  me,
  players,
  rankByClientId: new Map(
    players.map((player) => [player.clientId, player.rank]),
  ),
  scoreByClientId: new Map(
    players.map((player) => [player.clientId, player.score]),
  ),
  nextTargetGap,
  nextTargetName,
});

const toChallengeOpponentFeedbackPlayer = (
  opponent: ChallengeProjectedLeaderboardResponse["nearbyOpponents"][number],
): FeedbackPlayer | null => {
  if (typeof opponent.rank !== "number") return null;

  return {
    clientId: `challenge:${opponent.userId}`,
    username: opponent.displayName,
    avatarUrl: opponent.avatarUrl,
    score: opponent.bestScore,
    rank: opponent.rank,
    combo: opponent.maxCombo,
  };
};

const findChallengeNextTarget = ({
  projection,
  displayMe,
  meScore,
}: {
  projection: ChallengeProjectedLeaderboardResponse;
  displayMe: FeedbackPlayer | null;
  meScore: number;
}): FeedbackPlayer | null => {
  const meRank = displayMe?.rank ?? projection.myStanding.projectedRank;
  if (typeof meRank !== "number" || meRank <= 1) return null;

  const explicitTarget = projection.myStanding.nextTarget;
  if (
    explicitTarget &&
    typeof explicitTarget.rank === "number" &&
    explicitTarget.score >= meScore
  ) {
    return {
      clientId: explicitTarget.userId
        ? `challenge:${explicitTarget.userId}`
        : "__challenge_next_target__",
      username: explicitTarget.displayName,
      avatarUrl: explicitTarget.avatarUrl,
      score: explicitTarget.score,
      rank: explicitTarget.rank,
      combo: null,
    };
  }

  return (
    projection.nearbyOpponents
      .map(toChallengeOpponentFeedbackPlayer)
      .filter(
        (player): player is FeedbackPlayer =>
          player !== null &&
          player.rank <= meRank &&
          player.score >= meScore,
      )
      .sort((a, b) => b.rank - a.rank || a.score - b.score)[0] ?? null
  );
};

export const buildRoomMobileScoreFeedbackSnapshot = (
  participants: RoomParticipant[],
  meClientId: string | undefined,
): MobileScoreFeedbackSnapshot => {
  const players = sortParticipantsByScore(participants).map(
    (participant, index) => toFeedbackPlayer(participant, index + 1),
  );
  const me = meClientId
    ? (players.find((player) => player.clientId === meClientId) ?? null)
    : null;

  return createSnapshot("room", players, me);
};

export const buildChallengeMobileScoreFeedbackSnapshot = ({
  projection,
  meClientId,
  meUsername,
  meAvatarUrl,
  meScore,
  meCombo,
}: {
  projection: ChallengeProjectedLeaderboardResponse | null;
  meClientId: string | undefined;
  meUsername?: string | null;
  meAvatarUrl?: string | null;
  meScore: number;
  meCombo: number;
}): MobileScoreFeedbackSnapshot => {
  if (!projection) {
    return createSnapshot("challenge", [], null);
  }

  const meRank = projection.myStanding.projectedRank;
  const me: FeedbackPlayer | null =
    typeof meRank === "number"
      ? {
          clientId: meClientId || ME_CHALLENGE_CLIENT_ID,
          username: meUsername?.trim() || "\u6211",
          avatarUrl: meAvatarUrl ?? null,
          score: meScore,
          rank: meRank,
          combo: meCombo,
        }
      : null;

  const byClientId = new Map<string, FeedbackPlayer>();
  const addPlayer = (player: FeedbackPlayer) => {
    const existing = byClientId.get(player.clientId);
    if (!existing || player.rank < existing.rank) {
      byClientId.set(player.clientId, player);
    }
  };

  // Always request 2 below-slots for snapshot building regardless of the real
  // sessionPassCount.  This ensures the displaced player at newRank+1 is always
  // present in the snapshot so findPassedTarget can locate them and attach an
  // avatar to the "passed" event.  The visual nearby window in
  // ChallengeLeaderboardPanel uses the real sessionPassCount separately.
  const displayRows = buildChallengeLeaderboardDisplayRows({
    data: projection,
    viewerScore: meScore,
    meUserId: projection.myStanding.viewerDbUserId,
    sessionPassCount: 2,
  }).listRows;
  const nearbyPlayers: FeedbackPlayer[] = [];
  let selfDisplaySection: "top-window" | "top-eleven" | "nearby" | null = null;

  displayRows.forEach((row) => {
    if (row.kind === "self") {
      selfDisplaySection = row.section;
      if (me && typeof row.displayRank === "number") {
        addPlayer({ ...me, rank: row.displayRank });
      }
      return;
    }

    if (row.kind !== "player") return;
    if (row.userId === projection.myStanding.viewerDbUserId) return;

    if (row.section === "top") {
      if (typeof row.displayRank !== "number") return;
      addPlayer({
        clientId: `challenge:${row.entry.userId}`,
        username: row.entry.displayName,
        avatarUrl: row.entry.avatarUrl,
        score: row.entry.bestScore,
        rank: row.displayRank,
        combo: row.entry.maxCombo,
      });
      return;
    }

    if (typeof row.approxRank !== "number") return;
    const player = {
      clientId: `challenge:${row.opponent.userId}`,
      username: row.opponent.displayName,
      avatarUrl: row.opponent.avatarUrl,
      score: row.opponent.bestScore,
      rank: row.approxRank,
      combo: row.opponent.maxCombo,
    };
    nearbyPlayers.push(player);
    addPlayer(player);
  });

  if (me && !byClientId.has(me.clientId)) addPlayer(me);

  const players = Array.from(byClientId.values()).sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (b.score !== a.score) return b.score - a.score;
    return a.clientId.localeCompare(b.clientId);
  });
  const displayMe =
    me !== null
      ? (players.find((player) => player.clientId === me.clientId) ?? me)
      : null;
  const displayMeRank = displayMe?.rank ?? meRank;

  // Compute the gap to the visible player directly above the viewer's current
  // display rank.  This avoids comparing against a far-away top score when the
  // nearby window is already showing the correct local opponent.
  let snapshotNextTargetGap: number | null = null;
  let snapshotNextTargetName: string | null = null;

  const projectionNextTarget = findChallengeNextTarget({
    projection,
    displayMe,
    meScore,
  });

  if (projectionNextTarget) {
    snapshotNextTargetGap = Math.max(0, projectionNextTarget.score - meScore);
    snapshotNextTargetName = projectionNextTarget.username;
  } else if (typeof displayMeRank === "number" && displayMeRank > 1) {
    const nextTargetCandidates =
      selfDisplaySection === "nearby" ? nearbyPlayers : players;
    const immediateAbove = nextTargetCandidates
      .filter(
        (player) =>
          player.clientId !== displayMe?.clientId &&
          player.rank <= displayMeRank &&
          player.score >= meScore,
      )
      .sort((a, b) => b.rank - a.rank || a.score - b.score)[0];

    if (immediateAbove) {
      snapshotNextTargetGap = Math.max(0, immediateAbove.score - meScore);
      snapshotNextTargetName = immediateAbove.username;
    }
  }

  return createSnapshot(
    "challenge",
    players,
    displayMe,
    snapshotNextTargetGap,
    snapshotNextTargetName,
  );
};

export const buildMobileScoreFeedbackSnapshot = ({
  scope,
  participants,
  meClientId,
  challengeProjection,
}: {
  scope: MobileScoreFeedbackScope;
  participants: RoomParticipant[];
  meClientId: string | undefined;
  challengeProjection?: ChallengeProjectedLeaderboardResponse | null;
}): MobileScoreFeedbackSnapshot => {
  if (scope === "challenge") {
    const me = meClientId
      ? participants.find((participant) => participant.clientId === meClientId)
      : null;
    return buildChallengeMobileScoreFeedbackSnapshot({
      projection: challengeProjection ?? null,
      meClientId,
      meUsername: me?.username ?? null,
      meAvatarUrl: me?.avatar_url ?? me?.avatarUrl ?? null,
      meScore: me?.score ?? 0,
      meCombo: me?.combo ?? 0,
    });
  }

  return buildRoomMobileScoreFeedbackSnapshot(participants, meClientId);
};

const findPassedTarget = (
  prevSnapshot: MobileScoreFeedbackSnapshot,
  nextSnapshot: MobileScoreFeedbackSnapshot,
  oldRank: number,
  newRank: number,
): FeedbackPlayer | null => {
  if (newRank >= oldRank) return null;
  const nextMe = nextSnapshot.me;
  if (!nextMe) return null;

  // The player who held newRank before the jump is now at newRank+1 in
  // nextSnapshot, so the displaced player is directly below the viewer.
  const displaced = nextSnapshot.players.find(
    (p) => p.rank === newRank + 1 && p.clientId !== nextMe.clientId,
  ) ?? null;

  if (displaced) {
    return displaced;
  }

  // Fallback: look in prevSnapshot where the player was still at newRank
  const inPrev = prevSnapshot.players.find(
    (p) => p.rank === newRank && p.clientId !== prevSnapshot.me?.clientId,
  ) ?? null;
  if (inPrev) {
    return inPrev;
  }

  // Projection windows can be stale by one visible slot while the new request is
  // in-flight. Keep the swap feedback only when the next visible below-row is
  // still adjacent to the new rank; never jump to a far stale row such as #71
  // after the viewer already moved to #59.
  const adjacentVisibleBelow = nextSnapshot.players
    .filter(
      (player) =>
        player.clientId !== nextMe.clientId &&
        player.rank > newRank &&
        player.rank < oldRank &&
        player.rank - newRank <= 2 &&
        player.score <= nextMe.score,
    )
    .sort((a, b) => a.rank - b.rank)[0] ?? null;

  return adjacentVisibleBelow;
};

const findOvertakingTarget = (
  prevSnapshot: MobileScoreFeedbackSnapshot,
  nextSnapshot: MobileScoreFeedbackSnapshot,
  oldRank: number,
  newRank: number,
) =>
  nextSnapshot.players
    .filter((player) => player.rank > oldRank && player.rank <= newRank)
    .sort((a, b) => b.rank - a.rank)
    .find((player) => {
      const previousTargetRank = prevSnapshot.rankByClientId.get(
        player.clientId,
      );

      return (
        typeof previousTargetRank === "number" && previousTargetRank > oldRank
      );
    }) ?? null;

const findSameRankPassedTarget = (
  nextSnapshot: MobileScoreFeedbackSnapshot,
  prevScore: number,
): FeedbackPlayer | null => {
  const nextMe = nextSnapshot.me;
  if (!nextMe) return null;

  return nextSnapshot.players
    .filter(
      (player) =>
        player.clientId !== nextMe.clientId &&
        player.rank >= nextMe.rank &&
        player.rank <= nextMe.rank + 2 &&
        player.score < nextMe.score &&
        player.score >= prevScore,
    )
    .sort((a, b) => a.rank - b.rank || b.score - a.score)[0] ?? null;
};

export const buildMobileScoreFeedbackEvent = (
  prevSnapshot: MobileScoreFeedbackSnapshot | null,
  nextSnapshot: MobileScoreFeedbackSnapshot | null,
): MobileScoreFeedbackEvent | null => {
  const prevMe = prevSnapshot?.me ?? null;
  const nextMe = nextSnapshot?.me ?? null;
  if (
    !prevSnapshot ||
    !nextSnapshot ||
    prevSnapshot.scope !== nextSnapshot.scope ||
    !prevMe ||
    !nextMe
  ) {
    return null;
  }

  const prevScore = prevSnapshot.scoreByClientId.get(nextMe.clientId);
  const oldRank = prevSnapshot.rankByClientId.get(nextMe.clientId);
  const newRank = nextSnapshot.rankByClientId.get(nextMe.clientId);
  if (
    typeof prevScore !== "number" ||
    typeof oldRank !== "number" ||
    typeof newRank !== "number"
  ) {
    return null;
  }

  const scoreGain = nextMe.score - prevScore;

  if (newRank < oldRank) {
    const passedTarget = findPassedTarget(
      prevSnapshot,
      nextSnapshot,
      oldRank,
      newRank,
    );

    const isFirst = newRank === 1;
    const rawNextTarget = isFirst
      ? null
      : (nextSnapshot.players.find(
          (p) => p.rank === newRank - 1 && p.clientId !== nextSnapshot.me?.clientId,
        ) ?? null);

    // Guard: only trust the rank-based nextTarget if their settled score is
    // still >= the viewer's current score. A stale snapshot can place an
    // already-beaten player at newRank-1; Math.max(0, ...) would silently
    // clamp the negative gap to 0 and show a misleading zero-gap target.
    // When beaten, fall through to the snapshot-level gap/name which was
    // computed directly from projection data in buildChallengeMobileScoreFeedbackSnapshot.
    const nextTarget =
      rawNextTarget && rawNextTarget.score >= nextMe.score ? rawNextTarget : null;

    // Gap is nextTarget.score - me.score (always >= 0 when nextTarget is set).
    // Ties show a zero gap and keep the target name.
    const nextTargetGap =
      nextTarget !== null
        ? nextTarget.score - nextMe.score
        : nextSnapshot.nextTargetGap;
    const nextTargetName =
      nextTarget?.username ?? nextSnapshot.nextTargetName;

    const runnerUp = isFirst
      ? (nextSnapshot.players.find((p) => p.rank === 2) ?? null)
      : null;
    const leadScore =
      runnerUp !== null ? Math.max(0, nextMe.score - runnerUp.score) : null;

    return {
      type: "passed",
      scope: nextSnapshot.scope,
      scoreGain: Math.max(0, scoreGain),
      oldRank,
      newRank,
      me: nextMe,
      target: passedTarget,
      nextTarget,
      nextTargetGap,
      nextTargetName,
      runnerUp,
      leadScore,
    };
  }

  if (newRank > oldRank) {
    const overtakingTarget = findOvertakingTarget(
      prevSnapshot,
      nextSnapshot,
      oldRank,
      newRank,
    );

    const prevTargetScore = overtakingTarget
      ? prevSnapshot.scoreByClientId.get(overtakingTarget.clientId)
      : undefined;

    return {
      type: "overtaken",
      scope: nextSnapshot.scope,
      oldRank,
      newRank,
      me: nextMe,
      target: overtakingTarget,
      targetScoreGain:
        overtakingTarget && typeof prevTargetScore === "number"
          ? Math.max(0, overtakingTarget.score - prevTargetScore)
          : null,
    };
  }

  const sameRankPassedTarget =
    scoreGain > 0 ? findSameRankPassedTarget(nextSnapshot, prevScore) : null;
  if (sameRankPassedTarget) {
    return {
      type: "passed",
      scope: nextSnapshot.scope,
      scoreGain,
      oldRank,
      newRank,
      me: nextMe,
      target: sameRankPassedTarget,
      nextTarget: null,
      nextTargetGap: nextSnapshot.nextTargetGap,
      nextTargetName: nextSnapshot.nextTargetName,
      runnerUp: null,
      leadScore: null,
    };
  }

  // Rank unchanged but score increased: always show score feedback with gap info.
  if (scoreGain > 0) {
    const isFirst = newRank === 1;
    const runnerUp = isFirst
      ? (nextSnapshot.players.find((player) => player.rank === 2) ?? null)
      : null;

    return {
      type: "score",
      scope: nextSnapshot.scope,
      scoreGain,
      me: nextMe,
      target: null,
      remainingScore: null,
      runnerUp,
      leadScore:
        runnerUp !== null ? Math.max(0, nextMe.score - runnerUp.score) : null,
      nextTargetGap: nextSnapshot.nextTargetGap,
      nextTargetName: nextSnapshot.nextTargetName,
    };
  }

  return null;
};
