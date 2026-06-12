import { useCallback, useEffect, useRef, useState } from "react";

import { songFavoriteApi } from "@features/SongFavorite/model/songFavoriteApi";
import type { SongFavoriteRecord } from "@features/SongFavorite/model/types";
import type {
  AddImportSourceInput,
  CollectionCreateSourcePlaylistItem,
} from "./useCollectionCreateImportSources";

// Fixed source ID — there is exactly one favorites source per import session.
export const SONG_FAVORITES_SOURCE_ID = "song_favorites";

// Maps a SongFavoriteRecord to the CollectionCreateSourcePlaylistItem shape
// consumed by the existing import pipeline. Items do NOT set startSec / endSec,
// so the downstream submit step (useCollectionCreateSubmit) applies the standard
// default clip range of 0~30 seconds (or 0~songLength for shorter songs),
// matching the behaviour of every other playlist source.
const toImportItem = (item: SongFavoriteRecord): CollectionCreateSourcePlaylistItem => {
  const durationStr =
    item.durationSec !== null && item.durationSec > 0
      ? `${Math.floor(item.durationSec / 60)}:${String(Math.floor(item.durationSec % 60)).padStart(2, "0")}`
      : undefined;

  return {
    title: item.title,
    answerText: item.title,
    uploader: item.channelTitle ?? undefined,
    duration: durationStr,
    thumbnail: item.thumbnailUrl ?? undefined,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.sourceId)}`,
    channelId: item.channelId ?? null,
    videoId: item.sourceId,
    provider: item.provider,
    sourceId: item.sourceId,
  };
};

type UseSongFavoritesImportParams = {
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  addImportSource: (input: AddImportSourceInput) => string | null;
  initializeCollectionTitleIfEmpty: (value: string) => void;
  favoritesSourceLabel: string;
  emptyFavoritesError: string;
  importFailedError: string;
};

export function useSongFavoritesImport({
  authToken,
  refreshAuthToken,
  addImportSource,
  initializeCollectionTitleIfEmpty,
  favoritesSourceLabel,
  emptyFavoritesError,
  importFailedError,
}: UseSongFavoritesImportParams) {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Ref-based lock keeps the callback identity stable across loading state changes,
  // so memoised consumers (e.g. CollectionCreateSourcePanel) don't re-render every
  // time the loading flag flips.
  const isImportingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort any in-flight request on unmount so a navigation away from the page
  // doesn't leave a 5,000-row response in flight.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const importAllFavorites = useCallback(async () => {
    if (isImportingRef.current) return;
    isImportingRef.current = true;

    // Defensive: abort any straggler from a previous unmount race.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await songFavoriteApi.getAllFavorites({
        authToken,
        refreshAuthToken,
        signal: controller.signal,
      });

      if (result.items.length === 0) {
        setImportError(emptyFavoritesError);
        return;
      }

      addImportSource({
        type: "song_favorites",
        title: favoritesSourceLabel,
        sourceId: SONG_FAVORITES_SOURCE_ID,
        expectedCount: result.items.length,
        items: result.items.map(toImportItem),
      });

      initializeCollectionTitleIfEmpty(favoritesSourceLabel);
    } catch (err) {
      // Aborted requests are not user-facing errors (caused by navigation / reimport).
      if (err instanceof DOMException && err.name === "AbortError") return;
      setImportError(err instanceof Error ? err.message : importFailedError);
    } finally {
      isImportingRef.current = false;
      setIsImporting(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [
    addImportSource,
    authToken,
    emptyFavoritesError,
    favoritesSourceLabel,
    importFailedError,
    initializeCollectionTitleIfEmpty,
    refreshAuthToken,
  ]);

  const clearImportError = useCallback(() => setImportError(null), []);

  return { isImporting, importError, importAllFavorites, clearImportError };
}
