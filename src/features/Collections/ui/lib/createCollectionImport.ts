import { getPlaylistItemKey } from "./editUtils";

type BasePlaylistItem = {
  title?: string;
  answerText?: string;
  uploader?: string;
  duration?: string;
  thumbnail?: string;
  url?: string;
  channelId?: string | null;
};

export type DraftPlaylistItem = BasePlaylistItem & {
  draftKey: string;
  durationSec: number | null;
};

export type RemovedDuplicateGroup = {
  key: string;
  title: string;
  uploader: string | null;
  url: string | null;
  keptIndex: number;
  removedIndexes: number[];
  totalCount: number;
  removedCount: number;
};

const parseDurationToSeconds = (duration?: string): number | null => {
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

export const dedupePlaylistItems = (items: BasePlaylistItem[]) => {
  const seen = new Set<string>();
  const dedupedItems: DraftPlaylistItem[] = [];
  const duplicateMap = new Map<
    string,
    {
      title: string;
      uploader: string | null;
      url: string | null;
      keptIndex: number;
      removedIndexes: number[];
    }
  >();

  items.forEach((item, index) => {
    const key = getPlaylistItemKey(item);
    if (!key) return;

    if (seen.has(key)) {
      const existing = duplicateMap.get(key);
      if (existing) {
        existing.removedIndexes.push(index);
      } else {
        duplicateMap.set(key, {
          title: item.title?.trim() || item.answerText?.trim() || "未命名歌曲",
          uploader: item.uploader?.trim() || null,
          url: item.url?.trim() || null,
          keptIndex: dedupedItems.findIndex((draft) => draft.draftKey === key),
          removedIndexes: [index],
        });
      }
      return;
    }

    seen.add(key);
    dedupedItems.push({
      ...item,
      draftKey: key,
      durationSec: parseDurationToSeconds(item.duration),
    });
  });

  const removedGroups: RemovedDuplicateGroup[] = Array.from(
    duplicateMap.entries(),
  )
    .map(([key, value]) => ({
      key,
      title: value.title,
      uploader: value.uploader,
      url: value.url,
      keptIndex: value.keptIndex,
      removedIndexes: value.removedIndexes,
      totalCount: 1 + value.removedIndexes.length,
      removedCount: value.removedIndexes.length,
    }))
    .sort((a, b) => a.keptIndex - b.keptIndex);

  return {
    items: dedupedItems,
    removedGroups,
  };
};

export const splitLongDurationItems = (
  items: DraftPlaylistItem[],
  options?: { thresholdSec?: number },
) => {
  const thresholdSec = options?.thresholdSec ?? 600;

  const normalItems: DraftPlaylistItem[] = [];
  const longItems: DraftPlaylistItem[] = [];

  items.forEach((item) => {
    if ((item.durationSec ?? 0) > thresholdSec) {
      longItems.push(item);
      return;
    }
    normalItems.push(item);
  });

  return {
    normalItems,
    longItems,
  };
};

export const buildOverflowSelection = (
  items: DraftPlaylistItem[],
  limit: number,
  options?: { thresholdSec?: number },
) => {
  const thresholdSec = options?.thresholdSec ?? 600;
  const overflowCount = Math.max(0, items.length - limit);

  if (overflowCount <= 0) {
    return {
      overflowCount: 0,
      isOverflow: false,
      suggestedRemovalKeys: [] as string[],
    };
  }

  const longItems = items.filter(
    (item) => (item.durationSec ?? 0) > thresholdSec,
  );
  const selected: string[] = [];

  for (const item of longItems) {
    if (selected.length >= overflowCount) break;
    selected.push(item.draftKey);
  }

  if (selected.length < overflowCount) {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (selected.includes(item.draftKey)) continue;
      selected.push(item.draftKey);
      if (selected.length >= overflowCount) break;
    }
  }

  return {
    overflowCount,
    isOverflow: true,
    suggestedRemovalKeys: selected,
  };
};
