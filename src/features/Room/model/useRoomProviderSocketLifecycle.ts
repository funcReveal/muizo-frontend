import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { ensureFreshAuthToken } from "../../../shared/auth/token";
import { connectRoomSocket, disconnectRoomSocket } from "./roomSocket";
import { applyGameSettingsPatch, formatAckError, mergeRoomSummaryIntoCurrentRoom } from "./roomProviderUtils";
import type {
  Ack,
  ChatMessage,
  ClientSocket,
  GameState,
  PlaylistItem,
  PlaylistSuggestion,
  RoomParticipant,
  RoomSettlementSnapshot,
  RoomState,
  RoomSummary,
  SessionProgressPayload,
} from "./types";

type PlaylistProgressState = {
  received: number;
  total: number;
  ready: boolean;
};

interface SocketLifecycleRefs {
  socketRef: MutableRefObject<ClientSocket | null>;
  socketSuspendedRef: MutableRefObject<boolean>;
  currentRoomIdRef: MutableRefObject<string | null>;
  serverOffsetRef: MutableRefObject<number>;
  createRoomInFlightRef: MutableRefObject<boolean>;
  releaseCreateRoomLockRef: MutableRefObject<(() => void) | null>;
  lastLatencyProbeRoomIdRef: MutableRefObject<string | null>;
  presenceParticipantNamesRef: MutableRefObject<Map<string, string>>;
  presenceSeededRoomIdRef: MutableRefObject<string | null>;
}

interface SocketLifecycleSetters {
  setIsConnected: Dispatch<SetStateAction<boolean>>;
  setRouteRoomResolved: Dispatch<SetStateAction<boolean>>;
  setStatusText: (value: string | null) => void;
  setKickedNotice: Dispatch<
    SetStateAction<{
      roomId: string;
      reason: string;
      bannedUntil: number | null;
      kickedAt: number;
    } | null>
  >;
  setSessionProgress: Dispatch<SetStateAction<SessionProgressPayload | null>>;
  setCurrentRoom: Dispatch<SetStateAction<RoomState["room"] | null>>;
  setParticipants: Dispatch<SetStateAction<RoomParticipant[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setSettlementHistory: Dispatch<SetStateAction<RoomSettlementSnapshot[]>>;
  setPlaylistSuggestions: Dispatch<SetStateAction<PlaylistSuggestion[]>>;
  setPlaylistProgress: Dispatch<SetStateAction<PlaylistProgressState>>;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  setIsGameView: Dispatch<SetStateAction<boolean>>;
  setGamePlaylist: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPlaylistViewItems: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPlaylistHasMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistLoadingMore: Dispatch<SetStateAction<boolean>>;
  setServerOffsetMs: Dispatch<SetStateAction<number>>;
  setRooms: Dispatch<SetStateAction<RoomSummary[]>>;
  setInviteNotFound: Dispatch<SetStateAction<boolean>>;
}

interface SocketLifecycleHandlers {
  fetchRooms: () => Promise<void>;
  fetchCompletePlaylist: (roomId: string) => Promise<PlaylistItem[]>;
  fetchPlaylistPage: (
    roomId: string,
    page: number,
    pageSize?: number,
    opts?: { reset?: boolean },
  ) => void;
  lockSessionClientId: (nextClientId: string) => void;
  persistRoomId: (id: string | null) => void;
  resetSessionClientId: () => void;
  syncServerOffset: (serverNow: number) => void;
  resetPresenceParticipants: () => void;
  seedPresenceParticipants: (
    roomId: string | null | undefined,
    nextParticipants: RoomParticipant[],
  ) => void;
  appendPresenceSystemMessage: (
    roomId: string,
    playerName: string,
    action: "joined" | "left",
  ) => void;
  mergeCachedParticipantPing: (
    nextParticipants: RoomParticipant[],
    previousParticipants: RoomParticipant[],
  ) => RoomParticipant[];
}

interface UseRoomProviderSocketLifecycleParams {
  username: string | null;
  authLoading: boolean;
  shouldConnectSocket: boolean;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  clientId: string;
  socketUrl: string;
  inviteRoomId: string | null;
  isInviteMode: boolean;
  currentRoomId: string | null;
  isConnected: boolean;
  refs: SocketLifecycleRefs;
  setters: SocketLifecycleSetters;
  handlers: SocketLifecycleHandlers;
}

export const useRoomProviderSocketLifecycle = ({
  username,
  authLoading,
  shouldConnectSocket,
  authToken,
  refreshAuthToken,
  clientId,
  socketUrl,
  inviteRoomId,
  isInviteMode,
  currentRoomId,
  isConnected,
  refs,
  setters,
  handlers,
}: UseRoomProviderSocketLifecycleParams) => {
  const shouldAnnounceReconnectRef = useRef(false);
  const {
    socketRef,
    socketSuspendedRef,
    currentRoomIdRef,
    serverOffsetRef,
    createRoomInFlightRef,
    releaseCreateRoomLockRef,
    lastLatencyProbeRoomIdRef,
    presenceParticipantNamesRef,
    presenceSeededRoomIdRef,
  } = refs;
  const {
    setIsConnected,
    setRouteRoomResolved,
    setStatusText,
    setKickedNotice,
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
  } = setters;
  const {
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
  } = handlers;
  const upsertRoomSummary = useCallback(
    (room: RoomSummary) => {
      setRooms((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === room.id);
        if (existingIndex === -1) {
          return [...prev, room];
        }
        const next = [...prev];
        next[existingIndex] = room;
        return next;
      });
    },
    [setRooms],
  );
  const removeRoomSummary = useCallback(
    (roomId: string) => {
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
    },
    [setRooms],
  );
  const applyIncomingRoomSummary = useCallback(
    (room: RoomSummary) => {
      if (room.visibility === "public") {
        upsertRoomSummary(room);
      } else {
        removeRoomSummary(room.id);
      }
      if (room.id !== currentRoomIdRef.current) return;
      setCurrentRoom((prev) =>
        prev ? mergeRoomSummaryIntoCurrentRoom(prev, room) : prev,
      );
    },
    [currentRoomIdRef, removeRoomSummary, setCurrentRoom, upsertRoomSummary],
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
            setStatusText("登入狀態已失效，請重新登入。");
          }
          return;
        }
      }
      if (cancelled) return;
      const authPayload = token ? { token, clientId } : { clientId };
      const s = connectRoomSocket(socketUrl, authPayload, {
        onConnect: (socket) => {
          setIsConnected(true);
          setSessionProgress(null);
          const storedRoomId = currentRoomIdRef.current;
          if (shouldAnnounceReconnectRef.current && !storedRoomId) {
            setStatusText("已重新連線到房間伺服器");
          }
          shouldAnnounceReconnectRef.current = false;
          void fetchRooms();
          if (storedRoomId) {
            socket.emit(
              "resumeSession",
              { roomId: storedRoomId, username },
              (ack: Ack<RoomState>) => {
                if (ack?.ok) {
                  const state = ack.data;
                  setKickedNotice(null);
                  syncServerOffset(state.serverNow);
                  setCurrentRoom(applyGameSettingsPatch(state.room, {}));
                  setParticipants((prev) =>
                    mergeCachedParticipantPing(state.participants, prev),
                  );
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
                  setStatusText(`已恢復房間：${state.room.name}`);
                  setRouteRoomResolved(true);
                } else {
                  if (ack?.error) {
                    setStatusText(formatAckError("恢復房間失敗", ack.error));
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
            setStatusText("建立房間失敗，連線已中斷，請稍後再試。");
          }
          if (socketSuspendedRef.current) {
            setIsConnected(false);
            setRouteRoomResolved(true);
            return;
          }
          setIsConnected(false);
          shouldAnnounceReconnectRef.current = true;
          setStatusText("房間連線已中斷，正在等待重新連線。");
          setRouteRoomResolved(false);
          setCurrentRoom(null);
          setParticipants([]);
          lastLatencyProbeRoomIdRef.current = null;
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
              setStatusText("找不到邀請房間，可能已關閉或邀請失效。");
            }
          }
        },
        onRoomCreated: ({ room }) => {
          applyIncomingRoomSummary(room);
        },
        onSessionProgress: (payload) => {
          setSessionProgress(payload);
        },
        onJoinedRoom: (state) => {
          setSessionProgress(null);
          setKickedNotice(null);
          releaseCreateRoomLockRef.current?.();
          syncServerOffset(state.serverNow);
          setCurrentRoom(applyGameSettingsPatch(state.room, {}));
          setParticipants((prev) =>
            mergeCachedParticipantPing(state.participants, prev),
          );
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
          setStatusText(`已加入房間：${state.room.name}`);
          setRouteRoomResolved(true);
        },
        onParticipantsUpdated: ({ roomId, participants, hostClientId }) => {
          setRooms((prev) =>
            prev.map((room) =>
              room.id === roomId
                ? {
                    ...room,
                    playerCount: participants.length,
                  }
                : room,
            ),
          );
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
          setParticipants((prev) =>
            mergeCachedParticipantPing(participants, prev),
          );
          setCurrentRoom((prev) =>
            prev
              ? {
                  ...prev,
                  hostClientId,
                  playerCount: participants.length,
                }
              : prev,
          );
        },
        onRoomPingUpdated: ({ roomId, pings }) => {
          if (roomId !== currentRoomIdRef.current) return;
          setParticipants((prev) =>
            prev.map((participant) => {
              if (!(participant.clientId in pings)) return participant;
              const nextPing = pings[participant.clientId];
              if (participant.pingMs === nextPing) return participant;
              return { ...participant, pingMs: nextPing };
            }),
          );
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
            setStatusText(`遊戲將在 ${preStartRemainingSec} 秒後開始`);
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
          applyIncomingRoomSummary(room);
        },
        onRoomRemoved: ({ roomId }) => {
          removeRoomSummary(roomId);
          if (roomId !== currentRoomIdRef.current) return;
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
          setRouteRoomResolved(true);
        },
        onKicked: ({ roomId, reason, bannedUntil }) => {
          if (roomId !== currentRoomIdRef.current) return;
          setKickedNotice({
            roomId,
            reason,
            bannedUntil,
            kickedAt: Date.now(),
          });
          setStatusText(
            typeof bannedUntil === "number"
              ? `${reason} 封鎖至 ${new Date(bannedUntil).toLocaleTimeString("zh-TW", {
                  hour12: false,
                })}`
              : reason,
          );
          setCurrentRoom(null);
          setParticipants([]);
          resetPresenceParticipants();
          setMessages([]);
          setSettlementHistory([]);
          setGameState(null);
          setGamePlaylist([]);
          setIsGameView(false);
          setRouteRoomResolved(true);
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
    authToken,
    refreshAuthToken,
    clientId,
    socketUrl,
    fetchRooms,
    inviteRoomId,
    isInviteMode,
    currentRoomIdRef,
    setCurrentRoom,
    setParticipants,
    mergeCachedParticipantPing,
    seedPresenceParticipants,
    setMessages,
    setSettlementHistory,
    setPlaylistProgress,
    setGameState,
    setIsGameView,
    fetchCompletePlaylist,
    setGamePlaylist,
    fetchPlaylistPage,
    lockSessionClientId,
    persistRoomId,
    setStatusText,
    setKickedNotice,
    setRouteRoomResolved,
    resetSessionClientId,
    setSessionProgress,
    createRoomInFlightRef,
    releaseCreateRoomLockRef,
    socketSuspendedRef,
    lastLatencyProbeRoomIdRef,
    resetPresenceParticipants,
    setPlaylistViewItems,
    setPlaylistHasMore,
    setPlaylistLoadingMore,
    setPlaylistSuggestions,
    setServerOffsetMs,
    serverOffsetRef,
    setRooms,
    setInviteNotFound,
    appendPresenceSystemMessage,
    presenceParticipantNamesRef,
    presenceSeededRoomIdRef,
    syncServerOffset,
    setIsConnected,
    socketRef,
  ]);

  const requestLatencyProbe = useCallback(
    (roomId: string) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) return;
      const startedAt = performance.now();
      socket.emit("latencyProbe", { roomId }, (ack: Ack<{ serverNow: number }>) => {
        if (!ack?.ok) return;
        const measuredMs = Math.max(0, Math.round(performance.now() - startedAt));
        syncServerOffset(ack.data.serverNow);
        setParticipants((prev) =>
          prev.map((participant) =>
            participant.clientId === clientId
              ? { ...participant, pingMs: measuredMs }
              : participant,
          ),
        );
      });
    },
    [clientId, setParticipants, socketRef, syncServerOffset],
  );

  useEffect(() => {
    const roomId = currentRoomId;
    if (!roomId || !isConnected) {
      lastLatencyProbeRoomIdRef.current = null;
      return;
    }
    if (lastLatencyProbeRoomIdRef.current === roomId) return;
    lastLatencyProbeRoomIdRef.current = roomId;
    requestLatencyProbe(roomId);
    const timer = window.setTimeout(() => {
      requestLatencyProbe(roomId);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [currentRoomId, isConnected, lastLatencyProbeRoomIdRef, requestLatencyProbe]);
};

export default useRoomProviderSocketLifecycle;
