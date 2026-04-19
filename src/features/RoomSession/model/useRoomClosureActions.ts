import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";

import type { RoomClosedNotice } from "./RoomSessionContext";
import type { RoomStatusOptions } from "./providers/RoomStatusContexts";
import type {
  Ack,
  ChatMessage,
  GameState,
  PlaylistItem,
  PlaylistSuggestion,
  RoomParticipant,
  RoomSettlementSnapshot,
  RoomState,
} from "./types";
import type { PostResumeGate } from "./useRoomSessionRecoveryState";

type PlaylistProgressState = {
  received: number;
  total: number;
  ready: boolean;
};

type UseRoomClosureActionsParams = {
  currentRoom: RoomState["room"] | null;
  currentRoomIdRef: RefObject<string | null>;
  lastLatencyProbeRoomIdRef: RefObject<string | null>;
  roomSelfClientIdRef: RefObject<string | null>;
  persistRoomId: (id: string | null) => void;
  persistRoomSessionToken: (token: string | null) => void;
  resetGameSyncVersion: () => void;
  resetPresenceParticipants: () => void;
  resetSessionClientId: () => void;
  setClosedRoomNotice: Dispatch<SetStateAction<RoomClosedNotice | null>>;
  setCurrentRoom: Dispatch<SetStateAction<RoomState["room"] | null>>;
  setGamePlaylist: Dispatch<SetStateAction<PlaylistItem[]>>;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  setIsGameView: Dispatch<SetStateAction<boolean>>;
  setKickedNotice: Dispatch<
    SetStateAction<{
      roomId: string;
      reason: string;
      bannedUntil: number | null;
      kickedAt: number;
    } | null>
  >;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setParticipants: Dispatch<SetStateAction<RoomParticipant[]>>;
  setPlaylistHasMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistLoadingMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistProgress: Dispatch<SetStateAction<PlaylistProgressState>>;
  setPlaylistSuggestions: Dispatch<SetStateAction<PlaylistSuggestion[]>>;
  setPlaylistViewItems: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPostResumeGate: Dispatch<SetStateAction<PostResumeGate>>;
  setRouteRoomResolved: Dispatch<SetStateAction<boolean>>;
  setSettlementHistory: Dispatch<SetStateAction<RoomSettlementSnapshot[]>>;
  setStatusText: (value: string | null, options?: RoomStatusOptions) => void;
};

export const useRoomClosureActions = ({
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
  setMessages,
  setParticipants,
  setPlaylistHasMore,
  setPlaylistLoadingMore,
  setPlaylistProgress,
  setPlaylistSuggestions,
  setPlaylistViewItems,
  setPostResumeGate,
  setRouteRoomResolved,
  setSettlementHistory,
  setStatusText,
}: UseRoomClosureActionsParams) => {
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
      currentRoomIdRef,
      lastLatencyProbeRoomIdRef,
      persistRoomId,
      persistRoomSessionToken,
      resetGameSyncVersion,
      resetPresenceParticipants,
      resetSessionClientId,
      roomSelfClientIdRef,
      setClosedRoomNotice,
      setCurrentRoom,
      setGamePlaylist,
      setGameState,
      setIsGameView,
      setKickedNotice,
      setMessages,
      setParticipants,
      setPlaylistHasMore,
      setPlaylistLoadingMore,
      setPlaylistProgress,
      setPlaylistSuggestions,
      setPlaylistViewItems,
      setPostResumeGate,
      setRouteRoomResolved,
      setSettlementHistory,
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

  return {
    clearRoomAfterClosure,
    handleRoomGoneAck,
  };
};

export default useRoomClosureActions;
