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
  RoomSettlementSnapshot,
  RoomParticipant,
  RoomState,
  RoomSummary,
} from "./types";
import {
  RoomContext,
  type RoomContextValue,
  type RoomCreateSourceMode,
} from "./RoomContext";
import {
  API_URL,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
  QUESTION_MAX,
  USERNAME_MAX,
  SOCKET_URL,
} from "./roomConstants";
import {
  clampPlayDurationSec,
  clampRevealDurationSec,
  clampStartOffsetSec,
  normalizePlaylistItems,
} from "./roomUtils";
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
} from "./roomApi";
import { useRoomAuth } from "./useRoomAuth";
import { useRoomPlaylist } from "./useRoomPlaylist";
import { useRoomCollections } from "./useRoomCollections";
import {
  extractVideoIdFromUrl,
  mapCollectionItemsToPlaylist,
  mergeGameSettings,
  sanitizePossibleGarbledText,
} from "./roomProviderUtils";
import { useRoomProviderPresence } from "./useRoomProviderPresence";
import { useRoomPlaylistSnapshots } from "./useRoomPlaylistSnapshots";
import { useRoomProviderSocketLifecycle } from "./useRoomProviderSocketLifecycle";
import { useRoomProviderRoomActions } from "./useRoomProviderRoomActions";
import { useRoomProviderPlaylistActions } from "./useRoomProviderPlaylistActions";
import { useRoomProviderCreateRoomAction } from "./useRoomProviderCreateRoomAction";
import { useRoomProviderReadActions } from "./useRoomProviderReadActions";
import { useRoomProviderSettingsActions } from "./useRoomProviderSettingsActions";

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
    username ? `${username}'s room` : "新房間",
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
  const [revealDurationSec, setRevealDurationSec] = useState(
    DEFAULT_REVEAL_DURATION_SEC,
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
  const [statusText, setStatusTextState] = useState<string | null>(null);
  const setStatusText = useCallback((value: string | null) => {
    if (typeof value !== "string") {
      setStatusTextState(value);
      return;
    }
    setStatusTextState(sanitizePossibleGarbledText(value, "系統訊息"));
  }, []);

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
  const {
    presenceParticipantNamesRef,
    presenceSeededRoomIdRef,
    resetPresenceParticipants,
    seedPresenceParticipants,
    appendPresenceSystemMessage,
    mergeCachedParticipantPing,
  } = useRoomProviderPresence({
    setMessages,
    serverOffsetRef,
  });
  const lastLatencyProbeRoomIdRef = useRef<string | null>(null);

  const displayUsername = useMemo(() => username ?? "(訪客)", [username]);

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

  const { fetchYoutubeSnapshot, fetchPublicPlaylistSnapshot } =
    useRoomPlaylistSnapshots({
      apiUrl: API_URL,
      authToken,
      refreshAuthToken,
      youtubePlaylists,
      extractVideoIdFromUrl,
    });

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

  const handleUpdateRevealDurationSec = useCallback((value: number) => {
    const clamped = clampRevealDurationSec(value);
    setRevealDurationSec(clamped);
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
  }, [persistUsername, setStatusText, usernameInput]);


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

  const {
    fetchRooms,
    fetchRoomById,
    fetchSettlementHistorySummaries,
    fetchSettlementReplay,
  } = useRoomProviderReadActions({
    apiUrl: API_URL,
    getSocket,
    currentRoom,
    isInviteMode,
    inviteRoomId,
    setRooms,
    setInviteNotFound,
    setStatusText,
  });

  useEffect(() => {
    if (!inviteRoomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset invite status when invite route is cleared.
      setInviteNotFound(false);
      return;
    }
    void fetchRoomById(inviteRoomId).then((room) => {
      setInviteNotFound(!room);
      if (!room) {
        setStatusText("嚙踝蕭嚙豌房塚蕭嚙踝蕭嚙編嚙箭嚙諄已嚙踝蕭嚙踝蕭");
      }
    });
  }, [fetchRoomById, inviteRoomId, setStatusText]);

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

  const { handleUpdateRoomSettings } = useRoomProviderSettingsActions({
    getSocket,
    currentRoom,
    fetchCompletePlaylist,
    saveRoomPassword,
    setHostRoomPassword,
    setCurrentRoom,
    setStatusText,
  });

  useRoomProviderSocketLifecycle({
    username,
    authLoading,
    shouldConnectSocket,
    authToken,
    refreshAuthToken,
    clientId,
    socketUrl: SOCKET_URL,
    inviteRoomId,
    isInviteMode,
    currentRoomId: currentRoom?.id ?? null,
    isConnected,
    refs: {
      socketRef,
      socketSuspendedRef,
      currentRoomIdRef,
      serverOffsetRef,
      createRoomInFlightRef,
      releaseCreateRoomLockRef,
      lastLatencyProbeRoomIdRef,
      presenceParticipantNamesRef,
      presenceSeededRoomIdRef,
    },
    setters: {
      setIsConnected,
      setRouteRoomResolved,
      setStatusText,
      setSessionProgress,
      setCurrentRoom,
      setParticipants,
      setMessages,
      setSettlementHistory,
      setPlaylistSuggestions,
      setPlaylistProgress,
      setGameState,
      setIsGameView,
      setGamePlaylist,
      setPlaylistViewItems,
      setPlaylistHasMore,
      setPlaylistLoadingMore,
      setServerOffsetMs,
      setRooms,
      setInviteNotFound,
    },
    handlers: {
      fetchRooms,
      fetchCompletePlaylist,
      fetchPlaylistPage,
      lockSessionClientId,
      persistRoomId,
      resetSessionClientId,
      syncServerOffset,
      resetPresenceParticipants,
      seedPresenceParticipants,
      appendPresenceSystemMessage,
      mergeCachedParticipantPing,
    },
  });

  const { handleCreateRoom } = useRoomProviderCreateRoomAction({
    apiUrl: API_URL,
    getSocket,
    username,
    authToken,
    refreshAuthToken,
    setStatusText,
    createRoomInFlightRef,
    releaseCreateRoomLockRef,
    setIsCreatingRoom,
    roomNameInput,
    roomVisibilityInput,
    roomCreateSourceMode,
    roomPasswordInput,
    roomMaxPlayersInput,
    questionCount,
    playDurationSec,
    revealDurationSec,
    startOffsetSec,
    allowCollectionClipTiming,
    playlistItems,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    clientId,
    fetchPlaylistPage,
    lockSessionClientId,
    persistRoomId,
    seedPresenceParticipants,
    mergeCachedParticipantPing,
    syncServerOffset,
    saveRoomPassword,
    currentRoomIdRef,
    setCurrentRoom,
    setParticipants,
    setMessages,
    setSettlementHistory,
    setPlaylistProgress,
    setGameState,
    setIsGameView,
    setGamePlaylist,
    setRooms,
    setHostRoomPassword,
    setRoomNameInput,
    setRoomMaxPlayersInput,
  });

  const {
    handleJoinRoom,
    handleLeaveRoom,
    handleSendMessage,
    handleStartGame,
    handleSubmitChoice,
    handleKickPlayer,
    handleTransferHost,
  } = useRoomProviderRoomActions({
    getSocket,
    username,
    joinPasswordInput,
    setJoinPasswordInput,
    clientId,
    currentRoom,
    gameState,
    playlistProgressReady: playlistProgress.ready,
    messageInput,
    setMessageInput,
    setStatusText,
    syncServerOffset,
    mergeCachedParticipantPing,
    seedPresenceParticipants,
    fetchCompletePlaylist,
    fetchPlaylistPage,
    lockSessionClientId,
    persistRoomId,
    resetSessionClientId,
    resetPresenceParticipants,
    setCurrentRoom,
    setParticipants,
    setMessages,
    setSettlementHistory,
    setPlaylistProgress,
    setGameState,
    setIsGameView,
    setGamePlaylist,
    setPlaylistViewItems,
    setPlaylistHasMore,
    setPlaylistLoadingMore,
    setPlaylistSuggestions,
    pendingAnswerSubmitRef,
    answerSubmitRequestSeqRef,
    serverOffsetRef,
  });

  useEffect(() => {
    if (gameState?.status === "ended") {
      // Keep game view mounted on ended so GameRoomPage can render settlement immediately,
      // even if settlementHistoryUpdated arrives slightly later.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- status hint should be updated immediately on ended transition.
      setStatusText("遊戲已結束，正在整理結算結果");
    }
  }, [gameState?.status, setStatusText]);

  const {
    handleSuggestPlaylist,
    handleFetchPlaylistByUrl,
    handleChangePlaylist,
    handleApplySuggestionSnapshot,
  } = useRoomProviderPlaylistActions({
    getSocket,
    currentRoom,
    gameStateStatus: gameState?.status,
    setStatusText,
    collections,
    authUserId: authUser?.id ?? null,
    authToken,
    createCollectionReadToken,
    fetchCollectionSnapshot,
    fetchYoutubeSnapshot,
    fetchPublicPlaylistSnapshot,
    playlistItems,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    applyPlaylistSource,
    handleFetchPlaylist,
    handleResetPlaylist,
    setPlaylistUrl,
  });

  const resetCreateState = useCallback(() => {
    setRoomNameInput(username ? `${username}'s room` : "新房間");
    setRoomVisibilityInput("public");
    setRoomCreateSourceMode("link");
    setRoomPasswordInput("");
    setRoomMaxPlayersInput("");
    setPlayDurationSec(DEFAULT_PLAY_DURATION_SEC);
    setRevealDurationSec(DEFAULT_REVEAL_DURATION_SEC);
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
      currentRoom.gameSettings?.revealDurationSec === undefined ||
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
    const inferredRevealDurationSec = clampRevealDurationSec(
      currentRoom.gameSettings?.revealDurationSec ??
        (typeof gameState?.revealDurationMs === "number" && gameState.revealDurationMs > 0
          ? gameState.revealDurationMs / 1000
          : DEFAULT_REVEAL_DURATION_SEC),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- backfills missing server game settings from playlist timing only once data is available.
    setCurrentRoom((prev) => {
      if (!prev || prev.id !== currentRoom.id) return prev;
      const mergedSettings = mergeGameSettings(prev.gameSettings, {
        playDurationSec: inferredPlayDurationSec,
        revealDurationSec: inferredRevealDurationSec,
        startOffsetSec: inferredStartOffsetSec,
        allowCollectionClipTiming: inferredAllowCollectionClipTiming,
      });
      if (
        prev.gameSettings?.playDurationSec === mergedSettings.playDurationSec &&
        prev.gameSettings?.revealDurationSec === mergedSettings.revealDurationSec &&
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
  }, [currentRoom, gameState?.revealDurationMs, playlistViewItems]);

  useEffect(() => {
    const nextPassword =
      currentRoom?.id &&
      currentRoom.hostClientId === clientId &&
      currentRoom.hasPassword
        ? readRoomPassword(currentRoom.id)
        : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror local-storage password cache for host view.
    setHostRoomPassword(nextPassword);
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
      revealDurationSec,
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
      updateRevealDurationSec: handleUpdateRevealDurationSec,
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
      revealDurationSec,
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
      handleUpdateRevealDurationSec,
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


