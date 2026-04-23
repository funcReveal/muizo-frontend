import {
  AccessTime,
  ChevronRightRounded,
  KeyboardArrowUpRounded,
  LibraryMusic,
  MeetingRoom,
  QueueMusic,
  YouTube,
} from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import {
  useRoomSession,
  type RoomSettlementHistorySummary,
  type RoomSettlementQuestionRecap,
  type RoomSettlementSnapshot,
} from "@features/RoomSession";
import {
  getHistorySummaryPlaylistDisplayTitle,
  getHistorySummaryPlaylistItemCount,
  getHistorySummaryPlaylistSourceLabel,
  isCollectionHistorySummary,
  isYouTubeHistorySummary,
} from "@features/Settlement/model/historySummaryAdapter";
import type { SettlementQuestionRecap } from "@features/Settlement/ui/components/GameSettlementPanel";
import HistoryArchiveHeader from "@features/Settlement/ui/components/roomHistoryPage/HistoryArchiveHeader";
import HistoryReplayDialog from "@features/Settlement/ui/components/roomHistoryPage/HistoryReplayDialog";

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

type HistoryListDisplayMode = "expanded" | "collapsed";

const formatDateTime = (timestamp: number) => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "-";
  return new Date(timestamp).toLocaleString();
};

const buildHistoryHeaders = (token: string | null) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const buildHistoryListCacheKey = (clientId: string | null) =>
  `history_list_v1:${clientId ?? "guest"}`;

const buildHistoryGuardKey = (clientId: string | null) =>
  `history_guard_v1:${clientId ?? "guest"}`;

const getHistoryGroupKeyFromSummary = (summary: RoomSettlementHistorySummary) =>
  summary.roomId || summary.roomName || summary.matchId;

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

const getMatchDurationMs = (startedAt: number, endedAt: number) => {
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return null;
  if (startedAt <= 0 || endedAt <= 0 || endedAt <= startedAt) return null;
  return endedAt - startedAt;
};

const formatDuration = (durationMs: number | null) => {
  if (!durationMs || durationMs <= 0) return "-";
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}時 ${minutes}分 ${seconds}秒`;
  if (minutes > 0) return `${minutes}分 ${seconds}秒`;
  return `${seconds}秒`;
};

const formatMonthDayTime = (timestamp: number) => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "-";
  return new Date(timestamp).toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatScore = (score: number | null | undefined) => {
  if (typeof score !== "number" || !Number.isFinite(score)) return "-";
  return Math.max(0, Math.floor(score)).toLocaleString("zh-TW");
};

const formatRankFraction = (
  rank: number | null,
  playerCount: number | null | undefined,
) => {
  const safeCount =
    typeof playerCount === "number" &&
    Number.isFinite(playerCount) &&
    playerCount > 0
      ? Math.floor(playerCount)
      : null;
  if (typeof rank === "number" && Number.isFinite(rank) && rank > 0) {
    return safeCount
      ? `${Math.floor(rank)}/${safeCount}`
      : String(Math.floor(rank));
  }
  return safeCount ? `-/${safeCount}` : "-";
};

const isBetterRankResult = (
  candidate: { rank: number; playerCount: number; endedAt: number },
  currentBest: { rank: number; playerCount: number; endedAt: number } | null,
) => {
  if (!currentBest) return true;
  if (candidate.rank !== currentBest.rank)
    return candidate.rank < currentBest.rank;
  if (candidate.playerCount !== currentBest.playerCount) {
    return candidate.playerCount > currentBest.playerCount;
  }
  return candidate.endedAt > currentBest.endedAt;
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

const CareerHistoryWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { clientId, authToken, refreshAuthToken } = useAuth();
  const { setStatusText } = useRoomSession();

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
  const [historyRequestBlockedUntil, setHistoryRequestBlockedUntil] =
    useState(0);

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
    [acquireHistoryRequestPermit, fetchReplay, replayByMatchId, setStatusText],
  );

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
      if (isBetterRankResult(candidate, currentBest)) {
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
      const key = getHistoryGroupKeyFromSummary(item);
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
    const targetGroupKey = getHistoryGroupKeyFromSummary(selectedSummary);
    const matchedGroup = groupedHistoryItems.find((group) => {
      const groupSeed = group.items[0];
      return (
        groupSeed && getHistoryGroupKeyFromSummary(groupSeed) === targetGroupKey
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
          ? getHistoryGroupKeyFromSummary(group.items[0])
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
          ? getHistoryGroupKeyFromSummary(group.items[0])
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

  const renderMatchRecordCard = useCallback(
    (
      item: RoomSettlementHistorySummary,
      options?: {
        animationDelayMs?: number;
      },
    ) => {
      const selfRank = getSelfRankForSummary(item);
      const matchDurationMs = getMatchDurationMs(item.startedAt, item.endedAt);
      const correctCount = item.selfPlayer?.correctCount ?? 0;
      const maxCombo = item.selfPlayer?.maxCombo ?? 0;
      const finalScore = item.selfPlayer?.finalScore ?? 0;
      const sourceLabel = getHistorySummaryPlaylistSourceLabel(item);
      const playlistTitle = getHistorySummaryPlaylistDisplayTitle(item);
      const playlistItemCount = getHistorySummaryPlaylistItemCount(item);
      const isCollectionSource = isCollectionHistorySummary(item);
      const isYouTubeSource = isYouTubeHistorySummary(item);

      return (
        <button
          key={item.matchId}
          type="button"
          className="group relative block w-full min-w-0 overflow-hidden rounded-[16px] border border-sky-300/22 bg-[linear-gradient(180deg,rgba(12,18,24,0.9),rgba(6,9,13,0.98))] px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/34 hover:bg-[linear-gradient(180deg,rgba(14,22,30,0.94),rgba(7,11,16,0.99))]"
          onClick={() => void openReplayDetail(item)}
          style={
            options?.animationDelayMs
              ? {
                  transitionDelay: `${Math.min(options.animationDelayMs, 220)}ms`,
                }
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-sky-300/40 opacity-70 transition group-hover:opacity-100" />

          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
            <div className="min-w-0 pr-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="min-w-0 truncate text-base font-semibold tracking-tight text-[var(--mc-text)]">
                  {playlistTitle}
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold ${
                    isYouTubeSource
                      ? "text-rose-300"
                      : isCollectionSource
                        ? "text-sky-100"
                        : "text-slate-200/88"
                  }`}
                >
                  {isYouTubeSource ? (
                    <YouTube sx={{ fontSize: 16 }} />
                  ) : isCollectionSource ? (
                    <LibraryMusic sx={{ fontSize: 16 }} />
                  ) : null}
                  <span>{sourceLabel}</span>
                </span>

                {playlistItemCount !== null && playlistItemCount > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-slate-200/82">
                    <QueueMusic sx={{ fontSize: 15 }} />
                    <span>{playlistItemCount} 首</span>
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-[var(--mc-text)]">
                <span>第 {item.roundNo} 場</span>
                <span className="text-[var(--mc-text-muted)]/45">•</span>
                <span
                  className={selfRank !== null ? "text-amber-100" : undefined}
                >
                  名次 {formatRankFraction(selfRank, item.playerCount)}
                </span>
                <span className="text-[var(--mc-text-muted)]/45">•</span>
                <span className="text-emerald-100">
                  分數 {formatScore(finalScore)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--mc-text-muted)]">
                <span>
                  答對 {correctCount}/{item.questionCount}
                </span>
                <span>Combo x{maxCombo}</span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <AccessTime sx={{ fontSize: 16 }} />
                  <span>{formatDuration(matchDurationMs)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <MeetingRoom sx={{ fontSize: 16 }} />
                  <span>{item.playerCount} 人</span>
                </span>
              </div>
            </div>

            <div className="shrink-0 self-start xl:self-center">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-sky-300/30 bg-sky-300/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] text-sky-100 transition group-hover:border-sky-300/50 group-hover:bg-sky-300/18">
                查看回顧
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-300/40 bg-sky-300/12">
                  <ChevronRightRounded sx={{ fontSize: 15 }} />
                </span>
              </span>
            </div>
          </div>
        </button>
      );
    },
    [getSelfRankForSummary, openReplayDetail],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <HistoryArchiveHeader
          loadingList={loadingList}
          historyDisplayMode={historyDisplayMode}
          onHistoryDisplayModeChange={setHistoryDisplayMode}
          recentTopScoreEntry={recentTopScoreEntry}
          recentBestRankEntry={recentBestRankEntry}
          recentBestComboEntry={recentBestComboEntry}
          recentBestAccuracyEntry={recentBestAccuracyEntry}
          onOpenReplay={(summary) => {
            void openReplayDetail(summary);
          }}
          onBackToRooms={() => navigate("/rooms", { replace: true })}
          formatRankFraction={formatRankFraction}
        />
      </div>

      <div ref={scrollHostRef} className="min-h-0 flex-1 overflow-auto pr-1">
        <section className="space-y-4">
          {historyRequestBlockedUntil > Date.now() && (
            <div className="rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              你的查詢頻率過高，已暫時限制歷史請求，請稍後再試。
            </div>
          )}

          {loadingList ? (
            <div className="flex items-center justify-center rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.86),rgba(8,7,5,0.96))] px-6 py-10 text-[var(--mc-text-muted)]">
              <div className="inline-flex items-center gap-3">
                <CircularProgress
                  size={18}
                  thickness={5}
                  sx={{ color: "#f59e0b" }}
                />
                載入對戰歷史中...
              </div>
            </div>
          ) : listError ? (
            <div className="rounded-[24px] border border-rose-400/20 bg-rose-950/20 px-6 py-5 text-sm text-rose-100">
              {listError}
            </div>
          ) : items.length === 0 ? (
            <div className="relative overflow-hidden rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.86),rgba(8,7,5,0.96))] p-6 text-center">
              <h2 className="text-lg font-semibold text-[var(--mc-text)]">
                尚無對戰紀錄
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)]">
                完成一場遊戲後，系統會將結算摘要與回顧資料存到歷史頁。之後可以回來查看分數、答對數與
                Combo 表現。
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {groupedHistoryItems.map((group, groupIndex) => {
                  const groupKey = group.items[0]
                    ? getHistoryGroupKeyFromSummary(group.items[0])
                    : null;
                  if (!groupKey) return null;

                  const collapsed =
                    historyDisplayMode === "expanded"
                      ? false
                      : (collapsedRoomGroups[groupKey] ?? true);

                  const groupBestScore = group.items.reduce(
                    (max, entry) =>
                      Math.max(max, entry.selfPlayer?.finalScore ?? 0),
                    0,
                  );

                  const groupBestRank = group.items.reduce<{
                    rank: number;
                    playerCount: number;
                    endedAt: number;
                  } | null>((best, entry) => {
                    const rank = getSelfRankForSummary(entry);
                    if (rank === null) return best;
                    const next = {
                      rank,
                      playerCount: entry.playerCount,
                      endedAt: entry.endedAt,
                    };
                    return isBetterRankResult(next, best) ? next : best;
                  }, null);

                  const latestItem = group.items[0] ?? null;
                  const latestPlayedAt =
                    latestItem?.endedAt ?? latestItem?.startedAt ?? 0;
                  const groupTotalQuestionCount = group.items.reduce(
                    (sum, entry) => sum + Math.max(0, entry.questionCount),
                    0,
                  );

                  const groupSummaryItems = [
                    `最近遊玩 ${formatMonthDayTime(latestPlayedAt)}`,
                    `共 ${group.items.length} 場`,
                    ...(groupBestScore > 0
                      ? [`最佳分數 ${formatScore(groupBestScore)}`]
                      : []),
                    `最佳名次 ${formatRankFraction(
                      groupBestRank?.rank ?? null,
                      groupBestRank?.playerCount,
                    )}`,
                    ...(groupTotalQuestionCount > 0
                      ? [`累計題數 ${groupTotalQuestionCount} 題`]
                      : []),
                  ];

                  return (
                    <div
                      key={groupKey}
                      className="relative space-y-1.5"
                      ref={(node) => setGroupContainerRef(groupKey, node)}
                    >
                      <div className="relative">
                        {collapsed && (
                          <>
                            <span
                              className="pointer-events-none absolute inset-x-4 top-0 z-0 h-full rounded-[16px] border border-amber-300/10 bg-[linear-gradient(180deg,rgba(14,11,9,0.86),rgba(7,6,4,0.94))]"
                              style={{ transform: "translateY(9px)" }}
                            />
                            <span
                              className="pointer-events-none absolute inset-x-2 top-0 z-10 h-full rounded-[16px] border border-amber-300/14 bg-[linear-gradient(180deg,rgba(16,13,10,0.9),rgba(8,7,5,0.97))]"
                              style={{ transform: "translateY(5px)" }}
                            />
                          </>
                        )}

                        <button
                          type="button"
                          className={`group relative z-20 block w-full min-w-0 overflow-hidden rounded-[16px] border px-3 py-3 text-left transition duration-200 ${
                            historyDisplayMode === "expanded"
                              ? "cursor-default border-amber-300/45 bg-[linear-gradient(180deg,rgba(24,20,14,0.97),rgba(10,8,6,1))] shadow-[0_12px_24px_-20px_rgba(245,158,11,0.38)]"
                              : collapsed
                                ? "border-amber-300/42 bg-[linear-gradient(180deg,rgba(22,18,13,0.98),rgba(10,8,6,1))] shadow-[0_10px_22px_-22px_rgba(245,158,11,0.3)] hover:border-amber-300/58"
                                : "border-amber-300/55 bg-[linear-gradient(180deg,rgba(24,20,14,0.97),rgba(10,8,6,1))] shadow-[0_12px_24px_-20px_rgba(245,158,11,0.42)]"
                          }`}
                          disabled={historyDisplayMode === "expanded"}
                          aria-expanded={!collapsed}
                          onClick={() => {
                            if (historyDisplayMode === "expanded") return;
                            const willExpand = collapsed;
                            setCollapsedRoomGroups((prev) => {
                              const currentlyCollapsed = prev[groupKey] ?? true;
                              if (currentlyCollapsed) {
                                const next: Record<string, boolean> = {};
                                for (const candidate of groupedHistoryItems) {
                                  const candidateKey = candidate.items[0]
                                    ? getHistoryGroupKeyFromSummary(
                                        candidate.items[0],
                                      )
                                    : null;
                                  if (!candidateKey) continue;
                                  next[candidateKey] =
                                    candidateKey !== groupKey;
                                }
                                return next;
                              }
                              return { ...prev, [groupKey]: true };
                            });
                            if (willExpand) {
                              queueExpandedGroupVisibility(groupKey);
                            }
                          }}
                        >
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-amber-300/45 opacity-85 transition group-hover:opacity-100" />

                          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:gap-5">
                            <div className="min-w-0 pr-1">
                              <div className="truncate text-lg font-semibold tracking-tight text-[var(--mc-text)]">
                                {group.roomName || group.roomId}
                              </div>

                              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--mc-text-muted)]">
                                {groupSummaryItems.map((summaryItem, index) => (
                                  <React.Fragment key={summaryItem}>
                                    {index > 0 && (
                                      <span className="text-[var(--mc-text-muted)]/40">
                                        •
                                      </span>
                                    )}
                                    <span className="truncate">
                                      {summaryItem}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>

                            <div className="shrink-0 self-start text-right xl:self-center">
                              <span
                                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.12em] transition ${
                                  historyDisplayMode === "expanded"
                                    ? "border-emerald-300/42 bg-emerald-300/14 text-emerald-100"
                                    : collapsed
                                      ? "border-amber-300/45 bg-amber-300/16 text-amber-50"
                                      : "border-amber-300/52 bg-amber-300/18 text-amber-50"
                                }`}
                              >
                                {historyDisplayMode === "expanded"
                                  ? "完整顯示"
                                  : collapsed
                                    ? "展開"
                                    : "收合"}
                                {historyDisplayMode !== "expanded" && (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300/45 bg-amber-300/12">
                                    <ChevronRightRounded
                                      sx={{
                                        fontSize: 14,
                                        transform: collapsed
                                          ? "rotate(90deg)"
                                          : "rotate(270deg)",
                                        transition: "transform 180ms ease",
                                      }}
                                    />
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>

                      <div
                        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
                          collapsed
                            ? "mt-0 grid-rows-[0fr] opacity-0"
                            : "mt-1 grid-rows-[1fr] opacity-100"
                        }`}
                      >
                        <div
                          className={
                            collapsed
                              ? "pointer-events-none min-h-0 overflow-hidden"
                              : "min-h-0 overflow-hidden"
                          }
                        >
                          <div className="space-y-1.5 border-l border-amber-300/26 pl-3">
                            {group.items.map((item, itemIndex) => (
                              <div
                                key={item.matchId}
                                className={`relative transition-all duration-300 ease-out motion-reduce:transition-none ${
                                  collapsed
                                    ? "translate-y-2 opacity-0"
                                    : "translate-y-0 opacity-100"
                                }`}
                                style={{
                                  transitionDelay: collapsed
                                    ? "0ms"
                                    : `${50 + itemIndex * 35}ms`,
                                }}
                              >
                                <span
                                  className={`pointer-events-none absolute -left-3 top-1/2 h-px w-3 -translate-y-1/2 bg-amber-300/48 transition-opacity duration-300 ${
                                    collapsed ? "opacity-0" : "opacity-100"
                                  }`}
                                />
                                {renderMatchRecordCard(item, {
                                  animationDelayMs:
                                    groupIndex * 40 + itemIndex * 28,
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {nextCursorToken && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => void handleLoadMoreHistory()}
                    disabled={loadingMoreList}
                    className="inline-flex min-w-[132px] items-center justify-center rounded-full border border-sky-300/24 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loadingMoreList ? "載入中..." : "載入更多"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showBackToTop && (
        <button
          type="button"
          aria-label="回到頂部"
          onClick={handleBackToTop}
          className="absolute bottom-4 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-300/30 bg-[linear-gradient(180deg,rgba(10,26,42,0.92),rgba(6,14,24,0.96))] text-sky-100 shadow-[0_18px_34px_-22px_rgba(14,165,233,0.55)] transition hover:-translate-y-0.5 hover:border-sky-300/50 hover:bg-sky-300/14"
        >
          <KeyboardArrowUpRounded sx={{ fontSize: 24 }} />
        </button>
      )}

      <HistoryReplayDialog
        open={Boolean(selectedMatchId)}
        onClose={() => setSelectedMatchId(null)}
        selectedSummary={selectedSummary}
        relatedSummaries={selectedRelatedSummaries}
        selectedReplay={selectedReplay}
        isLoadingSelectedReplay={isLoadingSelectedReplay}
        onSelectSummary={(summary) => {
          void openReplayDetail(summary);
        }}
        meClientId={clientId}
        questionRecaps={normalizedSelectedQuestionRecaps}
        formatDateTime={formatDateTime}
        getMatchDurationMs={getMatchDurationMs}
        formatDuration={formatDuration}
      />
    </div>
  );
};

export default CareerHistoryWorkspace;
