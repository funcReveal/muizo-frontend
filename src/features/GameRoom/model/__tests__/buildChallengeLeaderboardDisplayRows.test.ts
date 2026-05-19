import { describe, it, expect } from "vitest";
import {
  buildChallengeLeaderboardDisplayRows,
} from "../buildChallengeLeaderboardDisplayRows";
import type {
  ChallengeLeaderboardEntry,
  ChallengeNearbyOpponent,
  ChallengeProjectedLeaderboardResponse,
  ChallengeProjectedMyStanding,
} from "../projectionTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(userId: string, rank: number | null, bestScore: number): ChallengeLeaderboardEntry {
  return {
    userId,
    displayName: `Player ${userId}`,
    avatarUrl: null,
    rank,
    bestScore,
    maxCombo: 0,
    correctCount: null,
    avgCorrectMs: null,
  };
}

function makeNearbyOpponent(
  userId: string,
  rank: number | null,
  bestScore: number,
  viewerScore: number,
): ChallengeNearbyOpponent {
  const gap = bestScore - viewerScore;
  return {
    ...makeEntry(userId, rank, bestScore),
    gapFromMe: gap,
    relation: gap > 0 ? "ahead" : "passed",
  };
}

function makeStanding(
  projectedRank: number | null,
  liveScore = 500,
  viewerUserId = "me",
): ChallengeProjectedMyStanding {
  return {
    liveScore,
    officialBestScore: null,
    projectedRank,
    officialRank: null,
    totalPlayers: 100,
    rankIsFinal: false,
    viewerDbUserId: viewerUserId,
    nextTarget: null,
  };
}

function makeData(
  projectedRank: number | null,
  topEntries: ChallengeLeaderboardEntry[],
  nearbyOpponents: ChallengeNearbyOpponent[] = [],
  viewerUserId = "me",
  viewerScore = 500,
): ChallengeProjectedLeaderboardResponse {
  return {
    mode: "projected",
    roomId: "r1",
    collectionId: "c1",
    profileKey: "p1",
    questionIndex: null,
    generatedAt: new Date().toISOString(),
    topEntries,
    nearbyOpponents,
    myStanding: makeStanding(projectedRank, viewerScore, viewerUserId),
    cache: { source: "redis", ttlMs: 5000 },
  };
}

const tenTopEntries = Array.from({ length: 10 }, (_, i) =>
  makeEntry(`u${i + 1}`, i + 1, 2000 - i * 100),
);
// Scores: u1=2000, u2=1900, ..., u10=1100

const expectUniqueKeys = (
  rows: ReturnType<typeof buildChallengeLeaderboardDisplayRows>["listRows"],
) => {
  const keys = rows.map((row) => row.key);
  expect(new Set(keys).size).toBe(keys.length);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildChallengeLeaderboardDisplayRows", () => {

  // ?? Test case 1: projectedRank = 15 ???????????????????????????????????????
  it("projectedRank=15 ??nearby mode, top5 + ellipsis + nearby section", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 2000 - i * 100),
    );
    const data = makeData(15, topFive);

    const { layoutMode, listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 500,
      meUserId: "me",
    });

    expect(layoutMode).toBe("nearby");

    const topPlayerRows = listRows.filter(
      (r) => r.kind === "player" && r.section === "top",
    );
    expect(topPlayerRows).toHaveLength(5);

    const ellipsis = listRows.find((r) => r.kind === "ellipsis");
    expect(ellipsis).toBeDefined();
    expect(ellipsis?.key).toBe("ellipsis:nearby");

    const selfRow = listRows.find((r) => r.kind === "self");
    expect(selfRow).toBeDefined();
    expect(selfRow?.key).toBe("self:list");
    expect(selfRow?.section).toBe("nearby");
  });

  // ?? Test case 2: projectedRank = 12 ???????????????????????????????????????
  it("projectedRank=12 ??still uses nearby mode", () => {
    const data = makeData(12, tenTopEntries.slice(0, 5));

    const { layoutMode, listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 500,
      meUserId: "me",
    });

    expect(layoutMode).toBe("nearby");
    // ellipsis must be present
    expect(listRows.some((r) => r.kind === "ellipsis")).toBe(true);
  });

  // ?? Test case 3: projectedRank = 11 ???????????????????????????????????????
  it("projectedRank=11 ??top-eleven mode: top10 + self at #11, no ellipsis", () => {
    const data = makeData(11, tenTopEntries);

    const { layoutMode, listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 500,
      meUserId: "me",
    });

    expect(layoutMode).toBe("top-eleven");

    // No ellipsis in top-eleven mode
    expect(listRows.filter((r) => r.kind === "ellipsis")).toHaveLength(0);

    // Exactly 10 top player rows
    const topPlayerRows = listRows.filter(
      (r) => r.kind === "player" && r.section === "top",
    );
    expect(topPlayerRows).toHaveLength(10);

    // Self row at position 10 (index 10)
    const selfRow = listRows.find((r) => r.kind === "self");
    expect(selfRow).toBeDefined();
    expect(selfRow?.key).toBe("self:list");
    expect(selfRow?.section).toBe("top-eleven");
    const selfIdx = listRows.findIndex((r) => r.kind === "self");
    expect(selfIdx).toBe(10); // 11th slot, 0-based = 10

    // gapToNext = #10 score (2000-900=1100) - viewerScore (500) = 600
    expect(selfRow?.gapToNext).toBe(1100 - 500); // 600

    // liveGap should only be on rank-10 entry (index 9), null for others
    const topRows = topPlayerRows as Array<{ kind: "player"; section: "top"; liveGap: number | null }>;
    topRows.slice(0, 9).forEach((row) => {
      expect(row.liveGap).toBeNull();
    });
    expect(topRows[9].liveGap).toBe(600); // rank #10 gap
  });

  // ?? Test case 4: projectedRank = 10 ???????????????????????????????????????
  it("projectedRank=10 ??top-window mode: self at #10 slot, no ellipsis", () => {
    const data = makeData(10, tenTopEntries);

    const { layoutMode, listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 500,
      meUserId: "me",
    });

    expect(layoutMode).toBe("top-window");
    expect(listRows.filter((r) => r.kind === "ellipsis")).toHaveLength(0);
    expect(listRows).toHaveLength(11);

    const selfIdx = listRows.findIndex((r) => r.kind === "self");
    expect(selfIdx).toBe(9); // 0-based index 9 = rank 10

    // 10 player rows: keep one displaced official row at #11.
    expect(listRows.filter((r) => r.kind === "player")).toHaveLength(10);
  });

  // ?? Test case 5: projectedRank = 2 ????????????????????????????????????????
  it("projectedRank=2 ??self at slot #2, exactly one self row", () => {
    const data = makeData(2, tenTopEntries);

    const { layoutMode, listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 1900,
      meUserId: "me",
    });

    expect(layoutMode).toBe("top-window");

    const selfRows = listRows.filter((r) => r.kind === "self");
    expect(selfRows).toHaveLength(1);

    const selfIdx = listRows.findIndex((r) => r.kind === "self");
    expect(selfIdx).toBe(1); // 0-based index 1 = rank 2

    // 10 official player rows: keep one displaced row when self enters top 10.
    expect(listRows.filter((r) => r.kind === "player")).toHaveLength(10);
  });

  // ?? Test case 6: viewer already in topEntries ?????????????????????????????
  it("viewer in topEntries ??replaced by self row, official entry not shown", () => {
    // Viewer is at official rank 5 in topEntries
    const topWithMe = tenTopEntries.map((e, i) =>
      i === 4 ? makeEntry("me", 5, 1600) : e,
    );
    const data = makeData(5, topWithMe, [], "me", 1600);

    const { layoutMode, listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 1600,
      meUserId: "me",
    });

    expect(layoutMode).toBe("top-window");

    // Only one self row
    expect(listRows.filter((r) => r.kind === "self")).toHaveLength(1);

    // No player row with userId "me" (official entry filtered out)
    expect(listRows.filter((r) => r.kind === "player" && r.userId === "me")).toHaveLength(0);

    // Total = 10 rows (9 others + self)
    expect(listRows).toHaveLength(10);
  });

  // ?? Test case 7: stable keys across section transitions ???????????????????
  it("player:${userId} key is stable regardless of layout mode", () => {
    // u1 appears in top section in nearby mode
    const topFive = [makeEntry("u1", 1, 2000), ...Array.from({ length: 4 }, (_, i) => makeEntry(`u${i + 2}`, i + 2, 1900 - i * 100))];
    const nearbyData = makeData(15, topFive);
    const { listRows: nearbyRows } = buildChallengeLeaderboardDisplayRows({
      data: nearbyData,
      viewerScore: 500,
      meUserId: "me",
    });
    const u1Nearby = nearbyRows.find((r) => r.kind === "player" && r.userId === "u1");
    expect(u1Nearby?.key).toBe("player:u1");

    // u1 also appears in top section in top-eleven mode
    const topElevenData = makeData(11, tenTopEntries);
    const { listRows: topElevenRows } = buildChallengeLeaderboardDisplayRows({
      data: topElevenData,
      viewerScore: 500,
      meUserId: "me",
    });
    const u1TopEleven = topElevenRows.find((r) => r.kind === "player" && r.userId === "u1");
    expect(u1TopEleven?.key).toBe("player:u1");

    // self:list key is always the same in any mode
    expect(nearbyRows.find((r) => r.kind === "self")?.key).toBe("self:list");
    expect(topElevenRows.find((r) => r.kind === "self")?.key).toBe("self:list");
  });

  // ?? Test case 8: projectedRank = 1 ????????????????????????????????????????
  it("projectedRank=1 ??self at slot #1 (first position)", () => {
    const data = makeData(1, tenTopEntries);

    const { layoutMode, listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 2100,
      meUserId: "me",
    });

    expect(layoutMode).toBe("top-window");
    expect(listRows[0].kind).toBe("self");
    expect(listRows.filter((r) => r.kind === "player")).toHaveLength(10);
  });

  // ?? Test case 9: top-eleven liveGap correctness ???????????????????????????
  it("top-eleven gapToNext is positive when viewer is behind #10", () => {
    const data = makeData(11, tenTopEntries, [], "me", 500);
    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 500,
      meUserId: "me",
    });
    const selfRow = listRows.find((r) => r.kind === "self");
    // #10 score = 1100, viewerScore = 500, gap = 600 (viewer is behind)
    expect(selfRow?.gapToNext).toBe(600);
    expect(selfRow?.gapToNext).toBeGreaterThan(0);
  });

  it("top-eleven gapToNext is negative when viewer has surpassed #10 locally", () => {
    const data = makeData(11, tenTopEntries, [], "me", 1200);
    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 1200,
      meUserId: "me",
    });
    const selfRow = listRows.find((r) => r.kind === "self");
    // #10 score = 1100, viewerScore = 1200, gap = -100 (viewer has surpassed locally)
    expect(selfRow?.gapToNext).toBe(-100);
    expect(selfRow?.gapToNext).toBeLessThan(0);
  });

  // ?? Test case 10: top-window liveGap on other rows ????????????????????????
  it("top-window mode player rows have liveGap set correctly", () => {
    const data = makeData(5, tenTopEntries);
    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 1400,
      meUserId: "me",
    });

    const playerRows = listRows.filter(
      (r): r is Extract<typeof r, { kind: "player"; section: "top" }> =>
        r.kind === "player" && r.section === "top",
    );
    // u1 bestScore=2000, viewerScore=1400 ??liveGap=600 (viewer behind u1)
    const u1Row = playerRows.find((r) => r.userId === "u1");
    expect(u1Row?.liveGap).toBe(600);
  });

  // ?? Test case 11: list total row count ????????????????????????????????????
  it("nearby mode total row count = 5 top + ellipsis + 5 nearby = 11", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 2000 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("n1", 13, 520, 500),
      makeNearbyOpponent("n2", 14, 510, 500),
    ];
    const data = makeData(15, topFive, nearby, "me", 500);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 500,
      meUserId: "me",
    });

    // top 5 + ellipsis + 5 nearby slots = 11 rows
    expect(listRows).toHaveLength(11);
  });

  // ?? Test case 12: top-eleven when topEntries < 10 uses placeholders ????????
  it("top-eleven with fewer than 10 topEntries adds placeholder rows", () => {
    const fewEntries = Array.from({ length: 7 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 2000 - i * 100),
    );
    const data = makeData(11, fewEntries);

    const { layoutMode, listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 500,
      meUserId: "me",
    });

    expect(layoutMode).toBe("top-eleven");
    // 7 players + 3 placeholders + 1 self = 11
    expect(listRows).toHaveLength(11);
    const placeholders = listRows.filter((r) => r.kind === "placeholder");
    expect(placeholders).toHaveLength(3);
    // gapToNext is null because #10 entry doesn't exist
    const selfRow = listRows.find((r) => r.kind === "self");
    expect(selfRow?.gapToNext).toBeNull();
  });

  it("nearby mode filters opponents already rendered in top5 to avoid duplicate keys", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 2000 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("u5", 12, 1600, 500),
      makeNearbyOpponent("n1", 13, 520, 500),
      makeNearbyOpponent("n2", 14, 510, 500),
    ];
    const data = makeData(15, topFive, nearby, "me", 500);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 500,
      meUserId: "me",
    });

    const keys = listRows.map((row) => row.key);
    expectUniqueKeys(listRows);
    expect(keys).toContain("self:list");
    expect(keys).not.toContain("player:me");

    const duplicateTopPlayerInNearby = listRows.find(
      (row) =>
        row.kind === "player" &&
        row.section === "nearby" &&
        row.userId === "u5",
    );
    expect(duplicateTopPlayerInNearby).toBeUndefined();
  });

  it("keeps player and self keys unique across projected rank changes", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 2000 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("u5", 12, 1600, 500),
      makeNearbyOpponent("n1", 13, 520, 500),
      makeNearbyOpponent("n2", 14, 510, 500),
      makeNearbyOpponent("n3", 15, 480, 500),
    ];
    const nearbyData = makeData(15, topFive, nearby, "me", 500);
    const topWindowData = makeData(4, tenTopEntries, nearby, "me", 1700);

    const nearbyRows = buildChallengeLeaderboardDisplayRows({
      data: nearbyData,
      viewerScore: 500,
      meUserId: "me",
    }).listRows;
    const topWindowRows = buildChallengeLeaderboardDisplayRows({
      data: topWindowData,
      viewerScore: 1700,
      meUserId: "me",
    }).listRows;

    expectUniqueKeys(nearbyRows);
    expectUniqueKeys(topWindowRows);
    expect(nearbyRows.find((row) => row.kind === "self")?.key).toBe("self:list");
    expect(topWindowRows.find((row) => row.kind === "self")?.key).toBe("self:list");
    expect(
      nearbyRows.find((row) => row.kind === "player" && row.userId === "u1")
        ?.key,
    ).toBe("player:u1");
    expect(
      topWindowRows.find((row) => row.kind === "player" && row.userId === "u1")
        ?.key,
    ).toBe("player:u1");
  });

  it("nearby mode locally advances self rank across visible stale rows", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank10", 10, 885, 800),
      makeNearbyOpponent("rank12", 12, 800, 800),
      makeNearbyOpponent("rank13", 13, 570, 800),
    ];
    const data = makeData(14, topFive, nearby, "me", 500);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 845,
      meUserId: "me",
    });

    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );
    const selfRow = nearbyRows.find((row) => row.kind === "self");
    const rank12Row = nearbyRows.find(
      (row) => row.kind === "player" && row.userId === "rank12",
    );
    const rank13Row = nearbyRows.find(
      (row) => row.kind === "player" && row.userId === "rank13",
    );

    expect(selfRow?.displayRank).toBe(12);
    expect(
      rank12Row?.kind === "player" && rank12Row.section === "nearby"
        ? rank12Row.approxRank
        : null,
    ).toBe(13);
    expect(
      rank13Row?.kind === "player" && rank13Row.section === "nearby"
        ? rank13Row.approxRank
        : null,
    ).toBe(14);
    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" && row.section === "nearby" ? `${row.userId}:${row.approxRank}` : row.kind))
      .toEqual(["placeholder", "rank10:11", "self", "rank12:13", "rank13:14"]);
  });

  it("nearby mode starts at zero with four ahead players and self at the bottom", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank73", 73, 500, 0),
      makeNearbyOpponent("rank74", 74, 400, 0),
      makeNearbyOpponent("rank75", 75, 300, 0),
      makeNearbyOpponent("rank76", 76, 180, 0),
    ];
    const data = makeData(77, topFive, nearby, "me", 0);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 0,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank73", "rank74", "rank75", "rank76", "self"]);
    expect(nearbyRows.find((row) => row.kind === "self")?.displayRank).toBe(77);
  });

  it("nearby mode keeps self at the bottom when the viewer is the last ranked player", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank73", 73, 500, 85),
      makeNearbyOpponent("rank74", 74, 400, 85),
      makeNearbyOpponent("rank75", 75, 300, 85),
      makeNearbyOpponent("rank76", 76, 180, 85),
    ];
    const data = makeData(77, topFive, nearby, "me", 85);
    data.myStanding.totalPlayers = 77;

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 85,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank73", "rank74", "rank75", "rank76", "self"]);
  });

  it("nearby mode shows one passed row after only one player has been passed", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank69", 69, 875, 820),
      makeNearbyOpponent("rank70", 70, 835, 820),
      makeNearbyOpponent("rank71", 71, 820, 820),
      makeNearbyOpponent("rank73", 73, 805, 820),
    ];
    const data = makeData(72, topFive, nearby, "me", 820);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 820,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank69", "rank70", "rank71", "self", "rank73"]);
    expect(nearbyRows.find((row) => row.kind === "self")?.displayRank).toBe(72);
  });

  it("nearby mode reserves one below slot when live self is inserted after official tail", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank73", 73, 255, 195),
      makeNearbyOpponent("rank74", 74, 210, 195),
      makeNearbyOpponent("rank75", 75, 210, 195),
      makeNearbyOpponent("rank77", 77, 180, 195),
    ];
    const data = makeData(76, topFive, nearby, "me", 195);
    data.myStanding.totalPlayers = 76;

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 195,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank73", "rank74", "rank75", "self", "rank77"]);
    expect(nearbyRows.find((row) => row.kind === "self")?.displayRank).toBe(76);
  });

  it("nearby mode centers after two passed players even when totalPlayers excludes live self", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank71", 71, 550, 285),
      makeNearbyOpponent("rank72", 72, 535, 285),
      makeNearbyOpponent("rank74", 74, 255, 285),
      makeNearbyOpponent("rank75", 75, 210, 285),
    ];
    const data = makeData(73, topFive, nearby, "me", 285);
    data.myStanding.totalPlayers = 76;

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 285,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank71", "rank72", "self", "rank74", "rank75"]);
    expect(nearbyRows.find((row) => row.kind === "self")?.displayRank).toBe(73);
  });

  it("nearby mode treats tied players with better ranks as ahead and still fills two passed rows", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank52", 52, 1215, 1190),
      makeNearbyOpponent("rank53", 53, 1190, 1190),
      makeNearbyOpponent("rank55", 55, 1150, 1190),
      makeNearbyOpponent("rank56", 56, 1140, 1190),
      makeNearbyOpponent("rank57", 57, 1100, 1190),
      makeNearbyOpponent("rank58", 58, 1025, 1190),
    ];
    const data = makeData(54, topFive, nearby, "me", 1190);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 1190,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank52", "rank53", "self", "rank55", "rank56"]);
    expect(nearbyRows.find((row) => row.kind === "self")?.displayRank).toBe(54);
  });

  it("nearby mode treats tied players with lower ranks as passed rows", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank70", 70, 535, 210),
      makeNearbyOpponent("rank71", 71, 255, 210),
      makeNearbyOpponent("rank72", 72, 210, 210),
      makeNearbyOpponent("rank73", 73, 210, 210),
      makeNearbyOpponent("rank75", 75, 210, 210),
      makeNearbyOpponent("rank76", 76, 180, 210),
    ];
    const data = makeData(74, topFive, nearby, "me", 210);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 210,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank72", "rank73", "self", "rank75", "rank76"]);
  });

  it("nearby mode does not fill missing below-rank slots with farther ahead players", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank70", 70, 535, 210),
      makeNearbyOpponent("rank71", 71, 255, 210),
      makeNearbyOpponent("rank72", 72, 210, 210),
      makeNearbyOpponent("rank73", 73, 210, 210),
    ];
    const data = makeData(74, topFive, nearby, "me", 210);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 210,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank72", "rank73", "self", "placeholder", "placeholder"]);
  });

  it("nearby mode falls back to relation and score when nearby ranks are missing", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      { ...makeNearbyOpponent("ahead-far", null, 535, 250), relation: "ahead" as const },
      { ...makeNearbyOpponent("ahead-close", null, 255, 250), relation: "ahead" as const },
      { ...makeNearbyOpponent("tied-ahead", null, 250, 250), relation: "ahead" as const },
      { ...makeNearbyOpponent("tied-passed", null, 250, 250), relation: "passed" as const },
      { ...makeNearbyOpponent("passed-close", null, 210, 250), relation: "passed" as const },
      { ...makeNearbyOpponent("passed-far", null, 180, 250), relation: "passed" as const },
    ];
    const data = makeData(74, topFive, nearby, "me", 250);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 250,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["ahead-close", "tied-ahead", "self", "tied-passed", "passed-close"]);
  });

  it("nearby mode shows two ahead players once backend refreshes a centered self window", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank71", 71, 520, 460),
      makeNearbyOpponent("rank72", 72, 480, 460),
      makeNearbyOpponent("rank74", 74, 430, 460),
      makeNearbyOpponent("rank75", 75, 420, 460),
    ];
    const data = makeData(73, topFive, nearby, "me", 460);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 460,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" ? row.userId : row.kind))
      .toEqual(["rank71", "rank72", "self", "rank74", "rank75"]);
    expect(nearbyRows.find((row) => row.kind === "self")?.displayRank).toBe(73);
  });

  it("nearby mode locally advances self across visible ahead rows while waiting for backend refresh", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank48", 48, 1310, 1260),
      makeNearbyOpponent("rank49", 49, 1265, 1260),
      makeNearbyOpponent("rank51", 51, 1235, 1260),
      makeNearbyOpponent("rank52", 52, 1220, 1260),
    ];
    const data = makeData(50, topFive, nearby, "me", 1260);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 1345,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self" : row.kind === "player" && row.section === "nearby" ? `${row.userId}:${row.approxRank}` : row.kind))
      .toEqual(["placeholder", "placeholder", "self", "rank48:49", "rank49:50"]);
    expect(nearbyRows.find((row) => row.kind === "self")?.displayRank).toBe(48);
  });

  it("nearby mode shifts visible lower rows after self to avoid duplicate ranks", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank81", 81, 255, 205),
      makeNearbyOpponent("rank82", 82, 210, 205),
      makeNearbyOpponent("rank83", 83, 210, 205),
      makeNearbyOpponent("rank84-original", 84, 180, 205),
    ];
    const data = makeData(84, topFive, nearby, "me", 205);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 205,
      meUserId: "me",
      sessionPassCount: 1,
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self:84" : row.kind === "player" && row.section === "nearby" ? `${row.userId}:${row.approxRank}` : row.kind))
      .toEqual(["rank81:81", "rank82:82", "rank83:83", "self:84", "rank84-original:85"]);
  });

  it("nearby mode labels visible rows around self sequentially without missing ranks", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank9", 9, 12405, 9975),
      makeNearbyOpponent("rank10", 10, 12035, 9975),
      makeNearbyOpponent("rank13", 13, 9105, 9975),
      makeNearbyOpponent("rank14", 14, 8845, 9975),
    ];
    const data = makeData(12, topFive, nearby, "me", 9975);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 9975,
      meUserId: "me",
      sessionPassCount: 2,
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    expect(nearbyRows.map((row) => row.kind === "self" ? "self:12" : row.kind === "player" && row.section === "nearby" ? `${row.userId}:${row.approxRank}` : row.kind))
      .toEqual(["rank9:10", "rank10:11", "self:12", "rank13:13", "rank14:14"]);
  });

  // isAhead tiebreaker: same projected rank, opponent has higher score
  it("nearby mode keeps opponent above self when same projected rank but opponent has higher score", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    // Backend projects Dream at #84. Opponent is also at projected #84 but
    // their bestScore (200) is higher than Dream's live score (195).
    // This can occur when backend data is momentarily stale mid-question.
    // Opponent should appear ABOVE Dream, not below.
    const nearby = [
      makeNearbyOpponent("rank82", 82, 230, 195),
      makeNearbyOpponent("rank83", 83, 210, 195),
      makeNearbyOpponent("rank84-highscore", 84, 200, 195),  // same rank as self, higher score
      makeNearbyOpponent("rank85", 85, 180, 195),
    ];
    const data = makeData(84, topFive, nearby, "me", 195);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 195,
      meUserId: "me",
      sessionPassCount: 1,
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    // rank84-highscore outscores Dream → shows above Dream
    const highScoreRow = nearbyRows.find(
      (row) => row.kind === "player" && row.section === "nearby" && row.userId === "rank84-highscore",
    );
    const selfRow = nearbyRows.find((row) => row.kind === "self");
    const highScoreIdx = nearbyRows.indexOf(highScoreRow!);
    const selfIdx = nearbyRows.indexOf(selfRow!);
    expect(highScoreIdx).toBeLessThan(selfIdx);
  });

  // isAhead tiebreaker: same projected rank, opponent has lower score (already passed)
  it("nearby mode displaces to rank+1 when same projected rank and opponent has lower score", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    const nearby = [
      makeNearbyOpponent("rank82", 82, 230, 205),
      makeNearbyOpponent("rank83", 83, 210, 205),
      makeNearbyOpponent("rank84-lowscore", 84, 180, 205),  // same rank as self, lower score
    ];
    const data = makeData(84, topFive, nearby, "me", 205);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 205,
      meUserId: "me",
      sessionPassCount: 1,
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    // 3 above slots but only 2 ahead opponents → one placeholder, then rank82, rank83, self, rank84-lowscore
    // rank84-lowscore was beaten (205 > 180) → sits below Dream at rank 85
    expect(nearbyRows.map((row) =>
      row.kind === "self"
        ? "self:84"
        : row.kind === "player" && row.section === "nearby"
          ? `${row.userId}:${row.approxRank}`
          : row.kind,
    )).toEqual(["placeholder", "rank82:82", "rank83:83", "self:84", "rank84-lowscore:85"]);
  });

  // byRank tiebreaker: two opponents with equal getRank — higher score sorts first
  it("nearby mode sorts equal-rank opponents by score descending", () => {
    const topFive = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`u${i + 1}`, i + 1, 3500 - i * 100),
    );
    // Two opponents with same backend rank but different scores.
    // The one with the higher score should appear closer to the top (ahead).
    const nearby = [
      makeNearbyOpponent("tied-low", 83, 210, 195),
      makeNearbyOpponent("tied-high", 83, 250, 195),
    ];
    const data = makeData(84, topFive, nearby, "me", 195);

    const { listRows } = buildChallengeLeaderboardDisplayRows({
      data,
      viewerScore: 195,
      meUserId: "me",
    });
    const nearbyRows = listRows.slice(
      listRows.findIndex((row) => row.kind === "ellipsis") + 1,
    );

    const tiedHighIdx = nearbyRows.findIndex(
      (row) => row.kind === "player" && row.section === "nearby" && row.userId === "tied-high",
    );
    const tiedLowIdx = nearbyRows.findIndex(
      (row) => row.kind === "player" && row.section === "nearby" && row.userId === "tied-low",
    );
    // tied-high (score 250) appears before tied-low (score 210)
    expect(tiedHighIdx).not.toBe(-1);
    expect(tiedLowIdx).not.toBe(-1);
    expect(tiedHighIdx).toBeLessThan(tiedLowIdx);
  });
});
