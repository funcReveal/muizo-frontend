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

export interface LeaderboardSettlementEntry {
  rank: number;
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  correctCount: number;
  questionCount: number;
  maxCombo: number;
  avgCorrectMs: number | null;
  durationSec: number | null;
  isMe: boolean;
}

export interface PersonalBestComparison {
  hasPreviousBest: boolean;
  previousBestScore: number | null;
  previousBestRank: number | null;
  previousBestCorrectCount: number | null;
  previousBestMaxCombo: number | null;
  previousBestAvgCorrectMs: number | null;
  scoreDelta: number | null;
  rankDelta: number | null;
}

export interface LeaderboardSettlementReadyPayload {
  roomId: string;
  roundKey: string;
  matchId: string;
  collectionId: string;
  leaderboardProfileKey: string;
}

export interface LeaderboardSettlementResponse {
  match: {
    matchId: string;
    roundKey: string;
    playedAt: number;
    status: "ended" | "aborted";
  };
  collection: {
    id: string;
    title: string;
    coverThumbnailUrl: string | null;
    itemCount: number | null;
    visibility: "public" | "private";
  };
  profile: {
    profileKey: string;
    title: string;
    modeKey: "classic" | "time_attack";
    variantKey: string | null;
    ruleVersion: number;
    targetQuestionCount: number | null;
    timeLimitSec: number | null;
  };
  currentRun: {
    score: number;
    rank: number;
    totalPlayers: number;
    correctCount: number;
    questionCount: number;
    maxCombo: number;
    avgCorrectMs: number | null;
    durationSec: number | null;
    percentile: number | null;
    rankChange: number | null;
    gapToFirst: number | null;
    gapToPrevious: number | null;
    isPersonalBest: boolean;
  };
  personalBestComparison: PersonalBestComparison | null;
  leaderboardTop: LeaderboardSettlementEntry[];
  leaderboardAroundMe: LeaderboardSettlementEntry[];
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
