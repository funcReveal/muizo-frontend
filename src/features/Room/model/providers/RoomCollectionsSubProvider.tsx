/**
 * RoomCollectionsSubProvider
 *
 * Manages collection browsing and collection-to-playlist application inside a room.
 * It exposes both the public RoomCollectionsContext and the internal
 * CollectionAccessContext used by SessionCoreProvider.
 */
import { useEffect, useMemo, type ReactNode } from "react";

import { useAuth } from "../../../../shared/auth/AuthContext";
import {
  RoomCollectionsContext,
  type RoomCollectionsContextValue,
} from "../RoomCollectionsContext";
import { useRoomCollections as useRoomCollectionsHook } from "../useRoomCollections";
import { useRoomProviderCollectionAccess } from "../useRoomProviderCollectionAccess";
import { API_URL } from "../roomConstants";
import { useStatusWrite } from "./RoomStatusContexts";
import { CollectionAccessContext } from "./RoomCollectionsAccessContext";
import {
  usePlaylistInputControl,
  usePlaylistSocketBridge,
} from "./RoomPlaylistSubContexts";

export const RoomCollectionsSubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { authToken, authUser, refreshAuthToken } = useAuth();
  const { setStatusText } = useStatusWrite();
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
    loadMoreCollections,
    toggleCollectionFavorite,
    loadCollectionItems,
    resetCollectionsState,
    resetCollectionSelection,
    clearCollectionsError,
  } = useRoomCollectionsHook({
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
    useRoomProviderCollectionAccess({
      apiUrl: API_URL,
      authToken,
      refreshAuthToken,
    });

  const collectionsContextValue = useMemo<RoomCollectionsContextValue>(
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
    <RoomCollectionsContext.Provider value={collectionsContextValue}>
      <CollectionAccessContext.Provider value={collectionAccessValue}>
        {children}
      </CollectionAccessContext.Provider>
    </RoomCollectionsContext.Provider>
  );
};
