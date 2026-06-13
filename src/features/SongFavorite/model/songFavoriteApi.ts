import { API_URL } from "@domain/room/constants";
import { ensureFreshAuthToken } from "@shared/auth/token";

import type {
  CurrentRoomTrackFavoriteStatus,
  SongFavoriteListPage,
  SongFavoriteRecord,
  SongFavoriteSortKey,
  SongFavoriteSortOrder,
} from "./types";

// Tolerates both the legacy Node shape ({ ok, error: string, code }) and the Spring Boot
// ApiEnvelope ({ success, error: { code, message } }) so the frontend can ship independently
// of the nginx cutover.
type ApiResponse<T> = {
  ok?: boolean;
  success?: boolean;
  data?: T;
  error?: string | { code?: string; message?: string } | null;
  code?: string;
  retryAfterMs?: number;
};

const isPayloadOk = (body: { ok?: boolean; success?: boolean } | null): boolean =>
  Boolean(body?.success ?? body?.ok);

const readErrorMessage = (
  error: string | { code?: string; message?: string } | null | undefined,
): string | null => {
  if (!error) return null;
  if (typeof error === "string") return error;
  return error.message ?? null;
};

const readErrorCode = (body: ApiResponse<unknown> | null): string | null => {
  if (body?.code) return body.code;
  if (body?.error && typeof body.error === "object") return body.error.code ?? null;
  return null;
};

type AuthParams = {
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
};

export class SongFavoriteApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    retryAfterMs: number | null = null,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

const parseRetryAfterMs = <T,>(
  response: Response,
  body: ApiResponse<T> | null,
): number | null => {
  if (typeof body?.retryAfterMs === "number" && Number.isFinite(body.retryAfterMs)) {
    return Math.max(0, Math.floor(body.retryAfterMs));
  }

  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds * 1000)) : null;
};

const requestJson = async <T,>(
  path: string,
  auth: AuthParams,
  init?: RequestInit,
): Promise<T> => {
  const token = await ensureFreshAuthToken({
    token: auth.authToken,
    refreshAuthToken: auth.refreshAuthToken,
  });

  if (!token) {
    throw new SongFavoriteApiError("請先登入後再收藏歌曲", 401, "UNAUTHORIZED");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !isPayloadOk(body)) {
    throw new SongFavoriteApiError(
      readErrorMessage(body?.error) ?? `HTTP ${response.status}`,
      response.status,
      readErrorCode(body),
      parseRetryAfterMs(response, body),
    );
  }

  if (body.data === undefined) {
    throw new SongFavoriteApiError("Invalid response shape", response.status);
  }

  return body.data;
};

export const songFavoriteApi = {
  fetchCurrentRoomTrackStatus: (params: AuthParams & {
    roomId: string;
    signal?: AbortSignal;
  }) => {
    const search = new URLSearchParams({ roomId: params.roomId });
    return requestJson<CurrentRoomTrackFavoriteStatus>(
      `/api/me/song-favorites/current-room-track/status?${search.toString()}`,
      params,
      { method: "GET", signal: params.signal },
    );
  },

  favoriteCurrentRoomTrack: (params: AuthParams & { roomId: string }) =>
    requestJson<CurrentRoomTrackFavoriteStatus>(
      "/api/me/song-favorites/current-room-track",
      params,
      {
        method: "POST",
        body: JSON.stringify({ roomId: params.roomId }),
      },
    ),

  listFavorites: (params: AuthParams & {
    cursor?: string;
    limit?: number;
    sort?: SongFavoriteSortKey;
    order?: SongFavoriteSortOrder;
    signal?: AbortSignal;
  }) => {
    const search = new URLSearchParams();
    if (params.cursor) search.set("cursor", params.cursor);
    if (params.limit) search.set("limit", String(params.limit));
    if (params.sort) search.set("sort", params.sort);
    if (params.order) search.set("order", params.order);
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return requestJson<SongFavoriteListPage>(
      `/api/me/song-favorites${suffix}`,
      params,
      { method: "GET", signal: params.signal },
    );
  },

  deleteFavorite: (params: AuthParams & {
    provider: "youtube";
    sourceId: string;
  }) =>
    requestJson<{ deleted: boolean }>(
      `/api/me/song-favorites/${encodeURIComponent(params.provider)}/${encodeURIComponent(params.sourceId)}`,
      params,
      { method: "DELETE" },
    ),

  batchDeleteFavorites: (params: AuthParams & {
    items: { provider: "youtube"; sourceId: string }[];
  }) =>
    requestJson<{ deletedCount: number }>(
      "/api/me/song-favorites/batch",
      params,
      {
        method: "DELETE",
        body: JSON.stringify({ items: params.items }),
      },
    ),

  deleteAllFavorites: (params: AuthParams) =>
    requestJson<{ deletedCount: number }>(
      "/api/me/song-favorites",
      params,
      { method: "DELETE" },
    ),

  // Returns all active favorites (no pagination) for the collection-import flow.
  // Capped at 5000 server-side; intended for one-click "import all" actions.
  getAllFavorites: (params: AuthParams & { signal?: AbortSignal }) =>
    requestJson<{ items: SongFavoriteRecord[] }>(
      "/api/me/song-favorites/all",
      params,
      { method: "GET", signal: params.signal },
    ),
};
