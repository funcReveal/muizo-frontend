import {
  useCallback,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { DEFAULT_PAGE_SIZE } from "@domain/room/constants";
import { normalizePlaylistItems } from "./playlistSourceUtils";
import type { PlaylistItem } from "./types";
import type {
  PlaylistSourceAck,
  PlaylistSourceSocket,
  TerminalRoomAckHandler,
} from "./PlaylistSourceSubContexts";

type PlaylistPagePayload = {
  items: PlaylistItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  ready: boolean;
};

type UsePlaylistSourcePagingArgs = {
  getSocket: () => PlaylistSourceSocket | null;
  onPagePayload?: (payload: PlaylistPagePayload) => void;
  handleTerminalRoomAckRef?: RefObject<TerminalRoomAckHandler>;
};

type UsePlaylistSourcePagingResult = {
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

export const usePlaylistSourcePaging = ({
  getSocket,
  onPagePayload,
  handleTerminalRoomAckRef,
}: UsePlaylistSourcePagingArgs): UsePlaylistSourcePagingResult => {
  const [playlistViewItems, setPlaylistViewItems] = useState<PlaylistItem[]>(
    [],
  );
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
      }

      setPlaylistLoadingMore(true);

      socket.emit(
        "getPlaylistPage",
        { roomId, page, pageSize },
        (ack: PlaylistSourceAck<PlaylistPagePayload>) => {
          if (ack?.ok) {
            const receivedItems = ack.data.items;
            const totalCount = ack.data.totalCount;
            const shouldReset = Boolean(opts?.reset);

            let nextLength = receivedItems.length;

            setPlaylistViewItems((prev) => {
              const next = shouldReset
                ? receivedItems
                : [...prev, ...receivedItems];

              nextLength = next.length;

              return next;
            });

            setPlaylistHasMore(nextLength < totalCount);
            setPlaylistPageCursor(ack.data.page);
            setPlaylistPageSize(ack.data.pageSize);
            onPagePayload?.(ack.data);
          } else if (handleTerminalRoomAckRef?.current(roomId, ack)) {
            setPlaylistViewItems([]);
            setPlaylistHasMore(false);
          }

          setPlaylistLoadingMore(false);
        },
      );
    },
    [getSocket, handleTerminalRoomAckRef, onPagePayload],
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
            (ack: PlaylistSourceAck<PlaylistPagePayload>) => {
              if (ack?.ok) {
                aggregated.push(...ack.data.items);

                if (
                  aggregated.length < ack.data.totalCount &&
                  ack.data.items.length > 0
                ) {
                  loadPage(page + 1);
                  return;
                }

                resolve(normalizePlaylistItems(aggregated));
                return;
              }

              handleTerminalRoomAckRef?.current(roomId, ack);
              resolve(normalizePlaylistItems(aggregated));
            },
          );
        };

        loadPage(1);
      }),
    [getSocket, handleTerminalRoomAckRef, playlistPageSize],
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
