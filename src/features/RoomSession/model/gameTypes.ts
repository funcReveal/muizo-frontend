import type { RoomSettlementQuestionAnswer } from "./settlementTypes";

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

export interface GameSyncVersion {
  gameSessionId: number;
  phaseVersion: number;
  questionSubmitSeq: number;
  roomVersion: number;
}

export interface GameLiveUpdatePayload {
  roomId: string;
  gameState: GameState;
  serverNow: number;
  syncVersion: GameSyncVersion;
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
  timeAttackTimeLimitMs?: number | null;
  timeAttackGuessElapsedMs?: number;
  timeAttackRemainingMs?: number | null;
  timeAttackEndReason?: "time_over" | "completed_all" | null;
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
