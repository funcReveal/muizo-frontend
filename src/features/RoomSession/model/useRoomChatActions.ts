import { useCallback, type Dispatch, type SetStateAction } from "react";

import { formatAckError } from "./roomProviderUtils";
import type {
  Ack,
  ChatMessageQuestionContext,
  ClientSocket,
  GameState,
  RoomState,
} from "./types";

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

type UseRoomChatActionsParams = {
  getSocket: () => ClientSocket | null;
  currentRoom: RoomState["room"] | null;
  gameState: GameState | null;
  messageInput: string;
  setMessageInput: Dispatch<SetStateAction<string>>;
  chatCooldownLeft: number;
  setChatCooldownUntil: Dispatch<SetStateAction<number | null>>;
  setChatCooldownLeft: Dispatch<SetStateAction<number>>;
  setStatusText: (value: string | null) => void;
  handleRoomGoneAck: (
    roomId: string | null | undefined,
    ack: Ack<unknown> | null | undefined,
  ) => boolean;
};

export const useRoomChatActions = ({
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
}: UseRoomChatActionsParams) => {
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
        if (!ack) return;

        if (!ack.ok) {
          if (handleRoomGoneAck(currentRoom.id, ack)) {
            return;
          }
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
            setStatusText(null);
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
    handleRoomGoneAck,
    messageInput,
    setChatCooldownLeft,
    setChatCooldownUntil,
    setMessageInput,
    setStatusText,
  ]);

  return { handleSendMessage };
};

export default useRoomChatActions;
