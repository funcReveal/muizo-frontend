import { useEffect, useRef } from "react";

import type { CollectionEntry } from "@features/CollectionContent";

type UseSharedCollectionEntryArgs = {
  sharedCollectionId: string | null;
  roomCreateSourceMode: string;
  selectedCreateCollectionId: string | null;
  playlistItemsLength: number;
  playlistLoading: boolean;
  collectionItemsError: string | null;
  setGuideMode: (value: "create" | "join") => void;
  setCreateLibraryTab: (
    value: "public" | "personal" | "youtube" | "link",
  ) => void;
  setCreateLeftTab: (value: "library" | "settings") => void;
  setRoomCreateSourceMode: (
    value: "publicCollection" | "privateCollection" | "youtube" | "link",
  ) => void;
  updateAllowCollectionClipTiming: (value: boolean) => boolean;
  setSelectedCreateYoutubeId: (value: string | null) => void;
  setSelectedCreateCollectionId: (value: string | null) => void;
  setSharedCollectionMeta: (
    value: {
      id: string;
      title: string;
      scope: "public" | "private";
    } | null,
  ) => void;
  handleResetPlaylist: () => void;
  fetchCollectionById: (
    collectionId: string,
    options?: { readToken?: string | null },
  ) => Promise<CollectionEntry | null>;
  loadCollectionItems: (
    collectionId: string,
    options?: { force?: boolean; readToken?: string | null },
  ) => Promise<unknown>;
  openCollectionDrawer: (
    collection: CollectionEntry,
    source: "manual" | "sharedLink",
  ) => void;
};

export const useSharedCollectionEntry = ({
  sharedCollectionId,
  roomCreateSourceMode,
  selectedCreateCollectionId,
  playlistItemsLength,
  playlistLoading,
  collectionItemsError,
  setGuideMode,
  setCreateLibraryTab,
  setCreateLeftTab,
  setRoomCreateSourceMode,
  updateAllowCollectionClipTiming,
  setSelectedCreateYoutubeId,
  setSelectedCreateCollectionId,
  setSharedCollectionMeta,
  handleResetPlaylist,
  fetchCollectionById,
  loadCollectionItems,
  openCollectionDrawer,
}: UseSharedCollectionEntryArgs) => {
  const handledSharedCollectionRef = useRef<string | null>(null);
  const inFlightSharedCollectionRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);

  const latestHandlersRef = useRef({
    setGuideMode,
    setCreateLibraryTab,
    setCreateLeftTab,
    setRoomCreateSourceMode,
    updateAllowCollectionClipTiming,
    setSelectedCreateYoutubeId,
    setSelectedCreateCollectionId,
    setSharedCollectionMeta,
    handleResetPlaylist,
    fetchCollectionById,
    loadCollectionItems,
    openCollectionDrawer,
  });

  useEffect(() => {
    latestHandlersRef.current = {
      setGuideMode,
      setCreateLibraryTab,
      setCreateLeftTab,
      setRoomCreateSourceMode,
      updateAllowCollectionClipTiming,
      setSelectedCreateYoutubeId,
      setSelectedCreateCollectionId,
      setSharedCollectionMeta,
      handleResetPlaylist,
      fetchCollectionById,
      loadCollectionItems,
      openCollectionDrawer,
    };
  }, [
    fetchCollectionById,
    handleResetPlaylist,
    loadCollectionItems,
    openCollectionDrawer,
    setCreateLeftTab,
    setCreateLibraryTab,
    setGuideMode,
    setRoomCreateSourceMode,
    setSelectedCreateCollectionId,
    setSelectedCreateYoutubeId,
    setSharedCollectionMeta,
    updateAllowCollectionClipTiming,
  ]);

  useEffect(() => {
    if (!sharedCollectionId) {
      handledSharedCollectionRef.current = null;
      inFlightSharedCollectionRef.current = null;
      requestSeqRef.current += 1;
      return;
    }

    const signature = sharedCollectionId;

    if (handledSharedCollectionRef.current === signature) return;
    if (inFlightSharedCollectionRef.current === signature) return;

    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    inFlightSharedCollectionRef.current = signature;

    let cancelled = false;

    const handlers = latestHandlersRef.current;

    handlers.setGuideMode("create");
    handlers.setCreateLibraryTab("public");
    handlers.setCreateLeftTab("library");
    handlers.updateAllowCollectionClipTiming(true);
    handlers.setRoomCreateSourceMode("publicCollection");
    handlers.setSelectedCreateYoutubeId(null);
    handlers.setSelectedCreateCollectionId(signature);
    handlers.setSharedCollectionMeta({
      id: signature,
      title: "分享收藏庫",
      scope: "public",
    });
    handlers.handleResetPlaylist();

    void (async () => {
      const collection =
        await latestHandlersRef.current.fetchCollectionById(signature);

      if (cancelled) return;
      if (requestSeqRef.current !== requestSeq) return;

      if (!collection) {
        inFlightSharedCollectionRef.current = null;
        latestHandlersRef.current.setSharedCollectionMeta({
          id: signature,
          title: "找不到分享收藏庫",
          scope: "public",
        });
        return;
      }

      const scope = collection.visibility === "private" ? "private" : "public";

      latestHandlersRef.current.setSharedCollectionMeta({
        id: collection.id,
        title: collection.title,
        scope,
      });

      latestHandlersRef.current.openCollectionDrawer(collection, "sharedLink");

      handledSharedCollectionRef.current = signature;
      inFlightSharedCollectionRef.current = null;

      void latestHandlersRef.current.loadCollectionItems(collection.id, {
        force: true,
      });
    })();

    return () => {
      cancelled = true;

      if (inFlightSharedCollectionRef.current === signature) {
        inFlightSharedCollectionRef.current = null;
      }
    };
  }, [sharedCollectionId]);

  useEffect(() => {
    if (!sharedCollectionId) return;
    if (roomCreateSourceMode !== "publicCollection") return;
    if (selectedCreateCollectionId !== sharedCollectionId) return;
    if (playlistItemsLength > 0 || playlistLoading) return;
    if (collectionItemsError) return;

    void latestHandlersRef.current.loadCollectionItems(sharedCollectionId, {
      force: true,
    });
  }, [
    collectionItemsError,
    playlistItemsLength,
    playlistLoading,
    roomCreateSourceMode,
    selectedCreateCollectionId,
    sharedCollectionId,
  ]);

  return {
    handledSharedCollectionRef,
  };
};
