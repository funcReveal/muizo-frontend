import { useCallback } from "react";

import { ensureFreshAuthToken } from "../../../shared/auth/token";
import { apiCreateCollectionReadToken, apiFetchCollectionItems } from "./roomApi";
import { mapCollectionItemsToPlaylist } from "./roomProviderUtils";
import type { PlaylistItem } from "./types";
import { normalizePlaylistItems } from "./roomUtils";

type UseRoomProviderCollectionAccessArgs = {
  apiUrl: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
};

type UseRoomProviderCollectionAccessResult = {
  fetchCollectionSnapshot: (collectionId: string) => Promise<PlaylistItem[]>;
  createCollectionReadToken: (collectionId: string) => Promise<string>;
};

export const useRoomProviderCollectionAccess = ({
  apiUrl,
  authToken,
  refreshAuthToken,
}: UseRoomProviderCollectionAccessArgs): UseRoomProviderCollectionAccessResult => {
  const fetchCollectionSnapshot = useCallback(
    async (collectionId: string) => {
      if (!apiUrl) {
        throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
      }
      if (!collectionId) {
        throw new Error("請先提供收藏庫 ID");
      }
      const tokenToUse = authToken
        ? await ensureFreshAuthToken({ token: authToken, refreshAuthToken })
        : null;
      if (authToken && !tokenToUse) {
        throw new Error("登入已過期，請重新登入");
      }
      const run = async (token: string | null, allowRetry: boolean) => {
        const { ok, status, payload } = await apiFetchCollectionItems(
          apiUrl,
          token,
          collectionId,
        );
        if (ok) {
          const items = payload?.data?.items ?? [];
          if (items.length === 0) {
            throw new Error("收藏庫沒有可用曲目");
          }
          return normalizePlaylistItems(
            mapCollectionItemsToPlaylist(collectionId, items),
          );
        }
        if (status === 401 && allowRetry && token) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return await run(refreshed, false);
          }
        }
        throw new Error(payload?.error ?? "讀取收藏庫失敗");
      };
      return await run(tokenToUse, Boolean(tokenToUse));
    },
    [apiUrl, authToken, refreshAuthToken],
  );

  const createCollectionReadToken = useCallback(
    async (collectionId: string) => {
      if (!apiUrl) {
        throw new Error("尚未設定收藏庫 API 位置 (API_URL)");
      }
      if (!authToken) {
        throw new Error("請先登入後再分享收藏庫");
      }
      const tokenToUse = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!tokenToUse) {
        throw new Error("登入已過期，請重新登入");
      }
      const run = async (token: string, allowRetry: boolean) => {
        const { ok, status, payload } = await apiCreateCollectionReadToken(
          apiUrl,
          token,
          collectionId,
        );
        if (ok && payload?.data?.token) return payload.data.token;
        if (status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return await run(refreshed, false);
          }
        }
        throw new Error(payload?.error ?? "建立收藏庫讀取權杖失敗");
      };
      return await run(tokenToUse, true);
    },
    [apiUrl, authToken, refreshAuthToken],
  );

  return {
    fetchCollectionSnapshot,
    createCollectionReadToken,
  };
};
