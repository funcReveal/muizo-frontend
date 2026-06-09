export type SongFavoriteRecord = {
  id: string;
  provider: "youtube";
  sourceId: string;
  title: string;
  channelTitle: string | null;
  channelId: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  playCount: number;
  firstAddedAt: string;
  updatedAt: string;
};

export type SongFavoriteSortKey = "updatedAt" | "playCount";
export type SongFavoriteSortOrder = "asc" | "desc";

export type CurrentRoomTrackFavoriteStatus = {
  occurrenceRecorded: boolean;
};

export type SongFavoriteListPage = {
  items: SongFavoriteRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};
