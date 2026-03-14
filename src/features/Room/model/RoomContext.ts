import { createContext } from "react";

import type {
  ChatMessage,
  GameState,
  PlaylistItem,
  PlaybackExtensionMode,
  PlaylistSuggestion,
  SessionProgressPayload,
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
  RoomParticipant,
  RoomState,
  RoomSummary,
  SubmitAnswerResult,
} from "./types";

export type AuthUser = {
  id: string;
  email?: string | null;
  provider?: string;
  provider_user_id?: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type YoutubePlaylist = {
  id: string;
  title: string;
  itemCount: number;
  thumbnail?: string;
};

export type RoomCreateSourceMode =
  | "link"
  | "youtube"
  | "publicCollection"
  | "privateCollection";

export type RoomKickedNotice = {
  roomId: string;
  reason: string;
  bannedUntil: number | null;
  kickedAt: number;
};

export interface RoomContextValue {
  authToken: string | null;
  authUser: AuthUser | null;
  authLoading: boolean;
  authExpired: boolean;
  refreshAuthToken: () => Promise<string | null>;
  loginWithGoogle: () => void;
  logout: () => void;
  needsNicknameConfirm: boolean;
  nicknameDraft: string;
  setNicknameDraft: (value: string) => void;
  confirmNickname: () => void;
  isProfileEditorOpen: boolean;
  openProfileEditor: () => void;
  closeProfileEditor: () => void;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  fetchYoutubePlaylists: () => Promise<void>;
  importYoutubePlaylist: (playlistId: string) => Promise<void>;
  collections: Array<{
    id: string;
    title: string;
    description?: string | null;
    visibility?: "private" | "public";
    cover_title?: string | null;
    cover_channel_title?: string | null;
    cover_thumbnail_url?: string | null;
    cover_duration_sec?: number | null;
    cover_source_id?: string | null;
    cover_provider?: string | null;
    use_count?: number;
    favorite_count?: number;
    is_favorited?: boolean;
  }>;
  collectionsLoading: boolean;
  collectionsError: string | null;
  collectionScope: "owner" | "public" | null;
  publicCollectionsSort: "popular" | "favorites_first";
  setPublicCollectionsSort: (next: "popular" | "favorites_first") => void;
  collectionFavoriteUpdatingId: string | null;
  collectionsLastFetchedAt: number | null;
  selectedCollectionId: string | null;
  collectionItemsLoading: boolean;
  collectionItemsError: string | null;
  fetchCollections: (scope?: "owner" | "public") => Promise<void>;
  toggleCollectionFavorite: (collectionId: string) => Promise<boolean>;
  selectCollection: (collectionId: string | null) => void;
  loadCollectionItems: (
    collectionId: string,
    options?: { readToken?: string | null; force?: boolean },
  ) => Promise<void>;
  usernameInput: string;
  setUsernameInput: (value: string) => void;
  username: string | null;
  displayUsername: string;
  clientId: string;
  isConnected: boolean;
  rooms: RoomSummary[];
  roomNameInput: string;
  setRoomNameInput: (value: string) => void;
  roomVisibilityInput: "public" | "private";
  setRoomVisibilityInput: (value: "public" | "private") => void;
  roomCreateSourceMode: RoomCreateSourceMode;
  setRoomCreateSourceMode: (value: RoomCreateSourceMode) => void;
  roomPasswordInput: string;
  setRoomPasswordInput: (value: string) => void;
  roomMaxPlayersInput: string;
  setRoomMaxPlayersInput: (value: string) => void;
  joinPasswordInput: string;
  setJoinPasswordInput: (value: string) => void;
  currentRoom: RoomState["room"] | null;
  currentRoomId: string | null;
  participants: RoomParticipant[];
  messages: ChatMessage[];
  settlementHistory: RoomSettlementSnapshot[];
  messageInput: string;
  setMessageInput: (value: string) => void;
  statusText: string | null;
  setStatusText: (value: string | null) => void;
  kickedNotice: RoomKickedNotice | null;
  setKickedNotice: (value: RoomKickedNotice | null) => void;
  sessionProgress: SessionProgressPayload | null;
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
  playlistItems: PlaylistItem[];
  playlistError: string | null;
  playlistLoading: boolean;
  playlistStage: "input" | "preview";
  playlistLocked: boolean;
  playlistPreviewMeta: {
    expectedCount: number | null;
    skippedCount: number;
    skippedItems: Array<{
      title?: string | null;
      videoId?: string | null;
      reason?: string | null;
      status?: "removed" | "unavailable" | "private" | "blocked" | "unknown";
    }>;
  } | null;
  lastFetchedPlaylistId: string | null;
  lastFetchedPlaylistTitle: string | null;
  playlistViewItems: PlaylistItem[];
  playlistHasMore: boolean;
  playlistLoadingMore: boolean;
  playlistPageCursor: number;
  playlistPageSize: number;
  playlistProgress: { received: number; total: number; ready: boolean };
  playlistSuggestions: PlaylistSuggestion[];
  questionCount: number;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  allowCollectionClipTiming: boolean;
  questionMin: number;
  questionMax: number;
  questionStep: number;
  questionMaxLimit: number;
  inviteRoomId: string | null;
  inviteNotFound: boolean;
  isInviteMode: boolean;
  gameState: GameState | null;
  gamePlaylist: PlaylistItem[];
  isGameView: boolean;
  setIsGameView: (value: boolean) => void;
  routeRoomResolved: boolean;
  hostRoomPassword: string | null;
  serverOffsetMs: number;
  setInviteRoomId: (value: string | null) => void;
  setRouteRoomId: (value: string | null) => void;
  handleSetUsername: () => void;
  isCreatingRoom: boolean;
  handleCreateRoom: () => Promise<void>;
  handleJoinRoom: (roomId: string, hasPassword: boolean) => void;
  handleLeaveRoom: (onLeft?: () => void) => void;
  handleSendMessage: () => void;
  handleStartGame: () => void;
  handleSubmitChoice: (choiceIndex: number) => Promise<SubmitAnswerResult>;
  handleRequestPlaybackExtensionVote: () => Promise<boolean>;
  handleCastPlaybackExtensionVote: (
    vote: "approve" | "reject",
  ) => Promise<boolean>;
  handleUpdateRoomSettings: (payload: {
    name?: string;
    visibility?: "public" | "private";
    password?: string | null;
    questionCount?: number;
    playDurationSec?: number;
    revealDurationSec?: number;
    startOffsetSec?: number;
    allowCollectionClipTiming?: boolean;
    playbackExtensionMode?: PlaybackExtensionMode;
    maxPlayers?: number | null;
  }) => Promise<boolean>;
  handleKickPlayer: (targetClientId: string, durationMs?: number | null) => void;
  handleTransferHost: (targetClientId: string) => void;
  handleSuggestPlaylist: (
    type: "collection" | "playlist",
    value: string,
    options?: {
      useSnapshot?: boolean;
      sourceId?: string | null;
      title?: string | null;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  handleApplySuggestionSnapshot: (suggestion: PlaylistSuggestion) => Promise<void>;
  handleChangePlaylist: () => Promise<void>;
  handleFetchPlaylistByUrl: (url: string) => Promise<void>;
  handleFetchPlaylist: (options?: {
    url?: string;
    force?: boolean;
    lock?: boolean;
  }) => Promise<void>;
  handleResetPlaylist: () => void;
  loadMorePlaylist: () => void;
  updateQuestionCount: (value: number) => void;
  updatePlayDurationSec: (value: number) => number;
  updateRevealDurationSec: (value: number) => number;
  updateStartOffsetSec: (value: number) => number;
  updateAllowCollectionClipTiming: (value: boolean) => boolean;
  syncServerOffset: (serverNow: number) => void;
  fetchRooms: () => Promise<void>;
  fetchRoomById: (roomId: string) => Promise<RoomSummary | null>;
  fetchSettlementHistorySummaries: (options?: {
    limit?: number;
    beforeEndedAt?: number | null;
  }) => Promise<{ items: RoomSettlementHistorySummary[]; nextCursor: number | null }>;
  fetchSettlementReplay: (matchId: string) => Promise<RoomSettlementSnapshot>;
  resetCreateState: () => void;
}

export const RoomContext = createContext<RoomContextValue | null>(null);
