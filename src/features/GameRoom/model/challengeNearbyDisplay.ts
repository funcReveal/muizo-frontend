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
  slots?: number;
  /**
   * How many opponents the viewer has overtaken in this session.
   * 0: self at bottom, 1: one row below self, >=2: self centered.
   */
  sessionPassCount?: number;
}

/**
 * Builds the fixed-height nearby section for the challenge leaderboard.
 *
 * Nearby mode keeps a stable 5-slot window while moving self upward only
 * through reserved below slots:
 *
 *   0 passes: 4 above + self
 *   1 pass: 3 above + self + 1 below
 *   >=2 passes: 2 above + self + 2 below
 *
 * The top-window / top-eleven modes handle the climb once projectedRank reaches
 * 12 or better. Missing above/below slots become placeholders so the 5-slot
 * section remains fixed height.
 *
 * All entries — including the viewer's own settled historical record when it
 * falls within the nearby score window — are rendered as normal opponent rows
 * with the same display style (no YOU badge, no special label). The live self
 * is always shown separately via the dedicated self row (kind: "self").
 *
 * Ranks:
 *   Backend sets opponent.rank via projectedRank offsets. Used directly;
 *   approx fallback is computed only when opponent.rank is absent.
 */
export function buildChallengeNearbyDisplayRows({
  nearbyOpponents,
  myStanding,
  liveScore,
  slots = 5,
  sessionPassCount = 0,
}: BuildNearbyDisplayRowsInput): ChallengeDisplayRow[] {
  const { projectedRank, totalPlayers } = myStanding;

  // Use nearbyOpponents as-is. The backend is the sole authority on which
  // entries appear in the nearby window, including the viewer's own settled
  // historical entry when its score falls within the window range.
  const opponents = nearbyOpponents;

  const maxBelowSlots = Math.floor((slots - 1) / 2);
  const belowSlots = Math.min(
    maxBelowSlots,
    Math.max(0, Math.floor(sessionPassCount)),
  );
  const aboveSlots = slots - 1 - belowSlots;
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
      // Same projected rank can happen while local score is ahead of cached data.
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
      return b.bestScore - a.bestScore;
    }
    if (rankA !== null) return -1;
    if (rankB !== null) return 1;
    return b.bestScore - a.bestScore;
  };

  const aheadSorted = opponents.filter(isAhead).sort(byRank);
  const passedSorted = opponents
    .filter((opponent) => !isAhead(opponent))
    .sort(byRank);
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
    const fallbackRank = projectedRank !== null ? projectedRank + i + 1 : null;
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

  return normalizeVisibleRanks(rows, effectiveSelfRank);
}

function clampRank(rank: number | null, totalPlayers: number): number | null {
  if (rank === null) return null;
  return Math.max(1, totalPlayers > 0 ? Math.min(totalPlayers, rank) : rank);
}

function normalizeVisibleRanks(
  rows: ChallengeDisplayRow[],
  selfRank: number | null,
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
    .map((row, index) =>
      row.type === "opponent" ? selfIndex + 1 + index : null,
    )
    .filter((index): index is number => index !== null);

  const nextRows = rows.slice();
  const firstAboveRank = selfRank - aboveOpponentIndexes.length;

  aboveOpponentIndexes.forEach((rowIndex, index) => {
    const row = nextRows[rowIndex];
    if (row.type !== "opponent") return;
    nextRows[rowIndex] = {
      ...row,
      approxRank: clampDisplayRank(firstAboveRank + index),
    };
  });

  belowOpponentIndexes.forEach((rowIndex, index) => {
    const row = nextRows[rowIndex];
    if (row.type !== "opponent") return;
    nextRows[rowIndex] = {
      ...row,
      approxRank: clampDisplayRank(selfRank + index + 1),
    };
  });

  return nextRows;
}

function clampDisplayRank(rank: number): number {
  return Math.max(1, rank);
}
