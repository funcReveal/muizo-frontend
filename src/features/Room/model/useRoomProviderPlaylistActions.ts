import { useCallback } from "react";

import {
  CHUNK_SIZE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
} from "./roomConstants";
import { buildUploadPlaylistItems, formatAckError } from "./roomProviderUtils";
import { clampPlayDurationSec, clampStartOffsetSec } from "./roomUtils";
import type {
  Ack,
  ClientSocket,
  GameState,
  PlaylistItem,
  PlaylistSourceType,
  PlaylistSuggestion,
  RoomState,
} from "./types";

type SnapshotResult = {
  items: PlaylistItem[];
  title?: string | null;
  totalCount?: number;
  sourceId?: string | null;
};

interface UseRoomProviderPlaylistActionsParams {
  getSocket: () => ClientSocket | null;
  currentRoom: RoomState["room"] | null;
  gameStateStatus?: GameState["status"];
  setStatusText: (value: string | null) => void;
  collections: Array<{ id: string; visibility?: string }>;
  authUserId: string | null;
  authToken: string | null;
  createCollectionReadToken: (collectionId: string) => Promise<string>;
  fetchCollectionSnapshot: (collectionId: string) => Promise<PlaylistItem[]>;
  fetchYoutubeSnapshot: (playlistId: string) => Promise<{
    items: PlaylistItem[];
    title: string | null;
    totalCount: number;
    sourceId: string;
  }>;
  fetchPublicPlaylistSnapshot: (
    url: string,
    playlistId: string,
  ) => Promise<{
    items: PlaylistItem[];
    title: string | null;
    totalCount: number;
    sourceId: string;
  }>;
  playlistItems: PlaylistItem[];
  lastFetchedPlaylistId: string | null;
  lastFetchedPlaylistTitle: string | null;
  applyPlaylistSource: (
    items: PlaylistItem[],
    sourceId: string,
    title?: string | null,
  ) => void;
  handleFetchPlaylist: (options?: {
    url?: string;
    force?: boolean;
    lock?: boolean;
  }) => Promise<void>;
  handleResetPlaylist: () => void;
  setPlaylistUrl: (value: string) => void;
}

const uploadPlaylistChunks = async (
  socket: ClientSocket,
  roomId: string,
  uploadId: string,
  chunks: PlaylistItem[],
) => {
  for (let i = 0; i < chunks.length; i += CHUNK_SIZE) {
    const chunk = chunks.slice(i, i + CHUNK_SIZE);
    const isLastChunk = i + CHUNK_SIZE >= chunks.length;
    await new Promise<void>((resolve) => {
      socket.emit(
        "uploadPlaylistChunk",
        {
          roomId,
          uploadId,
          items: chunk,
          isLast: isLastChunk,
        },
        () => resolve(),
      );
    });
  }
};

export const useRoomProviderPlaylistActions = ({
  getSocket,
  currentRoom,
  gameStateStatus,
  setStatusText,
  collections,
  authUserId,
  authToken,
  createCollectionReadToken,
  fetchCollectionSnapshot,
  fetchYoutubeSnapshot,
  fetchPublicPlaylistSnapshot,
  playlistItems,
  lastFetchedPlaylistId,
  lastFetchedPlaylistTitle,
  applyPlaylistSource,
  handleFetchPlaylist,
  handleResetPlaylist,
  setPlaylistUrl,
}: UseRoomProviderPlaylistActionsParams) => {
  const extractPlaylistIdFromUrl = (url: string) => {
    try {
      const parsed = new URL(url.trim());
      const listId = parsed.searchParams.get("list");
      if (listId) return listId;
      const segments = parsed.pathname.split("/");
      const last = segments[segments.length - 1];
      return last || null;
    } catch {
      return null;
    }
  };

  const resolveCollectionSourceType = useCallback(
    (collectionId: string) => {
      const selectedCollection = collections.find((item) => item.id === collectionId);
      return selectedCollection?.visibility === "private"
        ? "private_collection"
        : "public_collection";
    },
    [collections],
  );

  const resolvePlaylistSourceType = useCallback(
    (sourceId: string | null | undefined): PlaylistSourceType => {
      if (sourceId && collections.some((item) => item.id === sourceId)) {
        return resolveCollectionSourceType(sourceId);
      }
      return authToken ? "youtube_google_import" : "youtube_pasted_link";
    },
    [authToken, collections, resolveCollectionSourceType],
  );

  const uploadPlaylistSelection = useCallback(
    async ({
      items,
      sourceId,
      title,
      sourceType,
      playlistUrl,
    }: {
      items: PlaylistItem[];
      sourceId: string;
      title?: string | null;
      sourceType: PlaylistSourceType;
      playlistUrl?: string | null;
    }) => {
      const socket = getSocket();
      if (!socket || !currentRoom) return false;
      if (gameStateStatus === "playing") {
        setStatusText("遊戲進行中，暫時無法切換播放來源");
        return false;
      }
      if (!items.length || !sourceId) {
        setStatusText("找不到可套用的播放清單內容");
        return false;
      }

      const uploadId =
        crypto.randomUUID?.() ??
        `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
      const roomPlayDurationSec = clampPlayDurationSec(
        currentRoom.gameSettings?.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
      );
      const roomStartOffsetSec = clampStartOffsetSec(
        currentRoom.gameSettings?.startOffsetSec ?? DEFAULT_START_OFFSET_SEC,
      );
      const roomAllowCollectionClipTiming =
        currentRoom.gameSettings?.allowCollectionClipTiming ?? true;
      const uploadItems = buildUploadPlaylistItems(items, {
        playDurationSec: roomPlayDurationSec,
        startOffsetSec: roomStartOffsetSec,
        allowCollectionClipTiming: roomAllowCollectionClipTiming,
      });
      const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
      const remaining = uploadItems.slice(CHUNK_SIZE);
      const isLast = remaining.length === 0;

      return await new Promise<boolean>((resolve) => {
        socket.emit(
          "changePlaylist",
          {
            roomId: currentRoom.id,
            playlist: {
              uploadId,
              id: sourceId,
              title: title ?? undefined,
              sourceType,
              totalCount: uploadItems.length,
              items: firstChunk,
              isLast,
              pageSize: DEFAULT_PAGE_SIZE,
            },
          },
          async (
            ack: Ack<{ receivedCount: number; totalCount: number; ready: boolean }>,
          ) => {
            if (!ack) {
              resolve(false);
              return;
            }
            if (!ack.ok) {
              setStatusText(formatAckError("套用播放來源失敗", ack.error));
              resolve(false);
              return;
            }
            applyPlaylistSource(items, sourceId, title ?? null);
            if (typeof playlistUrl === "string") {
              setPlaylistUrl(playlistUrl);
            }
            if (remaining.length > 0) {
              await uploadPlaylistChunks(socket, currentRoom.id, uploadId, remaining);
            }
            setStatusText("已更新房間播放來源");
            resolve(true);
          },
        );
      });
    },
    [applyPlaylistSource, currentRoom, gameStateStatus, getSocket, setPlaylistUrl, setStatusText],
  );

  const handleSuggestPlaylist = useCallback(
    async (
      type: "collection" | "playlist",
      value: string,
      options?: {
        useSnapshot?: boolean;
        sourceId?: string | null;
        title?: string | null;
      },
    ) => {
      const socket = getSocket();
      if (!socket || !currentRoom) {
        const error = "目前無法送出推薦";
        setStatusText(error);
        return { ok: false, error };
      }
      if (gameStateStatus === "playing") {
        const error = "遊戲進行中，暫時無法推薦播放清單";
        setStatusText(error);
        return { ok: false, error };
      }

      let snapshot: SnapshotResult | undefined;
      let readToken: string | null = null;
      if (options?.useSnapshot) {
        try {
          if (type === "collection") {
            const selectedCollection = collections.find((item) => item.id === value);
            const isPrivateCollection = selectedCollection?.visibility === "private";
            if (isPrivateCollection) {
              if (!authUserId) {
                throw new Error("需要登入後才能讀取私人收藏庫");
              }
              readToken = await createCollectionReadToken(value);
            }
            const items = await fetchCollectionSnapshot(value);
            snapshot = {
              items,
              title: options?.title ?? null,
              totalCount: items.length,
              sourceId: options?.sourceId ?? value,
            };
          } else {
            const playlistId = options?.sourceId;
            if (!playlistId) {
              throw new Error("缺少播放清單 ID");
            }
            const result = authToken
              ? await fetchYoutubeSnapshot(playlistId)
              : await fetchPublicPlaylistSnapshot(value, playlistId);
            snapshot = {
              items: result.items,
              title: result.title ?? options?.title ?? null,
              totalCount: result.totalCount,
              sourceId: result.sourceId ?? playlistId,
            };
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "整理推薦內容失敗";
          setStatusText(message);
          return { ok: false, error: message };
        }
      }

      return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        socket.emit(
          "suggestPlaylist",
          {
            roomId: currentRoom.id,
            type,
            value,
            title: snapshot?.title ?? options?.title ?? undefined,
            totalCount: snapshot?.totalCount,
            sourceId: snapshot?.sourceId ?? options?.sourceId ?? undefined,
            items: snapshot?.items,
            readToken: readToken ?? undefined,
            sourceType:
              type === "collection"
                ? resolveCollectionSourceType(snapshot?.sourceId ?? options?.sourceId ?? value)
                : authToken
                  ? "youtube_google_import"
                  : "youtube_pasted_link",
          },
          (ack: Ack<null>) => {
            if (!ack) {
              resolve({ ok: false, error: "推薦送出失敗" });
              return;
            }
            if (!ack.ok) {
              const message = formatAckError("推薦送出失敗", ack.error);
              setStatusText(message);
              resolve({ ok: false, error: message });
              return;
            }
            setStatusText("已送出推薦");
            resolve({ ok: true });
          },
        );
      });
    },
    [
      authToken,
      authUserId,
      collections,
      createCollectionReadToken,
      currentRoom,
      fetchCollectionSnapshot,
      fetchPublicPlaylistSnapshot,
      fetchYoutubeSnapshot,
      gameStateStatus,
      getSocket,
      resolveCollectionSourceType,
      setStatusText,
    ],
  );

  const handleFetchPlaylistByUrl = useCallback(
    async (url: string) => {
      handleResetPlaylist();
      setPlaylistUrl(url);
      await handleFetchPlaylist({ url, force: true, lock: false });
    },
    [handleFetchPlaylist, handleResetPlaylist, setPlaylistUrl],
  );

  const handleChangePlaylist = useCallback(async () => {
    if (!playlistItems.length || !lastFetchedPlaylistId) {
      setStatusText("請先準備好要套用的播放清單");
      return;
    }
    await uploadPlaylistSelection({
      items: playlistItems,
      sourceId: lastFetchedPlaylistId,
      title: lastFetchedPlaylistTitle ?? null,
      sourceType: resolvePlaylistSourceType(lastFetchedPlaylistId),
      playlistUrl: lastFetchedPlaylistId.includes("http") ? lastFetchedPlaylistId : undefined,
    });
  }, [
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    playlistItems,
    resolvePlaylistSourceType,
    setStatusText,
    uploadPlaylistSelection,
  ]);

  const handleApplyPlaylistUrlDirect = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      const playlistId = extractPlaylistIdFromUrl(trimmed);
      if (!playlistId) {
        setStatusText("請輸入有效的 YouTube 播放清單連結");
        return false;
      }
      try {
        const result = await fetchPublicPlaylistSnapshot(trimmed, playlistId);
        return await uploadPlaylistSelection({
          items: result.items,
          sourceId: result.sourceId ?? playlistId,
          title: result.title ?? null,
          sourceType: resolvePlaylistSourceType(result.sourceId ?? playlistId),
          playlistUrl: trimmed,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "讀取播放清單失敗";
        setStatusText(message);
        return false;
      }
    },
    [fetchPublicPlaylistSnapshot, resolvePlaylistSourceType, setStatusText, uploadPlaylistSelection],
  );

  const handleApplyCollectionDirect = useCallback(
    async (collectionId: string, title?: string | null) => {
      try {
        const items = await fetchCollectionSnapshot(collectionId);
        return await uploadPlaylistSelection({
          items,
          sourceId: collectionId,
          title: title ?? null,
          sourceType: resolveCollectionSourceType(collectionId),
          playlistUrl: "",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "載入收藏庫失敗";
        setStatusText(message);
        return false;
      }
    },
    [fetchCollectionSnapshot, resolveCollectionSourceType, setStatusText, uploadPlaylistSelection],
  );

  const handleApplyYoutubePlaylistDirect = useCallback(
    async (playlistId: string, title?: string | null) => {
      try {
        const result = await fetchYoutubeSnapshot(playlistId);
        return await uploadPlaylistSelection({
          items: result.items,
          sourceId: result.sourceId ?? playlistId,
          title: result.title ?? title ?? null,
          sourceType: "youtube_google_import",
          playlistUrl: "",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "載入 YouTube 播放清單失敗";
        setStatusText(message);
        return false;
      }
    },
    [fetchYoutubeSnapshot, setStatusText, uploadPlaylistSelection],
  );

  const handleApplySuggestionSnapshot = useCallback(
    async (suggestion: PlaylistSuggestion) => {
      const items = suggestion.items ?? [];
      if (!items.length) {
        setStatusText("推薦內容沒有可套用的歌曲");
        return;
      }
      const sourceId = suggestion.sourceId ?? suggestion.value;
      await uploadPlaylistSelection({
        items,
        sourceId,
        title: suggestion.title ?? null,
        sourceType:
          suggestion.type === "collection"
            ? resolveCollectionSourceType(sourceId)
            : resolvePlaylistSourceType(sourceId),
      });
    },
    [
      resolveCollectionSourceType,
      resolvePlaylistSourceType,
      setStatusText,
      uploadPlaylistSelection,
    ],
  );

  return {
    handleSuggestPlaylist,
    handleFetchPlaylistByUrl,
    handleChangePlaylist,
    handleApplyPlaylistUrlDirect,
    handleApplyCollectionDirect,
    handleApplyYoutubePlaylistDirect,
    handleApplySuggestionSnapshot,
  };
};

export default useRoomProviderPlaylistActions;
