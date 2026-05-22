import { createContext, useContext } from "react";

import type {
  GameState,
  GameSyncVersion,
  PlaybackExtensionMode,
  PlaylistItem,
  RestartGameVoteAction,
  SubmitAnswerResult,
} from "./types";

// Volatile state — changes on every game update (answer, phase transition, etc.)
export interface RoomGameStateContextValue {
  gameState: GameState | null;
  gameSyncVersion: GameSyncVersion | null;
  gamePlaylist: PlaylistItem[];
  isGameView: boolean;
}

// Stable actions and settings — deps are stable refs, not game state
export interface RoomGameActionsContextValue {
  setIsGameView: (value: boolean) => void;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  allowCollectionClipTiming: boolean;
  updatePlayDurationSec: (value: number) => number;
  updateRevealDurationSec: (value: number) => number;
  updateStartOffsetSec: (value: number) => number;
  updateAllowCollectionClipTiming: (value: boolean) => boolean;
  handleStartGame: () => void;
  handleRestartGame: () => void;
  handleSubmitChoice: (choiceIndex: number) => Promise<SubmitAnswerResult>;
  handleRequestPlaybackExtensionVote: (
    remainingMs?: number,
  ) => Promise<boolean>;
  handleCastPlaybackExtensionVote: (
    vote: "approve" | "reject",
  ) => Promise<boolean>;
  handleRequestRestartGameVote: (
    action: RestartGameVoteAction,
  ) => Promise<boolean>;
  handleCastRestartGameVote: (vote: "approve" | "reject") => Promise<boolean>;
  handleReportPlaybackError: (payload: {
    provider: string;
    sourceId: string;
    errorCode?: string | number;
    trackIndex?: number;
    gameSessionId?: string | number | null;
  }) => void;
  handleUpdateRoomSettings: (payload: {
    name?: string;
    visibility?: "public" | "private";
    password?: string | null;
    pin?: string | null;
    questionCount?: number;
    playDurationSec?: number;
    revealDurationSec?: number;
    startOffsetSec?: number;
    allowCollectionClipTiming?: boolean;
    playbackExtensionMode?: PlaybackExtensionMode;
    maxPlayers?: number | null;
    leaderboardProfileKey?: string | null;
    leaderboardRuleVersion?: number | null;
    leaderboardModeKey?: string | null;
    leaderboardVariantKey?: string | null;
    leaderboardTargetQuestionCount?: number | null;
    leaderboardTimeLimitSec?: number | null;
    leaderboardRankingMetric?: string | null;
  }) => Promise<boolean>;
}

// Merged shape kept for backward compatibility
export type RoomGameContextValue = RoomGameStateContextValue &
  RoomGameActionsContextValue;

export const RoomGameStateContext =
  createContext<RoomGameStateContextValue | null>(null);
RoomGameStateContext.displayName = "RoomGameStateContext";

export const RoomGameActionsContext =
  createContext<RoomGameActionsContextValue | null>(null);
RoomGameActionsContext.displayName = "RoomGameActionsContext";

// Legacy context — consumers that need both state and actions can use this.
// Prefer useRoomGameState() / useRoomGameActions() in hot render paths.
export const RoomGameContext = createContext<RoomGameContextValue | null>(null);
RoomGameContext.displayName = "RoomGameContext";

export const useRoomGameState = (): RoomGameStateContextValue => {
  const ctx = useContext(RoomGameStateContext);
  if (!ctx)
    throw new Error("useRoomGameState must be used within a RoomProvider");
  return ctx;
};

export const useRoomGameActions = (): RoomGameActionsContextValue => {
  const ctx = useContext(RoomGameActionsContext);
  if (!ctx)
    throw new Error("useRoomGameActions must be used within a RoomProvider");
  return ctx;
};

export const useRoomGame = (): RoomGameContextValue => {
  const ctx = useContext(RoomGameContext);
  if (!ctx) throw new Error("useRoomGame must be used within a RoomProvider");
  return ctx;
};
