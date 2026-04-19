import {
  useCallback,
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import {
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
} from "./roomConstants";
import { formatAckError } from "./roomProviderUtils";
import { clampPlayDurationSec, clampRevealDurationSec } from "./roomUtils";
import type {
  Ack,
  ClientSocket,
  GameLiveUpdatePayload,
  GameState,
  PlaylistItem,
  RoomState,
  SubmitAnswerResult,
} from "./types";

type UseRoomGameActionsParams = {
  getSocket: () => ClientSocket | null;
  currentRoom: RoomState["room"] | null;
  gameState: GameState | null;
  playlistProgressReady: boolean;
  setStatusText: (value: string | null) => void;
  syncServerOffset: (serverNow: number) => void;
  fetchCompletePlaylist: (roomId: string) => Promise<PlaylistItem[]>;
  setGamePlaylist: Dispatch<SetStateAction<PlaylistItem[]>>;
  setIsGameView: Dispatch<SetStateAction<boolean>>;
  pendingAnswerSubmitRef: RefObject<{
    roomId: string;
    trackKey: string;
    choiceIndex: number;
    requestId: number;
  } | null>;
  answerSubmitRequestSeqRef: RefObject<number>;
  serverOffsetRef: RefObject<number>;
  applyGameLiveUpdate: (payload: GameLiveUpdatePayload) => boolean;
  handleRoomGoneAck: (
    roomId: string | null | undefined,
    ack: Ack<unknown> | null | undefined,
  ) => boolean;
};

export const useRoomGameActions = ({
  getSocket,
  currentRoom,
  gameState,
  playlistProgressReady,
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
}: UseRoomGameActionsParams) => {
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
      (ack: Ack<GameLiveUpdatePayload>) => {
        if (!ack) return;
        if (ack.ok) {
          syncServerOffset(ack.data.serverNow);
          setGamePlaylist([]);
          applyGameLiveUpdate(ack.data);
          setIsGameView(true);
          void fetchCompletePlaylist(currentRoom.id).then(setGamePlaylist);
        } else {
          if (handleRoomGoneAck(currentRoom.id, ack)) return;
          setStatusText(formatAckError("開始遊戲失敗", ack.error));
        }
      },
    );
  }, [
    currentRoom,
    fetchCompletePlaylist,
    getSocket,
    handleRoomGoneAck,
    playlistProgressReady,
    setGamePlaylist,
    setIsGameView,
    setStatusText,
    syncServerOffset,
    applyGameLiveUpdate,
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
              if (handleRoomGoneAck(currentRoom.id, ack)) {
                resolve({ ok: false, error: ack.error || "Room closed" });
                return;
              }
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
      handleRoomGoneAck,
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
          (ack: Ack<GameLiveUpdatePayload>) => {
            if (!ack) {
              setStatusText("發起延長投票失敗，請稍後再試");
              resolve(false);
              return;
            }
            if (!ack.ok) {
              if (handleRoomGoneAck(currentRoom.id, ack)) {
                resolve(false);
                return;
              }
              setStatusText(formatAckError("發起延長投票失敗", ack.error));
              resolve(false);
              return;
            }
            syncServerOffset(ack.data.serverNow);
            applyGameLiveUpdate(ack.data);
            resolve(true);
          },
        );
      });
    },
    [
      currentRoom,
      getSocket,
      setStatusText,
      syncServerOffset,
      applyGameLiveUpdate,
      handleRoomGoneAck,
    ],
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
          (ack: Ack<GameLiveUpdatePayload>) => {
            if (!ack) {
              setStatusText("送出投票失敗，請稍後再試");
              resolve(false);
              return;
            }
            if (!ack.ok) {
              if (handleRoomGoneAck(currentRoom.id, ack)) {
                resolve(false);
                return;
              }
              setStatusText(formatAckError("送出投票失敗", ack.error));
              resolve(false);
              return;
            }
            syncServerOffset(ack.data.serverNow);
            applyGameLiveUpdate(ack.data);
            resolve(true);
          },
        );
      });
    },
    [
      currentRoom,
      getSocket,
      setStatusText,
      syncServerOffset,
      applyGameLiveUpdate,
      handleRoomGoneAck,
    ],
  );

  useEffect(() => {
    if (!gameState || gameState.phase !== "guess" || !currentRoom) {
      pendingAnswerSubmitRef.current = null;
      return;
    }
    const trackKey = `${gameState.startedAt}:${gameState.currentIndex}`;
    const pending = pendingAnswerSubmitRef.current;
    if (!pending) return;
    if (pending.roomId === currentRoom.id && pending.trackKey === trackKey) {
      return;
    }
    pendingAnswerSubmitRef.current = null;
  }, [currentRoom, gameState, pendingAnswerSubmitRef]);

  useEffect(
    () => () => {
      pendingAnswerSubmitRef.current = null;
    },
    [pendingAnswerSubmitRef],
  );

  return {
    handleStartGame,
    handleSubmitChoice,
    handleRequestPlaybackExtensionVote,
    handleCastPlaybackExtensionVote,
  };
};

export default useRoomGameActions;
