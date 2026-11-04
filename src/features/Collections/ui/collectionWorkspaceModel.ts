export type DbCollection = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
  lifecycle_status?: "draft" | "published" | "archived";
  cover_title?: string | null;
  cover_channel_title?: string | null;
  cover_thumbnail_url?: string | null;
  cover_duration_sec?: number | null;
  cover_source_id?: string | null;
  cover_provider?: string | null;
  item_count?: number | null;
  playable_item_count?: number | null;
  use_count?: number | null;
  favorite_count?: number | null;
  rating_count?: number | null;
  rating_avg?: number | null;
  review_comment_count?: number | null;
  review_count?: number | null;
  comment_count?: number | null;
  category?: {
    id: string | null;
    key: string;
    label: string;
    parentKey?: string | null;
    parentLabel?: string | null;
  } | null;
  sub_tag_keys?: string[];
  // Owner-only moderation fields (absent on public reads).
  moderation_status?: "normal" | "action_required" | "under_review";
  moderation_reason?: string | null;
  moderation_edited?: boolean;
};

export type CollectionWorkspaceSection = "overview" | "list" | "curation";

export function getCollectionIssues(collection: DbCollection): string[] {
  const issues: string[] = [];
  if (collection.moderation_status === "action_required")
    issues.push("需要修改內容");
  if (collection.lifecycle_status === "draft") issues.push("草稿尚未完成");
  if (!collection.category) issues.push("尚未設定分類");
  if (!(collection.sub_tag_keys ?? []).length) issues.push("尚未設定語言");
  if (
    typeof collection.item_count === "number" &&
    typeof collection.playable_item_count === "number" &&
    collection.item_count > collection.playable_item_count
  ) {
    issues.push(
      `${collection.item_count - collection.playable_item_count} 首歌曲需檢查`,
    );
  }
  return issues;
}

export function canShareCollection(collection: DbCollection) {
  return (
    collection.visibility === "public" &&
    collection.lifecycle_status !== "draft" &&
    collection.lifecycle_status !== "archived"
  );
}

export type CollectionVisibilityFilter = "all" | "public" | "private";
export type CollectionSort = "default" | "plays" | "title";

export function filterAndSortCollections(
  items: DbCollection[],
  visibility: CollectionVisibilityFilter,
  sort: CollectionSort,
): DbCollection[] {
  const result = items.filter(
    (item) =>
      visibility === "all" || (item.visibility ?? "private") === visibility,
  );
  if (sort === "plays")
    result.sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0));
  if (sort === "title")
    result.sort((a, b) =>
      a.title.localeCompare(b.title, "zh-TW", { numeric: true }),
    );
  return result;
}
