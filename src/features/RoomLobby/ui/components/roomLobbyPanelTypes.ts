export type CollectionOption = {
  id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
  use_count?: number;
  favorite_count?: number | null;
  rating_count?: number | null;
  rating_avg?: number | null;
  item_count?: number;
  playable_item_count?: number | null;
  readToken?: string | null;
  cover_title?: string | null;
  cover_channel_title?: string | null;
  category?: {
    key: string;
    label: string;
    parentKey?: string | null;
    parentLabel?: string | null;
  } | null;
  sub_tag_keys?: string[] | null;
};
