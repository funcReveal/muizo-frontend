import type {
  PlaylistItem,
  PlaylistPreviewSkippedItem,
  YoutubePlaylist,
} from "./types";

export type PlaylistSourceApiResult<T> = {
  ok: boolean;
  status: number;
  payload: T | null;
};

export type YoutubePlaylistsPayload = {
  ok?: boolean;
  data?: YoutubePlaylist[];
  error?: string;
  error_code?: string;
};

export type YoutubePlaylistItemsPayload = {
  ok?: boolean;
  data?: {
    playlistId: string;
    title?: string;
    items: PlaylistItem[];
    expectedCount?: number | null;
    skippedCount?: number;
    skippedItems?: PlaylistPreviewSkippedItem[];
  };
  error?: string;
  error_code?: string;
};

export type PlaylistPreviewPayload =
  | {
      playlistId: string;
      title?: string;
      items: PlaylistItem[];
      expectedCount: number | null;
      skippedCount: number;
      skippedItems?: PlaylistPreviewSkippedItem[];
    }
  | {
      error: string;
    };

const API_REQUEST_TIMEOUT_MS = 15_000;

const fetchJson = async <T>(
  url: string,
  options?: RequestInit,
): Promise<PlaylistSourceApiResult<T>> => {
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

export const apiPreviewPlaylist = (
  apiUrl: string,
  url: string,
  playlistId?: string,
  token?: string | null,
) =>
  fetchJson<PlaylistPreviewPayload>(`${apiUrl}/api/playlists/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url, playlistId }),
  });
