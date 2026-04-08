import {
  extractVideoId,
} from "../../../../shared/utils/youtube";

export const DEFAULT_DURATION_SEC = 30;

export const parseDurationToSeconds = (duration?: string): number | null => {
  if (!duration) return null;
  const parts = duration.split(":").map((part) => Number(part));
  if (parts.some((value) => Number.isNaN(value))) return null;
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  return null;
};

export { formatSeconds } from "../../../../shared/utils/format";

export const parseTimeInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 1) {
    return parts[0] * 60;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  return null;
};

export const createLocalId = () =>
  crypto.randomUUID?.() ??
  `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

export const createServerId = () => createLocalId();

export {
  extractVideoId,
  extractYoutubeChannelId,
  thumbnailFromId,
  videoUrlFromId,
} from "../../../../shared/utils/youtube";
export type { YoutubeThumbnailSize } from "../../../../shared/utils/youtube";

export const getPlaylistItemKey = (item: { url?: string; title?: string }) => {
  const videoId = extractVideoId(item.url ?? "");
  if (videoId) return `yt:${videoId}`;
  if (item.url) return `url:${item.url}`;
  return item.title ? `title:${item.title}` : "";
};
