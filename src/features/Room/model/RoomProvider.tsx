import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useLocation } from "react-router-dom";

import type {
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
  type RoomKickedNotice,
  type RoomCreateSourceMode,
} from "./RoomContext";
import {
  API_URL,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_ROOM_MAX_PLAYERS,
  DEFAULT_START_OFFSET_SEC,
  QUESTION_MAX,
  USERNAME_MAX,
  SOCKET_URL,
} from "./roomConstants";
import {
  clampPlayDurationSec,
  clampRevealDurationSec,
  clampStartOffsetSec,
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
import { useRoomAuth } from "./useRoomAuth";
import { useRoomPlaylist } from "./useRoomPlaylist";
import { useRoomCollections } from "./useRoomCollections";
import {
  capRoomMessages,
  capSettlementHistory,
  extractVideoIdFromUrl,
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
import { useRoomProviderCollectionAccess } from "./useRoomProviderCollectionAccess";
import { useRoomProviderPlaylistPaging } from "./useRoomProviderPlaylistPaging";

export const RoomProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const getDefaultRoomName = useCallback(
    (nextUsername: string | null) =>
      nextUsername ? `${nextUsername}'s room` : "新房間",
    [],
  );
  const { pathname } = useLocation();
  const shouldConnectSocket =
    pathname.startsWith("/rooms") || pathname.startsWith("/invited");
  const socketSuspendedRef = useRef(false);

  const [usernameInput, setUsernameInputState] = useState(() =>
    (getStoredUsername() ?? "").slice(0, USERNAME_MAX),
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
    getDefaultRoomName(username),
  );
  const [roomVisibilityInput, setRoomVisibilityInput] = useState<
    "public" | "private"
  >("public");
  const [roomCreateSourceMode, setRoomCreateSourceMode] =
    useState<RoomCreateSourceMode>("link");
  const [roomPasswordInput, setRoomPasswordInput] = useState("");
  const [roomMaxPlayersInput, setRoomMaxPlayersInput] = useState(
    String(DEFAULT_ROOM_MAX_PLAYERS),
  );
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
  const setMessagesWithCap = useCallback<
    Dispatch<SetStateAction<ChatMessage[]>>
  >((value) => {
    setMessages((previous) => {
      const next =
        typeof value === "function"
          ? (value as (prevState: ChatMessage[]) => ChatMessage[])(previous)
          : value;
      return capRoomMessages(next);
    });
  }, []);
  const setSettlementHistoryWithCap = useCallback<
    Dispatch<SetStateAction<RoomSettlementSnapshot[]>>
  >((value) => {
    setSettlementHistory((previous) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prevState: RoomSettlementSnapshot[],
              ) => RoomSettlementSnapshot[]
            )(previous)
          : value;
      return capSettlementHistory(next);
    });
  }, []);
  const [messageInput, setMessageInput] = useState("");
  const [statusText, setStatusTextState] = useState<string | null>(null);
  const [kickedNotice, setKickedNotice] = useState<RoomKickedNotice | null>(
    null,
  );
  const setStatusText = useCallback((value: string | null) => {
    if (typeof value !== "string") {
      setStatusTextState(value);
      return;
    }
    setStatusTextState(sanitizePossibleGarbledText(value, "系統訊息"));
  }, []);

  const [sessionProgress, setSessionProgress] =
    useState<SessionProgressPayload | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
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
  const previousUsernameRef = useRef<string | null>(username);
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
    setMessages: setMessagesWithCap,
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

  useEffect(() => {
    const previousUsername = previousUsernameRef.current;
    const previousDefaultName = getDefaultRoomName(previousUsername);
    const nextDefaultName = getDefaultRoomName(username);

    setRoomNameInput((currentValue) => {
      const trimmed = currentValue.trim();
      if (!trimmed || trimmed === previousDefaultName || trimmed === "新房間") {
        return nextDefaultName;
      }
      return currentValue;
    });

    previousUsernameRef.current = username;
  }, [getDefaultRoomName, username]);

  const onResetCollectionRef = useRef<() => void>(() => {});
  const handlePlaylistCollectionReset = useCallback(() => {
    onResetCollectionRef.current();
  }, []);

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
      sessionClientIdLocked ? sessionClientId : (authClientId ?? localClientId),
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
    playlistPreviewMeta,
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
    onResetCollection: handlePlaylistCollectionReset,
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

  const handleUpdateAllowCollectionClipTiming = useCallback(
    (value: boolean) => {
      setAllowCollectionClipTiming(Boolean(value));
      return Boolean(value);
    },
    [],
  );

  const {
    collections,
    collectionsLoading,
    collectionsLoadingMore,
    collectionsHasMore,
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
    loadMoreCollections,
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
  }, [
    authToken,
    resetCollectionsState,
    resetPlaylistState,
    resetYoutubePlaylists,
  ]);

  const persistRoomId = useCallback((id: string | null) => {
    currentRoomIdRef.current = id;
    setCurrentRoomId(id);
    if (id) {
      setStoredRoomId(id);
    } else {
      clearStoredRoomId();
    }
  }, []);

  const saveRoomPassword = useCallback(
    (roomId: string, password: string | null) => {
      if (password) {
        setRoomPassword(roomId, password);
      } else {
        clearRoomPassword(roomId);
      }
    },
    [],
  );

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

  const { fetchCollectionSnapshot, createCollectionReadToken } =
    useRoomProviderCollectionAccess({
      apiUrl: API_URL,
      authToken,
      refreshAuthToken,
    });

  const handlePlaylistPagePayload = useCallback(
    (payload: { totalCount: number; ready: boolean }) => {
      setPlaylistProgress((prev) => ({
        ...prev,
        total: payload.totalCount,
        ready: payload.ready,
      }));
    },
    [],
  );

  const {
    playlistViewItems,
    playlistHasMore,
    playlistLoadingMore,
    playlistPageCursor,
    playlistPageSize,
    setPlaylistViewItems,
    setPlaylistHasMore,
    setPlaylistLoadingMore,
    resetPlaylistPagingState,
    fetchPlaylistPage,
    fetchCompletePlaylist,
  } = useRoomProviderPlaylistPaging({
    getSocket,
    onPagePayload: handlePlaylistPagePayload,
  });

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
      setKickedNotice,
      setSessionProgress,
      setCurrentRoom,
      setParticipants,
      setMessages: setMessagesWithCap,
      setSettlementHistory: setSettlementHistoryWithCap,
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
    setMessages: setMessagesWithCap,
    setSettlementHistory: setSettlementHistoryWithCap,
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
    handleRequestPlaybackExtensionVote,
    handleCastPlaybackExtensionVote,
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
    setKickedNotice,
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
    setMessages: setMessagesWithCap,
    setSettlementHistory: setSettlementHistoryWithCap,
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
    setRoomNameInput(getDefaultRoomName(username));
    setRoomVisibilityInput("public");
    setRoomCreateSourceMode("link");
    setRoomPasswordInput("");
    setRoomMaxPlayersInput(String(DEFAULT_ROOM_MAX_PLAYERS));
    setPlayDurationSec(DEFAULT_PLAY_DURATION_SEC);
    setRevealDurationSec(DEFAULT_REVEAL_DURATION_SEC);
    setStartOffsetSec(DEFAULT_START_OFFSET_SEC);
    setAllowCollectionClipTiming(true);
    resetPlaylistState();
    resetCollectionSelection();
    clearCollectionsError();
    resetPlaylistPagingState();
    setPlaylistProgress({ received: 0, total: 0, ready: false });
  }, [
    clearCollectionsError,
    getDefaultRoomName,
    resetCollectionSelection,
    resetPlaylistPagingState,
    resetPlaylistState,
    username,
  ]);

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
  }, [
    handleUpdateQuestionCount,
    playlistItems.length,
    questionCount,
    questionMaxLimit,
  ]);

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
        : (currentRoom.gameSettings?.playDurationSec ??
            DEFAULT_PLAY_DURATION_SEC),
    );
    const inferredAllowCollectionClipTiming = playlistViewItems.some(
      (item) => item.timingSource === "track_clip",
    );
    const inferredRevealDurationSec = clampRevealDurationSec(
      currentRoom.gameSettings?.revealDurationSec ??
        (typeof gameState?.revealDurationMs === "number" &&
        gameState.revealDurationMs > 0
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
        prev.gameSettings?.revealDurationSec ===
          mergedSettings.revealDurationSec &&
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
      (currentRoom.hasPin ?? currentRoom.hasPassword)
        ? readRoomPassword(currentRoom.id)
        : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror local-storage password cache for host view.
    setHostRoomPassword(nextPassword);
  }, [
    clientId,
    currentRoom?.hasPin,
    currentRoom?.hasPassword,
    currentRoom?.hostClientId,
    currentRoom?.id,
  ]);

  const setRouteRoomId = useCallback((value: string | null) => {
    currentRoomIdRef.current = value;
    setCurrentRoomId(value);
    setKickedNotice((previous) => {
      if (!previous) return previous;
      if (!value) return null;
      return previous.roomId === value ? previous : null;
    });
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
      collectionsLoadingMore,
      collectionsHasMore,
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
      loadMoreCollections,
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
      kickedNotice,
      setKickedNotice,
      sessionProgress,
      playlistUrl,
      setPlaylistUrl,
      playlistItems,
      playlistError,
      playlistLoading,
      playlistStage,
      playlistLocked,
      playlistPreviewMeta,
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
      handleRequestPlaybackExtensionVote,
      handleCastPlaybackExtensionVote,
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
      collectionsLoadingMore,
      collectionsHasMore,
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
      loadMoreCollections,
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
      kickedNotice,
      setKickedNotice,
      sessionProgress,
      playlistUrl,
      playlistItems,
      playlistError,
      playlistLoading,
      playlistStage,
      playlistLocked,
      playlistPreviewMeta,
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
      handleRequestPlaybackExtensionVote,
      handleCastPlaybackExtensionVote,
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
