export type PlaylistAvailabilityInput = {
  playlistCount?: number | null;
  playlistTotalCount?: number | null;
  playlistPlayableCount?: number | null;
  playlist?: {
    totalCount?: number | null;
    playableCount?: number | null;
  } | null;
};

const toSafeCount = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
};

export const resolvePlaylistAvailabilityCounts = (
  source: PlaylistAvailabilityInput | null | undefined,
) => {
  const total =
    toSafeCount(source?.playlistTotalCount) ??
    toSafeCount(source?.playlist?.totalCount) ??
    toSafeCount(source?.playlistCount) ??
    0;

  const playableRaw =
    toSafeCount(source?.playlistPlayableCount) ??
    toSafeCount(source?.playlist?.playableCount) ??
    toSafeCount(source?.playlistCount) ??
    total;

  const playable = Math.min(playableRaw, total);

  return {
    playable,
    total,
    unavailable: Math.max(0, total - playable),
    hasAvailability:
      source?.playlistPlayableCount !== undefined &&
      source?.playlistPlayableCount !== null
        ? true
        : source?.playlist?.playableCount !== undefined &&
          source?.playlist?.playableCount !== null,
  };
};

export const formatPlaylistAvailabilityLabel = (
  source: PlaylistAvailabilityInput | null | undefined,
): string => {
  const counts = resolvePlaylistAvailabilityCounts(source);

  if (counts.total > 0 && counts.playable < counts.total) {
    return `可用 ${counts.playable} / 共 ${counts.total} 題`;
  }

  return `${counts.playable} 題`;
};

export type CollectionAvailabilityInput = {
  item_count?: number | null;
  playable_item_count?: number | null;
};

export const resolveCollectionAvailabilityCounts = (
  collection: CollectionAvailabilityInput | null | undefined,
) => {
  const total = toSafeCount(collection?.item_count) ?? 0;
  const playableRaw = toSafeCount(collection?.playable_item_count) ?? total;
  const playable = Math.min(playableRaw, total);

  return {
    playable,
    total,
    unavailable: Math.max(0, total - playable),
  };
};

export const formatCollectionAvailabilityLabel = (
  collection: CollectionAvailabilityInput | null | undefined,
): string => {
  const counts = resolveCollectionAvailabilityCounts(collection);

  if (counts.total > 0 && counts.playable < counts.total) {
    return `可用 ${counts.playable} / 共 ${counts.total} 題`;
  }

  return `${counts.playable} 題`;
};
