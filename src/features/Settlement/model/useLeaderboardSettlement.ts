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
  error: string | null;
  refresh: () => Promise<void>;
};

type InflightRequest = {
  controller: AbortController;
  subscribers: number;
  promise: Promise<LeaderboardSettlementResponse>;
};

const settlementCache = new Map<string, LeaderboardSettlementResponse>();
const inflightRequests = new Map<string, InflightRequest>();

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
    error: string | null;
  }>(() => ({
    key: cacheKey,
    data: cacheKey ? (settlementCache.get(cacheKey) ?? null) : null,
    isLoading: false,
    error: null,
  }));

  const runFetch = useCallback(
    async (force = false) => {
      if (!enabled || !matchId?.trim() || !cacheKey) {
        setState({
          key: cacheKey,
          data: null,
          isLoading: false,
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

        settlementCache.set(cacheKey, data);

        if (requestKeyRef.current !== requestKey) return;

        setState({
          key: cacheKey,
          data,
          isLoading: false,
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

  const stateMatchesCurrentRequest = state.key === cacheKey;

  return {
    data: stateMatchesCurrentRequest ? state.data : null,
    isLoading: stateMatchesCurrentRequest
      ? state.isLoading
      : Boolean(enabled && matchId?.trim() && cacheKey),
    error: stateMatchesCurrentRequest ? state.error : null,
    refresh,
  };
};
