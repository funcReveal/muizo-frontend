import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LeaderboardSettlementResponse } from "@features/RoomSession";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import { fetchLeaderboardSettlement } from "./leaderboardSettlementApi";

type UseLeaderboardSettlementInput = {
  matchId?: string | null;
  roomId?: string | null;
  roundKey?: string | null;
  clientId?: string | null;
  enabled?: boolean;
};

type UseLeaderboardSettlementResult = {
  data: LeaderboardSettlementResponse | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

type InflightRequest = {
  controller: AbortController;
  subscribers: number;
  promise: Promise<LeaderboardSettlementResponse>;
};

const MAX_SETTLEMENT_CACHE_SIZE = 50;
const settlementCache = new Map<string, LeaderboardSettlementResponse>();
const inflightRequests = new Map<string, InflightRequest>();
const LEADERBOARD_SETTLEMENT_INITIAL_LIMIT = 100;
const LEADERBOARD_SETTLEMENT_PAGE_SIZE = 100;

const putSettlementCache = (
  key: string,
  value: LeaderboardSettlementResponse,
) => {
  if (settlementCache.size >= MAX_SETTLEMENT_CACHE_SIZE && !settlementCache.has(key)) {
    // Evict the oldest entry (Map preserves insertion order).
    const firstKey = settlementCache.keys().next().value;
    if (firstKey !== undefined) settlementCache.delete(firstKey);
  }
  settlementCache.set(key, value);
};

const getCacheKey = (
  matchId?: string | null,
  roomId?: string | null,
  roundKey?: string | null,
) => {
  if (matchId?.trim()) return `match:${matchId.trim()}`;
  if (roomId?.trim() && roundKey?.trim()) {
    return `round:${roomId.trim()}:${roundKey.trim()}`;
  }
  return null;
};

const getInflightRequest = (
  key: string,
  factory: () => {
    controller: AbortController;
    promise: Promise<LeaderboardSettlementResponse>;
  },
) => {
  const existing = inflightRequests.get(key);
  if (existing) {
    existing.subscribers += 1;
    return existing;
  }

  const created = factory();
  const entry: InflightRequest = {
    controller: created.controller,
    subscribers: 1,
    promise: created.promise.finally(() => {
      const current = inflightRequests.get(key);
      if (current?.promise === entry.promise) {
        inflightRequests.delete(key);
      }
    }),
  };
  inflightRequests.set(key, entry);
  return entry;
};

const releaseInflightRequest = (
  key: string | null,
  entry: InflightRequest | null,
) => {
  if (!key || !entry) return;
  const current = inflightRequests.get(key);
  if (!current || current.promise !== entry.promise) return;
  current.subscribers = Math.max(0, current.subscribers - 1);
  if (current.subscribers === 0) {
    current.controller.abort();
    inflightRequests.delete(key);
  }
};

const mergeLeaderboardSettlementPage = (
  current: LeaderboardSettlementResponse,
  next: LeaderboardSettlementResponse,
): LeaderboardSettlementResponse => {
  const existingKeys = new Set(
    current.leaderboardTop.map(
      (item) => `${item.rank}:${item.userId ?? item.displayName}`,
    ),
  );
  const appended = next.leaderboardTop.filter(
    (item) => !existingKeys.has(`${item.rank}:${item.userId ?? item.displayName}`),
  );

  return {
    ...next,
    leaderboardTop: [...current.leaderboardTop, ...appended],
    leaderboardLoadedCount:
      next.leaderboardLoadedCount ??
      current.leaderboardTop.length + appended.length,
  };
};

export const useLeaderboardSettlement = ({
  matchId,
  roomId,
  roundKey,
  clientId,
  enabled = false,
}: UseLeaderboardSettlementInput): UseLeaderboardSettlementResult => {
  const { authToken, refreshAuthToken } = useAuth();
  const cacheKey = useMemo(
    () => getCacheKey(matchId, roomId, roundKey),
    [matchId, roomId, roundKey],
  );
  const requestKeyRef = useRef(0);
  const loadMoreRequestKeyRef = useRef(0);
  const subscriptionRef = useRef<{
    key: string | null;
    entry: InflightRequest | null;
  }>({
    key: null,
    entry: null,
  });

  const [state, setState] = useState<{
    key: string | null;
    data: LeaderboardSettlementResponse | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
  }>(() => ({
    key: cacheKey,
    data: cacheKey ? (settlementCache.get(cacheKey) ?? null) : null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
  }));

  const runFetch = useCallback(
    async (force = false) => {
      if (!enabled || !matchId?.trim() || !cacheKey) {
        setState({
          key: cacheKey,
          data: null,
          isLoading: false,
          isLoadingMore: false,
          error: null,
        });
        return;
      }

      if (!force) {
        const cached = settlementCache.get(cacheKey) ?? null;
        if (cached) {
          setState({
            key: cacheKey,
            data: cached,
            isLoading: false,
            isLoadingMore: false,
            error: null,
          });
          return;
        }
      } else {
        settlementCache.delete(cacheKey);
      }

      requestKeyRef.current += 1;
      const requestKey = requestKeyRef.current;

      releaseInflightRequest(
        subscriptionRef.current.key,
        subscriptionRef.current.entry,
      );
      subscriptionRef.current = { key: null, entry: null };

      const cachedForKey = settlementCache.get(cacheKey) ?? null;

      setState({
        key: cacheKey,
        data: cachedForKey,
        isLoading: true,
        isLoadingMore: false,
        error: null,
      });

      const entry = getInflightRequest(cacheKey, () => {
        const controller = new AbortController();
        const promise = (async () => {
          const nextAuthToken = authToken
            ? await ensureFreshAuthToken({
                token: authToken,
                refreshAuthToken,
              })
            : null;
          return fetchLeaderboardSettlement({
            matchId: matchId.trim(),
            authToken: nextAuthToken,
            clientId,
            limit: LEADERBOARD_SETTLEMENT_INITIAL_LIMIT,
            offset: 0,
            signal: controller.signal,
          });
        })();
        return { controller, promise };
      });

      subscriptionRef.current = { key: cacheKey, entry };

      try {
        const requestedMatchId = matchId.trim();

        const data = await entry.promise;

        if (data.match.matchId !== requestedMatchId) {
          return;
        }

        putSettlementCache(cacheKey, data);

        if (requestKeyRef.current !== requestKey) return;

        setState({
          key: cacheKey,
          data,
          isLoading: false,
          isLoadingMore: false,
          error: null,
        });
      } catch (error) {
        if (
          entry.controller.signal.aborted ||
          requestKeyRef.current !== requestKey
        ) {
          return;
        }

        setState((current) => {
          if (current.key !== cacheKey) return current;

          return {
            key: cacheKey,
            data: current.data,
            isLoading: false,
            isLoadingMore: false,
            error:
              error instanceof Error ? error.message : "載入排行榜結算失敗",
          };
        });
      }
    },
    [authToken, cacheKey, clientId, enabled, matchId, refreshAuthToken],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runFetch(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      requestKeyRef.current += 1;
      loadMoreRequestKeyRef.current += 1;
      releaseInflightRequest(
        subscriptionRef.current.key,
        subscriptionRef.current.entry,
      );
      subscriptionRef.current = { key: null, entry: null };
    };
  }, [runFetch]);

  const refresh = useCallback(async () => {
    await runFetch(true);
  }, [runFetch]);

  const loadMore = useCallback(async () => {
    if (!enabled || !matchId?.trim() || !cacheKey) return;

    const currentData = state.key === cacheKey ? state.data : null;
    if (
      !currentData ||
      !currentData.leaderboardHasMore ||
      currentData.leaderboardNextOffset === null ||
      state.isLoadingMore
    ) {
      return;
    }

    loadMoreRequestKeyRef.current += 1;
    const requestKey = loadMoreRequestKeyRef.current;

    setState((current) => {
      if (current.key !== cacheKey) return current;
      return { ...current, isLoadingMore: true, error: null };
    });

    try {
      const nextAuthToken = authToken
        ? await ensureFreshAuthToken({
            token: authToken,
            refreshAuthToken,
          })
        : null;
      const nextPage = await fetchLeaderboardSettlement({
        matchId: matchId.trim(),
        authToken: nextAuthToken,
        clientId,
        limit: LEADERBOARD_SETTLEMENT_PAGE_SIZE,
        offset: currentData.leaderboardNextOffset,
      });

      if (
        loadMoreRequestKeyRef.current !== requestKey ||
        nextPage.match.matchId !== matchId.trim()
      ) {
        return;
      }

      setState((current) => {
        if (current.key !== cacheKey || !current.data) return current;
        const merged = mergeLeaderboardSettlementPage(current.data, nextPage);
        putSettlementCache(cacheKey, merged);
        return {
          key: cacheKey,
          data: merged,
          isLoading: false,
          isLoadingMore: false,
          error: null,
        };
      });
    } catch (error) {
      if (loadMoreRequestKeyRef.current !== requestKey) return;
      setState((current) => {
        if (current.key !== cacheKey) return current;
        return {
          ...current,
          isLoadingMore: false,
          error: error instanceof Error ? error.message : "載入排行榜結算失敗",
        };
      });
    }
  }, [
    authToken,
    cacheKey,
    clientId,
    enabled,
    matchId,
    refreshAuthToken,
    state.data,
    state.isLoadingMore,
    state.key,
  ]);

  const stateMatchesCurrentRequest = state.key === cacheKey;

  return {
    data: stateMatchesCurrentRequest ? state.data : null,
    isLoading: stateMatchesCurrentRequest
      ? state.isLoading
      : Boolean(enabled && matchId?.trim() && cacheKey),
    isLoadingMore: stateMatchesCurrentRequest ? state.isLoadingMore : false,
    error: stateMatchesCurrentRequest ? state.error : null,
    refresh,
    loadMore,
  };
};
