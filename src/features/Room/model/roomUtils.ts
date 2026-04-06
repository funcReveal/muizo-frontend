import type { PlaylistItem } from "./types";
import {
  DEFAULT_CLIP_SEC,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  QUESTION_MAX,
  QUESTION_MIN,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
} from "./roomConstants";

export { formatSeconds } from "../../../shared/utils/format";
export {
  videoUrlFromId,
  thumbnailFromId,
  buildYoutubeChannelUrl,
  extractYoutubeChannelId,
} from "../../../shared/utils/youtube";

export const normalizePlaylistItems = (items: PlaylistItem[]) =>
  items.map((item) => {
    const rawItem = item as PlaylistItem & {
      channel_id?: string | null;
      channel_url?: string | null;
      author_url?: string | null;
    };
    const startSec = Math.max(0, item.startSec ?? 0);
    const isLegacyCollectionDefaultClip =
      item.provider === "collection" &&
      item.hasExplicitStartSec === true &&
      item.hasExplicitEndSec === true &&
      startSec <= 0.001 &&
      typeof item.endSec === "number" &&
      Math.abs(item.endSec - (startSec + DEFAULT_CLIP_SEC)) <= 0.001;
    const explicitEndFromFlag = isLegacyCollectionDefaultClip
      ? false
      : item.hasExplicitEndSec;
    const explicitStartFromFlag = isLegacyCollectionDefaultClip
      ? false
      : item.hasExplicitStartSec;
    const inferredExplicitEndSec =
      typeof item.endSec === "number" &&
        Math.abs(
          item.endSec - (startSec + DEFAULT_CLIP_SEC),
        ) > 0.001;
    const hasExplicitEndSec =
      explicitEndFromFlag ?? inferredExplicitEndSec;
    const hasExplicitStartSec =
      explicitStartFromFlag ??
      (startSec > 0 || hasExplicitEndSec);
    const endSec =
      hasExplicitEndSec && item.endSec !== undefined && item.endSec !== null
        ? item.endSec
        : startSec + DEFAULT_CLIP_SEC;
    const answerText = item.answerText ?? item.title;
    const channelId =
      item.channelId ??
      rawItem.channel_id ??
      extractYoutubeChannelId(rawItem.channel_url) ??
      extractYoutubeChannelId(rawItem.author_url) ??
      undefined;
    return {
      ...item,
      ...(channelId ? { channelId } : {}),
      startSec,
      endSec: Math.max(startSec + 1, endSec),
      hasExplicitStartSec: Boolean(hasExplicitStartSec),
      hasExplicitEndSec: Boolean(hasExplicitEndSec),
      answerText,
    };
  });

export const getQuestionMax = (playlistCount: number) =>
  playlistCount > 0 ? Math.min(QUESTION_MAX, playlistCount) : QUESTION_MAX;

export const clampQuestionCount = (value: number, maxValue: number) =>
  Math.min(maxValue, Math.max(QUESTION_MIN, value));

const clampNumber = (
  value: number,
  min: number,
  max: number,
  fallback: number,
) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
};

export const clampPlayDurationSec = (value: number) =>
  clampNumber(
    value,
    PLAY_DURATION_MIN,
    PLAY_DURATION_MAX,
    DEFAULT_PLAY_DURATION_SEC,
  );

export const clampRevealDurationSec = (value: number) =>
  clampNumber(
    value,
    REVEAL_DURATION_MIN,
    REVEAL_DURATION_MAX,
    DEFAULT_REVEAL_DURATION_SEC,
  );

export const clampStartOffsetSec = (value: number) =>
  clampNumber(
    value,
    START_OFFSET_MIN,
    START_OFFSET_MAX,
    DEFAULT_START_OFFSET_SEC,
  );

