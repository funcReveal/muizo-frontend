export const RANKED_CHALLENGE_PROFILE_KEY = "classic_30";

export type RankedChallengeRun = {
  score: number;
  correctCount: number;
  questionCount: number;
  maxCombo: number;
  avgCorrectMs: number | null;
  playedAt?: number | string | null;
  roomRank?: number | null;
};

export type RankedChallengeBestRun = {
  rank?: number | null;
  score: number;
  correctCount: number;
  maxCombo: number;
  avgCorrectMs: number | null;
  playedAt?: string | null;
};

export type RankedChallengeDelta = {
  score: number | null;
  correctCount: number | null;
  maxCombo: number | null;
  avgCorrectMs: number | null;
};

export type RankedChallengeLeaderboardEntry = {
  rank: number;
  userId?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  score: number;
  correctCount: number;
  maxCombo: number;
  avgCorrectMs: number | null;
  playedAt?: string | null;
  isMe?: boolean;
};

export type RankedChallengeSettlementState = {
  isRankedChallenge: boolean;
  loading: boolean;
  error: string | null;
  loadingMore: boolean;
  currentRun: RankedChallengeRun | null;
  myRankedSummary: {
    currentRank: number | null;
    totalRankedPlayers: number | null;
    surpassedPercent: number | null;
    bestAfterRun: RankedChallengeBestRun | null;
    previousBestBeforeRun: RankedChallengeBestRun | null;
    deltaVsPreviousBest: RankedChallengeDelta | null;
    isNewBest: boolean;
  } | null;
  leaderboardTopEntries: RankedChallengeLeaderboardEntry[];
  leaderboardPagedEntries: RankedChallengeLeaderboardEntry[];
  totalRankedPlayers: number | null;
  hasMore: boolean;
  nextOffset: number | null;
  loadMoreLeaderboardEntries: () => void;
};
