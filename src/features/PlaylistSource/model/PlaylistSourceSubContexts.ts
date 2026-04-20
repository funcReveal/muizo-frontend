import {
  createContext,
  useContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import type {
  PlaylistItem,
  PlaylistSuggestion,
} from "./types";

export type PlaylistSourceAck<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?: string;
      retryAfterMs?: number;
    };

export type PlaylistSourceSocket = {
  emit: (
    event: "getPlaylistPage",
    payload: { roomId: string; page: number; pageSize?: number },
    callback: (ack: PlaylistSourceAck<{
      items: PlaylistItem[];
      totalCount: number;
      page: number;
      pageSize: number;
      ready: boolean;
    }>) => void,
  ) => void;
};

export type TerminalRoomAckHandler = (
  roomId: string | null | undefined,
  ack: PlaylistSourceAck<unknown> | null | undefined,
) => boolean;

export interface PlaylistLiveSettersContextValue {
  setPlaylistViewItems: Dispatch<SetStateAction<PlaylistItem[]>>;
  setPlaylistHasMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistLoadingMore: Dispatch<SetStateAction<boolean>>;
  setPlaylistProgress: Dispatch<
    SetStateAction<{ received: number; total: number; ready: boolean }>
  >;
  setPlaylistSuggestions: Dispatch<SetStateAction<PlaylistSuggestion[]>>;
  resetPlaylistPagingState: () => void;
  playlistPageSize: number;
  fetchPlaylistPage: (
    roomId: string,
    page: number,
    pageSize?: number,
    opts?: { reset?: boolean },
  ) => void;
  fetchCompletePlaylist: (roomId: string) => Promise<PlaylistItem[]>;
}

export const PlaylistLiveSettersContext =
  createContext<PlaylistLiveSettersContextValue | null>(null);

export const usePlaylistLiveSetters = (): PlaylistLiveSettersContextValue => {
  const ctx = useContext(PlaylistLiveSettersContext);
  if (!ctx) {
    throw new Error(
      "usePlaylistLiveSetters must be used within PlaylistSourceProvider",
    );
  }
  return ctx;
};

export interface PlaylistInputControlContextValue {
  applyPlaylistSource: (
    items: PlaylistItem[],
    sourceId: string,
    title?: string | null,
  ) => void;
  clearPlaylistError: () => void;
  setPlaylistUrl: (value: string) => void;
  resetPlaylistState: () => void;
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
    previewMeta?: import("./types").PlaylistPreviewMeta | null;
  }>;
}

export const PlaylistInputControlContext =
  createContext<PlaylistInputControlContextValue | null>(null);

export const usePlaylistInputControl =
  (): PlaylistInputControlContextValue => {
    const ctx = useContext(PlaylistInputControlContext);
    if (!ctx) {
      throw new Error(
        "usePlaylistInputControl must be used within PlaylistSourceProvider",
      );
    }
    return ctx;
  };

export interface PlaylistSocketBridgeContextValue {
  getSocketRef: RefObject<() => PlaylistSourceSocket | null>;
  loadMorePlaylistRef: RefObject<() => void>;
  onResetCollectionRef: RefObject<() => void>;
  handleTerminalRoomAckRef: RefObject<TerminalRoomAckHandler>;
}

export const PlaylistSocketBridgeContext =
  createContext<PlaylistSocketBridgeContextValue | null>(null);

export const usePlaylistSocketBridge = (): PlaylistSocketBridgeContextValue => {
  const ctx = useContext(PlaylistSocketBridgeContext);
  if (!ctx) {
    throw new Error(
      "usePlaylistSocketBridge must be used within PlaylistSourceProvider",
    );
  }
  return ctx;
};
