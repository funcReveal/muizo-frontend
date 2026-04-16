import { useCallback, type Dispatch, type SetStateAction } from "react";

import {
  apiFetchRoomById,
  apiFetchRooms,
  apiFetchSitePresence,
} from "./roomApi";
import type {
  Ack,
  ClientSocket,
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
  RoomState,
  RoomSummary,
} from "./types";

type UseRoomProviderReadActionsParams = {
  apiUrl: string;
  getSocket: () => ClientSocket | null;
  currentRoom: RoomState["room"] | null;
  isInviteMode: boolean;
  inviteRoomId: string | null;
  setRooms: Dispatch<SetStateAction<RoomSummary[]>>;
  setInviteNotFound: Dispatch<SetStateAction<boolean>>;
  setStatusText: (value: string | null) => void;
  setSitePresence: (
    payload: { onlineCount: number; updatedAt: number } | null,
  ) => void;
};

const READ_ACK_TIMEOUT_MS = 6000;

export const useRoomProviderReadActions = ({
  apiUrl,
  getSocket,
  currentRoom,
  setRooms,
  setStatusText,
  setSitePresence,
}: UseRoomProviderReadActionsParams) => {
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
        }, READ_ACK_TIMEOUT_MS);

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

  const fetchRooms = useCallback(async () => {
    if (!apiUrl) {
      setStatusText("尚未設定 API 位置 (API_URL)");
      return;
    }
    try {
      const { ok, payload } = await apiFetchRooms(apiUrl);
      if (!ok) {
        throw new Error(payload?.error ?? "讀取房間列表失敗");
      }
      const next = (payload?.rooms ?? payload) as RoomSummary[];
      setRooms(Array.isArray(next) ? next : []);
    } catch (error) {
      console.error(error);
      setStatusText("讀取房間列表失敗");
    }
  }, [apiUrl, setRooms, setStatusText]);

  const fetchRoomById = useCallback(
    async (roomId: string) => {
      if (!apiUrl) {
        setStatusText("尚未設定 API 位置 (API_URL)");
        return null;
      }
      try {
        const { ok, payload } = await apiFetchRoomById(apiUrl, roomId);
        if (!ok) {
          return null;
        }
        return (payload?.room ?? null) as RoomSummary | null;
      } catch (error) {
        console.error(error);
        return null;
      }
    },
    [apiUrl, setStatusText],
  );

  const fetchSitePresence = useCallback(async () => {
    if (!apiUrl) {
      setStatusText("尚未設定 API 位置 (API_URL)");
      return;
    }

    try {
      const { ok, payload } = await apiFetchSitePresence(apiUrl);
      if (!ok) {
        throw new Error(payload?.error ?? "讀取線上狀態失敗");
      }

      setSitePresence({
        onlineCount: Number(payload?.onlineCount ?? 0),
        updatedAt: Number(payload?.updatedAt ?? Date.now()),
      });
    } catch (error) {
      console.error(error);
      setSitePresence(null);
    }
  }, [apiUrl, setSitePresence, setStatusText]);

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
    fetchRooms,
    fetchRoomById,
    fetchSitePresence,
    fetchSettlementHistorySummaries,
    fetchSettlementReplay,
  };
};

export default useRoomProviderReadActions;
