import { Fragment, type ReactNode, type RefObject, type UIEvent } from "react";
import { Button } from "@mui/material";
import { BookmarkBorderRounded, SearchRounded } from "@mui/icons-material";
import { List } from "react-window";

import LibraryEmptyState from "./LibraryEmptyState";
import type {
  VirtualLibraryListRowComponent,
  VirtualLibraryListRowProps,
} from "./VirtualLibraryListRow";

type CreateLibraryTab = "public" | "personal";

type CollectionsSourceContentProps = {
  createLibraryTab: CreateLibraryTab;
  createLibraryView: "grid" | "list";
  shouldShowCollectionSkeleton: boolean;
  renderCollectionSkeletonCard: (
    idx: number,
    view: "grid" | "list",
  ) => ReactNode;
  collectionsError: string | null;
  filteredCreateCollections: unknown[];
  normalizedCreateLibrarySearch: string;
  setCreateLibraryTab: (value: "public") => void;
  handleActivateLinkSource: () => void;
  createLibraryScrollRef: RefObject<HTMLDivElement | null>;
  handleCollectionGridScroll: (event: UIEvent<HTMLDivElement>) => void;
  createLibraryColumns: number;
  renderCollectionCard: (
    item: unknown,
    itemIndex: number,
    view: "grid" | "list",
  ) => ReactNode;
  collectionsLoadingMore: boolean;
  collectionListHeight: number;
  collectionListRowCount: number;
  collectionListRowHeight: number;
  collectionsHasMore: boolean;
  loadMoreCollections: () => Promise<void>;
  VirtualLibraryListRow: VirtualLibraryListRowComponent;
};

const CollectionsSourceContent = ({
  createLibraryTab,
  createLibraryView,
  shouldShowCollectionSkeleton,
  renderCollectionSkeletonCard,
  collectionsError,
  filteredCreateCollections,
  normalizedCreateLibrarySearch,
  setCreateLibraryTab,
  handleActivateLinkSource,
  createLibraryScrollRef,
  handleCollectionGridScroll,
  createLibraryColumns,
  renderCollectionCard,
  collectionsLoadingMore,
  collectionListHeight,
  collectionListRowCount,
  collectionListRowHeight,
  collectionsHasMore,
  loadMoreCollections,
  VirtualLibraryListRow,
}: CollectionsSourceContentProps) => {
  const getCollectionRenderKey = (collection: unknown, index: number) => {
    if (
      collection &&
      typeof collection === "object" &&
      "id" in collection &&
      typeof (collection as { id?: unknown }).id === "string"
    ) {
      return (collection as { id: string }).id;
    }
    return `collection-${index}`;
  };

  if (shouldShowCollectionSkeleton) {
    return (
      <div
        className={createLibraryView === "grid" ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}
      >
        {Array.from({
          length: createLibraryView === "grid" ? 6 : 4,
        }).map((_, idx) => renderCollectionSkeletonCard(idx, createLibraryView))}
      </div>
    );
  }

  if (collectionsError) {
    return <p className="text-sm text-rose-300">{collectionsError}</p>;
  }

  if (filteredCreateCollections.length === 0) {
    const isSearchEmpty = Boolean(normalizedCreateLibrarySearch);
    const isPublicTab = createLibraryTab === "public";

    return (
      <LibraryEmptyState
        icon={
          isSearchEmpty ? (
            <SearchRounded sx={{ fontSize: 28 }} />
          ) : (
            <BookmarkBorderRounded sx={{ fontSize: 28 }} />
          )
        }
        title={
          isSearchEmpty
            ? "找不到符合的題庫"
            : isPublicTab
              ? "目前沒有公開收藏庫"
              : "你目前還沒有個人題庫"
        }
        description={
          isSearchEmpty
            ? "試試不同關鍵字，或清除搜尋後重新瀏覽題庫列表。"
            : isPublicTab
              ? "你可以稍後再回來看看，或直接貼上 YouTube 播放清單連結。"
              : "你可以先切換到公開題庫，或直接貼上 YouTube 播放清單連結。"
        }
        actions={
          isSearchEmpty ? undefined : isPublicTab ? (
            <Button size="small" variant="text" onClick={handleActivateLinkSource}>
              改用貼上連結
            </Button>
          ) : (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setCreateLibraryTab("public")}
              >
                瀏覽公開題庫
              </Button>
              <Button size="small" variant="text" onClick={handleActivateLinkSource}>
                改用貼上連結
              </Button>
            </>
          )
        }
      />
    );
  }

  return (
    <div className="rounded-xl border border-[var(--mc-border)]/70 bg-slate-950/18 p-2">
      {createLibraryView === "grid" ? (
        <div
          ref={createLibraryScrollRef}
          className="max-h-[640px] overflow-y-auto pr-1"
          onScroll={handleCollectionGridScroll}
        >
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${createLibraryColumns}, minmax(0, 1fr))`,
            }}
          >
            {filteredCreateCollections.map((collection, index) => (
              <Fragment key={getCollectionRenderKey(collection, index)}>
                {renderCollectionCard(collection, index, "grid")}
              </Fragment>
            ))}
            {collectionsLoadingMore
              ? Array.from({ length: createLibraryColumns }).map((_, idx) => (
                  <Fragment key={`collection-loader-${idx}`}>
                    {renderCollectionSkeletonCard(idx + 1000, "grid")}
                  </Fragment>
                ))
              : null}
          </div>
        </div>
      ) : (
        <List<VirtualLibraryListRowProps>
          style={{
            height: collectionListHeight,
            width: "100%",
          }}
          rowCount={collectionListRowCount}
          rowHeight={collectionListRowHeight}
          rowProps={{
            items: filteredCreateCollections,
            renderItem: renderCollectionCard,
            hasMore: collectionsHasMore,
            isLoadingMore: collectionsLoadingMore,
            onLoadMore: () => {
              void loadMoreCollections();
            },
            renderLoader: () => (
              <div className="space-y-2">
                {renderCollectionSkeletonCard(1000, "list")}
              </div>
            ),
          }}
          rowComponent={VirtualLibraryListRow as never}
        />
      )}
    </div>
  );
};

export default CollectionsSourceContent;
