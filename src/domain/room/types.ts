export type RoomCreateSourceMode =
  | "link"
  | "youtube"
  | "publicCollection"
  | "privateCollection";

export type RoomVisibility = "public" | "private";

export type PlaylistSourceType =
  | "public_collection"
  | "private_collection"
  | "youtube_google_import"
  | "youtube_pasted_link";

export type PlaybackExtensionMode = "manual_vote" | "auto_once" | "disabled";

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
}

export interface RoomSummary {
  id: string;
  roomCode: string;
  name: string;
  playlistCount: number;
  playerCount: number;
  maxPlayers?: number | null;
  createdAt: number;
  hasPassword: boolean;
  hasPin?: boolean;
  password?: string | null;
  pin?: string | null;
  visibility?: RoomVisibility;
  playlistId?: string | null;
  playlistTitle?: string | null;
  playlistCoverTitle?: string | null;
  playlistCoverThumbnailUrl?: string | null;
  playlistCoverSourceId?: string | null;
  playlistSourceType?: PlaylistSourceType | null;
  currentQuestionNo?: number | null;
  completedQuestionCount?: number;
  totalQuestionCount?: number;
  isPlaying?: boolean;
  gameStatus?: "playing" | "ended" | "idle";
  gamePhase?: "guess" | "reveal" | null;
  gameSettings?: {
    questionCount: number;
    playDurationSec?: number;
    revealDurationSec?: number;
    startOffsetSec?: number;
    allowCollectionClipTiming?: boolean;
    allowParticipantInvite?: boolean;
    playbackExtensionMode?: PlaybackExtensionMode;
    leaderboardProfileKey?: string | null;
    leaderboardRuleVersion?: number | null;
    leaderboardModeKey?: string | null;
    leaderboardVariantKey?: string | null;
    leaderboardTargetQuestionCount?: number | null;
    leaderboardTimeLimitSec?: number | null;
    leaderboardRankingMetric?: string | null;
  };
}

export type RoomListPayload = {
  rooms?: RoomSummary[];
  error?: string;
};

export type RoomByIdPayload = {
  room?: RoomSummary;
  error?: string;
  error_code?: string;
};
