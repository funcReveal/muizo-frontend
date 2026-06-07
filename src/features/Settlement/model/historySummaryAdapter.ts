import type {
  PlaylistSourceType,
  RoomSettlementHistorySummary,
} from "@features/RoomSession";

const isPlaylistSourceType = (value: unknown): value is PlaylistSourceType =>
  value === "public_collection" ||
  value === "private_collection" ||
  value === "youtube_google_import" ||
  value === "youtube_pasted_link";

const readSummaryJsonField = (
  summary: RoomSettlementHistorySummary,
  field: string,
) => summary.summaryJson?.[field];

export const getHistorySummaryPlaylistTitle = (
  summary: RoomSettlementHistorySummary,
) => {
  const topLevelTitle = summary.playlistTitle?.trim();
  if (topLevelTitle) return topLevelTitle;

  const summaryTitle = readSummaryJsonField(summary, "playlistTitle");
  if (typeof summaryTitle === "string" && summaryTitle.trim().length > 0) {
    return summaryTitle.trim();
  }

  return null;
};

export const getHistorySummaryPlaylistDisplayTitle = (
  summary: RoomSettlementHistorySummary,
) => getHistorySummaryPlaylistTitle(summary) ?? "未命名播放清單";

export const getHistorySummaryPlaylistSourceType = (
  summary: RoomSettlementHistorySummary,
): PlaylistSourceType | null => {
  if (isPlaylistSourceType(summary.playlistSourceType)) {
    return summary.playlistSourceType;
  }

  const summarySourceType = readSummaryJsonField(
    summary,
    "playlistSourceType",
  );
  return isPlaylistSourceType(summarySourceType) ? summarySourceType : null;
};

export const getHistorySummaryPlaylistSourceLabel = (
  summary: RoomSettlementHistorySummary,
) => {
  const sourceType = getHistorySummaryPlaylistSourceType(summary);
  switch (sourceType) {
    case "public_collection":
    case "private_collection":
      return "收藏庫";
    case "youtube_google_import":
    case "youtube_pasted_link":
      return "YouTube 清單";
    default:
      return "未知來源";
  }
};

export const isCollectionHistorySummary = (
  summary: RoomSettlementHistorySummary,
) => {
  const sourceType = getHistorySummaryPlaylistSourceType(summary);
  return (
    sourceType === "public_collection" || sourceType === "private_collection"
  );
};

export const isYouTubeHistorySummary = (
  summary: RoomSettlementHistorySummary,
) => {
  const sourceType = getHistorySummaryPlaylistSourceType(summary);
  return (
    sourceType === "youtube_google_import" ||
    sourceType === "youtube_pasted_link"
  );
};

export const getHistorySummaryPlaylistItemCount = (
  summary: RoomSettlementHistorySummary,
) => {
  const topLevelCount = summary.playlistItemCount;
  if (
    typeof topLevelCount === "number" &&
    Number.isFinite(topLevelCount) &&
    topLevelCount >= 0
  ) {
    return Math.floor(topLevelCount);
  }

  const summaryCount = readSummaryJsonField(summary, "playlistItemCount");
  if (
    typeof summaryCount === "number" &&
    Number.isFinite(summaryCount) &&
    summaryCount >= 0
  ) {
    return Math.floor(summaryCount);
  }

  return null;
};

export const getHistorySummaryCollectionId = (
  summary: RoomSettlementHistorySummary,
) => {
  const topLevelId = summary.collectionId?.trim();
  if (topLevelId) return topLevelId;

  const summaryCollectionId = readSummaryJsonField(summary, "collectionId");
  if (
    typeof summaryCollectionId === "string" &&
    summaryCollectionId.trim().length > 0
  ) {
    return summaryCollectionId.trim();
  }

  return null;
};

export const getHistorySummaryPlayMode = (
  summary: RoomSettlementHistorySummary,
): "casual" | "leaderboard" => {
  if (summary.playMode === "leaderboard") return "leaderboard";
  if (
    typeof summary.leaderboardProfileKey === "string" &&
    summary.leaderboardProfileKey.trim().length > 0
  ) {
    return "leaderboard";
  }

  const summaryPlayMode = readSummaryJsonField(summary, "playMode");
  if (summaryPlayMode === "leaderboard") return "leaderboard";

  const summaryProfileKey = readSummaryJsonField(
    summary,
    "leaderboardProfileKey",
  );
  if (
    typeof summaryProfileKey === "string" &&
    summaryProfileKey.trim().length > 0
  ) {
    return "leaderboard";
  }

  return "casual";
};

export const isLeaderboardHistorySummary = (
  summary: RoomSettlementHistorySummary,
) => getHistorySummaryPlayMode(summary) === "leaderboard";

export const getHistorySummaryPlaylistCoverThumbnailUrl = (
  summary: RoomSettlementHistorySummary,
) => {
  const topLevelUrl = summary.playlistCoverThumbnailUrl?.trim();
  if (topLevelUrl) return topLevelUrl;

  const candidateFields = [
    "playlistCoverThumbnailUrl",
    "coverThumbnailUrl",
    "thumbnail",
  ];

  for (const field of candidateFields) {
    const value = readSummaryJsonField(summary, field);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};
