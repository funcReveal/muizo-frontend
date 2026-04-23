import { useCallback, type Dispatch, type SetStateAction } from "react";

import { trackEvent } from "../../../shared/analytics/track";
import { translateRoomErrorDetail } from "./roomErrorText";
import { formatAckError } from "./roomProviderUtils";
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
} from "./types";

type PlaylistProgressState = {
  received: number;
  total: number;
  ready: boolean;
};

interface UseRoomMembershipActionsParams {
  getSocket: () => ClientSocket | null;
  username: string | null;
  joinPasswordInput: string;
  setJoinPasswordInput: Dispatch<SetStateAction<string>>;
  saveRoomPassword: (roomId: string, password: string | null) => void;
  currentRoom: RoomState["room"] | null;
  setStatusText: (value: string | null) => void;
  handleRoomGoneAck: (
    roomId: string | null | undefined,
    ack: Ack<unknown> | null | undefined,
  ) => boolean;
  setKickedNotice: Dispatch<
    SetStateAction<{
      roomId: string;
      reason: string;
      bannedUntil: number | null;
      kickedAt: number;
    } | null>
  >;
  syncServerOffset: (serverNow: number) => void;
  mergeCachedParticipantPing: (
    nextParticipants: RoomParticipant[],
    previousParticipants: RoomParticipant[],
  ) => RoomParticipant[];
  seedPresenceParticipants: (
    roomId: string | null | undefined,
    nextParticipants: RoomParticipant[],
  ) => void;
  fetchCompletePlaylist: (roomId: string) => Promise<PlaylistItem[]>;
  fetchPlaylistPage: (
    roomId: string,
    page: number,
    pageSize?: number,
    opts?: { reset?: boolean },
  ) => void;
  lockSessionClientId: (nextClientId: string) => void;
  persistRoomId: (id: string | null) => void;
  persistRoomSessionToken: (token: string | null) => void;
  resetSessionClientId: () => void;
  resetPresenceParticipants: () => void;
  setCurrentRoom: Dispatch<SetStateAction<RoomState["room"] | null>>;
  setParticipants: Dispatch<SetStateAction<RoomParticipant[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setSettlementHistory: Dispatch<SetStateAction<RoomSettlementSnapshot[]>>;
  setPlaylistProgress: Dispatch<SetStateAction<PlaylistProgressState>>;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  resetGameSyncVersion: () => void;
  setIsGameView: Dispatch<SetStateAction<boolean>>;
  setGamePlaylist: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPlaylistViewItems: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPlaylistHasMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistLoadingMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistSuggestions: Dispatch<SetStateAction<PlaylistSuggestion[]>>;
  onLeaderboardAuthRequired?: () => void;
}

export const useRoomMembershipActions = ({
  getSocket,
  username,
  joinPasswordInput,
  setJoinPasswordInput,
  saveRoomPassword,
  currentRoom,
  setStatusText,
  handleRoomGoneAck,
  setKickedNotice,
  syncServerOffset,
  mergeCachedParticipantPing,
  seedPresenceParticipants,
  fetchCompletePlaylist,
  fetchPlaylistPage,
  lockSessionClientId,
  persistRoomId,
  persistRoomSessionToken,
  resetSessionClientId,
  resetPresenceParticipants,
  setCurrentRoom,
  setParticipants,
  setMessages,
  setSettlementHistory,
  setPlaylistProgress,
  setGameState,
  resetGameSyncVersion,
  setIsGameView,
  setGamePlaylist,
  setPlaylistViewItems,
  setPlaylistHasMore,
  setPlaylistLoadingMore,
  setPlaylistSuggestions,
  onLeaderboardAuthRequired,
}: UseRoomMembershipActionsParams) => {
  const handleJoinRoom = useCallback(
    (roomReference: string, hasPin: boolean, pinOverride?: string) => {
      const socket = getSocket();
      if (!socket || !username) {
        setStatusText("請先設定使用者名稱");
        return;
      }

      setKickedNotice(null);
      socket.emit(
        "joinRoom",
        {
          roomCode: roomReference,
          username,
          pin: hasPin
            ? (pinOverride ?? joinPasswordInput).trim() || ""
            : undefined,
        },
        (ack: Ack<RoomState>) => {
          if (!ack) return;
          if (ack.ok) {
            const state = ack.data;
            const submittedPin = (pinOverride ?? joinPasswordInput).trim();
            const serverPin = (
              state.room.pin ??
              state.room.password ??
              ""
            ).trim();
            const resolvedRoomPassword = submittedPin || serverPin || null;
            syncServerOffset(state.serverNow);
            setCurrentRoom(state.room);
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
              void fetchCompletePlaylist(state.room.id).then(setGamePlaylist);
            } else {
              setIsGameView(false);
              setGamePlaylist([]);
            }
            fetchPlaylistPage(state.room.id, 1, state.room.playlist.pageSize, {
              reset: true,
            });
            if (state.room.hasPin ?? state.room.hasPassword) {
              saveRoomPassword(state.room.id, resolvedRoomPassword);
            }
            lockSessionClientId(state.selfClientId);
            persistRoomSessionToken(state.roomSessionToken ?? null);
            persistRoomId(state.room.id);
            setJoinPasswordInput("");
            trackEvent("room_join_success", {
              room_id: state.room.id,
              room_code: state.room.roomCode,
              room_visibility: state.room.visibility,
              has_pin: hasPin,
              participant_count: state.participants.length,
            });
            setStatusText(null);
          } else {
            const requiresLeaderboardAuth =
              ack.code === "AUTH_REQUIRED_FOR_LEADERBOARD" ||
              ack.error === "Leaderboard challenge requires login";
            trackEvent("room_join_failed", {
              room_reference: roomReference,
              has_pin: hasPin,
              reason: ack.error ?? "unknown_error",
              code: ack.code ?? null,
            });
            setStatusText(
              formatAckError(
                "加入房間失敗",
                translateRoomErrorDetail(ack.error),
              ),
            );
            if (requiresLeaderboardAuth) {
              onLeaderboardAuthRequired?.();
            }
          }
        },
      );
    },
    [
      fetchCompletePlaylist,
      fetchPlaylistPage,
      getSocket,
      joinPasswordInput,
      lockSessionClientId,
      mergeCachedParticipantPing,
      persistRoomId,
      seedPresenceParticipants,
      setGamePlaylist,
      setGameState,
      setIsGameView,
      setJoinPasswordInput,
      setMessages,
      setParticipants,
      setPlaylistProgress,
      setSettlementHistory,
      setStatusText,
      setKickedNotice,
      setCurrentRoom,
      saveRoomPassword,
      syncServerOffset,
      username,
      persistRoomSessionToken,
      resetGameSyncVersion,
      onLeaderboardAuthRequired,
    ],
  );

  const handleLeaveRoom = useCallback(
    (onLeft?: () => void) => {
      const socket = getSocket();
      if (!socket || !currentRoom) return;

      socket.emit("leaveRoom", { roomId: currentRoom.id }, (ack: Ack<null>) => {
        if (!ack) return;
        if (ack.ok) {
          setCurrentRoom(null);
          setParticipants([]);
          resetPresenceParticipants();
          setMessages([]);
          setSettlementHistory([]);
          setGameState(null);
          resetGameSyncVersion();
          setGamePlaylist([]);
          setIsGameView(false);
          setPlaylistViewItems([]);
          setPlaylistHasMore(false);
          setPlaylistLoadingMore(false);
          setPlaylistSuggestions([]);
          setKickedNotice(null);
          persistRoomId(null);
          persistRoomSessionToken(null);
          resetSessionClientId();
          setStatusText("已離開房間");
          onLeft?.();
        } else {
          if (handleRoomGoneAck(currentRoom.id, ack)) return;
          setStatusText(formatAckError("已離開房間", ack.error));
        }
      });
    },
    [
      currentRoom,
      getSocket,
      persistRoomId,
      persistRoomSessionToken,
      handleRoomGoneAck,
      resetPresenceParticipants,
      resetSessionClientId,
      resetGameSyncVersion,
      setCurrentRoom,
      setGamePlaylist,
      setGameState,
      setIsGameView,
      setMessages,
      setParticipants,
      setPlaylistHasMore,
      setPlaylistLoadingMore,
      setPlaylistSuggestions,
      setPlaylistViewItems,
      setSettlementHistory,
      setStatusText,
      setKickedNotice,
    ],
  );

  return {
    handleJoinRoom,
    handleLeaveRoom,
  };
};

export default useRoomMembershipActions;
