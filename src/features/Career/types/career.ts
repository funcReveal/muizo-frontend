import type { RoomSettlementHistorySummary } from "@features/RoomSession";

export type CareerTabKey = "overview" | "collectionRanks" | "history";

export interface CareerHeroStats {
  displayName: string;
  descriptor: string;
  totalMatches: number;
  totalScore: number;
  bestScore: number | null;
  bestRank: number | null;
  playTimeSec: number;
  bestCombo: number | null;
}

export interface CareerTrendPoint {
  label: string;
  score: number;
}

export interface CareerCompositeStats {
  averagePlacement: number | null;
  averageScore: number | null;
  top3Rate: number | null;
  firstPlaceCount: number;
  averageAccuracyRate: number | null;
  trend: CareerTrendPoint[];
}

export interface CareerCompositeScope {
  key: string;
  kind: "casual" | "leaderboard";
  label: string;
  stats: CareerCompositeStats;
}

export interface CareerWeeklyStats {
  currentMatches: number;
  previousMatches: number;
  matchesDelta: number | null;

  currentScore: number;
  previousScore: number;
  scoreDelta: number | null;

  currentAccuracyRate: number | null;
  previousAccuracyRate: number | null;
  accuracyDelta: number | null;
}

export type CareerHighlightKey =
  | "bestScore"
  | "bestPlacement"
  | "bestCombo"
  | "bestAccuracy";

export interface CareerHighlightItem {
  key: CareerHighlightKey;
  label: string;
  value: string;
  subtitle: string;
  accentClass: string;
}

export interface CareerCollectionRankShortcutItem {
  id: string;
  title: string;
  coverThumbnailUrl: string | null;
  sourceLabel: string | null;
  matchSummary: RoomSettlementHistorySummary | null;
  leaderboardRank: number | null;
  recentRank: number | null;
  recentPlayerCount: number | null;
  previousLeaderboardRank: number | null;
  delta: number | null;
  lastPlayedAt: string | null;
}

export interface CareerCollectionRankRow {
  id: string;
  title: string;
  coverThumbnailUrl: string | null;
  sourceLabel?: string | null;
  matchSummary?: RoomSettlementHistorySummary | null;
  leaderboardRank: number | null;
  recentRank?: number | null;
  recentPlayerCount?: number | null;
  previousLeaderboardRank: number | null;
  delta: number | null;
  bestScore: number | null;
  playCount: number;
  lastPlayedAt: string | null;
}

export type CareerCollectionRankSortKey =
  | "leaderboardRank"
  | "delta"
  | "playCount"
  | "lastPlayedAt"
  | "bestScore";

export type CareerCollectionRankSortOrder = "asc" | "desc";

export type CareerShareTemplate = "career" | "weekly" | "highlight";

export interface CareerOverviewScopeContent {
  scopeKey: string;
  highlights: CareerHighlightItem[];
  collectionShortcuts: CareerCollectionRankShortcutItem[];
}

export interface CareerShareCardData {
  playerName: string;
  descriptor: string;
  totalMatches: number;
  totalScore: number;
  bestScore: number | null;
  bestRank: number | null;
  bestCombo: number | null;
  playTimeSec: number;
  weeklyScoreDelta: number | null;
  weeklyMatchesDelta: number | null;
  weeklyAccuracyDelta: number | null;
  highlightTitle: string;
  highlightValue: string;
  highlightSubtitle: string;
}

export interface CareerOverviewData {
  hero: CareerHeroStats;
  composite: CareerCompositeStats;
  compositeScopes: CareerCompositeScope[];
  weekly: CareerWeeklyStats;
  highlights: CareerHighlightItem[];
  collectionShortcuts: CareerCollectionRankShortcutItem[];
  scopeContent: CareerOverviewScopeContent[];
}

export interface CareerOverviewQueryResult {
  data: CareerOverviewData;
  isLoading: boolean;
  error: string | null;
}

export interface CareerCollectionRanksQueryResult {
  items: CareerCollectionRankRow[];
  sortKey: CareerCollectionRankSortKey;
  sortOrder: CareerCollectionRankSortOrder;
  setSortKey: (value: CareerCollectionRankSortKey) => void;
  setSortOrder: (value: CareerCollectionRankSortOrder) => void;
  isLoading: boolean;
  error: string | null;
}

export interface CareerShareQueryResult {
  activeTemplate: CareerShareTemplate;
  setActiveTemplate: (value: CareerShareTemplate) => void;
  templates: Array<{
    key: CareerShareTemplate;
    label: string;
    description: string;
  }>;
  preview: CareerShareCardData;
  caption: string;
  isLoading: boolean;
  error: string | null;
}
