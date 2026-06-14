import { type ReactNode } from "react";
import { Button } from "@mui/material";
import { BookmarkBorderRounded, SearchRounded } from "@mui/icons-material";
import { List } from "react-window";

import LibraryEmptyState from "./LibraryEmptyState";
import type {
  VirtualLibraryListRowComponent,
  VirtualLibraryListRowProps,
} from "./VirtualLibraryListRow";
import VirtualLibraryGridRow, {
  type VirtualLibraryGridRowProps,
} from "./VirtualLibraryGridRow";
import { useTransientScrollbar } from "@shared/hooks/useTransientScrollbar";

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
  onCreateCollection: () => void;
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

const primaryActionSx = {
  borderRadius: "999px",
  px: 2,
  py: 0.8,
  fontWeight: 700,
  color: "rgb(8, 15, 28)",
  background:
    "linear-gradient(135deg, rgba(103,232,249,0.96), rgba(45,212,191,0.9))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.36), 0 16px 30px -22px rgba(34,211,238,0.9)",
  "&:hover": {
    background:
      "linear-gradient(135deg, rgba(125,245,255,0.98), rgba(94,234,212,0.94))",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.4), 0 18px 34px -22px rgba(34,211,238,0.95)",
  },
} as const;

const secondaryActionSx = {
  borderRadius: "999px",
  px: 2,
  py: 0.8,
  fontWeight: 700,
  color: "rgb(186, 230, 253)",
  borderColor: "rgba(125, 211, 252, 0.28)",
  backgroundColor: "rgba(15, 23, 42, 0.46)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045)",
  "&:hover": {
    borderColor: "rgba(125, 211, 252, 0.46)",
    backgroundColor: "rgba(14, 165, 233, 0.12)",
  },
} as const;

const quietActionSx = {
  borderRadius: "999px",
  px: 1.5,
  fontWeight: 700,
  color: "rgba(186, 230, 253, 0.88)",
  "&:hover": {
    backgroundColor: "rgba(14, 165, 233, 0.1)",
  },
} as const;

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
  onCreateCollection,
  createLibraryColumns,
  renderCollectionCard,
  collectionsLoadingMore,
  collectionListRowCount,
  collectionListRowHeight,
  collectionsHasMore,
  loadMoreCollections,
  VirtualLibraryListRow,
}: CollectionsSourceContentProps) => {
  const { transientScrollbarClassName, revealScrollbar } =
    useTransientScrollbar();

  const gridRowCount =
    Math.ceil(filteredCreateCollections.length / createLibraryColumns) +
    (collectionsHasMore || collectionsLoadingMore ? 1 : 0);
  const gridRowHeight = 276;
  const gridMinCardWidth = 240;

  if (shouldShowCollectionSkeleton) {
    return (
      <div className="flex h-full min-h-full flex-1 flex-col rounded-xl border border-transparent bg-transparent p-0 sm:border-[var(--mc-border)]/70 sm:bg-slate-950/18 sm:p-2">
        {createLibraryView === "grid" ? (
          <div className="h-auto lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div
              className="grid gap-3"
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
          <div className="h-auto space-y-2 lg:h-full lg:min-h-0 lg:overflow-hidden">
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
              : "建立自己的收藏庫後，可直接開房並持續整理成個人題庫。"
        }
        actions={
          isSearchEmpty ? undefined : isPublicTab ? (
            <Button
              size="small"
              variant="text"
              sx={quietActionSx}
              onClick={handleActivateLinkSource}
            >
              改用貼上連結
            </Button>
          ) : (
            <>
              <Button
                size="small"
                variant="contained"
                sx={primaryActionSx}
                onClick={onCreateCollection}
              >
                建立收藏庫
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={secondaryActionSx}
                onClick={() => setCreateLibraryTab("public")}
              >
                瀏覽公開題庫
              </Button>
              <Button
                size="small"
                variant="text"
                sx={quietActionSx}
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
        <List<VirtualLibraryGridRowProps>
          key="collections-grid"
          className={`transient-scrollbar ${transientScrollbarClassName}`}
          style={{ height: "100%", width: "100%" }}
          rowCount={gridRowCount}
          rowHeight={gridRowHeight}
          rowProps={{
            items: filteredCreateCollections,
            columns: createLibraryColumns,
            minCardWidth: gridMinCardWidth,
            renderItem: renderCollectionCard,
            hasMore: collectionsHasMore,
            isLoadingMore: collectionsLoadingMore,
            onLoadMore: () => {
              void loadMoreCollections();
            },
            renderLoader: (loaderIndex) =>
              renderCollectionSkeletonCard(loaderIndex + 1000, "grid"),
          }}
          rowComponent={VirtualLibraryGridRow}
          overscanCount={2}
          onRowsRendered={(visibleRows) => {
            if (
              collectionsLoadingMore ||
              !collectionsHasMore ||
              visibleRows.stopIndex < gridRowCount - 2
            ) {
              return;
            }
            void loadMoreCollections();
          }}
          onScroll={() => {
            revealScrollbar();
          }}
        />
      ) : (
        <List<VirtualLibraryListRowProps>
          key="collections-list"
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
