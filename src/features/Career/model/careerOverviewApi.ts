import { ensureFreshAuthToken } from "@shared/auth/token";

import type {
  CareerCollectionRankShortcutItem,
  CareerCollectionRankRow,
  CareerCompositeScope,
  CareerCompositeStats,
  CareerHeroStats,
  CareerHighlightItem,
  CareerOverviewData,
  CareerOverviewScopeContent,
  CareerWeeklyStats,
} from "../types/career";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

type CareerOverviewApiResponse = {
  ok: boolean;
  data?: PartialCareerOverviewData;
  error?: string;
};

type CareerCollectionRanksApiResponse = {
  ok: boolean;
  data?: {
    items?: CareerCollectionRankRow[];
  };
  error?: string;
};

type PartialCareerOverviewData = {
  hero?: Partial<CareerHeroStats>;
  composite?: Partial<CareerCompositeStats>;
  compositeScopes?: Array<Partial<CareerCompositeScope>>;
  weekly?: Partial<CareerWeeklyStats>;
  highlights?: CareerHighlightItem[];
  collectionShortcuts?: CareerCollectionRankShortcutItem[];
  scopeContent?: Array<Partial<CareerOverviewScopeContent>>;
};

interface FetchCareerOverviewParams {
  clientId: string | null;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
}

export const emptyCareerOverviewData: CareerOverviewData = {
  hero: {
    displayName: "玩家",
    descriptor: "尚無生涯紀錄",
    totalMatches: 0,
    totalScore: 0,
    bestScore: null,
    bestRank: null,
    playTimeSec: 0,
    bestCombo: null,
  },
  composite: {
    averagePlacement: null,
    averageScore: null,
    top3Rate: null,
    firstPlaceCount: 0,
    averageAccuracyRate: null,
    trend: [],
  },
  compositeScopes: [],
  weekly: {
    currentMatches: 0,
    previousMatches: 0,
    matchesDelta: null,
    currentScore: 0,
    previousScore: 0,
    scoreDelta: null,
    currentAccuracyRate: null,
    previousAccuracyRate: null,
    accuracyDelta: null,
  },
  highlights: [],
  collectionShortcuts: [],
  scopeContent: [],
};

const normalizeCareerCompositeStats = (
  incoming?: Partial<CareerCompositeStats>,
): CareerCompositeStats => ({
  ...emptyCareerOverviewData.composite,
  ...(incoming ?? {}),
  trend:
    incoming?.trend && Array.isArray(incoming.trend)
      ? incoming.trend
      : emptyCareerOverviewData.composite.trend,
});

const buildHeaders = async (
  authToken: string | null,
  refreshAuthToken: () => Promise<string | null>,
) => {
  if (!authToken) {
    return {
      "Content-Type": "application/json",
    };
  }

  const token = await ensureFreshAuthToken({
    token: authToken,
    refreshAuthToken,
  });

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const normalizeCareerOverviewData = (
  incoming?: PartialCareerOverviewData,
): CareerOverviewData => {
  const base = emptyCareerOverviewData;
  if (!incoming) return base;

  return {
    hero: {
      ...base.hero,
      ...(incoming.hero ?? {}),
    },
    composite: {
      ...normalizeCareerCompositeStats(incoming.composite),
    },
    compositeScopes: Array.isArray(incoming.compositeScopes)
      ? incoming.compositeScopes
          .filter(
            (item): item is Partial<CareerCompositeScope> =>
              typeof item?.key === "string" &&
              typeof item?.label === "string",
          )
          .map((item) => ({
            key: item.key ?? "overall",
            kind: item.kind === "leaderboard" ? "leaderboard" : "casual",
            label: item.label ?? "總覽",
            stats: normalizeCareerCompositeStats(item.stats),
          }))
      : [],
    weekly: {
      ...base.weekly,
      ...(incoming.weekly ?? {}),
    },
    highlights: Array.isArray(incoming.highlights) ? incoming.highlights : [],
    collectionShortcuts:
      incoming.collectionShortcuts && Array.isArray(incoming.collectionShortcuts)
        ? incoming.collectionShortcuts.map((item) => ({
            ...item,
            coverThumbnailUrl: item.coverThumbnailUrl ?? null,
            sourceLabel: item.sourceLabel ?? null,
            matchSummary: item.matchSummary ?? null,
            lastPlayedAt: item.lastPlayedAt ?? null,
            recentRank: item.recentRank ?? null,
            recentPlayerCount: item.recentPlayerCount ?? null,
            previousLeaderboardRank: item.previousLeaderboardRank ?? null,
            delta: item.delta ?? null,
          }))
        : [],
    scopeContent: Array.isArray(incoming.scopeContent)
      ? incoming.scopeContent
          .filter(
            (item): item is Partial<CareerOverviewScopeContent> =>
              typeof item?.scopeKey === "string",
          )
          .map((item) => ({
            scopeKey: item.scopeKey ?? "casual",
            highlights: Array.isArray(item.highlights) ? item.highlights : [],
            collectionShortcuts: Array.isArray(item.collectionShortcuts)
              ? item.collectionShortcuts.map((shortcut) => ({
                  ...shortcut,
                  coverThumbnailUrl: shortcut.coverThumbnailUrl ?? null,
                  sourceLabel: shortcut.sourceLabel ?? null,
                  matchSummary: shortcut.matchSummary ?? null,
                  lastPlayedAt: shortcut.lastPlayedAt ?? null,
                  recentRank: shortcut.recentRank ?? null,
                  recentPlayerCount: shortcut.recentPlayerCount ?? null,
                  previousLeaderboardRank:
                    shortcut.previousLeaderboardRank ?? null,
                  delta: shortcut.delta ?? null,
                }))
              : [],
          }))
      : [],
  };
};

export const fetchCareerOverview = async ({
  clientId,
  authToken,
  refreshAuthToken,
}: FetchCareerOverviewParams): Promise<CareerOverviewData> => {
  if (!API_URL) {
    throw new Error("尚未設定生涯 API 位置");
  }

  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);

  const url = `${API_URL}/api/career/overview${
    params.size ? `?${params.toString()}` : ""
  }`;

  const headers = await buildHeaders(authToken, refreshAuthToken);

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  const payload = (await response
    .json()
    .catch(() => null)) as CareerOverviewApiResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? "讀取生涯總覽失敗");
  }

  return normalizeCareerOverviewData(payload.data);
};

export const fetchCareerCollectionRanks = async ({
  clientId,
  authToken,
  refreshAuthToken,
}: FetchCareerOverviewParams): Promise<
  CareerCollectionRankRow[]
> => {
  if (!API_URL) return [];

  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);

  const url = `${API_URL}/api/career/collection-ranks${
    params.size ? `?${params.toString()}` : ""
  }`;

  const headers = await buildHeaders(authToken, refreshAuthToken);

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  const payload = (await response
    .json()
    .catch(() => null)) as CareerCollectionRanksApiResponse | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? "讀取題庫戰績失敗");
  }

  return (payload.data?.items ?? []).map((item) => ({
    ...item,
    coverThumbnailUrl: item.coverThumbnailUrl ?? null,
    sourceLabel: item.sourceLabel ?? null,
    matchSummary: item.matchSummary ?? null,
    recentRank: item.recentRank ?? null,
    recentPlayerCount: item.recentPlayerCount ?? null,
    previousLeaderboardRank: item.previousLeaderboardRank ?? null,
    delta: item.delta ?? null,
  }));
};
