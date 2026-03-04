import { Socket } from "socket.io-client";

export type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export interface PlaylistItem {
  title: string;
  url: string;
  uploader?: string;
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

export interface PlaylistState {
  id?: string;
  title?: string;
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
  lockedClientIds?: string[];
  lockedOrder?: string[];
  questionStats?: GameQuestionStats;
}

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
  socketId?: string;
  joinedAt: number;
  isOnline: boolean;
  lastSeen: number;
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
  name: string;
  playerCount: number;
  createdAt: number;
  hasPassword: boolean;
  playlistCount: number;
  gameSettings?: {
    questionCount: number;
    playDurationSec?: number;
    revealDurationSec?: number;
    startOffsetSec?: number;
    allowCollectionClipTiming?: boolean;
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

// Client -> Server
export interface ClientToServerEvents {
  createRoom: (
    payload: {
      roomName: string;
      username: string;
      password?: string;
      visibility?: "public" | "private";
      maxPlayers?: number | null;
      gameSettings?: {
        questionCount: number;
        playDurationSec?: number;
        revealDurationSec?: number;
        startOffsetSec?: number;
        allowCollectionClipTiming?: boolean;
      };
      playlist: {
        uploadId: string;
        id?: string;
        title?: string;
        totalCount: number;
        items?: PlaylistItem[];
        isLast?: boolean;
        pageSize?: number;
      };
    },
    callback?: (ack: Ack<RoomState>) => void
  ) => void;
  joinRoom: (
    payload: { roomId: string; username: string; password?: string },
    callback?: (ack: Ack<RoomState>) => void
  ) => void;
  resumeSession: (
    payload: { roomId: string; username: string },
    callback?: (ack: Ack<RoomState>) => void
  ) => void;
  leaveRoom: (
    payload: { roomId: string },
    callback?: (ack: Ack<null>) => void
  ) => void;
  sendMessage: (
    payload: { content: string },
    callback?: (ack: Ack<ChatMessage>) => void
  ) => void;
  listRooms: (callback?: (ack: Ack<RoomSummary[]>) => void) => void;
  uploadPlaylistChunk: (
    payload: {
      roomId: string;
      uploadId: string;
      items: PlaylistItem[];
      isLast?: boolean;
    },
    callback?: (ack: Ack<{ receivedCount: number; totalCount: number }>) => void
  ) => void;
  getPlaylistPage: (
    payload: { roomId: string; page: number; pageSize?: number },
    callback?: (ack: Ack<{
      items: PlaylistItem[];
      totalCount: number;
      page: number;
      pageSize: number;
      ready: boolean;
    }>) => void
  ) => void;
  startGame: (
    payload: {
      roomId: string;
      guessDurationMs?: number;
      revealDurationMs?: number;
      showVideo?: boolean;
    },
    callback?: (ack: Ack<{ gameState: GameState; serverNow: number }>) => void
  ) => void;
  submitAnswer: (
    payload: { roomId: string; choiceIndex: number },
    callback?: (ack: Ack<SubmitAnswerAckData>) => void
  ) => void;
  updateRoomSettings: (
    payload: {
      roomId: string;
      name?: string;
      visibility?: "public" | "private";
      password?: string | null;
      questionCount?: number;
      playDurationSec?: number;
      revealDurationSec?: number;
      startOffsetSec?: number;
      allowCollectionClipTiming?: boolean;
      maxPlayers?: number | null;
    },
    callback?: (ack: Ack<{ room: RoomSummary }>) => void
  ) => void;
  kickPlayer: (
    payload: { roomId: string; targetClientId: string; durationMs?: number | null },
    callback?: (ack: Ack<null>) => void
  ) => void;
  transferHost: (
    payload: { roomId: string; targetClientId: string },
    callback?: (ack: Ack<{ hostClientId: string }>) => void
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
    callback?: (ack: Ack<null>) => void
  ) => void;
  changePlaylist: (
    payload: {
      roomId: string;
      playlist: {
        uploadId: string;
        id?: string;
        title?: string;
        totalCount: number;
        items?: PlaylistItem[];
        isLast?: boolean;
        pageSize?: number;
      };
    },
    callback?: (ack: Ack<{ receivedCount: number; totalCount: number; ready: boolean }>) => void
  ) => void;
  listSettlementHistorySummaries: (
    payload: { roomId: string; limit?: number; beforeEndedAt?: number | null },
    callback?: (ack: Ack<{ items: RoomSettlementHistorySummary[]; nextCursor: number | null }>) => void
  ) => void;
  getSettlementReplay: (
    payload: { roomId: string; matchId: string; roundKey?: string | null },
    callback?: (ack: Ack<RoomSettlementSnapshot>) => void
  ) => void;
}

// Server -> Client
export interface ServerToClientEvents {
  roomsUpdated: (rooms: RoomSummary[]) => void;
  joinedRoom: (state: RoomState) => void;
  sessionProgress: (payload: SessionProgressPayload) => void;
  participantsUpdated: (payload: {
    roomId: string;
    participants: RoomParticipant[];
    hostClientId: string;
  }) => void;
  playlistProgress: (payload: {
    roomId: string;
    receivedCount: number;
    totalCount: number;
    ready: boolean;
  }) => void;
  playlistUpdated: (payload: { roomId: string; playlist: PlaylistState }) => void;
  userLeft: (payload: { roomId: string; clientId: string }) => void;
  messageAdded: (payload: { roomId: string; message: ChatMessage }) => void;
  gameStarted: (payload: { roomId: string; gameState: GameState; serverNow: number }) => void;
  gameUpdated: (payload: { roomId: string; gameState: GameState; serverNow: number }) => void;
  roomUpdated: (payload: { room: RoomSummary }) => void;
  kicked: (payload: { roomId: string; reason: string; bannedUntil: number | null }) => void;
  playlistSuggestionsUpdated: (payload: { roomId: string; suggestions: PlaylistSuggestion[] }) => void;
  settlementHistoryUpdated: (payload: {
    roomId: string;
    settlementHistory: RoomSettlementSnapshot[];
  }) => void;
}

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
