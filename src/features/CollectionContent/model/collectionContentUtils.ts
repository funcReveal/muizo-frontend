import { DEFAULT_CLIP_SEC } from "@domain/room/constants";
import type { PlaylistItem } from "@features/PlaylistSource";
import { extractYoutubeChannelId } from "../../../shared/utils/youtube";
import { formatSeconds } from "../../../shared/utils/format";
import { resolveSettlementTrackLink } from "../../Settlement/model/settlementLinks";
import type { CollectionItemRecord } from "./collectionContentApi";

export const mapCollectionItemsToPlaylist = (
  _collectionId: string,
  items: CollectionItemRecord[],
): PlaylistItem[] =>
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
    const rawTitle = item.title ?? item.answer_text ?? `歌曲 ${index + 1}`;
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
      channelId:
        item.channel_id ??
        extractYoutubeChannelId(item.channel_url) ??
        undefined,
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
