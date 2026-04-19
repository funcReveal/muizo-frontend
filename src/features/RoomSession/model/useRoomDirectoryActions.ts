import { useCallback, type Dispatch, type SetStateAction } from "react";

import {
  apiFetchRoomById,
  apiFetchRooms,
  apiFetchSitePresence,
} from "./roomApi";
import type { RoomLookupResult, RoomSummary } from "./types";

type UseRoomDirectoryActionsParams = {
  apiUrl: string;
  setRooms: Dispatch<SetStateAction<RoomSummary[]>>;
  setStatusText: (value: string | null) => void;
  setSitePresence: (
    payload: { onlineCount: number; updatedAt: number } | null,
  ) => void;
};

export const useRoomDirectoryActions = ({
  apiUrl,
  setRooms,
  setStatusText,
  setSitePresence,
}: UseRoomDirectoryActionsParams) => {
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
    async (roomId: string): Promise<RoomLookupResult> => {
      if (!apiUrl) {
        return {
          ok: false,
          reason: "missing_api_url",
          message: "尚未設定 API 位置 (API_URL)",
        };
      }
      try {
        const { ok, payload, status } = await apiFetchRoomById(apiUrl, roomId);
        if (!ok) {
          const code = payload?.error_code;
          const message = payload?.error ?? "讀取房間資料失敗";
          if (status === 404 || code === "ROOM_NOT_FOUND") {
            return {
              ok: false,
              reason: "not_found",
              message,
              code,
            };
          }
          return {
            ok: false,
            reason:
              status === 408 || message.includes("逾時")
                ? "timeout"
                : "server_error",
            message,
            status,
            code,
          };
        }
        const room = payload?.room;
        if (!room) {
          return {
            ok: false,
            reason: "invalid_response",
            message: "房間資料格式異常",
          };
        }
        return { ok: true, room: room as RoomSummary };
      } catch (error) {
        console.error(error);
        return {
          ok: false,
          reason: "network",
          message: "無法連線到房間伺服器，請稍後再試",
        };
      }
    },
    [apiUrl],
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

  return {
    fetchRooms,
    fetchRoomById,
    fetchSitePresence,
  };
};

export default useRoomDirectoryActions;
