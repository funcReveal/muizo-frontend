import { useEffect, useRef } from "react";

import type {
  PlaylistItem,
  PlaylistPreviewMeta,
  YoutubePlaylist,
} from "@features/PlaylistSource/model/types";
import type {
  CollectionCreateImportSourceType,
  CollectionCreateSourcePlaylistItem,
  CollectionCreateSourceSkippedItem,
} from "./useCollectionCreateImportSources";

type AddImportSourceInput = {
  type: CollectionCreateImportSourceType;
  title: string;
  sourceId: string;
  url?: string;
  expectedCount?: number | null;
  skippedCount?: number;
  duplicateCount?: number;
  items: CollectionCreateSourcePlaylistItem[];
  skippedItems?: CollectionCreateSourceSkippedItem[];
};

type UseCollectionCreateAutoImportParams = {
  hasResolvedPlaylist: boolean;
  lastFetchedPlaylistId: string | null;
  lastFetchedPlaylistTitle: string | null;
  playlistItems: PlaylistItem[];
  playlistPreviewMeta: PlaylistPreviewMeta | null;
  playlistSource: "url" | "youtube" | "favorites";
  trimmedPlaylistUrl: string;
  youtubePlaylists: YoutubePlaylist[];
  untitledSourceLabel: string;
  addImportSource: (input: AddImportSourceInput) => string | null;
  resetPlaylistSelection: () => void;
  initializeCollectionTitleIfEmpty: (value: string) => void;
};

const buildImportIdentity = ({
  playlistSource,
  playlistId,
  itemCount,
  expectedCount,
  skippedCount,
}: {
  playlistSource: "url" | "youtube" | "favorites";
  playlistId: string;
  itemCount: number;
  expectedCount: number | null | undefined;
  skippedCount: number | undefined;
}) =>
  [
    playlistSource,
    playlistId,
    itemCount,
    expectedCount ?? "unknown",
    skippedCount ?? 0,
  ].join(":");

export function useCollectionCreateAutoImport({
  hasResolvedPlaylist,
  lastFetchedPlaylistId,
  lastFetchedPlaylistTitle,
  playlistItems,
  playlistPreviewMeta,
  playlistSource,
  trimmedPlaylistUrl,
  youtubePlaylists,
  untitledSourceLabel,
  addImportSource,
  resetPlaylistSelection,
  initializeCollectionTitleIfEmpty,
}: UseCollectionCreateAutoImportParams) {
  const processedImportIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasResolvedPlaylist || !lastFetchedPlaylistId) {
      processedImportIdentityRef.current = null;
      return;
    }

    if (playlistItems.length === 0) {
      processedImportIdentityRef.current = null;
      return;
    }

    const importIdentity = buildImportIdentity({
      playlistSource,
      playlistId: lastFetchedPlaylistId,
      itemCount: playlistItems.length,
      expectedCount: playlistPreviewMeta?.expectedCount,
      skippedCount: playlistPreviewMeta?.skippedCount,
    });

    if (processedImportIdentityRef.current === importIdentity) {
      return;
    }

    processedImportIdentityRef.current = importIdentity;

    const matchedYoutubePlaylist = youtubePlaylists.find(
      (playlist) => playlist.id === lastFetchedPlaylistId,
    );

    const sourceTitle =
      lastFetchedPlaylistTitle?.trim() ||
      matchedYoutubePlaylist?.title?.trim() ||
      (playlistSource === "url" ? trimmedPlaylistUrl : "") ||
      untitledSourceLabel;

    addImportSource({
      type:
        playlistSource === "youtube"
          ? "youtube_account_playlist"
          : "youtube_url",
      title: sourceTitle,
      sourceId: lastFetchedPlaylistId,
      url: playlistSource === "url" ? trimmedPlaylistUrl : undefined,
      expectedCount: playlistPreviewMeta?.expectedCount ?? playlistItems.length,
      skippedCount: playlistPreviewMeta?.skippedCount ?? 0,
      skippedItems: playlistPreviewMeta?.skippedItems ?? [],
      items: playlistItems,
    });

    resetPlaylistSelection();
    initializeCollectionTitleIfEmpty(sourceTitle);
  }, [
    addImportSource,
    hasResolvedPlaylist,
    initializeCollectionTitleIfEmpty,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    playlistItems,
    playlistPreviewMeta,
    playlistSource,
    resetPlaylistSelection,
    trimmedPlaylistUrl,
    untitledSourceLabel,
    youtubePlaylists,
  ]);
}
