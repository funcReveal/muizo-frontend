import {
  createContext,
  useContext,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type { ClientSocket, PlaylistItem, PlaylistSuggestion } from "../types";

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
      "usePlaylistLiveSetters must be used within RoomPlaylistSubProvider",
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
    playlistId: string;
    title: string | null;
  }>;
  fetchPublicPlaylistSnapshot: (
    url: string,
    playlistId: string,
  ) => Promise<{ items: PlaylistItem[]; playlistId: string; title: string | null }>;
}

export const PlaylistInputControlContext =
  createContext<PlaylistInputControlContextValue | null>(null);

export const usePlaylistInputControl =
  (): PlaylistInputControlContextValue => {
    const ctx = useContext(PlaylistInputControlContext);
    if (!ctx) {
      throw new Error(
        "usePlaylistInputControl must be used within RoomPlaylistSubProvider",
      );
    }
    return ctx;
  };

export interface PlaylistSocketBridgeContextValue {
  getSocketRef: MutableRefObject<() => ClientSocket | null>;
  loadMorePlaylistRef: MutableRefObject<() => void>;
  onResetCollectionRef: MutableRefObject<() => void>;
}

export const PlaylistSocketBridgeContext =
  createContext<PlaylistSocketBridgeContextValue | null>(null);

export const usePlaylistSocketBridge = (): PlaylistSocketBridgeContextValue => {
  const ctx = useContext(PlaylistSocketBridgeContext);
  if (!ctx) {
    throw new Error(
      "usePlaylistSocketBridge must be used within RoomPlaylistSubProvider",
    );
  }
  return ctx;
};
