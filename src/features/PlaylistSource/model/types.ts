export interface PlaylistItem {
  title: string;
  url: string;
  uploader?: string;
  channelId?: string;
  duration?: string;
  thumbnail?: string;
  startSec?: number;
  endSec?: number;
  hasExplicitStartSec?: boolean;
  hasExplicitEndSec?: boolean;
  timingSource?: "room_settings" | "track_clip";
  collectionClipStartSec?: number;
  collectionClipEndSec?: number;
  collectionHasExplicitStartSec?: boolean;
  collectionHasExplicitEndSec?: boolean;
  answerText?: string;
  videoId?: string;
  sourceId?: string | null;
  provider?: string;
  /**
   * Backend-authoritative playability flag.
   * undefined = unknown or playable
   * false = confirmed unavailable
   */
  playable?: boolean;
}

export type PlaylistSourceType =
  | "public_collection"
  | "private_collection"
  | "youtube_google_import"
  | "youtube_pasted_link";

export interface PlaylistState {
  id?: string;
  title?: string;
  sourceType?: PlaylistSourceType | null;
  uploadId?: string;
  items: PlaylistItem[];
  totalCount: number;
  playableCount?: number;
  receivedCount: number;
  ready: boolean;
  pageSize: number;
}

export interface PlaylistSuggestion {
  clientId: string;
  username: string;
  type: "collection" | "playlist";
  value: string;
  suggestedAt: number;
  title?: string | null;
  totalCount?: number;
  playableCount?: number;
  sourceId?: string | null;
  items?: PlaylistItem[];
  readToken?: string | null;
}

export type YoutubePlaylist = {
  id: string;
  title: string;
  itemCount: number;
  thumbnail?: string;
};

export type PlaylistPreviewSkippedItem = {
  title?: string | null;
  videoId?: string | null;
  reason?: string | null;
  status?:
    | "removed"
    | "unavailable"
    | "private"
    | "blocked"
    | "duplicate"
    | "unknown";
};

export type PlaylistPreviewMeta = {
  expectedCount: number | null;
  skippedCount: number;
  skippedItems: PlaylistPreviewSkippedItem[];
};
