import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import { DEFAULT_PAGE_SIZE } from "./roomConstants";
import type { Ack, ClientSocket, PlaylistItem } from "./types";
import { normalizePlaylistItems } from "./roomUtils";

type PlaylistPagePayload = {
  items: PlaylistItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  ready: boolean;
};

type UseRoomProviderPlaylistPagingArgs = {
  getSocket: () => ClientSocket | null;
  onPagePayload?: (payload: PlaylistPagePayload) => void;
};

type UseRoomProviderPlaylistPagingResult = {
  playlistViewItems: PlaylistItem[];
  playlistHasMore: boolean;
  playlistLoadingMore: boolean;
  playlistPageCursor: number;
  playlistPageSize: number;
  setPlaylistViewItems: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPlaylistHasMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistLoadingMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistPageCursor: Dispatch<SetStateAction<number>>;
  setPlaylistPageSize: Dispatch<SetStateAction<number>>;
  resetPlaylistPagingState: () => void;
  fetchPlaylistPage: (
    roomId: string,
    page: number,
    pageSize?: number,
    opts?: { reset?: boolean },
  ) => void;
  fetchCompletePlaylist: (roomId: string) => Promise<PlaylistItem[]>;
};

export const useRoomProviderPlaylistPaging = ({
  getSocket,
  onPagePayload,
}: UseRoomProviderPlaylistPagingArgs): UseRoomProviderPlaylistPagingResult => {
  const [playlistViewItems, setPlaylistViewItems] = useState<PlaylistItem[]>([]);
  const [playlistHasMore, setPlaylistHasMore] = useState(false);
  const [playlistLoadingMore, setPlaylistLoadingMore] = useState(false);
  const [playlistPageCursor, setPlaylistPageCursor] = useState(1);
  const [playlistPageSize, setPlaylistPageSize] = useState(DEFAULT_PAGE_SIZE);

  const resetPlaylistPagingState = useCallback(() => {
    setPlaylistViewItems([]);
    setPlaylistHasMore(false);
    setPlaylistLoadingMore(false);
    setPlaylistPageCursor(1);
    setPlaylistPageSize(DEFAULT_PAGE_SIZE);
  }, []);

  const fetchPlaylistPage = useCallback(
    (
      roomId: string,
      page: number,
      pageSize?: number,
      opts?: { reset?: boolean },
    ) => {
      const socket = getSocket();
      if (!socket) {
        if (opts?.reset) {
          setPlaylistViewItems([]);
          setPlaylistHasMore(false);
        }
        return;
      }
      if (opts?.reset) {
        setPlaylistViewItems([]);
        setPlaylistHasMore(false);
        setPlaylistPageCursor(1);
        setPlaylistLoadingMore(true);
      } else {
        setPlaylistLoadingMore(true);
      }
      socket.emit(
        "getPlaylistPage",
        { roomId, page, pageSize },
        (ack: Ack<PlaylistPagePayload>) => {
          if (ack?.ok) {
            setPlaylistViewItems((prev) => {
              const next = opts?.reset
                ? ack.data.items
                : [...prev, ...ack.data.items];
              const total = ack.data.totalCount;
              setPlaylistHasMore(next.length < total);
              return next;
            });
            setPlaylistPageCursor(ack.data.page);
            setPlaylistPageSize(ack.data.pageSize);
            onPagePayload?.(ack.data);
          }
          setPlaylistLoadingMore(false);
        },
      );
    },
    [getSocket, onPagePayload],
  );

  const fetchCompletePlaylist = useCallback(
    (roomId: string) =>
      new Promise<PlaylistItem[]>((resolve) => {
        const socket = getSocket();
        if (!socket) {
          resolve([]);
          return;
        }
        const aggregated: PlaylistItem[] = [];
        const pageSize = Math.max(playlistPageSize, DEFAULT_PAGE_SIZE);

        const loadPage = (page: number) => {
          socket.emit(
            "getPlaylistPage",
            { roomId, page, pageSize },
            (ack: Ack<PlaylistPagePayload>) => {
              if (ack?.ok) {
                aggregated.push(...ack.data.items);
                if (
                  aggregated.length < ack.data.totalCount &&
                  ack.data.items.length > 0
                ) {
                  loadPage(page + 1);
                } else {
                  resolve(normalizePlaylistItems(aggregated));
                }
              } else {
                resolve(normalizePlaylistItems(aggregated));
              }
            },
          );
        };

        loadPage(1);
      }),
    [getSocket, playlistPageSize],
  );

  return {
    playlistViewItems,
    playlistHasMore,
    playlistLoadingMore,
    playlistPageCursor,
    playlistPageSize,
    setPlaylistViewItems,
    setPlaylistHasMore,
    setPlaylistLoadingMore,
    setPlaylistPageCursor,
    setPlaylistPageSize,
    resetPlaylistPagingState,
    fetchPlaylistPage,
    fetchCompletePlaylist,
  };
};
