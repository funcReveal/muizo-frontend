import type { CreatorMetric } from "./CreatorAnalytics";

export async function fetchCreatorAnalytics<T>(apiUrl: string, token: string, path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? body?.error ?? "創作者資料載入失敗");
  return body?.data as T;
}

export function formatChange(metric: CreatorMetric) {
  const difference = metric.value - metric.previousValue;
  if (difference === 0) return "與前期持平";
  return `${difference > 0 ? "+" : ""}${difference.toLocaleString("zh-TW")} 較前期`;
}
