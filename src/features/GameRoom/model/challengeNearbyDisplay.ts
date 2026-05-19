import type {
  ChallengeNearbyOpponent,
  ChallengeProjectedMyStanding,
} from "./projectionTypes";

export type ChallengeDisplayRow =
  | {
      type: "opponent";
      opponent: ChallengeNearbyOpponent;
      approxRank: number | null;
      /** bestScore - currentLiveScore. Positive = opponent is ahead; negative = we surpassed them. */
      liveGap: number;
      key: string;
    }
  | {
      type: "self";
      standing: ChallengeProjectedMyStanding;
      approxRank: number | null;
      key: string;
    }
  | { type: "placeholder"; key: string };

interface BuildNearbyDisplayRowsInput {
  nearbyOpponents: ChallengeNearbyOpponent[];
  myStanding: ChallengeProjectedMyStanding;
  /** Current live score from room participant state, not the API-time score. */
  liveScore: number;
  meUserId: string | null;
  slots?: number;
  /**
   * How many opponents the viewer has overtaken in this game session (0 / 1 / ≥2).
   * Controls the viewer's vertical position inside the nearby window:
   *   0 → viewer pinned at bottom   (4 above, 0 below)
   *   1 → viewer one from bottom    (3 above, 1 below)
   *   ≥2 → viewer centred (locked)  (2 above, 2 below)
   */
  sessionPassCount?: number;
}

/**
 * Builds the fixed-height nearby section for the challenge leaderboard.
 *
 * Slot allocation — driven by sessionPassCount (how many opponents overtaken
 * during this game session), NOT by absolute rank position:
 *
 *   sessionPassCount=0  → 4 above, 0 below  — viewer starts pinned at bottom
 *   sessionPassCount=1  → 3 above, 1 below  — moves up after first overtake
 *   sessionPassCount≥2  → 2 above, 2 below  — centred and locked for rest of game
 *
 * This gives players a sense of "climbing" rather than always being in the
 * middle.  The backend returns 4 ahead + 2 passed, so all cases are covered.
 *
 * Opponent selection:
 *   above — the aboveSlots players with ranks just above viewer (closest first from bottom)
 *   below — the belowSlots players with ranks just below viewer (closest first from top)
 *
 * Ranks:
 *   Backend sets opponent.rank via projectedRank ± offset. Used directly; approx fallback
 *   is computed only when opponent.rank is absent.
 */
export function buildChallengeNearbyDisplayRows({
  nearbyOpponents,
  myStanding,
  liveScore,
  meUserId,
  slots = 5,
  sessionPassCount = 0,
}: BuildNearbyDisplayRowsInput): ChallengeDisplayRow[] {
  const { projectedRank, totalPlayers } = myStanding;

  const opponents = meUserId
    ? nearbyOpponents.filter((opponent) => opponent.userId !== meUserId)
    : nearbyOpponents;

  const maxBelowSlots = Math.floor((slots - 1) / 2);
  const rankByUserId = new Map<string, number | null>(
    opponents.map((opponent) => [opponent.userId, opponent.rank]),
  );

  let effectiveSelfRank = projectedRank;
  if (effectiveSelfRank !== null) {
    opponents
      .filter(
        (opponent) =>
          opponent.rank !== null &&
          opponent.rank < effectiveSelfRank! &&
          liveScore > opponent.bestScore,
      )
      .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
      .forEach((opponent) => {
        if (effectiveSelfRank === null) return;
        rankByUserId.set(opponent.userId, effectiveSelfRank);
        effectiveSelfRank -= 1;
      });
  }

  const getRank = (opponent: ChallengeNearbyOpponent): number | null =>
    rankByUserId.get(opponent.userId) ?? opponent.rank;

  const isAhead = (opponent: ChallengeNearbyOpponent): boolean => {
    const rank = getRank(opponent);
    if (rank !== null && effectiveSelfRank !== null) {
      if (rank !== effectiveSelfRank) return rank < effectiveSelfRank;
      // rank === effectiveSelfRank: backend projected both at the same position.
      // Use score as tiebreaker — a higher bestScore means the opponent is still
      // ahead of Dream's current live run, even if the projected rank is tied.
      return opponent.bestScore > liveScore;
    }
    return opponent.relation === "ahead";
  };

  const byRank = (
    a: ChallengeNearbyOpponent,
    b: ChallengeNearbyOpponent,
  ): number => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    if (rankA !== null && rankB !== null) {
      if (rankA !== rankB) return rankA - rankB;
      // Equal rank: higher score ranks better (closer to the top of the list).
      return b.bestScore - a.bestScore;
    }
    if (rankA !== null) return -1;
    if (rankB !== null) return 1;
    return b.bestScore - a.bestScore;
  };

  const aheadSorted = opponents.filter(isAhead).sort(byRank);
  const passedSorted = opponents.filter((opponent) => !isAhead(opponent)).sort(byRank);
  const shouldReserveBelowSlots =
    effectiveSelfRank !== null &&
    liveScore > 0 &&
    (totalPlayers <= 0 || effectiveSelfRank < totalPlayers);
  const belowSlots = Math.min(
    maxBelowSlots,
    passedSorted.length > 0
      ? Math.max(sessionPassCount, passedSorted.length)
      : shouldReserveBelowSlots
        ? maxBelowSlots
        : sessionPassCount,
  );
  const aboveSlots = slots - 1 - belowSlots;
  const above = aheadSorted.slice(-aboveSlots);
  const below = passedSorted.slice(0, belowSlots);

  const rows: ChallengeDisplayRow[] = [];

  for (let i = 0; i < aboveSlots - above.length; i += 1) {
    rows.push({ type: "placeholder", key: `ap:${i}` });
  }

  above.forEach((opponent, i) => {
    const fallbackRank =
      projectedRank !== null ? projectedRank - (above.length - i) : null;
    const rank = getRank(opponent);
    rows.push({
      type: "opponent",
      opponent,
      approxRank: clampRank(rank ?? fallbackRank, totalPlayers),
      liveGap: opponent.bestScore - liveScore,
      key: opponent.userId,
    });
  });

  rows.push({
    type: "self",
    standing: myStanding,
    approxRank: effectiveSelfRank,
    key: "self",
  });

  below.forEach((opponent, i) => {
    const fallbackRank =
      projectedRank !== null ? projectedRank + i + 1 : null;
    const rank = getRank(opponent);
    rows.push({
      type: "opponent",
      opponent,
      approxRank: clampRank(rank ?? fallbackRank, totalPlayers),
      liveGap: opponent.bestScore - liveScore,
      key: opponent.userId,
    });
  });

  for (let i = 0; i < belowSlots - below.length; i += 1) {
    rows.push({ type: "placeholder", key: `pp:${i}` });
  }

  return normalizeVisibleRanks(rows, effectiveSelfRank, totalPlayers);
}

function clampRank(
  rank: number | null,
  totalPlayers: number,
): number | null {
  if (rank === null) return null;
  return Math.max(1, totalPlayers > 0 ? Math.min(totalPlayers, rank) : rank);
}

function normalizeVisibleRanks(
  rows: ChallengeDisplayRow[],
  selfRank: number | null,
  totalPlayers: number,
): ChallengeDisplayRow[] {
  if (selfRank === null) return rows;

  const selfIndex = rows.findIndex((row) => row.type === "self");
  if (selfIndex < 0) return rows;

  const aboveOpponentIndexes = rows
    .slice(0, selfIndex)
    .map((row, index) => (row.type === "opponent" ? index : null))
    .filter((index): index is number => index !== null);
  const belowOpponentIndexes = rows
    .slice(selfIndex + 1)
    .map((row, index) => (row.type === "opponent" ? selfIndex + 1 + index : null))
    .filter((index): index is number => index !== null);

  const nextRows = rows.slice();
  const firstAboveRank = selfRank - aboveOpponentIndexes.length;

  aboveOpponentIndexes.forEach((rowIndex, index) => {
    const row = nextRows[rowIndex];
    if (row.type !== "opponent") return;
    nextRows[rowIndex] = {
      ...row,
      approxRank: clampRank(firstAboveRank + index, totalPlayers),
    };
  });

  belowOpponentIndexes.forEach((rowIndex, index) => {
    const row = nextRows[rowIndex];
    if (row.type !== "opponent") return;
    nextRows[rowIndex] = {
      ...row,
      approxRank: clampRank(selfRank + index + 1, totalPlayers),
    };
  });

  return nextRows;
}
