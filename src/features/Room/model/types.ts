import { Socket } from "socket.io-client";

export type Ack<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      retryAfterMs?: number;
    };

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
  receivedCount: number;
  ready: boolean;
  pageSize: number;
}

export interface GameChoice {
  title: string;
  index: number;
}

export interface QuestionScoreBreakdown {
  basePoints: number;
  speedBonusPoints: number;
  decisionBonusPoints: number;
  difficultyBonusPoints: number;
  comboBonusPoints: number;
  totalGainPoints: number;
}

export interface GameQuestionStats {
  participantCount: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  changedAnswerCount?: number;
  changedAnswerUserCount?: number;
  answersByClientId?: Record<string, RoomSettlementQuestionAnswer>;
  answerOrderLatest?: string[];
  fastestCorrectMs?: number | null;
  medianCorrectMs?: number | null;
  scoreBreakdownsByClientId?: Record<string, QuestionScoreBreakdown>;
}

export interface SubmitAnswerAckData {
  accepted: true;
  choiceIndex: number;
  answeredAtMs: number;
  changedAnswerCount: number;
}

export type SubmitAnswerResult =
  | {
      ok: true;
      data: SubmitAnswerAckData;
    }
  | {
      ok: false;
      error: string;
    };

export interface GameState {
  status: "playing" | "ended";
  phase: "guess" | "reveal";
  currentIndex: number;
  startedAt: number;
  revealEndsAt: number;
  guessDurationMs: number;
  revealDurationMs: number;
  clipStartSec?: number;
  clipEndSec?: number;
  clipSource?: "room_settings" | "track_clip";
  choices: GameChoice[];
  answerTitle?: string;
  showVideo: boolean;
  trackOrder: number[];
  trackCursor: number;
  playbackExtensionMs?: number;
  playbackExtensionVote?: PlaybackExtensionVoteState | null;
  lockedClientIds?: string[];
  lockedOrder?: string[];
  questionStats?: GameQuestionStats;
}

export interface PlaybackExtensionVoteState {
  requestedByClientId: string;
  requestedByUsername: string;
  startedAt: number;
  endsAt: number;
  extendMs: number;
  eligibleClientIds: string[];
  approveClientIds: string[];
  rejectClientIds: string[];
  status: "active" | "approved" | "rejected";
  resolvedAt?: number;
}

export type PlaybackExtensionMode = "manual_vote" | "auto_once" | "disabled";

export interface PlaylistSuggestion {
  clientId: string;
  username: string;
  type: "collection" | "playlist";
  value: string;
  suggestedAt: number;
  title?: string | null;
  totalCount?: number;
  sourceId?: string | null;
  items?: PlaylistItem[];
  readToken?: string | null;
}

export interface RoomParticipant {
  clientId: string;
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

export interface RoomSettlementQuestionAnswer {
  choiceIndex: number | null;
  result: "correct" | "wrong" | "unanswered";
  answeredAtMs?: number | null;
  firstAnsweredAtMs?: number | null;
  changedAnswerCount?: number;
  scoreBreakdown?: QuestionScoreBreakdown | null;
}

export interface RoomSettlementQuestionChoice {
  index: number;
  title: string;
  isCorrect?: boolean;
  isSelectedByMe?: boolean;
}

export interface RoomSettlementQuestionRecap {
  key: string;
  order: number;
  trackIndex: number;
  title: string;
  uploader: string;
  channelId?: string | null;
  duration: string | null;
  thumbnail: string | null;
  sourceId?: string | null;
  provider?: string;
  videoId?: string;
  url?: string;
  myResult?: "correct" | "wrong" | "unanswered";
  myChoiceIndex?: number | null;
  correctChoiceIndex: number;
  choices: RoomSettlementQuestionChoice[];
  participantCount?: number;
  answeredCount?: number;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  fastestCorrectRank?: number | null;
  fastestCorrectMs?: number | null;
  medianCorrectMs?: number | null;
  answersByClientId?: Record<string, RoomSettlementQuestionAnswer>;
}

export interface RoomSettlementHistorySummary {
  matchId: string;
  roundKey: string;
  roundNo: number;
  roomId: string;
  roomName: string;
  startedAt: number;
  endedAt: number;
  status: "ended" | "aborted";
  playerCount: number;
  questionCount: number;
  summaryJson?: Record<string, unknown> | null;
  selfRank?: number | null;
  selfPlayer?: {
    usernameSnapshot: string | null;
    finalScore: number;
    maxCombo: number;
    correctCount: number;
  } | null;
}

export interface RoomSettlementSnapshot {
  roundKey: string;
  roundNo: number;
  startedAt: number;
  endedAt: number;
  room: RoomSummary & {
    hostClientId: string;
    playlist: PlaylistState;
  };
  participants: RoomParticipant[];
  messages: ChatMessage[];
  playlistItems?: PlaylistItem[];
  trackOrder: number[];
  playedQuestionCount: number;
  questionRecaps?: RoomSettlementQuestionRecap[];
}

export interface RoomSummary {
  id: string;
  roomCode: string;
  name: string;
  playerCount: number;
  createdAt: number;
  hasPassword: boolean;
  hasPin?: boolean;
  password?: string | null;
  pin?: string | null;
  playlistCount: number;
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

export interface RoomState {
  room: RoomSummary & {
    hostClientId: string;
    playlist: PlaylistState;
  };
  participants: RoomParticipant[];
  messages: ChatMessage[];
  gameState?: GameState | null;
  settlementHistory: RoomSettlementSnapshot[];
  serverNow: number;
}

export type SitePresencePayload = {
  onlineCount: number;
  updatedAt: number;
};

// Client -> Server
export interface ClientToServerEvents {
  createRoom: (
    payload: {
      roomName: string;
      username: string;
      password?: string;
      pin?: string;
      visibility?: "public" | "private";
      maxPlayers?: number | null;
      gameSettings?: {
        questionCount: number;
        playDurationSec?: number;
        revealDurationSec?: number;
        startOffsetSec?: number;
        allowCollectionClipTiming?: boolean;
        playbackExtensionMode?: PlaybackExtensionMode;
      };
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
    callback?: (ack: Ack<RoomState>) => void,
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
    payload: { roomId: string; username: string },
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
    payload: { content: string },
    callback?: (ack: Ack<ChatMessage>) => void,
  ) => void;
  listRooms: (callback?: (ack: Ack<RoomSummary[]>) => void) => void;
  getSitePresence: (callback?: (ack: Ack<SitePresencePayload>) => void) => void;
  uploadPlaylistChunk: (
    payload: {
      roomId: string;
      uploadId: string;
      items: PlaylistItem[];
      isLast?: boolean;
    },
    callback?: (
      ack: Ack<{ receivedCount: number; totalCount: number }>,
    ) => void,
  ) => void;
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
    callback?: (ack: Ack<{ gameState: GameState; serverNow: number }>) => void,
  ) => void;
  submitAnswer: (
    payload: { roomId: string; choiceIndex: number },
    callback?: (ack: Ack<SubmitAnswerAckData>) => void,
  ) => void;
  requestPlaybackExtensionVote: (
    payload: { roomId: string; remainingMs?: number },
    callback?: (ack: Ack<{ gameState: GameState; serverNow: number }>) => void,
  ) => void;
  castPlaybackExtensionVote: (
    payload: { roomId: string; vote: "approve" | "reject" },
    callback?: (ack: Ack<{ gameState: GameState; serverNow: number }>) => void,
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

// Server -> Client
export interface ServerToClientEvents {
  sitePresenceUpdated: (payload: SitePresencePayload) => void;
  roomsUpdated: (rooms: RoomSummary[]) => void;
  roomCreated: (payload: { room: RoomSummary }) => void;
  roomRemoved: (payload: { roomId: string }) => void;
  joinedRoom: (state: RoomState) => void;
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
  gameStarted: (payload: {
    roomId: string;
    gameState: GameState;
    serverNow: number;
  }) => void;
  gameUpdated: (payload: {
    roomId: string;
    gameState: GameState;
    serverNow: number;
  }) => void;
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
