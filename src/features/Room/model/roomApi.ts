import type { AuthUser, YoutubePlaylist } from "./RoomContext";
import type { PlaylistItem, RoomSummary } from "./types";

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  payload: T | null;
};

export type AuthErrorDetail =
  | {
      access_token?: string;
      refresh_token?: string;
      id_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    }
  | {
      ok?: boolean;
      data?: AuthUser | null;
      error?: string;
    };

export type AuthPayload = {
  ok?: boolean;
  token?: string;
  user?: AuthUser | null;
  error?: string;
  detail?: AuthErrorDetail;
};

export type RoomListPayload = {
  rooms?: RoomSummary[];
  error?: string;
};

export type RoomByIdPayload = {
  room?: RoomSummary;
  error?: string;
};

export type YoutubePlaylistsPayload = {
  ok?: boolean;
  data?: YoutubePlaylist[];
  error?: string;
};

export type YoutubePlaylistItemsPayload = {
  ok?: boolean;
  data?: {
    playlistId: string;
    title?: string;
    items: PlaylistItem[];
    expectedCount?: number | null;
    skippedCount?: number;
    skippedItems?: Array<{
      title?: string | null;
      videoId?: string | null;
      reason?: string | null;
      status?: "removed" | "unavailable" | "private" | "blocked" | "unknown";
    }>;
  };
  error?: string;
};

export type PlaylistPreviewPayload =
  | {
      playlistId: string;
      title?: string;
      items: PlaylistItem[];
      expectedCount: number | null;
      skippedCount: number;
      skippedItems?: Array<{
        title?: string | null;
        videoId?: string | null;
        reason?: string | null;
        status?: "removed" | "unavailable" | "private" | "blocked" | "unknown";
      }>;
    }
  | {
      error: string;
    };

export type WorkerCollection = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: "private" | "public";
  cover_title?: string | null;
  cover_channel_title?: string | null;
  cover_thumbnail_url?: string | null;
  cover_duration_sec?: number | null;
  cover_source_id?: string | null;
  cover_provider?: string | null;
  version: number;
  use_count: number;
  favorite_count?: number;
  is_favorited?: number | boolean;
  counts_last_use_id: number;
  use_count_updated: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type WorkerCollectionItem = {
  id: string;
  collection_id: string;
  sort: number;
  provider: string;
  source_id: string;
  title?: string | null;
  channel_title?: string | null;
  duration_sec?: number | null;
  start_sec: number;
  end_sec: number | null;
  answer_text: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type WorkerListPayload<TItem> = {
  ok?: boolean;
  data?: {
    items: TItem[];
    page: number;
    pageSize: number;
  };
  error?: string;
};

const fetchJson = async <T>(
  url: string,
  options?: RequestInit,
): Promise<ApiResult<T>> => {
  const res = await fetch(url, options);
  const payload = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, payload };
};

export const apiRefreshAuthToken = (apiUrl: string) =>
  fetchJson<AuthPayload>(`${apiUrl}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

export const apiFetchRooms = (apiUrl: string) =>
  fetchJson<RoomListPayload>(`${apiUrl}/api/rooms`);

export const apiFetchRoomById = (apiUrl: string, roomId: string) =>
  fetchJson<RoomByIdPayload>(`${apiUrl}/api/rooms/${roomId}`);

export const apiFetchYoutubePlaylists = (apiUrl: string, token: string) =>
  fetchJson<YoutubePlaylistsPayload>(`${apiUrl}/api/youtube/playlists`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const apiFetchYoutubePlaylistItems = (
  apiUrl: string,
  token: string,
  playlistId: string,
  startIndex?: number,
  pageSize?: number,
) => {
  const url = new URL(`${apiUrl}/api/youtube/playlist-items`);
  url.searchParams.set("playlistId", playlistId);
  if (startIndex !== undefined) {
    url.searchParams.set("startIndex", String(startIndex));
  }
  if (pageSize !== undefined) {
    url.searchParams.set("pageSize", String(pageSize));
  }
  return fetchJson<YoutubePlaylistItemsPayload>(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const apiAuthGoogle = (
  apiUrl: string,
  code: string,
  redirectUri: string,
) =>
  fetchJson<AuthPayload>(`${apiUrl}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code, redirectUri }),
  });

export const apiLogout = (apiUrl: string) =>
  fetchJson<{ ok?: boolean; error?: string }>(`${apiUrl}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

export const apiPreviewPlaylist = (
  apiUrl: string,
  url: string,
  playlistId?: string,
) =>
  fetchJson<PlaylistPreviewPayload>(`${apiUrl}/api/playlists/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, playlistId }),
  });

export const apiFetchCollections = (
  apiUrl: string,
  options: {
    token?: string | null;
    ownerId?: string;
    visibility?: "public" | "private";
    sort?: "updated" | "popular" | "favorites_first";
    pageSize?: number;
  },
) => {
  const url = new URL(`${apiUrl}/api/collections`);
  if (options.ownerId) {
    url.searchParams.set("owner_id", options.ownerId);
  }
  if (options.visibility) {
    url.searchParams.set("visibility", options.visibility);
  }
  if (options.sort) {
    url.searchParams.set("sort", options.sort);
  }
  if (options.pageSize !== undefined) {
    url.searchParams.set("pageSize", String(options.pageSize));
  }
  const headers = options.token
    ? { Authorization: `Bearer ${options.token}` }
    : undefined;
  return fetchJson<WorkerListPayload<WorkerCollection>>(url.toString(), {
    headers,
  });
};

export const apiFavoriteCollection = (
  apiUrl: string,
  token: string,
  collectionId: string,
) =>
  fetchJson<{
    ok?: boolean;
    data?: {
      collection_id: string;
      is_favorited: boolean;
      favorite_count: number;
    };
    error?: string;
  }>(`${apiUrl}/api/collections/${encodeURIComponent(collectionId)}/favorite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const apiUnfavoriteCollection = (
  apiUrl: string,
  token: string,
  collectionId: string,
) =>
  fetchJson<{
    ok?: boolean;
    data?: {
      collection_id: string;
      is_favorited: boolean;
      favorite_count: number;
    };
    error?: string;
  }>(`${apiUrl}/api/collections/${encodeURIComponent(collectionId)}/favorite`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const apiFetchCollectionItems = (
  apiUrl: string,
  token: string | null,
  collectionId: string,
  readToken?: string | null,
) => {
  const url = new URL(`${apiUrl}/api/collections/${collectionId}/items/all`);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (readToken) {
    headers["X-Collection-Read-Token"] = readToken;
  }
  return fetchJson<WorkerListPayload<WorkerCollectionItem>>(url.toString(), {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
};

export const apiCreateCollectionReadToken = (
  apiUrl: string,
  token: string,
  collectionId: string,
) =>
  fetchJson<{
    ok?: boolean;
    data?: { token: string; expiresAt: number };
    error?: string;
  }>(`${apiUrl}/api/collections/${collectionId}/read-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

