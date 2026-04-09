import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type UIEvent,
} from "react";
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
  collectionsLoading: boolean;
  collectionsLoadingMore: boolean;
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
  collectionsLoading,
  collectionsLoadingMore,
  collectionListRowCount,
  collectionListRowHeight,
  collectionsHasMore,
  loadMoreCollections,
  VirtualLibraryListRow,
}: CollectionsSourceContentProps) => {
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const scrollHideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollHideTimerRef.current !== null) {
        window.clearTimeout(scrollHideTimerRef.current);
      }
    };
  }, []);

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
      <div className="flex h-full min-h-full flex-1 flex-col rounded-xl border border-transparent bg-transparent p-0 sm:border-[var(--mc-border)]/70 sm:bg-slate-950/18 sm:p-2">
        {createLibraryView === "grid" ? (
          <div className="h-full min-h-0 overflow-y-auto sm:pr-1">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${createLibraryColumns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: 6 }).map((_, idx) =>
                renderCollectionSkeletonCard(idx, "grid"),
              )}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-0 space-y-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, idx) =>
              renderCollectionSkeletonCard(idx, "list"),
            )}
          </div>
        )}
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
            <Button
              size="small"
              variant="text"
              onClick={handleActivateLinkSource}
            >
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
              <Button
                size="small"
                variant="text"
                onClick={handleActivateLinkSource}
              >
                改用貼上連結
              </Button>
            </>
          )
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-full flex-1 flex-col rounded-xl border border-transparent bg-transparent p-0 sm:border-[var(--mc-border)]/70 sm:bg-slate-950/18 sm:p-2">
      {createLibraryView === "grid" ? (
        <div
          ref={createLibraryScrollRef}
          className={`rooms-hub-library-scrollbar h-full min-h-0 overflow-y-auto sm:pr-1 ${
            isScrollbarVisible ? "is-scrolling" : ""
          }`}
          onScroll={(event) => {
            handleCollectionGridScroll(event);
            setIsScrollbarVisible(true);
            if (scrollHideTimerRef.current !== null) {
              window.clearTimeout(scrollHideTimerRef.current);
            }
            scrollHideTimerRef.current = window.setTimeout(() => {
              setIsScrollbarVisible(false);
              scrollHideTimerRef.current = null;
            }, 720);
          }}
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
            height: "100%",
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
