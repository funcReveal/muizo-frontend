/**
 * CollectionContentProvider
 *
 * Manages collection browsing and collection-to-playlist application.
 * It exposes public collection content state plus the access bridge used by
 * room flows that need collection snapshots/read tokens.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";

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
  const wasAuthenticatedRef = useRef(Boolean(authToken));
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
    collectionsTotalCount,
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
    patchCollectionAvailability,
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

  useLayoutEffect(() => {
    const loggedOut = wasAuthenticatedRef.current && !authToken;
    wasAuthenticatedRef.current = Boolean(authToken);
    // Purge private data before painting logout or starting child requests.
    // Initial guest mounting must not cancel the first public-library load.
    if (loggedOut) {
      resetCollectionsState();
      resetPlaylistState();
    }
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
      collectionsTotalCount,
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
      patchCollectionAvailability,
    }),
    [
      collections,
      collectionsLoading,
      collectionsLoadingMore,
      collectionsHasMore,
      collectionsTotalCount,
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
      patchCollectionAvailability,
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
