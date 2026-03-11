import type { RoomSettlementHistorySummary } from "../../model/types";

export const SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX = "settlement-review:";

export interface LobbySettlementStats {
  rank: number | null;
  score: number | null;
  correctCount: number | null;
  playerCount: number;
}

export const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString();
};

export const formatLobbySettlementSummary = (
  summary: Pick<
    RoomSettlementHistorySummary,
    "roundNo" | "questionCount" | "playerCount"
  >,
  stats?: LobbySettlementStats | null,
) => {
  const playerCount = Math.max(
    0,
    stats?.playerCount ?? summary.playerCount ?? 0,
  );
  const questionCount = Math.max(0, summary.questionCount ?? 0);
  const hasCompleteStats =
    Boolean(stats && stats.rank && stats.rank > 0) &&
    typeof stats?.score === "number" &&
    typeof stats?.correctCount === "number";

  if (!hasCompleteStats || !stats) {
    return `第 ${summary.roundNo} 局 · ${playerCount} 人 · ${questionCount} 題 · 資料同步中`;
  }

  return `第 ${summary.roundNo} 局 · 第 ${stats.rank}/${playerCount} 名 · ${stats.score.toLocaleString()} 分 · ${Math.max(
    0,
    Math.round(stats.correctCount),
  )}/${questionCount} 題`;
};

export const normalizeDisplayText = (
  value: string | null | undefined,
  fallback: string,
) => {
  const text = (value ?? "").trim();
  if (!text) return fallback;
  const replacementCount = (text.match(/\uFFFD/g) ?? []).length;
  const questionCount = (text.match(/\?/g) ?? []).length;
  const looksBroken =
    replacementCount > 0 ||
    (questionCount >= 3 && questionCount / Math.max(1, text.length) > 0.15);
  return looksBroken ? fallback : text;
};
