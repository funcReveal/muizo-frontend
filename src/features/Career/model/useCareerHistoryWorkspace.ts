import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import {
  useRoomSession,
  useResultHistoryAnalytics,
  type RoomSettlementHistorySummary,
  type RoomSettlementQuestionRecap,
  type RoomSettlementSnapshot,
} from "@features/RoomSession";
import type { SettlementQuestionRecap } from "@features/Settlement/ui/components/GameSettlementPanel";

import {
  formatCareerHistoryDateTime,
  formatCareerHistoryDuration,
  formatCareerHistoryRankFraction,
  getCareerHistoryGroupKeyFromSummary,
  getCareerHistoryMatchDurationMs,
  isBetterCareerHistoryRankResult,
} from "./careerHistoryFormatters";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const HISTORY_PAGE_LIMIT = 20;
const HISTORY_LIST_CACHE_TTL_MS = 90_000;
const HISTORY_GUARD_WINDOW_MS = 15_000;
const HISTORY_GUARD_MAX_REQUESTS = 16;
const HISTORY_GUARD_BLOCK_MS = 30_000;

type HistoryListResponse = {
  ok: boolean;
  data?: {
    items: RoomSettlementHistorySummary[];
    nextCursor: number | null;
    nextCursorToken?: string | null;
  };
  error?: string;
};

type HistoryDetailResponse = {
  ok: boolean;
  data?: {
    snapshot: RoomSettlementSnapshot;
  };
  error?: string;
};

type HistoryListCachePayload = {
  savedAt: number;
  items: RoomSettlementHistorySummary[];
  nextCursorToken?: string | null;
};

type HistoryRequestGuardPayload = {
  blockedUntil: number;
  requestTimestamps: number[];
};

export type HistoryListDisplayMode = "expanded" | "collapsed";

const buildHistoryHeaders = (token: string | null) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const buildHistoryListCacheKey = (clientId: string | null) =>
  `history_list_v1:${clientId ?? "guest"}`;

const buildHistoryGuardKey = (clientId: string | null) =>
  `history_guard_v1:${clientId ?? "guest"}`;

const mergeHistoryItems = (
  currentItems: RoomSettlementHistorySummary[],
  incomingItems: RoomSettlementHistorySummary[],
) => {
  const merged = new Map<string, RoomSettlementHistorySummary>();

  for (const item of currentItems) {
    merged.set(item.matchId, item);
  }

  for (const item of incomingItems) {
    merged.set(item.matchId, item);
  }

  return Array.from(merged.values()).sort(
    (a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo,
  );
};

const readSelfRankFromSummary = (summary: RoomSettlementHistorySummary) => {
  if (
    typeof summary.selfRank === "number" &&
    Number.isFinite(summary.selfRank) &&
    summary.selfRank > 0
  ) {
    return Math.floor(summary.selfRank);
  }

  const json = summary.summaryJson;
  if (!json || typeof json !== "object") return null;

  const source = json as Record<string, unknown>;
  const rankKeys = [
    "selfRank",
    "rank",
    "placement",
    "selfPlacement",
    "myRank",
    "finalRank",
    "position",
  ];

  const pickPositiveRank = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : null;

  for (const key of rankKeys) {
    const rank = pickPositiveRank(source[key]);
    if (rank !== null) return rank;
  }

  const selfPlayer = source.selfPlayer;
  if (selfPlayer && typeof selfPlayer === "object") {
    const self = selfPlayer as Record<string, unknown>;
    for (const key of rankKeys) {
      const rank = pickPositiveRank(self[key]);
      if (rank !== null) return rank;
    }
  }

  const participants = source.participants;
  if (Array.isArray(participants)) {
    const meName =
      summary.selfPlayer?.usernameSnapshot?.trim().toLowerCase() ?? "";

    for (const participant of participants) {
      if (!participant || typeof participant !== "object") continue;

      const row = participant as Record<string, unknown>;
      const candidateName =
        typeof row.username === "string"
          ? row.username.trim().toLowerCase()
          : "";
      const isMeFlag = row.isMe === true || row.self === true;

      if (isMeFlag || (meName && candidateName && candidateName === meName)) {
        for (const key of rankKeys) {
          const rank = pickPositiveRank(row[key]);
          if (rank !== null) return rank;
        }
      }
    }
  }

  return null;
};

const normalizeQuestionRecap = (
  recap: RoomSettlementQuestionRecap,
): SettlementQuestionRecap => {
  const safeMyChoiceIndex =
    typeof recap.myChoiceIndex === "number" ? recap.myChoiceIndex : null;

  return {
    ...recap,
    myResult: recap.myResult ?? "unanswered",
    myChoiceIndex: safeMyChoiceIndex,
    choices: recap.choices.map((choice) => ({
      index: choice.index,
      title: choice.title,
      isCorrect: Boolean(
        choice.isCorrect ?? choice.index === recap.correctChoiceIndex,
      ),
      isSelectedByMe: Boolean(
        choice.isSelectedByMe ??
        (safeMyChoiceIndex !== null && choice.index === safeMyChoiceIndex),
      ),
    })),
    answersByClientId: recap.answersByClientId
      ? Object.fromEntries(
          Object.entries(recap.answersByClientId).map(([clientId, answer]) => [
            clientId,
            {
              choiceIndex: answer.choiceIndex ?? null,
              result: answer.result ?? "unanswered",
              answeredAtMs:
                answer.answeredAtMs ?? answer.firstAnsweredAtMs ?? null,
              scoreBreakdown: answer.scoreBreakdown ?? null,
            },
          ]),
        )
      : undefined,
  };
};

export const useCareerHistoryWorkspace = () => {
  const { clientId, authToken, refreshAuthToken } = useAuth();
  const { setStatusText } = useRoomSession();
  const {
    trackResultHistoryEvent,
    trackResultHistoryEventOnce,
  } = useResultHistoryAnalytics();

  const [items, setItems] = useState<RoomSettlementHistorySummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMoreList, setLoadingMoreList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [nextCursorToken, setNextCursorToken] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loadingReplayMatchId, setLoadingReplayMatchId] = useState<
    string | null
  >(null);
  const [replayByMatchId, setReplayByMatchId] = useState<
    Record<string, RoomSettlementSnapshot>
  >({});
  const [historyDisplayMode, setHistoryDisplayMode] =
    useState<HistoryListDisplayMode>("expanded");
  const [collapsedRoomGroups, setCollapsedRoomGroups] = useState<
    Record<string, boolean>
  >({});
  const [historyRequestBlockedUntil, setHistoryRequestBlockedUntil] =
    useState(0);

  const inFlightReplayMatchIdsRef = useRef<Set<string>>(new Set());
  const groupContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const groupVisibilityTimerIdsRef = useRef<number[]>([]);
  const lastExpandedGroupKeyRef = useRef<string | null>(null);
  const scrollHostRef = useRef<HTMLDivElement | null>(null);

  const historyListCacheKey = useMemo(
    () => buildHistoryListCacheKey(clientId),
    [clientId],
  );
  const historyGuardKey = useMemo(
    () => buildHistoryGuardKey(clientId),
    [clientId],
  );

  useEffect(() => {
    trackResultHistoryEventOnce(
      {
        eventName: "match_history.opened",
        source: "profile",
        entryPoint: "profile_recent_match",
        viewType: "summary",
      },
      "match_history.opened:profile:summary",
    );
  }, [trackResultHistoryEventOnce]);

  const isHistoryRequestBlocked = historyRequestBlockedUntil > 0;

  const setGroupContainerRef = useCallback(
    (groupKey: string, node: HTMLDivElement | null) => {
      if (node) {
        groupContainerRefs.current[groupKey] = node;
        return;
      }
      delete groupContainerRefs.current[groupKey];
    },
    [],
  );

  const clearGroupVisibilityTimers = useCallback(() => {
    if (typeof window === "undefined") return;
    groupVisibilityTimerIdsRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    groupVisibilityTimerIdsRef.current = [];
  }, []);

  const ensureExpandedGroupVisible = useCallback((groupKey: string) => {
    const container = groupContainerRefs.current[groupKey];
    const scrollHost = scrollHostRef.current;
    if (!container || !scrollHost) return;

    const containerRect = container.getBoundingClientRect();
    const hostRect = scrollHost.getBoundingClientRect();

    if (containerRect.top < hostRect.top + 12) {
      scrollHost.scrollBy({
        top: containerRect.top - hostRect.top - 12,
        behavior: "smooth",
      });
      return;
    }

    if (containerRect.bottom > hostRect.bottom - 12) {
      scrollHost.scrollBy({
        top: containerRect.bottom - hostRect.bottom + 12,
        behavior: "smooth",
      });
    }
  }, []);

  const queueExpandedGroupVisibility = useCallback(
    (groupKey: string) => {
      if (typeof window === "undefined") return;

      if (lastExpandedGroupKeyRef.current !== groupKey) {
        clearGroupVisibilityTimers();
      }

      lastExpandedGroupKeyRef.current = groupKey;

      [120, 460].forEach((delay) => {
        const timerId = window.setTimeout(() => {
          ensureExpandedGroupVisible(groupKey);
          groupVisibilityTimerIdsRef.current =
            groupVisibilityTimerIdsRef.current.filter((id) => id !== timerId);
        }, delay);

        groupVisibilityTimerIdsRef.current.push(timerId);
      });
    },
    [clearGroupVisibilityTimers, ensureExpandedGroupVisible],
  );

  useEffect(
    () => () => {
      clearGroupVisibilityTimers();
    },
    [clearGroupVisibilityTimers],
  );

  const selectedSummary = useMemo(
    () => items.find((item) => item.matchId === selectedMatchId) ?? null,
    [items, selectedMatchId],
  );

  const selectedReplay = selectedMatchId
    ? replayByMatchId[selectedMatchId]
    : null;

  const isLoadingSelectedReplay =
    Boolean(selectedMatchId) && loadingReplayMatchId === selectedMatchId;

  const normalizedSelectedQuestionRecaps = useMemo(() => {
    if (!selectedReplay?.questionRecaps) return undefined;
    return selectedReplay.questionRecaps.map(normalizeQuestionRecap);
  }, [selectedReplay?.questionRecaps]);

  const getSelfRankForSummary = useCallback(
    (summary: RoomSettlementHistorySummary) => {
      const rankFromSummary = readSelfRankFromSummary(summary);
      if (rankFromSummary !== null) return rankFromSummary;

      const replay = replayByMatchId[summary.matchId];
      if (!replay || !clientId) return null;

      const sorted = replay.participants
        .slice()
        .sort((a, b) => b.score - a.score);
      const index = sorted.findIndex(
        (participant) => participant.clientId === clientId,
      );

      return index >= 0 ? index + 1 : null;
    },
    [clientId, replayByMatchId],
  );

  const getBearerToken = useCallback(async () => {
    if (!authToken) return null;
    return await ensureFreshAuthToken({ token: authToken, refreshAuthToken });
  }, [authToken, refreshAuthToken]);

  const readHistoryListCache = useCallback(() => {
    if (typeof window === "undefined") return null;

    try {
      const raw = window.sessionStorage.getItem(historyListCacheKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as HistoryListCachePayload;
      if (!parsed || !Array.isArray(parsed.items)) return null;
      if (!Number.isFinite(parsed.savedAt)) return null;
      if (Date.now() - parsed.savedAt > HISTORY_LIST_CACHE_TTL_MS) return null;

      return {
        items: parsed.items.sort(
          (a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo,
        ),
        nextCursorToken:
          typeof parsed.nextCursorToken === "string" &&
          parsed.nextCursorToken.trim().length > 0
            ? parsed.nextCursorToken
            : null,
      };
    } catch {
      return null;
    }
  }, [historyListCacheKey]);

  const writeHistoryListCache = useCallback(
    (
      nextItems: RoomSettlementHistorySummary[],
      nextPageCursorToken: string | null,
    ) => {
      if (typeof window === "undefined") return;

      try {
        const payload: HistoryListCachePayload = {
          savedAt: Date.now(),
          items: nextItems,
          nextCursorToken: nextPageCursorToken,
        };
        window.sessionStorage.setItem(
          historyListCacheKey,
          JSON.stringify(payload),
        );
      } catch {
        // ignore cache errors
      }
    },
    [historyListCacheKey],
  );

  const guardBlockedMessage = useCallback(
    (blockedUntil: number, source: "list" | "detail") => {
      const remainingMs = Math.max(0, blockedUntil - Date.now());
      const seconds = Math.max(1, Math.ceil(remainingMs / 1000));

      return source === "detail"
        ? `操作過於頻繁，請 ${seconds} 秒後再試。`
        : `歷史請求過於頻繁，請 ${seconds} 秒後再試。`;
    },
    [],
  );

  const acquireHistoryRequestPermit = useCallback(
    (source: "list" | "detail") => {
      if (typeof window === "undefined") return true;

      const now = Date.now();
      let nextGuard: HistoryRequestGuardPayload = {
        blockedUntil: 0,
        requestTimestamps: [],
      };

      try {
        const raw = window.sessionStorage.getItem(historyGuardKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<HistoryRequestGuardPayload>;
          nextGuard = {
            blockedUntil: Number(parsed.blockedUntil ?? 0),
            requestTimestamps: Array.isArray(parsed.requestTimestamps)
              ? parsed.requestTimestamps
                  .map((value) => Number(value))
                  .filter((value) => Number.isFinite(value))
              : [],
          };
        }
      } catch {
        // ignore parse errors
      }

      nextGuard.requestTimestamps = nextGuard.requestTimestamps.filter(
        (timestamp) => now - timestamp <= HISTORY_GUARD_WINDOW_MS,
      );

      if (nextGuard.blockedUntil > now) {
        setHistoryRequestBlockedUntil(nextGuard.blockedUntil);
        const message = guardBlockedMessage(nextGuard.blockedUntil, source);
        setStatusText(message);
        return false;
      }

      nextGuard.requestTimestamps.push(now);

      if (nextGuard.requestTimestamps.length > HISTORY_GUARD_MAX_REQUESTS) {
        nextGuard.blockedUntil = now + HISTORY_GUARD_BLOCK_MS;
        nextGuard.requestTimestamps = [];
        setHistoryRequestBlockedUntil(nextGuard.blockedUntil);
        const message = guardBlockedMessage(nextGuard.blockedUntil, source);
        setStatusText(message);

        try {
          window.sessionStorage.setItem(
            historyGuardKey,
            JSON.stringify(nextGuard),
          );
        } catch {
          // ignore persist errors
        }

        return false;
      }

      nextGuard.blockedUntil = 0;
      setHistoryRequestBlockedUntil(0);

      try {
        window.sessionStorage.setItem(
          historyGuardKey,
          JSON.stringify(nextGuard),
        );
      } catch {
        // ignore persist errors
      }

      return true;
    },
    [guardBlockedMessage, historyGuardKey, setStatusText],
  );

  const fetchHistoryList = useCallback(
    async (beforeCursor?: string | null) => {
      if (!API_URL) {
        throw new Error("找不到 API_URL 設定");
      }

      const token = await getBearerToken();
      const params = new URLSearchParams();

      if (clientId) params.set("clientId", clientId);
      params.set("limit", String(HISTORY_PAGE_LIMIT));
      if (beforeCursor) params.set("beforeCursor", beforeCursor);

      const res = await fetch(
        `${API_URL}/api/history/matches?${params.toString()}`,
        {
          method: "GET",
          headers: buildHistoryHeaders(token),
        },
      );

      const payload = (await res
        .json()
        .catch(() => null)) as HistoryListResponse | null;

      if (!res.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error ?? "讀取歷史列表失敗");
      }

      return {
        items: Array.isArray(payload.data.items)
          ? payload.data.items.sort(
              (a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo,
            )
          : [],
        nextCursorToken:
          typeof payload.data.nextCursorToken === "string" &&
          payload.data.nextCursorToken.trim().length > 0
            ? payload.data.nextCursorToken
            : null,
      };
    },
    [clientId, getBearerToken],
  );

  const fetchReplay = useCallback(
    async (matchId: string) => {
      if (!API_URL) {
        throw new Error("找不到 API_URL 設定");
      }

      const token = await getBearerToken();
      const params = new URLSearchParams();
      if (clientId) params.set("clientId", clientId);

      const url = `${API_URL}/api/history/matches/${encodeURIComponent(matchId)}${
        params.size ? `?${params.toString()}` : ""
      }`;

      const res = await fetch(url, {
        method: "GET",
        headers: buildHistoryHeaders(token),
      });

      const payload = (await res
        .json()
        .catch(() => null)) as HistoryDetailResponse | null;

      if (!res.ok || !payload?.ok || !payload.data?.snapshot) {
        throw new Error(payload?.error ?? "讀取對戰回顧失敗");
      }

      return payload.data.snapshot;
    },
    [clientId, getBearerToken],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.sessionStorage.getItem(historyGuardKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<HistoryRequestGuardPayload>;
      const blockedUntil = Number(parsed.blockedUntil ?? 0);
      if (Number.isFinite(blockedUntil) && blockedUntil > Date.now()) {
        setHistoryRequestBlockedUntil(blockedUntil);
      }
    } catch {
      // ignore parse errors
    }
  }, [historyGuardKey]);

  useEffect(() => {
    if (historyRequestBlockedUntil <= 0 || typeof window === "undefined")
      return;

    const remainingMs = Math.max(0, historyRequestBlockedUntil - Date.now());
    const timeoutId = window.setTimeout(() => {
      setHistoryRequestBlockedUntil((prev) => (prev <= Date.now() ? 0 : prev));
    }, remainingMs + 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [historyRequestBlockedUntil]);

  useEffect(() => {
    let cancelled = false;
    const cachedItems = readHistoryListCache();

    if (cachedItems && cachedItems.items.length > 0) {
      setItems(cachedItems.items);
      setNextCursorToken(cachedItems.nextCursorToken);
      setLoadingList(false);
      setListError(null);
    } else {
      setLoadingList(true);
      setListError(null);
    }

    if (!acquireHistoryRequestPermit("list")) {
      if (!cachedItems || cachedItems.items.length === 0) {
        setListError("歷史請求過於頻繁，請稍後再試。");
        setLoadingList(false);
      } else {
        setListError(null);
      }

      return () => {
        cancelled = true;
      };
    }

    void fetchHistoryList()
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setNextCursorToken(page.nextCursorToken);
        writeHistoryListCache(page.items, page.nextCursorToken);
        setListError(null);
      })
      .catch((error) => {
        if (cancelled) return;

        const message =
          error instanceof Error ? error.message : "讀取歷史列表失敗";

        if (cachedItems && cachedItems.items.length > 0) {
          setListError(null);
          setStatusText(`${message}，已顯示快取資料`);
        } else {
          setListError(message);
          setStatusText(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    acquireHistoryRequestPermit,
    fetchHistoryList,
    readHistoryListCache,
    setStatusText,
    writeHistoryListCache,
  ]);

  useEffect(() => {
    const scrollHost = scrollHostRef.current;
    if (!scrollHost) return;

    const handleScroll = () => {
      setShowBackToTop(scrollHost.scrollTop > 240);
    };

    handleScroll();
    scrollHost.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollHost.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLoadMoreHistory = useCallback(async () => {
    if (!nextCursorToken || loadingList || loadingMoreList) return;
    if (!acquireHistoryRequestPermit("list")) return;

    setLoadingMoreList(true);

    try {
      const page = await fetchHistoryList(nextCursorToken);
      let mergedItems: RoomSettlementHistorySummary[] = [];

      setItems((prev) => {
        mergedItems = mergeHistoryItems(prev, page.items);
        return mergedItems;
      });

      setNextCursorToken(page.nextCursorToken);
      writeHistoryListCache(mergedItems, page.nextCursorToken);
      setListError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "載入更多對戰紀錄失敗";
      setStatusText(message);
    } finally {
      setLoadingMoreList(false);
    }
  }, [
    acquireHistoryRequestPermit,
    fetchHistoryList,
    loadingList,
    loadingMoreList,
    nextCursorToken,
    setStatusText,
    writeHistoryListCache,
  ]);

  const handleBackToTop = useCallback(() => {
    const scrollHost = scrollHostRef.current;
    if (!scrollHost) return;
    scrollHost.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openReplayDetail = useCallback(
    async (summary: RoomSettlementHistorySummary) => {
      const matchId = summary.matchId;
      trackResultHistoryEvent({
        eventName: "match_history.result.opened",
        roomId: summary.roomId,
        matchId,
        source: "profile",
        entryPoint: "profile_recent_match",
        viewType: "full_result",
        isRevisit: true,
      });
      trackResultHistoryEvent({
        eventName: "result.page.revisited",
        roomId: summary.roomId,
        matchId,
        source: "profile",
        entryPoint: "profile_recent_match",
        viewType: "full_result",
        isRevisit: true,
      });

      if (replayByMatchId[matchId]) {
        setSelectedMatchId(matchId);
        return;
      }

      if (inFlightReplayMatchIdsRef.current.has(matchId)) {
        setSelectedMatchId(matchId);
        return;
      }

      if (!acquireHistoryRequestPermit("detail")) {
        return;
      }

      setSelectedMatchId(matchId);
      inFlightReplayMatchIdsRef.current.add(matchId);
      setLoadingReplayMatchId(matchId);

      try {
        const snapshot = await fetchReplay(matchId);
        setReplayByMatchId((prev) => ({ ...prev, [matchId]: snapshot }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "讀取對戰回顧失敗";
        setStatusText(message);
      } finally {
        inFlightReplayMatchIdsRef.current.delete(matchId);
        setLoadingReplayMatchId((prev) => (prev === matchId ? null : prev));
      }
    },
    [
      acquireHistoryRequestPermit,
      fetchReplay,
      replayByMatchId,
      setStatusText,
      trackResultHistoryEvent,
    ],
  );

  const closeReplayDetail = useCallback(() => {
    setSelectedMatchId(null);
  }, []);

  const recentItems = useMemo(
    () => items.slice(0, HISTORY_PAGE_LIMIT),
    [items],
  );

  const recentScoredItems = useMemo(
    () => recentItems.filter((item) => Boolean(item.selfPlayer)),
    [recentItems],
  );

  const recentTopScoreEntry = useMemo(() => {
    let best: RoomSettlementHistorySummary | null = null;

    for (const item of recentScoredItems) {
      const score = item.selfPlayer?.finalScore ?? -1;
      const bestScore = best?.selfPlayer?.finalScore ?? -1;

      if (score > bestScore) {
        best = item;
        continue;
      }

      if (score === bestScore && best && item.endedAt > best.endedAt) {
        best = item;
      }
    }

    return best;
  }, [recentScoredItems]);

  const recentBestComboEntry = useMemo(() => {
    let best: RoomSettlementHistorySummary | null = null;

    for (const item of recentScoredItems) {
      const combo = item.selfPlayer?.maxCombo ?? 0;
      const bestCombo = best?.selfPlayer?.maxCombo ?? 0;

      if (combo > bestCombo) {
        best = item;
        continue;
      }

      if (combo === bestCombo && best && item.endedAt > best.endedAt) {
        best = item;
      }
    }

    return best;
  }, [recentScoredItems]);

  const recentBestAccuracyEntry = useMemo(() => {
    let best: { item: RoomSettlementHistorySummary; rate: number } | null =
      null;

    for (const item of recentScoredItems) {
      const correctCount = item.selfPlayer?.correctCount ?? 0;
      const totalCount = item.questionCount > 0 ? item.questionCount : 1;
      const rate = correctCount / totalCount;

      if (
        !best ||
        rate > best.rate ||
        (rate === best.rate && item.endedAt > best.item.endedAt)
      ) {
        best = { item, rate };
      }
    }

    return best;
  }, [recentScoredItems]);

  const recentBestRankEntry = useMemo(() => {
    let best: { item: RoomSettlementHistorySummary; rank: number } | null =
      null;

    for (const item of recentItems) {
      const rank = readSelfRankFromSummary(item);
      if (rank === null) continue;

      const candidate = {
        rank,
        playerCount: Math.max(1, item.playerCount),
        endedAt: item.endedAt,
      };

      const currentBest =
        best === null
          ? null
          : {
              rank: best.rank,
              playerCount: Math.max(1, best.item.playerCount),
              endedAt: best.item.endedAt,
            };

      if (isBetterCareerHistoryRankResult(candidate, currentBest)) {
        best = { item, rank };
      }
    }

    return best;
  }, [recentItems]);

  const groupedHistoryItems = useMemo(() => {
    const groups = new Map<
      string,
      {
        roomId: string;
        roomName: string;
        items: RoomSettlementHistorySummary[];
      }
    >();

    for (const item of items) {
      const key = getCareerHistoryGroupKeyFromSummary(item);
      const existing = groups.get(key);

      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, {
          roomId: item.roomId,
          roomName: item.roomName || item.roomId,
          items: [item],
        });
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort(
          (a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo,
        ),
      }))
      .sort(
        (a, b) =>
          (b.items[0]?.endedAt ?? 0) - (a.items[0]?.endedAt ?? 0) ||
          (b.items[0]?.roundNo ?? 0) - (a.items[0]?.roundNo ?? 0),
      );
  }, [items]);

  const selectedRelatedSummaries = useMemo(() => {
    if (!selectedSummary) return [];

    const targetGroupKey = getCareerHistoryGroupKeyFromSummary(selectedSummary);
    const matchedGroup = groupedHistoryItems.find((group) => {
      const groupSeed = group.items[0];
      return (
        groupSeed &&
        getCareerHistoryGroupKeyFromSummary(groupSeed) === targetGroupKey
      );
    });

    return matchedGroup?.items ?? [selectedSummary];
  }, [groupedHistoryItems, selectedSummary]);

  useEffect(() => {
    setCollapsedRoomGroups((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const group of groupedHistoryItems) {
        const groupKey = group.items[0]
          ? getCareerHistoryGroupKeyFromSummary(group.items[0])
          : null;

        if (!groupKey) continue;

        if (!(groupKey in next)) {
          next[groupKey] = historyDisplayMode !== "expanded";
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [groupedHistoryItems, historyDisplayMode]);

  useEffect(() => {
    setCollapsedRoomGroups((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const group of groupedHistoryItems) {
        const groupKey = group.items[0]
          ? getCareerHistoryGroupKeyFromSummary(group.items[0])
          : null;

        if (!groupKey) continue;

        const targetCollapsed = historyDisplayMode !== "expanded";
        if ((next[groupKey] ?? true) !== targetCollapsed) {
          next[groupKey] = targetCollapsed;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [groupedHistoryItems, historyDisplayMode]);

  const isGroupCollapsed = useCallback(
    (groupKey: string) => {
      if (historyDisplayMode === "expanded") return false;
      return collapsedRoomGroups[groupKey] ?? true;
    },
    [collapsedRoomGroups, historyDisplayMode],
  );

  const toggleGroup = useCallback(
    (groupKey: string) => {
      if (historyDisplayMode === "expanded") return;

      const willExpand = collapsedRoomGroups[groupKey] ?? true;

      setCollapsedRoomGroups((prev) => {
        const currentlyCollapsed = prev[groupKey] ?? true;

        if (currentlyCollapsed) {
          const next: Record<string, boolean> = {};

          for (const candidate of groupedHistoryItems) {
            const candidateKey = candidate.items[0]
              ? getCareerHistoryGroupKeyFromSummary(candidate.items[0])
              : null;

            if (!candidateKey) continue;
            next[candidateKey] = candidateKey !== groupKey;
          }

          return next;
        }

        return { ...prev, [groupKey]: true };
      });

      if (willExpand) {
        queueExpandedGroupVisibility(groupKey);
      }
    },
    [
      collapsedRoomGroups,
      groupedHistoryItems,
      historyDisplayMode,
      queueExpandedGroupVisibility,
    ],
  );

  return {
    clientId,
    scrollHostRef,
    loadingList,
    loadingMoreList,
    listError,
    nextCursorToken,
    historyRequestBlockedUntil,
    isHistoryRequestBlocked,
    showBackToTop,
    historyDisplayMode,
    setHistoryDisplayMode,
    groupedHistoryItems,
    isGroupCollapsed,
    toggleGroup,
    setGroupContainerRef,
    getSelfRankForSummary,
    recentTopScoreEntry,
    recentBestRankEntry,
    recentBestComboEntry,
    recentBestAccuracyEntry,
    selectedSummary,
    selectedRelatedSummaries,
    selectedReplay,
    isLoadingSelectedReplay,
    normalizedSelectedQuestionRecaps,
    openReplayDetail,
    closeReplayDetail,
    handleLoadMoreHistory,
    handleBackToTop,
    formatDateTime: formatCareerHistoryDateTime,
    getMatchDurationMs: getCareerHistoryMatchDurationMs,
    formatDuration: formatCareerHistoryDuration,
    formatRankFraction: formatCareerHistoryRankFraction,
  };
};

export default useCareerHistoryWorkspace;
