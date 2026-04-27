import { useMemo } from "react";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
} from "../../shared/model/collectionLimits";

export type CollectionCreateStep = "source" | "review" | "publish";

type CollectionLike = {
  visibility?: string | null;
};

type UseCollectionCreateReadinessParams = {
  collections: CollectionLike[];
  isAdmin: boolean;
  createStep: CollectionCreateStep;

  hasImportedItems: boolean;
  playlistLoading: boolean;
  isImportingYoutubePlaylist: boolean;

  isDraftOverflow: boolean;
  effectiveCollectionTitle: string;
};

export function useCollectionCreateReadiness({
  collections,
  isAdmin,
  createStep,
  hasImportedItems,
  playlistLoading,
  isImportingYoutubePlaylist,
  isDraftOverflow,
  effectiveCollectionTitle,
}: UseCollectionCreateReadinessParams) {
  return useMemo(() => {
    const privateCollectionsCount = collections.filter(
      (item) => item.visibility !== "public",
    ).length;

    const remainingCollectionSlots = Math.max(
      0,
      MAX_COLLECTIONS_PER_USER - collections.length,
    );

    const remainingPrivateCollectionSlots = Math.max(
      0,
      MAX_PRIVATE_COLLECTIONS_PER_USER - privateCollectionsCount,
    );

    const reachedCollectionLimit =
      !isAdmin && collections.length >= MAX_COLLECTIONS_PER_USER;

    const reachedPrivateCollectionLimit =
      !isAdmin && privateCollectionsCount >= MAX_PRIVATE_COLLECTIONS_PER_USER;

    const canGoReview =
      hasImportedItems && !playlistLoading && !isImportingYoutubePlaylist;

    const canGoPublish =
      canGoReview &&
      !isDraftOverflow &&
      !reachedCollectionLimit &&
      Boolean(effectiveCollectionTitle.trim());

    const canGoNext = createStep === "source" ? canGoReview : canGoPublish;

    return {
      privateCollectionsCount,
      remainingCollectionSlots,
      remainingPrivateCollectionSlots,
      reachedCollectionLimit,
      reachedPrivateCollectionLimit,
      canGoReview,
      canGoPublish,
      canGoNext,
    };
  }, [
    collections,
    createStep,
    effectiveCollectionTitle,
    hasImportedItems,
    isAdmin,
    isDraftOverflow,
    isImportingYoutubePlaylist,
    playlistLoading,
  ]);
}
