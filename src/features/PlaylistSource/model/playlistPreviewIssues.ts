import type { PlaylistPreviewMeta } from "./types";

export type PlaylistIssueListItem = {
  title: string;
  reason: string;
  thumbnail?: string;
};

export type PlaylistIssueSummary = {
  duplicate: PlaylistIssueListItem[];
  removed: PlaylistIssueListItem[];
  privateRestricted: PlaylistIssueListItem[];
  embedBlocked: PlaylistIssueListItem[];
  unavailable: PlaylistIssueListItem[];
  unknown: PlaylistIssueListItem[];
  unknownCount: number;
  exact?: boolean;
};

export const EMPTY_PLAYLIST_ISSUE_SUMMARY: PlaylistIssueSummary = {
  duplicate: [],
  removed: [],
  privateRestricted: [],
  embedBlocked: [],
  unavailable: [],
  unknown: [],
  unknownCount: 0,
  exact: false,
};

const normalizeBlockedReason = (reason?: string | null) => {
  const normalized = reason?.trim() ?? "";
  const lower = normalized.toLowerCase();
  if (
    lower.includes("age") ||
    lower.includes("mature") ||
    lower.includes("adult") ||
    normalized.includes("年齡") ||
    normalized.includes("限制級")
  ) {
    return "因年齡限制，不允許嵌入播放";
  }
  if (
    lower.includes("copyright") ||
    lower.includes("rights") ||
    lower.includes("owner") ||
    normalized.includes("版權") ||
    normalized.includes("權利") ||
    normalized.includes("擁有者")
  ) {
    return "因版權或權利設定，不允許嵌入播放";
  }
  return "此影片不允許嵌入播放";
};

export const buildPlaylistIssueSummary = (
  playlistPreviewMeta: PlaylistPreviewMeta | null | undefined,
): PlaylistIssueSummary => {
  if (playlistPreviewMeta?.skippedItems?.length) {
    const summary: PlaylistIssueSummary = {
      ...EMPTY_PLAYLIST_ISSUE_SUMMARY,
      duplicate: [],
      removed: [],
      privateRestricted: [],
      embedBlocked: [],
      unavailable: [],
      unknown: [],
      exact: true,
    };

    playlistPreviewMeta.skippedItems.forEach((item) => {
      const title = item.title?.trim() || item.videoId || "未知項目";
      const thumbnail = item.videoId
        ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
        : undefined;
      const fallbackReason =
        item.status === "duplicate"
          ? "播放清單內已有相同曲目，已略過"
          : item.status === "removed"
            ? "影片已移除"
            : item.status === "private"
              ? "私人或受限制，無法匯入"
              : item.status === "blocked"
                ? normalizeBlockedReason(item.reason)
                : item.status === "unavailable"
                  ? "影片目前不可用"
                  : "無法判斷匯入原因";
      const issueItem = {
        title,
        thumbnail,
        reason:
          item.status === "duplicate"
            ? fallbackReason
            : item.status === "blocked"
            ? normalizeBlockedReason(item.reason)
            : item.reason?.trim() || fallbackReason,
      };

      if (item.status === "duplicate") {
        summary.duplicate.push(issueItem);
        return;
      }
      if (item.status === "removed") {
        summary.removed.push(issueItem);
        return;
      }
      if (item.status === "private") {
        summary.privateRestricted.push(issueItem);
        return;
      }
      if (item.status === "blocked") {
        summary.embedBlocked.push(issueItem);
        return;
      }
      if (item.status === "unavailable") {
        summary.unavailable.push(issueItem);
        return;
      }
      summary.unknown.push(issueItem);
    });

    return summary;
  }

  return {
    ...EMPTY_PLAYLIST_ISSUE_SUMMARY,
    unknownCount: playlistPreviewMeta?.skippedCount ?? 0,
  };
};

export const getPlaylistIssueTotal = (summary: PlaylistIssueSummary) =>
  summary.duplicate.length +
  summary.removed.length +
  summary.privateRestricted.length +
  summary.embedBlocked.length +
  summary.unavailable.length +
  summary.unknown.length +
  summary.unknownCount;
