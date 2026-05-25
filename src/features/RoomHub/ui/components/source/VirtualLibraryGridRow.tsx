import { useEffect, type ReactNode } from "react";
import { type RowComponentProps } from "react-window";

export type VirtualLibraryGridRowProps = {
  items: unknown[];
  columns: number;
  minCardWidth: number;
  renderItem: (item: unknown, itemIndex: number, view: "grid") => ReactNode;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  renderLoader?: (loaderIndex: number) => ReactNode;
};

const VirtualLibraryGridRow = ({
  index,
  style,
  items,
  columns,
  minCardWidth,
  renderItem,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  renderLoader,
}: RowComponentProps<VirtualLibraryGridRowProps>) => {
  const startIndex = index * columns;
  const rowItems = items.slice(startIndex, startIndex + columns);
  const isLoaderRow = rowItems.length === 0 && (hasMore || isLoadingMore);

  useEffect(() => {
    if (!isLoaderRow || !hasMore || isLoadingMore || !onLoadMore) return;
    onLoadMore();
  }, [hasMore, isLoaderRow, isLoadingMore, onLoadMore]);

  return (
    <div style={style} className="box-border pb-2 pr-1">
      <div
        className="grid h-full gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(${minCardWidth}px, 1fr))`,
        }}
      >
        {isLoaderRow
          ? Array.from({ length: columns }).map((_, loaderIndex) => (
              <div key={`grid-loader-${loaderIndex}`} className="min-w-0">
                {renderLoader ? renderLoader(loaderIndex) : null}
              </div>
            ))
          : rowItems.map((item, offset) => {
              const itemIndex = startIndex + offset;
              return (
                <div key={itemIndex} className="min-w-0">
                  {renderItem(item, itemIndex, "grid")}
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default VirtualLibraryGridRow;
