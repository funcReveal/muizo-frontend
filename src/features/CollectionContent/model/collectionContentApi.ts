export type CollectionContentApiResult<T> = {
  ok: boolean;
  status: number;
  payload: T | null;
};

export type CollectionSummary = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: "private" | "public";
  item_limit_override?: number | null;
  effective_item_limit?: number | null;
  cover_title?: string | null;
  cover_channel_title?: string | null;
  cover_thumbnail_url?: string | null;
  cover_duration_sec?: number | null;
  cover_source_id?: string | null;
  cover_provider?: string | null;
  ai_edited_count?: number;
  has_ai_edited?: number | boolean;
  version: number;
  item_count?: number;
  use_count: number;
  favorite_count?: number;
  rating_count?: number;
  rating_avg?: number;
  is_favorited?: number | boolean;
  counts_last_use_id: number;
  use_count_updated: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type CollectionItemRecord = {
  id: string;
  collection_id: string;
  sort: number;
  provider: string;
  source_id: string;
  title?: string | null;
  channel_title?: string | null;
  channel_id?: string | null;
  channel_url?: string | null;
  duration_sec?: number | null;
  start_sec: number;
  end_sec: number | null;
  answer_text: string;
  answer_status?:
    | "original"
    | "ai_modified"
    | "manual_reviewed"
    | string
    | null;
  answer_ai_provider?:
    | "grok"
    | "perplexity"
    | "chatgpt"
    | "gemini"
    | string
    | null;
  answer_ai_updated_at?: number | null;
  answer_ai_batch_key?: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type CollectionItemPreviewRecord = {
  id: string;
  sort: number;
  provider: string;
  source_id: string;
  title?: string | null;
  channel_title?: string | null;
  duration_sec?: number | null;
  start_sec?: number | null;
  end_sec?: number | null;
  thumbnail_url?: string | null;
};

export type CollectionLeaderboardProfileSummary = {
  profileKey: string;
  title: string;
  modeKey: string | null;
  variantKey: string | null;
  targetQuestionCount: number | null;
  timeLimitSec: number | null;
  totalPlayers: number;
  myBestRank: number | null;
  myBestScore: number | null;
};

export type CollectionLeaderboardEntry = {
  rank: number;
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  correctCount: number | null;
  questionCount: number | null;
  maxCombo: number;
  avgCorrectMs: number | null;
  durationSec: number | null;
  achievedAt: string;
  isMe: boolean;
};

export type CollectionLeaderboardEntriesPage = {
  profile: {
    profileKey: string;
    title: string;
    modeKey: string | null;
    variantKey: string | null;
    targetQuestionCount: number | null;
    timeLimitSec: number | null;
  };
  items: CollectionLeaderboardEntry[];
  offset: number;
  limit: number;
  totalPlayers: number;
  hasMore: boolean;
  nextOffset: number | null;
};

export type CollectionLeaderboardOverview = {
  profiles: CollectionLeaderboardProfileSummary[];
  activeProfile: CollectionLeaderboardEntriesPage & {
    myBestEntry: CollectionLeaderboardEntry | null;
  };
};

export type WorkerListPayload<TItem> = {
  ok?: boolean;
  data?: {
    items: TItem[];
    page: number;
    pageSize: number;
    hasMore?: boolean;
    nextPage?: number | null;
  };
  error?: string;
  error_code?: string;
};

const API_REQUEST_TIMEOUT_MS = 15_000;

const fetchJson = async <T>(
  url: string,
  options?: RequestInit,
): Promise<CollectionContentApiResult<T>> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    API_REQUEST_TIMEOUT_MS,
  );

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        status: 408,
        payload: { error: "請求逾時，請稍後再試" } as T,
      };
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const apiFetchCollections = (
  apiUrl: string,
  options: {
    token?: string | null;
    ownerId?: string;
    visibility?: "public" | "private";
    sort?: "updated" | "popular" | "favorites_first" | "rating";
    q?: string;
    page?: number;
    pageSize?: number;
  },
) => {
  const url = new URL(`${apiUrl}/api/collections`);
  if (options.ownerId) {
    url.searchParams.set("owner_id", options.ownerId);
  }
  if (options.visibility) {
    url.searchParams.set("visibility", options.visibility);
  }
  if (options.sort) {
    url.searchParams.set("sort", options.sort);
  }
  if (options.q) {
    url.searchParams.set("q", options.q);
  }
  if (options.page !== undefined) {
    url.searchParams.set("page", String(options.page));
  }
  if (options.pageSize !== undefined) {
    url.searchParams.set("pageSize", String(options.pageSize));
  }
  const headers = options.token
    ? { Authorization: `Bearer ${options.token}` }
    : undefined;
  return fetchJson<WorkerListPayload<CollectionSummary>>(url.toString(), {
    headers,
  });
};

export const apiFetchCollectionById = (
  apiUrl: string,
  token: string | null,
  collectionId: string,
  readToken?: string | null,
) => {
  const url = new URL(
    `${apiUrl}/api/collections/${encodeURIComponent(collectionId)}`,
  );

  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (readToken) {
    headers["X-Collection-Read-Token"] = readToken;
  }

  return fetchJson<{
    ok?: boolean;
    data?: {
      collection: CollectionSummary;
    };
    error?: string;
  }>(url.toString(), {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
};

export const apiFavoriteCollection = (
  apiUrl: string,
  token: string,
  collectionId: string,
) =>
  fetchJson<{
    ok?: boolean;
    data?: {
      collection_id: string;
      is_favorited: boolean;
      favorite_count: number;
    };
    error?: string;
  }>(`${apiUrl}/api/collections/${encodeURIComponent(collectionId)}/favorite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const apiUnfavoriteCollection = (
  apiUrl: string,
  token: string,
  collectionId: string,
) =>
  fetchJson<{
    ok?: boolean;
    data?: {
      collection_id: string;
      is_favorited: boolean;
      favorite_count: number;
    };
    error?: string;
  }>(`${apiUrl}/api/collections/${encodeURIComponent(collectionId)}/favorite`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const apiFetchCollectionFavoriteStatus = (
  apiUrl: string,
  token: string,
  collectionId: string,
) =>
  fetchJson<{
    ok?: boolean;
    data?: {
      collection_id: string;
      is_favorited: boolean;
    };
    error?: string;
  }>(
    `${apiUrl}/api/collections/${encodeURIComponent(collectionId)}/favorite-status`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

export const apiFetchCollectionItems = (
  apiUrl: string,
  token: string | null,
  collectionId: string,
  readToken?: string | null,
) => {
  const url = new URL(`${apiUrl}/api/collections/${collectionId}/items/all`);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (readToken) {
    headers["X-Collection-Read-Token"] = readToken;
  }
  return fetchJson<WorkerListPayload<CollectionItemRecord>>(url.toString(), {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
};

export const apiFetchCollectionItemPreview = (
  apiUrl: string,
  token: string | null,
  collectionId: string,
  options?: {
    page?: number;
    pageSize?: number;
    readToken?: string | null;
  },
) => {
  const url = new URL(
    `${apiUrl}/api/collections/${collectionId}/items/preview`,
  );
  if (options?.page !== undefined) {
    url.searchParams.set("page", String(options.page));
  }
  if (options?.pageSize !== undefined) {
    url.searchParams.set("pageSize", String(options.pageSize));
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options?.readToken) {
    headers["X-Collection-Read-Token"] = options.readToken;
  }
  return fetchJson<WorkerListPayload<CollectionItemPreviewRecord>>(
    url.toString(),
    {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    },
  );
};

export const apiFetchCollectionLeaderboardOverview = (
  apiUrl: string,
  token: string | null,
  collectionId: string,
  options: {
    profileKey: string;
    limit?: number;
    readToken?: string | null;
  },
) => {
  const url = new URL(
    `${apiUrl}/api/collections/${collectionId}/leaderboard/overview`,
  );
  url.searchParams.set("profileKey", options.profileKey);
  if (options.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.readToken) {
    headers["X-Collection-Read-Token"] = options.readToken;
  }
  return fetchJson<{
    ok?: boolean;
    data?: CollectionLeaderboardOverview;
    error?: string;
  }>(url.toString(), {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
};

export const apiFetchCollectionLeaderboardRankings = (
  apiUrl: string,
  token: string | null,
  collectionId: string,
  options: {
    profileKey: string;
    limit?: number;
    offset?: number;
    readToken?: string | null;
  },
) => {
  const url = new URL(
    `${apiUrl}/api/collections/${collectionId}/leaderboard/rankings`,
  );
  url.searchParams.set("profileKey", options.profileKey);
  if (options.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }
  if (options.offset !== undefined) {
    url.searchParams.set("offset", String(options.offset));
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.readToken) {
    headers["X-Collection-Read-Token"] = options.readToken;
  }
  return fetchJson<{
    ok?: boolean;
    data?: CollectionLeaderboardEntriesPage;
    error?: string;
  }>(url.toString(), {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
};

export const apiCreateCollectionReadToken = (
  apiUrl: string,
  token: string,
  collectionId: string,
) =>
  fetchJson<{
    ok?: boolean;
    data?: { token: string; expiresAt: number };
    error?: string;
  }>(`${apiUrl}/api/collections/${collectionId}/read-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
