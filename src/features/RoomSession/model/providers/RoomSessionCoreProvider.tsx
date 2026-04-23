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
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import type {
  ClientSocket,
  GameState,
  PlaylistItem,
  RoomParticipant,
  RoomState,
  RoomSummary,
  SessionProgressPayload,
} from "../types";
import { useAuth } from "../../../../shared/auth/AuthContext";
import { useSitePresenceWrite } from "../SitePresenceContext";
import { useRoomAuthInternal } from "./RoomAuthInternalContext";
import { useStatusRead, useStatusWrite } from "./RoomStatusContexts";
import {
  usePlaylistInputControl,
  usePlaylistLiveSetters,
  usePlaylistSocketBridge,
  usePlaylistSource,
  type PlaylistSourceContextValue,
} from "@features/PlaylistSource";
import {
  useCollectionAccess,
  useCollectionContent,
} from "@features/CollectionContent";
import type { RoomSessionInternalContextValue } from "./RoomSessionInternalContext";
import { RoomSessionContextProviderTree } from "./RoomSessionContextProviderTree";
import {
  type RoomClosedNotice,
  type RoomSessionContextValue,
} from "../RoomSessionContext";
import type { RoomGameContextValue } from "../RoomGameContext";
import {
  type RoomRealtimeContextValue,
  type RoomUiContextValue,
} from "../RoomContext";
import {
  API_URL,
  SOCKET_URL,
} from "../roomConstants";
import { getStoredRoomId } from "../roomStorage";
import { formatAckError } from "../roomProviderUtils";
import { useHostRoomPasswordCache } from "../useHostRoomPasswordCache";
import { useRoomClosureActions } from "../useRoomClosureActions";
import { useRoomProviderPresence } from "../useRoomProviderPresence";
import { useRoomProviderSocketLifecycle } from "../useRoomProviderSocketLifecycle";
import { useRoomProviderSettingsActions } from "../useRoomProviderSettingsActions";
import { useRoomProviderPlaylistActions } from "../useRoomProviderPlaylistActions";
import { useRoomChatActions } from "../useRoomChatActions";
import { useRoomDirectoryActions } from "../useRoomDirectoryActions";
import { useRoomDirectoryEffects } from "../useRoomDirectoryEffects";
import { useRoomGameActions } from "../useRoomGameActions";
import { useRoomGameSettingsState } from "../useRoomGameSettingsState";
import { useRoomHostActions } from "../useRoomHostActions";
import { useRoomMembershipActions } from "../useRoomMembershipActions";
import { useRoomSettlementReadActions } from "../useRoomSettlementReadActions";
import { useRoomChatInputState } from "../useRoomChatInputState";
import { useRoomSessionListsState } from "../useRoomSessionListsState";
import { useRoomSessionPersistence } from "../useRoomSessionPersistence";
import { useRoomSessionRecoveryState } from "../useRoomSessionRecoveryState";
import { useRoomServerClockSync } from "../useRoomServerClockSync";
import { useRoomSocketConnectionGate } from "../useRoomSocketConnectionGate";
import { useRoomGameLiveSync } from "../useRoomGameLiveSync";

export const RoomSessionCoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const {
    authToken,
    authUser,
    authLoading,
    clientId,
    loginWithGoogle,
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

  const { collections } = useCollectionContent();
  const { fetchCollectionSnapshot, createCollectionReadToken } =
    useCollectionAccess();

  // Base playlist context re-provided below with real socket handlers
  const basePlaylistCtx = usePlaylistSource();
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

  const { shouldConnectRoomSocket } = useRoomSocketConnectionGate({
    activeUsername,
    authLoading,
    authToken,
    clientId,
    pathname,
  });

  const socketSuspendedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomState["room"] | null>(
    null,
  );
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const {
    messages,
    setMessagesWithCap,
    settlementHistory,
    setSettlementHistoryWithCap,
    rankChangeByRoundKey,
    mergeRankChange,
  } = useRoomSessionListsState();
  const {
    chatCooldownLeft,
    effectiveChatCooldownLeft,
    isChatCooldownActive,
    messageInput,
    setChatCooldownLeft,
    setChatCooldownUntil,
    setMessageInput,
  } = useRoomChatInputState();
  const [joinPasswordInput, setJoinPasswordInput] = useState("");
  const [sessionProgress, setSessionProgress] =
    useState<SessionProgressPayload | null>(null);
  const [inviteRoomId, setInviteRoomId] = useState<string | null>(null);
  const [inviteNotFound, setInviteNotFound] = useState(false);
  const [closedRoomNotice, setClosedRoomNotice] =
    useState<RoomClosedNotice | null>(null);
  const isInviteMode = Boolean(inviteRoomId);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gamePlaylist, setGamePlaylist] = useState<PlaylistItem[]>([]);
  const [isGameView, setIsGameView] = useState(false);
  const [routeRoomResolved, setRouteRoomResolved] = useState<boolean>(() =>
    Boolean(getStoredRoomId()),
  );
  const [hostRoomPassword, setHostRoomPassword] = useState<string | null>(null);
  const {
    serverOffsetMs,
    serverOffsetRef,
    setServerOffsetMs,
    syncServerOffset,
  } = useRoomServerClockSync();
  const {
    currentRoomId,
    currentRoomIdRef,
    persistRoomId,
    persistRoomSessionToken,
    readRoomPassword,
    roomSessionTokenRef,
    saveRoomPassword,
    setRouteRoomId,
  } = useRoomSessionPersistence({
    setClosedRoomNotice,
    setKickedNotice,
    setRouteRoomResolved,
  });
  const {
    isRecoveringConnection,
    recoveryStatusText,
    setPostResumeGate,
  } = useRoomSessionRecoveryState({
    currentRoomId,
    currentRoomObjectId: currentRoom?.id,
    isConnected,
    sessionProgress,
  });
  const {
    allowCollectionClipTiming,
    playDurationSec,
    resetGameSettingsDefaults,
    revealDurationSec,
    startOffsetSec,
    updateAllowCollectionClipTiming,
    updatePlayDurationSec,
    updateRevealDurationSec,
    updateStartOffsetSec,
  } = useRoomGameSettingsState();

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
  const lastLatencyProbeRoomIdRef = useRef<string | null>(null);
  const roomSelfClientIdRef = useRef<string | null>(null);

  const getSocket = useCallback(() => socketRef.current, []);

  const { applyGameLiveUpdate, resetGameSyncVersion } = useRoomGameLiveSync({
    setGameState,
  });

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

  const { clearRoomAfterClosure, handleRoomGoneAck } = useRoomClosureActions({
    currentRoom,
    currentRoomIdRef,
    lastLatencyProbeRoomIdRef,
    roomSelfClientIdRef,
    persistRoomId,
    persistRoomSessionToken,
    resetGameSyncVersion,
    resetPresenceParticipants,
    resetSessionClientId,
    setClosedRoomNotice,
    setCurrentRoom,
    setGamePlaylist,
    setGameState,
    setIsGameView,
    setKickedNotice,
    setMessages: setMessagesWithCap,
    setParticipants,
    setPlaylistHasMore,
    setPlaylistLoadingMore,
    setPlaylistProgress,
    setPlaylistSuggestions,
    setPlaylistViewItems,
    setPostResumeGate,
    setRouteRoomResolved,
    setSettlementHistory: setSettlementHistoryWithCap,
    setStatusText,
  });

  const { fetchRooms, fetchRoomById, fetchSitePresence } =
    useRoomDirectoryActions({
    apiUrl: API_URL,
    setRooms,
    setStatusText,
    setSitePresence,
  });

  const { fetchSettlementHistorySummaries, fetchSettlementReplay } =
    useRoomSettlementReadActions({
      getSocket,
      currentRoom,
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
      mergeRankChange,
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

  useRoomDirectoryEffects({
    pathname,
    inviteRoomId,
    fetchRooms,
    fetchRoomById,
    fetchSitePresence,
    setInviteNotFound,
    setStatusText,
  });

  const { handleJoinRoom, handleLeaveRoom } = useRoomMembershipActions({
    getSocket,
    username: activeUsername,
    joinPasswordInput,
    setJoinPasswordInput,
    saveRoomPassword,
    currentRoom,
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
    persistRoomSessionToken,
    resetGameSyncVersion,
    handleRoomGoneAck,
    onLeaderboardAuthRequired: loginWithGoogle,
  });

  const {
    handleStartGame,
    handleSubmitChoice,
    handleRequestPlaybackExtensionVote,
    handleCastPlaybackExtensionVote,
  } = useRoomGameActions({
    getSocket,
    currentRoom,
    gameState,
    playlistProgressReady: basePlaylistCtx.playlistProgress.ready,
    setStatusText,
    syncServerOffset,
    fetchCompletePlaylist,
    setGamePlaylist,
    setIsGameView,
    pendingAnswerSubmitRef,
    answerSubmitRequestSeqRef,
    serverOffsetRef,
    applyGameLiveUpdate,
    handleRoomGoneAck,
  });

  const { handleSendMessage } = useRoomChatActions({
    getSocket,
    currentRoom,
    gameState,
    messageInput,
    setMessageInput,
    chatCooldownLeft,
    setChatCooldownUntil,
    setChatCooldownLeft,
    setStatusText,
    handleRoomGoneAck,
  });

  const { handleKickPlayer, handleTransferHost } = useRoomHostActions({
    getSocket,
    currentRoom,
    setStatusText,
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
    setPlaylistProgress,
    fetchPlaylistPage,
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

  useHostRoomPasswordCache({
    currentRoom,
    readRoomPassword,
    saveRoomPassword,
    setHostRoomPassword,
  });

  const fullPlaylistCtxValue = useMemo<PlaylistSourceContextValue>(
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
      rankChangeByRoundKey,
      fetchSettlementHistorySummaries,
      fetchSettlementReplay,
    }),
    [
      currentRoom,
      currentRoomId,
      participants,
      messages,
      settlementHistory,
      rankChangeByRoundKey,
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
      updatePlayDurationSec,
      updateRevealDurationSec,
      updateStartOffsetSec,
      updateAllowCollectionClipTiming,
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
      updateAllowCollectionClipTiming,
      updatePlayDurationSec,
      updateRevealDurationSec,
      updateStartOffsetSec,
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
      chatCooldownLeft: effectiveChatCooldownLeft,
      currentClientId: clientId,
    }),
    [
      clientId,
      messageInput,
      setMessageInput,
      handleSendMessage,
      isChatCooldownActive,
      effectiveChatCooldownLeft,
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
      currentRoomIdRef,
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
    <RoomSessionContextProviderTree
      values={{
        chatInput: chatInputCtxValue,
        game: roomGameCtxValue,
        internal: internalCtxValue,
        playlist: fullPlaylistCtxValue,
        realtime: roomRealtimeCtxValue,
        session: roomSessionCtxValue,
        ui: roomUiCtxValue,
      }}
    >
      {children}
    </RoomSessionContextProviderTree>
  );
};
