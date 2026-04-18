import { useEffect, type ReactNode } from "react";
import { type RowComponentProps } from "react-window";

import type { RoomSummary } from "@domain/room/types";

export type VirtualJoinRoomRowProps = {
  items: RoomSummary[];
  renderItem: (item: RoomSummary, itemIndex: number, view: "list") => ReactNode;
  hasMore?: boolean;
  onLoadMore?: () => void;
  renderLoader?: () => ReactNode;
};

export type VirtualJoinRoomRowComponent = (
  props: RowComponentProps<VirtualJoinRoomRowProps>,
) => ReactNode;

const VirtualJoinRoomRow: VirtualJoinRoomRowComponent = ({
  index,
  style,
  items,
  renderItem,
  hasMore = false,
  onLoadMore,
  renderLoader,
}: RowComponentProps<VirtualJoinRoomRowProps>) => {
  const item = items[index];
  const isLoaderRow = typeof item === "undefined" && hasMore;

  useEffect(() => {
    if (!isLoaderRow || !hasMore || !onLoadMore) return;
    onLoadMore();
  }, [hasMore, isLoaderRow, onLoadMore]);

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

export default VirtualJoinRoomRow;
