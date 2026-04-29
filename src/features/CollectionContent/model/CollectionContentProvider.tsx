/**
 * CollectionContentProvider
 *
 * Manages collection browsing and collection-to-playlist application.
 * It exposes public collection content state plus the access bridge used by
 * room flows that need collection snapshots/read tokens.
 */
import { useEffect, useMemo, type ReactNode } from "react";

import { useAuth } from "../../../shared/auth/AuthContext";
import {
  CollectionContentContext,
  type CollectionContentContextValue,
} from "./CollectionContentContext";
import { useCollectionContentState } from "./useCollectionContentState";
import { useCollectionContentAccess } from "./useCollectionContentAccess";
import { API_URL } from "@domain/room/constants";
import { CollectionAccessContext } from "./CollectionAccessContext";
import {
  usePlaylistInputControl,
  usePlaylistSocketBridge,
} from "@features/PlaylistSource";

type CollectionContentProviderProps = {
  children: ReactNode;
  setStatusText?: (value: string | null) => void;
};

export const CollectionContentProvider: React.FC<
  CollectionContentProviderProps
> = ({ children, setStatusText = () => {} }) => {
  const { authToken, authUser, refreshAuthToken } = useAuth();
  const {
    applyPlaylistSource,
    clearPlaylistError,
    setPlaylistUrl,
    resetPlaylistState,
  } = usePlaylistInputControl();
  const { onResetCollectionRef } = usePlaylistSocketBridge();

  const {
    collections,
    collectionsLoading,
    collectionsLoadingMore,
    collectionsHasMore,
    collectionsError,
    collectionScope,
    publicCollectionsSort,
    setPublicCollectionsSort,
    collectionFavoriteUpdatingId,
    collectionsLastFetchedAt,
    selectedCollectionId,
    collectionItemsLoading,
    collectionItemsError,
    selectCollection,
    fetchCollections,
    fetchCollectionById,
    loadMoreCollections,
    toggleCollectionFavorite,
    loadCollectionItems,
    resetCollectionsState,
    resetCollectionSelection,
    clearCollectionsError,
  } = useCollectionContentState({
    apiUrl: API_URL,
    authToken,
    ownerId: authUser?.id ?? null,
    refreshAuthToken,
    setStatusText,
    onPlaylistLoaded: (items, sourceId, title) => {
      applyPlaylistSource(items, sourceId, title ?? null);
      setPlaylistUrl("");
    },
    onPlaylistReset: () => {
      clearPlaylistError();
    },
  });

  useEffect(() => {
    if (authToken) return;
    resetCollectionsState();
    resetPlaylistState();
  }, [authToken, resetCollectionsState, resetPlaylistState]);

  useEffect(() => {
    onResetCollectionRef.current = resetCollectionSelection;
  }, [onResetCollectionRef, resetCollectionSelection]);

  const { fetchCollectionSnapshot, createCollectionReadToken } =
    useCollectionContentAccess({
      apiUrl: API_URL,
      authToken,
      refreshAuthToken,
    });

  const collectionsContextValue = useMemo<CollectionContentContextValue>(
    () => ({
      collections,
      collectionsLoading,
      collectionsLoadingMore,
      collectionsHasMore,
      collectionsError,
      collectionScope,
      publicCollectionsSort,
      setPublicCollectionsSort,
      collectionFavoriteUpdatingId,
      collectionsLastFetchedAt,
      selectedCollectionId,
      collectionItemsLoading,
      collectionItemsError,
      fetchCollections,
      fetchCollectionById,
      loadMoreCollections,
      toggleCollectionFavorite,
      selectCollection,
      loadCollectionItems,
    }),
    [
      collections,
      collectionsLoading,
      collectionsLoadingMore,
      collectionsHasMore,
      collectionsError,
      collectionScope,
      publicCollectionsSort,
      setPublicCollectionsSort,
      collectionFavoriteUpdatingId,
      collectionsLastFetchedAt,
      selectedCollectionId,
      collectionItemsLoading,
      collectionItemsError,
      fetchCollections,
      fetchCollectionById,
      loadMoreCollections,
      toggleCollectionFavorite,
      selectCollection,
      loadCollectionItems,
    ],
  );

  const collectionAccessValue = useMemo(
    () => ({
      fetchCollectionSnapshot,
      createCollectionReadToken,
      clearCollectionsError,
      resetCollectionSelection,
    }),
    [
      clearCollectionsError,
      createCollectionReadToken,
      fetchCollectionSnapshot,
      resetCollectionSelection,
    ],
  );

  return (
    <CollectionContentContext.Provider value={collectionsContextValue}>
      <CollectionAccessContext.Provider value={collectionAccessValue}>
        {children}
      </CollectionAccessContext.Provider>
    </CollectionContentContext.Provider>
  );
};
