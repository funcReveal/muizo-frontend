import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogContent,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import GameRoomPage from "./GameRoomPage";
import type { SettlementQuestionRecap } from "./components/GameSettlementPanel";
import LiveSettlementShowcase from "./components/LiveSettlementShowcase";
import HistoryReplayCompactView from "./components/HistoryReplayCompactView";
import RoomLobbyPanel from "./components/RoomLobbyPanel";
import {
  formatLobbySettlementSummary,
  SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX,
  type LobbySettlementStats,
} from "./components/roomLobbyPanelUtils";
import type {
  ChatMessage,
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
} from "../model/types";
import { useRoom } from "../model/useRoom";

const SETTLEMENT_SESSION_CACHE_KEY_PREFIX = "mq:settlement-cache:v1:";
const SETTLEMENT_SUMMARY_CACHE_LIMIT = 80;
const SETTLEMENT_REPLAY_CACHE_LIMIT = 1;
const SETTLEMENT_RECAP_CACHE_LIMIT = 1;
const HISTORY_DRAWER_PAGE_SIZE = 24;
type RoomHistoryLocationState = {
  roomHistoryDrawerKey?: number;
};

type SelfSettlementStats = LobbySettlementStats & {
  maxCombo: number | null;
};

const sortSettlementParticipants = (
  participants: RoomSettlementSnapshot["participants"],
) =>
  [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const comboA = a.maxCombo ?? a.combo ?? 0;
    const comboB = b.maxCombo ?? b.combo ?? 0;
    if (comboB !== comboA) return comboB - comboA;
    return a.joinedAt - b.joinedAt;
  });

const cloneSettlementRecaps = (recaps: SettlementQuestionRecap[]) =>
  recaps.map((item) => ({
    ...item,
    choices: item.choices.map((choice) => ({ ...choice })),
  }));

type SettlementSessionCachePayload = {
  summaries: RoomSettlementHistorySummary[];
  replays: Record<string, RoomSettlementSnapshot>;
  updatedAt?: number;
};

const limitSettlementSummaries = (
  summaries: RoomSettlementHistorySummary[],
  limit = SETTLEMENT_SUMMARY_CACHE_LIMIT,
) =>
  [...summaries]
    .sort((a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo)
    .slice(0, limit);

const parseRoundTimestampFromKey = (roundKey: string) => {
  const lastColonIndex = roundKey.lastIndexOf(":");
  if (lastColonIndex < 0) return Number.NaN;
  return Number(roundKey.slice(lastColonIndex + 1));
};

const pruneSettlementReplayByRoundKey = (
  replayByRoundKey: Record<string, RoomSettlementSnapshot>,
  options: {
    roomId?: string | null;
    pinnedRoundKeys?: (string | null | undefined)[];
    limit?: number;
  },
) => {
  const limit = options.limit ?? SETTLEMENT_REPLAY_CACHE_LIMIT;
  if (limit <= 0) return {} as Record<string, RoomSettlementSnapshot>;
  const pinnedRoundKeys = options.pinnedRoundKeys ?? [];
  const roomId = options.roomId ?? null;
  const next: Record<string, RoomSettlementSnapshot> = {};
  for (const roundKey of pinnedRoundKeys) {
    if (!roundKey) continue;
    const snapshot = replayByRoundKey[roundKey];
    if (!snapshot) continue;
    if (roomId && snapshot.room.id !== roomId) continue;
    next[roundKey] = snapshot;
    if (Object.keys(next).length >= limit) return next;
  }
  const sortedSnapshots = Object.values(replayByRoundKey)
    .filter((snapshot) => (roomId ? snapshot.room.id === roomId : true))
    .sort((a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo);
  for (const snapshot of sortedSnapshots) {
    if (next[snapshot.roundKey]) continue;
    next[snapshot.roundKey] = snapshot;
    if (Object.keys(next).length >= limit) break;
  }
  return next;
};

const pruneSettlementRecapsByRoundKey = (
  recapsByRoundKey: Record<string, SettlementQuestionRecap[]>,
  options: {
    roomId?: string | null;
    pinnedRoundKeys?: (string | null | undefined)[];
    limit?: number;
  },
) => {
  const limit = options.limit ?? SETTLEMENT_RECAP_CACHE_LIMIT;
  if (limit <= 0) return {} as Record<string, SettlementQuestionRecap[]>;
  const pinnedRoundKeys = options.pinnedRoundKeys ?? [];
  const roomId = options.roomId ?? null;
  const next: Record<string, SettlementQuestionRecap[]> = {};
  for (const roundKey of pinnedRoundKeys) {
    if (!roundKey) continue;
    const recaps = recapsByRoundKey[roundKey];
    if (!Array.isArray(recaps)) continue;
    if (roomId && !roundKey.startsWith(`${roomId}:`)) continue;
    next[roundKey] = recaps;
    if (Object.keys(next).length >= limit) return next;
  }
  const sortedRoundKeys = Object.keys(recapsByRoundKey)
    .filter((roundKey) => (roomId ? roundKey.startsWith(`${roomId}:`) : true))
    .sort((a, b) => {
      const aTs = parseRoundTimestampFromKey(a);
      const bTs = parseRoundTimestampFromKey(b);
      if (Number.isFinite(aTs) && Number.isFinite(bTs)) return bTs - aTs;
      if (Number.isFinite(aTs)) return -1;
      if (Number.isFinite(bTs)) return 1;
      return b.localeCompare(a);
    });
  for (const roundKey of sortedRoundKeys) {
    if (next[roundKey]) continue;
    next[roundKey] = recapsByRoundKey[roundKey];
    if (Object.keys(next).length >= limit) break;
  }
  return next;
};

const buildSettlementSummaryFromSnapshot = (
  snapshot: RoomSettlementSnapshot,
): RoomSettlementHistorySummary => ({
  matchId: `${snapshot.room.id}:${snapshot.roundNo}`,
  roundKey: snapshot.roundKey,
  roundNo: snapshot.roundNo,
  roomId: snapshot.room.id,
  roomName: snapshot.room.name,
  startedAt: snapshot.startedAt,
  endedAt: snapshot.endedAt,
  status: "ended",
  playerCount: snapshot.participants.length,
  questionCount: snapshot.playedQuestionCount,
  summaryJson: null,
});

const getSnapshotRecapCount = (
  snapshot: Pick<RoomSettlementSnapshot, "questionRecaps"> | null | undefined,
) =>
  Array.isArray(snapshot?.questionRecaps) ? snapshot.questionRecaps.length : 0;

const hasCompleteSettlementRecaps = (
  snapshot:
    | Pick<RoomSettlementSnapshot, "questionRecaps" | "playedQuestionCount">
    | null
    | undefined,
) => {
  if (!snapshot) return false;
  const recapCount = getSnapshotRecapCount(snapshot);
  if (recapCount <= 0) return false;
  const expectedCount = Math.max(0, snapshot.playedQuestionCount);
  if (expectedCount <= 0) return recapCount > 0;
  return recapCount >= expectedCount;
};

const getSettlementSessionCacheKey = (roomId: string, clientId: string) =>
  `${SETTLEMENT_SESSION_CACHE_KEY_PREFIX}${roomId}:${clientId}`;

type SettlementSessionCacheMeta = {
  roomId: string;
  clientId: string;
  legacyJoinedAtMs: number | null;
};

const readSettlementSessionCache = (
  key: string,
): SettlementSessionCachePayload | null => {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(
      raw,
    ) as Partial<SettlementSessionCachePayload> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      summaries: Array.isArray(parsed.summaries)
        ? (parsed.summaries as RoomSettlementHistorySummary[])
        : [],
      replays:
        parsed.replays && typeof parsed.replays === "object"
          ? pruneSettlementReplayByRoundKey(
              parsed.replays as Record<string, RoomSettlementSnapshot>,
              {},
            )
          : {},
      updatedAt:
        typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
          ? parsed.updatedAt
          : undefined,
    };
  } catch {
    return null;
  }
};

const writeSettlementSessionCache = (
  key: string,
  payload: SettlementSessionCachePayload,
) => {
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        ...payload,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // Best-effort cache only. Quota errors should not break the room UI.
  }
};

const parseSettlementSessionCacheMeta = (key: string) => {
  if (!key.startsWith(SETTLEMENT_SESSION_CACHE_KEY_PREFIX)) return null;
  const suffix = key.slice(SETTLEMENT_SESSION_CACHE_KEY_PREFIX.length);
  const firstColonIndex = suffix.indexOf(":");
  if (firstColonIndex <= 0) return null;
  const roomId = suffix.slice(0, firstColonIndex);
  const rest = suffix.slice(firstColonIndex + 1);
  if (!roomId || !rest) return null;
  const legacySplitIndex = rest.lastIndexOf(":");
  if (legacySplitIndex > 0) {
    const maybeTimestamp = Number(rest.slice(legacySplitIndex + 1));
    if (Number.isFinite(maybeTimestamp)) {
      const clientId = rest.slice(0, legacySplitIndex);
      if (!clientId) return null;
      return {
        roomId,
        clientId,
        legacyJoinedAtMs: maybeTimestamp,
      } as SettlementSessionCacheMeta;
    }
  }
  return {
    roomId,
    clientId: rest,
    legacyJoinedAtMs: null,
  } as SettlementSessionCacheMeta;
};

const clearSettlementSessionCacheForRoomClient = (
  roomId: string,
  clientId: string,
) => {
  try {
    const nextKey = `${SETTLEMENT_SESSION_CACHE_KEY_PREFIX}${roomId}:${clientId}`;
    const legacyPrefix = `${SETTLEMENT_SESSION_CACHE_KEY_PREFIX}${roomId}:${clientId}:`;
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      if (key === nextKey || key.startsWith(legacyPrefix)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
};

const clearSettlementSessionCacheForOtherRooms = (
  clientId: string,
  keepRoomId: string,
) => {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      const parsed = parseSettlementSessionCacheMeta(key);
      if (!parsed || parsed.clientId !== clientId) continue;
      if (parsed.roomId !== keepRoomId) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
};

const clearSettlementSessionCacheForClient = (clientId: string) => {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      const parsed = parseSettlementSessionCacheMeta(key);
      if (!parsed || parsed.clientId !== clientId) continue;
      toRemove.push(key);
    }
    toRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
};

const RoomLobbyPage: React.FC = () => {
  const { roomId } = useParams<{ roomId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    username,
    currentRoom,
    participants,
    messages,
    settlementHistory,
    messageInput,
    setMessageInput,
    playlistViewItems,
    playlistHasMore,
    playlistLoadingMore,
    playlistProgress,
    playlistSuggestions,
    playlistUrl,
    playlistItems,
    playlistError,
    playlistLoading,
    setPlaylistUrl,
    collections,
    collectionsLoading,
    collectionsError,
    collectionItemsLoading,
    collectionItemsError,
    selectedCollectionId,
    authUser,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
    gameState,
    isGameView,
    setIsGameView,
    gamePlaylist,
    clientId,
    isConnected,
    routeRoomResolved,
    sessionProgress,
    setStatusText,
    kickedNotice,
    setKickedNotice,
    hostRoomPassword,
    serverOffsetMs,
    setRouteRoomId,
    handleLeaveRoom,
    handleSendMessage,
    loadMorePlaylist,
    handleStartGame,
    handleSubmitChoice,
    handleUpdateRoomSettings,
    handleKickPlayer,
    handleTransferHost,
    handleSuggestPlaylist,
    handleApplySuggestionSnapshot,
    handleChangePlaylist,
    handleFetchPlaylistByUrl,
    fetchCollections,
    selectCollection,
    loadCollectionItems,
    fetchSettlementHistorySummaries,
    fetchSettlementReplay,
  } = useRoom();

  const [activeSettlementRoundKey, setActiveSettlementRoundKey] = useState<
    string | null
  >(null);
  const [loadingSettlementRoundKey, setLoadingSettlementRoundKey] = useState<
    string | null
  >(null);
  const [settlementHistorySummaries, setSettlementHistorySummaries] = useState<
    RoomSettlementHistorySummary[]
  >([]);
  const [settlementReplayByRoundKey, setSettlementReplayByRoundKey] = useState<
    Record<string, RoomSettlementSnapshot>
  >({});
  const [settlementCacheHydrated, setSettlementCacheHydrated] = useState(false);
  const [settlementSummaryListLoaded, setSettlementSummaryListLoaded] =
    useState(false);
  const [settlementRecapsByRoundKey, setSettlementRecapsByRoundKey] = useState<
    Record<string, SettlementQuestionRecap[]>
  >({});
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyDrawerLoading, setHistoryDrawerLoading] = useState(false);
  const [historyDrawerLoadingMore, setHistoryDrawerLoadingMore] =
    useState(false);
  const [historyDrawerCursor, setHistoryDrawerCursor] = useState<number | null>(
    null,
  );
  const [historyDrawerHasMore, setHistoryDrawerHasMore] = useState(false);
  const [historyReplaySummary, setHistoryReplaySummary] =
    useState<RoomSettlementHistorySummary | null>(null);
  const [historyReplayLoadingRoundKey, setHistoryReplayLoadingRoundKey] =
    useState<string | null>(null);
  const [uiNowMs, setUiNowMs] = useState(() => Date.now() + serverOffsetMs);
  const isTabletOrMobileLobby = useMediaQuery("(max-width:1024px)");
  const autoOpenedEndedRoundRef = useRef<string | null>(null);
  const prevGameStatusRef = useRef<"playing" | "ended" | null>(null);
  const latestLiveRecapsRef = useRef<SettlementQuestionRecap[]>([]);
  const liveRoundStartedAtRef = useRef<number | null>(null);
  const lastTopSettlementRoundKeyRef = useRef<string | null>(null);
  const pendingAutoOpenSettlementRef = useRef<{
    previousTopRoundKey: string | null;
  } | null>(null);
  const lastJoinedRoomIdRef = useRef<string | null>(null);
  const settlementSummaryListRequestRef = useRef<Promise<
    RoomSettlementHistorySummary[]
  > | null>(null);
  const historyDrawerRequestRef = useRef<
    Promise<RoomSettlementHistorySummary[]> | null
  >(null);
  const waitingChecklist = useMemo(() => {
    const backendOrder = [
      "server_validating",
      "room_lookup",
      "membership_restore",
      "state_build",
      "ready_to_send",
    ] as const;
    const backendStageIndex = sessionProgress
      ? backendOrder.indexOf(sessionProgress.stage)
      : -1;
    const backendRows = backendOrder.map((stage, index) => {
      let state: "done" | "active" | "pending" | "error" = "pending";
      if (sessionProgress?.stage === stage) {
        state =
          sessionProgress.status === "error"
            ? "error"
            : sessionProgress.status === "done"
              ? "done"
              : "active";
      } else if (
        sessionProgress &&
        backendStageIndex > index &&
        sessionProgress.status !== "error"
      ) {
        state = "done";
      }
      const labels: Record<(typeof backendOrder)[number], string> = {
        server_validating: "驗證連線與身分",
        room_lookup: "查找目標房間",
        membership_restore: "恢復房間成員狀態",
        state_build: "建立房間畫面資料",
        ready_to_send: "準備切換到房間畫面",
      };
      return { key: stage, label: labels[stage], state };
    });

    const rows = [
      {
        key: "socket_connected",
        label: "建立 Socket 連線",
        state: (isConnected ? "done" : "active") as "done" | "active",
      },
      ...backendRows,
    ];

    const doneCount = rows.filter((row) => row.state === "done").length;
    const activeRow =
      rows.find((row) => row.state === "error") ??
      rows.find((row) => row.state === "active") ??
      null;

    return {
      rows,
      doneCount,
      ratio: rows.length > 0 ? doneCount / rows.length : 0,
      activeLabel: activeRow?.label ?? "等待同步中",
      isError: Boolean(sessionProgress && sessionProgress.status === "error"),
      errorMessage:
        sessionProgress?.status === "error"
          ? (sessionProgress.message ?? "同步流程發生錯誤")
          : null,
    };
  }, [isConnected, sessionProgress]);

  const isKickedFromActiveRoom = Boolean(
    roomId && !currentRoom && kickedNotice?.roomId === roomId,
  );
  const kickedBannedUntilLabel = useMemo(() => {
    if (typeof kickedNotice?.bannedUntil !== "number") return null;
    return new Date(kickedNotice.bannedUntil).toLocaleString("zh-TW", {
      hour12: false,
    });
  }, [kickedNotice?.bannedUntil]);

  const settlementSessionCacheKey =
    currentRoom?.id && clientId
      ? getSettlementSessionCacheKey(currentRoom.id, clientId)
      : null;

  useEffect(() => {
    autoOpenedEndedRoundRef.current = null;
    prevGameStatusRef.current = null;
    latestLiveRecapsRef.current = [];
    liveRoundStartedAtRef.current = null;
    lastTopSettlementRoundKeyRef.current = null;
    pendingAutoOpenSettlementRef.current = null;
    settlementSummaryListRequestRef.current = null;
    const timer = window.setTimeout(() => {
      setActiveSettlementRoundKey(null);
      setLoadingSettlementRoundKey(null);
      setSettlementHistorySummaries([]);
      setSettlementReplayByRoundKey({});
      setSettlementRecapsByRoundKey({});
      setSettlementCacheHydrated(false);
      setSettlementSummaryListLoaded(false);
      setHistoryDrawerOpen(false);
      setHistoryDrawerLoading(false);
      setHistoryDrawerLoadingMore(false);
      setHistoryDrawerCursor(null);
      setHistoryDrawerHasMore(false);
      setHistoryReplaySummary(null);
      setHistoryReplayLoadingRoundKey(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentRoom?.id]);

  useEffect(() => {
    if (currentRoom?.id) {
      lastJoinedRoomIdRef.current = currentRoom.id;
    }
  }, [currentRoom?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!settlementSessionCacheKey) {
        setSettlementCacheHydrated(true);
        return;
      }
      const cached = readSettlementSessionCache(settlementSessionCacheKey);
      if (cached) {
        const nextSummaries = limitSettlementSummaries(cached.summaries);
        setSettlementHistorySummaries(nextSummaries);
        setSettlementReplayByRoundKey(cached.replays);
        setSettlementSummaryListLoaded(nextSummaries.length > 0);
      }
      setSettlementCacheHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [settlementSessionCacheKey]);

  useEffect(() => {
    if (!settlementSessionCacheKey || !settlementCacheHydrated) return;
    const trimmedReplayCache = pruneSettlementReplayByRoundKey(
      settlementReplayByRoundKey,
      {
        roomId: currentRoom?.id ?? null,
        pinnedRoundKeys: [activeSettlementRoundKey],
      },
    );
    writeSettlementSessionCache(settlementSessionCacheKey, {
      summaries: limitSettlementSummaries(settlementHistorySummaries),
      replays: trimmedReplayCache,
    });
  }, [
    activeSettlementRoundKey,
    currentRoom?.id,
    settlementCacheHydrated,
    settlementHistorySummaries,
    settlementReplayByRoundKey,
    settlementSessionCacheKey,
  ]);

  useEffect(() => {
    if (!clientId || !currentRoom?.id) return;
    const timer = window.setTimeout(() => {
      clearSettlementSessionCacheForOtherRooms(clientId, currentRoom.id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [clientId, currentRoom?.id]);

  useEffect(() => {
    if (gameState?.status !== "playing") return;
    if (liveRoundStartedAtRef.current === gameState.startedAt) return;
    liveRoundStartedAtRef.current = gameState.startedAt;
    latestLiveRecapsRef.current = [];
  }, [gameState?.startedAt, gameState?.status]);

  const liveRoundKey = useMemo(() => {
    if (!currentRoom?.id || !gameState?.startedAt) return null;
    return `${currentRoom.id}:${gameState.startedAt}`;
  }, [currentRoom?.id, gameState?.startedAt]);

  const roomScopedSettlementHistory = useMemo(
    () =>
      currentRoom?.id
        ? settlementHistory.filter((item) => item.room.id === currentRoom.id)
        : [],
    [currentRoom?.id, settlementHistory],
  );

  const roomScopedSettlementHistorySummaries = useMemo(
    () =>
      currentRoom?.id
        ? settlementHistorySummaries.filter(
            (item) => item.roomId === currentRoom.id,
          )
        : [],
    [currentRoom?.id, settlementHistorySummaries],
  );

  const roomScopedSettlementReplayByRoundKey = useMemo(() => {
    if (!currentRoom?.id) return {} as Record<string, RoomSettlementSnapshot>;
    const next: Record<string, RoomSettlementSnapshot> = {};
    for (const [roundKey, snapshot] of Object.entries(
      settlementReplayByRoundKey,
    )) {
      if (snapshot.room.id === currentRoom.id) {
        next[roundKey] = snapshot;
      }
    }
    return next;
  }, [currentRoom?.id, settlementReplayByRoundKey]);

  useEffect(() => {
    if (!currentRoom?.id || roomScopedSettlementHistory.length === 0) return;
    const liveSummaries = roomScopedSettlementHistory.map(
      buildSettlementSummaryFromSnapshot,
    );
    const timer = window.setTimeout(() => {
      setSettlementReplayByRoundKey((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const snapshot of roomScopedSettlementHistory) {
          if (next[snapshot.roundKey] === snapshot) continue;
          next[snapshot.roundKey] = snapshot;
          changed = true;
        }
        if (!changed) return prev;
        return pruneSettlementReplayByRoundKey(next, {
          roomId: currentRoom.id,
          pinnedRoundKeys: [activeSettlementRoundKey, roomScopedSettlementHistory[0]?.roundKey],
        });
      });
      setSettlementHistorySummaries((prev) => {
        const map = new Map(prev.map((item) => [item.roundKey, item] as const));
        let changed = false;
        for (const summary of liveSummaries) {
          const current = map.get(summary.roundKey);
          if (
            current &&
            current.matchId === summary.matchId &&
            current.endedAt === summary.endedAt &&
            current.playerCount === summary.playerCount &&
            current.questionCount === summary.questionCount
          ) {
            continue;
          }
          map.set(summary.roundKey, summary);
          changed = true;
        }
        if (!changed) return prev;
        return limitSettlementSummaries(Array.from(map.values()));
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeSettlementRoundKey, currentRoom?.id, roomScopedSettlementHistory]);

  const loadHistoryDrawerPage = useCallback(
    async (options?: { reset?: boolean }) => {
      if (!currentRoom?.id) return [] as RoomSettlementHistorySummary[];
      const reset = options?.reset ?? false;
      const beforeEndedAt = reset ? null : historyDrawerCursor;
      if (!reset && !historyDrawerHasMore)
        return [] as RoomSettlementHistorySummary[];
      if (historyDrawerRequestRef.current) {
        await historyDrawerRequestRef.current;
        return await historyDrawerRequestRef.current;
      }
      const request = (async () => {
        let fetchedItems: RoomSettlementHistorySummary[] = [];
        if (reset) {
          setHistoryDrawerLoading(true);
        } else {
          setHistoryDrawerLoadingMore(true);
        }
        try {
          const { items, nextCursor } = await fetchSettlementHistorySummaries({
            limit: HISTORY_DRAWER_PAGE_SIZE,
            beforeEndedAt,
          });
          fetchedItems = items.filter((item) => item.roomId === currentRoom.id);
          setSettlementSummaryListLoaded(true);
          setSettlementHistorySummaries((prev) => {
            const merged = new Map<string, RoomSettlementHistorySummary>();
            prev.forEach((item) => merged.set(item.roundKey, item));
            fetchedItems.forEach((item) => merged.set(item.roundKey, item));
            return limitSettlementSummaries(Array.from(merged.values()));
          });
          setHistoryDrawerCursor(nextCursor ?? null);
          setHistoryDrawerHasMore(Boolean(nextCursor));
        } catch (error) {
          setStatusText(
            error instanceof Error ? error.message : "載入對戰歷史失敗",
          );
        } finally {
          setHistoryDrawerLoading(false);
          setHistoryDrawerLoadingMore(false);
        }
        return fetchedItems;
      })();
      historyDrawerRequestRef.current = request.finally(() => {
        historyDrawerRequestRef.current = null;
      });
      return await historyDrawerRequestRef.current;
    },
    [
      currentRoom?.id,
      fetchSettlementHistorySummaries,
      historyDrawerCursor,
      historyDrawerHasMore,
      setStatusText,
    ],
  );

  const ensureSettlementSummaryListLoaded = useCallback(async () => {
    if (!currentRoom?.id) return [] as RoomSettlementHistorySummary[];
    if (roomScopedSettlementHistorySummaries.length > 0)
      return roomScopedSettlementHistorySummaries;
    if (settlementSummaryListLoaded)
      return roomScopedSettlementHistorySummaries;
    if (settlementSummaryListRequestRef.current) {
      return await settlementSummaryListRequestRef.current;
    }

    const request = loadHistoryDrawerPage({ reset: true })
      .then((items) => items)
      .catch((error) => {
        setSettlementSummaryListLoaded(true);
        throw error;
      })
      .finally(() => {
        settlementSummaryListRequestRef.current = null;
      });

    settlementSummaryListRequestRef.current = request;
    return await request;
  }, [
    currentRoom?.id,
    loadHistoryDrawerPage,
    roomScopedSettlementHistorySummaries,
    settlementSummaryListLoaded,
  ]);

  const openSettlementReviewByRoundKey = useCallback(
    async (roundKey: string) => {
      setHistoryDrawerOpen(false);
      setActiveSettlementRoundKey(roundKey);
      const cachedReplaySnapshot =
        roomScopedSettlementReplayByRoundKey[roundKey] ?? null;
      const cachedLiveSnapshot =
        roomScopedSettlementHistory.find(
          (item) => item.roundKey === roundKey,
        ) ?? null;
      const hasReplayRecaps = hasCompleteSettlementRecaps(cachedReplaySnapshot);
      const hasLiveRecaps = hasCompleteSettlementRecaps(cachedLiveSnapshot);
      if (hasReplayRecaps || hasLiveRecaps) {
        return;
      }

      let summary =
        roomScopedSettlementHistorySummaries.find(
          (item) => item.roundKey === roundKey,
        ) ?? null;
      if (!summary) {
        try {
          const loaded = await ensureSettlementSummaryListLoaded();
          summary =
            loaded.find((item) => item.roundKey === roundKey) ??
            roomScopedSettlementHistorySummaries.find(
              (item) => item.roundKey === roundKey,
            ) ??
            null;
        } catch (error) {
          setStatusText(
            error instanceof Error
              ? error.message
              : "讀取對戰資料失敗，請稍後再試",
          );
          setActiveSettlementRoundKey(null);
          return;
        }
      }

      if (!summary) {
        setStatusText("找不到該場次資料");
        setActiveSettlementRoundKey(null);
        return;
      }

      setLoadingSettlementRoundKey(roundKey);
      try {
        const snapshot = await fetchSettlementReplay(summary.matchId);
        setSettlementReplayByRoundKey((prev) =>
          pruneSettlementReplayByRoundKey(
            {
              ...prev,
              [snapshot.roundKey]: snapshot,
            },
            {
              roomId: currentRoom?.id ?? null,
              pinnedRoundKeys: [
                snapshot.roundKey,
                roundKey,
                activeSettlementRoundKey,
              ],
            },
          ),
        );
        if (snapshot.roundKey !== roundKey) {
          setActiveSettlementRoundKey(snapshot.roundKey);
        }
      } catch (error) {
        setStatusText(
          error instanceof Error ? error.message : "載入回放失敗",
        );
        setActiveSettlementRoundKey(null);
      } finally {
        setLoadingSettlementRoundKey((prev) =>
          prev === roundKey ? null : prev,
        );
      }
    },
    [
      ensureSettlementSummaryListLoaded,
      fetchSettlementReplay,
      roomScopedSettlementHistory,
      roomScopedSettlementReplayByRoundKey,
      roomScopedSettlementHistorySummaries,
      activeSettlementRoundKey,
      currentRoom?.id,
      setStatusText,
    ],
  );

  const handleSettlementRecapChange = useCallback(
    (recaps: SettlementQuestionRecap[]) => {
      if (!liveRoundKey) return;
      setSettlementRecapsByRoundKey((prev) => {
        if (recaps.length === 0) {
          latestLiveRecapsRef.current = [];
          if (!(liveRoundKey in prev)) return prev;
          const next = { ...prev };
          delete next[liveRoundKey];
          return pruneSettlementRecapsByRoundKey(next, {
            roomId: currentRoom?.id ?? null,
            pinnedRoundKeys: [activeSettlementRoundKey],
          });
        }
        const nextRecaps = cloneSettlementRecaps(recaps);
        latestLiveRecapsRef.current = nextRecaps;
        const current = prev[liveRoundKey];
        if (
          current &&
          current.length === nextRecaps.length &&
          current.every(
            (item, idx) =>
              item.key === nextRecaps[idx]?.key &&
              item.myResult === nextRecaps[idx]?.myResult &&
              item.myChoiceIndex === nextRecaps[idx]?.myChoiceIndex,
          )
        ) {
          return prev;
        }
        return pruneSettlementRecapsByRoundKey(
          {
            ...prev,
            [liveRoundKey]: nextRecaps,
          },
          {
            roomId: currentRoom?.id ?? null,
            pinnedRoundKeys: [liveRoundKey, activeSettlementRoundKey],
          },
        );
      });
    },
    [activeSettlementRoundKey, currentRoom?.id, liveRoundKey],
  );

  useEffect(() => {
    const topSnapshot = roomScopedSettlementHistory[0];
    if (!topSnapshot) return;
    if (topSnapshot.roundKey === lastTopSettlementRoundKeyRef.current) return;
    lastTopSettlementRoundKeyRef.current = topSnapshot.roundKey;
    const liveRecaps = latestLiveRecapsRef.current;
    if (liveRecaps.length === 0) return;
    setSettlementRecapsByRoundKey((prev) => {
      const current = prev[topSnapshot.roundKey];
      if (
        current &&
        current.length === liveRecaps.length &&
        current.every(
          (item, idx) =>
            item.key === liveRecaps[idx]?.key &&
            item.myResult === liveRecaps[idx]?.myResult &&
            item.myChoiceIndex === liveRecaps[idx]?.myChoiceIndex,
        )
      ) {
        return prev;
      }
      return pruneSettlementRecapsByRoundKey(
        {
          ...prev,
          [topSnapshot.roundKey]: cloneSettlementRecaps(liveRecaps),
        },
        {
          roomId: currentRoom?.id ?? null,
          pinnedRoundKeys: [topSnapshot.roundKey, activeSettlementRoundKey],
        },
      );
    });
  }, [activeSettlementRoundKey, currentRoom?.id, roomScopedSettlementHistory]);

  useEffect(() => {
    const nextStatus = gameState?.status ?? null;
    if (prevGameStatusRef.current === "playing" && nextStatus === "ended") {
      pendingAutoOpenSettlementRef.current = {
        previousTopRoundKey: roomScopedSettlementHistory[0]?.roundKey ?? null,
      };
    }
    prevGameStatusRef.current = nextStatus;
  }, [gameState?.status, roomScopedSettlementHistory]);

  useEffect(() => {
    if (!currentRoom || gameState?.status !== "ended") return;
    const pending = pendingAutoOpenSettlementRef.current;
    if (!pending) return;
    const snapshot = roomScopedSettlementHistory[0] ?? null;
    if (!snapshot) return;
    if (snapshot.roundKey === pending.previousTopRoundKey) return;
    if (autoOpenedEndedRoundRef.current === snapshot.roundKey) {
      pendingAutoOpenSettlementRef.current = null;
      return;
    }

    autoOpenedEndedRoundRef.current = snapshot.roundKey;
    pendingAutoOpenSettlementRef.current = null;
    // Apply both updates in the same effect tick to avoid a setTimeout(0)
    // race with this effect's cleanup when isGameView changes.
    setActiveSettlementRoundKey(snapshot.roundKey);
    if (isGameView) {
      setIsGameView(false);
    }
    setStatusText("已自動切換到最新對戰結算");
  }, [
    currentRoom,
    gameState?.status,
    isGameView,
    roomScopedSettlementHistory,
    setIsGameView,
    setStatusText,
  ]);

  const resolvedActiveSettlementRoundKey = useMemo(() => {
    if (!activeSettlementRoundKey) return null;
    const nextRoomId = currentRoom?.id;
    if (!nextRoomId) return null;
    if (!activeSettlementRoundKey.startsWith(`${nextRoomId}:`)) return null;
    return activeSettlementRoundKey;
  }, [activeSettlementRoundKey, currentRoom]);

  const activeSettlementSnapshot =
    useMemo<RoomSettlementSnapshot | null>(() => {
      if (!resolvedActiveSettlementRoundKey) return null;
      const liveSnapshot =
        roomScopedSettlementHistory.find(
          (item) => item.roundKey === resolvedActiveSettlementRoundKey,
        ) ?? null;
      const replaySnapshot =
        roomScopedSettlementReplayByRoundKey[
          resolvedActiveSettlementRoundKey
        ] ?? null;
      if (!liveSnapshot) return replaySnapshot;
      if (!replaySnapshot) return liveSnapshot;
      const liveRecapCount = getSnapshotRecapCount(liveSnapshot);
      const replayRecapCount = getSnapshotRecapCount(replaySnapshot);
      return replayRecapCount > liveRecapCount ? replaySnapshot : liveSnapshot;
    }, [
      resolvedActiveSettlementRoundKey,
      roomScopedSettlementHistory,
      roomScopedSettlementReplayByRoundKey,
    ]);

  const activeSettlementQuestionRecaps = useMemo(() => {
    if (!activeSettlementSnapshot) return undefined;
    const snapshotRecaps = (
      activeSettlementSnapshot as RoomSettlementSnapshot & {
        questionRecaps?: SettlementQuestionRecap[];
      }
    ).questionRecaps;
    if (Array.isArray(snapshotRecaps) && snapshotRecaps.length > 0) {
      return snapshotRecaps;
    }
    return settlementRecapsByRoundKey[activeSettlementSnapshot.roundKey];
  }, [activeSettlementSnapshot, settlementRecapsByRoundKey]);

  useEffect(() => {
    if (!resolvedActiveSettlementRoundKey) return;
    if (loadingSettlementRoundKey === resolvedActiveSettlementRoundKey) return;
    const snapshot =
      roomScopedSettlementReplayByRoundKey[resolvedActiveSettlementRoundKey] ??
      roomScopedSettlementHistory.find(
        (item) => item.roundKey === resolvedActiveSettlementRoundKey,
      ) ??
      null;
    const localRecaps =
      settlementRecapsByRoundKey[resolvedActiveSettlementRoundKey];
    const localRecapCount = Array.isArray(localRecaps) ? localRecaps.length : 0;
    const expectedCount = Math.max(0, snapshot?.playedQuestionCount ?? 0);
    const snapshotHasCompleteRecaps = hasCompleteSettlementRecaps(snapshot);
    const localHasCompleteRecaps =
      localRecapCount > 0 &&
      (expectedCount <= 0 || localRecapCount >= expectedCount);
    if (snapshotHasCompleteRecaps || localHasCompleteRecaps) return;
    void openSettlementReviewByRoundKey(resolvedActiveSettlementRoundKey);
  }, [
    loadingSettlementRoundKey,
    openSettlementReviewByRoundKey,
    resolvedActiveSettlementRoundKey,
    roomScopedSettlementHistory,
    roomScopedSettlementReplayByRoundKey,
    settlementRecapsByRoundKey,
  ]);

  const latestSettlementSnapshot = roomScopedSettlementHistory[0] ?? null;

  const latestSettlementSummary =
    useMemo<RoomSettlementHistorySummary | null>(() => {
      if (!latestSettlementSnapshot) return null;
      return {
        matchId: `${latestSettlementSnapshot.room.id}:${latestSettlementSnapshot.roundNo}`,
        roundKey: latestSettlementSnapshot.roundKey,
        roundNo: latestSettlementSnapshot.roundNo,
        roomId: latestSettlementSnapshot.room.id,
        roomName: latestSettlementSnapshot.room.name,
        startedAt: latestSettlementSnapshot.startedAt,
        endedAt: latestSettlementSnapshot.endedAt,
        status: "ended",
        playerCount: latestSettlementSnapshot.participants.length,
        questionCount: latestSettlementSnapshot.playedQuestionCount,
        summaryJson: null,
      };
    }, [latestSettlementSnapshot]);

  const mergedSettlementSummaries = useMemo(() => {
    const next = new Map<string, RoomSettlementHistorySummary>();
    roomScopedSettlementHistorySummaries.forEach((item) => {
      next.set(item.roundKey, item);
    });
    if (latestSettlementSummary) {
      next.set(latestSettlementSummary.roundKey, latestSettlementSummary);
    }
    return Array.from(next.values()).sort(
      (a, b) => a.endedAt - b.endedAt || a.roundNo - b.roundNo,
    );
  }, [latestSettlementSummary, roomScopedSettlementHistorySummaries]);

  const latestSettlementRoundKey = useMemo(() => {
    if (mergedSettlementSummaries.length === 0) return null;
    return mergedSettlementSummaries[mergedSettlementSummaries.length - 1]
      ?.roundKey ?? null;
  }, [mergedSettlementSummaries]);

  const historyDrawerSummaries = useMemo(
    () =>
      [...mergedSettlementSummaries].sort(
        (a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo,
      ),
    [mergedSettlementSummaries],
  );
  const showHistoryDrawerInitialLoading =
    historyDrawerLoading && historyDrawerSummaries.length === 0;
  const showHistoryDrawerRefreshing =
    historyDrawerLoading && historyDrawerSummaries.length > 0;
  const isSettlementReviewLoading = Boolean(
    resolvedActiveSettlementRoundKey &&
      loadingSettlementRoundKey === resolvedActiveSettlementRoundKey &&
      !activeSettlementSnapshot,
  );

  const roomSnapshotByRoundKey = useMemo(() => {
    const next: Record<string, RoomSettlementSnapshot> = {};
    roomScopedSettlementHistory.forEach((snapshot) => {
      next[snapshot.roundKey] = snapshot;
    });
    Object.entries(roomScopedSettlementReplayByRoundKey).forEach(
      ([roundKey, snapshot]) => {
        if (!next[roundKey]) {
          next[roundKey] = snapshot;
        }
      },
    );
    return next;
  }, [roomScopedSettlementHistory, roomScopedSettlementReplayByRoundKey]);

  const selfStatsByRoundKey = useMemo(() => {
    const next: Record<string, SelfSettlementStats> = {};
    mergedSettlementSummaries.forEach((summary) => {
      const snapshot = roomSnapshotByRoundKey[summary.roundKey] ?? null;
      let rank = summary.selfRank ?? null;
      let score = summary.selfPlayer?.finalScore ?? null;
      let maxCombo = summary.selfPlayer?.maxCombo ?? null;
      let correctCount = summary.selfPlayer?.correctCount ?? null;

      if (snapshot && clientId) {
        const sortedParticipants = sortSettlementParticipants(
          snapshot.participants,
        );
        const selfParticipant =
          sortedParticipants.find((item) => item.clientId === clientId) ?? null;
        if (selfParticipant) {
          if (rank === null) {
            rank =
              sortedParticipants.findIndex(
                (item) => item.clientId === selfParticipant.clientId,
              ) + 1;
          }
          if (score === null) score = selfParticipant.score;
          if (maxCombo === null) {
            maxCombo = selfParticipant.maxCombo ?? selfParticipant.combo ?? 0;
          }
          if (correctCount === null) {
            correctCount = selfParticipant.correctCount ?? null;
          }
        }
      }

      next[summary.roundKey] = {
        rank,
        score,
        maxCombo,
        correctCount,
        playerCount: summary.playerCount,
      };
    });
    return next;
  }, [clientId, mergedSettlementSummaries, roomSnapshotByRoundKey]);

  const historyReplaySnapshot = useMemo(() => {
    if (!historyReplaySummary) return null;
    return (
      roomSnapshotByRoundKey[historyReplaySummary.roundKey] ??
      roomScopedSettlementHistory.find(
        (item) => item.roundKey === historyReplaySummary.roundKey,
      ) ??
      null
    );
  }, [historyReplaySummary, roomScopedSettlementHistory, roomSnapshotByRoundKey]);

  const openHistoryReplayModal = useCallback(
    async (summary: RoomSettlementHistorySummary) => {
      setHistoryReplaySummary(summary);
      const cached =
        roomSnapshotByRoundKey[summary.roundKey] ??
        roomScopedSettlementHistory.find(
          (item) => item.roundKey === summary.roundKey,
        ) ??
        null;
      if (cached) return;
      setHistoryReplayLoadingRoundKey(summary.roundKey);
      try {
        const snapshot = await fetchSettlementReplay(summary.matchId);
        setSettlementReplayByRoundKey((prev) =>
          pruneSettlementReplayByRoundKey(
            {
              ...prev,
              [snapshot.roundKey]: snapshot,
            },
            {
              roomId: currentRoom?.id ?? null,
              pinnedRoundKeys: [snapshot.roundKey, activeSettlementRoundKey],
            },
          ),
        );
      } catch (error) {
        setStatusText(
          error instanceof Error ? error.message : "載入歷史回放失敗",
        );
      } finally {
        setHistoryReplayLoadingRoundKey((prev) =>
          prev === summary.roundKey ? null : prev,
        );
      }
    },
    [
      activeSettlementRoundKey,
      currentRoom?.id,
      fetchSettlementReplay,
      roomScopedSettlementHistory,
      roomSnapshotByRoundKey,
      setStatusText,
    ],
  );

  const closeHistoryReplayModal = useCallback(() => {
    setHistoryReplaySummary(null);
    setHistoryReplayLoadingRoundKey(null);
  }, []);

  const formatHistoryDateTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-TW", { hour12: false });
  }, []);

  const formatHistoryDuration = useCallback(
    (startedAt: number, endedAt: number) => {
      const totalMs = Math.max(0, endedAt - startedAt);
      const totalSec = Math.floor(totalMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}:${String(sec).padStart(2, "0")}`;
    },
    [],
  );

  const settlementReviewMessages = useMemo<ChatMessage[]>(() => {
    if (!currentRoom?.id) return [];
    return mergedSettlementSummaries.map((summary) => ({
      id: `${SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX}${summary.roundKey}`,
      roomId: currentRoom.id,
      userId: "system:settlement-review",
      username: "對戰紀錄",
      content: formatLobbySettlementSummary(
        summary,
        selfStatsByRoundKey[summary.roundKey],
      ),
      timestamp: summary.endedAt,
    }));
  }, [currentRoom, mergedSettlementSummaries, selfStatsByRoundKey]);

  const lobbyMessages = useMemo(() => {
    if (settlementReviewMessages.length === 0) return messages;
    return [...messages, ...settlementReviewMessages].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
  }, [messages, settlementReviewMessages]);

  useEffect(() => {
    if (!activeSettlementSnapshot) {
      setUiNowMs(Date.now() + serverOffsetMs);
      return;
    }
    const tick = () => setUiNowMs(Date.now() + serverOffsetMs);
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [activeSettlementSnapshot, serverOffsetMs]);

  useEffect(() => {
    setRouteRoomId(roomId ?? null);
    return () => setRouteRoomId(null);
  }, [roomId, setRouteRoomId]);

  useEffect(() => {
    if (currentRoom?.id && roomId && currentRoom.id !== roomId) {
      navigate(`/rooms/${currentRoom.id}`, { replace: true });
    }
  }, [currentRoom?.id, roomId, navigate]);

  useEffect(() => {
    if (!activeSettlementRoundKey) return;
    if (!gameState || gameState.status !== "playing") return;
    const switchAtMs = gameState.startedAt - 5000;
    const nowMs = Date.now() + serverOffsetMs;
    const delayMs = Math.max(0, switchAtMs - nowMs);
    const timer = window.setTimeout(() => {
      setActiveSettlementRoundKey(null);
      setIsGameView(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [activeSettlementRoundKey, gameState, serverOffsetMs, setIsGameView]);

  const removeSettlementCacheForRoom = useCallback(
    (targetRoomId: string | null) => {
      if (!targetRoomId || !clientId) return;
      clearSettlementSessionCacheForRoomClient(targetRoomId, clientId);
    },
    [clientId],
  );

  const leaveRoomAndNavigate = useCallback(() => {
    const targetRoomId =
      currentRoom?.id ?? roomId ?? lastJoinedRoomIdRef.current;
    handleLeaveRoom(() => {
      setActiveSettlementRoundKey(null);
      if (clientId) {
        clearSettlementSessionCacheForClient(clientId);
      } else {
        removeSettlementCacheForRoom(targetRoomId ?? null);
      }
      navigate("/rooms", { replace: true });
    });
  }, [
    clientId,
    currentRoom?.id,
    handleLeaveRoom,
    navigate,
    removeSettlementCacheForRoom,
    roomId,
  ]);
  const openHistoryDrawer = useCallback(() => {
    setHistoryDrawerOpen(true);
    void loadHistoryDrawerPage({ reset: true });
  }, [loadHistoryDrawerPage]);
  const closeHistoryDrawer = useCallback(() => {
    setHistoryDrawerOpen(false);
  }, []);
  const lastHistoryDrawerRequestKeyRef = useRef<number | null>(null);
  const roomHistoryDrawerKey =
    (location.state as RoomHistoryLocationState | null)?.roomHistoryDrawerKey ??
    null;

  useEffect(() => {
    if (!currentRoom || roomHistoryDrawerKey === null) return;
    if (lastHistoryDrawerRequestKeyRef.current === roomHistoryDrawerKey) return;
    lastHistoryDrawerRequestKeyRef.current = roomHistoryDrawerKey;
    openHistoryDrawer();
  }, [currentRoom, openHistoryDrawer, roomHistoryDrawerKey]);

  const settlementStartBroadcastRemainingSec =
    gameState?.status === "playing"
      ? Math.max(0, Math.ceil((gameState.startedAt - uiNowMs) / 1000))
      : 0;
  const shouldShowSettlementStartBroadcast =
    Boolean(activeSettlementSnapshot) &&
    settlementStartBroadcastRemainingSec > 3 &&
    typeof document !== "undefined";
  const settlementStartBroadcastOverlay = shouldShowSettlementStartBroadcast
    ? createPortal(
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-950/82 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-amber-300/45 bg-slate-950/90 px-6 py-6 text-center shadow-[0_24px_70px_-30px_rgba(251,191,36,0.8)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/55 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
              Match Settlement
            </div>
            <p className="mt-3 text-sm text-slate-200">
              對戰即將開始結算，{settlementStartBroadcastRemainingSec} 秒後自動切換。
            </p>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-amber-300/60 bg-amber-500/12 text-5xl font-black text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.45)]">
                {settlementStartBroadcastRemainingSec}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-300">
              倒數期間會暫時鎖定操作，避免切換畫面時發生誤觸。
            </p>
          </div>
        </div>,
        document.body,
      )
    : null;
  const battleHistoryDrawer = (
    <Drawer
      anchor="right"
      open={historyDrawerOpen}
      onClose={closeHistoryDrawer}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        className: "room-battle-history-drawer",
        sx: {
          width: isTabletOrMobileLobby ? "100%" : 440,
          maxWidth: "100vw",
        },
      }}
    >
      <div className="room-battle-history-shell">
        <div className="room-battle-history-head">
          <div className="room-battle-history-title-wrap">
            <span className="room-battle-history-kicker">BATTLE ARCHIVE</span>
            <h2 className="room-battle-history-title">對戰歷史</h2>
            <p className="room-battle-history-subtitle">
              可從右上 MENU 開啟，這裡可回看完整局數與結算。
            </p>
          </div>
          <IconButton
            size="small"
            color="inherit"
            className="room-battle-history-close"
            onClick={closeHistoryDrawer}
            aria-label="關閉對戰歷史"
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </div>
        {showHistoryDrawerRefreshing ? (
          <div className="room-battle-history-sync-strip" role="status" aria-live="polite">
            <span className="room-battle-history-sync-strip__dot" aria-hidden="true" />
            <span>同步房間歷史中...</span>
          </div>
        ) : null}

        <div className="room-battle-history-list">
          {showHistoryDrawerInitialLoading ? (
            <div className="room-battle-history-empty room-battle-history-empty--loading">
              <div className="room-battle-history-loader" role="status" aria-live="polite">
                <span className="room-battle-history-loader__kicker">
                  ARCHIVE SYNC
                </span>
                <div className="room-battle-history-loader__headline">
                  <span
                    className="room-battle-history-sync-strip__dot"
                    aria-hidden="true"
                  />
                  <span>讀取房間歷史中...</span>
                </div>
                <span className="room-battle-history-loader__rail" aria-hidden="true">
                  <span className="room-battle-history-loader__rail-fill" />
                </span>
                <div className="room-battle-history-loader__chips" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="room-battle-history-loader__ghosts" aria-hidden="true">
                  <span />
                  <span />
                </div>
              </div>
            </div>
          ) : historyDrawerSummaries.length === 0 ? (
            <div className="room-battle-history-empty">
              <HistoryEduRoundedIcon fontSize="small" />
              <span>目前沒有可查看的房間歷史。</span>
            </div>
          ) : (
            historyDrawerSummaries.map((summary) => {
              const stats = selfStatsByRoundKey[summary.roundKey];
              const isLatest = summary.roundKey === latestSettlementRoundKey;
              const isLoading = loadingSettlementRoundKey === summary.roundKey;
              return (
                <div
                  key={summary.roundKey}
                  className={`room-battle-history-item ${
                    isLatest ? "is-latest" : ""
                  }`}
                >
                  <div className="room-battle-history-item-head">
                    <div>
                      <Typography variant="subtitle2" className="room-battle-history-round">
                        Round {summary.roundNo}
                      </Typography>
                      <Typography variant="caption" className="room-battle-history-time">
                        {new Date(summary.endedAt).toLocaleString("zh-TW", {
                          hour12: false,
                        })}
                      </Typography>
                    </div>
                    <Chip
                      size="small"
                      color={isLatest ? "info" : "default"}
                      variant={isLatest ? "filled" : "outlined"}
                      label={isLatest ? "上一局" : "歷史紀錄"}
                    />
                  </div>

                  <div className="room-battle-history-metrics">
                    <span>
                      Rank
                      <strong>{stats?.rank ?? "-"}</strong>
                    </span>
                    <span>
                      Score
                      <strong>
                        {typeof stats?.score === "number"
                          ? stats.score.toLocaleString()
                          : "-"}
                      </strong>
                    </span>
                    <span>
                      Max Combo
                      <strong>
                        {typeof stats?.maxCombo === "number"
                          ? `x${Math.max(0, Math.round(stats.maxCombo))}`
                          : "-"}
                      </strong>
                    </span>
                  </div>

                  <Typography variant="caption" className="room-battle-history-copy">
                    {formatLobbySettlementSummary(summary, stats)}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="info"
                      disabled={historyReplayLoadingRoundKey === summary.roundKey}
                      onClick={() => {
                        void openHistoryReplayModal(summary);
                      }}
                    >
                      {historyReplayLoadingRoundKey === summary.roundKey
                        ? "載入詳情..."
                        : "查看詳情"}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="info"
                      disabled={isLoading || !isLatest}
                      onClick={() => {
                        void openSettlementReviewByRoundKey(summary.roundKey);
                      }}
                    >
                      {isLoading ? "載入中..." : "上一局快速回放"}
                    </Button>
                  </Stack>
                </div>
              );
            })
          )}
        </div>
        {historyDrawerHasMore && (
          <div className="flex justify-center pb-1">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              disabled={historyDrawerLoadingMore}
              onClick={() => {
                void loadHistoryDrawerPage();
              }}
            >
              {historyDrawerLoadingMore ? "載入更多中..." : "載入更多"}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );

  const battleHistoryReplayDialog = (
    <Dialog
      open={Boolean(historyReplaySummary)}
      onClose={closeHistoryReplayModal}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2.5 },
          background:
            "linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.94))",
          border: "1px solid rgba(56, 189, 248, 0.28)",
        },
      }}
    >
      <DialogContent
        sx={{
          p: { xs: 1.25, sm: 2 },
          minHeight: { xs: "72dvh", sm: "66dvh" },
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {historyReplaySummary && (
          <div className="rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
                  Match Replay
                </p>
                <p className="mt-1 truncate text-base font-semibold text-[var(--mc-text)]">
                  {historyReplaySummary.roomName || historyReplaySummary.roomId}
                </p>
                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  第 {historyReplaySummary.roundNo} 局 · {historyReplaySummary.playerCount} 人 ·{" "}
                  {historyReplaySummary.questionCount} 題 ·{" "}
                  {formatHistoryDateTime(historyReplaySummary.startedAt)} ~{" "}
                  {formatHistoryDateTime(historyReplaySummary.endedAt)} ·{" "}
                  {formatHistoryDuration(
                    historyReplaySummary.startedAt,
                    historyReplaySummary.endedAt,
                  )}
                </p>
              </div>
              <Button
                variant="outlined"
                size="small"
                color="inherit"
                onClick={closeHistoryReplayModal}
              >
                關閉
              </Button>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {historyReplaySummary &&
          historyReplayLoadingRoundKey === historyReplaySummary.roundKey &&
          !historyReplaySnapshot ? (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/55">
              <div className="inline-flex items-center gap-3 text-sm text-[var(--mc-text-muted)]">
                <CircularProgress size={18} thickness={4.8} sx={{ color: "#38bdf8" }} />
                正在載入回放內容...
              </div>
            </div>
          ) : historyReplaySnapshot ? (
            <HistoryReplayCompactView
              room={historyReplaySnapshot.room}
              participants={historyReplaySnapshot.participants}
              messages={historyReplaySnapshot.messages}
              playlistItems={historyReplaySnapshot.playlistItems ?? []}
              trackOrder={historyReplaySnapshot.trackOrder}
              playedQuestionCount={historyReplaySnapshot.playedQuestionCount}
              startedAt={historyReplaySnapshot.startedAt}
              endedAt={historyReplaySnapshot.endedAt}
              meClientId={clientId}
              questionRecaps={
                settlementRecapsByRoundKey[historyReplaySnapshot.roundKey] ??
                historyReplaySnapshot.questionRecaps ??
                []
              }
            />
          ) : (
            <div className="rounded-xl border border-amber-300/20 bg-amber-400/6 px-4 py-5 text-sm text-amber-100/90">
              找不到可顯示的回放資料。
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
  const settlementReviewLoadingBanner = isSettlementReviewLoading ? (
    <div className="room-lobby-floating-progress" role="status" aria-live="polite">
      <div className="room-lobby-floating-progress__label">
        <span className="room-lobby-floating-progress__kicker">Replay Sync</span>
        <span>正在準備對戰回放...</span>
      </div>
      <span className="room-lobby-floating-progress__rail" aria-hidden="true">
        <span className="room-lobby-floating-progress__rail-fill" />
      </span>
    </div>
  ) : null;

  useEffect(() => {
    if (currentRoom) return;
    if (!routeRoomResolved) return;
    if (clientId) {
      clearSettlementSessionCacheForClient(clientId);
    } else if (lastJoinedRoomIdRef.current) {
      removeSettlementCacheForRoom(lastJoinedRoomIdRef.current);
    }
    lastJoinedRoomIdRef.current = null;
  }, [clientId, currentRoom, removeSettlementCacheForRoom, routeRoomResolved]);

  if (roomId && username && !currentRoom && isKickedFromActiveRoom) {
    return (
      <div className="mx-auto mt-6 w-full max-w-[980px] min-w-0">
        <div className="relative overflow-hidden rounded-[26px] border border-rose-300/30 bg-[radial-gradient(circle_at_12%_12%,rgba(244,63,94,0.22),transparent_44%),radial-gradient(circle_at_86%_12%,rgba(251,191,36,0.16),transparent_48%),linear-gradient(180deg,rgba(16,10,14,0.97),rgba(8,6,10,0.99))] p-6 text-[var(--mc-text)] shadow-[0_36px_90px_-58px_rgba(244,63,94,0.6)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(244,63,94,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.05)_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-rose-300/35 bg-rose-300/10 px-4 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200/45 bg-rose-400/10 text-lg text-rose-100">
                  !
                </span>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-rose-100/80">
                    Room Access
                  </div>
                  <div className="text-sm font-semibold text-rose-50 sm:text-base">
                    Access Updated
                  </div>
                </div>
              </div>

              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--mc-text)] sm:text-3xl">
                你已離開這個房間
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)] sm:text-[15px]">
                {kickedNotice?.reason ?? "你已被房主移出房間。"}
              </p>
              {kickedBannedUntilLabel ? (
                <p className="mt-2 text-xs leading-5 text-amber-100/85">
                  封鎖至：{kickedBannedUntilLabel}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex max-w-full items-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface)]/75 px-3 py-1 text-xs text-[var(--mc-text-muted)]">
                  房間
                  <span className="ml-1 truncate text-[var(--mc-text)]">
                    {roomId}
                  </span>
                </span>
                <span className="inline-flex max-w-full items-center rounded-full border border-rose-300/22 bg-rose-400/10 px-3 py-1 text-xs text-rose-100/90">
                  玩家
                  <span className="ml-1 truncate text-rose-50">{username}</span>
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-rose-300/65 bg-rose-500/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-50 transition hover:border-rose-200 hover:bg-rose-500/30"
                  onClick={() => {
                    setKickedNotice(null);
                    navigate("/rooms", { replace: true });
                  }}
                >
                  返回房間列表
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface)]/75 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mc-text)] transition hover:border-amber-200/25 hover:bg-[var(--mc-surface-strong)]/88"
                  onClick={() => {
                    setKickedNotice(null);
                    navigate("/rooms/create");
                  }}
                >
                  建立新房間
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)] p-4 sm:p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--mc-text-muted)]">
                Next Steps
              </div>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-[var(--mc-text-muted)]">
                <li className="rounded-xl border border-[var(--mc-border)]/70 bg-black/15 px-3 py-2">
                  可返回房間列表，重新加入其他對戰。
                </li>
                <li className="rounded-xl border border-[var(--mc-border)]/70 bg-black/15 px-3 py-2">
                  若你是房主，可直接建立新房並重新邀請玩家。
                </li>
                <li className="rounded-xl border border-[var(--mc-border)]/70 bg-black/15 px-3 py-2">
                  若這不是預期行為，請稍後重新整理並再試一次。
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (roomId && username && !currentRoom && !routeRoomResolved) {
    return (
      <>
        <div className="mx-auto mt-6 w-full max-w-[1080px] min-w-0">
          <div className="relative overflow-hidden rounded-[26px] border border-[var(--mc-border)] bg-[radial-gradient(circle_at_16%_18%,rgba(245,158,11,0.14),transparent_42%),radial-gradient(circle_at_84%_14%,rgba(234,179,8,0.08),transparent_46%),linear-gradient(180deg,rgba(12,10,8,0.96),rgba(7,6,4,0.98))] p-6 text-[var(--mc-text)] shadow-[0_30px_90px_-62px_rgba(245,158,11,0.65)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="min-w-0 rounded-2xl border border-amber-200/12 bg-[color-mix(in_srgb,var(--mc-surface-strong)_80%,black_20%)] p-5">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-amber-300/35 bg-amber-300/10 shadow-[0_0_24px_-10px_rgba(245,158,11,0.9)]">
                    <span className="absolute inset-1 rounded-[10px] border border-amber-200/20" />
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-200/85 border-t-transparent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--mc-text-muted)]">
                      Room Connect
                    </div>
                    <div className="truncate text-base font-semibold text-[var(--mc-text)] sm:text-lg">
                      正在進入房間，請稍候
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-[var(--mc-text-muted)]">
                  目前正在同步房間狀態、聊天室與歌單資料，完成後會自動切換到房間畫面。
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex min-w-0 max-w-full items-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface)]/75 px-3 py-1 text-xs text-[var(--mc-text-muted)]">
                    房號
                    <span className="ml-1 truncate text-[var(--mc-text)]">
                      {roomId}
                    </span>
                  </span>
                  <span className="inline-flex min-w-0 max-w-full items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100/90">
                    玩家
                    <span className="ml-1 truncate text-amber-50">
                      {username}
                    </span>
                  </span>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_88%,black_12%)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs tracking-[0.2em] text-[var(--mc-text-muted)]">
                    連線進度
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${
                      waitingChecklist.isError
                        ? "border border-rose-300/30 bg-rose-300/10 text-rose-100"
                        : "border border-emerald-300/20 bg-emerald-300/10 text-emerald-100/90"
                    }`}
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        waitingChecklist.isError
                          ? "bg-rose-300"
                          : "animate-pulse bg-emerald-300"
                      }`}
                    />
                    {waitingChecklist.isError ? "同步失敗" : "同步中"}
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${
                      waitingChecklist.isError
                        ? "bg-[linear-gradient(90deg,rgba(251,113,133,0.7),rgba(244,63,94,0.9))]"
                        : "animate-pulse bg-[linear-gradient(90deg,rgba(245,158,11,0.75),rgba(250,204,21,0.95),rgba(251,191,36,0.7))]"
                    }`}
                    style={{
                      width: `${Math.max(8, Math.round(waitingChecklist.ratio * 100))}%`,
                    }}
                  />
                </div>

                <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-[var(--mc-text-muted)]">
                  {waitingChecklist.isError
                    ? waitingChecklist.errorMessage
                    : `目前階段：${waitingChecklist.activeLabel}`}
                </div>

                <div className="mt-5 space-y-3 text-sm text-[var(--mc-text-muted)]">
                  {waitingChecklist.rows.map((step, index) => (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                        step.state === "done"
                          ? "border-emerald-300/15 bg-emerald-300/[0.03]"
                          : step.state === "active"
                            ? "border-amber-300/15 bg-amber-300/[0.03]"
                            : step.state === "error"
                              ? "border-rose-300/15 bg-rose-300/[0.03]"
                              : "border-white/5 bg-white/[0.02]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          step.state === "done"
                            ? "border border-emerald-200/25 bg-emerald-300/12 text-emerald-100"
                            : step.state === "active"
                              ? "border border-amber-200/20 bg-amber-300/10 text-amber-100"
                              : step.state === "error"
                                ? "border border-rose-200/20 bg-rose-300/10 text-rose-100"
                                : "border border-slate-300/15 bg-slate-300/5 text-slate-300/80"
                        }`}
                        style={
                          step.state === "active"
                            ? {
                                animation: "pulse 1.6s ease-in-out infinite",
                                animationDelay: `${index * 0.18}s`,
                              }
                            : undefined
                        }
                      >
                        {step.state === "done"
                          ? "✓"
                          : step.state === "error"
                            ? "!"
                            : index + 1}
                      </span>
                      <span className="truncate">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (roomId && routeRoomResolved && !currentRoom) {
    return (
      <>
        <div className="mx-auto mt-6 w-full max-w-[1080px] min-w-0">
          <div className="relative overflow-hidden rounded-[26px] border border-[var(--mc-border)] bg-[radial-gradient(circle_at_14%_16%,rgba(245,158,11,0.14),transparent_42%),radial-gradient(circle_at_88%_10%,rgba(234,179,8,0.08),transparent_46%),linear-gradient(180deg,rgba(20,17,13,0.96),rgba(9,8,6,0.98))] p-6 text-[var(--mc-text)] shadow-[0_35px_80px_-60px_rgba(245,158,11,0.55)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface-strong)_88%,black_12%)] px-4 py-3">
                  <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/28 bg-amber-300/10">
                    <span className="absolute h-5 w-5 rounded-full border border-amber-200/55" />
                    <span className="absolute h-[2px] w-4 rotate-45 rounded-full bg-amber-200/70" />
                    <span className="absolute h-1.5 w-1.5 rounded-full bg-amber-200" />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--mc-text-muted)]">
                      Room Check
                    </div>
                    <div className="text-sm font-semibold text-[var(--mc-text)] sm:text-base">
                      Room Check
                    </div>
                  </div>
                </div>

                <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--mc-text)] sm:text-3xl">
                  找不到這個房間
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--mc-text-muted)] sm:text-[15px]">
                  房間可能已關閉、你已被移出，或邀請連結已失效。你可以回到列表重新加入，或直接建立新房間。
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex max-w-full items-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 px-3 py-1 text-xs text-[var(--mc-text-muted)]">
                    房間 ID
                    <span className="ml-1 truncate text-[var(--mc-text)]">
                      {roomId}
                    </span>
                  </span>
                  <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100/90">
                    請確認房號與邀請狀態
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-accent)]/65 bg-[var(--mc-accent)]/18 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mc-text)] transition hover:border-[var(--mc-accent)] hover:bg-[var(--mc-accent)]/28"
                    onClick={() => navigate("/rooms", { replace: true })}
                  >
                    返回房間列表
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mc-text)] transition hover:border-amber-200/25 hover:bg-[var(--mc-surface-strong)]/85"
                    onClick={() => navigate("/rooms/create")}
                  >
                    建立新房間
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--mc-border)] bg-[color-mix(in_srgb,var(--mc-surface)_86%,black_14%)] p-4 sm:p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--mc-text-muted)]">
                  Helpful Hints
                </div>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-[var(--mc-text-muted)]">
                  <li className="rounded-xl border border-[var(--mc-border)]/70 bg-black/15 px-3 py-2">
                    確認邀請連結是否仍有效。
                  </li>
                  <li className="rounded-xl border border-[var(--mc-border)]/70 bg-black/15 px-3 py-2">
                    若房主重新建立房間，請索取新的邀請連結。
                  </li>
                  <li className="rounded-xl border border-[var(--mc-border)]/70 bg-black/15 px-3 py-2">
                    若仍無法加入，可嘗試重新整理後再試。
                  </li>
                </ul>
                <div className="mt-4 rounded-xl border border-amber-300/18 bg-amber-300/8 px-3 py-2 text-xs leading-5 text-amber-100/85">
                  如果你是房主，請確認房間尚未被關閉，且目前仍允許新的玩家加入。
                </div>
              </div>
            </div>
          </div>
        </div>{" "}
      </>
    );
  }

  if (currentRoom && gameState && isGameView && !activeSettlementSnapshot) {
    return (
      <>
        <div className="flex w-full min-w-0 justify-center">
          <GameRoomPage
            room={currentRoom}
            gameState={gameState}
            playlist={gamePlaylist}
            onBackToLobby={() => setIsGameView(false)}
            onExitGame={() => leaveRoomAndNavigate()}
            onSubmitChoice={handleSubmitChoice}
            onKickPlayer={handleKickPlayer}
            onTransferHost={handleTransferHost}
            participants={participants}
            meClientId={clientId}
            messages={messages}
            messageInput={messageInput}
            onMessageChange={setMessageInput}
            onSendMessage={handleSendMessage}
            username={username}
            serverOffsetMs={serverOffsetMs}
            onSettlementRecapChange={handleSettlementRecapChange}
          />
        </div>
        {battleHistoryDrawer}
        {battleHistoryReplayDialog}
      </>
    );
  }

  if (activeSettlementSnapshot) {
    return (
      <>
        <div className="flex w-full min-w-0 justify-center">
          <LiveSettlementShowcase
            room={activeSettlementSnapshot.room}
            participants={activeSettlementSnapshot.participants}
            messages={activeSettlementSnapshot.messages}
            playlistItems={activeSettlementSnapshot.playlistItems ?? []}
            trackOrder={activeSettlementSnapshot.trackOrder}
            playedQuestionCount={activeSettlementSnapshot.playedQuestionCount}
            startedAt={activeSettlementSnapshot.startedAt}
            endedAt={activeSettlementSnapshot.endedAt}
            meClientId={clientId}
            questionRecaps={activeSettlementQuestionRecaps}
            upcomingGameStartAt={
              gameState?.status === "playing" ? gameState.startedAt : null
            }
            nowMs={uiNowMs}
            onBackToLobby={() => setActiveSettlementRoundKey(null)}
            onRequestExit={() => leaveRoomAndNavigate()}
          />
        </div>
        {settlementStartBroadcastOverlay}
      </>
    );
  }

  return (
    <>
      <div className="flex gap-4 flex-row justify-center">
        {currentRoom?.id && username && (
          <RoomLobbyPanel
            currentRoom={currentRoom}
            participants={participants}
            messages={lobbyMessages}
            selfClientId={clientId}
            roomPassword={hostRoomPassword}
            messageInput={messageInput}
            playlistItems={playlistViewItems}
            playlistHasMore={playlistHasMore}
            playlistLoadingMore={playlistLoadingMore}
            playlistProgress={playlistProgress}
            playlistSuggestions={playlistSuggestions}
            playlistUrl={playlistUrl}
            playlistItemsForChange={playlistItems}
            playlistError={playlistError}
            playlistLoading={playlistLoading}
            collections={collections}
            collectionsLoading={collectionsLoading}
            collectionsError={collectionsError}
            collectionItemsLoading={collectionItemsLoading}
            collectionItemsError={collectionItemsError}
            isGoogleAuthed={Boolean(authUser)}
            selectedCollectionId={selectedCollectionId}
            youtubePlaylists={youtubePlaylists}
            youtubePlaylistsLoading={youtubePlaylistsLoading}
            youtubePlaylistsError={youtubePlaylistsError}
            isHost={currentRoom.hostClientId === clientId}
            gameState={gameState}
            canStartGame={playlistProgress.ready}
            onLeave={() => leaveRoomAndNavigate()}
            onInputChange={setMessageInput}
            onSend={handleSendMessage}
            onLoadMorePlaylist={loadMorePlaylist}
            onStartGame={handleStartGame}
            onUpdateRoomSettings={handleUpdateRoomSettings}
            hasLastSettlement={Boolean(
              latestSettlementSnapshot || mergedSettlementSummaries.length > 0,
            )}
            latestSettlementRoundKey={latestSettlementRoundKey}
            onOpenLastSettlement={() => {
              if (latestSettlementSnapshot) {
                setActiveSettlementRoundKey(latestSettlementSnapshot.roundKey);
                return;
              }
              void (async () => {
                const summaries =
                  mergedSettlementSummaries.length > 0
                    ? mergedSettlementSummaries
                    : await ensureSettlementSummaryListLoaded();
                const latest = [...summaries].sort(
                  (a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo,
                )[0];
                if (!latest) {
                  setStatusText("目前沒有可查看的對戰紀錄");
                  return;
                }
                await openSettlementReviewByRoundKey(latest.roundKey);
              })().catch((error) => {
                setStatusText(
                  error instanceof Error
                    ? error.message
                    : "開啟最新結算失敗，請稍後再試",
                );
              });
            }}
            onOpenHistoryDrawer={openHistoryDrawer}
            onOpenSettlementByRoundKey={(roundKey) => {
              void openSettlementReviewByRoundKey(roundKey);
            }}
            onOpenGame={() => {
              setActiveSettlementRoundKey(null);
              setIsGameView(true);
            }}
            onKickPlayer={handleKickPlayer}
            onTransferHost={handleTransferHost}
            onSuggestPlaylist={handleSuggestPlaylist}
            onApplySuggestionSnapshot={handleApplySuggestionSnapshot}
            onChangePlaylist={handleChangePlaylist}
            onPlaylistUrlChange={setPlaylistUrl}
            onFetchPlaylistByUrl={handleFetchPlaylistByUrl}
            onFetchCollections={fetchCollections}
            onSelectCollection={selectCollection}
            onLoadCollectionItems={loadCollectionItems}
            onFetchYoutubePlaylists={fetchYoutubePlaylists}
            onImportYoutubePlaylist={importYoutubePlaylist}
            onInvite={async () => {
              const url = new URL(window.location.href);
              url.pathname = `/invited/${currentRoom.id}`;
              url.search = "";
              const inviteText = url.toString();
              if (navigator.clipboard?.writeText) {
                try {
                  await navigator.clipboard.writeText(inviteText);
                  setStatusText("邀請連結已複製");
                } catch {
                  setStatusText("複製失敗，請手動複製連結");
                }
              } else {
                setStatusText(inviteText);
              }
            }}
          />
        )}
      </div>
      {battleHistoryDrawer}
      {battleHistoryReplayDialog}
      {settlementReviewLoadingBanner}
    </>
  );
};

export default RoomLobbyPage;

