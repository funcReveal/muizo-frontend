import {
  AccessTime,
  ChevronRightRounded,
  MeetingRoom,
  Quiz,
  TimerOutlined,
} from "@mui/icons-material";
import { Chip, CircularProgress, Dialog, DialogContent } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ensureFreshAuthToken } from "../../../shared/auth/token";
import type {
  RoomSettlementHistorySummary,
  RoomSettlementQuestionRecap,
  RoomSettlementSnapshot,
} from "../model/types";
import { useRoom } from "../model/useRoom";
import type { SettlementQuestionRecap } from "./components/GameSettlementPanel";
import HistoryReplayCompactView from "./components/HistoryReplayCompactView";
const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const HISTORY_PAGE_LIMIT = 10;
const HISTORY_LIST_CACHE_TTL_MS = 90_000;
const HISTORY_GUARD_WINDOW_MS = 15_000;
const HISTORY_GUARD_MAX_REQUESTS = 16;
const HISTORY_GUARD_BLOCK_MS = 30_000;

type HistoryListResponse = {
  ok: boolean;
  data?: {
    items: RoomSettlementHistorySummary[];
    nextCursor: number | null;
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

const formatRelative = (timestamp: number) => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "剛剛";
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小時前`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} 天前`;
};

const buildHistoryHeaders = (token: string | null) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const buildHistoryListCacheKey = (clientId: string | null) =>
  `mq_history_list_v1:${clientId ?? "guest"}`;

const buildHistoryGuardKey = (clientId: string | null) =>
  `mq_history_guard_v1:${clientId ?? "guest"}`;

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

const formatRankFraction = (rank: number | null, playerCount: number | null | undefined) => {
  const safeCount =
    typeof playerCount === "number" && Number.isFinite(playerCount) && playerCount > 0
      ? Math.floor(playerCount)
      : null;
  if (typeof rank === "number" && Number.isFinite(rank) && rank > 0) {
    return safeCount ? `${Math.floor(rank)}/${safeCount}` : String(Math.floor(rank));
  }
  return safeCount ? `-/${safeCount}` : "-";
};

const isBetterRankResult = (
  candidate: { rank: number; playerCount: number; endedAt: number },
  currentBest: { rank: number; playerCount: number; endedAt: number } | null,
) => {
  if (!currentBest) return true;
  if (candidate.rank !== currentBest.rank) return candidate.rank < currentBest.rank;
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
    const meName = summary.selfPlayer?.usernameSnapshot?.trim().toLowerCase() ?? "";
    for (const participant of participants) {
      if (!participant || typeof participant !== "object") continue;
      const row = participant as Record<string, unknown>;
      const candidateName =
        typeof row.username === "string" ? row.username.trim().toLowerCase() : "";
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
      isCorrect: Boolean(choice.isCorrect ?? choice.index === recap.correctChoiceIndex),
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
              answeredAtMs: answer.answeredAtMs ?? answer.firstAnsweredAtMs ?? null,
            },
          ]),
        )
      : undefined,
  };
};

const RoomHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { clientId, authToken, refreshAuthToken, setStatusText } = useRoom();

  const [items, setItems] = useState<RoomSettlementHistorySummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loadingReplayMatchId, setLoadingReplayMatchId] = useState<string | null>(
    null,
  );
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

  const historyListCacheKey = useMemo(
    () => buildHistoryListCacheKey(clientId),
    [clientId],
  );
  const historyGuardKey = useMemo(
    () => buildHistoryGuardKey(clientId),
    [clientId],
  );
  const [historyRequestBlockedUntil, setHistoryRequestBlockedUntil] = useState(
    0,
  );

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

  const resolveScrollableParent = useCallback((node: HTMLElement) => {
    let current: HTMLElement | null = node.parentElement;
    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const isScrollable =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        current.scrollHeight > current.clientHeight + 1;
      if (isScrollable) return current;
      current = current.parentElement;
    }
    return null;
  }, []);

  const ensureExpandedGroupVisible = useCallback(
    (
      groupKey: string,
      options?: {
        behavior?: ScrollBehavior;
        minDelta?: number;
      },
    ) => {
      if (typeof window === "undefined") return;
      const container = groupContainerRefs.current[groupKey];
      if (!container) return;
      const behavior = options?.behavior ?? "smooth";
      const minDelta = options?.minDelta ?? 1.5;

      const scrollParent = resolveScrollableParent(container);
      const rect = container.getBoundingClientRect();

      let viewportTop = 16;
      let viewportBottom = window.innerHeight - 16;
      let applyScrollBy: ((delta: number) => void) | null = null;

      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        viewportTop = parentRect.top + 12;
        viewportBottom = parentRect.bottom - 12;
        applyScrollBy = (delta: number) => {
          scrollParent.scrollBy({ top: delta, behavior });
        };
      } else {
        applyScrollBy = (delta: number) => {
          window.scrollBy({ top: delta, behavior });
        };
      }

      const viewportHeight = viewportBottom - viewportTop;
      const canFitAll = rect.height <= viewportHeight;
      let delta = 0;

      if (canFitAll) {
        if (rect.top < viewportTop) {
          delta = rect.top - viewportTop;
        } else if (rect.bottom > viewportBottom) {
          delta = rect.bottom - viewportBottom;
        }
      } else if (rect.top < viewportTop || rect.bottom > viewportBottom) {
        delta = rect.top - viewportTop;
      }

      if (Math.abs(delta) > minDelta && applyScrollBy) {
        applyScrollBy(delta);
      }
    },
    [resolveScrollableParent],
  );

  const clearGroupVisibilityTimers = useCallback(() => {
    if (typeof window === "undefined") return;
    groupVisibilityTimerIdsRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    groupVisibilityTimerIdsRef.current = [];
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
          ensureExpandedGroupVisible(
            groupKey,
            delay >= 460
              ? { behavior: "auto", minDelta: 18 }
              : { behavior: "smooth", minDelta: 1.5 },
          );
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
  const selectedReplay = selectedMatchId ? replayByMatchId[selectedMatchId] : null;
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
      const index = sorted.findIndex((participant) => participant.clientId === clientId);
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
      return parsed.items
        .slice(0, HISTORY_PAGE_LIMIT)
        .sort((a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo);
    } catch {
      return null;
    }
  }, [historyListCacheKey]);

  const writeHistoryListCache = useCallback(
    (nextItems: RoomSettlementHistorySummary[]) => {
      if (typeof window === "undefined") return;
      try {
        const payload: HistoryListCachePayload = {
          savedAt: Date.now(),
          items: nextItems.slice(0, HISTORY_PAGE_LIMIT),
        };
        window.sessionStorage.setItem(historyListCacheKey, JSON.stringify(payload));
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
          window.sessionStorage.setItem(historyGuardKey, JSON.stringify(nextGuard));
        } catch {
          // ignore persist errors
        }
        return false;
      }

      nextGuard.blockedUntil = 0;
      setHistoryRequestBlockedUntil(0);
      try {
        window.sessionStorage.setItem(historyGuardKey, JSON.stringify(nextGuard));
      } catch {
        // ignore persist errors
      }
      return true;
    },
    [guardBlockedMessage, historyGuardKey, setStatusText],
  );

  const fetchHistoryList = useCallback(async () => {
    if (!API_URL) {
      throw new Error("找不到 API_URL 設定");
    }

    const token = await getBearerToken();
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    params.set("limit", String(HISTORY_PAGE_LIMIT));

    const res = await fetch(`${API_URL}/api/history/matches?${params.toString()}`, {
      method: "GET",
      headers: buildHistoryHeaders(token),
    });

    const payload = (await res.json().catch(() => null)) as
      | HistoryListResponse
      | null;

    if (!res.ok || !payload?.ok || !payload.data) {
      throw new Error(payload?.error ?? "讀取歷史列表失敗");
    }

    const merged = new Map<string, RoomSettlementHistorySummary>();
    for (const item of payload.data.items ?? []) {
      merged.set(item.matchId, item);
    }

    return Array.from(merged.values())
      .sort((a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo)
      .slice(0, HISTORY_PAGE_LIMIT);
  }, [clientId, getBearerToken]);

  const fetchReplay = useCallback(
    async (matchId: string) => {
      if (!API_URL) {
        throw new Error("找不到 API_URL 設定");
      }

      const token = await getBearerToken();
      const params = new URLSearchParams();
      if (clientId) params.set("clientId", clientId);

      const url = `${API_URL}/api/history/matches/${encodeURIComponent(matchId)}${params.size ? `?${params.toString()}` : ""
        }`;

      const res = await fetch(url, {
        method: "GET",
        headers: buildHistoryHeaders(token),
      });

      const payload = (await res.json().catch(() => null)) as
        | HistoryDetailResponse
        | null;

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
    if (historyRequestBlockedUntil <= 0 || typeof window === "undefined") return;
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

    if (cachedItems && cachedItems.length > 0) {
      setItems(cachedItems);
      setLoadingList(false);
      setListError(null);
    } else {
      setLoadingList(true);
      setListError(null);
    }

    if (!acquireHistoryRequestPermit("list")) {
      if (!cachedItems || cachedItems.length === 0) {
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
      .then((nextItems) => {
        if (cancelled) return;
        setItems(nextItems);
        writeHistoryListCache(nextItems);
        setListError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "讀取歷史列表失敗";
        if (cachedItems && cachedItems.length > 0) {
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
    let best: { item: RoomSettlementHistorySummary; rate: number } | null = null;
    for (const item of recentScoredItems) {
      const correctCount = item.selfPlayer?.correctCount ?? 0;
      const totalCount = item.questionCount > 0 ? item.questionCount : 1;
      const rate = correctCount / totalCount;
      if (!best || rate > best.rate || (rate === best.rate && item.endedAt > best.item.endedAt)) {
        best = { item, rate };
      }
    }
    return best;
  }, [recentScoredItems]);
  const recentBestRankEntry = useMemo(() => {
    let best: { item: RoomSettlementHistorySummary; rank: number } | null = null;
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
  const recentRoomSpread = useMemo(
    () => new Set(recentItems.map((item) => item.roomId)).size,
    [recentItems],
  );
  const latestRecentEntry = recentItems[0] ?? null;
  const oldestRecentEntry =
    recentItems.length > 0 ? recentItems[recentItems.length - 1] : null;

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
      const key = item.roomId || item.roomName || item.matchId;
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
        items: group.items.sort((a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo),
      }))
      .sort(
        (a, b) =>
          (b.items[0]?.endedAt ?? 0) - (a.items[0]?.endedAt ?? 0) ||
          (b.items[0]?.roundNo ?? 0) - (a.items[0]?.roundNo ?? 0),
      );
  }, [items]);

  useEffect(() => {
    setCollapsedRoomGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const group of groupedHistoryItems) {
        const groupKey = group.roomId || group.roomName || group.items[0]?.matchId;
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
        const groupKey = group.roomId || group.roomName || group.items[0]?.matchId;
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
        roomLabel?: string | null;
      },
    ) => {
      const selfRank = getSelfRankForSummary(item);
      const matchDurationMs = getMatchDurationMs(item.startedAt, item.endedAt);
      return (
        <button
          key={item.matchId}
          type="button"
          className="group relative block w-full min-w-0 overflow-hidden rounded-[18px] border border-sky-300/22 bg-[linear-gradient(180deg,rgba(12,18,24,0.9),rgba(6,9,13,0.98))] px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/34 hover:bg-[linear-gradient(180deg,rgba(14,22,30,0.94),rgba(7,11,16,0.99))] sm:px-5 sm:py-3.5"
          onClick={() => void openReplayDetail(item)}
          style={
            options?.animationDelayMs
              ? { transitionDelay: `${Math.min(options.animationDelayMs, 220)}ms` }
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-sky-300/40 opacity-70 transition group-hover:opacity-100" />
          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
                {options?.roomLabel && (
                  <Chip
                    size="small"
                    label={options.roomLabel}
                    className="border-amber-300/25 bg-amber-300/8 text-amber-100"
                    variant="outlined"
                  />
                )}
                <Chip
                  size="small"
                  label={`第 ${item.roundNo} 場`}
                  className="border-amber-300/30 bg-amber-300/10 text-amber-100"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`名次 ${formatRankFraction(selfRank, item.playerCount)}`}
                  className={
                    selfRank !== null
                      ? "border-amber-300/35 bg-amber-300/14 text-amber-50"
                      : "border-slate-300/28 bg-slate-300/10 text-slate-200/90"
                  }
                  variant="outlined"
                />
                {item.selfPlayer && (
                  <>
                    <Chip
                      size="small"
                      label={`分數 ${item.selfPlayer.finalScore}`}
                      className="border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`答對 ${item.selfPlayer.correctCount}/${item.questionCount}`}
                      className="border-sky-300/30 bg-sky-300/10 text-sky-100"
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Combo x${item.selfPlayer.maxCombo}`}
                      className="border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100"
                      variant="outlined"
                    />
                  </>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--mc-text-muted)]">
                <div className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                  <AccessTime sx={{ fontSize: 16 }} />
                  <span className="truncate">遊玩 {formatDuration(matchDurationMs)}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Quiz sx={{ fontSize: 16 }} />
                  <span>{item.questionCount} 題</span>
                </div>
                <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <MeetingRoom sx={{ fontSize: 16 }} />
                  <span>{item.playerCount} 人</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-center">
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

  const archiveHeader = (
    <section className="relative overflow-hidden rounded-[26px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.94),rgba(8,7,5,0.98))] p-4 shadow-[0_16px_36px_-28px_rgba(0,0,0,0.72)] sm:p-5">
      <div className="relative grid gap-4 lg:grid-cols-1">
        <div className="min-w-0">
          <div className="mb-4 inline-flex min-w-[180px] items-center rounded-2xl border border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface-strong)_86%,black_14%)] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--mc-text-muted)]">
                Match Archive
              </div>
              <h1 className="truncate text-lg font-semibold text-[var(--mc-text)] sm:text-xl">
                對戰歷史
              </h1>
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-6 text-[var(--mc-text-muted)] sm:text-[15px]">
            近 {HISTORY_PAGE_LIMIT} 場對戰快照，點擊指標可直接開啟對應回顧。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-100/90">
              已載入 {recentItems.length} / {HISTORY_PAGE_LIMIT} 場
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/28 bg-amber-300/8 p-1">
              <button
                type="button"
                aria-pressed={historyDisplayMode === "expanded"}
                onClick={() => setHistoryDisplayMode("expanded")}
                className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] transition ${
                  historyDisplayMode === "expanded"
                    ? "border border-emerald-300/35 bg-emerald-300/14 text-emerald-100"
                    : "border border-transparent text-amber-100/80 hover:border-amber-300/25 hover:bg-amber-300/10"
                }`}
              >
                完整顯示
              </button>
              <button
                type="button"
                aria-pressed={historyDisplayMode === "collapsed"}
                onClick={() => setHistoryDisplayMode("collapsed")}
                className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] transition ${
                  historyDisplayMode === "collapsed"
                    ? "border border-amber-300/40 bg-amber-300/16 text-amber-50"
                    : "border border-transparent text-amber-100/80 hover:border-amber-300/25 hover:bg-amber-300/10"
                }`}
              >
                摺疊顯示
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              disabled={!recentTopScoreEntry}
              onClick={() => {
                if (!recentTopScoreEntry) return;
                void openReplayDetail(recentTopScoreEntry);
              }}
              className={`min-h-[112px] rounded-2xl border p-3.5 text-left transition ${recentTopScoreEntry
                ? "border-emerald-300/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(5,30,24,0.78))] hover:-translate-y-0.5 hover:border-emerald-300/45"
                : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
                }`}
            >
              <div className="flex h-full flex-col">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                  近10把最高分
                </div>
                <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
                  {loadingList
                    ? "-"
                    : (recentTopScoreEntry?.selfPlayer?.finalScore ?? "-")}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[var(--mc-text-muted)]">
                  <span className="min-w-0 truncate whitespace-nowrap">
                    {recentTopScoreEntry
                      ? `第 ${recentTopScoreEntry.roundNo} 場`
                      : "尚無可用分數資料"}
                  </span>
                  {recentTopScoreEntry && (
                    <span className="rounded-full border border-emerald-300/35 bg-emerald-300/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-emerald-100">
                      查看
                    </span>
                  )}
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={!recentBestRankEntry}
              onClick={() => {
                if (!recentBestRankEntry) return;
                void openReplayDetail(recentBestRankEntry.item);
              }}
              className={`min-h-[112px] rounded-2xl border p-3.5 text-left transition ${
                recentBestRankEntry
                  ? "border-amber-300/28 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(40,24,8,0.78))] hover:-translate-y-0.5 hover:border-amber-300/50"
                  : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
              }`}
            >
              <div className="flex h-full flex-col">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                  近10把最佳名次
                </div>
                <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
                  {loadingList
                    ? "-"
                    : recentBestRankEntry
                      ? formatRankFraction(
                          recentBestRankEntry.rank,
                          recentBestRankEntry.item.playerCount,
                        )
                      : "-"}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[var(--mc-text-muted)]">
                  <span className="min-w-0 truncate whitespace-nowrap">
                    {recentBestRankEntry
                      ? `第 ${recentBestRankEntry.item.roundNo} 場`
                      : "尚無可用名次資料"}
                  </span>
                  {recentBestRankEntry && (
                    <span className="rounded-full border border-amber-300/38 bg-amber-300/14 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-amber-50">
                      查看
                    </span>
                  )}
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={!recentBestComboEntry}
              onClick={() => {
                if (!recentBestComboEntry) return;
                void openReplayDetail(recentBestComboEntry);
              }}
              className={`min-h-[112px] rounded-2xl border p-3.5 text-left transition ${recentBestComboEntry
                ? "border-fuchsia-300/22 bg-[linear-gradient(180deg,rgba(116,58,176,0.14),rgba(22,12,32,0.78))] hover:-translate-y-0.5 hover:border-fuchsia-300/38"
                : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
                }`}
            >
              <div className="flex h-full flex-col">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                  近10把最佳 COMBO
                </div>
                <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
                  {loadingList
                    ? "-"
                    : recentBestComboEntry?.selfPlayer
                      ? `x${recentBestComboEntry.selfPlayer.maxCombo}`
                      : "-"}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[var(--mc-text-muted)]">
                  <span className="min-w-0 truncate whitespace-nowrap">
                    {recentBestComboEntry
                      ? `第 ${recentBestComboEntry.roundNo} 場`
                      : "尚無可用 Combo 資料"}
                  </span>
                  {recentBestComboEntry && (
                    <span className="rounded-full border border-fuchsia-300/35 bg-fuchsia-300/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-fuchsia-100">
                      查看
                    </span>
                  )}
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={!recentBestAccuracyEntry}
              onClick={() => {
                if (!recentBestAccuracyEntry) return;
                void openReplayDetail(recentBestAccuracyEntry.item);
              }}
              className={`min-h-[112px] rounded-2xl border p-3.5 text-left transition ${recentBestAccuracyEntry
                ? "border-sky-300/24 bg-[linear-gradient(180deg,rgba(14,116,144,0.16),rgba(7,23,38,0.8))] hover:-translate-y-0.5 hover:border-sky-300/45"
                : "cursor-default border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)]"
                }`}
            >
              <div className="flex h-full flex-col">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                  近10把最佳答對率
                </div>
                <div className="mt-2 text-4xl font-semibold leading-none text-[var(--mc-text)]">
                  {loadingList
                    ? "-"
                    : recentBestAccuracyEntry
                      ? `${Math.round(recentBestAccuracyEntry.rate * 100)}%`
                      : "-"}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 text-xs text-[var(--mc-text-muted)]">
                  <span className="min-w-0 truncate whitespace-nowrap">
                    {recentBestAccuracyEntry
                      ? `第 ${recentBestAccuracyEntry.item.roundNo} 場`
                      : "尚無可用答對率資料"}
                  </span>
                  {recentBestAccuracyEntry && (
                    <span className="rounded-full border border-sky-300/35 bg-sky-300/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-sky-100">
                      查看
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>
          <div className="mt-2 text-xs text-[var(--mc-text-muted)]/80">
            近況：{latestRecentEntry
              ? `分布 ${recentRoomSpread} 個房間，最近一場在 ${formatRelative(latestRecentEntry.endedAt) || formatDateTime(latestRecentEntry.endedAt)}`
              : "尚無對戰資料"}
          </div>
        </div>

        <div className="hidden rounded-2xl border border-amber-300/18 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(245,158,11,0.02))] p-4 sm:p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-amber-200/80">
            使用提示
          </div>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-[var(--mc-text-muted)]">
            <li>1. 點擊房間群組可展開同一房間的多場對戰紀錄。</li>
            <li>2. 每場紀錄會顯示分數、答對數、最大 Combo 與歌單來源。</li>
            <li>3. 點進詳情後可查看完整結算回顧與題目紀錄。</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-[var(--mc-accent)]/55 bg-[var(--mc-accent)]/16 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-[var(--mc-text)] transition hover:bg-[var(--mc-accent)]/22"
              onClick={() => navigate("/rooms", { replace: true })}
            >
              返回房間列表
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  const listView = (
    <section className="mt-5 space-y-4">
      {historyRequestBlockedUntil > Date.now() && (
        <div className="rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          你的查詢頻率過高，已暫時限制歷史請求，請稍後再試。
        </div>
      )}
      {loadingList ? (
        <div className="flex items-center justify-center rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.86),rgba(8,7,5,0.96))] px-6 py-10 text-[var(--mc-text-muted)]">
          <div className="inline-flex items-center gap-3">
            <CircularProgress size={18} thickness={5} sx={{ color: "#f59e0b" }} />
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
            完成一場遊戲後，系統會將結算摘要與回顧資料存到歷史頁。之後可以回來查看分數、答對數與 Combo 表現。
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 sm:space-y-[18px]">
            {groupedHistoryItems.map((group, groupIndex) => {
              const groupKey = group.roomId || group.roomName || group.items[0]?.matchId;
              if (!groupKey) return null;
              const collapsed =
                historyDisplayMode === "expanded"
                  ? false
                  : (collapsedRoomGroups[groupKey] ?? true);
              const firstItem = group.items[group.items.length - 1] ?? null;
              const firstPlayedAt = firstItem?.startedAt ?? firstItem?.endedAt ?? 0;
              const groupBestScore = group.items.reduce(
                (max, entry) => Math.max(max, entry.selfPlayer?.finalScore ?? 0),
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
              const groupTotalQuestionCount = group.items.reduce(
                (sum, entry) => sum + Math.max(0, entry.questionCount),
                0,
              );
              const groupTotalDurationMs = group.items.reduce((sum, entry) => {
                const duration = getMatchDurationMs(entry.startedAt, entry.endedAt);
                return sum + (duration ?? 0);
              }, 0);

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
                          className="pointer-events-none absolute inset-x-6 top-0 z-0 h-full rounded-[18px] border border-amber-300/12 bg-[linear-gradient(180deg,rgba(14,11,9,0.88),rgba(7,6,4,0.95))]"
                          style={{ transform: "translateY(12px)" }}
                        />
                        <span
                          className="pointer-events-none absolute inset-x-3 top-0 z-10 h-full rounded-[18px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(16,13,10,0.92),rgba(8,7,5,0.98))]"
                          style={{ transform: "translateY(7px)" }}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      className={`group relative z-20 block w-full min-w-0 overflow-hidden rounded-[18px] border px-4 py-3 text-left transition duration-200 sm:px-5 sm:py-3.5 ${
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
                              const candidateKey =
                                candidate.roomId ||
                                candidate.roomName ||
                                candidate.items[0]?.matchId;
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
                      }}
                    >
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-amber-300/45 opacity-85 transition group-hover:opacity-100" />
                      <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
                            <Chip
                              size="small"
                              label={group.roomName || group.roomId}
                              className="border-amber-300/22 bg-amber-300/8 text-amber-100"
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={`資料集 ${group.items.length} 場`}
                              className="border-amber-300/36 bg-amber-300/18 text-amber-50"
                              variant="outlined"
                            />
                            {groupBestScore > 0 && (
                              <Chip
                                size="small"
                                label={`最佳 ${groupBestScore}`}
                                className="border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                                variant="outlined"
                              />
                            )}
                            <Chip
                              size="small"
                              label={`最佳名次 ${formatRankFraction(
                                groupBestRank?.rank ?? null,
                                groupBestRank?.playerCount,
                              )}`}
                              className={
                                groupBestRank !== null
                                  ? "border-amber-300/35 bg-amber-300/14 text-amber-50"
                                  : "border-slate-300/28 bg-slate-300/10 text-slate-200/90"
                              }
                              variant="outlined"
                            />
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--mc-text-muted)]">
                            <div className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                              <AccessTime sx={{ fontSize: 16 }} />
                              <span className="truncate">
                                首場 {formatMonthDayTime(firstPlayedAt)}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <TimerOutlined sx={{ fontSize: 16 }} />
                              <span>
                                總遊玩 {formatDuration(groupTotalDurationMs)}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <Quiz sx={{ fontSize: 16 }} />
                              <span>
                                總題數 {groupTotalQuestionCount} 題
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 self-start text-right sm:self-center sm:pr-1">
                          <span className="mb-1.5 hidden items-center justify-end text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/72 sm:flex">
                            Collection
                          </span>
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
                                    transform: collapsed ? "rotate(90deg)" : "rotate(270deg)",
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
                    className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${collapsed
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
                      <div className="space-y-1.5 border-l border-amber-300/26 pl-3 sm:pl-4">
                        {group.items.map((item, itemIndex) => (
                          <div
                            key={item.matchId}
                            className={`relative transition-all duration-300 ease-out motion-reduce:transition-none ${collapsed
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
                              className={`pointer-events-none absolute -left-3 top-1/2 h-px w-3 -translate-y-1/2 bg-amber-300/48 transition-opacity duration-300 ${collapsed ? "opacity-0" : "opacity-100"
                                }`}
                            />
                            {renderMatchRecordCard(item, {
                              animationDelayMs: groupIndex * 40 + itemIndex * 28,
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
          <div className="px-1 text-xs text-[var(--mc-text-muted)]/80">
            {oldestRecentEntry
              ? `目前顯示最近 ${recentItems.length} 場，從第 ${oldestRecentEntry.roundNo} 場開始。`
              : "目前沒有可顯示的對戰場次。"}
          </div>
        </>
      )}
    </section>
  );

  const replayModal = (
    <Dialog
      open={Boolean(selectedMatchId)}
      onClose={() => setSelectedMatchId(null)}
      fullScreen
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.9))",
        },
      }}
    >
      <DialogContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {selectedSummary && (
          <div className="mb-3 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                  Match Replay
                </p>
                <p className="mt-1 truncate text-base font-semibold text-[var(--mc-text)]">
                  {selectedSummary.roomName || selectedSummary.roomId}
                </p>
                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  第 {selectedSummary.roundNo} 場 · {selectedSummary.playerCount} 人 · {selectedSummary.questionCount} 題 ·
                  {" "}開始 {formatDateTime(selectedSummary.startedAt)} · 結束 {formatDateTime(selectedSummary.endedAt)} ·
                  {" "}遊玩 {formatDuration(getMatchDurationMs(selectedSummary.startedAt, selectedSummary.endedAt))}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-500/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-slate-400"
                onClick={() => setSelectedMatchId(null)}
              >
                關閉回放
              </button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoadingSelectedReplay && !selectedReplay ? (
            <div className="rounded-[20px] border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-6">
              <div className="flex items-center justify-center rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/50 px-4 py-12 text-[var(--mc-text-muted)]">
                <div className="inline-flex items-center gap-3">
                  <CircularProgress size={18} thickness={5} sx={{ color: "#f59e0b" }} />
                  載入對戰回顧中...
                </div>
              </div>
            </div>
          ) : selectedReplay ? (
            <HistoryReplayCompactView
              key={selectedSummary?.matchId}
              room={selectedReplay.room}
              participants={selectedReplay.participants}
              messages={selectedReplay.messages}
              playlistItems={selectedReplay.playlistItems ?? []}
              trackOrder={selectedReplay.trackOrder}
              playedQuestionCount={selectedReplay.playedQuestionCount}
              startedAt={selectedReplay.startedAt}
              endedAt={selectedReplay.endedAt}
              meClientId={clientId}
              questionRecaps={normalizedSelectedQuestionRecaps}
            />
          ) : (
            <div className="rounded-[20px] border border-amber-300/16 bg-amber-300/5 px-4 py-5 text-sm text-amber-100/90">
              這場對戰尚未取得完整回放內容，可能已被精簡或仍在同步中，請稍後再試。
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="mx-auto w-full max-w-[1320px] min-w-0 px-1 sm:px-0">
      {archiveHeader}
      {listView}
      {replayModal}
    </div>
  );
};

export default RoomHistoryPage;







