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
  fetchPublicPlaylistSnapshot: (url: string, playlistId: string) => Promise<{
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
  const handleSuggestPlaylist = useCallback(
    async (
      type: "collection" | "playlist",
      value: string,
      options?: { useSnapshot?: boolean; sourceId?: string | null; title?: string | null },
    ) => {
      const socket = getSocket();
      if (!socket || !currentRoom) {
        const error = "嚙罵嚙踝蕭嚙稼嚙皚嚙踝蕭嚙請塚蕭";
        setStatusText(error);
        return { ok: false, error };
      }
      if (gameStateStatus === "playing") {
        const error = "嚙瘠嚙踝蕭嚙箠嚙賣中嚙盤嚙糊嚙踝蕭嚙踝蕭";
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
                throw new Error("嚙請伐蕭嚙緯嚙皚嚙踝蕭A嚙踝蕭嚙誼私嚙瘡嚙踝蕭嚙衛庫");
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
              throw new Error("嚙請選蕭J嚙踝蕭嚙衝迎蕭嚙踝蕭嚙踝蕭M嚙踝蕭 URL");
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
          const message = error instanceof Error ? error.message : "嚙踝蕭嚙誼伐蕭嚙踝蕭";
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
              resolve({ ok: false, error: "嚙踝蕭嚙誼伐蕭嚙諸，嚙請稍嚙踝蕭A嚙踝蕭" });
              return;
            }
            if (!ack.ok) {
              const message = formatAckError("嚙踝蕭嚙誼伐蕭嚙踝蕭", ack.error);
              setStatusText(message);
              resolve({ ok: false, error: message });
              return;
            }
            setStatusText("嚙緩嚙箴嚙碼嚙踝蕭嚙踝蕭");
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
    const socket = getSocket();
    if (!socket || !currentRoom) return;
    if (gameStateStatus === "playing") {
      setStatusText("嚙瘠嚙踝蕭嚙箠嚙賣中嚙盤嚙糊嚙踝蕭嚙踝蕭嚙緬嚙踝蕭");
      return;
    }
    if (playlistItems.length === 0 || !lastFetchedPlaylistId) {
      setStatusText("嚙請伐蕭嚙踝蕭嚙皚嚙踝蕭嚙踝蕭M嚙踝蕭");
      return;
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
    const uploadItems = buildUploadPlaylistItems(playlistItems, {
      playDurationSec: roomPlayDurationSec,
      startOffsetSec: roomStartOffsetSec,
      allowCollectionClipTiming: roomAllowCollectionClipTiming,
    });
    const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
    const remaining = uploadItems.slice(CHUNK_SIZE);
    const isLast = remaining.length === 0;

    socket.emit(
      "changePlaylist",
      {
        roomId: currentRoom.id,
        playlist: {
          uploadId,
          id: lastFetchedPlaylistId,
          title: lastFetchedPlaylistTitle ?? undefined,
          totalCount: uploadItems.length,
          items: firstChunk,
          isLast,
          pageSize: DEFAULT_PAGE_SIZE,
        },
      },
      async (ack: Ack<{ receivedCount: number; totalCount: number; ready: boolean }>) => {
        if (!ack) return;
        if (!ack.ok) {
          setStatusText(formatAckError("嚙踝蕭嚙踝蕭嚙緬嚙賣失嚙踝蕭", ack.error));
          return;
        }
        if (remaining.length > 0) {
          await uploadPlaylistChunks(socket, currentRoom.id, uploadId, remaining);
        }
        setStatusText("嚙緩嚙踝蕭嚙踝蕭嚙緬嚙踝蕭A嚙踝蕭嚙豎房主嚙罷嚙締嚙瘠嚙踝蕭");
      },
    );
  }, [
    currentRoom,
    gameStateStatus,
    getSocket,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    playlistItems,
    setStatusText,
  ]);

  const handleApplySuggestionSnapshot = useCallback(
    async (suggestion: PlaylistSuggestion) => {
      const socket = getSocket();
      if (!socket || !currentRoom) return;
      if (gameStateStatus === "playing") {
        setStatusText("嚙瘠嚙踝蕭嚙箠嚙賣中嚙盤嚙糊嚙踝蕭嚙踝蕭嚙緬嚙踝蕭");
        return;
      }
      const items = suggestion.items ?? [];
      if (items.length === 0) {
        setStatusText("嚙踝蕭嚙誼歹蕭嚙箴嚙磅嚙踝蕭嚙箠嚙諄歌嚙踝蕭");
        return;
      }
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
      const uploadId =
        crypto.randomUUID?.() ??
        `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
      const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
      const remaining = uploadItems.slice(CHUNK_SIZE);
      const isLast = remaining.length === 0;
      const sourceId =
        suggestion.sourceId ??
        (suggestion.type === "collection" ? suggestion.value : undefined);
      const title = suggestion.title ?? undefined;

      socket.emit(
        "changePlaylist",
        {
          roomId: currentRoom.id,
          playlist: {
            uploadId,
            id: sourceId ?? undefined,
            title,
            totalCount: uploadItems.length,
            items: firstChunk,
            isLast,
            pageSize: DEFAULT_PAGE_SIZE,
          },
        },
        async (ack: Ack<{ receivedCount: number; totalCount: number; ready: boolean }>) => {
          if (!ack) return;
          if (!ack.ok) {
            setStatusText(formatAckError("嚙踝蕭嚙踝蕭嚙緬嚙賣失嚙踝蕭", ack.error));
            return;
          }
          applyPlaylistSource(
            uploadItems,
            sourceId ?? uploadId,
            title ?? null,
          );
          if (remaining.length > 0) {
            await uploadPlaylistChunks(socket, currentRoom.id, uploadId, remaining);
          }
          setStatusText("嚙緩嚙踝蕭嚙踝蕭嚙緬嚙踝蕭A嚙踝蕭嚙豎房主嚙罷嚙締嚙瘠嚙踝蕭");
        },
      );
    },
    [applyPlaylistSource, currentRoom, gameStateStatus, getSocket, setStatusText],
  );

  return {
    handleSuggestPlaylist,
    handleFetchPlaylistByUrl,
    handleChangePlaylist,
    handleApplySuggestionSnapshot,
  };
};

export default useRoomProviderPlaylistActions;

