import type { PlaylistItem } from "@features/PlaylistSource";

export type SettlementLinkType = "direct" | "search" | "none";

export type SettlementTrackLink = {
  provider: string;
  providerLabel: string;
  sourceId: string | null;
  channelId: string | null;
  linkType: SettlementLinkType;
  href: string | null;
  authorHref: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  youtube: "YouTube",
  youtube_music: "YouTube Music",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bilibili: "Bilibili",
  niconico: "Niconico",
  manual: "手動建立",
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

const normalizeChannelId = (channelId: string | null | undefined) => {
  const value = (channelId ?? "").trim();
  return value.length > 0 ? value : null;
};

const normalizeYouTubeAuthorPath = (channelId: string | null | undefined) => {
  const value = (channelId ?? "").trim();
  if (!value) return null;

  if (isHttpUrl(value)) {
    try {
      const parsed = new URL(value);
      if (!/(^|\.)youtube\.com$/i.test(parsed.hostname)) {
        return value;
      }
      const path = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      return path || null;
    } catch {
      return value;
    }
  }

  const normalized = value.replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized || null;
};

const resolveAuthorUrl = (channelId: string | null) => {
  const normalizedChannelId = normalizeYouTubeAuthorPath(channelId);
  if (!normalizedChannelId) return null;
  if (isHttpUrl(normalizedChannelId)) {
    return normalizedChannelId;
  }

  const looksLikeYoutubeHandle = normalizedChannelId.startsWith("@");
  const looksLikeYoutubeChannelId = /^UC[\w-]{10,}$/.test(normalizedChannelId);
  const looksLikeYoutubePath = /^(channel|c|user)\//i.test(normalizedChannelId);

  if (looksLikeYoutubeHandle) {
    return `https://www.youtube.com/${normalizedChannelId}`;
  }
  if (looksLikeYoutubeChannelId) {
    return `https://www.youtube.com/channel/${encodeURIComponent(normalizedChannelId)}`;
  }
  if (looksLikeYoutubePath) {
    return `https://www.youtube.com/${normalizedChannelId}`;
  }
  return `https://www.youtube.com/@${encodeURIComponent(normalizedChannelId.replace(/^@/, ""))}`;
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
    "provider" | "sourceId" | "channelId" | "videoId" | "url" | "title" | "answerText" | "uploader"
  >,
): SettlementTrackLink => {
  const provider = normalizeProvider(item.provider, item.url, item.sourceId);
  const sourceId = normalizeSourceId(item.sourceId);
  const channelId = normalizeChannelId(item.channelId);
  const authorHref = resolveAuthorUrl(channelId);
  if (
    typeof window !== "undefined" &&
    channelId &&
    !authorHref
  ) {
    console.debug("[mq-author-link] unresolved author href", {
      channelId,
      provider: item.provider ?? null,
      title: item.title ?? item.answerText ?? null,
      uploader: item.uploader ?? null,
    });
  }
  const providerLabel =
    PROVIDER_LABELS[provider] ??
    (provider && provider !== "unknown" ? provider.toUpperCase() : "");

  const directUrl = resolveDirectUrl(provider, sourceId, item);
  if (directUrl) {
    return {
      provider,
      providerLabel,
      sourceId,
      channelId,
      linkType: "direct",
      href: directUrl,
      authorHref,
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
        channelId,
        linkType: "search",
        href: searchBuilder(query),
        authorHref,
      };
    }
  }

  return {
    provider,
    providerLabel,
    sourceId,
    channelId,
    linkType: "none",
    href: null,
    authorHref,
  };
};

export type PlaylistSourceReadiness = {
  total: number;
  playable: number;
  unavailable: number;
  status: "ready" | "partial" | "empty";
  providers: Array<{
    provider: string;
    providerLabel: string;
    total: number;
    playable: number;
    unavailable: number;
  }>;
};

export const getPlaylistSourceReadiness = (
  items: Array<
    Pick<
      PlaylistItem,
      "provider" | "sourceId" | "channelId" | "videoId" | "url" | "title" | "answerText" | "uploader"
    >
  >,
): PlaylistSourceReadiness => {
  if (!items.length) {
    return {
      total: 0,
      playable: 0,
      unavailable: 0,
      status: "empty",
      providers: [],
    };
  }

  const providerCounter = new Map<
    string,
    {
      provider: string;
      providerLabel: string;
      total: number;
      playable: number;
      unavailable: number;
    }
  >();

  let playable = 0;
  let unavailable = 0;

  items.forEach((item) => {
    const resolved = resolveSettlementTrackLink(item);
    const isPlayable = Boolean(resolved.href);
    if (isPlayable) playable += 1;
    else unavailable += 1;

    const entry = providerCounter.get(resolved.provider) ?? {
      provider: resolved.provider,
      providerLabel: resolved.providerLabel,
      total: 0,
      playable: 0,
      unavailable: 0,
    };

    entry.total += 1;
    if (isPlayable) entry.playable += 1;
    else entry.unavailable += 1;

    providerCounter.set(resolved.provider, entry);
  });

  return {
    total: items.length,
    playable,
    unavailable,
    status: unavailable === 0 ? "ready" : "partial",
    providers: Array.from(providerCounter.values()).sort((a, b) => b.total - a.total),
  };
};
