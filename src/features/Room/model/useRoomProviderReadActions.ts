import { useCallback, type Dispatch, type SetStateAction } from "react";

import { apiFetchRoomById, apiFetchRooms } from "./roomApi";
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
};

const READ_ACK_TIMEOUT_MS = 6000;

export const useRoomProviderReadActions = ({
  apiUrl,
  getSocket,
  currentRoom,
  isInviteMode,
  inviteRoomId,
  setRooms,
  setInviteNotFound,
  setStatusText,
}: UseRoomProviderReadActionsParams) => {
  const withSocketAckTimeout = useCallback(
    <T,>(
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
          reject(
            new Error(`${label}\u903e\u6642\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66`),
          );
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
      setStatusText("嚙罵嚙踝蕭嚙稽嚙緩 API 嚙踝蕭m (API_URL)");
      return;
    }
    try {
      const { ok, payload } = await apiFetchRooms(apiUrl);
      if (!ok) {
        throw new Error(payload?.error ?? "嚙盤嚙糊嚙踝蕭嚙緻嚙請塚蕭嚙瘠嚙踝蕭");
      }
      const next = (payload?.rooms ?? payload) as RoomSummary[];
      setRooms(Array.isArray(next) ? next : []);
      if (isInviteMode && inviteRoomId) {
        const found = Array.isArray(next)
          ? next.some((room) => room.id === inviteRoomId)
          : false;
        setInviteNotFound(!found);
        if (!found) {
          setStatusText("嚙踝蕭嚙豌房塚蕭嚙踝蕭嚙編嚙箭嚙諄已嚙踝蕭嚙踝蕭");
        }
      }
    } catch (error) {
      console.error(error);
      setStatusText("取得房間列表失敗");
    }
  }, [
    apiUrl,
    inviteRoomId,
    isInviteMode,
    setInviteNotFound,
    setRooms,
    setStatusText,
  ]);

  const fetchRoomById = useCallback(
    async (roomId: string) => {
      if (!apiUrl) {
        setStatusText("嚙罵嚙踝蕭嚙稽嚙緩 API 嚙踝蕭m (API_URL)");
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

  const fetchSettlementHistorySummaries = useCallback(
    async (options?: { limit?: number; beforeEndedAt?: number | null }) => {
      const socket = getSocket();
      if (!socket || !currentRoom) {
        throw new Error("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
      }
      return await withSocketAckTimeout<{
        items: RoomSettlementHistorySummary[];
        nextCursor: number | null;
      }>("\u8b80\u53d6\u623f\u9593\u6b77\u53f2", (resolve, reject) => {
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
              reject(new Error("嚙踝蕭嚙皚嚙踝蕭埲嚙踝蕭v嚙踝蕭嚙踝蕭"));
              return;
            }
            if (!ack.ok) {
              reject(new Error(ack.error || "嚙踝蕭嚙皚嚙踝蕭埲嚙踝蕭v嚙踝蕭嚙踝蕭"));
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
        throw new Error("嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭");
      }
      return await withSocketAckTimeout<RoomSettlementSnapshot>(
        "\u8b80\u53d6\u5c0d\u6230\u56de\u653e",
        (resolve, reject) => {
          socket.emit(
          "getSettlementReplay",
          {
            roomId: currentRoom.id,
            matchId,
          },
          (ack: Ack<RoomSettlementSnapshot>) => {
            if (!ack) {
              reject(new Error("嚙踝蕭嚙皚嚙踝蕭啈^嚙磊嚙踝蕭嚙踝蕭"));
              return;
            }
            if (!ack.ok) {
              reject(new Error(ack.error || "嚙踝蕭嚙皚嚙踝蕭啈^嚙磊嚙踝蕭嚙踝蕭"));
              return;
            }
            resolve(ack.data);
          },
        );
      });
    },
    [currentRoom, getSocket, withSocketAckTimeout],
  );

  return {
    fetchRooms,
    fetchRoomById,
    fetchSettlementHistorySummaries,
    fetchSettlementReplay,
  };
};

export default useRoomProviderReadActions;
