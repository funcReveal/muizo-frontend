import type { RoomSettlementHistorySummary } from "@features/RoomSession";

export const formatCareerHistoryDateTime = (timestamp: number) => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "-";
  return new Date(timestamp).toLocaleString();
};

export const getCareerHistoryMatchDurationMs = (
  startedAt: number,
  endedAt: number,
) => {
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return null;
  if (startedAt <= 0 || endedAt <= 0 || endedAt <= startedAt) return null;
  return endedAt - startedAt;
};

export const formatCareerHistoryDuration = (durationMs: number | null) => {
  if (!durationMs || durationMs <= 0) return "-";
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}時 ${minutes}分 ${seconds}秒`;
  if (minutes > 0) return `${minutes}分 ${seconds}秒`;
  return `${seconds}秒`;
};

export const formatCareerHistoryMonthDayTime = (timestamp: number) => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "-";
  return new Date(timestamp).toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatCareerHistoryScore = (score: number | null | undefined) => {
  if (typeof score !== "number" || !Number.isFinite(score)) return "-";
  return Math.max(0, Math.floor(score)).toLocaleString("zh-TW");
};

export const formatCareerHistoryRankFraction = (
  rank: number | null,
  playerCount: number | null | undefined,
) => {
  const safeCount =
    typeof playerCount === "number" &&
    Number.isFinite(playerCount) &&
    playerCount > 0
      ? Math.floor(playerCount)
      : null;

  if (typeof rank === "number" && Number.isFinite(rank) && rank > 0) {
    return safeCount
      ? `${Math.floor(rank)}/${safeCount}`
      : String(Math.floor(rank));
  }

  return safeCount ? `-/${safeCount}` : "-";
};

export const getCareerHistoryGroupKeyFromSummary = (
  summary: RoomSettlementHistorySummary,
) => summary.roomId || summary.roomName || summary.matchId;

export const isBetterCareerHistoryRankResult = (
  candidate: { rank: number; playerCount: number; endedAt: number },
  currentBest: { rank: number; playerCount: number; endedAt: number } | null,
) => {
  if (!currentBest) return true;
  if (candidate.rank !== currentBest.rank)
    return candidate.rank < currentBest.rank;
  if (candidate.playerCount !== currentBest.playerCount) {
    return candidate.playerCount > currentBest.playerCount;
  }
  return candidate.endedAt > currentBest.endedAt;
};
