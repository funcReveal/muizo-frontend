import { io } from "socket.io-client";

import type {
  ChatMessage,
  ClientSocket,
  GameLiveUpdatePayload,
  PlaylistState,
  RoomSettlementSnapshot,
  PlaylistSuggestion,
  RoomParticipant,
  RoomState,
  RoomSummary,
  SessionProgressPayload,
  SitePresencePayload,
} from "./types";

type RoomSocketHandlers = {
  onConnect?: (socket: ClientSocket) => void;
  onDisconnect?: () => void;
  onSitePresenceUpdated?: (payload: SitePresencePayload) => void;
  onRoomsUpdated?: (rooms: RoomSummary[]) => void;
  onRoomCreated?: (payload: { room: RoomSummary }) => void;
  onRoomRemoved?: (payload: { roomId: string }) => void;
  onJoinedRoom?: (state: RoomState) => void;
  onSessionProgress?: (payload: SessionProgressPayload) => void;
  onParticipantsUpdated?: (payload: {
    roomId: string;
    participants: RoomParticipant[];
    hostClientId: string;
  }) => void;
  onRoomPingUpdated?: (payload: {
    roomId: string;
    pings: Record<string, number | null>;
    updatedAt: number;
  }) => void;
  onUserLeft?: (payload: { roomId: string; clientId: string }) => void;
  onPlaylistProgress?: (payload: {
    roomId: string;
    receivedCount: number;
    totalCount: number;
    ready: boolean;
  }) => void;
  onPlaylistUpdated?: (payload: {
    roomId: string;
    playlist: PlaylistState;
  }) => void;
  onMessageAdded?: (payload: { roomId: string; message: ChatMessage }) => void;
  onGameStarted?: (payload: GameLiveUpdatePayload) => void;
  onGameUpdated?: (payload: GameLiveUpdatePayload) => void;
  onRoomUpdated?: (payload: { room: RoomSummary }) => void;
  onKicked?: (payload: {
    roomId: string;
    reason: string;
    bannedUntil: number | null;
  }) => void;
  onPlaylistSuggestionsUpdated?: (payload: {
    roomId: string;
    suggestions: PlaylistSuggestion[];
  }) => void;
  onSettlementHistoryUpdated?: (payload: {
    roomId: string;
    settlementHistory: RoomSettlementSnapshot[];
  }) => void;
};

type RoomSocketAuth = {
  clientId: string;
  token?: string;
  username?: string;
};

type RoomSocketWithCleanup = ClientSocket & {
  __wakeReconnectCleanup__?: () => void;
};

const MOBILE_WAKE_RECONNECT_THROTTLE_MS = 1_500;

const attachWakeReconnect = (socket: ClientSocket) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  let lastAttemptAt = 0;

  const wakeReconnect = () => {
    if (document.visibilityState === "hidden") return;
    if (socket.connected) return;

    const now = Date.now();
    if (now - lastAttemptAt < MOBILE_WAKE_RECONNECT_THROTTLE_MS) {
      return;
    }
    lastAttemptAt = now;

    try {
      socket.connect();
    } catch (error) {
      console.error("Failed to wake room socket reconnect", error);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    wakeReconnect();
  };

  window.addEventListener("pageshow", wakeReconnect);
  window.addEventListener("online", wakeReconnect);
  window.addEventListener("focus", wakeReconnect);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("pageshow", wakeReconnect);
    window.removeEventListener("online", wakeReconnect);
    window.removeEventListener("focus", wakeReconnect);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};

export const connectRoomSocket = (
  socketUrl: string,
  auth: RoomSocketAuth,
  handlers: RoomSocketHandlers,
) => {
  const socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2500,
    timeout: 10000,
    auth,
  });

  (socket as RoomSocketWithCleanup).__wakeReconnectCleanup__ =
    attachWakeReconnect(socket);

  socket.on("connect", () => handlers.onConnect?.(socket));
  socket.on("disconnect", () => handlers.onDisconnect?.());
  socket.on("sitePresenceUpdated", (payload) =>
    handlers.onSitePresenceUpdated?.(payload),
  );
  socket.on("roomsUpdated", (rooms) => handlers.onRoomsUpdated?.(rooms));
  socket.on("roomCreated", (payload) => handlers.onRoomCreated?.(payload));
  socket.on("roomRemoved", (payload) => handlers.onRoomRemoved?.(payload));
  socket.on("joinedRoom", (state) => handlers.onJoinedRoom?.(state));
  socket.on("sessionProgress", (payload) =>
    handlers.onSessionProgress?.(payload),
  );
  socket.on("participantsUpdated", (payload) =>
    handlers.onParticipantsUpdated?.(payload),
  );
  socket.on("roomPingUpdated", (payload) =>
    handlers.onRoomPingUpdated?.(payload),
  );
  socket.on("userLeft", (payload) => handlers.onUserLeft?.(payload));
  socket.on("playlistProgress", (payload) =>
    handlers.onPlaylistProgress?.(payload),
  );
  socket.on("playlistUpdated", (payload) =>
    handlers.onPlaylistUpdated?.(payload),
  );
  socket.on("messageAdded", (payload) => handlers.onMessageAdded?.(payload));
  socket.on("gameStarted", (payload) => handlers.onGameStarted?.(payload));
  socket.on("gameUpdated", (payload) => handlers.onGameUpdated?.(payload));
  socket.on("roomUpdated", (payload) => handlers.onRoomUpdated?.(payload));
  socket.on("kicked", (payload) => handlers.onKicked?.(payload));
  socket.on("playlistSuggestionsUpdated", (payload) =>
    handlers.onPlaylistSuggestionsUpdated?.(payload),
  );
  socket.on("settlementHistoryUpdated", (payload) =>
    handlers.onSettlementHistoryUpdated?.(payload),
  );

  return socket;
};

export const disconnectRoomSocket = (socket: ClientSocket | null) => {
  if (!socket) return;
  (socket as RoomSocketWithCleanup).__wakeReconnectCleanup__?.();
  delete (socket as RoomSocketWithCleanup).__wakeReconnectCleanup__;
  socket.removeAllListeners();
  socket.disconnect();
};
