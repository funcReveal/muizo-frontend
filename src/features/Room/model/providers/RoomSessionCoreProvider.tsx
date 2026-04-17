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
  Ack,
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
  type RoomClosedNotice,
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
  const { statusText, statusNotification, kickedNotice } = useStatusRead();

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

  const { getSocketRef, loadMorePlaylistRef, handleTerminalRoomAckRef } =
    usePlaylistSocketBridge();

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
    playlistHasMore,
    playlistLoadingMore,
    playlistPageCursor,
  } = basePlaylistCtx;

  const { pathname } = useLocation();

  const routeNeedsRoomRealtime =
    pathname.startsWith("/rooms") || pathname.startsWith("/invited");

  const storedRoomId = getStoredRoomId();
  const storedRoomSessionToken = getStoredRoomSessionToken();

  const canResumeRoomSession = Boolean(storedRoomId && storedRoomSessionToken);

  const hasRealtimeIdentity = Boolean(
    authToken || activeUsername || canResumeRoomSession,
  );

  const shouldConnectRoomSocket =
    routeNeedsRoomRealtime &&
    !authLoading &&
    Boolean(clientId) &&
    hasRealtimeIdentity;

  const socketSuspendedRef = useRef(false);

  /**
   * Post-resume recovery gate.
   *
   * Why resumeSession ack ≠ "ready to show game UI":
   * The ack gives us a snapshot of the server's last-known game state, but the
   * server's phase clock is still running. If we resumed mid-guess with 2 s
   * left, by the time the ack arrives those 2 s may already be gone — the
   * client would paint a frozen "0 s" countdown. We must keep isRecovering=true
   * until the server itself pushes an onGameUpdated with a NEW phase startedAt,
   * which proves the rhythm has advanced and the UI will be live again.
   */
  type PostResumeGate = {
    /** startedAt from the gameState inside the resumeSession ack */
    resumeStartedAt: number;
    /** phase at resume time — used for richer status text */
    resumePhase: "guess" | "reveal";
  };
  const [postResumeGate, setPostResumeGate] = useState<PostResumeGate | null>(
    null,
  );

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
  const [closedRoomNotice, setClosedRoomNotice] =
    useState<RoomClosedNotice | null>(null);
  const isInviteMode = Boolean(inviteRoomId);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [, setLastGameSyncVersion] = useState<GameSyncVersion | null>(null);
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

    // Socket not yet reconnected.
    if (!isConnected) return true;

    // resumeSession handshake still in-flight (server-side stages).
    if (
      sessionProgress?.flow === "resume" &&
      sessionProgress.status === "active"
    )
      return true;

    // resumeSession ack arrived but the server hasn't pushed a new phase yet.
    // We hold this gate until onGameUpdated confirms the rhythm has advanced.
    if (postResumeGate !== null) return true;

    return false;
  }, [
    currentRoom?.id,
    currentRoomId,
    isConnected,
    postResumeGate,
    sessionProgress,
  ]);

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

    // resumeSession ack received, waiting for server to push the next phase.
    if (postResumeGate !== null) {
      return postResumeGate.resumePhase === "guess"
        ? "等待伺服器推進遊戲節奏..."
        : "等待下一題開始...";
    }

    return null;
  }, [
    currentRoom?.id,
    currentRoomId,
    isConnected,
    postResumeGate,
    sessionProgress,
  ]);
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
  const roomSelfClientIdRef = useRef<string | null>(null);

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

  const applyGameLiveUpdate = useCallback((payload: GameLiveUpdatePayload) => {
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
  }, []);

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
      setClosedRoomNotice((previous) => {
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

  const clearRoomAfterClosure = useCallback(
    (
      roomId: string | null | undefined,
      reason = "房間已關閉",
      kind: RoomClosedNotice["kind"] = "closed",
    ) => {
      const targetRoomId =
        roomId ?? currentRoomIdRef.current ?? currentRoom?.id ?? "";
      setClosedRoomNotice({
        roomId: targetRoomId,
        kind,
        reason,
        closedAt: Date.now(),
      });
      setKickedNotice(null);
      setCurrentRoom(null);
      setParticipants([]);
      resetPresenceParticipants();
      setMessages([]);
      setSettlementHistory([]);
      setPlaylistProgress({ received: 0, total: 0, ready: false });
      setPlaylistSuggestions([]);
      setGameState(null);
      resetGameSyncVersion();
      setGamePlaylist([]);
      setIsGameView(false);
      setPlaylistViewItems([]);
      setPlaylistHasMore(false);
      setPlaylistLoadingMore(false);
      setPostResumeGate(null);
      roomSelfClientIdRef.current = null;
      lastLatencyProbeRoomIdRef.current = null;
      persistRoomId(null);
      persistRoomSessionToken(null);
      resetSessionClientId();
      setRouteRoomResolved(true);
      setStatusText(reason, { level: "warning", toastId: "room-closed" });
    },
    [
      currentRoom?.id,
      persistRoomId,
      persistRoomSessionToken,
      resetGameSyncVersion,
      resetPresenceParticipants,
      resetSessionClientId,
      setKickedNotice,
      setPlaylistHasMore,
      setPlaylistLoadingMore,
      setPlaylistProgress,
      setPlaylistSuggestions,
      setPlaylistViewItems,
      setStatusText,
    ],
  );

  const handleRoomGoneAck = useCallback(
    (roomId: string | null | undefined, ack: Ack<unknown> | null | undefined) => {
      if (!ack || ack.ok) return false;
      const errorCode = "code" in ack ? ack.code : undefined;
      const normalizedError = ack.error.trim().toLowerCase();
      const isRoomGone =
        errorCode === "ROOM_NOT_FOUND" ||
        normalizedError === "room not found";
      const isSessionLost =
        errorCode === "ROOM_SESSION_LOST" ||
        errorCode === "AUTH_CLIENT_MISSING" ||
        normalizedError === "not in room" ||
        normalizedError === "you are not in any room" ||
        normalizedError === "missing clientid";
      if (!isRoomGone && !isSessionLost) return false;
      clearRoomAfterClosure(
        roomId,
        isRoomGone
          ? "房間已關閉，請返回房間列表或建立新房間。"
          : "你已不在這個房間，請返回房間列表或重新加入。",
        isRoomGone ? "closed" : "left",
      );
      return true;
    },
    [clearRoomAfterClosure],
  );

  const {
    fetchRooms,
    fetchRoomById,
    fetchSitePresence,
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
    setSitePresence,
  });

  const { handleUpdateRoomSettings } = useRoomProviderSettingsActions({
    getSocket,
    currentRoom,
    fetchCompletePlaylist,
    saveRoomPassword,
    setHostRoomPassword,
    setCurrentRoom,
    setStatusText,
    handleRoomGoneAck,
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
            if (handleRoomGoneAck(currentRoom.id, ack)) return;
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
    handleRoomGoneAck,
    nicknameDraft,
    setStatusText,
  ]);

  useRoomProviderSocketLifecycle({
    username: activeUsername,
    authLoading,
    shouldConnectRoomSocket,
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
      roomSelfClientIdRef,
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
      setPostResumeGate,
      setClosedRoomNotice,
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
      clearRoomAfterClosure,
    },
  });

  useEffect(() => {
    const routeNeedsRoomBrowse =
      pathname.startsWith("/rooms") || pathname.startsWith("/invited");

    if (!routeNeedsRoomBrowse) return;

    void fetchRooms();

    const timer = window.setInterval(() => {
      void fetchRooms();
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [fetchRooms, pathname]);

  useEffect(() => {
    const routeNeedsRoomBrowse =
      pathname.startsWith("/rooms") || pathname.startsWith("/invited");

    if (!routeNeedsRoomBrowse) return;

    void fetchSitePresence();

    const timer = window.setInterval(() => {
      void fetchSitePresence();
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [fetchSitePresence, pathname]);

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
    handleRoomGoneAck,
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
    handleRoomGoneAck,
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
    handleTerminalRoomAckRef.current = handleRoomGoneAck;
  }, [handleRoomGoneAck, handleTerminalRoomAckRef]);

  useLayoutEffect(() => {
    confirmNicknameRef.current = confirmNicknameWithSocket;
  }, [confirmNicknameRef, confirmNicknameWithSocket]);

  // ── Chat cooldown countdown ─────────────────────────────────────────────────
  // Replaces a fixed 250 ms setInterval (4 renders/sec) with a second-boundary
  // setTimeout so we only re-render when the displayed integer actually changes.
  // The timer self-stops when the cooldown expires — no residual interval.
  useEffect(() => {
    if (!chatCooldownUntil) {
      setChatCooldownLeft(0);
      return;
    }

    let timerId: number | null = null;

    const tick = () => {
      const diff = chatCooldownUntil - Date.now();
      if (diff <= 0) {
        setChatCooldownLeft(0);
        setChatCooldownUntil(null);
        timerId = null;
        return; // ← stop; effect will re-run with chatCooldownUntil=null
      }
      const nextSec = Math.ceil(diff / 1000);
      setChatCooldownLeft(nextSec);
      // Schedule at the next second boundary (ms until the integer flips)
      const msToNextBoundary = diff - (nextSec - 1) * 1000;
      timerId = window.setTimeout(tick, Math.max(50, msToNextBoundary));
    };

    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [chatCooldownUntil]);

  useEffect(() => {
    if (!inviteRoomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInviteNotFound(false);
      return;
    }
    void fetchRoomById(inviteRoomId).then((result) => {
      if (result.ok) {
        setInviteNotFound(false);
        return;
      }
      if (result.reason === "not_found") {
        setInviteNotFound(true);
        setStatusText("找不到邀請房間，請確認連結是否正確。");
        return;
      }
      setInviteNotFound(false);
      setStatusText(result.message);
    });
  }, [fetchRoomById, inviteRoomId, setStatusText]);

  useEffect(() => {
    if (gameState?.status === "ended") {
      setStatusText("遊戲已結束，請等待本局結算完成。");
    }
  }, [gameState?.status, setStatusText]);

  // Safety timeout: if the post-resume gate is still active after 8 s, force-
  // clear it. The gate normally clears the moment onGameUpdated arrives with a
  // new startedAt. This timer is a last-resort guard against the server being
  // slow, or the phase advancing without emitting an update in time.
  useEffect(() => {
    if (postResumeGate === null) return;
    const timer = window.setTimeout(() => {
      setPostResumeGate(null);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [postResumeGate]);

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
      statusNotification,
      kickedNotice,
      setKickedNotice,
      closedRoomNotice,
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
      statusNotification,
      kickedNotice,
      setKickedNotice,
      closedRoomNotice,
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
      applyGameLiveUpdate,
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
      applyGameLiveUpdate,
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
