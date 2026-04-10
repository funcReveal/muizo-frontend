import { useCallback } from "react";

import { ensureFreshAuthToken } from "../../../shared/auth/token";
import { apiFetchYoutubePlaylistItems, apiPreviewPlaylist } from "./roomApi";
import type { YoutubePlaylist } from "./RoomContext";
import type { PlaylistItem } from "./types";
import { normalizePlaylistItems } from "./roomUtils";

interface UseRoomPlaylistSnapshotsParams {
  apiUrl: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  youtubePlaylists: YoutubePlaylist[];
  extractVideoIdFromUrl: (url: string) => string | null;
}

interface PlaylistSnapshot {
  items: PlaylistItem[];
  title: string | null;
  totalCount: number;
  sourceId: string;
}

export const useRoomPlaylistSnapshots = ({
  apiUrl,
  authToken,
  refreshAuthToken,
  youtubePlaylists,
  extractVideoIdFromUrl,
}: UseRoomPlaylistSnapshotsParams) => {
  const fetchYoutubeSnapshot = useCallback(
    async (playlistId: string): Promise<PlaylistSnapshot> => {
      if (!apiUrl) {
        throw new Error("尚未設定播放清單 API 位置 (API_URL)");
      }
      if (!authToken) {
        throw new Error("需要登入後才可匯入私人播放清單");
      }
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) {
        throw new Error("登入狀態已過期，請重新登入 Google");
      }
      const run = async (effectiveToken: string, allowRetry: boolean) => {
        const { ok, status, payload } = await apiFetchYoutubePlaylistItems(
          apiUrl,
          effectiveToken,
          playlistId,
        );
        if (ok) {
          const data = payload?.data;
          if (!data?.items || data.items.length === 0) {
            throw new Error("此播放清單沒有可用影片");
          }
          const normalized = normalizePlaylistItems(
            data.items.map((item) => {
              const resolvedVideoId = item.videoId ?? extractVideoIdFromUrl(item.url);
              return {
                ...item,
                ...(resolvedVideoId ? { videoId: resolvedVideoId } : {}),
                sourceId: resolvedVideoId ?? item.sourceId ?? null,
                provider: "youtube",
              };
            }),
          );
          const title =
            youtubePlaylists.find((item) => item.id === playlistId)?.title ?? null;
          return {
            items: normalized,
            title,
            totalCount: normalized.length,
            sourceId: data.playlistId ?? playlistId,
          };
        }
        if (status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return await run(refreshed, false);
          }
        }
        const message = payload?.error ?? "讀取播放清單失敗";
        throw new Error(message);
      };

      return await run(token, true);
    },
    [apiUrl, authToken, extractVideoIdFromUrl, refreshAuthToken, youtubePlaylists],
  );

  const fetchPublicPlaylistSnapshot = useCallback(
    async (url: string, playlistId: string): Promise<PlaylistSnapshot> => {
      if (!apiUrl) {
        throw new Error("尚未設定播放清單 API 位置 (API_URL)");
      }
      const { ok, payload } = await apiPreviewPlaylist(
        apiUrl,
        url,
        playlistId,
      );
      if (!ok || !payload) {
        throw new Error("讀取播放清單失敗，請稍後再試");
      }
      if ("error" in payload) {
        throw new Error(payload.error || "讀取播放清單失敗，請稍後再試");
      }
      const data = payload;
      if (!data?.items || data.items.length === 0) {
        throw new Error(
          "此播放清單沒有可用影片，請確認清單公開或包含可播放內容",
        );
      }
      const normalized = normalizePlaylistItems(
        data.items.map((item) => {
          const resolvedVideoId = item.videoId ?? extractVideoIdFromUrl(item.url);
          return {
            ...item,
            ...(resolvedVideoId ? { videoId: resolvedVideoId } : {}),
            sourceId: resolvedVideoId ?? item.sourceId ?? null,
            provider: "youtube",
          };
        }),
      );
      return {
        items: normalized,
        title: data.title ?? null,
        totalCount: normalized.length,
        sourceId: data.playlistId ?? playlistId,
      };
    },
    [apiUrl, extractVideoIdFromUrl],
  );

  return {
    fetchYoutubeSnapshot,
    fetchPublicPlaylistSnapshot,
  };
};

export default useRoomPlaylistSnapshots;

