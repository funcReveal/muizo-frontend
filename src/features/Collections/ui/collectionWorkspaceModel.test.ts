import { expect, it } from "vitest";
import {
  canShareCollection,
  filterAndSortCollections,
  getCollectionIssues,
  type DbCollection,
} from "./collectionWorkspaceModel";

const collection = (overrides: Partial<DbCollection> = {}): DbCollection => ({
  id: "1",
  owner_id: "owner",
  title: "題庫",
  visibility: "public",
  category: { id: "pop", key: "pop", label: "流行音樂" },
  sub_tag_keys: ["ja"],
  item_count: 30,
  playable_item_count: 30,
  ...overrides,
});

it("uses missing playback counts as unknown, without inventing unavailable songs", () => {
  expect(
    getCollectionIssues(collection({ playable_item_count: null })),
  ).toEqual([]);
  expect(
    getCollectionIssues(collection({ playable_item_count: 26 })),
  ).toContain("4 首歌曲需檢查");
});
it("collects moderation, category and language work independently", () => {
  expect(
    getCollectionIssues(
      collection({
        moderation_status: "action_required",
        category: null,
        sub_tag_keys: [],
      }),
    ),
  ).toEqual(["需要修改內容", "尚未設定分類", "尚未設定語言"]);
});
it("flags unfinished drafts and keeps them out of the share flow", () => {
  expect(
    getCollectionIssues(collection({ lifecycle_status: "draft" })),
  ).toContain("草稿尚未完成");
  expect(canShareCollection(collection({ lifecycle_status: "draft" }))).toBe(
    false,
  );
  expect(
    canShareCollection(collection({ lifecycle_status: "published" })),
  ).toBe(true);
  expect(canShareCollection(collection({ visibility: "private" }))).toBe(false);
});
it("treats omitted visibility as private and leaves the source order untouched", () => {
  const input = [
    collection({ id: "a", title: "B", use_count: 1 }),
    collection({ id: "b", title: "A", visibility: undefined, use_count: 8 }),
  ];
  expect(
    filterAndSortCollections(input, "private", "default").map(
      (item) => item.id,
    ),
  ).toEqual(["b"]);
  expect(
    filterAndSortCollections(input, "all", "plays").map((item) => item.id),
  ).toEqual(["b", "a"]);
  expect(
    filterAndSortCollections(input, "all", "title").map((item) => item.id),
  ).toEqual(["b", "a"]);
  expect(input.map((item) => item.id)).toEqual(["a", "b"]);
});
