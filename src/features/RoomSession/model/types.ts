import type { GameState, PlaybackExtensionMode } from "./gameTypes";
import type { RoomSettlementSnapshot } from "./settlementTypes";
import type {
  PlaylistItem,
  PlaylistSourceType,
  PlaylistState,
} from "@features/PlaylistSource";

export type {
  PlaylistItem,
  PlaylistSourceType,
  PlaylistState,
  PlaylistSuggestion,
} from "@features/PlaylistSource";

export type Ack<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?: string;
      retryAfterMs?: number;
    };

export type {
  GameChoice,
  GameLiveUpdatePayload,
  GameQuestionStats,
  GameState,
  GameSyncVersion,
  PlaybackExtensionMode,
  PlaybackExtensionVoteState,
  RestartGameVoteAction,
  RestartGameVoteState,
  QuestionScoreBreakdown,
  SubmitAnswerAckData,
  SubmitAnswerResult,
} from "./gameTypes";

export interface RoomParticipant {
  clientId: string;
  authUserId?: string | null;
  username: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  socketId?: string;
  joinedAt: number;
  isOnline: boolean;
  lastSeen: number;
  pingMs?: number | null;
  score: number;
  combo: number;
  maxCombo?: number;
  correctCount?: number;
  fastestCorrectMs?: number | null;
  avgCorrectMs?: number | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
  questionContext?: ChatMessageQuestionContext;
  avatarUrl?: string | null;
}

export interface ChatMessageQuestionContext {
  questionNo: number;
  totalQuestions: number;
}

export interface SessionProgressPayload {
  roomId?: string | null;
  flow: "join" | "resume";
  stage:
    | "server_validating"
    | "room_lookup"
    | "membership_restore"
    | "state_build"
    | "ready_to_send";
  status: "active" | "done" | "error";
  message?: string;
  timestamp: number;
}

export type {
  LeaderboardSettlementEntry,
  LeaderboardSettlementReadyPayload,
  LeaderboardSettlementResponse,
  PersonalBestComparison,
  RoomSettlementHistorySummary,
  RoomSettlementQuestionAnswer,
  RoomSettlementQuestionChoice,
  RoomSettlementQuestionRecap,
  RoomSettlementSnapshot,
} from "./settlementTypes";

export interface RoomSummary {
  id: string;
  roomCode: string;
  name: string;
  hostClientId?: string;
  playerCount: number;
  createdAt: number;
  hasPassword: boolean;
  hasPin?: boolean;
  password?: string | null;
  pin?: string | null;
  playlistCount: number;
  playlistTotalCount?: number;
  playlistPlayableCount?: number | null;
  playlistId?: string | null;
  playlistTitle?: string | null;
  playlistCoverTitle?: string | null;
  playlistCoverThumbnailUrl?: string | null;
  playlistCoverSourceId?: string | null;
  playlistSourceType?: PlaylistSourceType | null;
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
  visibility?: "public" | "private";
  maxPlayers?: number | null;
  isPlaying?: boolean;
  gameStatus?: "playing" | "ended" | "idle";
  gamePhase?: "guess" | "reveal" | null;
  currentQuestionNo?: number | null;
  completedQuestionCount?: number;
  totalQuestionCount?: number;
}

export type RoomLookupFailureReason =
  | "missing_api_url"
  | "not_found"
  | "timeout"
  | "network"
  | "server_error"
  | "invalid_response";

export type RoomLookupResult =
  | { ok: true; room: RoomSummary }
  | {
      ok: false;
      reason: RoomLookupFailureReason;
      message: string;
      status?: number;
      code?: string;
    };

export interface RoomState {
  room: RoomSummary & {
    hostClientId: string;
    playlist: PlaylistState;
  };
  selfClientId: string;
  participants: RoomParticipant[];
  messages: ChatMessage[];
  gameState?: GameState | null;
  settlementHistory: RoomSettlementSnapshot[];
  serverNow: number;
  roomSessionToken?: string;
}

export type RoomCreationState =
  | "drafting"
  | "uploading"
  | "verifying"
  | "finalizing"
  | "ready"
  | "failed"
  | "aborted";

export type BeginRoomCreationPayload = {
  roomMeta: {
    name: string;
    visibility: "public" | "private";
    pin?: string | null;
    maxPlayers: number | null;
  };
  gameSettings: {
    questionCount: number;
    playDurationSec: number;
    revealDurationSec: number;
    startOffsetSec: number;
    allowCollectionClipTiming: boolean;
    allowParticipantInvite: boolean;
    playbackExtensionMode: "manual_vote" | "auto_once" | "disabled";
    leaderboardProfileKey?: string | null;
    leaderboardRuleVersion?: number | null;
    leaderboardModeKey?: string | null;
    leaderboardVariantKey?: string | null;
    leaderboardTargetQuestionCount?: number | null;
    leaderboardTimeLimitSec?: number | null;
    leaderboardRankingMetric?: string | null;
  };
  playlistManifest: {
    sourceType?: PlaylistSourceType | null;
    sourceId?: string | null;
    title?: string | null;
    totalCount: number;
    chunkCount: number;
    playlistHash: string;
    readToken?: string | null;
  };
};

export type BeginRoomCreationResult = {
  creationId: string;
  uploadSessionId: string;
  state: "uploading";
  expiresAt: number;
};

export type UploadRoomCreationChunkPayload = {
  creationId: string;
  uploadSessionId: string;
  chunkIndex: number;
  chunkCount: number;
  chunkHash: string;
  items: PlaylistItem[];
};

export type UploadRoomCreationChunkResult = {
  creationId: string;
  state: "uploading" | "verifying";
  receivedChunkCount: number;
  expectedChunkCount: number;
  receivedItemsCount: number;
  totalCount: number;
};

export type FinalizeRoomCreationPayload = {
  creationId: string;
  uploadSessionId: string;
};

export type FinalizeRoomCreationResult = {
  creationId: string;
  state: RoomCreationState;
  roomId?: string;
  roomState?: RoomState;
  roomSessionToken?: string;
};

export type AbortRoomCreationPayload = {
  creationId: string;
};

export type AbortRoomCreationResult = {
  creationId: string;
  state: "aborted";
};

export type SitePresencePayload = {
  onlineCount: number;
  updatedAt: number;
};

export type {
  ClientSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from "./socketEvents";
