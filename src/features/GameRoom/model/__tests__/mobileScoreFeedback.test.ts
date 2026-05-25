import { describe, expect, it } from "vitest";

import {
  buildChallengeMobileScoreFeedbackSnapshot,
  buildMobileScoreFeedbackEvent,
  buildRoomMobileScoreFeedbackSnapshot,
  type FeedbackPlayer,
  type MobileScoreFeedbackSnapshot,
} from "../mobileScoreFeedback";
import type { RoomParticipant } from "@features/RoomSession";
import { shouldDelayChallengeScoreFeedback } from "../useMobileScoreFeedback";
import type {
  ChallengeLeaderboardEntry,
  ChallengeNearbyOpponent,
  ChallengeProjectedLeaderboardResponse,
} from "../projectionTypes";

function makePlayer(
  clientId: string,
  rank: number,
  score: number,
): FeedbackPlayer {
  return {
    clientId,
    username: clientId,
    avatarUrl: null,
    score,
    rank,
    combo: 0,
  };
}

function makeParticipant(
  clientId: string,
  score: number,
  combo = 0,
): RoomParticipant {
  return {
    clientId,
    username: clientId,
    avatar_url: null,
    joinedAt: 0,
    isOnline: true,
    lastSeen: 0,
    score,
    combo,
  };
}

function makeSnapshot(
  players: FeedbackPlayer[],
  meClientId = "me",
  nextTargetGap: number | null = null,
  nextTargetName: string | null = null,
): MobileScoreFeedbackSnapshot {
  const me = players.find((player) => player.clientId === meClientId) ?? null;
  return {
    scope: "challenge",
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
  };
}

function makeEntry(
  userId: string,
  rank: number | null,
  bestScore: number,
): ChallengeLeaderboardEntry {
  return {
    userId,
    displayName: userId,
    avatarUrl: null,
    rank,
    bestScore,
    maxCombo: 0,
    correctCount: null,
    avgCorrectMs: null,
  };
}

function makeOpponent(
  userId: string,
  rank: number | null,
  bestScore: number,
  liveScore: number,
): ChallengeNearbyOpponent {
  return {
    ...makeEntry(userId, rank, bestScore),
    gapFromMe: bestScore - liveScore,
    relation: bestScore >= liveScore ? "ahead" : "passed",
  };
}

function makeProjection({
  projectedRank,
  liveScore,
  nearbyOpponents,
  nextTarget = null,
}: {
  projectedRank: number;
  liveScore: number;
  nearbyOpponents: ChallengeNearbyOpponent[];
  nextTarget?: ChallengeProjectedLeaderboardResponse["myStanding"]["nextTarget"];
}): ChallengeProjectedLeaderboardResponse {
  return {
    mode: "projected",
    roomId: "room",
    collectionId: "collection",
    profileKey: "profile",
    questionIndex: 1,
    generatedAt: new Date(0).toISOString(),
    topEntries: Array.from({ length: 5 }, (_, index) =>
      makeEntry(`top-${index + 1}`, index + 1, 5000 - index * 100),
    ),
    nearbyOpponents,
    myStanding: {
      liveScore,
      officialBestScore: null,
      projectedRank,
      officialRank: null,
      totalPlayers: 77,
      rankIsFinal: false,
      viewerDbUserId: "me-user",
      nextTarget,
    },
    cache: { source: "redis", ttlMs: 5000 },
  };
}

describe("buildMobileScoreFeedbackEvent", () => {
  it("includes the previous room-ranked player gap in room score feedback", () => {
    const prevSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("leader", 1300),
        makeParticipant("me", 180, 3),
      ],
      "me",
    );
    const nextSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("leader", 1300),
        makeParticipant("me", 460, 4),
      ],
      "me",
    );

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("score");
    if (event?.type !== "score") return;
    expect(event.scope).toBe("room");
    expect(event.scoreGain).toBe(280);
    expect(event.nextTargetGap).toBe(840);
    expect(event.nextTargetName).toBe("leader");
  });

  it("includes runner-up lead data when the room leader gains score", () => {
    const prevSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("me", 1000, 2),
        makeParticipant("runner-up", 800),
      ],
      "me",
    );
    const nextSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("me", 1120, 3),
        makeParticipant("runner-up", 800),
      ],
      "me",
    );

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("score");
    if (event?.type !== "score") return;
    expect(event.scope).toBe("room");
    expect(event.leadScore).toBe(320);
    expect(event.runnerUp?.username).toBe("runner-up");
  });

  it("includes the overtaking room player for avatar and name feedback", () => {
    const prevSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("me", 1000),
        makeParticipant("rival", 900),
      ],
      "me",
    );
    const nextSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("rival", 1300),
        makeParticipant("me", 1000),
      ],
      "me",
    );

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("overtaken");
    if (event?.type !== "overtaken") return;
    expect(event.oldRank).toBe(1);
    expect(event.newRank).toBe(2);
    expect(event.target?.clientId).toBe("rival");
    expect(event.target?.username).toBe("rival");
    expect(event.target?.rank).toBe(1);
    expect(event.targetScoreGain).toBe(400);
    expect(event.scoreGain).toBe(0);
    expect(event.nextTargetGap).toBe(300);
    expect(event.nextTargetName).toBe("rival");
  });

  it("uses the highest-ranked player who overtook me when multiple room players pass", () => {
    const prevSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("me", 1000),
        makeParticipant("rival-a", 900),
        makeParticipant("rival-b", 800),
      ],
      "me",
    );
    const nextSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("rival-b", 1500),
        makeParticipant("rival-a", 1400),
        makeParticipant("me", 1000),
      ],
      "me",
    );

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("overtaken");
    if (event?.type !== "overtaken") return;
    expect(event.target?.clientId).toBe("rival-b");
    expect(event.target?.rank).toBe(1);
  });

  it("keeps my score gain and comeback gap when I score but get overtaken", () => {
    const prevSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("me", 1000, 2),
        makeParticipant("rival", 900),
      ],
      "me",
    );
    const nextSnapshot = buildRoomMobileScoreFeedbackSnapshot(
      [
        makeParticipant("rival", 1500),
        makeParticipant("me", 1120, 3),
      ],
      "me",
    );

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("overtaken");
    if (event?.type !== "overtaken") return;
    expect(event.scoreGain).toBe(120);
    expect(event.nextTargetGap).toBe(380);
    expect(event.nextTargetName).toBe("rival");
  });

  it("uses the highest-ranked passed player after my new rank", () => {
    const prevSnapshot = makeSnapshot([
      makePlayer("r14", 14, 400),
      makePlayer("r16", 16, 330),
      makePlayer("r17", 17, 320),
      makePlayer("me", 20, 250),
    ]);
    const nextSnapshot = makeSnapshot([
      makePlayer("r14", 14, 400),
      makePlayer("me", 15, 360),
      makePlayer("r16", 16, 330),
      makePlayer("r17", 17, 320),
      makePlayer("r20", 20, 240),
    ]);

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("passed");
    if (event?.type !== "passed") return;
    expect(event.oldRank).toBe(20);
    expect(event.newRank).toBe(15);
    expect(event.target?.clientId).toBe("r16");
    expect(event.target?.rank).toBe(16);
  });

  it("falls back to the previous window when displaced player absent from nextSnapshot", () => {
    // Viewer jumps rank 20 ??15.  The displaced player ("r15") held rank 15
    // before the jump and should appear in nextSnapshot at rank 16 (+1 shift),
    // but here nextSnapshot only contains the viewer.  The fallback searches
    // prevSnapshot for p.rank === newRank (15) and finds "r15".
    const prevSnapshot = makeSnapshot([
      makePlayer("r15", 15, 380),
      makePlayer("r16", 16, 330),
      makePlayer("r17", 17, 320),
      makePlayer("me", 20, 250),
    ]);
    const nextSnapshot = makeSnapshot([makePlayer("me", 15, 360)]);

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("passed");
    if (event?.type !== "passed") return;
    expect(event.target?.clientId).toBe("r15");
    expect(event.target?.rank).toBe(15);
  });

  it("does not show a stale old-window target when a large rank jump misses the new neighbor", () => {
    const prevSnapshot = makeSnapshot([
      makePlayer("r71", 71, 330),
      makePlayer("me", 72, 250),
    ]);
    const nextSnapshot = makeSnapshot([
      makePlayer("r58", 58, 400),
      makePlayer("me", 59, 500),
      makePlayer("r71", 71, 330),
    ]);

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("passed");
    if (event?.type !== "passed") return;
    expect(event.oldRank).toBe(72);
    expect(event.newRank).toBe(59);
    expect(event.target).toBeNull();
  });

  it("uses the nearest adjacent visible below-row when exact displaced rank is missing", () => {
    const prevSnapshot = makeSnapshot([
      makePlayer("r62", 62, 1080),
      makePlayer("me", 66, 980),
    ]);
    const nextSnapshot = makeSnapshot([
      makePlayer("r62", 62, 1080),
      makePlayer("me", 63, 1040),
      makePlayer("r65", 65, 1020),
    ]);

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("passed");
    if (event?.type !== "passed") return;
    expect(event.target?.clientId).toBe("r65");
    expect(event.target?.rank).toBe(65);
  });

  it("shows score feedback, not swap feedback, when rank stays unchanged", () => {
    const prevSnapshot = makeSnapshot([
      makePlayer("me", 84, 120),
      makePlayer("dog", 84, 180),
    ]);
    const nextSnapshot = makeSnapshot([
      makePlayer("me", 84, 210),
      makePlayer("dog", 84, 180),
    ]);

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("score");
    if (event?.type !== "score") return;
    expect(event.me.rank).toBe(84);
    expect(event.scoreGain).toBe(90);
  });

  it("shows the immediate lower-ranked player after a large rank jump when available", () => {
    const prevSnapshot = makeSnapshot([
      makePlayer("r71", 71, 330),
      makePlayer("me", 72, 250),
    ]);
    const nextSnapshot = makeSnapshot([
      makePlayer("r58", 58, 600),
      makePlayer("me", 59, 500),
      makePlayer("r60", 60, 490),
      makePlayer("r71", 71, 330),
    ]);

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("passed");
    if (event?.type !== "passed") return;
    expect(event.target?.clientId).toBe("r60");
    expect(event.target?.rank).toBe(60);
  });

  it("uses challenge display ranks so a locally shifted nearby player can be the passed target", () => {
    const prevProjection = makeProjection({
      projectedRank: 74,
      liveScore: 195,
      nearbyOpponents: [
        makeOpponent("rank72", 72, 535, 195),
        makeOpponent("rank73", 73, 255, 195),
        makeOpponent("rank74", 74, 210, 195),
        makeOpponent("rank75", 75, 180, 195),
      ],
    });
    const nextProjection = makeProjection({
      projectedRank: 73,
      liveScore: 315,
      nearbyOpponents: [
        makeOpponent("rank72", 72, 535, 315),
        makeOpponent("rank73", 73, 255, 315),
        makeOpponent("rank74", 74, 210, 315),
        makeOpponent("rank75", 75, 180, 315),
      ],
    });
    const prevSnapshot = buildChallengeMobileScoreFeedbackSnapshot({
      projection: prevProjection,
      meClientId: "me",
      meUsername: "Dream",
      meAvatarUrl: null,
      meScore: 195,
      meCombo: 1,
    });
    const nextSnapshot = buildChallengeMobileScoreFeedbackSnapshot({
      projection: nextProjection,
      meClientId: "me",
      meUsername: "Dream",
      meAvatarUrl: null,
      meScore: 315,
      meCombo: 3,
    });

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("passed");
    if (event?.type !== "passed") return;
    expect(event.oldRank).toBe(74);
    expect(event.newRank).toBe(73);
    expect(event.target?.clientId).toBe("challenge:rank73");
    expect(event.target?.username).toBe("rank73");
    expect(event.target?.rank).toBe(74);
  });

  it("uses the visible player directly above me for the challenge gap text", () => {
    const projection = makeProjection({
      projectedRank: 41,
      liveScore: 1760,
      nearbyOpponents: [
        makeOpponent("rank39", 39, 1825, 1760),
        makeOpponent("rank40", 40, 1805, 1760),
        makeOpponent("rank42", 42, 1725, 1760),
        makeOpponent("rank43", 43, 1650, 1760),
      ],
    });
    const snapshot = buildChallengeMobileScoreFeedbackSnapshot({
      projection,
      meClientId: "me",
      meUsername: "Dream",
      meAvatarUrl: null,
      meScore: 1760,
      meCombo: 3,
    });

    expect(snapshot.nextTargetGap).toBe(45);
    expect(snapshot.nextTargetName).toBe("rank40");
  });

  it("uses raw nearby opponents for same-rank challenge target gaps", () => {
    const projection = makeProjection({
      projectedRank: 76,
      liveScore: 195,
      nearbyOpponents: [
        makeOpponent("rank73", 73, 255, 195),
        makeOpponent("rank74", 74, 210, 195),
        makeOpponent("rank75", 75, 210, 195),
        makeOpponent("rank76", 76, 195, 195),
      ],
    });
    const snapshot = buildChallengeMobileScoreFeedbackSnapshot({
      projection,
      meClientId: "me",
      meUsername: "Dream",
      meAvatarUrl: null,
      meScore: 195,
      meCombo: 2,
    });

    expect(snapshot.nextTargetGap).toBe(0);
    expect(snapshot.nextTargetName).toBe("rank76");
  });

  it("does not fall back to a far-away backend nextTarget for challenge gap text", () => {
    const projection = makeProjection({
      projectedRank: 63,
      liveScore: 1030,
      nearbyOpponents: [
        makeOpponent("rank61", 61, 1100, 1030),
        makeOpponent("rank62", 62, 1080, 1030),
        makeOpponent("rank64", 64, 1025, 1030),
        makeOpponent("rank65", 65, 1010, 1030),
      ],
      nextTarget: {
        userId: "top5",
        displayName: "Oiiu",
        avatarUrl: null,
        score: 14185,
        gap: 13155,
      },
    });

    const snapshot = buildChallengeMobileScoreFeedbackSnapshot({
      projection,
      meClientId: "me",
      meUsername: "Dream",
      meAvatarUrl: null,
      meScore: 1030,
      meCombo: 2,
    });

    expect(snapshot.nextTargetGap).toBe(50);
    expect(snapshot.nextTargetName).toBe("rank62");
  });

  it("uses backend authoritative nextTarget when nearby window does not include the above player", () => {
    const projection = makeProjection({
      projectedRank: 41,
      liveScore: 1760,
      nearbyOpponents: [
        makeOpponent("rank42", 42, 1725, 1760),
        makeOpponent("rank43", 43, 1650, 1760),
      ],
      nextTarget: {
        userId: "rank40",
        displayName: "rank40",
        avatarUrl: null,
        rank: 40,
        score: 1805,
        gap: 45,
      },
    });

    const snapshot = buildChallengeMobileScoreFeedbackSnapshot({
      projection,
      meClientId: "me",
      meUsername: "Dream",
      meAvatarUrl: null,
      meScore: 1760,
      meCombo: 3,
    });

    expect(snapshot.nextTargetGap).toBe(45);
    expect(snapshot.nextTargetName).toBe("rank40");
  });

  it("does not compare nearby-mode challenge feedback against far-away top rows", () => {
    const projection = makeProjection({
      projectedRank: 31,
      liveScore: 2475,
      nearbyOpponents: [
        makeOpponent("rank29", 29, 2690, 2475),
        makeOpponent("rank30", 30, 2600, 2475),
        makeOpponent("rank32", 32, 2390, 2475),
        makeOpponent("rank33", 33, 2390, 2475),
      ],
    });
    projection.topEntries = [
      makeEntry("top-1", 1, 43140),
      makeEntry("top-2", 2, 30620),
      makeEntry("top-3", 3, 19455),
      makeEntry("top-4", 4, 16215),
      makeEntry("Oiiu", 5, 14185),
    ];

    const snapshot = buildChallengeMobileScoreFeedbackSnapshot({
      projection,
      meClientId: "me",
      meUsername: "Dream",
      meAvatarUrl: null,
      meScore: 2475,
      meCombo: 8,
    });

    expect(snapshot.nextTargetGap).toBe(125);
    expect(snapshot.nextTargetName).toBe("rank30");
  });

  it("leaves challenge next target unknown when nearby window has no above player", () => {
    const projection = makeProjection({
      projectedRank: 31,
      liveScore: 2475,
      nearbyOpponents: [
        makeOpponent("rank32", 32, 2390, 2475),
        makeOpponent("rank33", 33, 2390, 2475),
      ],
    });
    projection.topEntries = [
      makeEntry("top-1", 1, 43140),
      makeEntry("top-2", 2, 30620),
      makeEntry("top-3", 3, 19455),
      makeEntry("top-4", 4, 16215),
      makeEntry("Oiiu", 5, 14185),
    ];

    const snapshot = buildChallengeMobileScoreFeedbackSnapshot({
      projection,
      meClientId: "me",
      meUsername: "Dream",
      meAvatarUrl: null,
      meScore: 2475,
      meCombo: 8,
    });

    expect(snapshot.nextTargetGap).toBeNull();
    expect(snapshot.nextTargetName).toBeNull();
  });

  it("uses the updated visible above player for passed-event gap text", () => {
    const prevSnapshot = makeSnapshot([
      makePlayer("rank62", 62, 1080),
      makePlayer("rank63", 63, 1030),
      makePlayer("me", 64, 1000),
    ]);
    const nextSnapshot = makeSnapshot(
      [
        makePlayer("rank62", 62, 1080),
        makePlayer("me", 63, 1040),
        makePlayer("rank64", 64, 1030),
      ],
      "me",
      40,
      "rank62",
    );

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("passed");
    if (event?.type !== "passed") return;
    expect(event.target?.clientId).toBe("rank64");
    expect(event.nextTargetGap).toBe(40);
    expect(event.nextTargetName).toBe("rank62");
  });

  it("keeps score follow-up target data after a rank change", () => {
    const prevSnapshot = makeSnapshot([makePlayer("rank75", 75, 210), makePlayer("me", 76, 195)]);
    const nextSnapshot = makeSnapshot(
      [
        makePlayer("rank73", 73, 255),
        makePlayer("me", 74, 225),
        makePlayer("rank75", 75, 210),
      ],
      "me",
      30,
      "rank73",
    );

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("passed");
    if (event?.type !== "passed") return;
    expect(event.scoreGain).toBe(30);
    expect(event.nextTargetGap).toBe(30);
    expect(event.nextTargetName).toBe("rank73");
  });

  it("includes runner-up lead data when rank one gains score", () => {
    const prevSnapshot = makeSnapshot([
      makePlayer("me", 1, 1000),
      makePlayer("rank2", 2, 960),
    ]);
    const nextSnapshot = makeSnapshot([
      makePlayer("me", 1, 1120),
      makePlayer("rank2", 2, 960),
    ]);

    const event = buildMobileScoreFeedbackEvent(prevSnapshot, nextSnapshot);

    expect(event?.type).toBe("score");
    if (event?.type !== "score") return;
    expect(event.scoreGain).toBe(120);
    expect(event.runnerUp?.clientId).toBe("rank2");
    expect(event.leadScore).toBe(160);
  });

  it("only delays challenge score feedback after reaching the projected target", () => {
    const scoreEvent = {
      type: "score" as const,
      scope: "challenge" as const,
      scoreGain: 120,
      me: makePlayer("me", 76, 315),
      target: null,
      remainingScore: null,
      runnerUp: null,
      leadScore: null,
      nextTargetGap: 40,
      nextTargetName: "rank75",
    };
    const staleBelowTargetProjection = makeProjection({
      projectedRank: 76,
      liveScore: 195,
      nearbyOpponents: [],
      nextTarget: {
        userId: "rank75",
        displayName: "rank75",
        avatarUrl: null,
        rank: 75,
        score: 360,
        gap: 165,
      },
    });
    const staleCrossedTargetProjection = makeProjection({
      projectedRank: 76,
      liveScore: 195,
      nearbyOpponents: [],
      nextTarget: {
        userId: "rank75",
        displayName: "rank75",
        avatarUrl: null,
        rank: 75,
        score: 300,
        gap: 105,
      },
    });
    const currentProjection = makeProjection({
      projectedRank: 75,
      liveScore: 315,
      nearbyOpponents: [],
    });

    expect(shouldDelayChallengeScoreFeedback(scoreEvent, staleBelowTargetProjection))
      .toBe(false);
    expect(shouldDelayChallengeScoreFeedback(scoreEvent, staleCrossedTargetProjection))
      .toBe(true);
    expect(shouldDelayChallengeScoreFeedback(scoreEvent, currentProjection))
      .toBe(false);
  });
});
