import { createContext, useContext } from "react";

import type {
  GameState,
  GameSyncVersion,
  PlaybackExtensionMode,
  PlaylistItem,
  RestartGameVoteAction,
  SubmitAnswerResult,
} from "./types";

export interface RoomGameContextValue {
  // 遊戲狀態
  gameState: GameState | null;
  gameSyncVersion: GameSyncVersion | null;
  gamePlaylist: PlaylistItem[];
  isGameView: boolean;
  setIsGameView: (value: boolean) => void;
  // 遊戲時間設定
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  allowCollectionClipTiming: boolean;
  updatePlayDurationSec: (value: number) => number;
  updateRevealDurationSec: (value: number) => number;
  updateStartOffsetSec: (value: number) => number;
  updateAllowCollectionClipTiming: (value: boolean) => boolean;
  // 遊戲操作
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

export const RoomGameContext = createContext<RoomGameContextValue | null>(null);
RoomGameContext.displayName = "RoomGameContext";

export const useRoomGame = (): RoomGameContextValue => {
  const ctx = useContext(RoomGameContext);
  if (!ctx) throw new Error("useRoomGame must be used within a RoomProvider");
  return ctx;
};
