/**
 * buildChallengeLeaderboardDisplayRows
 *
 * Pure function that converts raw API projection data into a flat, ordered list
 * of typed display rows for the challenge leaderboard panel.
 *
 * Layout modes
 * top-window: projectedRank <= 11, official Top 11 + live self inserted.
 * top-eleven: projectedRank = 12, official Top 11 + live self at #12.
 * nearby: projectedRank >= 13 or null, Top 7 + ellipsis + nearby rows.
 *
 * Important UI model rule
 * The viewer's official best record and the viewer's current live run are NOT
 * the same UI row.
 *
 * - official best row = settled historical leaderboard record
 * - live self row = current in-room score
 *
 * Therefore, the same userId may appear twice only when:
 * viewerScore < officialSelfEntry.bestScore
 *
 * In that case:
 * - official self row stays visible as a normal official row
 * - live self row displays YOU
 */

import type {
  ChallengeLeaderboardEntry,
  ChallengeNearbyOpponent,
  ChallengeProjectedLeaderboardResponse,
} from "./projectionTypes";
import { buildChallengeNearbyDisplayRows } from "./challengeNearbyDisplay";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ChallengeLayoutMode = "top-window" | "top-eleven" | "nearby";

export type ChallengeLeaderboardDisplayRow =
  | {
      kind: "player";
      /** `player:${userId}` - official leaderboard row */
      key: string;
      userId: string;
      section: "top";
      entry: ChallengeLeaderboardEntry;

      /**
       * Rank shown in the UI after live self is inserted.
       * This may differ from entry.rank.
       */
      displayRank: number | null;

      /**
       * True when this row is the viewer's settled official best record.
       * This row must NOT show YOU and must NOT use self highlight.
       */
      isViewerHistoricalBest: boolean;

      /**
       * entry.bestScore - viewerScore.
       * null means this row does not display the gap.
       */
      liveGap: number | null;
    }
  | {
      kind: "player";
      /** `nearby-slot:${index}` - fixed nearby visual slot */
      key: string;
      userId: string;
      section: "nearby";
      opponent: ChallengeNearbyOpponent;
      approxRank: number | null;
      /** bestScore - liveScore. Positive = ahead; negative = passed. */
      liveGap: number;
    }
  | {
      kind: "self";
      /** Fixed key for the list row; sticky bar must NOT share this key. */
      key: "self:list";
      section: "top-window" | "top-eleven" | "nearby";

      /**
       * Rank shown in the UI.
       * In top-window / top-eleven this is the display position.
       * In nearby this is usually projectedRank.
       */
      displayRank: number | null;

      /**
       * Gap to the player directly above self in the displayed list.
       * Positive = behind; negative = already surpassed locally.
       */
      gapToNext: number | null;
    }
  | {
      kind: "ellipsis";
      key: "ellipsis:nearby";
    }
  | {
      kind: "placeholder";
      key: string;
      /**
       * When present, renders as `#N` in the rank column.
       * Used to evoke "waiting for others to fill these spots" when the
       * challenge has fewer than 12 participants.
       */
      displayRank?: number;
    };

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

interface BuildInput {
  data: ChallengeProjectedLeaderboardResponse;
  viewerScore: number;
  meUserId: string | null;
  /**
   * Controls nearby self placement: 0 passes = bottom, 1 = one row below,
   * 2+ = centered. Backend rank/score data remains authoritative.
   */
  sessionPassCount?: number;
}

export function buildChallengeLeaderboardDisplayRows({
  data,
  viewerScore,
  meUserId,
  sessionPassCount = 0,
}: BuildInput): {
  layoutMode: ChallengeLayoutMode;
  listRows: ChallengeLeaderboardDisplayRow[];
} {
  const projectedRank = data.myStanding.projectedRank;

  const layoutMode: ChallengeLayoutMode =
    projectedRank !== null && projectedRank <= 11
      ? "top-window"
      : projectedRank === 12
        ? "top-eleven"
        : "nearby";

  switch (layoutMode) {
    case "top-window":
      return {
        layoutMode,
        listRows: buildTopWindowRows(
          data,
          viewerScore,
          meUserId,
          projectedRank!,
        ),
      };
    case "top-eleven":
      return {
        layoutMode,
        listRows: buildTopElevenRows(data, viewerScore, meUserId),
      };
    case "nearby":
      return {
        layoutMode,
        listRows: buildNearbyRows(data, viewerScore, meUserId, sessionPassCount),
      };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTopPlayerRow = (
  entry: ChallengeLeaderboardEntry,
  meUserId: string | null,
  displayRank: number | null,
  liveGap: number | null,
): ChallengeLeaderboardDisplayRow => ({
  kind: "player",
  key: `player:${entry.userId}`,
  userId: entry.userId,
  section: "top",
  entry,
  displayRank,
  isViewerHistoricalBest: meUserId !== null && entry.userId === meUserId,
  liveGap,
});

const getDisplayScore = (
  row: ChallengeLeaderboardDisplayRow,
): number | null => {
  if (row.kind === "player" && row.section === "top") {
    return row.entry.bestScore;
  }

  if (row.kind === "player" && row.section === "nearby") {
    return row.opponent.bestScore;
  }

  return null;
};

const finalizeSequentialTopRows = (
  rows: ChallengeLeaderboardDisplayRow[],
  viewerScore: number,
): ChallengeLeaderboardDisplayRow[] => {
  return rows.map((row, index) => {
    const displayRank = index + 1;

    if (row.kind === "player" && row.section === "top") {
      return {
        ...row,
        displayRank,
        liveGap: row.entry.bestScore - viewerScore,
      };
    }

    if (row.kind === "self") {
      const previousRow = index > 0 ? rows[index - 1] : null;
      const previousScore = previousRow ? getDisplayScore(previousRow) : null;

      return {
        ...row,
        displayRank,
        gapToNext: previousScore !== null ? previousScore - viewerScore : null,
      };
    }

    return row;
  });
};

// ---------------------------------------------------------------------------
// top-window mode (projectedRank <= 11)
// ---------------------------------------------------------------------------

/**
 * Total rows always rendered in top-window and top-eleven modes.
 * Matches the room leaderboard slot count so the panel never feels sparse
 * when a challenge is new and has fewer than 12 participants.
 */
const CHALLENGE_LB_DISPLAY_ROWS = 12;

function buildTopWindowRows(
  data: ChallengeProjectedLeaderboardResponse,
  viewerScore: number,
  meUserId: string | null,
  projectedRank: number,
): ChallengeLeaderboardDisplayRow[] {
  const TARGET = 11;

  const rawTopEntries = data.topEntries.slice(0, TARGET);

  const officialSelfEntry =
    meUserId !== null
      ? (rawTopEntries.find((entry) => entry.userId === meUserId) ?? null)
      : null;

  /**
   * If the current live score is still lower than the official best,
   * keep the official self row as a normal historical official row.
   *
   * If live score reaches/exceeds official best, remove the historical self
   * entry and let the live self row become the only self-like row.
   */
  const shouldRemoveOfficialSelf =
    officialSelfEntry !== null && viewerScore >= officialSelfEntry.bestScore;

  const officialCandidates = rawTopEntries.filter(
    (entry) => !(shouldRemoveOfficialSelf && entry.userId === meUserId),
  );

  const insertIdx = Math.max(
    0,
    Math.min(projectedRank - 1, officialCandidates.length),
  );

  const rows: ChallengeLeaderboardDisplayRow[] = [];

  officialCandidates.forEach((entry, index) => {
    if (index === insertIdx) {
      rows.push({
        kind: "self",
        key: "self:list",
        section: "top-window",
        displayRank: null,
        gapToNext: null,
      });
    }

    rows.push(makeTopPlayerRow(entry, meUserId, null, null));
  });

  if (!rows.some((row) => row.kind === "self")) {
    rows.push({
      kind: "self",
      key: "self:list",
      section: "top-window",
      displayRank: null,
      gapToNext: null,
    });
  }

  /**
   * Keep one displaced row when possible.
   *
   * Example:
   * official #10 Shiriusu
   * live self projected #10
   *
   * UI should show:
   * #10 self
   * #11 Shiriusu
   */
  const maxRows = officialCandidates.length >= TARGET ? TARGET + 1 : TARGET;

  const finalized = finalizeSequentialTopRows(rows.slice(0, maxRows), viewerScore);

  // Pad to CHALLENGE_LB_DISPLAY_ROWS with ranked placeholder rows so the
  // panel always shows the same height. Each placeholder carries its sequential
  // rank number to evoke "waiting for others to play and fill these spots."
  if (finalized.length >= CHALLENGE_LB_DISPLAY_ROWS) {
    return finalized;
  }

  const result: ChallengeLeaderboardDisplayRow[] = [...finalized];
  for (let i = finalized.length; i < CHALLENGE_LB_DISPLAY_ROWS; i += 1) {
    result.push({
      kind: "placeholder",
      key: `placeholder:top:${i}`,
      displayRank: i + 1,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// top-eleven mode (projectedRank = 12)
// ---------------------------------------------------------------------------

function buildTopElevenRows(
  data: ChallengeProjectedLeaderboardResponse,
  viewerScore: number,
  meUserId: string | null,
): ChallengeLeaderboardDisplayRow[] {
  const TARGET = 11;
  const topEleven = data.topEntries.slice(0, TARGET);

  const rows: ChallengeLeaderboardDisplayRow[] = topEleven.map((entry, index) =>
    makeTopPlayerRow(
      entry,
      meUserId,
      index + 1,
      index === TARGET - 1 ? entry.bestScore - viewerScore : null,
    ),
  );

  for (let i = topEleven.length; i < TARGET; i += 1) {
    rows.push({ kind: "placeholder", key: `placeholder:top:${i}`, displayRank: i + 1 });
  }

  const gapToNext =
    topEleven.length >= TARGET ? topEleven[TARGET - 1].bestScore - viewerScore : null;

  rows.push({
    kind: "self",
    key: "self:list",
    section: "top-eleven",
    displayRank: TARGET + 1,
    gapToNext,
  });

  return rows;
}

// ---------------------------------------------------------------------------
// nearby mode (projectedRank >= 13 or null)
// ---------------------------------------------------------------------------

function buildNearbyRows(
  data: ChallengeProjectedLeaderboardResponse,
  viewerScore: number,
  meUserId: string | null,
  sessionPassCount: number,
): ChallengeLeaderboardDisplayRow[] {
  const TARGET_TOP = 7;

  // Nearby mode always keeps the official top section capped at seven rows.
  const topDisplay = data.topEntries.slice(0, TARGET_TOP);
  const topUserIds = new Set(topDisplay.map((entry) => entry.userId));
  const nearbyOpponents = data.nearbyOpponents.filter(
    (opponent) => !topUserIds.has(opponent.userId),
  );
  const rows: ChallengeLeaderboardDisplayRow[] = [];

  topDisplay.forEach((entry) => {
    rows.push(makeTopPlayerRow(entry, meUserId, entry.rank, null));
  });

  for (let i = topDisplay.length; i < TARGET_TOP; i += 1) {
    rows.push({ kind: "placeholder", key: `placeholder:top:${i}` });
  }

  rows.push({ kind: "ellipsis", key: "ellipsis:nearby" });

  const nearbyDisplayRows = buildChallengeNearbyDisplayRows({
    nearbyOpponents,
    myStanding: data.myStanding,
    liveScore: viewerScore,
    slots: 5,
    sessionPassCount,
  });

  nearbyDisplayRows.forEach((row, slotIndex) => {
    const slotKey = `nearby-slot:${slotIndex}`;
    if (row.type === "opponent") {
      rows.push({
        kind: "player",
        key: slotKey,
        userId: row.opponent.userId,
        section: "nearby",
        opponent: row.opponent,
        approxRank: row.approxRank,
        liveGap: row.liveGap,
      });
    } else if (row.type === "self") {
      rows.push({
        kind: "self",
        key: "self:list",
        section: "nearby",
        displayRank: row.approxRank,
        gapToNext: null,
      });
    } else {
      rows.push({
        kind: "placeholder",
        key: slotKey,
      });
    }
  });

  return rows;
}
