import { useEffect, useRef } from "react";

type UseSharedCollectionEntryArgs = {
  sharedCollectionId: string | null;
  roomCreateSourceMode: string;
  selectedCreateCollectionId: string | null;
  playlistItemsLength: number;
  playlistLoading: boolean;
  collectionItemsError: string | null;
  setGuideMode: (value: "create" | "join") => void;
  setCreateLibraryTab: (value: "public" | "personal" | "youtube" | "link") => void;
  setCreateLeftTab: (value: "library" | "settings") => void;
  setRoomCreateSourceMode: (value: "publicCollection" | "privateCollection" | "youtube" | "link") => void;
  updateAllowCollectionClipTiming: (value: boolean) => boolean;
  setSelectedCreateYoutubeId: (value: string | null) => void;
  setSelectedCreateCollectionId: (value: string | null) => void;
  setSharedCollectionMeta: (value: {
    id: string;
    title: string;
    scope: "public" | "private";
  } | null) => void;
  handleResetPlaylist: () => void;
  loadCollectionItems: (collectionId: string, options?: { force?: boolean }) => Promise<unknown>;
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
  loadCollectionItems,
}: UseSharedCollectionEntryArgs) => {
  const handledSharedCollectionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sharedCollectionId) return;

    const signature = sharedCollectionId;
    if (handledSharedCollectionRef.current === signature) return;
    handledSharedCollectionRef.current = signature;

    setGuideMode("create");
    setCreateLibraryTab("public");
    setCreateLeftTab("settings");
    updateAllowCollectionClipTiming(true);
    setRoomCreateSourceMode("publicCollection");
    setSelectedCreateYoutubeId(null);
    setSelectedCreateCollectionId(sharedCollectionId);
    setSharedCollectionMeta({
      id: sharedCollectionId,
      title: "分享收藏庫",
      scope: "public",
    });
    handleResetPlaylist();
    void loadCollectionItems(sharedCollectionId, { force: true });
  }, [
    handleResetPlaylist,
    loadCollectionItems,
    setCreateLeftTab,
    setCreateLibraryTab,
    setGuideMode,
    setRoomCreateSourceMode,
    updateAllowCollectionClipTiming,
    setSelectedCreateCollectionId,
    setSelectedCreateYoutubeId,
    setSharedCollectionMeta,
    sharedCollectionId,
  ]);

  useEffect(() => {
    if (!sharedCollectionId) return;
    if (roomCreateSourceMode !== "publicCollection") return;
    if (selectedCreateCollectionId !== sharedCollectionId) return;
    if (playlistItemsLength > 0 || playlistLoading) return;
    if (collectionItemsError) return;

    void loadCollectionItems(sharedCollectionId, { force: true });
  }, [
    collectionItemsError,
    loadCollectionItems,
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
