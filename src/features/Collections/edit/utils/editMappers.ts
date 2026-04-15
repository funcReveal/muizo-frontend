import type { PlaylistItem } from "../../../Room/model/types";
import type { DbCollectionItem, EditableItem } from "./editTypes";
import {
  DEFAULT_DURATION_SEC,
  createLocalId,
  extractVideoId,
  extractYoutubeChannelId,
  formatSeconds,
  parseDurationToSeconds,
  thumbnailFromId,
  videoUrlFromId,
} from "./editUtils";

export const buildEditableItems = (items: PlaylistItem[]): EditableItem[] => {
  const safeItems = Array.isArray(items) ? items : [];
  return safeItems.map((item) => {
    const durationSec =
      parseDurationToSeconds(item.duration) ?? DEFAULT_DURATION_SEC;
    const end = Math.min(durationSec, DEFAULT_DURATION_SEC);
    const videoId = extractVideoId(item.url);
    return {
      ...item,
      localId: createLocalId(),
      sourceProvider: videoId ? "youtube" : undefined,
      sourceId: videoId ?? undefined,
      startSec: 0,
      endSec: Math.max(1, end),
      answerText: item.title ?? "",
      answerStatus: "original",
      answerAiProvider: null,
      answerAiUpdatedAt: null,
      answerAiBatchKey: null,
    };
  });
};

export const buildEditableItemsFromDb = (
  items: DbCollectionItem[],
): EditableItem[] => {
  const safeItems = Array.isArray(items) ? items : [];
  return safeItems.map((item) => {
    const provider = item.provider || "manual";
    const sourceId = item.source_id || "";
    const videoId = provider === "youtube" ? sourceId : "";
    const startSec = item.start_sec ?? 0;
    const rawDuration =
      item.duration_sec && item.duration_sec > 0 ? item.duration_sec : null;
    const maxDuration =
      rawDuration ?? Math.max(1, startSec + DEFAULT_DURATION_SEC);
    const endFromDb =
      item.end_sec === null || item.end_sec === undefined
        ? Math.max(1, startSec + DEFAULT_DURATION_SEC)
        : Math.max(1, item.end_sec);
    const endSec = Math.min(Math.max(endFromDb, startSec + 1), maxDuration);
    return {
      localId: createLocalId(),
      dbId: item.id,
      sourceProvider: provider,
      sourceId: sourceId || undefined,
      title: item.title ?? item.answer_text ?? (videoId || sourceId),
      url: videoId
        ? videoUrlFromId(videoId)
        : sourceId.startsWith("http")
          ? sourceId
          : "",
      thumbnail: videoId ? thumbnailFromId(videoId) : undefined,
      uploader: item.channel_title ?? "",
      channelId:
        item.channel_id ??
        extractYoutubeChannelId((item as DbCollectionItem & { channel_url?: string | null }).channel_url) ??
        undefined,
      duration: rawDuration ? formatSeconds(rawDuration) : undefined,
      startSec,
      endSec,
      answerText: item.answer_text ?? "",
      answerStatus: item.answer_status ?? "original",
      answerAiProvider: item.answer_ai_provider ?? null,
      answerAiUpdatedAt: item.answer_ai_updated_at ?? null,
      answerAiBatchKey: item.answer_ai_batch_key ?? null,
    };
  });
};
