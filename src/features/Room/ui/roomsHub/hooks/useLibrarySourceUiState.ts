import { useRef, useState } from "react";

export type CreateLibraryTab = "public" | "personal" | "youtube" | "link";
export type CreateLeftTab = "library" | "settings";

export type SharedCollectionMeta = {
  id: string;
  title: string;
  scope: "public" | "private";
} | null;

export const useLibrarySourceUiState = () => {
  const [createLibraryTab, setCreateLibraryTab] =
    useState<CreateLibraryTab>("public");
  const [sharedCollectionMeta, setSharedCollectionMeta] =
    useState<SharedCollectionMeta>(null);
  const [createLibraryView, setCreateLibraryView] = useState<"grid" | "list">(
    "grid",
  );
  const [createLibrarySearch, setCreateLibrarySearch] = useState("");
  const [createLeftTab, setCreateLeftTab] = useState<CreateLeftTab>("library");
  const [playlistUrlDraft, setPlaylistUrlDraft] = useState("");
  const [playlistPreviewError, setPlaylistPreviewError] = useState<
    string | null
  >(null);
  const [isPlaylistUrlFieldFocused, setIsPlaylistUrlFieldFocused] =
    useState(false);
  const [isPublicLibrarySearchExpanded, setIsPublicLibrarySearchExpanded] =
    useState(false);
  const [selectedCreateCollectionId, setSelectedCreateCollectionId] = useState<
    string | null
  >(null);
  const [selectedCreateYoutubeId, setSelectedCreateYoutubeId] = useState<
    string | null
  >(null);
  const previousCreateLibraryTabRef = useRef<CreateLibraryTab>(createLibraryTab);

  return {
    createLibraryTab,
    setCreateLibraryTab,
    sharedCollectionMeta,
    setSharedCollectionMeta,
    createLibraryView,
    setCreateLibraryView,
    createLibrarySearch,
    setCreateLibrarySearch,
    createLeftTab,
    setCreateLeftTab,
    playlistUrlDraft,
    setPlaylistUrlDraft,
    playlistPreviewError,
    setPlaylistPreviewError,
    isPlaylistUrlFieldFocused,
    setIsPlaylistUrlFieldFocused,
    isPublicLibrarySearchExpanded,
    setIsPublicLibrarySearchExpanded,
    selectedCreateCollectionId,
    setSelectedCreateCollectionId,
    selectedCreateYoutubeId,
    setSelectedCreateYoutubeId,
    previousCreateLibraryTabRef,
  };
};
