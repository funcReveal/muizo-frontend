import { useEffect, type ReactNode } from "react";
import { type RowComponentProps } from "react-window";

export type VirtualLibraryListRowProps = {
  items: unknown[];
  renderItem: (item: unknown, itemIndex: number, view: "list") => ReactNode;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  renderLoader?: () => ReactNode;
};

export type VirtualLibraryListRowComponent = (
  props: RowComponentProps<VirtualLibraryListRowProps>,
) => ReactNode;

const VirtualLibraryListRow: VirtualLibraryListRowComponent = ({
  index,
  style,
  items,
  renderItem,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  renderLoader,
}: RowComponentProps<VirtualLibraryListRowProps>) => {
  const item = items[index];
  const isLoaderRow = typeof item === "undefined" && (hasMore || isLoadingMore);

  useEffect(() => {
    if (!isLoaderRow || !hasMore || isLoadingMore || !onLoadMore) return;
    onLoadMore();
  }, [hasMore, isLoaderRow, isLoadingMore, onLoadMore]);

  if (isLoaderRow) {
    return (
      <div style={style} className="pr-1">
        {renderLoader ? renderLoader() : null}
      </div>
    );
  }

  return (
    <div style={style} className="pr-1">
      {item ? renderItem(item, index, "list") : null}
    </div>
  );
};

export default VirtualLibraryListRow;
