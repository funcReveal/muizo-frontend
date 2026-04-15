import { useCallback, useMemo, useState } from "react";
import {
  buildOverflowSelection,
  dedupePlaylistItems,
  splitLongDurationItems,
} from "../utils/createCollectionImport";

type SourcePlaylistItem = {
  title?: string;
  answerText?: string;
  uploader?: string;
  duration?: string;
  thumbnail?: string;
  url?: string;
  channelId?: string | null;
};

type UseCollectionCreateDraftArgs = {
  playlistItems: SourcePlaylistItem[];
  collectionItemLimit: number | null;
  longDurationThresholdSec?: number;
};

type DraftInteractionState = {
  sourceKey: string;
  removedKeys: string[];
  pendingKeys: string[];
  limitDialogOpen: boolean;
};

export function useCollectionCreateDraft({
  playlistItems,
  collectionItemLimit,
  longDurationThresholdSec = 600,
}: UseCollectionCreateDraftArgs) {
  const [interactionState, setInteractionState] =
    useState<DraftInteractionState>({
      sourceKey: "",
      removedKeys: [],
      pendingKeys: [],
      limitDialogOpen: false,
    });

  const dedupeResult = useMemo(
    () => dedupePlaylistItems(playlistItems),
    [playlistItems],
  );

  const baseItems = dedupeResult.items;
  const removedDuplicateGroups = dedupeResult.removedGroups;

  const sourceKey = useMemo(
    () => baseItems.map((item) => item.draftKey).join("|"),
    [baseItems],
  );

  const activeRemovedKeySet = useMemo(() => {
    if (interactionState.sourceKey !== sourceKey) {
      return new Set<string>();
    }
    return new Set(interactionState.removedKeys);
  }, [interactionState.removedKeys, interactionState.sourceKey, sourceKey]);

  const draftPlaylistItems = useMemo(
    () => baseItems.filter((item) => !activeRemovedKeySet.has(item.draftKey)),
    [baseItems, activeRemovedKeySet],
  );

  const removedDuplicateCount = useMemo(
    () =>
      removedDuplicateGroups.reduce(
        (sum, group) => sum + group.removedCount,
        0,
      ),
    [removedDuplicateGroups],
  );

  const hasDraftPlaylistItems = draftPlaylistItems.length > 0;

  const {
    normalItems: normalDraftPlaylistItems,
    longItems: longDraftPlaylistItems,
  } = useMemo(
    () =>
      splitLongDurationItems(draftPlaylistItems, {
        thresholdSec: longDurationThresholdSec,
      }),
    [draftPlaylistItems, longDurationThresholdSec],
  );

  const draftOverflowInfo = useMemo(() => {
    if (collectionItemLimit === null) {
      return {
        overflowCount: 0,
        isOverflow: false,
        suggestedRemovalKeys: [] as string[],
      };
    }

    return buildOverflowSelection(draftPlaylistItems, collectionItemLimit, {
      thresholdSec: longDurationThresholdSec,
    });
  }, [collectionItemLimit, draftPlaylistItems, longDurationThresholdSec]);

  const isDraftOverflow = draftOverflowInfo.isOverflow;
  const draftOverflowCount = draftOverflowInfo.overflowCount;

  const selectedRemovalKeys =
    interactionState.sourceKey === sourceKey
      ? interactionState.pendingKeys
      : draftOverflowInfo.suggestedRemovalKeys;

  const limitDialogOpen =
    interactionState.sourceKey === sourceKey
      ? interactionState.limitDialogOpen
      : draftOverflowInfo.isOverflow;

  const remainingAfterRemovalCount = Math.max(
    0,
    draftPlaylistItems.length - selectedRemovalKeys.length,
  );

  const canApplyRemoval =
    collectionItemLimit === null ||
    remainingAfterRemovalCount <= collectionItemLimit;

  const setLimitDialogOpen = useCallback(
    (open: boolean) => {
      setInteractionState((prev) => ({
        sourceKey,
        removedKeys: prev.sourceKey === sourceKey ? prev.removedKeys : [],
        pendingKeys:
          prev.sourceKey === sourceKey
            ? prev.pendingKeys
            : draftOverflowInfo.suggestedRemovalKeys,
        limitDialogOpen: open,
      }));
    },
    [draftOverflowInfo.suggestedRemovalKeys, sourceKey],
  );

  const toggleRemovalKey = useCallback(
    (draftKey: string) => {
      setInteractionState((prev) => {
        const basePendingKeys =
          prev.sourceKey === sourceKey
            ? prev.pendingKeys
            : draftOverflowInfo.suggestedRemovalKeys;

        const nextPendingKeys = basePendingKeys.includes(draftKey)
          ? basePendingKeys.filter((key) => key !== draftKey)
          : [...basePendingKeys, draftKey];

        return {
          sourceKey,
          removedKeys: prev.sourceKey === sourceKey ? prev.removedKeys : [],
          pendingKeys: nextPendingKeys,
          limitDialogOpen: true,
        };
      });
    },
    [draftOverflowInfo.suggestedRemovalKeys, sourceKey],
  );

  const handleApplySelectedRemovals = useCallback(() => {
    setInteractionState((prev) => {
      const currentRemovedKeys =
        prev.sourceKey === sourceKey ? prev.removedKeys : [];
      const currentPendingKeys =
        prev.sourceKey === sourceKey
          ? prev.pendingKeys
          : draftOverflowInfo.suggestedRemovalKeys;

      return {
        sourceKey,
        removedKeys: Array.from(
          new Set([...currentRemovedKeys, ...currentPendingKeys]),
        ),
        pendingKeys: [],
        limitDialogOpen: false,
      };
    });
  }, [draftOverflowInfo.suggestedRemovalKeys, sourceKey]);

  const handleReselectOverflowItems = useCallback(() => {
    setInteractionState((prev) => ({
      sourceKey,
      removedKeys: prev.sourceKey === sourceKey ? prev.removedKeys : [],
      pendingKeys: draftOverflowInfo.suggestedRemovalKeys,
      limitDialogOpen: true,
    }));
  }, [draftOverflowInfo.suggestedRemovalKeys, sourceKey]);

  const handleSelectLongTracksOnly = useCallback(() => {
    setInteractionState((prev) => ({
      sourceKey,
      removedKeys: prev.sourceKey === sourceKey ? prev.removedKeys : [],
      pendingKeys: longDraftPlaylistItems.map((item) => item.draftKey),
      limitDialogOpen: true,
    }));
  }, [longDraftPlaylistItems, sourceKey]);

  const handleClearRemovalSelection = useCallback(() => {
    setInteractionState((prev) => ({
      sourceKey,
      removedKeys: prev.sourceKey === sourceKey ? prev.removedKeys : [],
      pendingKeys: [],
      limitDialogOpen: true,
    }));
  }, [sourceKey]);

  return {
    draftPlaylistItems,
    removedDuplicateGroups,
    removedDuplicateCount,
    hasDraftPlaylistItems,
    normalDraftPlaylistItems,
    longDraftPlaylistItems,
    isDraftOverflow,
    draftOverflowCount,
    limitDialogOpen,
    setLimitDialogOpen,
    selectedRemovalKeys,
    remainingAfterRemovalCount,
    canApplyRemoval,
    toggleRemovalKey,
    handleApplySelectedRemovals,
    handleReselectOverflowItems,
    handleSelectLongTracksOnly,
    handleClearRemovalSelection,
  };
}
