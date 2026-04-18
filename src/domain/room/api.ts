import type { RoomByIdPayload, RoomListPayload } from "./types";

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  payload: T | null;
};

export type CollectionSummary = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: "private" | "public";
  item_limit_override?: number | null;
  effective_item_limit?: number | null;
  cover_title?: string | null;
  cover_channel_title?: string | null;
  cover_thumbnail_url?: string | null;
  cover_duration_sec?: number | null;
  cover_source_id?: string | null;
  cover_provider?: string | null;
  ai_edited_count?: number;
  has_ai_edited?: number | boolean;
  version: number;
  item_count?: number;
  use_count: number;
  favorite_count?: number;
  is_favorited?: number | boolean;
  counts_last_use_id: number;
  use_count_updated: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

const API_REQUEST_TIMEOUT_MS = 15_000;

const fetchJson = async <T>(
  url: string,
  options?: RequestInit,
): Promise<ApiResult<T>> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    API_REQUEST_TIMEOUT_MS,
  );

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        status: 408,
        payload: { error: "請求逾時，請稍後再試" } as T,
      };
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const apiFetchRooms = (apiUrl: string) =>
  fetchJson<RoomListPayload>(`${apiUrl}/api/rooms`);

export const apiFetchRoomById = (apiUrl: string, roomId: string) =>
  fetchJson<RoomByIdPayload>(`${apiUrl}/api/rooms/${roomId}`);
