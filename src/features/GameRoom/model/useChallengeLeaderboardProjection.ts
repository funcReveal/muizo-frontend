/**
 * useChallengeLeaderboardProjection
 *
 * In-game projected challenge leaderboard data.
 *
 * Security: never sends score/rank to backend. The backend derives all
 * ranking data from server-authoritative room state.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import { API_URL } from "@domain/room/constants";
import { fetchProjectedWindow } from "./challengeLeaderboardProjectionApi";
import { shouldRefreshChallengeProjectionForScoreGain } from "./challengeProjectionRefreshPolicy";
import type {
  ChallengeProjectedLeaderboardResponse,
  ChallengeProjectionState,
} from "./projectionTypes";

export const CLIENT_COOLDOWN_MS = 4_000;
export const PROJECTION_CACHE_FRESH_MS = 15_000;
const DEFAULT_429_RETRY_AFTER_MS = CLIENT_COOLDOWN_MS;
const LARGE_ROOM_INITIAL_JITTER_MAX_MS = 5_000;
const VISIBILITY_JITTER_MAX_MS = 5_000;

export type ProjectionFetchReason =
  | "initial"
  | "manual"
  | "page_visible"
  | "auth_ready"
  | "nearby_boundary_crossed";

export type ProjectionCacheEntry = {
  data: ChallengeProjectedLeaderboardResponse | null;
  loadedAt: number;
  inFlight: Promise<ChallengeProjectedLeaderboardResponse | null> | null;
  nextAllowedAt: number;
  lastFetchAt: number;
  lastErrorAt: number;
  lastErrorStatus: number | null;
  initialScheduled: boolean;
};

type InternalProjectionState = ChallengeProjectionState & {
  cacheKey: string;
  sessionKey: string;
};

type FetchDecision =
  | { shouldFetch: true }
  | {
      shouldFetch: false;
      cause: "fresh_cache" | "in_flight" | "server_cooldown" | "client_cooldown";
    };

export const projectionCacheByKey = new Map<string, ProjectionCacheEntry>();

export function getProjectionCacheKey(
  roomId: string,
  projectionSessionKey: string,
  meClientId: string,
): string {
  return `${roomId}:${projectionSessionKey}:${meClientId}`;
}

export function getProjectionSessionKey({
  roomId,
  gameSessionId,
}: {
  roomId: string;
  gameSessionId?: string | number | null;
}): string {
  return gameSessionId !== null && gameSessionId !== undefined
    ? `session:${gameSessionId}`
    : `room:${roomId}`;
}

export function getAdaptiveProjectionInitialJitterMs(
  participantCount: number,
): number {
  if (participantCount <= 20) return 0;
  if (participantCount <= 100) return 2_000;
  if (participantCount <= 300) return 4_000;
  return LARGE_ROOM_INITIAL_JITTER_MAX_MS;
}

export function getProjectionCacheEntry(key: string): ProjectionCacheEntry {
  const existing = projectionCacheByKey.get(key);
  if (existing) return existing;

  const entry: ProjectionCacheEntry = {
    data: null,
    loadedAt: 0,
    inFlight: null,
    nextAllowedAt: 0,
    lastFetchAt: 0,
    lastErrorAt: 0,
    lastErrorStatus: null,
    initialScheduled: false,
  };
  projectionCacheByKey.set(key, entry);
  return entry;
}

function patchProjectionCacheEntry(
  key: string,
  patch: Partial<ProjectionCacheEntry>,
): ProjectionCacheEntry {
  const entry = getProjectionCacheEntry(key);
  Object.assign(entry, patch);
  return entry;
}

export function cancelScheduledInitialProjectionFetch(key: string): void {
  const entry = getProjectionCacheEntry(key);
  if (entry.initialScheduled && !entry.inFlight && !entry.data) {
    patchProjectionCacheEntry(key, { initialScheduled: false });
  }
}

export function shouldUseFreshProjectionCache(
  entry: ProjectionCacheEntry,
  now: number,
): boolean {
  if (!entry.data) return false;
  const serverTtlMs = Number.isFinite(entry.data.cache.ttlMs)
    ? Math.max(0, entry.data.cache.ttlMs)
    : PROJECTION_CACHE_FRESH_MS;
  const freshMs = Math.min(PROJECTION_CACHE_FRESH_MS, serverTtlMs);
  return now - entry.loadedAt < freshMs;
}

export function shouldStartProjectionFetch({
  entry,
  now,
  force,
  clientCooldownMs,
}: {
  entry: ProjectionCacheEntry;
  now: number;
  force: boolean;
  clientCooldownMs: number;
}): FetchDecision {
  if (now < entry.nextAllowedAt) {
    return { shouldFetch: false, cause: "server_cooldown" };
  }

  if (!force && shouldUseFreshProjectionCache(entry, now)) {
    return { shouldFetch: false, cause: "fresh_cache" };
  }

  if (entry.inFlight) {
    return { shouldFetch: false, cause: "in_flight" };
  }

  if (
    clientCooldownMs > 0 &&
    entry.lastFetchAt > 0 &&
    now - entry.lastFetchAt < clientCooldownMs
  ) {
    return { shouldFetch: false, cause: "client_cooldown" };
  }

  return { shouldFetch: true };
}

function getClientCooldownMs(reason: ProjectionFetchReason): number {
  switch (reason) {
    case "manual":
      return CLIENT_COOLDOWN_MS;
    case "nearby_boundary_crossed":
      return 0;
    case "auth_ready":
    case "initial":
    case "page_visible":
      return 0;
  }
}

export function shouldRefetchNearbyWindow(
  previousScore: number,
  newScore: number,
  data: ChallengeProjectedLeaderboardResponse | null,
): boolean {
  if (newScore <= previousScore) return false;
  if (!data) return true;
  if (data.nearbyOpponents.length === 0) return false;

  const hadAheadBefore = data.nearbyOpponents.some(
    (opponent) => opponent.bestScore >= previousScore,
  );
  if (!hadAheadBefore) return false;

  return data.nearbyOpponents.some(
    (opponent) =>
      opponent.bestScore >= previousScore && opponent.bestScore <= newScore,
  );
}

export type UseChallengeLeaderboardProjectionInput = {
  enabled: boolean;
  roomId: string;
  meClientId: string;
  myLiveScore: number;
  canLoadInitialProjection: boolean;
  projectionSessionKey: string;
  initialFetchJitterMs?: number;
};

export type UseChallengeLeaderboardProjectionResult = {
  state: ChallengeProjectionState;
  refresh: () => void;
  gainAnimKey: number;
  gainAmount: number;
  /**
   * How many opponents the viewer has overtaken in this game session.
   * Capped at 2 once the nearby window is centred.
   * Resets to 0 on session key change (new game / rematch).
   */
  sessionPassCount: number;
};

export function useChallengeLeaderboardProjection(
  input: UseChallengeLeaderboardProjectionInput,
): UseChallengeLeaderboardProjectionResult {
  const {
    enabled,
    roomId,
    meClientId,
    myLiveScore,
    canLoadInitialProjection,
    projectionSessionKey,
    initialFetchJitterMs = 0,
  } = input;

  const { authToken, refreshAuthToken, authLoading } = useAuth();
  const cacheKey = useMemo(
    () => getProjectionCacheKey(roomId, projectionSessionKey, meClientId),
    [roomId, projectionSessionKey, meClientId],
  );
  const [state, setState] = useState<InternalProjectionState>(() => {
    const entry = getProjectionCacheEntry(cacheKey);
    return entry.data
      ? {
          status: "loaded",
          data: entry.data,
          loadedAt: entry.loadedAt,
          cacheKey,
          sessionKey: projectionSessionKey,
        }
      : {
          status: "idle",
          cacheKey,
          sessionKey: projectionSessionKey,
        };
  });

  const loadedDataRef = useRef<ChallengeProjectedLeaderboardResponse | null>(
    state.status === "loaded" ? state.data : null,
  );
  const mountedRef = useRef(true);
  const jitterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boundaryRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const gainAnimKeyRef = useRef(0);
  const pendingBoundaryRefreshRef = useRef(false);
  const [gainState, setGainState] = useState<{ key: number; amount: number }>(
    {
      key: 0,
      amount: 0,
    },
  );
  const [boundaryRetryToken, setBoundaryRetryToken] = useState(0);

  // ── Session pass count ────────────────────────────────────────────────────
  // Tracks how many opponents the viewer has overtaken this session (max 2).
  // Used by the nearby window builder to determine the viewer's row position.
  const [sessionPassCount, setSessionPassCount] = useState(0);
  const prevProjectedRankRef = useRef<number | null>(null);
  /** Timer used to schedule a single stale-nearby refetch after a large rank jump. */
  const staleNearbyRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLiveScoreRef = useRef(myLiveScore);
  const prevLiveScoreRef = useRef(myLiveScore);
  const prevAuthLoadingRef = useRef(authLoading);

  const hydrateFromEntry = useCallback(
    (entry: ProjectionCacheEntry): boolean => {
      if (!entry.data) return false;
      loadedDataRef.current = entry.data;
      if (mountedRef.current) {
        setState({
          status: "loaded",
          data: entry.data,
          loadedAt: entry.loadedAt,
          cacheKey,
          sessionKey: projectionSessionKey,
        });
      }
      return true;
    },
    [cacheKey, projectionSessionKey],
  );

  const clearJitterTimer = useCallback(() => {
    if (jitterTimerRef.current !== null) {
      clearTimeout(jitterTimerRef.current);
      jitterTimerRef.current = null;
    }
  }, []);

  const clearBoundaryRetryTimer = useCallback(() => {
    if (boundaryRetryTimerRef.current !== null) {
      clearTimeout(boundaryRetryTimerRef.current);
      boundaryRetryTimerRef.current = null;
    }
  }, []);

  const cancelInitialFetchSchedule = useCallback(() => {
    clearJitterTimer();
    cancelScheduledInitialProjectionFetch(cacheKey);
  }, [cacheKey, clearJitterTimer]);

  const doFetch = useCallback(
    async (reason: ProjectionFetchReason) => {
      if (!enabled || !roomId || authLoading) return;

      const entry = getProjectionCacheEntry(cacheKey);
      const now = Date.now();
      const isLiveScoreRefresh = reason === "nearby_boundary_crossed";
      const force = reason === "manual" || isLiveScoreRefresh;
      const clientCooldownMs = getClientCooldownMs(reason);
      const decision = shouldStartProjectionFetch({
        entry,
        now,
        force,
        clientCooldownMs,
      });

      if (!decision.shouldFetch) {
        if (decision.cause === "fresh_cache" || entry.data) {
          hydrateFromEntry(entry);
        }
        if (decision.cause === "in_flight" && entry.inFlight) {
          if (isLiveScoreRefresh) {
            pendingBoundaryRefreshRef.current = true;
          }
          const data = await entry.inFlight;
          if (data) hydrateFromEntry(entry);
          if (
            isLiveScoreRefresh &&
            mountedRef.current &&
            pendingBoundaryRefreshRef.current
          ) {
            setBoundaryRetryToken((value) => value + 1);
          }
        }
        if (
          isLiveScoreRefresh &&
          (decision.cause === "client_cooldown" ||
            decision.cause === "server_cooldown")
        ) {
          pendingBoundaryRefreshRef.current = true;
          const retryAt =
            decision.cause === "server_cooldown"
              ? entry.nextAllowedAt
              : entry.lastFetchAt + clientCooldownMs;
          clearBoundaryRetryTimer();
          boundaryRetryTimerRef.current = setTimeout(() => {
            boundaryRetryTimerRef.current = null;
            if (!mountedRef.current || !pendingBoundaryRefreshRef.current) return;
            setBoundaryRetryToken((value) => value + 1);
          }, Math.max(0, retryAt - Date.now()));
        }
        return;
      }

      patchProjectionCacheEntry(cacheKey, { lastFetchAt: now });
      if (isLiveScoreRefresh) {
        pendingBoundaryRefreshRef.current = false;
        clearBoundaryRetryTimer();
      }

      if (!entry.data && mountedRef.current) {
        setState((prev) =>
          prev.status === "loaded" && prev.cacheKey === cacheKey
            ? prev
            : { status: "loading", cacheKey, sessionKey: projectionSessionKey },
        );
      }

      const requestPromise = (async () => {
        try {
          const token = authToken
            ? await ensureFreshAuthToken({ token: authToken, refreshAuthToken })
            : null;
          const result = await fetchProjectedWindow({
            apiUrl: API_URL ?? "",
            roomId,
            token,
            clientId: meClientId,
          });

          const completedAt = Date.now();
          if (result.ok) {
            patchProjectionCacheEntry(cacheKey, {
              data: result.data,
              loadedAt: completedAt,
              lastErrorAt: 0,
              lastErrorStatus: null,
            });
            return result.data;
          }

          const failedEntry = getProjectionCacheEntry(cacheKey);
          const nextPatch: Partial<ProjectionCacheEntry> = {
            lastErrorAt: completedAt,
            lastErrorStatus: result.status,
          };
          if (result.status === 429 || result.status === 503) {
            const retryAfterMs =
              result.retryAfterMs ?? DEFAULT_429_RETRY_AFTER_MS;
            nextPatch.nextAllowedAt = Math.max(
              failedEntry.nextAllowedAt,
              completedAt + retryAfterMs,
            );
          }
          patchProjectionCacheEntry(cacheKey, nextPatch);
          return null;
        } catch {
          const failedAt = Date.now();
          patchProjectionCacheEntry(cacheKey, {
            lastErrorAt: failedAt,
            lastErrorStatus: 0,
          });
          return null;
        }
      })();

      patchProjectionCacheEntry(cacheKey, { inFlight: requestPromise });
      const data = await requestPromise;

      if (getProjectionCacheEntry(cacheKey).inFlight === requestPromise) {
        patchProjectionCacheEntry(cacheKey, { inFlight: null });
      }

      if (!mountedRef.current) return;

      if (data) {
        const successEntry = getProjectionCacheEntry(cacheKey);
        loadedDataRef.current = data;
        setState({
          status: "loaded",
          data,
          loadedAt: successEntry.loadedAt,
          cacheKey,
          sessionKey: projectionSessionKey,
        });
        return;
      }

      const completedEntry = getProjectionCacheEntry(cacheKey);
      if (completedEntry.data) {
        hydrateFromEntry(completedEntry);
        return;
      }

      setState((prev) => {
        if (prev.status === "loaded" && prev.cacheKey === cacheKey) return prev;
        const message =
          completedEntry.lastErrorStatus === 429 ||
          completedEntry.lastErrorStatus === 503
            ? "排行榜更新太頻繁，稍後再試"
            : "排行榜暫時無法更新";
        return {
          status: "error",
          message,
          cacheKey,
          sessionKey: projectionSessionKey,
        };
      });
    },
    [
      enabled,
      roomId,
      authLoading,
      cacheKey,
      hydrateFromEntry,
      clearBoundaryRetryTimer,
      projectionSessionKey,
      authToken,
      refreshAuthToken,
      meClientId,
    ],
  );

  const scheduleFetchWithJitter = useCallback(
    (reason: ProjectionFetchReason, maxJitterMs: number) => {
      if (jitterTimerRef.current !== null) return;

      const fire = () => {
        jitterTimerRef.current = null;
        if (document.hidden) {
          patchProjectionCacheEntry(cacheKey, { initialScheduled: false });
          return;
        }
        patchProjectionCacheEntry(cacheKey, { initialScheduled: false });
        void doFetch(reason);
      };

      const jitter = Math.max(0, maxJitterMs);
      const delay = jitter <= 0 ? 0 : Math.random() * jitter;
      jitterTimerRef.current = setTimeout(fire, delay);
    },
    [cacheKey, doFetch],
  );

  useEffect(() => {
    latestLiveScoreRef.current = myLiveScore;
  }, [myLiveScore]);

  useEffect(() => {
    mountedRef.current = true;
    const entry = getProjectionCacheEntry(cacheKey);
    if (entry.data) {
      queueMicrotask(() => hydrateFromEntry(entry));
    } else {
      loadedDataRef.current = null;
      queueMicrotask(() => {
        if (mountedRef.current) {
          setState({ status: "idle", cacheKey, sessionKey: projectionSessionKey });
        }
      });
    }
    prevLiveScoreRef.current = latestLiveScoreRef.current;
    gainAnimKeyRef.current = 0;
    pendingBoundaryRefreshRef.current = false;
    queueMicrotask(() => {
      if (mountedRef.current) {
        setGainState({ key: 0, amount: 0 });
      }
    });
    return () => {
      mountedRef.current = false;
      cancelInitialFetchSchedule();
      clearBoundaryRetryTimer();
      if (staleNearbyRetryTimerRef.current !== null) {
        clearTimeout(staleNearbyRetryTimerRef.current);
        staleNearbyRetryTimerRef.current = null;
      }
    };
  }, [
    cacheKey,
    projectionSessionKey,
    hydrateFromEntry,
    cancelInitialFetchSchedule,
    clearBoundaryRetryTimer,
  ]);

  useEffect(() => {
    if (!enabled || !canLoadInitialProjection) return;

    const entry = getProjectionCacheEntry(cacheKey);
    const now = Date.now();
    if (shouldUseFreshProjectionCache(entry, now)) {
      queueMicrotask(() => hydrateFromEntry(entry));
      return;
    }
    if (entry.data || entry.inFlight || entry.initialScheduled) return;

    patchProjectionCacheEntry(cacheKey, { initialScheduled: true });
    scheduleFetchWithJitter("initial", initialFetchJitterMs);

    return cancelInitialFetchSchedule;
  }, [
    enabled,
    canLoadInitialProjection,
    cacheKey,
    hydrateFromEntry,
    initialFetchJitterMs,
    cancelInitialFetchSchedule,
    scheduleFetchWithJitter,
  ]);

  useEffect(() => {
    const onVisible = () => {
      if (document.hidden || !enabled || !canLoadInitialProjection) return;
      const entry = getProjectionCacheEntry(cacheKey);
      const now = Date.now();
      if (entry.data && shouldUseFreshProjectionCache(entry, now)) {
        hydrateFromEntry(entry);
        return;
      }
      // If score hasn't changed since the cached snapshot, stale data is still accurate — skip fetch
      if (
        entry.data &&
        latestLiveScoreRef.current === entry.data.myStanding.liveScore
      ) {
        hydrateFromEntry(entry);
        return;
      }
      scheduleFetchWithJitter(
        "page_visible",
        Math.min(initialFetchJitterMs, VISIBILITY_JITTER_MAX_MS),
      );
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [
    enabled,
    canLoadInitialProjection,
    cacheKey,
    hydrateFromEntry,
    initialFetchJitterMs,
    scheduleFetchWithJitter,
  ]);

  useEffect(() => {
    const wasLoading = prevAuthLoadingRef.current;
    prevAuthLoadingRef.current = authLoading;
    if (!wasLoading || authLoading) return;
    if (!enabled || !canLoadInitialProjection) return;

    const entry = getProjectionCacheEntry(cacheKey);
    if (entry.data) {
      queueMicrotask(() => hydrateFromEntry(entry));
      return;
    }
    queueMicrotask(() => {
      void doFetch("auth_ready");
    });
  }, [
    authLoading,
    enabled,
    canLoadInitialProjection,
    cacheKey,
    hydrateFromEntry,
    doFetch,
  ]);

  useEffect(() => {
    const prev = prevLiveScoreRef.current;
    prevLiveScoreRef.current = myLiveScore;

    if (myLiveScore <= prev) return;

    const delta = myLiveScore - prev;
    gainAnimKeyRef.current += 1;
    setGainState({ key: gainAnimKeyRef.current, amount: delta });

    if (!canLoadInitialProjection) return;

    const shouldRefresh = shouldRefreshChallengeProjectionForScoreGain({
      previousScore: prev,
      newScore: myLiveScore,
      data: loadedDataRef.current,
    });
    if (!shouldRefresh) return;

    if (enabled) {
      queueMicrotask(() => {
        void doFetch("nearby_boundary_crossed");
      });
    } else {
      pendingBoundaryRefreshRef.current = true;
      return;
    }

  }, [enabled, canLoadInitialProjection, myLiveScore, cacheKey, doFetch]);

  useEffect(() => {
    if (!enabled || !canLoadInitialProjection) return;
    if (!pendingBoundaryRefreshRef.current) return;

    pendingBoundaryRefreshRef.current = false;
    queueMicrotask(() => {
      void doFetch("nearby_boundary_crossed");
    });
  }, [enabled, canLoadInitialProjection, doFetch, boundaryRetryToken]);

  const stateForCurrentSession = useMemo<ChallengeProjectionState>(
    () =>
      state.cacheKey === cacheKey && state.sessionKey === projectionSessionKey
        ? state
        : { status: "idle" },
    [state, cacheKey, projectionSessionKey],
  );

  // Reset sessionPassCount and rank history whenever a new session begins
  // (new game, rematch, or collection change).
  useEffect(() => {
    prevProjectedRankRef.current = null;
    queueMicrotask(() => {
      setSessionPassCount(0);
    });
  }, [projectionSessionKey]);

  // Detect rank improvements from API responses and increment sessionPassCount.
  // Only increases (capped at 2) — being overtaken does not decrease the count.
  //
  // Stale-nearby detection: when rank jumps by more than 3 in a single update,
  // the backend's nearby cache (100-point band) may still be serving opponents
  // from the previous rank position.  We schedule one follow-up boundary refetch
  // after 2.5 s to let the cache update.  The request is bounded (at most one
  // extra per large jump) and respects the server's rate-limit headers.
  useEffect(() => {
    if (stateForCurrentSession.status !== "loaded") return;
    const data = stateForCurrentSession.data;
    const newRank = data.myStanding.projectedRank;
    const prevRank = prevProjectedRankRef.current;
    prevProjectedRankRef.current = newRank;

    if (prevRank === null || newRank === null || newRank >= prevRank) return;

    const delta = prevRank - newRank;
    setSessionPassCount((prev) => Math.min(prev + delta, 2));

    // Large jump: check if nearby opponents' ranks align with the new position.
    if (delta > 3 && data.nearbyOpponents.length > 0) {
      const aheadRanks = data.nearbyOpponents
        .filter((o) => o.relation === "ahead" && o.rank !== null)
        .map((o) => o.rank as number);

      // If no ahead opponent is within 10 ranks of the new projected rank,
      // the nearby cache is likely serving stale data from the old position.
      const nearbyAligned =
        aheadRanks.length === 0 ||
        aheadRanks.some((r) => Math.abs(r - newRank) <= 10);

      if (!nearbyAligned) {
        if (staleNearbyRetryTimerRef.current !== null) {
          clearTimeout(staleNearbyRetryTimerRef.current);
        }
        staleNearbyRetryTimerRef.current = setTimeout(() => {
          staleNearbyRetryTimerRef.current = null;
          if (mountedRef.current) {
            pendingBoundaryRefreshRef.current = false;
            void doFetch("nearby_boundary_crossed");
          }
        }, 2500);
      }
    }
  }, [stateForCurrentSession, doFetch]);

  const refresh = useCallback(() => {
    void doFetch("manual");
  }, [doFetch]);

  return {
    state: stateForCurrentSession,
    refresh,
    gainAnimKey: gainState.key,
    gainAmount: gainState.amount,
    sessionPassCount,
  };
}
