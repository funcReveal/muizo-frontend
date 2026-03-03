import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import type {
  Ack,
  ChatMessage,
  ClientSocket,
  GameState,
  PlaylistItem,
  PlaylistSuggestion,
  SessionProgressPayload,
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
  RoomParticipant,
  RoomState,
  RoomSummary,
  SubmitAnswerResult,
} from "./types";
import {
  RoomContext,
  type RoomContextValue,
  type RoomCreateSourceMode,
} from "./RoomContext";
import {
  API_URL,
  CHUNK_SIZE,
  DEFAULT_CLIP_SEC,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
  PLAYER_MAX,
  PLAYER_MIN,
  QUESTION_MAX,
  QUESTION_MIN,
  USERNAME_MAX,
  SOCKET_URL,
  } from "./roomConstants";
import {
  clampPlayDurationSec,
  clampQuestionCount,
  clampStartOffsetSec,
  formatSeconds,
  getQuestionMax,
  normalizePlaylistItems,
} from "./roomUtils";
import { resolveSettlementTrackLink } from "./settlementLinks";
import { ensureFreshAuthToken } from "../../../shared/auth/token";
import {
  clearRoomPassword,
  clearStoredRoomId,
  clearStoredSessionClientId,
  clearStoredUsername,
  getOrCreateClientId,
  getRoomPassword,
  getStoredSessionClientId,
  getStoredRoomId,
  getStoredUsername,
  setRoomPassword,
  setStoredSessionClientId,
  setStoredQuestionCount,
  setStoredRoomId,
  setStoredUsername,
} from "./roomStorage";
import {
  apiFetchCollectionItems,
  apiCreateCollectionReadToken,
  apiFetchRoomById,
  apiFetchRooms,
  apiPreviewPlaylist,
  apiFetchYoutubePlaylistItems,
  type WorkerCollectionItem,
} from "./roomApi";
import { connectRoomSocket, disconnectRoomSocket } from "./roomSocket";
import { trackEvent } from "../../../shared/analytics/track";
import { useRoomAuth } from "./useRoomAuth";
import { useRoomPlaylist } from "./useRoomPlaylist";
import { useRoomCollections } from "./useRoomCollections";

const mapCollectionItemsToPlaylist = (
  _collectionId: string,
  items: WorkerCollectionItem[],
) =>
  items.map((item, index) => {
    const startSec = Math.max(0, item.start_sec ?? 0);
    const explicitEndSec =
      typeof item.end_sec === "number" && item.end_sec > startSec
        ? item.end_sec
        : null;
    const hasExplicitEndSec = explicitEndSec !== null;
    const hasExplicitStartSec = startSec > 0;
    const safeEnd = Math.max(
      startSec + 1,
      explicitEndSec ?? startSec + DEFAULT_CLIP_SEC,
    );
    const provider = (item.provider ?? "manual").trim().toLowerCase();
    const sourceId = (item.source_id ?? "").trim();
    const videoId = provider === "youtube" && sourceId ? sourceId : "";
    const durationValue =
      typeof item.duration_sec === "number" && item.duration_sec > 0
        ? formatSeconds(item.duration_sec)
        : formatSeconds(safeEnd - startSec);
    const rawTitle = item.title ?? item.answer_text ?? `嚙緬嚙踝蕭 ${index + 1}`;
    const answerText = item.answer_text ?? rawTitle;
    const resolvedLink = resolveSettlementTrackLink({
      provider,
      sourceId: sourceId || null,
      videoId,
      url: "",
      title: rawTitle,
      answerText,
      uploader: item.channel_title ?? undefined,
    });
    return {
      title: rawTitle,
      answerText,
      url: resolvedLink.href ?? "",
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined,
      uploader: item.channel_title ?? undefined,
      duration: durationValue,
      startSec,
      endSec: safeEnd,
      hasExplicitStartSec,
      hasExplicitEndSec,
      collectionClipStartSec: startSec,
      collectionClipEndSec: explicitEndSec ?? undefined,
      collectionHasExplicitStartSec: hasExplicitStartSec,
      collectionHasExplicitEndSec: hasExplicitEndSec,
      ...(videoId ? { videoId } : {}),
      sourceId: sourceId || null,
      provider,
    };
  });

const extractVideoIdFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const vid = parsed.searchParams.get("v");
    if (vid) return vid;
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments.pop() || null;
  } catch {
    try {
      const parsed = new URL(`https://${url}`);
      const vid = parsed.searchParams.get("v");
      if (vid) return vid;
      const segments = parsed.pathname.split("/").filter(Boolean);
      return segments.pop() || null;
    } catch {
      const match =
        url.match(/[?&]v=([^&]+)/) ||
        url.match(/youtu\.be\/([^?&]+)/) ||
        url.match(/youtube\.com\/embed\/([^?&]+)/);
      return match?.[1] ?? null;
    }
  }
};

const formatAckError = (prefix: string, error?: string) => {
  const detail = error?.trim();
  return `${prefix}嚙瘦${detail || "嚙踝蕭嚙踝蕭嚙踝蕭嚙羯"}`;
};

const normalizeQuestionCount = (value: number | undefined, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
};

type RoomGameSettings = NonNullable<RoomSummary["gameSettings"]>;

const mergeGameSettings = (
  current: RoomSummary["gameSettings"] | undefined,
  incoming: Partial<RoomGameSettings> | undefined,
): RoomGameSettings => {
  const fallbackQuestionCount = normalizeQuestionCount(
    current?.questionCount,
    QUESTION_MIN,
  );
  return {
    questionCount: normalizeQuestionCount(
      incoming?.questionCount,
      fallbackQuestionCount,
    ),
    playDurationSec: clampPlayDurationSec(
      incoming?.playDurationSec ??
        current?.playDurationSec ??
        DEFAULT_PLAY_DURATION_SEC,
    ),
    startOffsetSec: clampStartOffsetSec(
      incoming?.startOffsetSec ??
        current?.startOffsetSec ??
        DEFAULT_START_OFFSET_SEC,
    ),
    allowCollectionClipTiming:
      incoming?.allowCollectionClipTiming ??
      current?.allowCollectionClipTiming ??
      true,
  };
};

const applyGameSettingsPatch = (
  room: RoomState["room"],
  patch: Partial<RoomGameSettings>,
): RoomState["room"] => ({
  ...room,
  gameSettings: mergeGameSettings(room.gameSettings, {
    ...room.gameSettings,
    ...patch,
  }),
});

const buildUploadPlaylistItems = (
  sourceItems: PlaylistItem[],
  options: {
    playDurationSec: number;
    startOffsetSec: number;
    allowCollectionClipTiming: boolean;
  },
): PlaylistItem[] => {
  const roomPlayDurationSec = clampPlayDurationSec(options.playDurationSec);
  const roomStartOffsetSec = clampStartOffsetSec(options.startOffsetSec);
  return normalizePlaylistItems(sourceItems).map((item) => {
    const itemStartSec = Math.max(0, item.startSec ?? 0);
    const rawHasExplicitEndSec =
      typeof item.hasExplicitEndSec === "boolean"
        ? item.hasExplicitEndSec
        : typeof item.endSec === "number" && item.endSec > itemStartSec;
    const rawHasExplicitStartSec =
      typeof item.hasExplicitStartSec === "boolean"
        ? item.hasExplicitStartSec
        : itemStartSec > 0 || rawHasExplicitEndSec;
    const collectionClipStartSec = Math.max(
      0,
      item.collectionClipStartSec ?? itemStartSec,
    );
    const inferredTrackClip = item.timingSource === "track_clip";
    const collectionHasExplicitStartSec =
      typeof item.collectionHasExplicitStartSec === "boolean"
        ? item.collectionHasExplicitStartSec
        : inferredTrackClip
          ? rawHasExplicitStartSec
          : false;
    const collectionHasExplicitEndSec =
      typeof item.collectionHasExplicitEndSec === "boolean"
        ? item.collectionHasExplicitEndSec
        : inferredTrackClip
          ? rawHasExplicitEndSec
          : false;
    const collectionClipEndSec =
      typeof item.collectionClipEndSec === "number" &&
      item.collectionClipEndSec > collectionClipStartSec
        ? item.collectionClipEndSec
        : collectionHasExplicitEndSec &&
            typeof item.endSec === "number" &&
            item.endSec > collectionClipStartSec
          ? item.endSec
          : undefined;
    const isCollectionItem = item.provider === "collection";
    const useTrackClip =
      options.allowCollectionClipTiming &&
      isCollectionItem &&
      (collectionHasExplicitStartSec || collectionHasExplicitEndSec);
    const startSec = useTrackClip ? collectionClipStartSec : roomStartOffsetSec;
    const fallbackEndSec = startSec + roomPlayDurationSec;
    const itemEndSec =
      useTrackClip && collectionHasExplicitEndSec && collectionClipEndSec
        ? collectionClipEndSec
        : fallbackEndSec;
    const endSec = Math.max(startSec + 1, useTrackClip ? itemEndSec : fallbackEndSec);
    return {
      ...item,
      startSec,
      endSec,
      hasExplicitStartSec: useTrackClip ? collectionHasExplicitStartSec : false,
      hasExplicitEndSec: useTrackClip ? collectionHasExplicitEndSec : false,
      collectionClipStartSec,
      collectionClipEndSec,
      collectionHasExplicitStartSec,
      collectionHasExplicitEndSec,
      timingSource: useTrackClip
        ? ("track_clip" as const)
        : ("room_settings" as const),
    };
  });
};

const mergeRoomSummaryIntoCurrentRoom = (
  current: RoomState["room"],
  summary: RoomSummary,
): RoomState["room"] => ({
  ...current,
  ...summary,
  gameSettings: mergeGameSettings(current.gameSettings, summary.gameSettings),
});

export const RoomProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { pathname } = useLocation();
  const shouldConnectSocket =
    pathname.startsWith("/rooms") || pathname.startsWith("/invited");
  const socketSuspendedRef = useRef(false);

  const [usernameInput, setUsernameInputState] = useState(
    () => (getStoredUsername() ?? "").slice(0, USERNAME_MAX),
  );
  const [username, setUsername] = useState<string | null>(
    () => getStoredUsername() ?? null,
  );
  const [localClientId] = useState<string>(() => getOrCreateClientId());
  const [sessionClientId, setSessionClientId] = useState<string>(
    () => getStoredSessionClientId() ?? localClientId,
  );
  const [sessionClientIdLocked, setSessionClientIdLocked] = useState(() =>
    Boolean(getStoredSessionClientId()),
  );
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomNameInput, setRoomNameInput] = useState(() =>
    username ? `${username}'s room` : "嚙誹迎蕭嚙請塚蕭",
  );
  const [roomVisibilityInput, setRoomVisibilityInput] = useState<
    "public" | "private"
  >("public");
  const [roomCreateSourceMode, setRoomCreateSourceMode] =
    useState<RoomCreateSourceMode>("link");
  const [roomPasswordInput, setRoomPasswordInput] = useState("");
  const [roomMaxPlayersInput, setRoomMaxPlayersInput] = useState("");
  const [playDurationSec, setPlayDurationSec] = useState(
    DEFAULT_PLAY_DURATION_SEC,
  );
  const [startOffsetSec, setStartOffsetSec] = useState(
    DEFAULT_START_OFFSET_SEC,
  );
  const [allowCollectionClipTiming, setAllowCollectionClipTiming] =
    useState(true);
  const [joinPasswordInput, setJoinPasswordInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState<RoomState["room"] | null>(
    null,
  );
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(() =>
    getStoredRoomId(),
  );
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<
    RoomSettlementSnapshot[]
  >([]);
  const [messageInput, setMessageInput] = useState("");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionProgressPayload | null>(
    null,
  );
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [playlistViewItems, setPlaylistViewItems] = useState<PlaylistItem[]>(
    [],
  );
  const [playlistHasMore, setPlaylistHasMore] = useState(false);
  const [playlistLoadingMore, setPlaylistLoadingMore] = useState(false);
  const [playlistPageCursor, setPlaylistPageCursor] = useState(1);
  const [playlistPageSize, setPlaylistPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [playlistProgress, setPlaylistProgress] = useState<{
    received: number;
    total: number;
    ready: boolean;
  }>({ received: 0, total: 0, ready: false });
  const [playlistSuggestions, setPlaylistSuggestions] = useState<
    PlaylistSuggestion[]
  >([]);
  const [inviteRoomId, setInviteRoomId] = useState<string | null>(null);
  const isInviteMode = Boolean(inviteRoomId);
  const [inviteNotFound, setInviteNotFound] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gamePlaylist, setGamePlaylist] = useState<PlaylistItem[]>([]);
  const [isGameView, setIsGameView] = useState(false);
  const [routeRoomResolved, setRouteRoomResolved] = useState<boolean>(() =>
    Boolean(currentRoomId),
  );
  const [hostRoomPassword, setHostRoomPassword] = useState<string | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  const socketRef = useRef<ClientSocket | null>(null);
  const createRoomInFlightRef = useRef(false);
  const releaseCreateRoomLockRef = useRef<(() => void) | null>(null);
  const pendingAnswerSubmitRef = useRef<{
    roomId: string;
    trackKey: string;
    choiceIndex: number;
    requestId: number;
  } | null>(null);
  const currentRoomIdRef = useRef<string | null>(
    currentRoomId ?? getStoredRoomId(),
  );
  const answerSubmitRequestSeqRef = useRef(0);
  const serverOffsetRef = useRef(0);
  const presenceParticipantNamesRef = useRef<Map<string, string>>(new Map());
  const presenceSeededRoomIdRef = useRef<string | null>(null);

  const resetPresenceParticipants = useCallback(() => {
    presenceParticipantNamesRef.current = new Map();
    presenceSeededRoomIdRef.current = null;
  }, []);

  const seedPresenceParticipants = useCallback(
    (roomId: string | null | undefined, nextParticipants: RoomParticipant[]) => {
      if (!roomId) {
        resetPresenceParticipants();
        return;
      }
      presenceParticipantNamesRef.current = new Map(
        nextParticipants.map((participant) => [
          participant.clientId,
          participant.username?.trim() || "嚙踝蕭嚙窮",
        ]),
      );
      presenceSeededRoomIdRef.current = roomId;
    },
    [resetPresenceParticipants],
  );

  const appendPresenceSystemMessage = useCallback(
    (roomId: string, playerName: string, action: "joined" | "left") => {
      const safeName = playerName.trim();
      if (!safeName) return;
      const timestamp = Date.now() + serverOffsetRef.current;
      const content =
        action === "joined" ? `${safeName} 嚙緩嚙稼嚙皚嚙瘠嚙踝蕭` : `${safeName} 嚙緩嚙踝蕭嚙罷嚙瘠嚙踝蕭`;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.userId === "system:presence" &&
          last.content === content &&
          Math.abs((last.timestamp ?? 0) - timestamp) <= 1500
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            id:
              crypto.randomUUID?.() ??
              `presence-${action}-${roomId}-${timestamp}-${Math.random()
                .toString(16)
                .slice(2, 8)}`,
            roomId,
            userId: "system:presence",
            username: "系統",
            content,
            timestamp,
          },
        ];
      });
    },
    [],
  );

  const displayUsername = useMemo(() => username ?? "(嚙踝蕭嚙稽嚙緩)", [username]);

  const persistUsername = useCallback((name: string) => {
    setUsername(name);
    setStoredUsername(name);
  }, []);

  const clearAuth = useCallback(() => {
    setUsername(null);
    clearStoredUsername();
    setUsernameInputState("");
  }, []);

  const setUsernameInput = useCallback((value: string) => {
    setUsernameInputState(value.slice(0, USERNAME_MAX));
  }, []);

  const onResetCollectionRef = useRef<() => void>(() => {});

  const {
    authToken,
    authUser,
    authLoading,
    authExpired,
    needsNicknameConfirm,
    nicknameDraft,
    isProfileEditorOpen,
    setNicknameDraft,
    refreshAuthToken,
    confirmNickname,
    openProfileEditor,
    closeProfileEditor,
    loginWithGoogle,
    logout,
  } = useRoomAuth({
    apiUrl: API_URL,
    username,
    persistUsername,
    setStatusText,
    onClearAuth: clearAuth,
  });

  const authClientId = authUser?.id ?? null;
  const clientId = useMemo(
    () =>
      sessionClientIdLocked
        ? sessionClientId
        : authClientId ?? localClientId,
    [authClientId, localClientId, sessionClientId, sessionClientIdLocked],
  );
  const lockSessionClientId = useCallback((nextClientId: string) => {
    setSessionClientId(nextClientId);
    setStoredSessionClientId(nextClientId);
    setSessionClientIdLocked(true);
  }, []);
  const resetSessionClientId = useCallback(() => {
    clearStoredSessionClientId();
    setSessionClientId(authClientId ?? localClientId);
    setSessionClientIdLocked(false);
  }, [authClientId, localClientId]);

  const {
    playlistUrl,
    setPlaylistUrl,
    playlistItems,
    playlistError,
    playlistLoading,
    playlistStage,
    playlistLocked,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    questionCount,
    questionMin,
    questionMaxLimit,
    questionStep,
    updateQuestionCount,
    handleFetchPlaylist,
    handleResetPlaylist,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
    applyPlaylistSource,
    clearPlaylistError,
    resetPlaylistState,
    resetYoutubePlaylists,
  } = useRoomPlaylist({
    apiUrl: API_URL,
    authToken,
    refreshAuthToken,
    setStatusText,
    onResetCollection: () => onResetCollectionRef.current(),
  });

  const fetchYoutubeSnapshot = useCallback(
    async (playlistId: string) => {
      if (!API_URL) {
        throw new Error("嚙罵嚙踝蕭嚙稽嚙緩嚙踝蕭嚙踝蕭M嚙踝蕭 API 嚙踝蕭m (API_URL)");
      }
      if (!authToken) {
        throw new Error("嚙請伐蕭嚙緯嚙皚嚙踝蕭A嚙誕用私嚙瘡嚙踝蕭嚙踝蕭M嚙踝蕭");
      }
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) {
        throw new Error("嚙緯嚙皚嚙緩嚙盤嚙踝蕭嚙璀嚙豎要嚙踝蕭嚙編嚙踝蕭嚙緞 Google");
      }
      const run = async (token: string, allowRetry: boolean) => {
        const { ok, status, payload } = await apiFetchYoutubePlaylistItems(
          API_URL,
          token,
          playlistId,
        );
        if (ok) {
          const data = payload?.data;
          if (!data?.items || data.items.length === 0) {
            throw new Error("嚙瞎嚙踝蕭S嚙踝蕭嚙箠嚙諄影嚙踝蕭");
          }
          const normalized = normalizePlaylistItems(
            data.items.map((item) => {
              const resolvedVideoId =
                item.videoId ?? extractVideoIdFromUrl(item.url);
              return {
                ...item,
                ...(resolvedVideoId ? { videoId: resolvedVideoId } : {}),
                sourceId: data.playlistId ?? playlistId,
                provider: "youtube",
              };
            }),
          );
          const title =
            youtubePlaylists.find((item) => item.id === playlistId)?.title ??
            null;
          return {
            items: normalized,
            title,
            totalCount: normalized.length,
            sourceId: data.playlistId ?? playlistId,
          };
        }
        if (status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return await run(refreshed, false);
          }
        }
        const message = payload?.error ?? "讀嚙踝蕭嚙踝蕭嚙踝蕭M嚙賣失嚙踝蕭";
        throw new Error(message);
      };

      return await run(token, true);
    },
    [authToken, refreshAuthToken, youtubePlaylists],
  );

  const fetchPublicPlaylistSnapshot = useCallback(
    async (url: string, playlistId: string) => {
      if (!API_URL) {
        throw new Error("嚙罵嚙踝蕭嚙稽嚙緩嚙踝蕭嚙踝蕭M嚙踝蕭 API 嚙踝蕭m (API_URL)");
      }
      const { ok, payload } = await apiPreviewPlaylist(
        API_URL,
        url,
        playlistId,
      );
      if (!ok || !payload) {
        throw new Error("讀嚙踝蕭嚙踝蕭嚙踝蕭M嚙賣失嚙諸，嚙請稍嚙賦重嚙踝蕭");
      }
      if ("error" in payload) {
        throw new Error(payload.error || "讀嚙踝蕭嚙踝蕭嚙踝蕭M嚙賣失嚙諸，嚙請稍嚙賦重嚙踝蕭");
      }
      const data = payload;
      if (!data?.items || data.items.length === 0) {
        throw new Error(
          "嚙瞎嚙踝蕭S嚙踝蕭嚙箠嚙諄影嚙踝蕭嚙璀嚙箠嚙賞為嚙緘嚙瘡/嚙踝蕭嚙踝蕭嚙諄自動合嚙質不嚙踝蕭嚙賭援嚙瘠",
        );
      }
      const normalized = normalizePlaylistItems(
        data.items.map((item) => {
          const resolvedVideoId =
            item.videoId ?? extractVideoIdFromUrl(item.url);
          return {
            ...item,
            ...(resolvedVideoId ? { videoId: resolvedVideoId } : {}),
            sourceId: data.playlistId ?? playlistId,
            provider: "youtube",
          };
        }),
      );
      return {
        items: normalized,
        title: data.title ?? null,
        totalCount: normalized.length,
        sourceId: data.playlistId ?? playlistId,
      };
    },
    [],
  );

  const handleUpdateQuestionCount = useCallback(
    (value: number) => {
      const clamped = updateQuestionCount(value);
      setStoredQuestionCount(clamped);
    },
    [updateQuestionCount],
  );

  const handleUpdatePlayDurationSec = useCallback((value: number) => {
    const clamped = clampPlayDurationSec(value);
    setPlayDurationSec(clamped);
    return clamped;
  }, []);

  const handleUpdateStartOffsetSec = useCallback((value: number) => {
    const clamped = clampStartOffsetSec(value);
    setStartOffsetSec(clamped);
    return clamped;
  }, []);

  const handleUpdateAllowCollectionClipTiming = useCallback((value: boolean) => {
    setAllowCollectionClipTiming(Boolean(value));
    return Boolean(value);
  }, []);

  const {
    collections,
    collectionsLoading,
    collectionsError,
    collectionScope,
    publicCollectionsSort,
    setPublicCollectionsSort,
    collectionFavoriteUpdatingId,
    collectionsLastFetchedAt,
    selectedCollectionId,
    collectionItemsLoading,
    collectionItemsError,
    selectCollection,
    fetchCollections,
    toggleCollectionFavorite,
    loadCollectionItems,
    resetCollectionsState,
    resetCollectionSelection,
    clearCollectionsError,
  } = useRoomCollections({
    apiUrl: API_URL,
    authToken,
    ownerId: authUser?.id ?? null,
    refreshAuthToken,
    setStatusText,
    onPlaylistLoaded: (items, sourceId, title) => {
      applyPlaylistSource(items, sourceId, title ?? null);
      setPlaylistUrl("");
    },
    onPlaylistReset: () => {
      clearPlaylistError();
    },
  });

  useEffect(() => {
    onResetCollectionRef.current = resetCollectionSelection;
  }, [resetCollectionSelection]);

  useEffect(() => {
    if (authToken) return;
    resetYoutubePlaylists();
    resetCollectionsState();
    resetPlaylistState();
  }, [authToken, resetCollectionsState, resetPlaylistState, resetYoutubePlaylists]);

 

  const persistRoomId = useCallback((id: string | null) => {
    currentRoomIdRef.current = id;
    setCurrentRoomId(id);
    if (id) {
      setStoredRoomId(id);
    } else {
      clearStoredRoomId();
    }
  }, []);

  const saveRoomPassword = useCallback((roomId: string, password: string | null) => {
    if (password) {
      setRoomPassword(roomId, password);
    } else {
      clearRoomPassword(roomId);
    }
  }, []);

  const readRoomPassword = (roomId: string) => getRoomPassword(roomId);

  const handleSetUsername = useCallback(() => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setStatusText("嚙請伐蕭嚙踝蕭J嚙誕用者名嚙踝蕭");
      return;
    }
    if (trimmed.length > USERNAME_MAX) {
      setStatusText(`嚙誕用者名嚙誶最多 ${USERNAME_MAX} 嚙諉字`);
      return;
    }
    persistUsername(trimmed);
    setStatusText(null);
  }, [persistUsername, usernameInput]);


  const getSocket = useCallback(() => socketRef.current, []);

  const syncServerOffset = useCallback((serverNow: number) => {
    const offset = serverNow - Date.now();
    serverOffsetRef.current = offset;
    setServerOffsetMs(offset);
  }, []);

  const fetchCollectionSnapshot = useCallback(
    async (collectionId: string) => {
      if (!API_URL) {
        throw new Error("嚙罵嚙踝蕭嚙稽嚙緩嚙踝蕭嚙衛庫 API 嚙踝蕭m (API_URL)");
      }
      if (!collectionId) {
        throw new Error("嚙請伐蕭嚙踝蕭雃嚙踝蕭簾w");
      }
      const tokenToUse = authToken
        ? await ensureFreshAuthToken({ token: authToken, refreshAuthToken })
        : null;
      if (authToken && !tokenToUse) {
        throw new Error("嚙緯嚙皚嚙緩嚙盤嚙踝蕭嚙璀嚙請哨蕭嚙編嚙緯嚙皚");
      }
      const run = async (token: string | null, allowRetry: boolean) => {
        const { ok, status, payload } = await apiFetchCollectionItems(
          API_URL,
          token,
          collectionId,
        );
        if (ok) {
          const items = payload?.data?.items ?? [];
          if (items.length === 0) {
            throw new Error("嚙踝蕭嚙衛庫嚙踝蕭嚙磅嚙踝蕭嚙緬嚙踝蕭");
          }
          return normalizePlaylistItems(
            mapCollectionItemsToPlaylist(collectionId, items),
          );
        }
        if (status === 401 && allowRetry && token) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return await run(refreshed, false);
          }
        }
        throw new Error(payload?.error ?? "嚙踝蕭嚙皚嚙踝蕭嚙衛庫嚙踝蕭嚙踝蕭");
      };
      return await run(tokenToUse, Boolean(tokenToUse));
    },
      [authToken, refreshAuthToken],
    );

  const createCollectionReadToken = useCallback(
    async (collectionId: string) => {
      if (!API_URL) {
        throw new Error("嚙罵嚙踝蕭嚙稽嚙緩嚙踝蕭嚙衛庫 API 嚙踝蕭m (API_URL)");
      }
      if (!authToken) {
        throw new Error("嚙請伐蕭嚙緯嚙皚嚙踝蕭A嚙踝蕭嚙誼私嚙瘡嚙踝蕭嚙衛庫");
      }
      const tokenToUse = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!tokenToUse) {
        throw new Error("嚙緯嚙皚嚙緩嚙盤嚙踝蕭嚙璀嚙請哨蕭嚙編嚙緯嚙皚");
      }
      const run = async (token: string, allowRetry: boolean) => {
        const { ok, status, payload } = await apiCreateCollectionReadToken(
          API_URL,
          token,
          collectionId,
        );
        if (ok && payload?.data?.token) return payload.data.token;
        if (status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return await run(refreshed, false);
          }
        }
        throw new Error(payload?.error ?? "嚙踝蕭嚙緻嚙踝蕭嚙衛庫讀嚙踝蕭嚙緞嚙踝蕭嚙踝蕭嚙踝蕭");
      };
      return await run(tokenToUse, true);
    },
    [authToken, refreshAuthToken],
  );

  const fetchRooms = useCallback(async () => {
    if (!API_URL) {
      setStatusText("嚙罵嚙踝蕭嚙稽嚙緩 API 嚙踝蕭m (API_URL)");
      return;
    }
    try {
      const { ok, payload } = await apiFetchRooms(API_URL);
      if (!ok) {
        throw new Error(payload?.error ?? "嚙盤嚙糊嚙踝蕭嚙緻嚙請塚蕭嚙瘠嚙踝蕭");
      }
      const next = (payload?.rooms ?? payload) as RoomSummary[];
      setRooms(Array.isArray(next) ? next : []);
      if (isInviteMode && inviteRoomId) {
        const found = Array.isArray(next)
          ? next.some((room) => room.id === inviteRoomId)
          : false;
        setInviteNotFound(!found);
        if (!found) {
          setStatusText("嚙踝蕭嚙豌房塚蕭嚙踝蕭嚙編嚙箭嚙諄已嚙踝蕭嚙踝蕭");
        }
      }
    } catch (error) {
      console.error(error);
      setStatusText("取得房間列表失敗");
    }
  }, [isInviteMode, inviteRoomId]);

  const fetchRoomById = useCallback(async (roomId: string) => {
    if (!API_URL) {
      setStatusText("嚙罵嚙踝蕭嚙稽嚙緩 API 嚙踝蕭m (API_URL)");
      return null;
    }
    try {
      const { ok, payload } = await apiFetchRoomById(API_URL, roomId);
      if (!ok) {
        return null;
      }
      return (payload?.room ?? null) as RoomSummary | null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);

  const fetchSettlementHistorySummaries = useCallback(
    async (options?: { limit?: number; beforeEndedAt?: number | null }) => {
      const s = getSocket();
      if (!s || !currentRoom) {
        throw new Error("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
      }
      return await new Promise<{
        items: RoomSettlementHistorySummary[];
        nextCursor: number | null;
      }>((resolve, reject) => {
        s.emit(
          "listSettlementHistorySummaries",
          {
            roomId: currentRoom.id,
            limit: options?.limit,
            beforeEndedAt: options?.beforeEndedAt ?? null,
          },
          (ack) => {
            if (!ack) {
              reject(new Error("嚙踝蕭嚙皚嚙踝蕭埲嚙踝蕭v嚙踝蕭嚙踝蕭"));
              return;
            }
            if (!ack.ok) {
              reject(new Error(ack.error || "嚙踝蕭嚙皚嚙踝蕭埲嚙踝蕭v嚙踝蕭嚙踝蕭"));
              return;
            }
            resolve(ack.data);
          },
        );
      });
    },
    [currentRoom, getSocket],
  );

  const fetchSettlementReplay = useCallback(
    async (matchId: string) => {
      const s = getSocket();
      if (!s || !currentRoom) {
        throw new Error("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
      }
      return await new Promise<RoomSettlementSnapshot>((resolve, reject) => {
        s.emit(
          "getSettlementReplay",
          {
            roomId: currentRoom.id,
            matchId,
          },
          (ack) => {
            if (!ack) {
              reject(new Error("嚙踝蕭嚙皚嚙踝蕭啈^嚙磊嚙踝蕭嚙踝蕭"));
              return;
            }
            if (!ack.ok) {
              reject(new Error(ack.error || "嚙踝蕭嚙皚嚙踝蕭啈^嚙磊嚙踝蕭嚙踝蕭"));
              return;
            }
            resolve(ack.data);
          },
        );
      });
    },
    [currentRoom, getSocket],
  );

  useEffect(() => {
    if (!inviteRoomId) {
      setInviteNotFound(false);
      return;
    }
    void fetchRoomById(inviteRoomId).then((room) => {
      setInviteNotFound(!room);
      if (!room) {
        setStatusText("嚙踝蕭嚙豌房塚蕭嚙踝蕭嚙編嚙箭嚙諄已嚙踝蕭嚙踝蕭");
      }
    });
  }, [fetchRoomById, inviteRoomId]);

  const fetchPlaylistPage = useCallback((
    roomId: string,
    page: number,
    pageSize?: number,
    opts?: { reset?: boolean },
  ) => {
    const s = getSocket();
    if (!s) {
      if (opts?.reset) {
        setPlaylistViewItems([]);
        setPlaylistHasMore(false);
      }
      return;
    }
    if (opts?.reset) {
      setPlaylistViewItems([]);
      setPlaylistHasMore(false);
      setPlaylistPageCursor(1);
      setPlaylistLoadingMore(true);
    } else {
      setPlaylistLoadingMore(true);
    }
    s.emit(
      "getPlaylistPage",
      { roomId, page, pageSize },
      (
        ack: Ack<{
          items: PlaylistItem[];
          totalCount: number;
          page: number;
          pageSize: number;
          ready: boolean;
        }>,
      ) => {
        if (ack?.ok) {
          setPlaylistViewItems((prev) => {
            const next = opts?.reset
              ? ack.data.items
              : [...prev, ...ack.data.items];
            const total = ack.data.totalCount;
            setPlaylistHasMore(next.length < total);
            return next;
          });
          setPlaylistPageCursor(ack.data.page);
          setPlaylistPageSize(ack.data.pageSize);
          setPlaylistProgress((prev) => ({
            ...prev,
            total: ack.data.totalCount,
            ready: ack.data.ready,
          }));
        }
        setPlaylistLoadingMore(false);
      },
    );
  }, [getSocket]);

  const fetchCompletePlaylist = useCallback(
    (roomId: string) =>
      new Promise<PlaylistItem[]>((resolve) => {
        const s = getSocket();
        if (!s) {
          resolve([]);
          return;
        }
        const aggregated: PlaylistItem[] = [];
        const pageSize = Math.max(playlistPageSize, DEFAULT_PAGE_SIZE);

        const loadPage = (page: number) => {
          s.emit(
            "getPlaylistPage",
            { roomId, page, pageSize },
            (
              ack: Ack<{
                items: PlaylistItem[];
                totalCount: number;
                page: number;
                pageSize: number;
                ready: boolean;
              }>,
            ) => {
              if (ack?.ok) {
                aggregated.push(...ack.data.items);
                if (
                  aggregated.length < ack.data.totalCount &&
                  ack.data.items.length > 0
                ) {
                  loadPage(page + 1);
                } else {
                  resolve(normalizePlaylistItems(aggregated));
                }
              } else {
                resolve(normalizePlaylistItems(aggregated));
              }
            },
          );
        };

        loadPage(1);
      }),
    [getSocket, playlistPageSize],
  );

  const syncRoomPlaylistTiming = useCallback(
    async (
      room: RoomState["room"],
      gameSettingsOverride?: Partial<RoomGameSettings>,
    ) => {
      const s = getSocket();
      if (!s) return false;
      const sourceItems = await fetchCompletePlaylist(room.id);
      if (sourceItems.length === 0) return false;
      const gameSettings = mergeGameSettings(
        room.gameSettings,
        gameSettingsOverride,
      );
      const uploadItems = buildUploadPlaylistItems(sourceItems, {
        playDurationSec: gameSettings.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
        startOffsetSec: gameSettings.startOffsetSec ?? DEFAULT_START_OFFSET_SEC,
        allowCollectionClipTiming: gameSettings.allowCollectionClipTiming ?? true,
      });
      if (uploadItems.length === 0) return false;

      const uploadId =
        crypto.randomUUID?.() ??
        `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
      const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
      const remaining = uploadItems.slice(CHUNK_SIZE);
      const isLast = remaining.length === 0;

      const changePlaylistOk = await new Promise<boolean>((resolve) => {
        s.emit(
          "changePlaylist",
          {
            roomId: room.id,
            playlist: {
              uploadId,
              id: room.playlist.id,
              title: room.playlist.title,
              totalCount: uploadItems.length,
              items: firstChunk,
              isLast,
              pageSize: room.playlist.pageSize || DEFAULT_PAGE_SIZE,
            },
          },
          (ack: Ack<{ receivedCount: number; totalCount: number; ready: boolean }>) => {
            resolve(Boolean(ack?.ok));
          },
        );
      });
      if (!changePlaylistOk) {
        setStatusText("嚙瞑嚙畿嚙緬嚙踝蕭嚙褕塚蕭嚙稽嚙緩嚙踝蕭嚙踝蕭");
        return false;
      }

      if (remaining.length > 0) {
        for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
          const chunk = remaining.slice(i, i + CHUNK_SIZE);
          const isLastChunk = i + CHUNK_SIZE >= remaining.length;
          const chunkOk = await new Promise<boolean>((resolve) => {
            s.emit(
              "uploadPlaylistChunk",
              {
                roomId: room.id,
                uploadId,
                items: chunk,
                isLast: isLastChunk,
              },
              (ack: Ack<{ receivedCount: number; totalCount: number }>) => {
                resolve(Boolean(ack?.ok));
              },
            );
          });
          if (!chunkOk) {
            setStatusText("嚙瞑嚙畿嚙緬嚙踝蕭嚙褕塚蕭嚙稽嚙緩嚙踝蕭嚙踝蕭");
            return false;
          }
        }
      }
      return true;
    },
    [fetchCompletePlaylist, getSocket, setStatusText],
  );

  useEffect(() => {
    if (!username || authLoading) return;
    if (!shouldConnectSocket) {
      socketSuspendedRef.current = true;
      setIsConnected(false);
      setRouteRoomResolved(true);
      return;
    }
    let cancelled = false;
    const init = async () => {
      socketSuspendedRef.current = false;
      let token = authToken;
      if (token) {
        token = await ensureFreshAuthToken({
          token,
          refreshAuthToken,
        });
        if (!token) {
          if (!cancelled) {
            setStatusText("嚙緯嚙皚嚙緩嚙盤嚙踝蕭嚙璀嚙請哨蕭嚙編嚙緯嚙皚");
          }
          return;
        }
      }
      if (cancelled) return;
      const authPayload = token ? { token, clientId } : { clientId };
      const s = connectRoomSocket(SOCKET_URL, authPayload, {
      onConnect: (socket) => {
        setIsConnected(true);
        setSessionProgress(null);
        setStatusText("嚙緩嚙編嚙線嚙踝蕭嚙璀嚙踝蕭");
        void fetchRooms();

        const storedRoomId = currentRoomIdRef.current;
        if (storedRoomId) {
          socket.emit(
            "resumeSession",
            { roomId: storedRoomId, username },
            (ack: Ack<RoomState>) => {
              if (ack?.ok) {
                const state = ack.data;
                syncServerOffset(state.serverNow);
                setCurrentRoom(applyGameSettingsPatch(state.room, {}));
                setParticipants(state.participants);
                seedPresenceParticipants(state.room.id, state.participants);
                setMessages(state.messages);
                setSettlementHistory(state.settlementHistory ?? []);
                setPlaylistProgress({
                  received: state.room.playlist.receivedCount,
                  total: state.room.playlist.totalCount,
                  ready: state.room.playlist.ready,
                });
                setGameState(state.gameState ?? null);
                if (state.gameState?.status === "playing") {
                  setIsGameView(true);
                  void fetchCompletePlaylist(state.room.id).then(setGamePlaylist);
                } else {
                  setIsGameView(false);
                  setGamePlaylist([]);
                }
                fetchPlaylistPage(
                  state.room.id,
                  1,
                  state.room.playlist.pageSize,
                  {
                    reset: true,
                  },
                );
                lockSessionClientId(clientId);
                persistRoomId(state.room.id);
                setStatusText(`嚙踝蕭_嚙請塚蕭嚙瘦${state.room.name}`);
                setRouteRoomResolved(true);
              } else {
                if (ack?.error) {
                  setStatusText(formatAckError("嚙踝蕭_嚙請塚蕭嚙踝蕭嚙踝蕭", ack.error));
                }
                persistRoomId(null);
                resetSessionClientId();
                setRouteRoomResolved(true);
              }
            },
          );
        } else {
          setRouteRoomResolved(true);
        }
      },
      onDisconnect: () => {
        setSessionProgress(null);
        if (createRoomInFlightRef.current) {
          releaseCreateRoomLockRef.current?.();
          setStatusText("嚙諍立房塚蕭嚙踝蕭嚙踝蕭嚙編嚙線嚙踝蕭嚙稻嚙璀嚙請哨蕭嚙調或稍嚙諂自動恬蕭_");
        }
        if (socketSuspendedRef.current) {
          setIsConnected(false);
          setRouteRoomResolved(true);
          return;
        }
        setIsConnected(false);
        setStatusText("嚙瞑嚙踝蕭嚙璀嚙踝蕭嚙稻嚙線嚙璀嚙瞇嚙踝蕭嚙調自動恬蕭_");
        setRouteRoomResolved(false);
        setCurrentRoom(null);
        setParticipants([]);
        resetPresenceParticipants();
        setMessages([]);
        setSettlementHistory([]);
        setGameState(null);
        setGamePlaylist([]);
        setIsGameView(false);
        setPlaylistViewItems([]);
        setPlaylistHasMore(false);
        setPlaylistLoadingMore(false);
        setPlaylistSuggestions([]);
        setServerOffsetMs(0);
        serverOffsetRef.current = 0;
      },
      onRoomsUpdated: (updatedRooms: RoomSummary[]) => {
        setRooms(updatedRooms);
        if (isInviteMode && inviteRoomId) {
          const found = updatedRooms.some((r) => r.id === inviteRoomId);
          setInviteNotFound(!found);
          if (!found) {
            setStatusText("嚙踝蕭嚙豌房塚蕭嚙踝蕭嚙編嚙箭嚙諄已嚙踝蕭嚙踝蕭");
          }
        }
      },
      onSessionProgress: (payload) => {
        setSessionProgress(payload);
      },
      onJoinedRoom: (state) => {
        setSessionProgress(null);
        releaseCreateRoomLockRef.current?.();
        syncServerOffset(state.serverNow);
        setCurrentRoom(applyGameSettingsPatch(state.room, {}));
        setParticipants(state.participants);
        seedPresenceParticipants(state.room.id, state.participants);
        setMessages(state.messages);
        setSettlementHistory(state.settlementHistory ?? []);
        setPlaylistSuggestions([]);
        setPlaylistProgress({
          received: state.room.playlist.receivedCount,
          total: state.room.playlist.totalCount,
          ready: state.room.playlist.ready,
        });
        setGameState(state.gameState ?? null);
        if (state.gameState?.status === "playing") {
          setIsGameView(true);
          void fetchCompletePlaylist(state.room.id).then(setGamePlaylist);
        } else {
          setIsGameView(false);
          setGamePlaylist([]);
        }
        fetchPlaylistPage(state.room.id, 1, state.room.playlist.pageSize, {
          reset: true,
        });
        lockSessionClientId(clientId);
        persistRoomId(state.room.id);
        setStatusText(`嚙緩嚙稼嚙皚嚙請塚蕭嚙瘦${state.room.name}`);
        setRouteRoomResolved(true);
      },
      onParticipantsUpdated: ({ roomId, participants, hostClientId }) => {
        if (roomId !== currentRoomIdRef.current) return;
        if (
          presenceSeededRoomIdRef.current !== roomId ||
          presenceParticipantNamesRef.current.size === 0
        ) {
          seedPresenceParticipants(roomId, participants);
        } else {
          const prevNames = presenceParticipantNamesRef.current;
          for (const participant of participants) {
            if (!prevNames.has(participant.clientId)) {
              appendPresenceSystemMessage(roomId, participant.username, "joined");
            }
          }
          seedPresenceParticipants(roomId, participants);
        }
        setParticipants(participants);
        setCurrentRoom((prev) => (prev ? { ...prev, hostClientId } : prev));
      },
      onUserLeft: ({ roomId, clientId: leftId }) => {
        if (roomId !== currentRoomIdRef.current) return;
        const leftName = presenceParticipantNamesRef.current.get(leftId);
        if (leftName) {
          appendPresenceSystemMessage(roomId, leftName, "left");
        }
        const nextPresenceMap = new Map(presenceParticipantNamesRef.current);
        nextPresenceMap.delete(leftId);
        presenceParticipantNamesRef.current = nextPresenceMap;
        presenceSeededRoomIdRef.current = roomId;
        setParticipants((prev) => prev.filter((p) => p.clientId !== leftId));
      },
      onPlaylistProgress: ({ roomId, receivedCount, totalCount, ready }) => {
        if (roomId !== currentRoomIdRef.current) return;
        setPlaylistProgress({
          received: receivedCount,
          total: totalCount,
          ready,
        });
      },
      onPlaylistUpdated: ({ roomId, playlist }) => {
        if (roomId !== currentRoomIdRef.current) return;
        setCurrentRoom((prev) =>
          prev ? { ...prev, playlist: { ...playlist, items: [] } } : prev,
        );
        setPlaylistProgress({
          received: playlist.receivedCount,
          total: playlist.totalCount,
          ready: playlist.ready,
        });
        fetchPlaylistPage(roomId, 1, playlist.pageSize, { reset: true });
      },
      onMessageAdded: ({ roomId, message }) => {
        if (roomId !== currentRoomIdRef.current) return;
        setMessages((prev) => [...prev, message]);
      },
      onGameStarted: ({ roomId, gameState, serverNow }) => {
        if (roomId !== currentRoomIdRef.current) return;
        syncServerOffset(serverNow);
        setGameState(gameState);
        const preStartRemainingSec = Math.max(
          0,
          Math.ceil((gameState.startedAt - serverNow) / 1000),
        );
        if (preStartRemainingSec > 0) {
          setStatusText(`嚙請主嚙緩嚙罷嚙締嚙璀${preStartRemainingSec} 嚙踝蕭嚙罷嚙踝蕭`);
        }
        setIsGameView(true);
        void fetchCompletePlaylist(roomId).then(setGamePlaylist);
      },
      onGameUpdated: ({ roomId, gameState }) => {
        if (roomId !== currentRoomIdRef.current) return;
        setGameState(gameState);
        if (gameState?.status === "playing") {
          setIsGameView(true);
        }
      },
      onRoomUpdated: ({ room }) => {
        if (room.id !== currentRoomIdRef.current) return;
        setCurrentRoom((prev) =>
          prev ? mergeRoomSummaryIntoCurrentRoom(prev, room) : prev,
        );
      },
      onKicked: ({ roomId, reason, bannedUntil }) => {
        if (roomId !== currentRoomIdRef.current) return;
        const suffix =
          typeof bannedUntil === "number"
            ? `嚙璀嚙箠嚙踝蕭嚙編嚙稼嚙皚嚙褕塚蕭嚙瘦${new Date(bannedUntil).toLocaleTimeString()}`
            : "嚙璀嚙緩嚙衛久嚙確嚙踝蕭[嚙皚";
        setStatusText(`${reason}${suffix}`);
        setCurrentRoom(null);
        setParticipants([]);
        resetPresenceParticipants();
        setMessages([]);
        setSettlementHistory([]);
        setGameState(null);
        setGamePlaylist([]);
        setIsGameView(false);
        setPlaylistViewItems([]);
        setPlaylistHasMore(false);
        setPlaylistLoadingMore(false);
        setPlaylistSuggestions([]);
        persistRoomId(null);
        resetSessionClientId();
      },
      onPlaylistSuggestionsUpdated: ({ roomId, suggestions }) => {
        if (roomId !== currentRoomIdRef.current) return;
        setPlaylistSuggestions(suggestions);
      },
      onSettlementHistoryUpdated: ({ roomId, settlementHistory }) => {
        if (roomId !== currentRoomIdRef.current) return;
        setSettlementHistory(settlementHistory);
      },
    });

      socketRef.current = s;
    };

    void init();

    return () => {
      cancelled = true;
      socketSuspendedRef.current = true;
      disconnectRoomSocket(socketRef.current);
      socketRef.current = null;
    };
  }, [
    username,
    authLoading,
    shouldConnectSocket,
    clientId,
    authToken,
    refreshAuthToken,
    fetchCompletePlaylist,
    fetchPlaylistPage,
    fetchRooms,
    inviteRoomId,
    isInviteMode,
    lockSessionClientId,
    persistRoomId,
    resetSessionClientId,
    resetPresenceParticipants,
    seedPresenceParticipants,
    appendPresenceSystemMessage,
    syncServerOffset,
  ]);

  const handleCreateRoom = useCallback(async () => {
    const s = getSocket();
    if (!s || !username) {
      setStatusText("嚙罵嚙踝蕭嚙稽嚙緩嚙誕用者名嚙踝蕭");
      return;
    }
    if (createRoomInFlightRef.current) {
      setStatusText("嚙請塚蕭嚙諍立歹蕭嚙璀嚙請稍嚙踝蕭");
      return;
    }
    createRoomInFlightRef.current = true;
    setIsCreatingRoom(true);
    setStatusText("嚙諍立房塚蕭嚙踝蕭嚙皺");
    const releaseCreateRoomLock = () => {
      createRoomInFlightRef.current = false;
      setIsCreatingRoom(false);
      releaseCreateRoomLockRef.current = null;
    };
    releaseCreateRoomLockRef.current = releaseCreateRoomLock;
    if (authToken) {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) {
        setStatusText("嚙緯嚙皚嚙緩嚙盤嚙踝蕭嚙璀嚙請哨蕭嚙編嚙緯嚙皚");
        releaseCreateRoomLock();
        return;
      }
    }
    const trimmed = roomNameInput.trim();
    const trimmedPassword = roomPasswordInput.trim();
    const trimmedMaxPlayers = roomMaxPlayersInput.trim();
    if (!trimmed) {
      setStatusText("嚙請選蕭J嚙請塚蕭嚙磕嚙踝蕭");
      releaseCreateRoomLock();
      return;
    }
    if (playlistItems.length === 0 || !lastFetchedPlaylistId) {
      setStatusText("嚙請伐蕭嚙踝蕭嚙皚嚙踝蕭嚙踝蕭M嚙踝蕭");
      releaseCreateRoomLock();
      return;
    }
    if (trimmedMaxPlayers && !/^\d+$/.test(trimmedMaxPlayers)) {
      setStatusText("最大玩家數必須是數字");
      releaseCreateRoomLock();
      return;
    }
    const desiredMaxPlayers = trimmedMaxPlayers
      ? Number(trimmedMaxPlayers)
      : null;
    if (
      desiredMaxPlayers !== null &&
      (desiredMaxPlayers < PLAYER_MIN || desiredMaxPlayers > PLAYER_MAX)
    ) {
      setStatusText(`嚙瘡嚙複哨蕭嚙踝蕭搕嚙踝蕭嚙?${PLAYER_MIN} 嚙踝蕭 ${PLAYER_MAX} 嚙瘡`);
      releaseCreateRoomLock();
      return;
    }
    const desiredVisibility = roomVisibilityInput;
    const desiredPassword = trimmedPassword || null;
    const nextQuestionCount = clampQuestionCount(
      questionCount,
      getQuestionMax(playlistItems.length),
    );
    const nextPlayDurationSec = clampPlayDurationSec(playDurationSec);
    const nextStartOffsetSec = clampStartOffsetSec(startOffsetSec);
    const nextAllowCollectionClipTiming = Boolean(allowCollectionClipTiming);
    trackEvent("room_create_click", {
      source_mode: roomCreateSourceMode,
      room_visibility: desiredVisibility,
      player_limit: desiredMaxPlayers ?? PLAYER_MAX,
      question_count: nextQuestionCount,
      playlist_count: playlistItems.length,
    });
    const shouldSyncRoomSettings =
      desiredVisibility !== "public" ||
      desiredPassword !== null ||
      desiredMaxPlayers !== null ||
      nextPlayDurationSec !== DEFAULT_PLAY_DURATION_SEC ||
      nextStartOffsetSec !== DEFAULT_START_OFFSET_SEC ||
      !nextAllowCollectionClipTiming;

    const uploadId =
      crypto.randomUUID?.() ??
      `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
    const uploadItems = buildUploadPlaylistItems(playlistItems, {
      playDurationSec: nextPlayDurationSec,
      startOffsetSec: nextStartOffsetSec,
      allowCollectionClipTiming: nextAllowCollectionClipTiming,
    });
    const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
    const remaining = uploadItems.slice(CHUNK_SIZE);
    const isLast = remaining.length === 0;

    const payload = {
      roomName: trimmed,
      username,
      password: desiredPassword ?? undefined,
      visibility: desiredVisibility,
      maxPlayers: desiredMaxPlayers,
      gameSettings: {
        questionCount: nextQuestionCount,
        playDurationSec: nextPlayDurationSec,
        startOffsetSec: nextStartOffsetSec,
        allowCollectionClipTiming: nextAllowCollectionClipTiming,
      },
      playlist: {
        uploadId,
        id: lastFetchedPlaylistId,
        title: lastFetchedPlaylistTitle ?? undefined,
        totalCount: uploadItems.length,
        items: firstChunk,
        isLast,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    };
    const createStartedAt = Date.now();

    let createResolved = false;
    let createFinalized = false;
    const finalizeCreate = () => {
      if (createFinalized) return;
      createFinalized = true;
      releaseCreateRoomLock();
    };

    const applyJoinedStateForCreatedRoom = (state: RoomState) => {
      syncServerOffset(state.serverNow);
      setCurrentRoom(
        applyGameSettingsPatch(state.room, {
          questionCount: nextQuestionCount,
          playDurationSec: nextPlayDurationSec,
          startOffsetSec: nextStartOffsetSec,
          allowCollectionClipTiming: nextAllowCollectionClipTiming,
        }),
      );
      setParticipants(state.participants);
      seedPresenceParticipants(state.room.id, state.participants);
      setMessages(state.messages);
      setSettlementHistory(state.settlementHistory ?? []);
      persistRoomId(state.room.id);
      lockSessionClientId(clientId);
      setPlaylistProgress({
        received: state.room.playlist.receivedCount,
        total: state.room.playlist.totalCount,
        ready: state.room.playlist.ready,
      });
      setGameState(state.gameState ?? null);
      setIsGameView(false);
      setGamePlaylist([]);
      fetchPlaylistPage(state.room.id, 1, state.room.playlist.pageSize, {
        reset: true,
      });
    };

    const uploadRemainingPlaylistChunks = async (roomId: string) => {
      if (remaining.length === 0) return;
      for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
        const chunk = remaining.slice(i, i + CHUNK_SIZE);
        const isLastChunk = i + CHUNK_SIZE >= remaining.length;
        await new Promise<void>((resolve) => {
          let settled = false;
          const ackTimeout = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve();
          }, 4_000);
          s.emit(
            "uploadPlaylistChunk",
            {
              roomId,
              uploadId,
              items: chunk,
              isLast: isLastChunk,
            },
            () => {
              if (settled) return;
              settled = true;
              window.clearTimeout(ackTimeout);
              resolve();
            },
          );
        });
      }
    };

    const continueUploadRemainingPlaylistChunks = (roomId: string) => {
      if (remaining.length === 0) return;
      void uploadRemainingPlaylistChunks(roomId).catch((error) => {
        console.error(error);
        if (currentRoomIdRef.current === roomId) {
          setStatusText("嚙緩嚙箠嚙皚嚙請塚蕭嚙璀嚙踝蕭嚙諸餘嚙緬嚙踝蕭P嚙畿嚙踝蕭嚙踝蕭");
        }
      });
    };

    const tryRecoverCreatedRoomFromList = async () => {
      if (createResolved || !createRoomInFlightRef.current) return false;
      if (currentRoomIdRef.current) {
        createResolved = true;
        finalizeCreate();
        return true;
      }
      if (!API_URL) return false;
      try {
        const { ok, payload } = await apiFetchRooms(API_URL);
        if (!ok) return false;
        const nextRooms = ((payload?.rooms ?? payload) as RoomSummary[]) ?? [];
        if (Array.isArray(nextRooms)) {
          setRooms(nextRooms);
        }
        if (currentRoomIdRef.current) {
          createResolved = true;
          finalizeCreate();
          return true;
        }
        const createdWindowStart = createStartedAt - 30_000;
        const createdWindowEnd = Date.now() + 5_000;
        const candidate = nextRooms
          .filter((room) => {
            if ((room.name ?? "").trim() !== trimmed) return false;
            if (room.hasPassword !== Boolean(desiredPassword)) return false;
            if (
              typeof room.playlistCount === "number" &&
              room.playlistCount > 0 &&
              room.playlistCount !== uploadItems.length
            ) {
              return false;
            }
            if (
              typeof room.gameSettings?.questionCount === "number" &&
              room.gameSettings.questionCount !== nextQuestionCount
            ) {
              return false;
            }
            if (
              room.visibility &&
              (room.visibility === "public" || room.visibility === "private") &&
              room.visibility !== desiredVisibility
            ) {
              return false;
            }
            if (
              room.maxPlayers !== undefined &&
              (room.maxPlayers ?? null) !== desiredMaxPlayers
            ) {
              return false;
            }
            if (
              typeof room.createdAt === "number" &&
              (room.createdAt < createdWindowStart ||
                room.createdAt > createdWindowEnd)
            ) {
              return false;
            }
            return true;
          })
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        if (!candidate) return false;

        const tryJoinCandidate = async () =>
          await new Promise<boolean>((resolve) => {
            s.emit(
              "joinRoom",
              {
                roomId: candidate.id,
                username,
                password: desiredPassword ?? undefined,
              },
              async (joinAck: Ack<RoomState>) => {
                if (!joinAck?.ok) {
                  resolve(false);
                  return;
                }
                createResolved = true;
                const state = joinAck.data;
                applyJoinedStateForCreatedRoom(state);
                saveRoomPassword(state.room.id, desiredPassword);
                setHostRoomPassword(desiredPassword);
                setRoomNameInput("");
                setRoomMaxPlayersInput("");
                setStatusText(`嚙諍立回嚙踝蕭嚙踝蕭嚙踝蕭A嚙緩嚙諛動進嚙皚嚙瘦${state.room.name}`);
                finalizeCreate();
                continueUploadRemainingPlaylistChunks(state.room.id);
                resolve(true);
              },
            );
          });

        const retryIntervalsMs = [0, 350, 800];
        for (let joinAttempt = 0; joinAttempt < retryIntervalsMs.length; joinAttempt += 1) {
          if (createResolved || !createRoomInFlightRef.current) return false;
          if (joinAttempt === 0) {
            setStatusText("嚙諍立佗蕭嚙穀嚙璀嚙踝蕭嚙箭嚙箠嚙皚嚙請塚蕭嚙皺");
          } else {
            setStatusText(
              `嚙請塚蕭嚙緩嚙諍立，嚙踝蕭嚙箭嚙踝蕭嚙編嚙踝蕭嚙調進嚙皚嚙稽${joinAttempt + 1}/${retryIntervalsMs.length}嚙稷嚙皺`,
            );
            await new Promise<void>((resolve) =>
              window.setTimeout(resolve, retryIntervalsMs[joinAttempt]),
            );
            if (createResolved || !createRoomInFlightRef.current) return false;
          }

          const recovered = await tryJoinCandidate();
          if (recovered) return true;
        }

        return false;
      } catch (error) {
        console.error(error);
        return false;
      }
    };

    const submitCreateRoom = (attempt: 0 | 1) => {
      const timeoutMs = attempt === 0 ? 4_000 : 6_000;
      const ackTimeout = window.setTimeout(() => {
        if (createResolved || !createRoomInFlightRef.current) return;
        if (attempt === 0) {
          setStatusText("嚙諍立房塚蕭嚙稷嚙踝蕭嚙踝蕭嚙踝蕭A嚙踝蕭嚙箭嚙踝蕭嚙調自動進嚙皚嚙皺");
          void tryRecoverCreatedRoomFromList().then((recovered) => {
            if (recovered || createResolved || !createRoomInFlightRef.current) {
              return;
            }
            setStatusText("嚙諍立房塚蕭嚙瞌嚙褕，嚙踝蕭嚙箭嚙瞑嚙畿嚙皚嚙踝蕭嚙請塚蕭嚙皺");
            submitCreateRoom(1);
          });
          return;
        }
        setStatusText("嚙諍立房塚蕭嚙踝蕭嚙踝蕭嚙稷嚙踝蕭嚙璀嚙諒恬蕭A嚙踝蕭嚙調自動進嚙皚嚙皺");
        void tryRecoverCreatedRoomFromList().then((recovered) => {
          if (recovered || createResolved || !createRoomInFlightRef.current) {
            return;
          }
          setStatusText("嚙諍立房塚蕭嚙瞌嚙褕，嚙請稍嚙賦重嚙踝蕭");
          finalizeCreate();
        });
      }, timeoutMs);

      s.emit("createRoom", payload, async (ack: Ack<RoomState>) => {
        window.clearTimeout(ackTimeout);
        if (createResolved) return;
        if (!ack) {
          if (attempt === 0) {
            setStatusText("嚙諍立房塚蕭嚙稷嚙踝蕭嚙踩失，嚙踝蕭嚙箭嚙瞑嚙畿嚙皚嚙踝蕭嚙請塚蕭嚙皺");
            submitCreateRoom(1);
            return;
          }
          setStatusText("嚙諍立房塚蕭嚙踝蕭嚙諸：嚙踝蕭嚙璀嚙踝蕭嚙盤嚙稷嚙踝蕭");
          finalizeCreate();
          return;
        }
        if (!ack.ok) {
          setStatusText(formatAckError("嚙諍立房塚蕭嚙踝蕭嚙踝蕭", ack.error));
          finalizeCreate();
          return;
        }

        createResolved = true;
        const state = ack.data;
        applyJoinedStateForCreatedRoom(state);
        let accessSettingsWarning: string | null = null;
        if (shouldSyncRoomSettings) {
          await new Promise<void>((resolve) => {
            let settled = false;
            const settingsAckTimeout = window.setTimeout(() => {
              if (settled) return;
              settled = true;
              accessSettingsWarning = "嚙請塚蕭嚙緞嚙踝蕭嚙瞑嚙畿嚙瞌嚙踝蕭";
              resolve();
            }, 4_000);
            s.emit(
              "updateRoomSettings",
              {
                roomId: state.room.id,
                visibility: desiredVisibility,
                password: desiredPassword,
                questionCount: nextQuestionCount,
                playDurationSec: nextPlayDurationSec,
                startOffsetSec: nextStartOffsetSec,
                allowCollectionClipTiming: nextAllowCollectionClipTiming,
                maxPlayers: desiredMaxPlayers,
              },
              (settingsAck: Ack<{ room: RoomSummary }>) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(settingsAckTimeout);
                if (!settingsAck) {
                  accessSettingsWarning = "嚙請塚蕭嚙緞嚙踝蕭嚙瞑嚙畿嚙瞌嚙踝蕭";
                  resolve();
                  return;
                }
                if (!settingsAck.ok) {
                  accessSettingsWarning = formatAckError(
                    "嚙請塚蕭嚙緞嚙踝蕭嚙瞑嚙畿嚙踝蕭嚙踝蕭",
                    settingsAck.error,
                  );
                  resolve();
                  return;
                }
                setCurrentRoom((prev) =>
                  prev
                    ? applyGameSettingsPatch(
                        mergeRoomSummaryIntoCurrentRoom(
                          prev,
                          settingsAck.data.room,
                        ),
                        {
                          playDurationSec: nextPlayDurationSec,
                          startOffsetSec: nextStartOffsetSec,
                          allowCollectionClipTiming:
                            nextAllowCollectionClipTiming,
                        },
                      )
                    : prev,
                );
                resolve();
              },
            );
          });
        }
        saveRoomPassword(state.room.id, desiredPassword);
        setHostRoomPassword(desiredPassword);
        setRoomNameInput("");
        setRoomMaxPlayersInput("");
        trackEvent("room_create_success", {
          room_id: state.room.id,
          source_mode: roomCreateSourceMode,
          room_visibility: desiredVisibility,
          player_limit: desiredMaxPlayers ?? PLAYER_MAX,
          question_count: nextQuestionCount,
          playlist_count: uploadItems.length,
        });
        setStatusText(
          accessSettingsWarning
            ? `${accessSettingsWarning}嚙稽嚙請塚蕭嚙緩嚙諍立：${state.room.name}嚙稷`
            : `嚙緩嚙諍立房塚蕭嚙瘦${state.room.name}`,
        );
        finalizeCreate();
        continueUploadRemainingPlaylistChunks(state.room.id);
      });
    };

    submitCreateRoom(0);
  }, [
    allowCollectionClipTiming,
    authToken,
    clientId,
    fetchPlaylistPage,
    getSocket,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    lockSessionClientId,
    playlistItems,
    playDurationSec,
    questionCount,
    refreshAuthToken,
    roomCreateSourceMode,
    roomMaxPlayersInput,
    roomNameInput,
    roomVisibilityInput,
    roomPasswordInput,
    saveRoomPassword,
    startOffsetSec,
    syncServerOffset,
    username,
    persistRoomId,
    seedPresenceParticipants,
  ]);

  const handleJoinRoom = useCallback((roomId: string, hasPassword: boolean) => {
    const s = getSocket();
    if (!s || !username) {
      setStatusText("嚙罵嚙踝蕭嚙稽嚙緩嚙誕用者名嚙踝蕭");
      return;
    }

    s.emit(
      "joinRoom",
      {
        roomId,
        username,
        password: hasPassword ? joinPasswordInput.trim() || "" : undefined,
      },
      (ack: Ack<RoomState>) => {
        if (!ack) return;
        if (ack.ok) {
          const state = ack.data;
          syncServerOffset(state.serverNow);
          setCurrentRoom(applyGameSettingsPatch(state.room, {}));
          setParticipants(state.participants);
          seedPresenceParticipants(state.room.id, state.participants);
          setMessages(state.messages);
          setSettlementHistory(state.settlementHistory ?? []);
          setPlaylistProgress({
            received: state.room.playlist.receivedCount,
            total: state.room.playlist.totalCount,
            ready: state.room.playlist.ready,
          });
          setGameState(state.gameState ?? null);
          if (state.gameState?.status === "playing") {
            setIsGameView(true);
            void fetchCompletePlaylist(state.room.id).then(setGamePlaylist);
          } else {
            setIsGameView(false);
            setGamePlaylist([]);
          }
          fetchPlaylistPage(state.room.id, 1, state.room.playlist.pageSize, {
            reset: true,
          });
          lockSessionClientId(clientId);
          persistRoomId(state.room.id);
          setJoinPasswordInput("");
          trackEvent("room_join_success", {
            room_id: state.room.id,
            room_visibility: state.room.visibility,
            has_password: hasPassword,
            participant_count: state.participants.length,
          });
          setStatusText(`嚙緩嚙稼嚙皚嚙請塚蕭嚙瘦${state.room.name}`);
        } else {
          trackEvent("room_join_failed", {
            room_id: roomId,
            has_password: hasPassword,
            reason: ack.error ?? "unknown_error",
          });
          setStatusText(formatAckError("嚙稼嚙皚嚙請塚蕭嚙踝蕭嚙踝蕭", ack.error));
        }
      },
    );
  }, [
    clientId,
    fetchCompletePlaylist,
    fetchPlaylistPage,
    getSocket,
    joinPasswordInput,
    lockSessionClientId,
    persistRoomId,
    syncServerOffset,
    username,
    seedPresenceParticipants,
  ]);

  const handleLeaveRoom = useCallback((onLeft?: () => void) => {
    const s = getSocket();
    if (!s || !currentRoom) return;

    s.emit("leaveRoom", { roomId: currentRoom.id }, (ack: Ack<null>) => {
      if (!ack) return;
      if (ack.ok) {
        setCurrentRoom(null);
        setParticipants([]);
        resetPresenceParticipants();
        setMessages([]);
        setSettlementHistory([]);
        setGameState(null);
        setGamePlaylist([]);
        setIsGameView(false);
        setPlaylistViewItems([]);
        setPlaylistHasMore(false);
        setPlaylistLoadingMore(false);
        setPlaylistSuggestions([]);
        persistRoomId(null);
        resetSessionClientId();
        setStatusText("嚙緩嚙踝蕭嚙罷嚙請塚蕭");
        onLeft?.();
      } else {
        setStatusText(formatAckError("嚙踝蕭嚙罷嚙請塚蕭嚙踝蕭嚙踝蕭", ack.error));
      }
    });
  }, [currentRoom, getSocket, persistRoomId, resetPresenceParticipants, resetSessionClientId]);

  const handleSendMessage = useCallback(() => {
    const s = getSocket();
    if (!s || !currentRoom) {
      setStatusText("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
      return;
    }
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    s.emit("sendMessage", { content: trimmed }, (ack) => {
      if (!ack) return;
      if (!ack.ok) {
        setStatusText(formatAckError("嚙確嚙踝蕭嚙箴嚙碼嚙踝蕭嚙踝蕭", ack.error));
      }
    });

    setMessageInput("");
  }, [currentRoom, getSocket, messageInput]);

  const handleStartGame = useCallback(() => {
    const s = getSocket();
    if (!s || !currentRoom) {
      setStatusText("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
      return;
    }
    if (!playlistProgress.ready) {
      setStatusText("嚙踝蕭嚙踝蕭M嚙踝蕭|嚙踝蕭嚙褒備改蕭嚙踝蕭");
      return;
    }
    const guessDurationMs =
      clampPlayDurationSec(
        currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
      ) * 1000;

    s.emit(
      "startGame",
      { roomId: currentRoom.id, guessDurationMs },
      (ack: Ack<{ gameState: GameState; serverNow: number }>) => {
        if (!ack) return;
        if (ack.ok) {
          syncServerOffset(ack.data.serverNow);
          setGameState(ack.data.gameState);
          setIsGameView(true);
          void fetchCompletePlaylist(currentRoom.id).then(setGamePlaylist);
        } else {
          setStatusText(formatAckError("嚙罷嚙締嚙瘠嚙踝蕭嚙踝蕭嚙踝蕭", ack.error));
        }
      },
    );
  }, [
    currentRoom,
    fetchCompletePlaylist,
    getSocket,
    playlistProgress.ready,
    syncServerOffset,
  ]);

  useEffect(() => {
    if (gameState?.status === "ended") {
      // Keep game view mounted on ended so GameRoomPage can render settlement immediately,
      // even if settlementHistoryUpdated arrives slightly later.
      setStatusText("遊戲已結束，正在整理結算結果");
    }
  }, [gameState?.status]);

  const handleSubmitChoice = useCallback(
    async (choiceIndex: number): Promise<SubmitAnswerResult> => {
      if (!currentRoom || !gameState) {
        return { ok: false, error: "Room not ready" };
      }
      if (gameState.phase !== "guess") {
        return { ok: false, error: "Not in guess phase" };
      }
      const serverNow = Date.now() + serverOffsetRef.current;
      if (gameState.startedAt > serverNow) {
        return { ok: false, error: "Question has not started yet" };
      }
      const socket = getSocket();
      if (!socket) {
        return { ok: false, error: "Socket disconnected" };
      }
      const trackKey = `${gameState.startedAt}:${gameState.currentIndex}`;
      const previousPending = pendingAnswerSubmitRef.current;
      if (
        previousPending &&
        (previousPending.roomId !== currentRoom.id ||
          previousPending.trackKey !== trackKey)
      ) {
        pendingAnswerSubmitRef.current = null;
      }
      if (
        pendingAnswerSubmitRef.current?.roomId === currentRoom.id &&
        pendingAnswerSubmitRef.current.trackKey === trackKey &&
        pendingAnswerSubmitRef.current.choiceIndex === choiceIndex
      ) {
        return { ok: false, error: "Duplicate submit pending" };
      }

      const requestId = (answerSubmitRequestSeqRef.current += 1);
      pendingAnswerSubmitRef.current = {
        roomId: currentRoom.id,
        trackKey,
        choiceIndex,
        requestId,
      };

      return await new Promise<SubmitAnswerResult>((resolve) => {
        socket.emit(
          "submitAnswer",
          { roomId: currentRoom.id, choiceIndex },
          (ack) => {
            const pending = pendingAnswerSubmitRef.current;
            const isCurrentPending =
              pending?.roomId === currentRoom.id &&
              pending.trackKey === trackKey &&
              pending.choiceIndex === choiceIndex &&
              pending.requestId === requestId;

            if (isCurrentPending) {
              pendingAnswerSubmitRef.current = null;
            }

            if (!isCurrentPending) {
              resolve({ ok: false, error: "Stale submit response" });
              return;
            }

            if (!ack) {
              const error = "Submit acknowledgment missing";
              setStatusText("嚙踝蕭嚙賣答嚙論伐蕭嚙諸：嚙踝蕭嚙璀嚙踝蕭嚙踝蕭嚙稷嚙踝蕭");
              resolve({ ok: false, error });
              return;
            }

            if (!ack.ok) {
              if (ack.error !== "Not in guess phase") {
                setStatusText(formatAckError("嚙踝蕭嚙賣答嚙論伐蕭嚙踝蕭", ack.error));
              }
              resolve({ ok: false, error: ack.error || "Submit failed" });
              return;
            }

            resolve({ ok: true, data: ack.data });
          },
        );
      });
    },
    [currentRoom, gameState, getSocket],
  );

  useEffect(() => {
    if (!gameState || gameState.phase !== "guess" || !currentRoom) {
      pendingAnswerSubmitRef.current = null;
      return;
    }
    const trackKey = `${gameState.startedAt}:${gameState.currentIndex}`;
    const pending = pendingAnswerSubmitRef.current;
    if (!pending) return;
    if (pending.roomId === currentRoom.id && pending.trackKey === trackKey) return;
    pendingAnswerSubmitRef.current = null;
  }, [currentRoom, gameState]);

  useEffect(
    () => () => {
      pendingAnswerSubmitRef.current = null;
    },
    [],
  );

  const handleUpdateRoomSettings = useCallback(
    async (payload: {
      name?: string;
      visibility?: "public" | "private";
      password?: string | null;
      questionCount?: number;
      playDurationSec?: number;
      startOffsetSec?: number;
      allowCollectionClipTiming?: boolean;
      maxPlayers?: number | null;
    }) => {
      const s = getSocket();
      if (!s || !currentRoom) {
        setStatusText("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
        return false;
      }
      const normalizedPayload = {
        ...payload,
        ...(typeof payload.playDurationSec === "number"
          ? { playDurationSec: clampPlayDurationSec(payload.playDurationSec) }
          : {}),
        ...(typeof payload.startOffsetSec === "number"
          ? { startOffsetSec: clampStartOffsetSec(payload.startOffsetSec) }
          : {}),
        ...(typeof payload.allowCollectionClipTiming === "boolean"
          ? { allowCollectionClipTiming: payload.allowCollectionClipTiming }
          : {}),
      };
      return await new Promise<boolean>((resolve) => {
        s.emit(
          "updateRoomSettings",
          { roomId: currentRoom.id, ...normalizedPayload },
          (ack: Ack<{ room: RoomSummary }>) => {
            if (!ack) {
              resolve(false);
              return;
            }
            if (!ack.ok) {
              setStatusText(formatAckError("嚙踝蕭s嚙請塚蕭嚙稽嚙緩嚙踝蕭嚙踝蕭", ack.error));
              resolve(false);
              return;
            }
            const gameSettingsPatch = {
              ...(typeof normalizedPayload.playDurationSec === "number"
                ? { playDurationSec: normalizedPayload.playDurationSec }
                : {}),
              ...(typeof normalizedPayload.startOffsetSec === "number"
                ? { startOffsetSec: normalizedPayload.startOffsetSec }
                : {}),
              ...(typeof normalizedPayload.allowCollectionClipTiming === "boolean"
                ? {
                    allowCollectionClipTiming:
                      normalizedPayload.allowCollectionClipTiming,
                  }
                : {}),
            } satisfies Partial<RoomGameSettings>;
            const mergedRoom = mergeRoomSummaryIntoCurrentRoom(
              currentRoom,
              ack.data.room,
            );
            const patchedRoom = applyGameSettingsPatch(mergedRoom, gameSettingsPatch);
            setCurrentRoom((prev) =>
              prev
                ? applyGameSettingsPatch(
                    mergeRoomSummaryIntoCurrentRoom(prev, ack.data.room),
                    gameSettingsPatch,
                  )
                : prev,
            );
            if (normalizedPayload.password !== undefined) {
              const trimmed = normalizedPayload.password?.trim() ?? "";
              const nextPassword = trimmed ? trimmed : null;
              saveRoomPassword(currentRoom.id, nextPassword);
              setHostRoomPassword(nextPassword);
            }
            const shouldSyncTiming =
              typeof normalizedPayload.playDurationSec === "number" ||
              typeof normalizedPayload.startOffsetSec === "number" ||
              typeof normalizedPayload.allowCollectionClipTiming === "boolean";
            if (!shouldSyncTiming) {
              setStatusText("嚙請塚蕭嚙稽嚙緩嚙緩嚙踝蕭s");
              resolve(true);
              return;
            }
            void (async () => {
              const synced = await syncRoomPlaylistTiming(
                patchedRoom,
                gameSettingsPatch,
              );
              setStatusText(
                synced
                  ? "嚙請塚蕭嚙稽嚙緩嚙緩嚙踝蕭s嚙稽嚙緬嚙踝蕭嚙褕塚蕭嚙緩嚙瞑嚙畿嚙稷"
                  : "嚙請塚蕭嚙稽嚙緩嚙緩嚙踝蕭s嚙璀嚙踝蕭嚙緬嚙踝蕭嚙褕塚蕭嚙瞑嚙畿嚙踝蕭嚙踝蕭",
              );
              resolve(true);
            })();
          },
        );
      });
    },
    [
      currentRoom,
      getSocket,
      saveRoomPassword,
      setStatusText,
      syncRoomPlaylistTiming,
    ],
  );

  const handleKickPlayer = useCallback(
    (targetClientId: string, durationMs?: number | null) => {
      const s = getSocket();
      if (!s || !currentRoom) return;
      s.emit(
        "kickPlayer",
        { roomId: currentRoom.id, targetClientId, durationMs },
        (ack: Ack<null>) => {
          if (!ack) return;
          if (!ack.ok) {
            setStatusText(formatAckError("嚙踝蕭X嚙踝蕭嚙踝蕭", ack.error));
          }
        },
      );
    },
    [currentRoom, getSocket],
  );

  const handleTransferHost = useCallback(
    (targetClientId: string) => {
      const s = getSocket();
      if (!s || !currentRoom) return;
      s.emit(
        "transferHost",
        { roomId: currentRoom.id, targetClientId },
        (ack: Ack<{ hostClientId: string }>) => {
          if (!ack) return;
          if (!ack.ok) {
            setStatusText(formatAckError("嚙賞移嚙請主嚙踝蕭嚙踝蕭", ack.error));
          }
        },
      );
    },
    [currentRoom, getSocket],
  );

  const handleSuggestPlaylist = useCallback(
    async (
      type: "collection" | "playlist",
      value: string,
      options?: { useSnapshot?: boolean; sourceId?: string | null; title?: string | null },
    ) => {
      const s = getSocket();
      if (!s || !currentRoom) {
        const error = "嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭";
        setStatusText(error);
        return { ok: false, error };
      }
      if (gameState?.status === "playing") {
        const error = "嚙瘠嚙踝蕭嚙箠嚙賣中嚙盤嚙糊嚙踝蕭嚙踝蕭";
        setStatusText(error);
        return { ok: false, error };
      }
        let snapshot:
          | { items: PlaylistItem[]; title?: string | null; totalCount?: number; sourceId?: string | null }
          | undefined;
        let readToken: string | null = null;
        if (options?.useSnapshot) {
          try {
            if (type === "collection") {
              const selectedCollection = collections.find(
                (item) => item.id === value,
              );
              const isPrivateCollection =
                selectedCollection?.visibility === "private";
              if (isPrivateCollection) {
                if (!authUser?.id) {
                  throw new Error("嚙請伐蕭嚙緯嚙皚嚙踝蕭A嚙踝蕭嚙誼私嚙瘡嚙踝蕭嚙衛庫");
                }
                readToken = await createCollectionReadToken(value);
              }
              const items = await fetchCollectionSnapshot(value);
              snapshot = {
                items,
                title: options?.title ?? null,
                totalCount: items.length,
              sourceId: options?.sourceId ?? value,
            };
          } else {
            const playlistId = options?.sourceId;
            if (!playlistId) {
              throw new Error("嚙請選蕭J嚙踝蕭嚙衝迎蕭嚙踝蕭嚙踝蕭M嚙踝蕭 URL");
            }
            const result = authToken
              ? await fetchYoutubeSnapshot(playlistId)
              : await fetchPublicPlaylistSnapshot(value, playlistId);
            snapshot = {
              items: result.items,
              title: result.title ?? options?.title ?? null,
              totalCount: result.totalCount,
              sourceId: result.sourceId ?? playlistId,
            };
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "嚙踝蕭嚙誼伐蕭嚙踝蕭";
          setStatusText(message);
          return { ok: false, error: message };
        }
      }
      return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        s.emit(
          "suggestPlaylist",
            {
              roomId: currentRoom.id,
              type,
              value,
              title: snapshot?.title ?? options?.title ?? undefined,
              totalCount: snapshot?.totalCount,
              sourceId: snapshot?.sourceId ?? options?.sourceId ?? undefined,
              items: snapshot?.items,
              readToken: readToken ?? undefined,
            },
          (ack: Ack<null>) => {
            if (!ack) {
              resolve({ ok: false, error: "嚙踝蕭嚙誼伐蕭嚙諸，嚙請稍嚙踝蕭A嚙踝蕭" });
              return;
            }
            if (!ack.ok) {
              const message = formatAckError("嚙踝蕭嚙誼伐蕭嚙踝蕭", ack.error);
              setStatusText(message);
              resolve({ ok: false, error: message });
              return;
            }
            setStatusText("嚙緩嚙箴嚙碼嚙踝蕭嚙踝蕭");
            resolve({ ok: true });
          },
        );
      });
    },
      [
        authToken,
        authUser,
        collections,
        currentRoom,
        fetchPublicPlaylistSnapshot,
        fetchCollectionSnapshot,
        fetchYoutubeSnapshot,
        createCollectionReadToken,
        gameState,
        getSocket,
        setStatusText,
      ],
    );

  const handleFetchPlaylistByUrl = useCallback(
    async (url: string) => {
      handleResetPlaylist();
      setPlaylistUrl(url);
      await handleFetchPlaylist({ url, force: true, lock: false });
    },
    [handleFetchPlaylist, handleResetPlaylist, setPlaylistUrl],
  );

  const handleChangePlaylist = useCallback(async () => {
    const s = getSocket();
    if (!s || !currentRoom) return;
    if (gameState?.status === "playing") {
      setStatusText("嚙瘠嚙踝蕭嚙箠嚙賣中嚙盤嚙糊嚙踝蕭嚙踝蕭嚙緬嚙踝蕭");
      return;
    }
    if (playlistItems.length === 0 || !lastFetchedPlaylistId) {
      setStatusText("嚙請伐蕭嚙踝蕭嚙皚嚙踝蕭嚙踝蕭M嚙踝蕭");
      return;
    }

    const uploadId =
      crypto.randomUUID?.() ??
      `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
    const roomPlayDurationSec = clampPlayDurationSec(
      currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
    );
    const roomStartOffsetSec = clampStartOffsetSec(
      currentRoom.gameSettings?.startOffsetSec ?? DEFAULT_START_OFFSET_SEC,
    );
    const roomAllowCollectionClipTiming =
      currentRoom.gameSettings?.allowCollectionClipTiming ?? true;
    const uploadItems = buildUploadPlaylistItems(playlistItems, {
      playDurationSec: roomPlayDurationSec,
      startOffsetSec: roomStartOffsetSec,
      allowCollectionClipTiming: roomAllowCollectionClipTiming,
    });
    const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
    const remaining = uploadItems.slice(CHUNK_SIZE);
    const isLast = remaining.length === 0;

    s.emit(
      "changePlaylist",
      {
        roomId: currentRoom.id,
        playlist: {
          uploadId,
          id: lastFetchedPlaylistId,
          title: lastFetchedPlaylistTitle ?? undefined,
          totalCount: uploadItems.length,
          items: firstChunk,
          isLast,
          pageSize: DEFAULT_PAGE_SIZE,
        },
      },
      async (ack: Ack<{ receivedCount: number; totalCount: number; ready: boolean }>) => {
        if (!ack) return;
        if (!ack.ok) {
          setStatusText(formatAckError("嚙踝蕭嚙踝蕭嚙緬嚙賣失嚙踝蕭", ack.error));
          return;
        }
        if (remaining.length > 0) {
          for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
            const chunk = remaining.slice(i, i + CHUNK_SIZE);
            const isLastChunk = i + CHUNK_SIZE >= remaining.length;
            await new Promise<void>((resolve) => {
              s.emit(
                "uploadPlaylistChunk",
                {
                  roomId: currentRoom.id,
                  uploadId,
                  items: chunk,
                  isLast: isLastChunk,
                },
                () => resolve(),
              );
            });
          }
        }
        setStatusText("嚙緩嚙踝蕭嚙踝蕭嚙緬嚙踝蕭A嚙踝蕭嚙豎房主嚙罷嚙締嚙瘠嚙踝蕭");
      },
    );
  }, [
    currentRoom,
    gameState?.status,
    getSocket,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    playlistItems,
    setStatusText,
  ]);

  const handleApplySuggestionSnapshot = useCallback(
    async (suggestion: PlaylistSuggestion) => {
      const s = getSocket();
      if (!s || !currentRoom) return;
      if (gameState?.status === "playing") {
        setStatusText("嚙瘠嚙踝蕭嚙箠嚙賣中嚙盤嚙糊嚙踝蕭嚙踝蕭嚙緬嚙踝蕭");
        return;
      }
      const items = suggestion.items ?? [];
      if (items.length === 0) {
        setStatusText("嚙踝蕭嚙誼歹蕭嚙箴嚙磅嚙踝蕭嚙箠嚙諄歌嚙踝蕭");
        return;
      }
      const roomPlayDurationSec = clampPlayDurationSec(
        currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
      );
      const roomStartOffsetSec = clampStartOffsetSec(
        currentRoom.gameSettings?.startOffsetSec ?? DEFAULT_START_OFFSET_SEC,
      );
      const roomAllowCollectionClipTiming =
        currentRoom.gameSettings?.allowCollectionClipTiming ?? true;
      const uploadItems = buildUploadPlaylistItems(items, {
        playDurationSec: roomPlayDurationSec,
        startOffsetSec: roomStartOffsetSec,
        allowCollectionClipTiming: roomAllowCollectionClipTiming,
      });
      const uploadId =
        crypto.randomUUID?.() ??
        `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
      const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
      const remaining = uploadItems.slice(CHUNK_SIZE);
      const isLast = remaining.length === 0;
      const sourceId =
        suggestion.sourceId ??
        (suggestion.type === "collection" ? suggestion.value : undefined);
      const title = suggestion.title ?? undefined;

        s.emit(
          "changePlaylist",
          {
            roomId: currentRoom.id,
            playlist: {
              uploadId,
              id: sourceId ?? undefined,
              title,
              totalCount: uploadItems.length,
              items: firstChunk,
              isLast,
              pageSize: DEFAULT_PAGE_SIZE,
            },
          },
          async (ack: Ack<{ receivedCount: number; totalCount: number; ready: boolean }>) => {
            if (!ack) return;
            if (!ack.ok) {
              setStatusText(formatAckError("嚙踝蕭嚙踝蕭嚙緬嚙賣失嚙踝蕭", ack.error));
              return;
            }
            applyPlaylistSource(
              uploadItems,
              sourceId ?? uploadId,
              title ?? null,
            );
            if (remaining.length > 0) {
              for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
                const chunk = remaining.slice(i, i + CHUNK_SIZE);
                const isLastChunk = i + CHUNK_SIZE >= remaining.length;
              await new Promise<void>((resolve) => {
                s.emit(
                  "uploadPlaylistChunk",
                  {
                    roomId: currentRoom.id,
                    uploadId,
                    items: chunk,
                    isLast: isLastChunk,
                  },
                  () => resolve(),
                );
              });
            }
          }
          setStatusText("嚙緩嚙踝蕭嚙踝蕭嚙緬嚙踝蕭A嚙踝蕭嚙豎房主嚙罷嚙締嚙瘠嚙踝蕭");
        },
      );
    },
      [applyPlaylistSource, currentRoom, gameState?.status, getSocket, setStatusText],
    );

  const resetCreateState = useCallback(() => {
    setRoomNameInput(username ? `${username}'s room` : "嚙誹迎蕭嚙請塚蕭");
    setRoomVisibilityInput("public");
    setRoomCreateSourceMode("link");
    setRoomPasswordInput("");
    setRoomMaxPlayersInput("");
    setPlayDurationSec(DEFAULT_PLAY_DURATION_SEC);
    setStartOffsetSec(DEFAULT_START_OFFSET_SEC);
    setAllowCollectionClipTiming(true);
    resetPlaylistState();
    resetCollectionSelection();
    clearCollectionsError();
    setPlaylistViewItems([]);
    setPlaylistHasMore(false);
    setPlaylistLoadingMore(false);
    setPlaylistPageCursor(1);
    setPlaylistPageSize(DEFAULT_PAGE_SIZE);
    setPlaylistProgress({ received: 0, total: 0, ready: false });
  }, [clearCollectionsError, resetCollectionSelection, resetPlaylistState, username]);

  const loadMorePlaylist = useCallback(() => {
    if (!currentRoom) return;
    if (playlistLoadingMore || !playlistHasMore) return;
    fetchPlaylistPage(currentRoom.id, playlistPageCursor + 1, playlistPageSize);
  }, [
    currentRoom,
    playlistHasMore,
    playlistLoadingMore,
    playlistPageCursor,
    playlistPageSize,
    fetchPlaylistPage,
  ]);

  useEffect(() => {
    if (playlistItems.length === 0) return;
    if (questionCount > questionMaxLimit) {
      handleUpdateQuestionCount(questionMaxLimit);
    }
  }, [handleUpdateQuestionCount, playlistItems.length, questionCount, questionMaxLimit]);

  useEffect(() => {
    if (!currentRoom) return;
    if (playlistViewItems.length === 0) return;
    const needsBackfill =
      currentRoom.gameSettings?.playDurationSec === undefined ||
      currentRoom.gameSettings?.startOffsetSec === undefined ||
      currentRoom.gameSettings?.allowCollectionClipTiming === undefined;
    if (!needsBackfill) return;
    const firstRoomSettingsItem = playlistViewItems.find(
      (item) => item.timingSource === "room_settings",
    );
    if (!firstRoomSettingsItem) return;
    const inferredStartOffsetSec = clampStartOffsetSec(
      firstRoomSettingsItem.startSec ?? DEFAULT_START_OFFSET_SEC,
    );
    const inferredPlayDurationSec = clampPlayDurationSec(
      typeof firstRoomSettingsItem.endSec === "number" &&
        firstRoomSettingsItem.endSec > inferredStartOffsetSec
        ? firstRoomSettingsItem.endSec - inferredStartOffsetSec
        : currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
    );
    const inferredAllowCollectionClipTiming = playlistViewItems.some(
      (item) => item.timingSource === "track_clip",
    );
    setCurrentRoom((prev) => {
      if (!prev || prev.id !== currentRoom.id) return prev;
      const mergedSettings = mergeGameSettings(prev.gameSettings, {
        playDurationSec: inferredPlayDurationSec,
        startOffsetSec: inferredStartOffsetSec,
        allowCollectionClipTiming: inferredAllowCollectionClipTiming,
      });
      if (
        prev.gameSettings?.playDurationSec === mergedSettings.playDurationSec &&
        prev.gameSettings?.startOffsetSec === mergedSettings.startOffsetSec &&
        prev.gameSettings?.allowCollectionClipTiming ===
          mergedSettings.allowCollectionClipTiming
      ) {
        return prev;
      }
      return {
        ...prev,
        gameSettings: mergedSettings,
      };
    });
  }, [currentRoom, playlistViewItems]);

  useEffect(() => {
    if (!currentRoom?.id) {
      setHostRoomPassword(null);
      return;
    }
    if (currentRoom.hostClientId !== clientId) {
      setHostRoomPassword(null);
      return;
    }
    if (!currentRoom.hasPassword) {
      setHostRoomPassword(null);
      return;
    }
    setHostRoomPassword(readRoomPassword(currentRoom.id));
  }, [
    clientId,
    currentRoom?.hasPassword,
    currentRoom?.hostClientId,
    currentRoom?.id,
  ]);

  const setRouteRoomId = useCallback((value: string | null) => {
    currentRoomIdRef.current = value;
    setCurrentRoomId(value);
    if (value) {
      setRouteRoomResolved(false);
    }
  }, []);

  const value = useMemo<RoomContextValue>(
    () => ({
      authToken,
      authUser,
      authLoading,
      authExpired,
      refreshAuthToken,
      loginWithGoogle,
      logout,
      needsNicknameConfirm,
      nicknameDraft,
      setNicknameDraft,
      confirmNickname,
      isProfileEditorOpen,
      openProfileEditor,
      closeProfileEditor,
      youtubePlaylists,
      youtubePlaylistsLoading,
      youtubePlaylistsError,
      fetchYoutubePlaylists,
      importYoutubePlaylist,
      collections,
      collectionsLoading,
      collectionsError,
      collectionScope,
      publicCollectionsSort,
      setPublicCollectionsSort,
      collectionFavoriteUpdatingId,
      collectionsLastFetchedAt,
      selectedCollectionId,
      collectionItemsLoading,
      collectionItemsError,
      fetchCollections,
      toggleCollectionFavorite,
      selectCollection,
      loadCollectionItems,
      usernameInput,
      setUsernameInput,
      username,
      displayUsername,
      clientId,
      isConnected,
      rooms,
      roomNameInput,
      setRoomNameInput,
      roomVisibilityInput,
      setRoomVisibilityInput,
      roomCreateSourceMode,
      setRoomCreateSourceMode,
      roomPasswordInput,
      setRoomPasswordInput,
      roomMaxPlayersInput,
      setRoomMaxPlayersInput,
      joinPasswordInput,
      setJoinPasswordInput,
      currentRoom,
      currentRoomId,
      participants,
      messages,
      settlementHistory,
      messageInput,
      setMessageInput,
      statusText,
      setStatusText,
      sessionProgress,
      playlistUrl,
      setPlaylistUrl,
      playlistItems,
      playlistError,
      playlistLoading,
      playlistStage,
      playlistLocked,
      lastFetchedPlaylistId,
      lastFetchedPlaylistTitle,
      playlistViewItems,
      playlistHasMore,
      playlistLoadingMore,
      playlistPageCursor,
      playlistPageSize,
      playlistProgress,
      playlistSuggestions,
      questionCount,
      playDurationSec,
      startOffsetSec,
      allowCollectionClipTiming,
      questionMin,
      questionMax: QUESTION_MAX,
      questionStep,
      questionMaxLimit,
      inviteRoomId,
      inviteNotFound,
      isInviteMode,
      gameState,
      gamePlaylist,
      isGameView,
      setIsGameView,
      routeRoomResolved,
      hostRoomPassword,
      serverOffsetMs,
      setInviteRoomId,
      setRouteRoomId,
      handleSetUsername,
      isCreatingRoom,
      handleCreateRoom,
      handleJoinRoom,
      handleLeaveRoom,
      handleSendMessage,
      handleStartGame,
      handleSubmitChoice,
      handleUpdateRoomSettings,
      handleKickPlayer,
      handleTransferHost,
      handleSuggestPlaylist,
      handleApplySuggestionSnapshot,
      handleChangePlaylist,
      handleFetchPlaylistByUrl,
      handleFetchPlaylist,
      handleResetPlaylist,
      loadMorePlaylist,
      updateQuestionCount: handleUpdateQuestionCount,
      updatePlayDurationSec: handleUpdatePlayDurationSec,
      updateStartOffsetSec: handleUpdateStartOffsetSec,
      updateAllowCollectionClipTiming: handleUpdateAllowCollectionClipTiming,
      syncServerOffset,
      fetchRooms,
      fetchRoomById,
      fetchSettlementHistorySummaries,
      fetchSettlementReplay,
      resetCreateState,
    }),
    [
      authToken,
      authUser,
      authLoading,
      authExpired,
      refreshAuthToken,
      loginWithGoogle,
      logout,
      needsNicknameConfirm,
      nicknameDraft,
      setNicknameDraft,
      confirmNickname,
      isProfileEditorOpen,
      openProfileEditor,
      closeProfileEditor,
      youtubePlaylists,
      youtubePlaylistsLoading,
      youtubePlaylistsError,
      fetchYoutubePlaylists,
      importYoutubePlaylist,
      collections,
      collectionsLoading,
      collectionsError,
      collectionScope,
      publicCollectionsSort,
      setPublicCollectionsSort,
      collectionFavoriteUpdatingId,
      collectionsLastFetchedAt,
      selectedCollectionId,
      collectionItemsLoading,
      collectionItemsError,
      fetchCollections,
      toggleCollectionFavorite,
      selectCollection,
      loadCollectionItems,
      usernameInput,
      username,
      displayUsername,
      clientId,
      isConnected,
      rooms,
      roomNameInput,
      roomVisibilityInput,
      roomCreateSourceMode,
      roomPasswordInput,
      roomMaxPlayersInput,
      joinPasswordInput,
      currentRoom,
      currentRoomId,
      participants,
      messages,
      settlementHistory,
      messageInput,
      statusText,
      setStatusText,
      sessionProgress,
      playlistUrl,
      playlistItems,
      playlistError,
      playlistLoading,
      playlistStage,
      playlistLocked,
      lastFetchedPlaylistId,
      lastFetchedPlaylistTitle,
      playlistViewItems,
      playlistHasMore,
      playlistLoadingMore,
      playlistPageCursor,
      playlistPageSize,
      playlistProgress,
      playlistSuggestions,
      questionCount,
      playDurationSec,
      startOffsetSec,
      allowCollectionClipTiming,
      questionMin,
      questionStep,
      questionMaxLimit,
      inviteRoomId,
      inviteNotFound,
      isInviteMode,
      gameState,
      gamePlaylist,
      isGameView,
      routeRoomResolved,
      hostRoomPassword,
      serverOffsetMs,
      setInviteRoomId,
      setRouteRoomId,
      setPlaylistUrl,
      setUsernameInput,
      handleSetUsername,
      isCreatingRoom,
      handleCreateRoom,
      handleJoinRoom,
      handleLeaveRoom,
      handleSendMessage,
      handleStartGame,
      handleSubmitChoice,
      handleUpdateRoomSettings,
      handleKickPlayer,
      handleTransferHost,
      handleSuggestPlaylist,
      handleApplySuggestionSnapshot,
      handleChangePlaylist,
      handleFetchPlaylistByUrl,
      syncServerOffset,
      handleFetchPlaylist,
      handleResetPlaylist,
      loadMorePlaylist,
      handleUpdateQuestionCount,
      handleUpdatePlayDurationSec,
      handleUpdateStartOffsetSec,
      handleUpdateAllowCollectionClipTiming,
      fetchRooms,
      fetchRoomById,
      fetchSettlementHistorySummaries,
      fetchSettlementReplay,
      resetCreateState,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};


