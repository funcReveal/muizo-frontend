import { useCallback, type Dispatch, type SetStateAction } from "react";

import {
  CHUNK_SIZE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
} from "./roomConstants";
import {
  buildUploadPlaylistItems,
  formatAckError,
  mergeRoomSummaryIntoCurrentRoom,
} from "./roomProviderUtils";
import { clampPlayDurationSec, clampStartOffsetSec } from "./roomUtils";
import type {
  Ack,
  ClientSocket,
  GameState,
  PlaylistItem,
  PlaylistSourceType,
  PlaylistSuggestion,
  RoomState,
  RoomSummary,
} from "./types";

type SnapshotResult = {
  items: PlaylistItem[];
  title?: string | null;
  totalCount?: number;
  sourceId?: string | null;
};

type PlaylistApplyAckData = {
  room: RoomSummary;
  receivedCount: number;
  totalCount: number;
  ready: boolean;
  committed: boolean;
};

type PlaylistApplyProgress = Pick<
  PlaylistApplyAckData,
  "receivedCount" | "totalCount" | "ready" | "committed"
>;

type PlaylistUploadResult =
  | {
      ok: true;
      progress: PlaylistApplyProgress;
      room: RoomSummary;
    }
  | {
      ok: false;
      error?: string;
    };

const isPlaylistApplyReady = (progress: PlaylistApplyProgress) =>
  progress.ready &&
  progress.committed &&
  progress.totalCount > 0 &&
  progress.receivedCount >= progress.totalCount;

const getAckError = <T>(
  ack: Ack<T> | null | undefined,
  fallback = "操作失敗",
) => {
  return ack && !ack.ok ? ack.error : fallback;
};

interface UseRoomProviderPlaylistActionsParams {
  getSocket: () => ClientSocket | null;
  currentRoom: RoomState["room"] | null;
  gameStateStatus?: GameState["status"];
  setStatusText: (value: string | null) => void;
  handleRoomGoneAck: (
    roomId: string | null | undefined,
    ack: Ack<unknown> | null | undefined,
  ) => boolean;
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
  setPlaylistProgress: Dispatch<
    SetStateAction<{ received: number; total: number; ready: boolean }>
  >;
  setCurrentRoom: Dispatch<SetStateAction<RoomState["room"] | null>>;
  fetchPlaylistPage: (
    roomId: string,
    page: number,
    pageSize?: number,
    opts?: { reset?: boolean },
  ) => void;
}

const uploadPlaylistChunks = async (
  socket: ClientSocket,
  roomId: string,
  uploadId: string,
  chunks: PlaylistItem[],
  totalCount: number,
  onProgress: (payload: PlaylistApplyProgress) => void,
  onRoomUpdated: (room: RoomSummary) => void,
  handleRoomGoneAck: (
    roomId: string | null | undefined,
    ack: Ack<unknown> | null | undefined,
  ) => boolean,
): Promise<PlaylistUploadResult> => {
  let latestProgress: PlaylistApplyProgress | null = null;
  let latestRoom: RoomSummary | null = null;

  for (let i = 0; i < chunks.length; i += CHUNK_SIZE) {
    const chunk = chunks.slice(i, i + CHUNK_SIZE);
    const isLastChunk = i + CHUNK_SIZE >= chunks.length;

    const chunkResult = await new Promise<PlaylistUploadResult>((resolve) => {
      socket.emit(
        "uploadPlaylistChunk",
        {
          roomId,
          uploadId,
          items: chunk,
          isLast: isLastChunk,
        },
        (ack: Ack<PlaylistApplyAckData>) => {
          if (handleRoomGoneAck(roomId, ack)) {
            resolve({
              ok: false,
              error: getAckError(ack, "Room closed"),
            });
            return;
          }

          if (!ack?.ok) {
            resolve({
              ok: false,
              error: getAckError(ack, "Upload playlist chunk failed"),
            });
            return;
          }

          const progress: PlaylistApplyProgress = {
            receivedCount: ack.data.receivedCount,
            totalCount: ack.data.totalCount || totalCount,
            ready: ack.data.ready,
            committed: ack.data.committed,
          };

          latestProgress = progress;
          latestRoom = ack.data.room;

          onRoomUpdated(ack.data.room);
          onProgress(progress);

          resolve({
            ok: true,
            progress,
            room: ack.data.room,
          });
        },
      );
    });

    if (!chunkResult.ok) {
      return chunkResult;
    }
  }

  if (!latestProgress || !latestRoom) {
    return {
      ok: false,
      error: "Playlist upload did not return final progress",
    };
  }

  return {
    ok: true,
    progress: latestProgress,
    room: latestRoom,
  };
};

export const useRoomProviderPlaylistActions = ({
  getSocket,
  currentRoom,
  gameStateStatus,
  setStatusText,
  handleRoomGoneAck,
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
  setPlaylistProgress,
  setCurrentRoom,
  fetchPlaylistPage,
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

  const applyRoomSummary = useCallback(
    (room: RoomSummary) => {
      setCurrentRoom((previous) =>
        previous ? mergeRoomSummaryIntoCurrentRoom(previous, room) : previous,
      );
    },
    [setCurrentRoom],
  );

  const resolveCollectionSourceType = useCallback(
    (collectionId: string) => {
      const selectedCollection = collections.find(
        (item) => item.id === collectionId,
      );

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

      if (!socket || !currentRoom) {
        return false;
      }

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
      const pageSize = DEFAULT_PAGE_SIZE;

      setPlaylistProgress({
        received: 0,
        total: uploadItems.length,
        ready: false,
      });

      setStatusText(`正在同步題庫到房間（0/${uploadItems.length}）...`);

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
              pageSize,
            },
          },
          async (ack: Ack<PlaylistApplyAckData>) => {
            if (!ack) {
              setStatusText("套用播放來源失敗：未收到伺服器回應");
              resolve(false);
              return;
            }

            if (!ack.ok) {
              if (handleRoomGoneAck(currentRoom.id, ack)) {
                resolve(false);
                return;
              }

              setStatusText(formatAckError("套用播放來源失敗", ack.error));
              resolve(false);
              return;
            }

            const initialProgress: PlaylistApplyProgress = {
              receivedCount: ack.data.receivedCount,
              totalCount: ack.data.totalCount,
              ready: ack.data.ready,
              committed: ack.data.committed,
            };

            applyRoomSummary(ack.data.room);

            setPlaylistProgress({
              received: initialProgress.receivedCount,
              total: initialProgress.totalCount,
              ready: initialProgress.ready,
            });

            setStatusText(
              `正在同步題庫到房間（${initialProgress.receivedCount}/${initialProgress.totalCount}）...`,
            );

            let finalProgress = initialProgress;
            let finalRoom = ack.data.room;

            if (remaining.length > 0) {
              const uploadResult = await uploadPlaylistChunks(
                socket,
                currentRoom.id,
                uploadId,
                remaining,
                uploadItems.length,
                (progress) => {
                  setPlaylistProgress({
                    received: progress.receivedCount,
                    total: progress.totalCount,
                    ready: progress.ready,
                  });

                  setStatusText(
                    `正在同步題庫到房間（${progress.receivedCount}/${progress.totalCount}）...`,
                  );
                },
                applyRoomSummary,
                handleRoomGoneAck,
              );

              if (!uploadResult.ok) {
                setPlaylistProgress((previous) => ({
                  ...previous,
                  ready: false,
                }));

                setStatusText(
                  formatAckError(
                    "套用播放來源失敗",
                    uploadResult.error || "同步題庫內容未完成",
                  ),
                );

                resolve(false);
                return;
              }

              finalProgress = uploadResult.progress;
              finalRoom = uploadResult.room;
            }

            if (!isPlaylistApplyReady(finalProgress)) {
              setPlaylistProgress({
                received: finalProgress.receivedCount,
                total: finalProgress.totalCount,
                ready: false,
              });

              setStatusText("套用播放來源失敗：題庫尚未完成同步");
              resolve(false);
              return;
            }

            applyRoomSummary(finalRoom);

            setPlaylistProgress({
              received: finalProgress.receivedCount,
              total: finalProgress.totalCount,
              ready: true,
            });

            applyPlaylistSource(items, sourceId, title ?? null);

            if (typeof playlistUrl === "string") {
              setPlaylistUrl(playlistUrl);
            }

            fetchPlaylistPage(currentRoom.id, 1, pageSize, { reset: true });
            setStatusText("已更新房間播放來源");
            resolve(true);
          },
        );
      });
    },
    [
      applyPlaylistSource,
      applyRoomSummary,
      currentRoom,
      gameStateStatus,
      getSocket,
      handleRoomGoneAck,
      fetchPlaylistPage,
      setPlaylistUrl,
      setPlaylistProgress,
      setStatusText,
    ],
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
            const selectedCollection = collections.find(
              (item) => item.id === value,
            );
            const isPrivateCollection =
              selectedCollection?.visibility === "private";

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
          },
          (ack: Ack<null>) => {
            if (!ack) {
              resolve({ ok: false, error: "推薦送出失敗" });
              return;
            }

            if (!ack.ok) {
              if (handleRoomGoneAck(currentRoom.id, ack)) {
                resolve({ ok: false, error: ack.error || "Room closed" });
                return;
              }

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
      handleRoomGoneAck,
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
      playlistUrl: lastFetchedPlaylistId.includes("http")
        ? lastFetchedPlaylistId
        : undefined,
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
    [
      fetchPublicPlaylistSnapshot,
      resolvePlaylistSourceType,
      setStatusText,
      uploadPlaylistSelection,
    ],
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
    [
      fetchCollectionSnapshot,
      resolveCollectionSourceType,
      setStatusText,
      uploadPlaylistSelection,
    ],
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
