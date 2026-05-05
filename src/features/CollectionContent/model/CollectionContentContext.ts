import { createContext, useContext } from "react";

export type CollectionEntry = {
  id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
  cover_title?: string | null;
  cover_channel_title?: string | null;
  cover_thumbnail_url?: string | null;
  cover_duration_sec?: number | null;
  cover_source_id?: string | null;
  cover_provider?: string | null;
  item_count?: number;
  playable_item_count?: number | null;
  readToken?: string | null;
  use_count?: number;
  favorite_count?: number;
  rating_count?: number;
  rating_avg?: number;
  is_favorited?: boolean;
  created_at?: number;
  updated_at?: number;
  ai_edited_count?: number;
  has_ai_edited?: boolean;
};

export interface CollectionContentContextValue {
  collections: CollectionEntry[];
  collectionsLoading: boolean;
  collectionsLoadingMore: boolean;
  collectionsHasMore: boolean;
  collectionsError: string | null;
  collectionScope: "owner" | "public" | null;
  publicCollectionsSort: "updated" | "popular" | "favorites_first" | "rating";
  setPublicCollectionsSort: (
    next: "updated" | "popular" | "favorites_first" | "rating",
  ) => void;
  collectionFavoriteUpdatingId: string | null;
  collectionsLastFetchedAt: number | null;
  selectedCollectionId: string | null;
  collectionItemsLoading: boolean;
  collectionItemsError: string | null;
  fetchCollections: (
    scope?: "owner" | "public",
    options?: { query?: string },
  ) => Promise<void>;
  fetchCollectionById: (
    collectionId: string,
    options?: { readToken?: string | null },
  ) => Promise<CollectionEntry | null>;
  loadMoreCollections: () => Promise<void>;
  toggleCollectionFavorite: (collectionId: string) => Promise<boolean>;
  selectCollection: (collectionId: string | null) => void;
  loadCollectionItems: (
    collectionId: string,
    options?: { readToken?: string | null; force?: boolean },
  ) => Promise<void>;
}

export const CollectionContentContext =
  createContext<CollectionContentContextValue | null>(null);

export const useCollectionContent = (): CollectionContentContextValue => {
  const ctx = useContext(CollectionContentContext);
  if (!ctx)
    throw new Error(
      "useCollectionContent must be used within CollectionContentProvider",
    );
  return ctx;
};
