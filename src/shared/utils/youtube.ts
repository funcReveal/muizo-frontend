/** YouTube URL utilities shared across Room, Collections, and GameRoom features. */

export type YoutubeThumbnailSize = "default" | "mq" | "hq";

export const videoUrlFromId = (videoId: string) =>
  `https://www.youtube.com/watch?v=${videoId}`;

/**
 * Returns a YouTube thumbnail URL for the given video ID.
 * Prefer "mq" (mqdefault) for list rendering to keep memory usage reasonable.
 */
export const thumbnailFromId = (
  videoId: string,
  size: YoutubeThumbnailSize = "mq",
) => {
  const key =
    size === "hq" ? "hqdefault" : size === "default" ? "default" : "mqdefault";
  return `https://img.youtube.com/vi/${videoId}/${key}.jpg`;
};

export const buildYoutubeChannelUrl = (channelId?: string | null) =>
  channelId
    ? `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`
    : undefined;

export const extractYoutubeChannelId = (value?: string | null) => {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^UC[\w-]+$/.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    if (!/^(www\.)?youtube\.com$/i.test(parsed.hostname)) return undefined;
    const match = parsed.pathname.match(/^\/channel\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
};

/** Extracts a YouTube video ID from a URL (watch, youtu.be, shorts, embed). */
export const extractVideoId = (url: string | undefined | null) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    const id = parsed.searchParams.get("v");
    if (id) return id;
    const path = parsed.pathname.split("/").filter(Boolean);
    if (path[0] === "shorts" && path[1]) return path[1];
    if (path[0] === "embed" && path[1]) return path[1];
    return null;
  } catch {
    return null;
  }
};
