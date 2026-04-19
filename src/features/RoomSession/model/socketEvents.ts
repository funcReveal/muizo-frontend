import { Socket } from "socket.io-client";

import type {
  AbortRoomCreationPayload,
  AbortRoomCreationResult,
  Ack,
  BeginRoomCreationPayload,
  BeginRoomCreationResult,
  ChatMessage,
  ChatMessageQuestionContext,
  FinalizeRoomCreationPayload,
  FinalizeRoomCreationResult,
  PlaylistItem,
  PlaylistSourceType,
  PlaylistState,
  PlaylistSuggestion,
  RoomCreationState,
  RoomParticipant,
  RoomState,
  RoomSummary,
  SessionProgressPayload,
  SitePresencePayload,
  UploadRoomCreationChunkPayload,
  UploadRoomCreationChunkResult,
} from "./types";
import type {
  GameLiveUpdatePayload,
  PlaybackExtensionMode,
  SubmitAnswerAckData,
} from "./gameTypes";
import type {
  RoomSettlementHistorySummary,
  RoomSettlementSnapshot,
} from "./settlementTypes";

export interface ClientToServerEvents {
  beginRoomCreation: (
    payload: BeginRoomCreationPayload,
    callback?: Ack<BeginRoomCreationResult>,
  ) => void;

  uploadRoomCreationChunk: (
    payload: UploadRoomCreationChunkPayload,
    callback?: Ack<UploadRoomCreationChunkResult>,
  ) => void;

  finalizeRoomCreation: (
    payload: FinalizeRoomCreationPayload,
    callback?: Ack<FinalizeRoomCreationResult>,
  ) => void;

  abortRoomCreation: (
    payload: AbortRoomCreationPayload,
    callback?: Ack<AbortRoomCreationResult>,
  ) => void;
  joinRoom: (
    payload: {
      roomId?: string;
      roomCode?: string;
      username: string;
      password?: string;
      pin?: string;
    },
    callback?: (ack: Ack<RoomState>) => void,
  ) => void;
  resumeSession: (
    payload: {
      roomId: string;
      username: string;
      roomSessionToken: string;
    },
    callback?: (ack: Ack<RoomState>) => void,
  ) => void;
  updateProfile: (
    payload: { roomId: string; username: string },
    callback?: (ack: Ack<null>) => void,
  ) => void;
  leaveRoom: (
    payload: { roomId: string },
    callback?: (ack: Ack<null>) => void,
  ) => void;
  sendMessage: (
    payload: { content: string; questionContext?: ChatMessageQuestionContext },
    callback?: (ack: Ack<ChatMessage>) => void,
  ) => void;
  listRooms: (callback?: (ack: Ack<RoomSummary[]>) => void) => void;
  getSitePresence: (callback?: (ack: Ack<SitePresencePayload>) => void) => void;
  getPlaylistPage: (
    payload: { roomId: string; page: number; pageSize?: number },
    callback?: (
      ack: Ack<{
        items: PlaylistItem[];
        totalCount: number;
        page: number;
        pageSize: number;
        ready: boolean;
      }>,
    ) => void,
  ) => void;
  startGame: (
    payload: {
      roomId: string;
      guessDurationMs?: number;
      revealDurationMs?: number;
      showVideo?: boolean;
    },
    callback?: (ack: Ack<GameLiveUpdatePayload>) => void,
  ) => void;
  submitAnswer: (
    payload: { roomId: string; choiceIndex: number },
    callback?: (ack: Ack<SubmitAnswerAckData>) => void,
  ) => void;
  requestPlaybackExtensionVote: (
    payload: { roomId: string; remainingMs?: number },
    callback?: (ack: Ack<GameLiveUpdatePayload>) => void,
  ) => void;
  castPlaybackExtensionVote: (
    payload: { roomId: string; vote: "approve" | "reject" },
    callback?: (ack: Ack<GameLiveUpdatePayload>) => void,
  ) => void;
  latencyProbe: (
    payload: { roomId: string },
    callback?: (ack: Ack<{ serverNow: number }>) => void,
  ) => void;
  updateRoomSettings: (
    payload: {
      roomId: string;
      name?: string;
      visibility?: "public" | "private";
      password?: string | null;
      pin?: string | null;
      questionCount?: number;
      playDurationSec?: number;
      revealDurationSec?: number;
      startOffsetSec?: number;
      allowCollectionClipTiming?: boolean;
      allowParticipantInvite?: boolean;
      playbackExtensionMode?: PlaybackExtensionMode;
      maxPlayers?: number | null;
    },
    callback?: (ack: Ack<{ room: RoomSummary }>) => void,
  ) => void;
  kickPlayer: (
    payload: {
      roomId: string;
      targetClientId: string;
      durationMs?: number | null;
    },
    callback?: (ack: Ack<null>) => void,
  ) => void;
  transferHost: (
    payload: { roomId: string; targetClientId: string },
    callback?: (ack: Ack<{ hostClientId: string }>) => void,
  ) => void;
  suggestPlaylist: (
    payload: {
      roomId: string;
      type: "collection" | "playlist";
      value: string;
      title?: string | null;
      totalCount?: number;
      sourceId?: string | null;
      items?: PlaylistItem[];
      readToken?: string | null;
    },
    callback?: (ack: Ack<null>) => void,
  ) => void;
  changePlaylist: (
    payload: {
      roomId: string;
      playlist: {
        uploadId: string;
        id?: string;
        title?: string;
        sourceType?: PlaylistSourceType | null;
        totalCount: number;
        items?: PlaylistItem[];
        isLast?: boolean;
        pageSize?: number;
      };
    },
    callback?: (
      ack: Ack<{ receivedCount: number; totalCount: number; ready: boolean }>,
    ) => void,
  ) => void;
  uploadPlaylistChunk: (
    payload: {
      roomId: string;
      uploadId: string;
      items: PlaylistItem[];
      isLast: boolean;
    },
    callback?: (ack: Ack<{ receivedCount: number; totalCount: number }>) => void,
  ) => void;
  listSettlementHistorySummaries: (
    payload: { roomId: string; limit?: number; beforeEndedAt?: number | null },
    callback?: (
      ack: Ack<{
        items: RoomSettlementHistorySummary[];
        nextCursor: number | null;
      }>,
    ) => void,
  ) => void;
  getSettlementReplay: (
    payload: { roomId: string; matchId: string; roundKey?: string | null },
    callback?: (ack: Ack<RoomSettlementSnapshot>) => void,
  ) => void;
}

export interface ServerToClientEvents {
  sitePresenceUpdated: (payload: SitePresencePayload) => void;
  roomsUpdated: (rooms: RoomSummary[]) => void;
  roomCreated: (payload: { room: RoomSummary }) => void;
  roomRemoved: (payload: { roomId: string }) => void;
  joinedRoom: (state: RoomState) => void;
  roomCreationProgress: (payload: {
    creationId: string;
    state: RoomCreationState;
    receivedChunkCount: number;
    expectedChunkCount: number;
    receivedItemsCount: number;
    totalCount: number;
    timestamp: number;
  }) => void;
  sessionProgress: (payload: SessionProgressPayload) => void;
  participantsUpdated: (payload: {
    roomId: string;
    participants: RoomParticipant[];
    hostClientId: string;
  }) => void;
  roomPingUpdated: (payload: {
    roomId: string;
    pings: Record<string, number | null>;
    updatedAt: number;
  }) => void;
  playlistProgress: (payload: {
    roomId: string;
    receivedCount: number;
    totalCount: number;
    ready: boolean;
  }) => void;
  playlistUpdated: (payload: {
    roomId: string;
    playlist: PlaylistState;
  }) => void;
  userLeft: (payload: { roomId: string; clientId: string }) => void;
  messageAdded: (payload: { roomId: string; message: ChatMessage }) => void;
  gameStarted: (payload: GameLiveUpdatePayload) => void;
  gameUpdated: (payload: GameLiveUpdatePayload) => void;
  roomUpdated: (payload: { room: RoomSummary }) => void;
  kicked: (payload: {
    roomId: string;
    reason: string;
    bannedUntil: number | null;
  }) => void;
  playlistSuggestionsUpdated: (payload: {
    roomId: string;
    suggestions: PlaylistSuggestion[];
  }) => void;
  settlementHistoryUpdated: (payload: {
    roomId: string;
    settlementHistory: RoomSettlementSnapshot[];
  }) => void;
}

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
