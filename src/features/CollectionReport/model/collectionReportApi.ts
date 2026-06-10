import { API_URL } from "@domain/room/constants";
import { ensureFreshAuthToken } from "@shared/auth/token";

import type {
  CollectionReport,
  CollectionReportStatus,
  CollectionReportType,
  CollectionReportValue,
} from "./types";

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  code?: string;
};

type FetchMyCollectionReportParams = {
  collectionId: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  signal?: AbortSignal;
};

type SubmitCollectionReportParams = {
  collectionId: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  value: CollectionReportValue;
};

export class CollectionReportApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code?: string | null) {
    super(message);
    this.status = status;
    this.code = code ?? null;
  }
}

const REPORT_TYPES: CollectionReportType[] = [
  "wrong_category",
  "inappropriate_content",
  "platform_violation",
];

const REPORT_STATUSES: CollectionReportStatus[] = [
  "pending",
  "reviewed",
  "dismissed",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeEpoch = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  return 0;
};

const normalizeReport = (value: unknown): CollectionReport | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const collectionId = normalizeString(value.collectionId);
  const reportType = normalizeString(value.reportType);
  const status = normalizeString(value.status);

  if (
    !id ||
    !collectionId ||
    !REPORT_TYPES.includes(reportType as CollectionReportType) ||
    !REPORT_STATUSES.includes(status as CollectionReportStatus)
  ) {
    return null;
  }

  return {
    id,
    collectionId,
    reportType: reportType as CollectionReportType,
    description: normalizeString(value.description),
    status: status as CollectionReportStatus,
    createdAt: normalizeEpoch(value.createdAt),
    updatedAt: normalizeEpoch(value.updatedAt),
  };
};

const buildHeaders = async (
  authToken: string,
  refreshAuthToken: () => Promise<string | null>,
): Promise<HeadersInit> => {
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

const requireAuthToken = (authToken: string | null): string => {
  if (!authToken) {
    throw new CollectionReportApiError("請先登入後再檢舉", 401, "UNAUTHORIZED");
  }
  return authToken;
};

export const collectionReportApi = {
  async fetchMyReport({
    collectionId,
    authToken,
    refreshAuthToken,
    signal,
  }: FetchMyCollectionReportParams): Promise<CollectionReport | null> {
    const apiUrl = requireApiUrl();
    const trimmedCollectionId = collectionId.trim();

    if (!trimmedCollectionId) {
      throw new Error("collectionId is required");
    }

    const token = requireAuthToken(authToken);
    const headers = await buildHeaders(token, refreshAuthToken);

    const response = await fetch(
      `${apiUrl}/api/collections/${encodeURIComponent(
        trimmedCollectionId,
      )}/my-report`,
      {
        method: "GET",
        headers,
        signal,
      },
    );

    const payload = (await response
      .json()
      .catch(() => null)) as ApiResponse<unknown> | null;

    if (!response.ok || !payload?.ok) {
      throw new CollectionReportApiError(
        payload?.error ?? "讀取檢舉狀態失敗",
        response.status,
        payload?.code,
      );
    }

    return normalizeReport(payload.data);
  },

  async submitReport({
    collectionId,
    authToken,
    refreshAuthToken,
    value,
  }: SubmitCollectionReportParams): Promise<CollectionReport> {
    const apiUrl = requireApiUrl();
    const trimmedCollectionId = collectionId.trim();

    if (!trimmedCollectionId) {
      throw new Error("collectionId is required");
    }

    const token = requireAuthToken(authToken);
    const headers = await buildHeaders(token, refreshAuthToken);

    const response = await fetch(
      `${apiUrl}/api/collections/${encodeURIComponent(
        trimmedCollectionId,
      )}/report`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          reportType: value.reportType,
          description: value.description,
        }),
      },
    );

    const payload = (await response
      .json()
      .catch(() => null)) as ApiResponse<unknown> | null;

    if (!response.ok || !payload?.ok) {
      throw new CollectionReportApiError(
        payload?.error ?? "送出檢舉失敗",
        response.status,
        payload?.code,
      );
    }

    const report = normalizeReport(payload.data);
    if (!report) {
      throw new CollectionReportApiError("送出檢舉失敗", response.status);
    }

    return report;
  },
};
