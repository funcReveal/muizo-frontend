export type SongFavoriteRecord = {
  id: string;
  provider: "youtube";
  sourceId: string;
  title: string;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  playCount: number;
  firstAddedAt: string;
  updatedAt: string;
};

export type CurrentRoomTrackFavoriteStatus = {
  currentTrack: {
    provider: "youtube";
    sourceId: string;
    title: string;
    channelTitle: string | null;
    thumbnailUrl: string | null;
    durationSec: number | null;
    roomId: string;
    gameSessionId: number;
    trackCursor: number;
  };
  favorite: SongFavoriteRecord | null;
  occurrenceRecorded: boolean;
};

export type SongFavoriteListPage = {
  items: SongFavoriteRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};
