import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { trackEvent } from "../../../shared/analytics/track";
import {
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
} from "./roomConstants";
import { formatAckError, applyGameSettingsPatch } from "./roomProviderUtils";
import {
  clampPlayDurationSec,
  clampRevealDurationSec,
} from "./roomUtils";
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
  SubmitAnswerResult,
} from "./types";

type PlaylistProgressState = {
  received: number;
  total: number;
  ready: boolean;
};

interface UseRoomProviderRoomActionsParams {
  getSocket: () => ClientSocket | null;
  username: string | null;
  joinPasswordInput: string;
  setJoinPasswordInput: Dispatch<SetStateAction<string>>;
  clientId: string;
  currentRoom: RoomState["room"] | null;
  gameState: GameState | null;
  playlistProgressReady: boolean;
  messageInput: string;
  setMessageInput: Dispatch<SetStateAction<string>>;
  setStatusText: (value: string | null) => void;
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
  resetSessionClientId: () => void;
  resetPresenceParticipants: () => void;
  setCurrentRoom: Dispatch<SetStateAction<RoomState["room"] | null>>;
  setParticipants: Dispatch<SetStateAction<RoomParticipant[]>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setSettlementHistory: Dispatch<SetStateAction<RoomSettlementSnapshot[]>>;
  setPlaylistProgress: Dispatch<SetStateAction<PlaylistProgressState>>;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  setIsGameView: Dispatch<SetStateAction<boolean>>;
  setGamePlaylist: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPlaylistViewItems: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPlaylistHasMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistLoadingMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistSuggestions: Dispatch<SetStateAction<PlaylistSuggestion[]>>;
  pendingAnswerSubmitRef: MutableRefObject<{
    roomId: string;
    trackKey: string;
    choiceIndex: number;
    requestId: number;
  } | null>;
  answerSubmitRequestSeqRef: MutableRefObject<number>;
  serverOffsetRef: MutableRefObject<number>;
}

export const useRoomProviderRoomActions = ({
  getSocket,
  username,
  joinPasswordInput,
  setJoinPasswordInput,
  clientId,
  currentRoom,
  gameState,
  playlistProgressReady,
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
}: UseRoomProviderRoomActionsParams) => {
  const handleJoinRoom = useCallback(
    (roomId: string, hasPassword: boolean) => {
      const socket = getSocket();
      if (!socket || !username) {
        setStatusText("嚙罵嚙踝蕭嚙稽嚙緩嚙誕用者名嚙踝蕭");
        return;
      }

      socket.emit(
        "joinRoom",
        {
          roomId,
          username,
          password: hasPassword ? joinPasswordInput.trim() || "" : undefined,
        },
        (ack: Ack<RoomState>) => {
          if (!ack) return;
          if (ack.ok) {
            const state = ack.data;
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
            fetchPlaylistPage(state.room.id, 1, state.room.playlist.pageSize, {
              reset: true,
            });
            lockSessionClientId(clientId);
            persistRoomId(state.room.id);
            setJoinPasswordInput("");
            trackEvent("room_join_success", {
              room_id: state.room.id,
              room_visibility: state.room.visibility,
              has_password: hasPassword,
              participant_count: state.participants.length,
            });
            setStatusText(`嚙緩嚙稼嚙皚嚙請塚蕭嚙瘦${state.room.name}`);
          } else {
            trackEvent("room_join_failed", {
              room_id: roomId,
              has_password: hasPassword,
              reason: ack.error ?? "unknown_error",
            });
            setStatusText(formatAckError("嚙稼嚙皚嚙請塚蕭嚙踝蕭嚙踝蕭", ack.error));
          }
        },
      );
    },
    [
      clientId,
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
      setCurrentRoom,
      syncServerOffset,
      username,
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
          setGamePlaylist([]);
          setIsGameView(false);
          setPlaylistViewItems([]);
          setPlaylistHasMore(false);
          setPlaylistLoadingMore(false);
          setPlaylistSuggestions([]);
          persistRoomId(null);
          resetSessionClientId();
          setStatusText("嚙緩嚙踝蕭嚙罷嚙請塚蕭");
          onLeft?.();
        } else {
          setStatusText(formatAckError("嚙踝蕭嚙罷嚙請塚蕭嚙踝蕭嚙踝蕭", ack.error));
        }
      });
    },
    [
      currentRoom,
      getSocket,
      persistRoomId,
      resetPresenceParticipants,
      resetSessionClientId,
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
    ],
  );

  const handleSendMessage = useCallback(() => {
    const socket = getSocket();
    if (!socket || !currentRoom) {
      setStatusText("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
      return;
    }
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    socket.emit("sendMessage", { content: trimmed }, (ack) => {
      if (!ack) return;
      if (!ack.ok) {
        setStatusText(formatAckError("嚙確嚙踝蕭嚙箴嚙碼嚙踝蕭嚙踝蕭", ack.error));
      }
    });

    setMessageInput("");
  }, [currentRoom, getSocket, messageInput, setMessageInput, setStatusText]);

  const handleStartGame = useCallback(() => {
    const socket = getSocket();
    if (!socket || !currentRoom) {
      setStatusText("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
      return;
    }
    if (!playlistProgressReady) {
      setStatusText("嚙踝蕭嚙踝蕭M嚙踝蕭|嚙踝蕭嚙褒備改蕭嚙踝蕭");
      return;
    }
    const guessDurationMs =
      clampPlayDurationSec(
        currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
      ) * 1000;
    const revealDurationMs =
      clampRevealDurationSec(
        currentRoom.gameSettings?.revealDurationSec ?? DEFAULT_REVEAL_DURATION_SEC,
      ) * 1000;

    socket.emit(
      "startGame",
      { roomId: currentRoom.id, guessDurationMs, revealDurationMs },
      (ack: Ack<{ gameState: GameState; serverNow: number }>) => {
        if (!ack) return;
        if (ack.ok) {
          syncServerOffset(ack.data.serverNow);
          setGameState(ack.data.gameState);
          setIsGameView(true);
          void fetchCompletePlaylist(currentRoom.id).then(setGamePlaylist);
        } else {
          setStatusText(formatAckError("嚙罷嚙締嚙瘠嚙踝蕭嚙踝蕭嚙踝蕭", ack.error));
        }
      },
    );
  }, [
    currentRoom,
    fetchCompletePlaylist,
    getSocket,
    playlistProgressReady,
    setGamePlaylist,
    setGameState,
    setIsGameView,
    setStatusText,
    syncServerOffset,
  ]);

  const handleSubmitChoice = useCallback(
    async (choiceIndex: number): Promise<SubmitAnswerResult> => {
      if (!currentRoom || !gameState) {
        return { ok: false, error: "Room not ready" };
      }
      if (gameState.phase !== "guess") {
        return { ok: false, error: "Not in guess phase" };
      }
      const serverNow = Date.now() + serverOffsetRef.current;
      if (gameState.startedAt > serverNow) {
        return { ok: false, error: "Question has not started yet" };
      }
      const socket = getSocket();
      if (!socket) {
        return { ok: false, error: "Socket disconnected" };
      }
      const trackKey = `${gameState.startedAt}:${gameState.currentIndex}`;
      const previousPending = pendingAnswerSubmitRef.current;
      if (
        previousPending &&
        (previousPending.roomId !== currentRoom.id ||
          previousPending.trackKey !== trackKey)
      ) {
        pendingAnswerSubmitRef.current = null;
      }
      if (
        pendingAnswerSubmitRef.current?.roomId === currentRoom.id &&
        pendingAnswerSubmitRef.current.trackKey === trackKey &&
        pendingAnswerSubmitRef.current.choiceIndex === choiceIndex
      ) {
        return { ok: false, error: "Duplicate submit pending" };
      }

      const requestId = (answerSubmitRequestSeqRef.current += 1);
      pendingAnswerSubmitRef.current = {
        roomId: currentRoom.id,
        trackKey,
        choiceIndex,
        requestId,
      };

      return await new Promise<SubmitAnswerResult>((resolve) => {
        socket.emit(
          "submitAnswer",
          { roomId: currentRoom.id, choiceIndex },
          (ack) => {
            const pending = pendingAnswerSubmitRef.current;
            const isCurrentPending =
              pending?.roomId === currentRoom.id &&
              pending.trackKey === trackKey &&
              pending.choiceIndex === choiceIndex &&
              pending.requestId === requestId;

            if (isCurrentPending) {
              pendingAnswerSubmitRef.current = null;
            }

            if (!isCurrentPending) {
              resolve({ ok: false, error: "Stale submit response" });
              return;
            }

            if (!ack) {
              const error = "Submit acknowledgment missing";
              setStatusText("嚙踝蕭嚙賣答嚙論伐蕭嚙諸：嚙踝蕭嚙璀嚙踝蕭嚙踝蕭嚙稷嚙踝蕭");
              resolve({ ok: false, error });
              return;
            }

            if (!ack.ok) {
              if (ack.error !== "Not in guess phase") {
                setStatusText(formatAckError("嚙踝蕭嚙賣答嚙論伐蕭嚙踝蕭", ack.error));
              }
              resolve({ ok: false, error: ack.error || "Submit failed" });
              return;
            }

            resolve({ ok: true, data: ack.data });
          },
        );
      });
    },
    [answerSubmitRequestSeqRef, currentRoom, gameState, getSocket, pendingAnswerSubmitRef, serverOffsetRef, setStatusText],
  );

  useEffect(() => {
    if (!gameState || gameState.phase !== "guess" || !currentRoom) {
      pendingAnswerSubmitRef.current = null;
      return;
    }
    const trackKey = `${gameState.startedAt}:${gameState.currentIndex}`;
    const pending = pendingAnswerSubmitRef.current;
    if (!pending) return;
    if (pending.roomId === currentRoom.id && pending.trackKey === trackKey) return;
    pendingAnswerSubmitRef.current = null;
  }, [currentRoom, gameState, pendingAnswerSubmitRef]);

  useEffect(
    () => () => {
      pendingAnswerSubmitRef.current = null;
    },
    [pendingAnswerSubmitRef],
  );

  const handleKickPlayer = useCallback(
    (targetClientId: string, durationMs?: number | null) => {
      const socket = getSocket();
      if (!socket || !currentRoom) return;
      socket.emit(
        "kickPlayer",
        { roomId: currentRoom.id, targetClientId, durationMs },
        (ack: Ack<null>) => {
          if (!ack) return;
          if (!ack.ok) {
            setStatusText(formatAckError("嚙踝蕭X嚙踝蕭嚙踝蕭", ack.error));
          }
        },
      );
    },
    [currentRoom, getSocket, setStatusText],
  );

  const handleTransferHost = useCallback(
    (targetClientId: string) => {
      const socket = getSocket();
      if (!socket || !currentRoom) return;
      socket.emit(
        "transferHost",
        { roomId: currentRoom.id, targetClientId },
        (ack: Ack<{ hostClientId: string }>) => {
          if (!ack) return;
          if (!ack.ok) {
            setStatusText(formatAckError("嚙賞移嚙請主嚙踝蕭嚙踝蕭", ack.error));
          }
        },
      );
    },
    [currentRoom, getSocket, setStatusText],
  );

  return {
    handleJoinRoom,
    handleLeaveRoom,
    handleSendMessage,
    handleStartGame,
    handleSubmitChoice,
    handleKickPlayer,
    handleTransferHost,
  };
};

export default useRoomProviderRoomActions;
