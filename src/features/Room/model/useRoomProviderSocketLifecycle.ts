import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { ensureFreshAuthToken } from "../../../shared/auth/token";
import { connectRoomSocket, disconnectRoomSocket } from "./roomSocket";
import { translateRoomErrorDetail } from "./roomErrorText";
import {
  applyGameSettingsPatch,
  formatAckError,
  mergeRoomSummaryIntoCurrentRoom,
} from "./roomProviderUtils";
import type {
  Ack,
  ChatMessage,
  ClientSocket,
  GameLiveUpdatePayload,
  GameState,
  PlaylistItem,
  PlaylistSuggestion,
  RoomParticipant,
  RoomSettlementSnapshot,
  RoomState,
  RoomSummary,
  SessionProgressPayload,
  SitePresencePayload,
} from "./types";

const SYNC_DEBUG_STORAGE_KEY = "musicquiz:debug-sync";

type PlaylistProgressState = {
  received: number;
  total: number;
  ready: boolean;
};

interface SocketLifecycleRefs {
  socketRef: RefObject<ClientSocket | null>;
  socketSuspendedRef: RefObject<boolean>;
  currentRoomIdRef: RefObject<string | null>;
  serverOffsetRef: RefObject<number>;
  createRoomInFlightRef: RefObject<boolean>;
  releaseCreateRoomLockRef: RefObject<(() => void) | null>;
  lastLatencyProbeRoomIdRef: RefObject<string | null>;
  roomSelfClientIdRef: RefObject<string | null>;
  presenceParticipantNamesRef: RefObject<Map<string, string>>;
  presenceSeededRoomIdRef: RefObject<string | null>;
  roomSessionTokenRef: RefObject<string | null>;
}

/**
 * Minimal shape shared between RoomSessionCoreProvider and this hook.
 * Kept local to avoid a cross-file type import cycle.
 */
type PostResumeGate = {
  resumeStartedAt: number;
  resumePhase: "guess" | "reveal";
} | null;

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
  setSitePresence: (payload: SitePresencePayload | null) => void;
  setPostResumeGate: Dispatch<SetStateAction<PostResumeGate>>;
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
  saveRoomPassword: (roomId: string, password: string | null) => void;
  persistRoomSessionToken: (token: string | null) => void;
  resetGameSyncVersion: () => void;
  applyGameLiveUpdate: (payload: GameLiveUpdatePayload) => boolean;
}

interface UseRoomProviderSocketLifecycleParams {
  username: string | null;
  authLoading: boolean;
  shouldConnectRoomSocket: boolean;
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
  shouldConnectRoomSocket,
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
    roomSelfClientIdRef,
    presenceParticipantNamesRef,
    presenceSeededRoomIdRef,
    roomSessionTokenRef,
  } = refs;
  const isSyncDebugEnabled = useCallback(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem(SYNC_DEBUG_STORAGE_KEY) === "1" ||
      window.location.search.includes("debugSync=1")
    );
  }, []);
  const debugSync = useCallback(
    (label: string, payload?: Record<string, unknown>) => {
      if (!isSyncDebugEnabled()) return;
      const clientNow = Date.now();
      console.debug(`[mq-sync] ${label}`, {
        clientNow,
        serverOffsetMs: serverOffsetRef.current,
        ...payload,
      });
    },
    [isSyncDebugEnabled, serverOffsetRef],
  );
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
    setSitePresence,
    setPostResumeGate,
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
    saveRoomPassword,
    persistRoomSessionToken,
    resetGameSyncVersion,
    applyGameLiveUpdate,
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
  const clearActiveRoomState = useCallback(
    ({
      kickedNotice,
      statusText,
    }: {
      kickedNotice?: {
        roomId: string;
        reason: string;
        bannedUntil: number | null;
        kickedAt: number;
      } | null;
      statusText?: string | null;
    } = {}) => {
      if (kickedNotice !== undefined) {
        setKickedNotice(kickedNotice);
      }
      if (statusText !== undefined) {
        setStatusText(statusText);
      }
      setCurrentRoom(null);
      setParticipants([]);
      lastLatencyProbeRoomIdRef.current = null;
      resetPresenceParticipants();
      setMessages([]);
      setSettlementHistory([]);
      setGameState(null);
      resetGameSyncVersion();
      roomSelfClientIdRef.current = null;
      setGamePlaylist([]);
      setIsGameView(false);
      setRouteRoomResolved(true);
      setPlaylistViewItems([]);
      setPlaylistHasMore(false);
      setPlaylistLoadingMore(false);
      setPlaylistSuggestions([]);
      setPostResumeGate(null);
      persistRoomId(null);
      resetSessionClientId();
      persistRoomSessionToken(null);
    },
    [
      lastLatencyProbeRoomIdRef,
      persistRoomId,
      persistRoomSessionToken,
      resetGameSyncVersion,
      resetPresenceParticipants,
      resetSessionClientId,
      roomSelfClientIdRef,
      setCurrentRoom,
      setGamePlaylist,
      setGameState,
      setIsGameView,
      setKickedNotice,
      setMessages,
      setParticipants,
      setPlaylistHasMore,
      setPlaylistLoadingMore,
      setPlaylistSuggestions,
      setPlaylistViewItems,
      setPostResumeGate,
      setRouteRoomResolved,
      setSettlementHistory,
      setStatusText,
    ],
  );
  const applyIncomingRoomSummary = useCallback(
    (room: RoomSummary) => {
      if (room.visibility === "public") {
        upsertRoomSummary(room);
      } else {
        removeRoomSummary(room.id);
      }
      if (room.id !== currentRoomIdRef.current) return;
      setCurrentRoom((prev) => {
        if (!prev) return prev;
        const mergedRoom = mergeRoomSummaryIntoCurrentRoom(prev, room);
        const serverPassword = (room.pin ?? room.password ?? "").trim();
        if (serverPassword) {
          saveRoomPassword(room.id, serverPassword);
          return mergedRoom;
        }
        if (prev.hostClientId !== clientId) {
          saveRoomPassword(room.id, null);
          return {
            ...mergedRoom,
            pin: null,
            password: null,
          };
        }
        return mergedRoom;
      });
    },
    [
      clientId,
      currentRoomIdRef,
      removeRoomSummary,
      saveRoomPassword,
      setCurrentRoom,
      upsertRoomSummary,
    ],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!shouldConnectRoomSocket) {
      socketSuspendedRef.current = true;
      disconnectRoomSocket(socketRef.current);
      socketRef.current = null;
      setIsConnected(false);
      setSitePresence(null);
      setSessionProgress(null);
      setRouteRoomResolved(true);
      return;
    }
    let cancelled = false;
    const init = async () => {
      socketSuspendedRef.current = false;
      let token = authToken;
      if (token) {
        const freshToken = await ensureFreshAuthToken({
          token,
          refreshAuthToken,
        });
        if (!freshToken) {
          if (!cancelled) {
            setStatusText("登入狀態已失效，請重新登入。");
          }
          token = null;
        } else {
          token = freshToken;
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
          if (storedRoomId && username) {
            const storedRoomSessionToken = roomSessionTokenRef.current;
            if (!storedRoomSessionToken) {
              persistRoomId(null);
              persistRoomSessionToken(null);
              resetSessionClientId();
              setStatusText(
                "房間恢復失敗：本地缺少 roomSessionToken，請重新加入房間。",
              );
              setRouteRoomResolved(true);
            } else {
              socket.emit(
                "resumeSession",
                {
                  roomId: storedRoomId,
                  username,
                  roomSessionToken: storedRoomSessionToken,
                },
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
                    resetGameSyncVersion();
                    setGameState(state.gameState ?? null);
                    if (state.gameState?.status === "playing") {
                      setGamePlaylist([]);
                      setIsGameView(true);
                      void fetchCompletePlaylist(state.room.id).then(
                        setGamePlaylist,
                      );
                      // ── Post-resume recovery gate ─────────────────────────────
                      // Only hold the gate when the current phase has already
                      // expired (remainingMs ≤ 0). In that situation the client
                      // would paint a frozen "0 s" countdown, so we keep
                      // isRecoveringConnection=true until onGameUpdated arrives
                      // with a NEW startedAt, meaning the server has pushed the
                      // next phase and the UI will show a live countdown again.
                      //
                      // When there is still time left in the phase we restore
                      // immediately — no need to block the player.
                      const gs = state.gameState;
                      const phaseEndsAt =
                        gs.phase === "guess"
                          ? gs.startedAt +
                            gs.guessDurationMs +
                            (gs.playbackExtensionMs ?? 0)
                          : gs.revealEndsAt;
                      const remainingMs = phaseEndsAt - state.serverNow;
                      if (remainingMs <= 0) {
                        setPostResumeGate({
                          resumeStartedAt: gs.startedAt,
                          resumePhase: gs.phase,
                        });
                      } else {
                        setPostResumeGate(null);
                      }
                    } else {
                      // Game ended or not started — no gate needed.
                      setPostResumeGate(null);
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
                    lockSessionClientId(state.selfClientId);
                    roomSelfClientIdRef.current = state.selfClientId;
                    persistRoomId(state.room.id);
                    persistRoomSessionToken(state.roomSessionToken ?? null);
                    setStatusText(`已恢復房間：${state.room.name}`);
                    setRouteRoomResolved(true);
                  } else {
                    if (ack?.error) {
                      setStatusText(formatAckError("恢復房間失敗", ack.error));
                    }
                    persistRoomId(null);
                    persistRoomSessionToken(null);
                    resetSessionClientId();
                    setRouteRoomResolved(true);
                  }
                },
              );
            }
          } else {
            setRouteRoomResolved(true);
          }
        },
        onDisconnect: () => {
          setSitePresence(null);
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
          lastLatencyProbeRoomIdRef.current = null;
          setServerOffsetMs(0);
          serverOffsetRef.current = 0;

          // ─── Recoverable session: keep game state visible ────────────────
          // If we have a stored roomSessionToken and a room id, we can attempt
          // resumeSession on reconnect. In that case we keep the last-known
          // currentRoom / gameState / isGameView / participants / gamePlaylist
          // intact so GameRoomPage can render a "reconnecting" overlay instead
          // of going blank. All of these will be refreshed by the resumeSession
          // ack once the socket comes back up.
          const hasRecoverableSession = Boolean(
            roomSessionTokenRef.current && currentRoomIdRef.current,
          );
          if (hasRecoverableSession) {
            setStatusText("連線中斷，正在恢復房間狀態...");
            // routeRoomResolved stays true → game page keeps rendering.
            // Clear any leftover post-resume gate so the next resume starts fresh.
            setPostResumeGate(null);
            // Ephemeral non-game state is still cleared below.
            setPlaylistSuggestions([]);
            return;
          }

          // ─── Non-recoverable: full teardown ──────────────────────────────
          setStatusText("房間連線已中斷，正在等待重新連線。");
          setRouteRoomResolved(false);
          setCurrentRoom(null);
          setParticipants([]);
          resetPresenceParticipants();
          setMessages([]);
          setSettlementHistory([]);
          setGameState(null);
          resetGameSyncVersion();
          roomSelfClientIdRef.current = null;
          setGamePlaylist([]);
          setIsGameView(false);
          setPlaylistViewItems([]);
          setPlaylistHasMore(false);
          setPlaylistLoadingMore(false);
          setPlaylistSuggestions([]);
        },
        onRoomsUpdated: (updatedRooms: RoomSummary[]) => {
          startTransition(() => {
            setRooms(updatedRooms);
          });
          if (isInviteMode && inviteRoomId) {
            const found = updatedRooms.some(
              (r) => r.id === inviteRoomId || r.roomCode === inviteRoomId,
            );
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
          resetGameSyncVersion();
          setGameState(state.gameState ?? null);
          if (state.gameState?.status === "playing") {
            setGamePlaylist([]);
            setIsGameView(true);
            void fetchCompletePlaylist(state.room.id).then(setGamePlaylist);
          } else {
            setIsGameView(false);
            setGamePlaylist([]);
          }
          fetchPlaylistPage(state.room.id, 1, state.room.playlist.pageSize, {
            reset: true,
          });
          lockSessionClientId(state.selfClientId);
          roomSelfClientIdRef.current = state.selfClientId;
          persistRoomId(state.room.id);
          persistRoomSessionToken(state.roomSessionToken ?? null);
          setStatusText(null);
          setRouteRoomResolved(true);
        },
        onParticipantsUpdated: ({ roomId, participants, hostClientId }) => {
          startTransition(() => {
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
          });
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
                appendPresenceSystemMessage(
                  roomId,
                  participant.username,
                  "joined",
                );
              }
            }
            seedPresenceParticipants(roomId, participants);
          }
          const selfStillInRoom = participants.some(
            (participant) =>
              participant.clientId ===
              (roomSelfClientIdRef.current ?? clientId),
          );
          if (!selfStillInRoom) {
            clearActiveRoomState({
              kickedNotice: {
                roomId,
                reason: "你已被房主移出房間",
                bannedUntil: null,
                kickedAt: Date.now(),
              },
              statusText: "你已被房主移出房間",
            });
            return;
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
          startTransition(() => {
            setParticipants((prev) => {
              let changed = false;
              const next = prev.map((participant) => {
                if (!(participant.clientId in pings)) return participant;
                const nextPing = pings[participant.clientId];
                if (participant.pingMs === nextPing) return participant;
                changed = true;
                return { ...participant, pingMs: nextPing };
              });
              return changed ? next : prev;
            });
          });
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
          startTransition(() => {
            setMessages((prev) => [...prev, message]);
          });
        },
        onGameStarted: ({ roomId, gameState, serverNow, syncVersion }) => {
          if (roomId !== currentRoomIdRef.current) return;
          syncServerOffset(serverNow);
          debugSync("gameStarted", {
            roomId,
            serverNow,
            startedAt: gameState.startedAt,
            nextServerOffsetMs: serverNow - Date.now(),
            syncVersion,
          });
          if (
            !applyGameLiveUpdate({
              roomId,
              gameState,
              serverNow,
              syncVersion,
            })
          ) {
            return;
          }
          setGamePlaylist([]);
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
        onGameUpdated: ({ roomId, gameState, serverNow, syncVersion }) => {
          if (roomId !== currentRoomIdRef.current) return;
          syncServerOffset(serverNow);
          debugSync("gameUpdated", {
            roomId,
            serverNow,
            startedAt: gameState.startedAt,
            nextServerOffsetMs: serverNow - Date.now(),
            phase: gameState.phase,
            status: gameState.status,
            syncVersion,
          });
          if (
            !applyGameLiveUpdate({
              roomId,
              gameState,
              serverNow,
              syncVersion,
            })
          ) {
            return;
          }
          if (gameState?.status === "playing") {
            setIsGameView(true);
          }
          // ── Post-resume gate: clear when the server has pushed a new phase ─
          // Using the functional update form so we always compare against the
          // live gate value, not a stale closure snapshot.
          setPostResumeGate((gate) => {
            if (gate === null) return null;
            // Game ended → always safe to release.
            if (gameState.status === "ended") return null;
            // A different startedAt means the server has advanced to a new
            // phase (guess→reveal or reveal→guess). The UI will now be live.
            if (gameState.startedAt !== gate.resumeStartedAt) return null;
            // Same startedAt → still the stale phase snapshot, hold the gate.
            return gate;
          });
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
          resetGameSyncVersion();
          roomSelfClientIdRef.current = null;
          setGamePlaylist([]);
          setIsGameView(false);
          setPlaylistViewItems([]);
          setPlaylistHasMore(false);
          setPlaylistLoadingMore(false);
          setPlaylistSuggestions([]);
          setPostResumeGate(null);
          persistRoomId(null);
          persistRoomSessionToken(null);
          resetSessionClientId();
          setRouteRoomResolved(true);
        },
        onKicked: ({ roomId, reason, bannedUntil }) => {
          if (roomId !== currentRoomIdRef.current) return;
          const translatedReason = translateRoomErrorDetail(reason);
          clearActiveRoomState({
            kickedNotice: {
              roomId,
              reason: translatedReason,
              bannedUntil,
              kickedAt: Date.now(),
            },
            statusText:
              typeof bannedUntil === "number"
                ? `${translatedReason} 封鎖至 ${new Date(
                    bannedUntil,
                  ).toLocaleTimeString("zh-TW", {
                    hour12: false,
                  })}`
                : translatedReason,
          });
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
    shouldConnectRoomSocket,
    authToken,
    refreshAuthToken,
    clientId,
    socketUrl,
    fetchRooms,
    debugSync,
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
    persistRoomSessionToken,
    resetGameSyncVersion,
    applyGameLiveUpdate,
    setStatusText,
    setKickedNotice,
    setRouteRoomResolved,
    resetSessionClientId,
    setSessionProgress,
    createRoomInFlightRef,
    releaseCreateRoomLockRef,
    socketSuspendedRef,
    lastLatencyProbeRoomIdRef,
    roomSelfClientIdRef,
    resetPresenceParticipants,
    setPlaylistViewItems,
    setPlaylistHasMore,
    setPlaylistLoadingMore,
    setPlaylistSuggestions,
    setServerOffsetMs,
    serverOffsetRef,
    setRooms,
    setInviteNotFound,
    setSitePresence,
    appendPresenceSystemMessage,
    presenceParticipantNamesRef,
    presenceSeededRoomIdRef,
    roomSessionTokenRef,
    syncServerOffset,
    setIsConnected,
    socketRef,
    applyIncomingRoomSummary,
    clearActiveRoomState,
    removeRoomSummary,
    setPostResumeGate,
  ]);

  const requestLatencyProbe = useCallback(
    (roomId: string) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) return;
      const startedAt = performance.now();
      socket.emit(
        "latencyProbe",
        { roomId },
        (ack: Ack<{ serverNow: number }>) => {
          if (!ack?.ok) return;
          const measuredMs = Math.max(
            0,
            Math.round(performance.now() - startedAt),
          );
          syncServerOffset(ack.data.serverNow);
          startTransition(() => {
            setParticipants((prev) => {
              let changed = false;
              const next = prev.map((participant) => {
                if (participant.clientId !== clientId) return participant;
                if (participant.pingMs === measuredMs) return participant;
                changed = true;
                return { ...participant, pingMs: measuredMs };
              });
              return changed ? next : prev;
            });
          });
        },
      );
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
  }, [
    currentRoomId,
    isConnected,
    lastLatencyProbeRoomIdRef,
    requestLatencyProbe,
  ]);
};

export default useRoomProviderSocketLifecycle;
