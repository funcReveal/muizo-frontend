import { useCallback } from "react";

import type {
  Ack,
  ClientSocket,
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
  RoomState,
} from "./types";

type UseRoomSettlementReadActionsParams = {
  getSocket: () => ClientSocket | null;
  currentRoom: RoomState["room"] | null;
};

const SETTLEMENT_READ_ACK_TIMEOUT_MS = 6000;

export const useRoomSettlementReadActions = ({
  getSocket,
  currentRoom,
}: UseRoomSettlementReadActionsParams) => {
  const withSocketAckTimeout = useCallback(
    <T>(
      label: string,
      executor: (
        resolve: (value: T) => void,
        reject: (reason?: unknown) => void,
      ) => void,
    ) =>
      new Promise<T>((resolve, reject) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error(`${label}逾時，請稍後再試`));
        }, SETTLEMENT_READ_ACK_TIMEOUT_MS);

        const resolveOnce = (value: T) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(value);
        };

        const rejectOnce = (reason?: unknown) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          reject(reason);
        };

        executor(resolveOnce, rejectOnce);
      }),
    [],
  );

  const fetchSettlementHistorySummaries = useCallback(
    async (options?: { limit?: number; beforeEndedAt?: number | null }) => {
      const socket = getSocket();
      if (!socket || !currentRoom) {
        throw new Error("目前不在房間中");
      }
      return await withSocketAckTimeout<{
        items: RoomSettlementHistorySummary[];
        nextCursor: number | null;
      }>("讀取房間歷史", (resolve, reject) => {
        socket.emit(
          "listSettlementHistorySummaries",
          {
            roomId: currentRoom.id,
            limit: options?.limit,
            beforeEndedAt: options?.beforeEndedAt ?? null,
          },
          (
            ack: Ack<{
              items: RoomSettlementHistorySummary[];
              nextCursor: number | null;
            }>,
          ) => {
            if (!ack) {
              reject(new Error("讀取房間歷史失敗"));
              return;
            }
            if (!ack.ok) {
              reject(new Error(ack.error || "讀取房間歷史失敗"));
              return;
            }
            resolve(ack.data);
          },
        );
      });
    },
    [currentRoom, getSocket, withSocketAckTimeout],
  );

  const fetchSettlementReplay = useCallback(
    async (matchId: string) => {
      const socket = getSocket();
      if (!socket || !currentRoom) {
        throw new Error("目前不在房間中");
      }
      return await withSocketAckTimeout<RoomSettlementSnapshot>(
        "讀取對戰回放",
        (resolve, reject) => {
          socket.emit(
            "getSettlementReplay",
            {
              roomId: currentRoom.id,
              matchId,
            },
            (ack: Ack<RoomSettlementSnapshot>) => {
              if (!ack) {
                reject(new Error("讀取對戰回放失敗"));
                return;
              }
              if (!ack.ok) {
                reject(new Error(ack.error || "讀取對戰回放失敗"));
                return;
              }
              resolve(ack.data);
            },
          );
        },
      );
    },
    [currentRoom, getSocket, withSocketAckTimeout],
  );

  return {
    fetchSettlementHistorySummaries,
    fetchSettlementReplay,
  };
};

export default useRoomSettlementReadActions;
