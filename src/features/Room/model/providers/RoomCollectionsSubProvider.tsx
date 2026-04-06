/**
 * RoomCollectionsSubProvider
 *
 * 摰?函?蝞∠? collections ??? *
 * 靘陷嚗? *   - AuthContext嚗uthToken?uthUser.id?efreshAuthToken
 *   - PlaylistInputControlContext嚗pplyPlaylistSource?learPlaylistError?etPlaylistUrl
 *   - PlaylistSocketBridgeContext嚗nResetCollectionRef嚗‵??resetCollectionSelection嚗? *   - StatusWriteContext嚗etStatusText
 *
 * ??嚗oomCollectionsContext嚗??API嚗? */
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
import {
  CollectionAccessContext,
} from "./RoomCollectionsAccessContext";
import {
  usePlaylistInputControl,
  usePlaylistSocketBridge,
} from "./RoomPlaylistSubContexts";

export const RoomCollectionsSubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { authToken, authUser, refreshAuthToken } = useAuth();
  const { setStatusText } = useStatusWrite();
  const { applyPlaylistSource, clearPlaylistError, setPlaylistUrl, resetPlaylistState } =
    usePlaylistInputControl();
  const { onResetCollectionRef } = usePlaylistSocketBridge();

  // ?? useRoomCollections ?????????????????????????????????????????????????????
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

  // ?? 霈?PlaylistSubProvider ??handlePlaylistCollectionReset ?賢?怠 resetCollectionSelection
  useEffect(() => {
    onResetCollectionRef.current = resetCollectionSelection;
  }, [onResetCollectionRef, resetCollectionSelection]);

  // ?? useRoomProviderCollectionAccess ????????????????????????????????????????
  const { fetchCollectionSnapshot, createCollectionReadToken } =
    useRoomProviderCollectionAccess({
      apiUrl: API_URL,
      authToken,
      refreshAuthToken,
    });

  // ?? RoomCollectionsContext value ???????????????????????????????????????????
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

  // ?? ?湧 fetchCollectionSnapshot / createCollectionReadToken 靘?SessionCoreProvider ??
  // ???折 context ?喲?
  return (
    <RoomCollectionsContext.Provider value={collectionsContextValue}>
      <CollectionAccessContext.Provider
        value={useMemo(
          () => ({ fetchCollectionSnapshot, createCollectionReadToken, clearCollectionsError, resetCollectionSelection }),
          [clearCollectionsError, createCollectionReadToken, fetchCollectionSnapshot, resetCollectionSelection],
        )}
      >
        {children}
      </CollectionAccessContext.Provider>
    </RoomCollectionsContext.Provider>
  );
};

