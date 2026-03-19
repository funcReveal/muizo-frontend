import { useCallback, useRef, useState } from "react";

import type { PlaylistItem } from "./types";
import {
  apiFetchCollectionItems,
  apiFetchCollections,
  apiFavoriteCollection,
  apiUnfavoriteCollection,
  type CollectionItemRecord,
} from "./roomApi";
import {
  formatSeconds,
  normalizePlaylistItems,
  thumbnailFromId,
  videoUrlFromId,
} from "./roomUtils";
import { DEFAULT_CLIP_SEC, DEFAULT_PAGE_SIZE } from "./roomConstants";
import { ensureFreshAuthToken } from "../../../shared/auth/token";

const EMPTY_COLLECTION_RETRY_LIMIT = 2;

type UseRoomCollectionsOptions = {
  apiUrl?: string;
  authToken: string | null;
  ownerId?: string | null;
  refreshAuthToken: () => Promise<string | null>;
  setStatusText: (value: string | null) => void;
  onPlaylistLoaded: (
    items: PlaylistItem[],
    sourceId: string,
    title?: string | null,
  ) => void;
  onPlaylistReset: () => void;
};

export type UseRoomCollectionsResult = {
  collections: Array<{
    id: string;
    title: string;
    description?: string | null;
    visibility?: "private" | "public";
    cover_title?: string | null;
    cover_channel_title?: string | null;
    cover_thumbnail_url?: string | null;
    cover_duration_sec?: number | null;
    cover_source_id?: string | null;
    cover_provider?: string | null;
    item_count?: number;
    use_count?: number;
    favorite_count?: number;
    is_favorited?: boolean;
  }>;
  collectionsLoading: boolean;
  collectionsLoadingMore: boolean;
  collectionsHasMore: boolean;
  collectionsError: string | null;
  collectionScope: "owner" | "public" | null;
  publicCollectionsSort: "popular" | "favorites_first";
  setPublicCollectionsSort: (next: "popular" | "favorites_first") => void;
  collectionFavoriteUpdatingId: string | null;
  collectionsLastFetchedAt: number | null;
  selectedCollectionId: string | null;
  collectionItemsLoading: boolean;
  collectionItemsError: string | null;
  selectCollection: (collectionId: string | null) => void;
  fetchCollections: (
    scope?: "owner" | "public",
    options?: { query?: string },
  ) => Promise<void>;
  loadMoreCollections: () => Promise<void>;
  toggleCollectionFavorite: (collectionId: string) => Promise<boolean>;
  loadCollectionItems: (
    collectionId: string,
    options?: { readToken?: string | null; force?: boolean },
  ) => Promise<void>;
  resetCollectionsState: () => void;
  resetCollectionSelection: () => void;
  clearCollectionsError: () => void;
};

export const useRoomCollections = ({
  apiUrl,
  authToken,
  ownerId,
  refreshAuthToken,
  setStatusText,
  onPlaylistLoaded,
  onPlaylistReset,
}: UseRoomCollectionsOptions): UseRoomCollectionsResult => {
  const [collections, setCollections] = useState<
    Array<{
      id: string;
      title: string;
      description?: string | null;
      visibility?: "private" | "public";
      cover_title?: string | null;
      cover_channel_title?: string | null;
      cover_thumbnail_url?: string | null;
      cover_duration_sec?: number | null;
      cover_source_id?: string | null;
      cover_provider?: string | null;
      item_count?: number;
      use_count?: number;
      favorite_count?: number;
      is_favorited?: boolean;
    }>
  >([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsLoadingMore, setCollectionsLoadingMore] = useState(false);
  const [collectionsHasMore, setCollectionsHasMore] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionItemsLoading, setCollectionItemsLoading] = useState(false);
  const [collectionItemsError, setCollectionItemsError] = useState<string | null>(null);
  const [collectionScope, setCollectionScope] = useState<"owner" | "public" | null>(
    null,
  );
  const [publicCollectionsSort, setPublicCollectionsSort] =
    useState<"popular" | "favorites_first">("popular");
  const [collectionFavoriteUpdatingId, setCollectionFavoriteUpdatingId] =
    useState<string | null>(null);
  const [collectionsLastFetchedAt, setCollectionsLastFetchedAt] = useState<number | null>(
    null,
  );
  const collectionPageRef = useRef(1);
  const collectionRequestScopeRef = useRef<"owner" | "public" | null>(null);
  const publicCollectionsQueryRef = useRef("");
  const collectionCacheRef = useRef<Record<string, PlaylistItem[]>>({});
  const inFlightCollectionIdRef = useRef<string | null>(null);
  const latestLoadRequestIdRef = useRef(0);
  const emptyCollectionRetryCountRef = useRef<Record<string, number>>({});
  const pausedEmptyCollectionRef = useRef<Record<string, boolean>>({});

  const selectCollection = useCallback((collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
    setCollectionItemsError(null);
  }, []);

  const fetchCollections = useCallback(
    async (scope?: "owner" | "public", options?: { query?: string }) => {
      if (!apiUrl) {
        setCollectionsError("尚未設定收藏庫 API 位置 (API_URL)");
        return;
      }
      const resolvedScope = scope ?? (authToken && ownerId ? "owner" : "public");
      const normalizedQuery =
        resolvedScope === "public" ? (options?.query ?? publicCollectionsQueryRef.current).trim() : "";
      collectionRequestScopeRef.current = resolvedScope;
      if (resolvedScope === "public") {
        publicCollectionsQueryRef.current = normalizedQuery;
      }
      collectionPageRef.current = 1;
      setCollectionScope(resolvedScope);
      if (resolvedScope === "owner") {
        if (!authToken) {
          setCollectionsError("請先登入後再載入收藏庫");
          return;
        }
        if (!ownerId) {
          setCollectionsError("找不到使用者識別，無法載入收藏庫");
          return;
        }
      }
      setCollectionsLoading(true);
      setCollectionsLoadingMore(false);
      setCollectionsHasMore(false);
      setCollectionsError(null);
      if (resolvedScope === "public") {
        setCollections([]);
      }
      try {
        const applyCollectionsResult = (
          items: Array<{
            id: string;
            title: string;
            description?: string | null;
            visibility?: "private" | "public";
            cover_title?: string | null;
            cover_channel_title?: string | null;
            cover_thumbnail_url?: string | null;
            cover_duration_sec?: number | null;
            cover_source_id?: string | null;
            cover_provider?: string | null;
            item_count?: number;
            use_count?: number;
            favorite_count?: number;
            is_favorited?: boolean | number;
          }>,
        ) => {
          collectionPageRef.current = 1;
          setCollections(
            items.map((item) => ({
              ...item,
              item_count: Math.max(0, Number(item.item_count ?? 0)),
              use_count: Math.max(0, Number(item.use_count ?? 0)),
              favorite_count: Math.max(0, Number(item.favorite_count ?? 0)),
              is_favorited: Boolean(item.is_favorited),
            })),
          );
          setCollectionsHasMore(items.length >= DEFAULT_PAGE_SIZE);
          setCollectionsLastFetchedAt(Date.now());
          setSelectedCollectionId((currentSelection) =>
            currentSelection && items.some((item) => item.id === currentSelection)
              ? currentSelection
              : null,
          );
        };

        if (resolvedScope === "public") {
          const { ok, payload } = await apiFetchCollections(apiUrl, {
            visibility: "public",
            sort: publicCollectionsSort,
            q: normalizedQuery || undefined,
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
          });
          if (!ok) {
            throw new Error(payload?.error ?? "載入公開收藏庫失敗");
          }
          const items = payload?.data?.items ?? [];
          applyCollectionsResult(items);
          return;
        }

        const token = await ensureFreshAuthToken({ token: authToken, refreshAuthToken });
        if (!token) {
          throw new Error("登入已過期，請重新登入");
        }
        const run = async (token: string, allowRetry: boolean) => {
          const { ok, status, payload } = await apiFetchCollections(apiUrl, {
            token,
            ownerId: ownerId ?? undefined,
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
          });
          if (ok) {
            const items = payload?.data?.items ?? [];
            applyCollectionsResult(items);
            return;
          }
          if (status === 401 && allowRetry) {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
              await run(refreshed, false);
              return;
            }
          }
          throw new Error(payload?.error ?? "載入收藏庫失敗");
        };

        await run(token, true);
      } catch (error) {
        setCollectionsError(error instanceof Error ? error.message : "載入收藏庫失敗");
      } finally {
        setCollectionsLoading(false);
      }
    },
    [authToken, ownerId, publicCollectionsSort, refreshAuthToken, apiUrl],
  );

  const loadMoreCollections = useCallback(async () => {
    if (!apiUrl) return;
    const resolvedScope = collectionRequestScopeRef.current ?? collectionScope;
    if (!resolvedScope || collectionsLoading || collectionsLoadingMore || !collectionsHasMore) {
      return;
    }
    if (resolvedScope === "owner" && (!authToken || !ownerId)) {
      return;
    }

    const nextPage = collectionPageRef.current + 1;
    setCollectionsLoadingMore(true);

    const appendCollections = (
      items: Array<{
        id: string;
        title: string;
        description?: string | null;
        visibility?: "private" | "public";
        cover_title?: string | null;
        cover_channel_title?: string | null;
        cover_thumbnail_url?: string | null;
        cover_duration_sec?: number | null;
        cover_source_id?: string | null;
        cover_provider?: string | null;
        item_count?: number;
        use_count?: number;
        favorite_count?: number;
        is_favorited?: boolean | number;
      }>,
    ) => {
      const normalizedItems = items.map((item) => ({
        ...item,
        item_count: Math.max(0, Number(item.item_count ?? 0)),
        use_count: Math.max(0, Number(item.use_count ?? 0)),
        favorite_count: Math.max(0, Number(item.favorite_count ?? 0)),
        is_favorited: Boolean(item.is_favorited),
      }));
      setCollections((prev) => {
        const nextMap = new Map(prev.map((item) => [item.id, item]));
        normalizedItems.forEach((item) => {
          nextMap.set(item.id, item);
        });
        return Array.from(nextMap.values());
      });
      collectionPageRef.current = nextPage;
      setCollectionsHasMore(items.length >= DEFAULT_PAGE_SIZE);
      setCollectionsLastFetchedAt(Date.now());
    };

    try {
      if (resolvedScope === "public") {
        const { ok, payload } = await apiFetchCollections(apiUrl, {
          visibility: "public",
          sort: publicCollectionsSort,
          q: publicCollectionsQueryRef.current || undefined,
          page: nextPage,
          pageSize: DEFAULT_PAGE_SIZE,
        });
        if (!ok) {
          throw new Error(payload?.error ?? "載入公開收藏庫失敗");
        }
        appendCollections(payload?.data?.items ?? []);
        return;
      }

      const token = await ensureFreshAuthToken({ token: authToken, refreshAuthToken });
      if (!token) {
        throw new Error("登入已過期，請重新登入");
      }

      const run = async (token: string, allowRetry: boolean) => {
        const { ok, status, payload } = await apiFetchCollections(apiUrl, {
          token,
          ownerId: ownerId ?? undefined,
          page: nextPage,
          pageSize: DEFAULT_PAGE_SIZE,
        });
        if (ok) {
          appendCollections(payload?.data?.items ?? []);
          return;
        }
        if (status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            await run(refreshed, false);
            return;
          }
        }
        throw new Error(payload?.error ?? "載入收藏庫失敗");
      };

      await run(token, true);
    } catch (error) {
      setCollectionsError(error instanceof Error ? error.message : "載入收藏庫失敗");
    } finally {
      setCollectionsLoadingMore(false);
    }
  }, [
    apiUrl,
    authToken,
    collectionScope,
    collectionsHasMore,
    collectionsLoading,
    collectionsLoadingMore,
    ownerId,
    publicCollectionsSort,
    refreshAuthToken,
  ]);

  const toggleCollectionFavorite = useCallback(
    async (collectionId: string) => {
      if (!apiUrl) {
        setStatusText("尚未設定收藏庫 API 位置 (API_URL)");
        return false;
      }
      if (!authToken) {
        setStatusText("請先登入後再操作收藏");
        return false;
      }
      const target = collections.find((item) => item.id === collectionId);
      if (!target) return false;
      if (target.visibility && target.visibility !== "public") {
        setStatusText("私密收藏庫無法加入收藏");
        return false;
      }
      if (collectionFavoriteUpdatingId === collectionId) {
        return false;
      }

      const wasFavorited = Boolean(target.is_favorited);
      const previousCount = Math.max(0, Number(target.favorite_count ?? 0));
      const optimisticFavorited = !wasFavorited;
      const optimisticCount = Math.max(0, previousCount + (optimisticFavorited ? 1 : -1));

      setCollectionFavoriteUpdatingId(collectionId);
      setCollections((prev) =>
        prev.map((item) =>
          item.id === collectionId
            ? {
                ...item,
                is_favorited: optimisticFavorited,
                favorite_count: optimisticCount,
              }
            : item,
        ),
      );

      try {
        const freshToken = await ensureFreshAuthToken({ token: authToken, refreshAuthToken });
        if (!freshToken) {
          throw new Error("登入已過期，請重新登入");
        }

        const run = async (token: string, allowRetry: boolean): Promise<void> => {
          const result = wasFavorited
            ? await apiUnfavoriteCollection(apiUrl, token, collectionId)
            : await apiFavoriteCollection(apiUrl, token, collectionId);
          if (result.ok && result.payload?.data) {
            setCollections((prev) =>
              prev.map((item) =>
                item.id === collectionId
                  ? {
                      ...item,
                      is_favorited: Boolean(result.payload?.data?.is_favorited),
                      favorite_count: Math.max(
                        0,
                        Number(result.payload?.data?.favorite_count ?? 0),
                      ),
                    }
                  : item,
              ),
            );
            return;
          }
          if (result.status === 401 && allowRetry) {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
              await run(refreshed, false);
              return;
            }
          }
          throw new Error(result.payload?.error ?? "更新收藏狀態失敗");
        };

        await run(freshToken, true);
        setStatusText(optimisticFavorited ? "已加入收藏" : "已取消收藏");
        return true;
      } catch (error) {
        setCollections((prev) =>
          prev.map((item) =>
            item.id === collectionId
              ? {
                  ...item,
                  is_favorited: wasFavorited,
                  favorite_count: previousCount,
                }
              : item,
          ),
        );
        setStatusText(error instanceof Error ? error.message : "更新收藏狀態失敗");
        return false;
      } finally {
        setCollectionFavoriteUpdatingId((prev) => (prev === collectionId ? null : prev));
      }
    },
    [
      authToken,
      collectionFavoriteUpdatingId,
      collections,
      refreshAuthToken,
      setStatusText,
      apiUrl,
    ],
  );

  const loadCollectionItems = useCallback(
    async (
      collectionId: string,
      options?: { readToken?: string | null; force?: boolean },
    ) => {
      if (!apiUrl) {
        setCollectionItemsError("尚未設定收藏庫 API 位置 (API_URL)");
        return;
      }
      if (!collectionId) {
        setCollectionItemsError("請先選擇收藏庫");
        return;
      }
      if (!options?.force && pausedEmptyCollectionRef.current[collectionId]) {
        const message = "這個收藏庫目前沒有歌曲，請先補內容再試。";
        setCollectionItemsError(message);
        setStatusText(message);
        return;
      }
      if (inFlightCollectionIdRef.current === collectionId) {
        return;
      }
      const collectionTitle = collections.find((item) => item.id === collectionId)?.title ?? null;
      if (!options?.force) {
        const cachedItems = collectionCacheRef.current[collectionId];
        if (cachedItems && cachedItems.length > 0) {
          onPlaylistReset();
          setCollectionItemsError(null);
          setSelectedCollectionId(collectionId);
          onPlaylistLoaded(cachedItems, collectionId, collectionTitle);
          setStatusText(`已載入收藏庫，共 ${cachedItems.length} 首`);
          return;
        }
      }
      const requestId = ++latestLoadRequestIdRef.current;
      inFlightCollectionIdRef.current = collectionId;
      setCollectionItemsLoading(true);
      setCollectionItemsError(null);
      onPlaylistReset();
      setSelectedCollectionId(collectionId);
      try {
        const mapItems = (items: CollectionItemRecord[]) =>
          items.map((item, index) => {
            const startSec = Math.max(0, item.start_sec ?? 0);
            const explicitEndSec =
              typeof item.end_sec === "number" && item.end_sec > startSec
                ? item.end_sec
                : null;
            const hasExplicitEndSec = explicitEndSec !== null;
            const hasExplicitStartSec = startSec > 0;
            const safeEnd = Math.max(startSec + 1, explicitEndSec ?? startSec + DEFAULT_CLIP_SEC);
            const provider = (item.provider || "manual").trim().toLowerCase();
            const sourceId = (item.source_id || "").trim();
            const videoId = provider === "youtube" ? sourceId : "";
            const durationValue =
              typeof item.duration_sec === "number" && item.duration_sec > 0
                ? formatSeconds(item.duration_sec)
                : formatSeconds(safeEnd - startSec);
            const rawTitle = item.title ?? item.answer_text ?? `歌曲 ${index + 1}`;
            const answerText = item.answer_text ?? rawTitle;
            const resolvedUrl = videoId
              ? videoUrlFromId(videoId)
              : sourceId.startsWith("http")
                ? sourceId
                : "";
            return {
              title: rawTitle,
              answerText,
              url: resolvedUrl,
              thumbnail: videoId ? thumbnailFromId(videoId) : undefined,
              uploader: item.channel_title ?? undefined,
              duration: durationValue,
              startSec,
              endSec: safeEnd,
              hasExplicitStartSec,
              hasExplicitEndSec,
              collectionClipStartSec: startSec,
              collectionClipEndSec: explicitEndSec ?? undefined,
              collectionHasExplicitStartSec: hasExplicitStartSec,
              collectionHasExplicitEndSec: hasExplicitEndSec,
              ...(videoId ? { videoId } : {}),
              sourceId: sourceId || null,
              provider,
            };
          });

        const handleSuccess = (items: CollectionItemRecord[]) => {
          if (requestId !== latestLoadRequestIdRef.current) {
            return;
          }
          if (items.length === 0) {
            const retries = (emptyCollectionRetryCountRef.current[collectionId] ?? 0) + 1;
            emptyCollectionRetryCountRef.current[collectionId] = retries;
            if (retries >= EMPTY_COLLECTION_RETRY_LIMIT) {
              pausedEmptyCollectionRef.current[collectionId] = true;
              throw new Error("收藏庫目前沒有歌曲，請先補內容再試。");
            }
            throw new Error(
              `收藏庫目前沒有歌曲，請稍後重試（${retries}/${EMPTY_COLLECTION_RETRY_LIMIT}）`,
            );
          }
          const normalizedItems = normalizePlaylistItems(mapItems(items));
          delete emptyCollectionRetryCountRef.current[collectionId];
          delete pausedEmptyCollectionRef.current[collectionId];
          collectionCacheRef.current[collectionId] = normalizedItems;
          onPlaylistLoaded(normalizedItems, collectionId, collectionTitle);
          setStatusText(`已載入收藏庫，共 ${normalizedItems.length} 首`);
        };

        if (!authToken) {
          const { ok, payload } = await apiFetchCollectionItems(
            apiUrl,
            null,
            collectionId,
            options?.readToken ?? null,
          );
          if (!ok || !payload?.data?.items) {
            throw new Error(payload?.error ?? "載入收藏庫失敗");
          }
          handleSuccess(payload.data.items);
        } else {
          const token = await ensureFreshAuthToken({ token: authToken, refreshAuthToken });
          if (!token) {
            throw new Error("登入已過期，請重新登入");
          }
          const run = async (token: string, allowRetry: boolean) => {
            const { ok, status, payload } = await apiFetchCollectionItems(
              apiUrl,
              token,
              collectionId,
              options?.readToken ?? null,
            );
            if (ok) {
              handleSuccess(payload?.data?.items ?? []);
              return;
            }
            if (status === 401 && allowRetry) {
              const refreshed = await refreshAuthToken();
              if (refreshed) {
                await run(refreshed, false);
                return;
              }
            }
            throw new Error(payload?.error ?? "載入收藏庫失敗");
          };

          await run(token, true);
        }
      } catch (error) {
        if (requestId !== latestLoadRequestIdRef.current) {
          return;
        }
        setCollectionItemsError(error instanceof Error ? error.message : "載入收藏庫失敗");
        onPlaylistReset();
      } finally {
        if (requestId === latestLoadRequestIdRef.current) {
          if (inFlightCollectionIdRef.current === collectionId) {
            inFlightCollectionIdRef.current = null;
          }
          setCollectionItemsLoading(false);
        }
      }
    },
    [
      authToken,
      onPlaylistLoaded,
      onPlaylistReset,
      refreshAuthToken,
      setStatusText,
      apiUrl,
      collections,
    ],
  );

  const resetCollectionsState = useCallback(() => {
    setCollections([]);
    setCollectionsLoading(false);
    setCollectionsLoadingMore(false);
    setCollectionsHasMore(false);
    setCollectionsError(null);
    setCollectionScope(null);
    setPublicCollectionsSort("popular");
    setCollectionFavoriteUpdatingId(null);
    setCollectionsLastFetchedAt(null);
    collectionPageRef.current = 1;
    collectionRequestScopeRef.current = null;
    publicCollectionsQueryRef.current = "";
    setSelectedCollectionId(null);
    setCollectionItemsLoading(false);
    setCollectionItemsError(null);
    collectionCacheRef.current = {};
    inFlightCollectionIdRef.current = null;
    latestLoadRequestIdRef.current = 0;
    emptyCollectionRetryCountRef.current = {};
    pausedEmptyCollectionRef.current = {};
  }, []);

  const resetCollectionSelection = useCallback(() => {
    setSelectedCollectionId(null);
    setCollectionItemsLoading(false);
    setCollectionItemsError(null);
  }, []);

  const clearCollectionsError = useCallback(() => {
    setCollectionsError(null);
  }, []);

  return {
    collections,
    collectionsLoading,
    collectionsLoadingMore,
    collectionsHasMore,
    collectionsError,
    collectionScope,
    publicCollectionsSort,
    setPublicCollectionsSort,
    collectionFavoriteUpdatingId,
    collectionsLastFetchedAt,
    selectedCollectionId,
    collectionItemsLoading,
    collectionItemsError,
    selectCollection,
    fetchCollections,
    loadMoreCollections,
    toggleCollectionFavorite,
    loadCollectionItems,
    resetCollectionsState,
    resetCollectionSelection,
    clearCollectionsError,
  };
};

