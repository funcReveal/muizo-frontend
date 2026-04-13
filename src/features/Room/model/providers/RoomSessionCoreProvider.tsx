/**
 * RoomSessionCoreProvider
 *
 * Central coordinator for room socket lifecycle, room state, game state,
 * chat state, and settlement state.
 *
 * It consumes the auth / status / playlist / collection sub-providers,
 * then re-provides the full room contexts used by the rest of the feature.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  GameLiveUpdatePayload,
  GameState,
  GameSyncVersion,
  PlaylistItem,
  RoomParticipant,
  RoomSettlementSnapshot,
  RoomState,
  RoomSummary,
  SessionProgressPayload,
} from "../types";
import { shouldApplyGameSyncVersion } from "../gameSyncVersion";
import { useAuth } from "../../../../shared/auth/AuthContext";
import { useSitePresenceWrite } from "../SitePresenceContext";
import { useRoomAuthInternal } from "./RoomAuthInternalContext";
import { useStatusRead, useStatusWrite } from "./RoomStatusContexts";
import {
  usePlaylistInputControl,
  usePlaylistLiveSetters,
  usePlaylistSocketBridge,
} from "./RoomPlaylistSubContexts";
import { useCollectionAccess } from "./RoomCollectionsAccessContext";
import {
  RoomSessionInternalContext,
  type RoomSessionInternalContextValue,
} from "./RoomSessionInternalContext";
import { useRoomCollections } from "../RoomCollectionsContext";
import {
  RoomPlaylistContext,
  useRoomPlaylist,
  type RoomPlaylistContextValue,
} from "../RoomPlaylistContext";
import {
  RoomSessionContext,
  type RoomSessionContextValue,
} from "../RoomSessionContext";
import { RoomGameContext, type RoomGameContextValue } from "../RoomGameContext";
import {
  RoomRealtimeContext,
  RoomUiContext,
  type RoomRealtimeContextValue,
  type RoomUiContextValue,
} from "../RoomContext";
import { ChatInputContext } from "../../../../shared/chat/ChatInputContext";
import {
  API_URL,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
  SOCKET_URL,
} from "../roomConstants";
import {
  clampPlayDurationSec,
  clampRevealDurationSec,
  clampStartOffsetSec,
} from "../roomUtils";
import {
  clearRoomPassword,
  clearStoredRoomId,
  getRoomPassword,
  getStoredRoomId,
  setRoomPassword,
  setStoredRoomId,
  getStoredRoomSessionToken,
  setStoredRoomSessionToken,
  clearStoredRoomSessionToken,
} from "../roomStorage";
import {
  capRoomMessages,
  capSettlementHistory,
  formatAckError,
  mergeGameSettings,
} from "../roomProviderUtils";
import { useRoomProviderPresence } from "../useRoomProviderPresence";
import { useRoomProviderSocketLifecycle } from "../useRoomProviderSocketLifecycle";
import { useRoomProviderRoomActions } from "../useRoomProviderRoomActions";
import { useRoomProviderReadActions } from "../useRoomProviderReadActions";
import { useRoomProviderSettingsActions } from "../useRoomProviderSettingsActions";
import { useRoomProviderPlaylistActions } from "../useRoomProviderPlaylistActions";

export const RoomSessionCoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const {
    authToken,
    authUser,
    authLoading,
    clientId,
    nicknameDraft,
    refreshAuthToken,
  } = useAuth();
  const { setSitePresence } = useSitePresenceWrite();

  const {
    confirmNicknameRef,
    activeUsername,
    lockSessionClientId,
    resetSessionClientId,
  } = useRoomAuthInternal();

  const { setStatusText, setKickedNotice } = useStatusWrite();
  const { statusText, kickedNotice } = useStatusRead();

  const {
    setPlaylistViewItems,
    setPlaylistHasMore,
    setPlaylistLoadingMore,
    setPlaylistProgress,
    setPlaylistSuggestions,
    playlistPageSize,
    fetchPlaylistPage,
    fetchCompletePlaylist,
  } = usePlaylistLiveSetters();

  const {
    applyPlaylistSource,
    setPlaylistUrl,
    fetchYoutubeSnapshot,
    fetchPublicPlaylistSnapshot,
  } = usePlaylistInputControl();

  const { getSocketRef, loadMorePlaylistRef } = usePlaylistSocketBridge();

  const { collections } = useRoomCollections();
  const { fetchCollectionSnapshot, createCollectionReadToken } =
    useCollectionAccess();

  // Base playlist context re-provided below with real socket handlers
  const basePlaylistCtx = useRoomPlaylist();
  const {
    playlistItems,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    questionCount,
    questionMaxLimit,
    handleFetchPlaylist,
    handleResetPlaylist,
    updateQuestionCount: updateQuestionCountBase,
    playlistViewItems,
    playlistHasMore,
    playlistLoadingMore,
    playlistPageCursor,
  } = basePlaylistCtx;

  const { pathname } = useLocation();
  const shouldConnectSocket =
    pathname.startsWith("/rooms") || pathname.startsWith("/invited");
  const socketSuspendedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
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
  const [chatCooldownUntil, setChatCooldownUntil] = useState<number | null>(
    null,
  );
  const [chatCooldownLeft, setChatCooldownLeft] = useState(0);
  const isChatCooldownActive = chatCooldownLeft > 0;
  const [joinPasswordInput, setJoinPasswordInput] = useState("");
  const [sessionProgress, setSessionProgress] =
    useState<SessionProgressPayload | null>(null);
  const [inviteRoomId, setInviteRoomId] = useState<string | null>(null);
  const [inviteNotFound, setInviteNotFound] = useState(false);
  const isInviteMode = Boolean(inviteRoomId);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [, setLastGameSyncVersion] =
    useState<GameSyncVersion | null>(null);
  const [gamePlaylist, setGamePlaylist] = useState<PlaylistItem[]>([]);
  const [isGameView, setIsGameView] = useState(false);
  const [routeRoomResolved, setRouteRoomResolved] = useState<boolean>(() =>
    Boolean(getStoredRoomId()),
  );
  const [hostRoomPassword, setHostRoomPassword] = useState<string | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const isRecoveringConnection = useMemo(() => {
    const hasTargetRoom = Boolean(currentRoomId || currentRoom?.id);
    if (!hasTargetRoom) return false;

    if (!isConnected) return true;

    return (
      sessionProgress?.flow === "resume" && sessionProgress.status === "active"
    );
  }, [currentRoom?.id, currentRoomId, isConnected, sessionProgress]);

  const recoveryStatusText = useMemo(() => {
    const hasTargetRoom = Boolean(currentRoomId || currentRoom?.id);
    if (!hasTargetRoom) return null;

    if (!isConnected) {
      return "正在恢復連線...";
    }

    if (
      sessionProgress?.flow === "resume" &&
      sessionProgress.status === "active"
    ) {
      switch (sessionProgress.stage) {
        case "server_validating":
          return "正在驗證連線...";
        case "room_lookup":
          return "正在尋找房間...";
        case "membership_restore":
          return "正在恢復房間成員狀態...";
        case "state_build":
          return "正在同步遊戲狀態...";
        case "ready_to_send":
          return "即將完成同步...";
        default:
          return "正在同步房間狀態...";
      }
    }

    return null;
  }, [currentRoom?.id, currentRoomId, isConnected, sessionProgress]);
  // Game settings (backfilled from room/playlist on join)
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

  const setMessagesWithCap = useCallback<
    Dispatch<SetStateAction<ChatMessage[]>>
  >((value) => {
    setMessages((previous) => {
      const next =
        typeof value === "function"
          ? (value as (prev: ChatMessage[]) => ChatMessage[])(previous)
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
                prev: RoomSettlementSnapshot[],
              ) => RoomSettlementSnapshot[]
            )(previous)
          : value;
      return capSettlementHistory(next);
    });
  }, []);

  const socketRef = useRef<ClientSocket | null>(null);
  const createRoomInFlightRef = useRef(false);
  const releaseCreateRoomLockRef = useRef<(() => void) | null>(null);
  const pendingAnswerSubmitRef = useRef<{
    roomId: string;
    trackKey: string;
    choiceIndex: number;
    requestId: number;
  } | null>(null);
  const answerSubmitRequestSeqRef = useRef(0);
  const currentRoomIdRef = useRef<string | null>(getStoredRoomId());
  const serverOffsetRef = useRef(0);
  const lastLatencyProbeRoomIdRef = useRef<string | null>(null);
  const lastGameSyncVersionRef = useRef<GameSyncVersion | null>(null);

  const getSocket = useCallback(() => socketRef.current, []);

  const syncServerOffset = useCallback((serverNow: number) => {
    const offset = serverNow - Date.now();
    serverOffsetRef.current = offset;
    setServerOffsetMs(offset);
  }, []);

  const resetGameSyncVersion = useCallback(() => {
    lastGameSyncVersionRef.current = null;
    setLastGameSyncVersion(null);
  }, []);

  const applyGameLiveUpdate = useCallback(
    (payload: GameLiveUpdatePayload) => {
      if (
        !shouldApplyGameSyncVersion(
          payload.syncVersion,
          lastGameSyncVersionRef.current,
        )
      ) {
        return false;
      }

      lastGameSyncVersionRef.current = payload.syncVersion;
      setLastGameSyncVersion(payload.syncVersion);
      setGameState(payload.gameState);
      return true;
    },
    [],
  );

  const initialStoredRoomSessionToken = getStoredRoomSessionToken();

  const roomSessionTokenRef = useRef<string | null>(
    initialStoredRoomSessionToken,
  );

  const persistRoomSessionToken = useCallback((token: string | null) => {
    roomSessionTokenRef.current = token;
    if (token) {
      setStoredRoomSessionToken(token);
    } else {
      clearStoredRoomSessionToken();
    }
  }, []);

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

  const setRouteRoomId = useCallback(
    (value: string | null) => {
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
    },
    [setKickedNotice],
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

  const resetGameSettingsDefaults = useCallback(() => {
    setPlayDurationSec(DEFAULT_PLAY_DURATION_SEC);
    setRevealDurationSec(DEFAULT_REVEAL_DURATION_SEC);
    setStartOffsetSec(DEFAULT_START_OFFSET_SEC);
    setAllowCollectionClipTiming(true);
  }, []);

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

  const { handleUpdateRoomSettings } = useRoomProviderSettingsActions({
    getSocket,
    currentRoom,
    fetchCompletePlaylist,
    saveRoomPassword,
    setHostRoomPassword,
    setCurrentRoom,
    setStatusText,
  });

  // Installed into confirmNicknameRef so AuthContext.confirmNickname delegates here
  const confirmNicknameWithSocket = useCallback(async () => {
    const nextUsername = nicknameDraft.trim();

    const confirmed = await confirmNicknameRef.current();
    if (!confirmed || !nextUsername) return false;

    setParticipants((previous) =>
      previous.map((p) =>
        p.clientId === clientId ? { ...p, username: nextUsername } : p,
      ),
    );

    const socket = getSocket();
    if (socket && currentRoom?.id) {
      socket.emit(
        "updateProfile",
        { roomId: currentRoom.id, username: nextUsername },
        (ack) => {
          if (!ack?.ok) {
            setStatusText(formatAckError("更新名稱失敗", ack?.error));
          }
        },
      );
    }

    return true;
  }, [
    clientId,
    confirmNicknameRef,
    currentRoom,
    getSocket,
    nicknameDraft,
    setStatusText,
  ]);

  useRoomProviderSocketLifecycle({
    username: activeUsername,
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
      roomSessionTokenRef,
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
      setSitePresence,
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
      saveRoomPassword,
      persistRoomSessionToken,
      resetGameSyncVersion,
      applyGameLiveUpdate,
    },
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
    username: activeUsername,
    joinPasswordInput,
    setJoinPasswordInput,
    saveRoomPassword,
    clientId,
    currentRoom,
    gameState,
    playlistProgressReady: basePlaylistCtx.playlistProgress.ready,
    messageInput,
    setMessageInput,
    chatCooldownLeft,
    setChatCooldownUntil,
    setChatCooldownLeft,
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
    persistRoomSessionToken,
    resetGameSyncVersion,
    applyGameLiveUpdate,
  });

  const {
    handleSuggestPlaylist,
    handleFetchPlaylistByUrl,
    handleChangePlaylist,
    handleApplyPlaylistUrlDirect,
    handleApplyCollectionDirect,
    handleApplyYoutubePlaylistDirect,
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

  const loadMorePlaylist = useCallback(() => {
    if (!currentRoom) return;
    if (playlistLoadingMore || !playlistHasMore) return;
    fetchPlaylistPage(currentRoom.id, playlistPageCursor + 1, playlistPageSize);
  }, [
    currentRoom,
    fetchPlaylistPage,
    playlistHasMore,
    playlistLoadingMore,
    playlistPageCursor,
    playlistPageSize,
  ]);

  useLayoutEffect(() => {
    getSocketRef.current = getSocket;
  }, [getSocket, getSocketRef]);

  useLayoutEffect(() => {
    loadMorePlaylistRef.current = loadMorePlaylist;
  }, [loadMorePlaylist, loadMorePlaylistRef]);

  useLayoutEffect(() => {
    confirmNicknameRef.current = confirmNicknameWithSocket;
  }, [confirmNicknameRef, confirmNicknameWithSocket]);

  useEffect(() => {
    if (!chatCooldownUntil) return;

    const updateCooldown = () => {
      const diff = chatCooldownUntil - Date.now();

      if (diff <= 0) {
        setChatCooldownLeft(0);
        setChatCooldownUntil(null);
        return;
      }

      setChatCooldownLeft(Math.ceil(diff / 1000));
    };

    updateCooldown();

    const timer = window.setInterval(updateCooldown, 250);

    return () => window.clearInterval(timer);
  }, [chatCooldownUntil]);

  useEffect(() => {
    if (!inviteRoomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInviteNotFound(false);
      return;
    }
    void fetchRoomById(inviteRoomId).then((room) => {
      setInviteNotFound(!room);
      if (!room) setStatusText("找不到邀請房間，請確認連結是否正確。");
    });
  }, [fetchRoomById, inviteRoomId, setStatusText]);

  useEffect(() => {
    if (gameState?.status === "ended") {
      setStatusText("遊戲已結束，請等待本局結算完成。");
    }
  }, [gameState?.status, setStatusText]);

  // questionCount auto-clamp to playlist size
  useEffect(() => {
    if (playlistItems.length === 0) return;
    if (questionCount > questionMaxLimit) {
      updateQuestionCountBase(questionMaxLimit);
    }
  }, [
    playlistItems.length,
    questionCount,
    questionMaxLimit,
    updateQuestionCountBase,
  ]);

  // Game settings backfill from playlist timing data
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentRoom((prev) => {
      if (!prev || prev.id !== currentRoom.id) return prev;
      const merged = mergeGameSettings(prev.gameSettings, {
        playDurationSec: inferredPlayDurationSec,
        revealDurationSec: inferredRevealDurationSec,
        startOffsetSec: inferredStartOffsetSec,
        allowCollectionClipTiming: inferredAllowCollectionClipTiming,
      });
      if (
        prev.gameSettings?.playDurationSec === merged.playDurationSec &&
        prev.gameSettings?.revealDurationSec === merged.revealDurationSec &&
        prev.gameSettings?.startOffsetSec === merged.startOffsetSec &&
        prev.gameSettings?.allowCollectionClipTiming ===
          merged.allowCollectionClipTiming
      ) {
        return prev;
      }
      return { ...prev, gameSettings: merged };
    });
  }, [currentRoom, gameState?.revealDurationMs, playlistViewItems]);

  // Host room password cache
  useEffect(() => {
    if (!currentRoom?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHostRoomPassword(null);
      return;
    }
    const roomUsesPassword = currentRoom.hasPin ?? currentRoom.hasPassword;
    if (!roomUsesPassword) {
      saveRoomPassword(currentRoom.id, null);
      setHostRoomPassword(null);
      return;
    }
    const serverPassword = (
      currentRoom.pin ??
      currentRoom.password ??
      ""
    ).trim();
    const nextPassword = serverPassword || readRoomPassword(currentRoom.id);
    if (serverPassword) {
      saveRoomPassword(currentRoom.id, serverPassword);
    }
    setHostRoomPassword(nextPassword);
  }, [
    currentRoom?.hasPassword,
    currentRoom?.hasPin,
    currentRoom?.id,
    currentRoom?.password,
    currentRoom?.pin,
    saveRoomPassword,
  ]);

  const fullPlaylistCtxValue = useMemo<RoomPlaylistContextValue>(
    () => ({
      ...basePlaylistCtx,
      loadMorePlaylist,
      handleFetchPlaylistByUrl,
      handleChangePlaylist,
      handleApplyPlaylistUrlDirect,
      handleApplyCollectionDirect,
      handleApplyYoutubePlaylistDirect,
      handleSuggestPlaylist,
      handleApplySuggestionSnapshot,
    }),
    [
      basePlaylistCtx,
      loadMorePlaylist,
      handleFetchPlaylistByUrl,
      handleChangePlaylist,
      handleApplyPlaylistUrlDirect,
      handleApplyCollectionDirect,
      handleApplyYoutubePlaylistDirect,
      handleSuggestPlaylist,
      handleApplySuggestionSnapshot,
    ],
  );

  const roomSessionCtxValue = useMemo<RoomSessionContextValue>(
    () => ({
      currentRoom,
      currentRoomId,
      participants,
      messages,
      settlementHistory,
      statusText,
      setStatusText,
      kickedNotice,
      setKickedNotice,
      sessionProgress,
      isConnected,
      isRecoveringConnection,
      recoveryStatusText,
      serverOffsetMs,
      syncServerOffset,
      hostRoomPassword,
      rooms,
      fetchRooms,
      fetchRoomById,
      inviteRoomId,
      inviteNotFound,
      isInviteMode,
      setInviteRoomId,
      routeRoomResolved,
      setRouteRoomId,
      handleLeaveRoom,
      handleKickPlayer,
      handleTransferHost,
      fetchSettlementHistorySummaries,
      fetchSettlementReplay,
    }),
    [
      currentRoom,
      currentRoomId,
      participants,
      messages,
      settlementHistory,
      statusText,
      setStatusText,
      kickedNotice,
      setKickedNotice,
      sessionProgress,
      isConnected,
      isRecoveringConnection,
      recoveryStatusText,
      serverOffsetMs,
      syncServerOffset,
      hostRoomPassword,
      rooms,
      fetchRooms,
      fetchRoomById,
      inviteRoomId,
      inviteNotFound,
      isInviteMode,
      setInviteRoomId,
      routeRoomResolved,
      setRouteRoomId,
      handleLeaveRoom,
      handleKickPlayer,
      handleTransferHost,
      fetchSettlementHistorySummaries,
      fetchSettlementReplay,
    ],
  );

  const roomGameCtxValue = useMemo<RoomGameContextValue>(
    () => ({
      gameState,
      gamePlaylist,
      isGameView,
      setIsGameView,
      playDurationSec,
      revealDurationSec,
      startOffsetSec,
      allowCollectionClipTiming,
      updatePlayDurationSec: handleUpdatePlayDurationSec,
      updateRevealDurationSec: handleUpdateRevealDurationSec,
      updateStartOffsetSec: handleUpdateStartOffsetSec,
      updateAllowCollectionClipTiming: handleUpdateAllowCollectionClipTiming,
      handleStartGame,
      handleSubmitChoice,
      handleRequestPlaybackExtensionVote,
      handleCastPlaybackExtensionVote,
      handleUpdateRoomSettings,
    }),
    [
      gameState,
      gamePlaylist,
      isGameView,
      playDurationSec,
      revealDurationSec,
      startOffsetSec,
      allowCollectionClipTiming,
      handleUpdatePlayDurationSec,
      handleUpdateRevealDurationSec,
      handleUpdateStartOffsetSec,
      handleUpdateAllowCollectionClipTiming,
      handleStartGame,
      handleSubmitChoice,
      handleRequestPlaybackExtensionVote,
      handleCastPlaybackExtensionVote,
      handleUpdateRoomSettings,
    ],
  );

  const roomUiCtxValue = useMemo<RoomUiContextValue>(
    () => ({ authUser, setStatusText }),
    [authUser, setStatusText],
  );

  const roomRealtimeCtxValue = useMemo<RoomRealtimeContextValue>(
    () => ({ currentRoom, messages, clientId, gameState }),
    [clientId, currentRoom, gameState, messages],
  );

  const chatInputCtxValue = useMemo(
    () => ({
      messageInput,
      setMessageInput,
      handleSendMessage,
      isChatCooldownActive,
      chatCooldownLeft,
      currentClientId: clientId,
    }),
    [
      clientId,
      messageInput,
      setMessageInput,
      handleSendMessage,
      isChatCooldownActive,
      chatCooldownLeft,
    ],
  );

  const internalCtxValue = useMemo<RoomSessionInternalContextValue>(
    () => ({
      getSocket,
      syncServerOffset,
      lockSessionClientId,
      persistRoomId,
      saveRoomPassword,
      seedPresenceParticipants,
      mergeCachedParticipantPing,
      fetchPlaylistPage,
      currentRoomIdRef,
      createRoomInFlightRef,
      releaseCreateRoomLockRef,
      setCurrentRoom,
      setParticipants,
      setMessages: setMessagesWithCap,
      setSettlementHistory: setSettlementHistoryWithCap,
      setPlaylistProgress,
      setGameState,
      resetGameSyncVersion,
      setIsGameView,
      setGamePlaylist,
      setRooms,
      setHostRoomPassword,
      setRouteRoomResolved,
      joinPasswordInput,
      setJoinPasswordInput,
      handleJoinRoom,
      resetGameSettingsDefaults,
      persistRoomSessionToken,
      resetGameSyncVersion,
    }),
    [
      getSocket,
      syncServerOffset,
      lockSessionClientId,
      persistRoomId,
      saveRoomPassword,
      seedPresenceParticipants,
      mergeCachedParticipantPing,
      fetchPlaylistPage,
      setMessagesWithCap,
      setSettlementHistoryWithCap,
      setPlaylistProgress,
      joinPasswordInput,
      setJoinPasswordInput,
      handleJoinRoom,
      resetGameSettingsDefaults,
      persistRoomSessionToken,
      resetGameSyncVersion,
    ],
  );

  return (
    <RoomPlaylistContext.Provider value={fullPlaylistCtxValue}>
      <RoomSessionContext.Provider value={roomSessionCtxValue}>
        <RoomGameContext.Provider value={roomGameCtxValue}>
          <RoomUiContext.Provider value={roomUiCtxValue}>
            <RoomRealtimeContext.Provider value={roomRealtimeCtxValue}>
              <ChatInputContext.Provider value={chatInputCtxValue}>
                <RoomSessionInternalContext.Provider value={internalCtxValue}>
                  {children}
                </RoomSessionInternalContext.Provider>
              </ChatInputContext.Provider>
            </RoomRealtimeContext.Provider>
          </RoomUiContext.Provider>
        </RoomGameContext.Provider>
      </RoomSessionContext.Provider>
    </RoomPlaylistContext.Provider>
  );
};
