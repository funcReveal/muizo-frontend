import { createContext, useContext } from "react";

import type {
  PlaylistItem,
  PlaylistPreviewMeta,
  PlaylistSuggestion,
  YoutubePlaylist,
} from "./types";

export interface PlaylistSourceContextValue {
  // Playlist 狀態
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
  playlistItems: PlaylistItem[];
  playlistError: string | null;
  playlistLoading: boolean;
  playlistStage: "input" | "preview";
  playlistLocked: boolean;
  playlistPreviewMeta: PlaylistPreviewMeta | null;
  lastFetchedPlaylistId: string | null;
  lastFetchedPlaylistTitle: string | null;
  // 分頁瀏覽
  playlistViewItems: PlaylistItem[];
  playlistHasMore: boolean;
  playlistLoadingMore: boolean;
  playlistPageCursor: number;
  playlistPageSize: number;
  playlistProgress: { received: number; total: number; ready: boolean };
  playlistSuggestions: PlaylistSuggestion[];
  loadMorePlaylist: () => void;
  // 題目設定
  questionCount: number;
  questionMin: number;
  questionMax: number;
  questionStep: number;
  questionMaxLimit: number;
  updateQuestionCount: (value: number) => void;
  // YouTube
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  fetchYoutubePlaylists: () => Promise<void>;
  importYoutubePlaylist: (playlistId: string) => Promise<void>;
  // Playlist 操作
  handleFetchPlaylistByUrl: (url: string) => Promise<void>;
  handleFetchPlaylist: (options?: {
    url?: string;
    force?: boolean;
    lock?: boolean;
  }) => Promise<void>;
  handleResetPlaylist: () => void;
  handleChangePlaylist: () => Promise<void>;
  handleApplyPlaylistUrlDirect: (url: string) => Promise<boolean>;
  handleApplyCollectionDirect: (
    collectionId: string,
    title?: string | null,
  ) => Promise<boolean>;
  handleApplyYoutubePlaylistDirect: (
    playlistId: string,
    title?: string | null,
  ) => Promise<boolean>;
  handleSuggestPlaylist: (
    type: "collection" | "playlist",
    value: string,
    options?: {
      useSnapshot?: boolean;
      sourceId?: string | null;
      title?: string | null;
      readToken?: string | null;
      totalCount?: number | null;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  handleApplySuggestionSnapshot: (suggestion: PlaylistSuggestion) => Promise<void>;
}

export const PlaylistSourceContext =
  createContext<PlaylistSourceContextValue | null>(null);

export const usePlaylistSource = (): PlaylistSourceContextValue => {
  const ctx = useContext(PlaylistSourceContext);
  if (!ctx)
    throw new Error(
      "usePlaylistSource must be used within a PlaylistSourceProvider",
    );
  return ctx;
};
