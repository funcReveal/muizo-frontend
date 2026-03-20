import { useEffect } from "react";

import type { RefObject } from "react";

type UsePublicCollectionsSearchUiArgs = {
  createLibraryTab: "public" | "personal" | "youtube" | "link";
  isExpanded: boolean;
  setIsExpanded: (value: boolean | ((prev: boolean) => boolean)) => void;
  setCreateLibrarySearch: (value: string) => void;
  panelRef: RefObject<HTMLDivElement | null>;
};

export const usePublicCollectionsSearchUi = ({
  createLibraryTab,
  isExpanded,
  setIsExpanded,
  setCreateLibrarySearch,
  panelRef,
}: UsePublicCollectionsSearchUiArgs) => {
  const publicLibrarySearchActive =
    createLibraryTab === "public" && isExpanded;

  useEffect(() => {
    setCreateLibrarySearch("");
    if (createLibraryTab !== "public") {
      setIsExpanded(false);
    }
  }, [createLibraryTab, setCreateLibrarySearch, setIsExpanded]);

  useEffect(() => {
    if (!publicLibrarySearchActive) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current?.contains(target)) return;
      setIsExpanded(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [panelRef, publicLibrarySearchActive, setIsExpanded]);

  const togglePublicLibrarySearch = () => {
    setIsExpanded((prev) => !prev);
  };

  return {
    publicLibrarySearchActive,
    togglePublicLibrarySearch,
  };
};
