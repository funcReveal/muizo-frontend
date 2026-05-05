import type {
  RoomState,
} from "@features/RoomSession";
import type { PlaylistItem, PlaylistSourceType } from "@features/PlaylistSource";

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
