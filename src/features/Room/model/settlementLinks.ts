import type { PlaylistItem } from "./types";

export type SettlementLinkType = "direct" | "search" | "none";

export type SettlementTrackLink = {
  provider: string;
  providerLabel: string;
  sourceId: string | null;
  linkType: SettlementLinkType;
  href: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  youtube: "YouTube",
  youtube_music: "YouTube Music",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bilibili: "Bilibili",
  niconico: "Niconico",
  manual: "手動連結",
  collection: "收藏庫",
  unknown: "",
};

const SEARCH_BY_PROVIDER: Record<string, (query: string) => string> = {
  youtube: (query) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
  youtube_music: (query) =>
    `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
  spotify: (query) =>
    `https://open.spotify.com/search/${encodeURIComponent(query)}`,
  soundcloud: (query) =>
    `https://soundcloud.com/search/sounds?q=${encodeURIComponent(query)}`,
  bilibili: (query) =>
    `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`,
  niconico: (query) =>
    `https://www.nicovideo.jp/search/${encodeURIComponent(query)}`,
};

const isHttpUrl = (value: string | null | undefined) =>
  Boolean(value && /^https?:\/\//i.test(value.trim()));

const inferProviderFromUrl = (value: string | null | undefined): string | null => {
  if (!value || !isHttpUrl(value)) return null;
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host.includes("music.youtube.com")) return "youtube_music";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("spotify.com")) return "spotify";
    if (host.includes("soundcloud.com")) return "soundcloud";
    if (host.includes("bilibili.com")) return "bilibili";
    if (host.includes("nicovideo.jp") || host.includes("nico.ms")) return "niconico";
  } catch {
    return null;
  }
  return null;
};

const normalizeProvider = (
  provider: string | null | undefined,
  url: string | null | undefined,
  sourceId: string | null | undefined,
) => {
  const value = (provider ?? "").trim().toLowerCase();
  if (value) return value;
  const inferredFromUrl = inferProviderFromUrl(url);
  if (inferredFromUrl) return inferredFromUrl;
  const inferredFromSourceId = inferProviderFromUrl(sourceId);
  if (inferredFromSourceId) return inferredFromSourceId;
  return "unknown";
};

const normalizeSourceId = (sourceId: string | null | undefined) => {
  const value = (sourceId ?? "").trim();
  return value.length > 0 ? value : null;
};

const extractYoutubeVideoId = (
  sourceId: string | null,
  videoId: string | undefined,
  url: string | undefined,
) => {
  const normalizedVideoId = (videoId ?? "").trim();
  if (normalizedVideoId) return normalizedVideoId;
  if (sourceId && !isHttpUrl(sourceId)) return sourceId;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) return fromQuery;
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const tail = pathSegments[pathSegments.length - 1] ?? "";
    if (tail && tail !== "watch") return tail;
  } catch {
    return null;
  }
  return null;
};

const resolveDirectUrl = (
  provider: string,
  sourceId: string | null,
  item: Pick<PlaylistItem, "url" | "videoId">,
) => {
  if (provider === "youtube" || provider === "youtube_music") {
    const videoId = extractYoutubeVideoId(sourceId, item.videoId, item.url);
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (provider === "spotify" && sourceId) {
    if (isHttpUrl(sourceId)) return sourceId;
    const trackId = sourceId.replace(/^spotify:track:/i, "");
    if (trackId) return `https://open.spotify.com/track/${encodeURIComponent(trackId)}`;
  }
  if (provider === "soundcloud" && sourceId && isHttpUrl(sourceId)) return sourceId;
  if (provider === "bilibili" && sourceId) {
    if (isHttpUrl(sourceId)) return sourceId;
    if (/^bv/i.test(sourceId)) return `https://www.bilibili.com/video/${sourceId}`;
    if (/^\d+$/.test(sourceId)) return `https://www.bilibili.com/video/av${sourceId}`;
  }
  if (provider === "niconico" && sourceId) {
    if (isHttpUrl(sourceId)) return sourceId;
    return `https://www.nicovideo.jp/watch/${sourceId}`;
  }
  if (sourceId && isHttpUrl(sourceId)) return sourceId;
  if (item.url && isHttpUrl(item.url)) return item.url;
  return null;
};

const buildSearchQuery = (
  item: Pick<PlaylistItem, "title" | "answerText" | "uploader">,
  fallbackSourceId: string | null,
) => {
  const title = (item.answerText ?? item.title ?? "").trim();
  const uploader = (item.uploader ?? "").trim();
  if (title && uploader) return `${title} ${uploader}`;
  if (title) return title;
  if (uploader) return uploader;
  if (fallbackSourceId) return fallbackSourceId;
  return "";
};

export const resolveSettlementTrackLink = (
  item: Pick<
    PlaylistItem,
    "provider" | "sourceId" | "videoId" | "url" | "title" | "answerText" | "uploader"
  >,
): SettlementTrackLink => {
  const provider = normalizeProvider(item.provider, item.url, item.sourceId);
  const sourceId = normalizeSourceId(item.sourceId);
  const providerLabel =
    PROVIDER_LABELS[provider] ??
    (provider && provider !== "unknown" ? provider.toUpperCase() : "");

  const directUrl = resolveDirectUrl(provider, sourceId, item);
  if (directUrl) {
    return {
      provider,
      providerLabel,
      sourceId,
      linkType: "direct",
      href: directUrl,
    };
  }

  const searchBuilder = SEARCH_BY_PROVIDER[provider];
  if (searchBuilder) {
    const query = buildSearchQuery(item, sourceId);
    if (query) {
      return {
        provider,
        providerLabel,
        sourceId,
        linkType: "search",
        href: searchBuilder(query),
      };
    }
  }

  return {
    provider,
    providerLabel,
    sourceId,
    linkType: "none",
    href: null,
  };
};

export type PlaylistSourceReadiness = {
  total: number;
  withProvider: number;
  withSourceId: number;
  directLinkable: number;
  searchable: number;
  unavailable: number;
  status: "ready" | "partial";
  byProvider: Array<{ provider: string; label: string; count: number }>;
};

export const summarizePlaylistSourceReadiness = (
  items: PlaylistItem[],
): PlaylistSourceReadiness => {
  const total = items.length;
  let withProvider = 0;
  let withSourceId = 0;
  let directLinkable = 0;
  let searchable = 0;
  let unavailable = 0;
  const providerCounter = new Map<string, { label: string; count: number }>();

  for (const item of items) {
    const provider = normalizeProvider(item.provider, item.url, item.sourceId);
    const sourceId = normalizeSourceId(item.sourceId);
    if (provider !== "unknown") withProvider += 1;
    if (sourceId) withSourceId += 1;

    const resolved = resolveSettlementTrackLink(item);
    if (resolved.linkType === "direct") directLinkable += 1;
    if (resolved.linkType === "search") searchable += 1;
    if (resolved.linkType === "none") unavailable += 1;

    const entry = providerCounter.get(resolved.provider) ?? {
      label: resolved.providerLabel || "未知來源",
      count: 0,
    };
    entry.count += 1;
    providerCounter.set(resolved.provider, entry);
  }

  return {
    total,
    withProvider,
    withSourceId,
    directLinkable,
    searchable,
    unavailable,
    status: unavailable === 0 ? "ready" : "partial",
    byProvider: Array.from(providerCounter.entries())
      .map(([provider, meta]) => ({
        provider,
        label: meta.label,
        count: meta.count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hant")),
  };
};
