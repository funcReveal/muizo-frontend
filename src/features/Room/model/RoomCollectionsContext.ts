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
  use_count?: number;
  favorite_count?: number;
  is_favorited?: boolean;
  created_at?: number;
  updated_at?: number;
  ai_edited_count?: number;
  has_ai_edited?: boolean;
};

export interface RoomCollectionsContextValue {
  collections: CollectionEntry[];
  collectionsLoading: boolean;
  collectionsLoadingMore: boolean;
  collectionsHasMore: boolean;
  collectionsError: string | null;
  collectionScope: "owner" | "public" | null;
  publicCollectionsSort: "updated" | "popular" | "favorites_first";
  setPublicCollectionsSort: (
    next: "updated" | "popular" | "favorites_first",
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
  loadMoreCollections: () => Promise<void>;
  toggleCollectionFavorite: (collectionId: string) => Promise<boolean>;
  selectCollection: (collectionId: string | null) => void;
  loadCollectionItems: (
    collectionId: string,
    options?: { readToken?: string | null; force?: boolean },
  ) => Promise<void>;
}

export const RoomCollectionsContext =
  createContext<RoomCollectionsContextValue | null>(null);

export const useRoomCollections = (): RoomCollectionsContextValue => {
  const ctx = useContext(RoomCollectionsContext);
  if (!ctx)
    throw new Error("useRoomCollections must be used within a RoomProvider");
  return ctx;
};
