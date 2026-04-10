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
import { translateRoomErrorDetail } from "./roomErrorText";
import { formatAckError, applyGameSettingsPatch } from "./roomProviderUtils";
import { clampPlayDurationSec, clampRevealDurationSec } from "./roomUtils";
import type {
  Ack,
  ChatMessage,
  ChatMessageQuestionContext,
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

const resolveChatQuestionContext = (
  currentRoom: RoomState["room"] | null,
  gameState: GameState | null,
): ChatMessageQuestionContext | undefined => {
  if (!gameState || gameState.status !== "playing") return undefined;
  const questionNo = Math.max(1, Math.round((gameState.trackCursor ?? 0) + 1));
  const totalQuestions = Math.max(
    questionNo,
    Math.round(
      gameState.trackOrder.length ||
        currentRoom?.gameSettings?.questionCount ||
        currentRoom?.totalQuestionCount ||
        0,
    ),
  );
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return undefined;
  return { questionNo: Math.min(questionNo, totalQuestions), totalQuestions };
};

interface UseRoomProviderRoomActionsParams {
  getSocket: () => ClientSocket | null;
  username: string | null;
  joinPasswordInput: string;
  setJoinPasswordInput: Dispatch<SetStateAction<string>>;
  saveRoomPassword: (roomId: string, password: string | null) => void;
  clientId: string;
  currentRoom: RoomState["room"] | null;
  gameState: GameState | null;
  playlistProgressReady: boolean;
  messageInput: string;
  setMessageInput: Dispatch<SetStateAction<string>>;
  setStatusText: (value: string | null) => void;
  setKickedNotice: Dispatch<
    SetStateAction<{
      roomId: string;
      reason: string;
      bannedUntil: number | null;
      kickedAt: number;
    } | null>
  >;
  chatCooldownLeft: number;
  setChatCooldownUntil: Dispatch<SetStateAction<number | null>>;
  setChatCooldownLeft: Dispatch<SetStateAction<number>>;
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
  saveRoomPassword,
  clientId,
  currentRoom,
  gameState,
  playlistProgressReady,
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
            lockSessionClientId(clientId);
            persistRoomId(state.room.id);
            setJoinPasswordInput("");
            trackEvent("room_join_success", {
              room_id: state.room.id,
              room_code: state.room.roomCode,
              room_visibility: state.room.visibility,
              has_pin: hasPin,
              participant_count: state.participants.length,
            });
            setStatusText(`已加入房間${state.room.name}`);
          } else {
            trackEvent("room_join_failed", {
              room_reference: roomReference,
              has_pin: hasPin,
              reason: ack.error ?? "unknown_error",
            });
            setStatusText(
              formatAckError(
                "加入房間失敗",
                translateRoomErrorDetail(ack.error),
              ),
            );
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
      setKickedNotice,
      setCurrentRoom,
      saveRoomPassword,
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
          setKickedNotice(null);
          persistRoomId(null);
          resetSessionClientId();
          setStatusText("已離開房間");
          onLeft?.();
        } else {
          setStatusText(formatAckError("已離開房間", ack.error));
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
      setKickedNotice,
    ],
  );

  const handleSendMessage = useCallback(() => {
    if (chatCooldownLeft > 0) return;

    const socket = getSocket();
    if (!socket || !currentRoom) {
      setStatusText("發送訊息失敗");
      return;
    }

    const trimmed = messageInput.trim();
    if (!trimmed) return;

    socket.emit(
      "sendMessage",
      {
        content: trimmed,
        questionContext: resolveChatQuestionContext(currentRoom, gameState),
      },
      (ack) => {
        console.log("sendMessage ack:", ack);

        if (!ack) return;

        if (!ack.ok) {
        let retryAfterMs: number | null =
          typeof ack.retryAfterMs === "number" && ack.retryAfterMs > 0
            ? ack.retryAfterMs
            : null;

        if (!retryAfterMs) {
          const matchedSeconds = ack.error.match(/請\s*(\d+)\s*秒後再試/);
          if (matchedSeconds) {
            retryAfterMs = Number(matchedSeconds[1]) * 1000;
          }
        }

        if (!retryAfterMs) {
          if (
            ack.error === "RATE_LIMITED" ||
            ack.error.includes("頻繁") ||
            ack.error.includes("過快")
          ) {
            retryAfterMs = 10_000;
          }
        }

        if (retryAfterMs) {
          const cooldownSeconds = Math.ceil(retryAfterMs / 1000);
          setChatCooldownLeft(cooldownSeconds);
          setChatCooldownUntil(Date.now() + retryAfterMs);
          setStatusText(`請稍候 ${cooldownSeconds} 秒後再發送訊息`);
          return;
        }

        setStatusText(formatAckError("發送訊息失敗", ack.error));
        return;
      }

        setMessageInput("");
      },
    );
  }, [
    chatCooldownLeft,
    currentRoom,
    gameState,
    getSocket,
    messageInput,
    setChatCooldownLeft,
    setChatCooldownUntil,
    setMessageInput,
    setStatusText,
  ]);

  const handleStartGame = useCallback(() => {
    const socket = getSocket();
    if (!socket || !currentRoom) {
      setStatusText("尚未加入房間");
      return;
    }
    if (!playlistProgressReady) {
      setStatusText("播放清單尚未準備完成");
      return;
    }
    const guessDurationMs =
      clampPlayDurationSec(
        currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
      ) * 1000;
    const revealDurationMs =
      clampRevealDurationSec(
        currentRoom.gameSettings?.revealDurationSec ??
          DEFAULT_REVEAL_DURATION_SEC,
      ) * 1000;

    socket.emit(
      "startGame",
      { roomId: currentRoom.id, guessDurationMs, revealDurationMs },
      (ack: Ack<{ gameState: GameState; serverNow: number }>) => {
        if (!ack) return;
        if (ack.ok) {
          syncServerOffset(ack.data.serverNow);
          setGamePlaylist([]);
          setGameState(ack.data.gameState);
          setIsGameView(true);
          void fetchCompletePlaylist(currentRoom.id).then(setGamePlaylist);
        } else {
          setStatusText(formatAckError("開始遊戲失敗", ack.error));
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
              setStatusText("提交答案失敗：未收到伺服器回應");
              resolve({ ok: false, error });
              return;
            }

            if (!ack.ok) {
              if (ack.error !== "Not in guess phase") {
                setStatusText(formatAckError("提交答案失敗", ack.error));
              }
              resolve({ ok: false, error: ack.error || "Submit failed" });
              return;
            }

            resolve({ ok: true, data: ack.data });
          },
        );
      });
    },
    [
      answerSubmitRequestSeqRef,
      currentRoom,
      gameState,
      getSocket,
      pendingAnswerSubmitRef,
      serverOffsetRef,
      setStatusText,
    ],
  );

  const handleRequestPlaybackExtensionVote = useCallback(
    async (remainingMs?: number): Promise<boolean> => {
      const socket = getSocket();
      if (!socket || !currentRoom) {
        setStatusText("目前不在房間內");
        return false;
      }
      const normalizedRemainingMs =
        typeof remainingMs === "number" && Number.isFinite(remainingMs)
          ? Math.max(0, Math.floor(remainingMs))
          : undefined;
      return await new Promise<boolean>((resolve) => {
        socket.emit(
          "requestPlaybackExtensionVote",
          {
            roomId: currentRoom.id,
            ...(typeof normalizedRemainingMs === "number"
              ? { remainingMs: normalizedRemainingMs }
              : {}),
          },
          (ack: Ack<{ gameState: GameState; serverNow: number }>) => {
            if (!ack) {
              setStatusText("發起延長投票失敗，請稍後再試");
              resolve(false);
              return;
            }
            if (!ack.ok) {
              setStatusText(formatAckError("發起延長投票失敗", ack.error));
              resolve(false);
              return;
            }
            syncServerOffset(ack.data.serverNow);
            setGameState(ack.data.gameState);
            resolve(true);
          },
        );
      });
    },
    [currentRoom, getSocket, setGameState, setStatusText, syncServerOffset],
  );

  const handleCastPlaybackExtensionVote = useCallback(
    async (vote: "approve" | "reject"): Promise<boolean> => {
      const socket = getSocket();
      if (!socket || !currentRoom) {
        setStatusText("目前不在房間內");
        return false;
      }
      return await new Promise<boolean>((resolve) => {
        socket.emit(
          "castPlaybackExtensionVote",
          { roomId: currentRoom.id, vote },
          (ack: Ack<{ gameState: GameState; serverNow: number }>) => {
            if (!ack) {
              setStatusText("送出投票失敗，請稍後再試");
              resolve(false);
              return;
            }
            if (!ack.ok) {
              setStatusText(formatAckError("送出投票失敗", ack.error));
              resolve(false);
              return;
            }
            syncServerOffset(ack.data.serverNow);
            setGameState(ack.data.gameState);
            resolve(true);
          },
        );
      });
    },
    [currentRoom, getSocket, setGameState, setStatusText, syncServerOffset],
  );

  useEffect(() => {
    if (!gameState || gameState.phase !== "guess" || !currentRoom) {
      pendingAnswerSubmitRef.current = null;
      return;
    }
    const trackKey = `${gameState.startedAt}:${gameState.currentIndex}`;
    const pending = pendingAnswerSubmitRef.current;
    if (!pending) return;
    if (pending.roomId === currentRoom.id && pending.trackKey === trackKey)
      return;
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
            setStatusText(formatAckError("踢出玩家失敗", ack.error));
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
            setStatusText(formatAckError("轉移房主失敗", ack.error));
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
    handleRequestPlaybackExtensionVote,
    handleCastPlaybackExtensionVote,
    handleKickPlayer,
    handleTransferHost,
  };
};

export default useRoomProviderRoomActions;
