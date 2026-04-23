import type {
  ChatMessage,
  PlaylistItem,
  PlaylistSourceType,
  PlaylistState,
  QuestionScoreBreakdown,
  RoomParticipant,
  RoomSummary,
} from "./types";

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
  playlistTitle?: string | null;
  playlistSourceType?: PlaylistSourceType | null;
  playlistItemCount?: number | null;
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
  matchId?: string | null;
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
