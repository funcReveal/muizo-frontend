import { API_URL } from "@domain/room/constants";
import { ensureFreshAuthToken } from "@shared/auth/token";

import type {
  CollectionReview,
  CollectionReviewListItem,
  CollectionReviewListPage,
  CollectionReviewSummary,
  CollectionReviewValue,
} from "./types";

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  code?: string;
};

type FetchCollectionReviewSummaryParams = {
  collectionId: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  signal?: AbortSignal;
};

type UpsertCollectionReviewParams = {
  collectionId: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  value: CollectionReviewValue;
};

type FetchCollectionReviewListParams = {
  collectionId: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

export class CollectionReviewApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code?: string | null) {
    super(message);
    this.status = status;
    this.code = code ?? null;
  }
}

const normalizeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeReview = (value: unknown): CollectionReview | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const collectionId = normalizeString(value.collectionId);
  const userId = normalizeString(value.userId);

  if (!id || !collectionId || !userId) return null;

  return {
    id,
    collectionId,
    userId,
    rating: Math.max(1, Math.min(5, Math.trunc(normalizeNumber(value.rating)))),
    comment: normalizeString(value.comment),
    status: normalizeString(value.status) ?? "visible",
    createdAt: Math.max(0, Math.trunc(normalizeNumber(value.createdAt))),
    updatedAt: Math.max(0, Math.trunc(normalizeNumber(value.updatedAt))),
  };
};

const normalizeReviewListItem = (
  value: unknown,
): CollectionReviewListItem | null => {
  const review = normalizeReview(value);
  if (!review || !isRecord(value)) return null;

  return {
    ...review,
    displayName: normalizeString(value.displayName) ?? "玩家",
    avatarUrl: normalizeString(value.avatarUrl),
  };
};

const normalizeReviewListPage = (value: unknown): CollectionReviewListPage => {
  if (Array.isArray(value)) {
    const items = value
      .map(normalizeReviewListItem)
      .filter((item): item is CollectionReviewListItem => Boolean(item));
    return {
      items,
      offset: 0,
      limit: items.length,
      total: items.length,
      hasMore: false,
      nextOffset: null,
    };
  }

  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("Invalid review list payload");
  }

  return {
    items: value.items
      .map(normalizeReviewListItem)
      .filter((item): item is CollectionReviewListItem => Boolean(item)),
    offset: Math.max(0, Math.trunc(normalizeNumber(value.offset))),
    limit: Math.max(1, Math.trunc(normalizeNumber(value.limit, 10))),
    total: Math.max(0, Math.trunc(normalizeNumber(value.total))),
    hasMore: Boolean(value.hasMore),
    nextOffset:
      value.nextOffset === null || value.nextOffset === undefined
        ? null
        : Math.max(0, Math.trunc(normalizeNumber(value.nextOffset))),
  };
};

const normalizeSummary = (value: unknown): CollectionReviewSummary => {
  if (!isRecord(value)) {
    throw new Error("Invalid review summary payload");
  }

  const collectionId = normalizeString(value.collectionId);
  if (!collectionId) {
    throw new Error("Invalid review summary payload");
  }

  return {
    collectionId,
    ratingCount: Math.max(0, Math.trunc(normalizeNumber(value.ratingCount))),
    ratingSum: Math.max(0, Math.trunc(normalizeNumber(value.ratingSum))),
    ratingAvg: Math.max(0, normalizeNumber(value.ratingAvg)),
    reviewCommentCount: Math.max(
      0,
      Math.trunc(normalizeNumber(value.reviewCommentCount)),
    ),
    myReview: normalizeReview(value.myReview),
  };
};

const parseApiPayload = async <T>(
  response: Response,
): Promise<ApiResponse<T> | null> => {
  const raw = (await response.json().catch(() => null)) as
    | (Omit<ApiResponse<T>, "error"> & {
        success?: boolean;
        error?: unknown;
      })
    | null;
  if (!raw) return null;
  // Normalize both the legacy { ok, error: string, code } shape and the migrated
  // Spring Boot { success, error: { code, message } } shape into ApiResponse.
  const ok = raw.ok ?? raw.success;
  const errorObject =
    raw.error && typeof raw.error === "object" ? raw.error : null;
  const errorRecord = errorObject as { code?: string; message?: string } | null;
  return {
    ok,
    data: raw.data,
    error: errorRecord ? errorRecord.message : (raw.error as string | undefined),
    code: errorRecord ? errorRecord.code : raw.code,
  };
};

const buildHeaders = async (
  authToken: string | null,
  refreshAuthToken: () => Promise<string | null>,
): Promise<HeadersInit> => {
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

const requireApiUrl = () => {
  if (!API_URL) {
    throw new Error("API_URL 未設定");
  }
  return API_URL;
};

export const collectionReviewApi = {
  async fetchSummary({
    collectionId,
    authToken,
    refreshAuthToken,
    signal,
  }: FetchCollectionReviewSummaryParams): Promise<CollectionReviewSummary> {
    const apiUrl = requireApiUrl();
    const trimmedCollectionId = collectionId.trim();

    if (!trimmedCollectionId) {
      throw new Error("collectionId is required");
    }

    const headers = await buildHeaders(authToken, refreshAuthToken);

    const response = await fetch(
      `${apiUrl}/api/collections/${encodeURIComponent(
        trimmedCollectionId,
      )}/review-summary`,
      {
        method: "GET",
        headers,
        signal,
      },
    );

    const payload = await parseApiPayload<CollectionReviewSummary>(response);

    if (!response.ok || !payload?.ok || !payload.data) {
      throw new CollectionReviewApiError(
        payload?.error ?? "讀取題庫評價失敗",
        response.status,
        payload?.code,
      );
    }

    return normalizeSummary(payload.data);
  },

  async fetchReviews({
    collectionId,
    authToken,
    refreshAuthToken,
    limit = 10,
    offset = 0,
    signal,
  }: FetchCollectionReviewListParams): Promise<CollectionReviewListPage> {
    const apiUrl = requireApiUrl();
    const trimmedCollectionId = collectionId.trim();

    if (!trimmedCollectionId) {
      throw new Error("collectionId is required");
    }

    const headers = await buildHeaders(authToken, refreshAuthToken);
    const params = new URLSearchParams({
      limit: String(Math.max(1, Math.min(30, Math.trunc(limit)))),
      offset: String(Math.max(0, Math.trunc(offset))),
    });

    const response = await fetch(
      `${apiUrl}/api/collections/${encodeURIComponent(
        trimmedCollectionId,
      )}/reviews?${params.toString()}`,
      {
        method: "GET",
        headers,
        signal,
      },
    );

    const payload = await parseApiPayload<CollectionReviewListPage>(response);

    if (!response.ok || !payload?.ok || !payload.data) {
      throw new CollectionReviewApiError(
        payload?.error ?? "讀取題庫評論失敗",
        response.status,
        payload?.code,
      );
    }

    return normalizeReviewListPage(payload.data);
  },

  async upsertMyReview({
    collectionId,
    authToken,
    refreshAuthToken,
    value,
  }: UpsertCollectionReviewParams): Promise<CollectionReviewSummary> {
    const apiUrl = requireApiUrl();
    const trimmedCollectionId = collectionId.trim();

    if (!trimmedCollectionId) {
      throw new Error("collectionId is required");
    }

    if (!authToken) {
      throw new CollectionReviewApiError(
        "請先登入後再評價",
        401,
        "UNAUTHORIZED",
      );
    }

    const headers = await buildHeaders(authToken, refreshAuthToken);

    const response = await fetch(
      `${apiUrl}/api/collections/${encodeURIComponent(
        trimmedCollectionId,
      )}/my-review`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          rating: value.rating,
          comment: value.comment,
        }),
      },
    );

    const payload = await parseApiPayload<CollectionReviewSummary>(response);

    if (!response.ok || !payload?.ok || !payload.data) {
      throw new CollectionReviewApiError(
        payload?.error ?? "儲存題庫評價失敗",
        response.status,
        payload?.code,
      );
    }

    return normalizeSummary(payload.data);
  },
};
