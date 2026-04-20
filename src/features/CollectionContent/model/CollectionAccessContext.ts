import { createContext, useContext } from "react";

import type { PlaylistItem } from "@features/PlaylistSource";

export interface CollectionAccessContextValue {
  fetchCollectionSnapshot: (collectionId: string) => Promise<PlaylistItem[]>;
  createCollectionReadToken: (collectionId: string) => Promise<string>;
  clearCollectionsError: () => void;
  resetCollectionSelection: () => void;
}

export const CollectionAccessContext =
  createContext<CollectionAccessContextValue | null>(null);

export const useCollectionAccess = (): CollectionAccessContextValue => {
  const ctx = useContext(CollectionAccessContext);
  if (!ctx) {
    throw new Error(
      "useCollectionAccess must be used within CollectionContentProvider",
    );
  }
  return ctx;
};
