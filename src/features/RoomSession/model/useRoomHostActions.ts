import { useCallback } from "react";

import { formatAckError } from "./roomProviderUtils";
import type { Ack, ClientSocket, RoomState } from "./types";

type UseRoomHostActionsParams = {
  getSocket: () => ClientSocket | null;
  currentRoom: RoomState["room"] | null;
  setStatusText: (value: string | null) => void;
  handleRoomGoneAck: (
    roomId: string | null | undefined,
    ack: Ack<unknown> | null | undefined,
  ) => boolean;
};

export const useRoomHostActions = ({
  getSocket,
  currentRoom,
  setStatusText,
  handleRoomGoneAck,
}: UseRoomHostActionsParams) => {
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
            if (handleRoomGoneAck(currentRoom.id, ack)) return;
            setStatusText(formatAckError("踢出玩家失敗", ack.error));
          }
        },
      );
    },
    [currentRoom, getSocket, handleRoomGoneAck, setStatusText],
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
            if (handleRoomGoneAck(currentRoom.id, ack)) return;
            setStatusText(formatAckError("轉移房主失敗", ack.error));
          }
        },
      );
    },
    [currentRoom, getSocket, handleRoomGoneAck, setStatusText],
  );

  return {
    handleKickPlayer,
    handleTransferHost,
  };
};

export default useRoomHostActions;
