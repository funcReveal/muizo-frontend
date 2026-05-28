import { afterEach, describe, expect, it } from "vitest";
import type {
  ChallengeNearbyOpponent,
  ChallengeProjectedLeaderboardResponse,
} from "../projectionTypes";
import {
  cancelScheduledInitialProjectionFetch,
  CLIENT_COOLDOWN_MS,
  getAdaptiveProjectionInitialJitterMs,
  getProjectionCacheEntry,
  getProjectionCacheKey,
  getProjectionSessionKey,
  PROJECTION_CACHE_FRESH_MS,
  projectionCacheByKey,
  shouldStartProjectionFetch,
  shouldUseFreshProjectionCache,
} from "../useChallengeLeaderboardProjection";
import { shouldRefreshChallengeProjectionForScoreGain } from "../challengeProjectionRefreshPolicy";

function makeData(
  overrides: Partial<ChallengeProjectedLeaderboardResponse> = {},
): ChallengeProjectedLeaderboardResponse {
  return {
    mode: "projected",
    roomId: "room-1",
    collectionId: "collection-1",
    profileKey: "profile-1",
    questionIndex: 2,
    generatedAt: new Date(0).toISOString(),
    topEntries: [],
    nearbyOpponents: [],
    viewerSettledEntry: null,
    myStanding: {
      liveScore: 100,
      officialBestScore: null,
      projectedRank: null,
      officialRank: null,
      totalPlayers: 10,
      rankIsFinal: false,
      viewerDbUserId: "me",
      nextTarget: null,
    },
    cache: { source: "redis", ttlMs: 5000 },
    ...overrides,
  };
}

function makeOpponent(bestScore: number): ChallengeNearbyOpponent {
  return {
    userId: `u-${bestScore}`,
    displayName: `Player ${bestScore}`,
    avatarUrl: null,
    rank: null,
    bestScore,
    maxCombo: 0,
    correctCount: null,
    avgCorrectMs: null,
    gapFromMe: bestScore - 100,
    relation: bestScore > 100 ? "ahead" : "passed",
  };
}

describe("challenge leaderboard projection request guards", () => {
  it("builds a stable cache key from room, game run, and player only", () => {
    expect(getProjectionCacheKey("room-1", "session:7", "client-1"))
      .toBe("room-1:session:7:client-1");
  });

  it("keeps projection session stable across question switches", () => {
    const firstQuestionKey = getProjectionSessionKey({
      roomId: "room-1",
      gameSessionId: 7,
    });
    const secondQuestionKey = getProjectionSessionKey({
      roomId: "room-1",
      gameSessionId: 7,
    });

    expect(firstQuestionKey).toBe("session:7");
    expect(secondQuestionKey).toBe(firstQuestionKey);
  });

  it("same cache key repeated initial decision does not start a second request while in flight", () => {
    const entry = getProjectionCacheEntry("initial-in-flight");
    entry.inFlight = Promise.resolve(null);

    expect(
      shouldStartProjectionFetch({
        entry,
        now: 1000,
        force: false,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: false, cause: "in_flight" });
  });

  it("cancels a stale initial schedule so StrictMode cleanup can reschedule preload", () => {
    const entry = getProjectionCacheEntry("strict-initial-schedule");
    entry.initialScheduled = true;

    cancelScheduledInitialProjectionFetch("strict-initial-schedule");

    expect(entry.initialScheduled).toBe(false);
    expect(
      shouldStartProjectionFetch({
        entry,
        now: 1000,
        force: false,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: true });
  });

  it("fresh cache is reused after remount instead of fetching", () => {
    const entry = getProjectionCacheEntry("fresh-remount");
    entry.data = makeData();
    entry.loadedAt = 5000;

    expect(shouldUseFreshProjectionCache(entry, 5000 + 999))
      .toBe(true);
    expect(
      shouldStartProjectionFetch({
        entry,
        now: 5000 + 999,
        force: false,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: false, cause: "fresh_cache" });
  });

  it("bounds fresh cache by the server ttl and client upper bound", () => {
    const shortTtl = getProjectionCacheEntry("short-ttl");
    shortTtl.data = makeData({ cache: { source: "redis", ttlMs: 1000 } });
    shortTtl.loadedAt = 10_000;

    const longTtl = getProjectionCacheEntry("long-ttl");
    longTtl.data = makeData({ cache: { source: "redis", ttlMs: 60_000 } });
    longTtl.loadedAt = 10_000;

    expect(shouldUseFreshProjectionCache(shortTtl, 10_999)).toBe(true);
    expect(shouldUseFreshProjectionCache(shortTtl, 11_001)).toBe(false);
    expect(shouldUseFreshProjectionCache(longTtl, 10_000 + PROJECTION_CACHE_FRESH_MS - 1))
      .toBe(true);
    expect(shouldUseFreshProjectionCache(longTtl, 10_000 + PROJECTION_CACHE_FRESH_MS + 1))
      .toBe(false);
  });

  it("uses wider initial jitter for larger rooms", () => {
    expect(getAdaptiveProjectionInitialJitterMs(10)).toBe(0);
    expect(getAdaptiveProjectionInitialJitterMs(80)).toBe(2000);
    expect(getAdaptiveProjectionInitialJitterMs(250)).toBe(4000);
    expect(getAdaptiveProjectionInitialJitterMs(1000)).toBe(5000);
  });

  it("manual refresh does not create a duplicate request while in flight", () => {
    const entry = getProjectionCacheEntry("manual-in-flight");
    entry.inFlight = Promise.resolve(null);

    expect(
      shouldStartProjectionFetch({
        entry,
        now: 1000,
        force: true,
        clientCooldownMs: CLIENT_COOLDOWN_MS,
      }),
    ).toEqual({ shouldFetch: false, cause: "in_flight" });
  });

  it("429 server cooldown blocks every fetch reason until nextAllowedAt", () => {
    const entry = getProjectionCacheEntry("server-cooldown");
    entry.nextAllowedAt = 9000;

    expect(
      shouldStartProjectionFetch({
        entry,
        now: 8000,
        force: true,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: false, cause: "server_cooldown" });
  });

  it("429 with existing data can keep loaded data available", () => {
    const entry = getProjectionCacheEntry("429-loaded");
    const data = makeData();
    entry.data = data;
    entry.loadedAt = 1000;
    entry.lastErrorStatus = 429;
    entry.nextAllowedAt = 6000;

    expect(entry.data).toBe(data);
    expect(shouldUseFreshProjectionCache(entry, 2000)).toBe(true);
  });

  it("page_visible uses fresh cache without fetching", () => {
    const entry = getProjectionCacheEntry("page-visible-fresh");
    entry.data = makeData();
    entry.loadedAt = 1000;

    expect(
      shouldStartProjectionFetch({
        entry,
        now: 2000,
        force: false,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: false, cause: "fresh_cache" });
  });

  it("auth_ready uses fresh cache without fetching", () => {
    const entry = getProjectionCacheEntry("auth-ready-fresh");
    entry.data = makeData();
    entry.loadedAt = 1000;

    expect(
      shouldStartProjectionFetch({
        entry,
        now: 2000,
        force: false,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: false, cause: "fresh_cache" });
  });

  it("nearby boundary crossed is immediate when not blocked by in-flight or server cooldown", () => {
    const entry = getProjectionCacheEntry("nearby-client-cooldown");
    entry.lastFetchAt = 1000;

    expect(
      shouldStartProjectionFetch({
        entry,
        now: 1000,
        force: false,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: true });

    entry.inFlight = Promise.resolve(null);
    expect(
      shouldStartProjectionFetch({
        entry,
        now: 1000,
        force: false,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: false, cause: "in_flight" });
  });

  it("manual refresh still uses the full client cooldown", () => {
    const entry = getProjectionCacheEntry("manual-client-cooldown");
    entry.lastFetchAt = 1000;

    expect(
      shouldStartProjectionFetch({
        entry,
        now: 1000 + 1_000,
        force: true,
        clientCooldownMs: CLIENT_COOLDOWN_MS,
      }),
    ).toEqual({ shouldFetch: false, cause: "client_cooldown" });
  });

  it("nearby boundary crossed bypasses fresh cache after cooldown", () => {
    const entry = getProjectionCacheEntry("nearby-fresh-boundary");
    entry.data = makeData();
    entry.loadedAt = 10_000;
    entry.lastFetchAt = 10_000;

    expect(
      shouldStartProjectionFetch({
        entry,
        now: 10_000,
        force: true,
        clientCooldownMs: 0,
      }),
    ).toEqual({ shouldFetch: true });
  });

  it("drawer open and close does not cause fetch when the same key has fresh cache", () => {
    const key = getProjectionCacheKey("room-1", "session:1", "me");
    const entry = getProjectionCacheEntry(key);
    entry.data = makeData();
    entry.loadedAt = 10_000;

    const closeDecision = shouldStartProjectionFetch({
      entry,
      now: 11_000,
      force: false,
      clientCooldownMs: 0,
    });
    const reopenDecision = shouldStartProjectionFetch({
      entry,
      now: 11_500,
      force: false,
      clientCooldownMs: 0,
    });

    expect(closeDecision).toEqual({ shouldFetch: false, cause: "fresh_cache" });
    expect(reopenDecision).toEqual({ shouldFetch: false, cause: "fresh_cache" });
  });

  it("score changes only refresh when a visible ahead opponent is crossed", () => {
    const data = makeData({
      myStanding: { ...makeData().myStanding, projectedRank: 5 },
      nearbyOpponents: [makeOpponent(150), makeOpponent(90)],
    });

    expect(
      shouldRefreshChallengeProjectionForScoreGain({ previousScore: 100, newScore: 120, data }),
    ).toBe(false);
    expect(
      shouldRefreshChallengeProjectionForScoreGain({ previousScore: 100, newScore: 151, data }),
    ).toBe(true);
  });

  it("score changes refresh when reaching a visible ahead opponent tie", () => {
    const data = makeData({
      myStanding: { ...makeData().myStanding, projectedRank: 5 },
      nearbyOpponents: [makeOpponent(150), makeOpponent(90)],
    });

    expect(
      shouldRefreshChallengeProjectionForScoreGain({ previousScore: 100, newScore: 150, data }),
    ).toBe(true);
  });

  it("score changes refresh when moving above a tied-ahead opponent", () => {
    const tiedAhead: ChallengeNearbyOpponent = { ...makeOpponent(100), relation: "ahead" };
    const data = makeData({
      myStanding: { ...makeData().myStanding, projectedRank: 5 },
      nearbyOpponents: [tiedAhead],
    });

    expect(
      shouldRefreshChallengeProjectionForScoreGain({ previousScore: 100, newScore: 100, data }),
    ).toBe(false);
    expect(
      shouldRefreshChallengeProjectionForScoreGain({ previousScore: 100, newScore: 101, data }),
    ).toBe(true);
  });

  it("does not refetch on score gain when there was no ahead opponent", () => {
    const data = makeData({
      myStanding: { ...makeData().myStanding, projectedRank: 5 },
      nearbyOpponents: [makeOpponent(80), makeOpponent(90)],
    });

    expect(
      shouldRefreshChallengeProjectionForScoreGain({ previousScore: 100, newScore: 130, data }),
    ).toBe(false);
  });

  it("does not refetch on score gain when nearby opponents are empty", () => {
    const data = makeData({
      myStanding: { ...makeData().myStanding, projectedRank: 5 },
    });
    expect(
      shouldRefreshChallengeProjectionForScoreGain({ previousScore: 100, newScore: 130, data }),
    ).toBe(false);
  });

  it("does not refetch when target score was already surpassed before this score gain", () => {
    const data = makeData({
      myStanding: { ...makeData().myStanding, projectedRank: 5 },
      nearbyOpponents: [makeOpponent(150)],
    });

    expect(
      shouldRefreshChallengeProjectionForScoreGain({ previousScore: 200, newScore: 210, data }),
    ).toBe(false);
  });

  it("does not refresh projection while score remains below the authoritative next target", () => {
    const data = makeData({
      myStanding: {
        ...makeData().myStanding,
        projectedRank: 85,
        nextTarget: {
          userId: "rank84",
          displayName: "rank84",
          avatarUrl: null,
          rank: 84,
          score: 210,
          gap: 210,
        },
      },
      nearbyOpponents: [makeOpponent(210)],
    });

    expect(
      shouldRefreshChallengeProjectionForScoreGain({
        previousScore: 0,
        newScore: 70,
        data,
      }),
    ).toBe(false);
    expect(
      shouldRefreshChallengeProjectionForScoreGain({
        previousScore: 170,
        newScore: 310,
        data,
      }),
    ).toBe(true);
  });

  it("falls back to nearby opponents when backend nextTarget is absent", () => {
    const data = makeData({
      myStanding: {
        ...makeData().myStanding,
        projectedRank: 85,
        nextTarget: null,
      },
      nearbyOpponents: [makeOpponent(210)],
    });

    expect(
      shouldRefreshChallengeProjectionForScoreGain({
        previousScore: 170,
        newScore: 209,
        data,
      }),
    ).toBe(false);
    expect(
      shouldRefreshChallengeProjectionForScoreGain({
        previousScore: 170,
        newScore: 210,
        data,
      }),
    ).toBe(true);
  });
});

afterEach(() => {
  projectionCacheByKey.clear();
});
