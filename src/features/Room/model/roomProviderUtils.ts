import {
  DEFAULT_CLIP_SEC,
  DEFAULT_PLAYBACK_EXTENSION_MODE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
  QUESTION_MIN,
} from "./roomConstants";
import {
  clampPlayDurationSec,
  clampRevealDurationSec,
  clampStartOffsetSec,
  formatSeconds,
  normalizePlaylistItems,
} from "./roomUtils";
import { resolveSettlementTrackLink } from "../../Settlement/model/settlementLinks";
import type {
  ChatMessage,
  PlaylistItem,
  RoomSettlementSnapshot,
  RoomState,
  RoomSummary,
} from "./types";
import type { CollectionItemRecord } from "./roomApi";

export const MAX_ROOM_MESSAGE_COUNT = 1200;
export const MAX_SETTLEMENT_HISTORY_COUNT = 30;

export const mapCollectionItemsToPlaylist = (
  _collectionId: string,
  items: CollectionItemRecord[],
) =>
  items.map((item, index) => {
    const startSec = Math.max(0, item.start_sec ?? 0);
    const explicitEndSec =
      typeof item.end_sec === "number" && item.end_sec > startSec
        ? item.end_sec
        : null;
    const hasExplicitEndSec = explicitEndSec !== null;
    const hasExplicitStartSec = startSec > 0;
    const safeEnd = Math.max(
      startSec + 1,
      explicitEndSec ?? startSec + DEFAULT_CLIP_SEC,
    );
    const provider = (item.provider ?? "manual").trim().toLowerCase();
    const sourceId = (item.source_id ?? "").trim();
    const videoId = provider === "youtube" && sourceId ? sourceId : "";
    const durationValue =
      typeof item.duration_sec === "number" && item.duration_sec > 0
        ? formatSeconds(item.duration_sec)
        : formatSeconds(safeEnd - startSec);
    const rawTitle = item.title ?? item.answer_text ?? `æ­Œæ›² ${index + 1}`;
    const answerText = item.answer_text ?? rawTitle;
    const resolvedLink = resolveSettlementTrackLink({
      provider,
      sourceId: sourceId || null,
      videoId,
      url: "",
      title: rawTitle,
      answerText,
      uploader: item.channel_title ?? undefined,
    });
    return {
      title: rawTitle,
      answerText,
      url: resolvedLink.href ?? "",
      thumbnail: videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : undefined,
      uploader: item.channel_title ?? undefined,
      channelId: item.channel_id ?? null,
      duration: durationValue,
      startSec,
      endSec: safeEnd,
      hasExplicitStartSec,
      hasExplicitEndSec,
      collectionClipStartSec: startSec,
      collectionClipEndSec: explicitEndSec ?? undefined,
      collectionHasExplicitStartSec: hasExplicitStartSec,
      collectionHasExplicitEndSec: hasExplicitEndSec,
      ...(videoId ? { videoId } : {}),
      sourceId: sourceId || null,
      provider,
    };
  });

export const extractVideoIdFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const vid = parsed.searchParams.get("v");
    if (vid) return vid;
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments.pop() || null;
  } catch {
    try {
      const parsed = new URL(`https://${url}`);
      const vid = parsed.searchParams.get("v");
      if (vid) return vid;
      const segments = parsed.pathname.split("/").filter(Boolean);
      return segments.pop() || null;
    } catch {
      const match =
        url.match(/[?&]v=([^&]+)/) ||
        url.match(/youtu\.be\/([^?&]+)/) ||
        url.match(/youtube\.com\/embed\/([^?&]+)/);
      return match?.[1] ?? null;
    }
  }
};

const GARBLED_TEXT_RE = /[?™ç??˜æ?]/;
const ESCAPED_UNICODE_RE = /\\[uU][0-9a-fA-F]{4}/;
const DOUBLY_ESCAPED_UNICODE_RE = /\\\\[uU]/g;

const looksBrokenText = (value: string) => {
  if (GARBLED_TEXT_RE.test(value)) return true;
  const replacementCount = (value.match(/\uFFFD/g) ?? []).length;
  const questionCount = (value.match(/\?/g) ?? []).length;
  return (
    replacementCount > 0 ||
    (questionCount >= 3 && questionCount / Math.max(1, value.length) > 0.15)
  );
};

const decodeEscapedUnicodeText = (value: string) => {
  let normalized = value;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const collapsed = normalized.replace(DOUBLY_ESCAPED_UNICODE_RE, "\\u");
    if (!ESCAPED_UNICODE_RE.test(collapsed)) {
      return collapsed;
    }
    normalized = collapsed.replace(
      /\\[uU]([0-9a-fA-F]{4})/g,
      (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
    );
  }
  return normalized.replace(DOUBLY_ESCAPED_UNICODE_RE, "\\u");
};

export const normalizeRoomDisplayText = (
  value: string | null | undefined,
  fallback: string,
) => {
  const text = decodeEscapedUnicodeText((value ?? "").trim());
  if (!text) return fallback;
  return looksBrokenText(text) ? fallback : text;
};

export const sanitizePossibleGarbledText = (
  value: string,
  fallback = "ç³»çµ±è¨Šæ¯",
) => {
  const text = decodeEscapedUnicodeText(value);
  return looksBrokenText(text) ? fallback : text;
};

export const formatAckError = (prefix: string, error?: string) => {
  const safePrefix = sanitizePossibleGarbledText(prefix, "?ä?å¤±æ?");
  const detail = sanitizePossibleGarbledText(
    error?.trim() || "?ªçŸ¥?¯èª¤",
    "?ªçŸ¥?¯èª¤",
  );
  return `${safePrefix}ï¼?{detail}`;
};

export const normalizeQuestionCount = (
  value: number | undefined,
  fallback: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
};

export type RoomGameSettings = NonNullable<RoomSummary["gameSettings"]>;

export const normalizePlaybackExtensionMode = (
  value: RoomGameSettings["playbackExtensionMode"] | undefined,
) =>
  value === "manual_vote" || value === "auto_once" || value === "disabled"
    ? value
    : DEFAULT_PLAYBACK_EXTENSION_MODE;

export const mergeGameSettings = (
  current: RoomSummary["gameSettings"] | undefined,
  incoming: Partial<RoomGameSettings> | undefined,
): RoomGameSettings => {
  const fallbackQuestionCount = normalizeQuestionCount(
    current?.questionCount,
    QUESTION_MIN,
  );
  return {
    questionCount: normalizeQuestionCount(
      incoming?.questionCount,
      fallbackQuestionCount,
    ),
    playDurationSec: clampPlayDurationSec(
      incoming?.playDurationSec ??
        current?.playDurationSec ??
        DEFAULT_PLAY_DURATION_SEC,
    ),
    revealDurationSec: clampRevealDurationSec(
      incoming?.revealDurationSec ??
        current?.revealDurationSec ??
        DEFAULT_REVEAL_DURATION_SEC,
    ),
    startOffsetSec: clampStartOffsetSec(
      incoming?.startOffsetSec ??
        current?.startOffsetSec ??
        DEFAULT_START_OFFSET_SEC,
    ),
    allowCollectionClipTiming:
      incoming?.allowCollectionClipTiming ??
      current?.allowCollectionClipTiming ??
      true,
    allowParticipantInvite:
      incoming?.allowParticipantInvite ??
      current?.allowParticipantInvite ??
      false,
    playbackExtensionMode: normalizePlaybackExtensionMode(
      incoming?.playbackExtensionMode ?? current?.playbackExtensionMode,
    ),
  };
};

export const applyGameSettingsPatch = (
  room: RoomState["room"],
  patch: Partial<RoomGameSettings>,
): RoomState["room"] => ({
  ...room,
  gameSettings: mergeGameSettings(room.gameSettings, {
    ...room.gameSettings,
    ...patch,
  }),
});

export const buildUploadPlaylistItems = (
  sourceItems: PlaylistItem[],
  options: {
    playDurationSec: number;
    startOffsetSec: number;
    allowCollectionClipTiming: boolean;
  },
): PlaylistItem[] => {
  const roomPlayDurationSec = clampPlayDurationSec(options.playDurationSec);
  const roomStartOffsetSec = clampStartOffsetSec(options.startOffsetSec);
  return normalizePlaylistItems(sourceItems).map((item) => {
    const itemStartSec = Math.max(0, item.startSec ?? 0);
    const rawHasExplicitEndSec =
      typeof item.hasExplicitEndSec === "boolean"
        ? item.hasExplicitEndSec
        : typeof item.endSec === "number" && item.endSec > itemStartSec;
    const rawHasExplicitStartSec =
      typeof item.hasExplicitStartSec === "boolean"
        ? item.hasExplicitStartSec
        : itemStartSec > 0 || rawHasExplicitEndSec;
    const collectionClipStartSec = Math.max(
      0,
      item.collectionClipStartSec ?? itemStartSec,
    );
    const inferredTrackClip = item.timingSource === "track_clip";
    const collectionHasExplicitStartSec =
      typeof item.collectionHasExplicitStartSec === "boolean"
        ? item.collectionHasExplicitStartSec
        : inferredTrackClip
          ? rawHasExplicitStartSec
          : false;
    const collectionHasExplicitEndSec =
      typeof item.collectionHasExplicitEndSec === "boolean"
        ? item.collectionHasExplicitEndSec
        : inferredTrackClip
          ? rawHasExplicitEndSec
          : false;
    const collectionClipEndSec =
      typeof item.collectionClipEndSec === "number" &&
      item.collectionClipEndSec > collectionClipStartSec
        ? item.collectionClipEndSec
        : collectionHasExplicitEndSec &&
            typeof item.endSec === "number" &&
            item.endSec > collectionClipStartSec
          ? item.endSec
          : undefined;
    const isCollectionItem = item.provider === "collection";
    const useTrackClip =
      options.allowCollectionClipTiming &&
      isCollectionItem &&
      (collectionHasExplicitStartSec || collectionHasExplicitEndSec);
    const startSec = useTrackClip ? collectionClipStartSec : roomStartOffsetSec;
    const fallbackEndSec = startSec + roomPlayDurationSec;
    const itemEndSec =
      useTrackClip && collectionHasExplicitEndSec && collectionClipEndSec
        ? collectionClipEndSec
        : fallbackEndSec;
    const endSec = Math.max(
      startSec + 1,
      useTrackClip ? itemEndSec : fallbackEndSec,
    );
    return {
      ...item,
      startSec,
      endSec,
      hasExplicitStartSec: useTrackClip ? collectionHasExplicitStartSec : false,
      hasExplicitEndSec: useTrackClip ? collectionHasExplicitEndSec : false,
      collectionClipStartSec,
      collectionClipEndSec,
      collectionHasExplicitStartSec,
      collectionHasExplicitEndSec,
      timingSource: useTrackClip
        ? ("track_clip" as const)
        : ("room_settings" as const),
    };
  });
};

export const mergeRoomSummaryIntoCurrentRoom = (
  current: RoomState["room"],
  summary: RoomSummary,
): RoomState["room"] => ({
  ...current,
  ...summary,
  playlist: {
    ...current.playlist,
    ...(summary.playlistId !== undefined ? { id: summary.playlistId ?? undefined } : {}),
    ...(summary.playlistTitle !== undefined
      ? { title: summary.playlistTitle ?? undefined }
      : {}),
    ...(summary.playlistSourceType !== undefined
      ? { sourceType: summary.playlistSourceType ?? null }
      : {}),
    ...(typeof summary.playlistCount === "number"
      ? {
          totalCount: summary.playlistCount,
          receivedCount: Math.min(
            current.playlist.receivedCount,
            summary.playlistCount,
          ),
        }
      : {}),
  },
  gameSettings: mergeGameSettings(current.gameSettings, summary.gameSettings),
});

export const capRoomMessages = (
  messages: ChatMessage[],
  limit = MAX_ROOM_MESSAGE_COUNT,
) => {
  if (limit <= 0) return [];
  if (messages.length <= limit) return messages;
  return messages.slice(-limit);
};

export const capSettlementHistory = (
  history: RoomSettlementSnapshot[],
  limit = MAX_SETTLEMENT_HISTORY_COUNT,
) => {
  if (limit <= 0) return [];
  if (history.length <= limit) return history;
  const sorted = [...history].sort(
    (a, b) => b.endedAt - a.endedAt || b.roundNo - a.roundNo,
  );
  return sorted.slice(0, limit);
};

