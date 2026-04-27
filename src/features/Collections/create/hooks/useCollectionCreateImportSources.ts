import { useCallback, useMemo, useState } from "react";

export type CollectionCreateImportSourceType =
  | "youtube_url"
  | "youtube_account_playlist";

export type CollectionCreateSourcePlaylistItem = {
  title?: string;
  answerText?: string;
  uploader?: string;
  duration?: string;
  thumbnail?: string;
  url?: string;
  channelId?: string | null;
  videoId?: string;
  provider?: string;
  sourceId?: string | null;
};

export type CollectionCreateSkippedItemStatus =
  | "removed"
  | "unavailable"
  | "private"
  | "blocked"
  | "duplicate"
  | "unknown";

export type CollectionCreateSourceSkippedItem = {
  title?: string | null;
  videoId?: string | null;
  reason?: string | null;
  status?: CollectionCreateSkippedItemStatus;
};

export type CollectionCreateImportItem = CollectionCreateSourcePlaylistItem & {
  importItemKey: string;
  sourceImportId: string;
  sourceTitle: string;
  sourceType: CollectionCreateImportSourceType;
  sourceItemIndex: number;
};

export type CollectionCreateSkippedItem = CollectionCreateSourceSkippedItem & {
  skippedItemKey: string;
  sourceImportId: string;
  sourceTitle: string;
  sourceType: CollectionCreateImportSourceType;
  sourceItemIndex: number;
};

export type CollectionCreateImportSource = {
  id: string;
  type: CollectionCreateImportSourceType;
  title: string;
  sourceId: string;
  url?: string;
  expectedCount: number | null;
  itemCount: number;
  skippedCount: number;
  duplicateCount: number;
  createdAt: number;
  items: CollectionCreateImportItem[];
  skippedItems: CollectionCreateSkippedItem[];
};

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

const buildImportSourceId = (
  type: CollectionCreateImportSourceType,
  sourceId: string,
) => `${type}:${sourceId}`;

const buildImportItemKey = (sourceImportId: string, index: number) =>
  `${sourceImportId}:${index}`;

const buildSkippedItemKey = (sourceImportId: string, index: number) =>
  `${sourceImportId}:skipped:${index}`;

const isItemFromSource = (itemKey: string, sourceImportId: string) =>
  itemKey.startsWith(`${sourceImportId}:`);

export function useCollectionCreateImportSources() {
  const [importSources, setImportSources] = useState<
    CollectionCreateImportSource[]
  >([]);

  const [removedImportItemKeys, setRemovedImportItemKeys] = useState<string[]>(
    [],
  );

  const addImportSource = useCallback((input: AddImportSourceInput) => {
    const title = input.title.trim() || "Untitled source";
    const sourceId = input.sourceId.trim();

    if (!sourceId || input.items.length === 0) {
      return null;
    }

    const id = buildImportSourceId(input.type, sourceId);

    const nextSource: CollectionCreateImportSource = {
      id,
      type: input.type,
      title,
      sourceId,
      url: input.url,
      expectedCount: input.expectedCount ?? input.items.length,
      itemCount: input.items.length,
      skippedCount: input.skippedCount ?? input.skippedItems?.length ?? 0,
      duplicateCount: input.duplicateCount ?? 0,
      createdAt: Date.now(),
      items: input.items.map((item, index) => ({
        ...item,
        importItemKey: buildImportItemKey(id, index),
        sourceImportId: id,
        sourceTitle: title,
        sourceType: input.type,
        sourceItemIndex: index,
      })),
      skippedItems: (input.skippedItems ?? []).map((item, index) => ({
        ...item,
        skippedItemKey: buildSkippedItemKey(id, index),
        sourceImportId: id,
        sourceTitle: title,
        sourceType: input.type,
        sourceItemIndex: index,
        status: item.status ?? "unknown",
      })),
    };

    setImportSources((prev) => [
      ...prev.filter((source) => source.id !== id),
      nextSource,
    ]);

    setRemovedImportItemKeys((prev) =>
      prev.filter((key) => !isItemFromSource(key, id)),
    );

    return id;
  }, []);

  const removeImportSource = useCallback((sourceId: string) => {
    setImportSources((prev) => prev.filter((source) => source.id !== sourceId));

    setRemovedImportItemKeys((prev) =>
      prev.filter((key) => !isItemFromSource(key, sourceId)),
    );
  }, []);

  const resetImportSources = useCallback(() => {
    setImportSources([]);
    setRemovedImportItemKeys([]);
  }, []);

  const removeImportItem = useCallback((itemKey: string) => {
    if (!itemKey) return;

    setRemovedImportItemKeys((prev) => {
      if (prev.includes(itemKey)) return prev;
      return [...prev, itemKey];
    });
  }, []);

  const restoreImportItem = useCallback((itemKey: string) => {
    if (!itemKey) return;

    setRemovedImportItemKeys((prev) =>
      prev.filter((currentKey) => currentKey !== itemKey),
    );
  }, []);

  const resetRemovedImportItems = useCallback(() => {
    setRemovedImportItemKeys([]);
  }, []);

  const allImportItems = useMemo(
    () => importSources.flatMap((source) => source.items),
    [importSources],
  );

  const allSkippedItems = useMemo(
    () => importSources.flatMap((source) => source.skippedItems),
    [importSources],
  );

  const removedImportItemKeySet = useMemo(
    () => new Set(removedImportItemKeys),
    [removedImportItemKeys],
  );

  const importedPlaylistItems = useMemo(
    () =>
      allImportItems.filter(
        (item) => !removedImportItemKeySet.has(item.importItemKey),
      ),
    [allImportItems, removedImportItemKeySet],
  );

  const removedImportItems = useMemo(
    () =>
      allImportItems.filter((item) =>
        removedImportItemKeySet.has(item.importItemKey),
      ),
    [allImportItems, removedImportItemKeySet],
  );

  const totalImportedItemCount = allImportItems.length;
  const selectedImportedItemCount = importedPlaylistItems.length;
  const removedImportItemCount = removedImportItems.length;

  const totalSkippedItemCount = useMemo(
    () => importSources.reduce((sum, source) => sum + source.skippedCount, 0),
    [importSources],
  );

  const totalDuplicateItemCount = useMemo(
    () => importSources.reduce((sum, source) => sum + source.duplicateCount, 0),
    [importSources],
  );

  return {
    importSources,
    importedPlaylistItems,
    removedImportItems,
    removedImportItemKeys,
    skippedImportItems: allSkippedItems,
    totalImportedItemCount,
    selectedImportedItemCount,
    removedImportItemCount,
    totalSkippedItemCount,
    totalDuplicateItemCount,
    addImportSource,
    removeImportSource,
    resetImportSources,
    removeImportItem,
    restoreImportItem,
    resetRemovedImportItems,
  };
}
