import React, { useCallback, useMemo, useRef } from "react";
import {
  List,
  useDynamicRowHeight,
  type ListImperativeAPI,
  type RowComponentProps,
} from "react-window";

import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import CareerHistoryMatchCard from "./CareerHistoryMatchCard";

interface CareerHistoryGroup {
  roomId: string;
  roomName: string;
  items: RoomSettlementHistorySummary[];
}

interface CareerHistoryGroupedListProps {
  groupedHistoryItems: CareerHistoryGroup[];
  onOpenReplay: (summary: RoomSettlementHistorySummary) => void;
  nextCursorToken: string | null;
  loadingMoreList: boolean;
  onLoadMore: () => void;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

type CareerHistoryVirtualRow = {
  key: string;
  item: RoomSettlementHistorySummary;
  index: number;
};

interface CareerHistoryVirtualRowProps {
  rows: CareerHistoryVirtualRow[];
  onOpenReplay: (summary: RoomSettlementHistorySummary) => void;
}

const CareerHistoryGroupedList: React.FC<CareerHistoryGroupedListProps> = ({
  groupedHistoryItems,
  onOpenReplay,
  nextCursorToken,
  loadingMoreList,
  onLoadMore,
  onScroll,
}) => {
  const autoLoadArmedRef = useRef(false);
  const requestedAutoLoadCursorRef = useRef<string | null>(null);
  const visibleStopIndexRef = useRef(-1);
  const listRef = useRef<ListImperativeAPI | null>(null);

  const rowHeightCache = useDynamicRowHeight({
    defaultRowHeight: 150,
    key: `${groupedHistoryItems.length}:${nextCursorToken ?? "end"}`,
  });

  const rows = useMemo<CareerHistoryVirtualRow[]>(() => {
    const nextRows: CareerHistoryVirtualRow[] = [];
    let matchIndex = 0;

    groupedHistoryItems.forEach((group) => {
      group.items.forEach((item) => {
        nextRows.push({
          key: item.matchId,
          item,
          index: matchIndex,
        });
        matchIndex += 1;
      });
    });

    return nextRows;
  }, [groupedHistoryItems]);

  const rowProps = useMemo<CareerHistoryVirtualRowProps>(
    () => ({
      rows,
      onOpenReplay,
    }),
    [
      onOpenReplay,
      rows,
    ],
  );

  const requestNextPageIfNeeded = useCallback(() => {
    const scrollElement = listRef.current?.element ?? null;
    if (!nextCursorToken || loadingMoreList || rows.length === 0) return;

    const scrollTop = scrollElement?.scrollTop ?? 0;
    const clientHeight = scrollElement?.clientHeight ?? 0;
    const scrollHeight = scrollElement?.scrollHeight ?? 0;
    const hasScrolled = autoLoadArmedRef.current || scrollTop > 12;

    if (!hasScrolled) return;
    if (requestedAutoLoadCursorRef.current === nextCursorToken) return;

    const isNearScrollBottom =
      scrollHeight > 0 && scrollTop + clientHeight >= scrollHeight - 240;
    const isNearRenderedEnd =
      visibleStopIndexRef.current >= rows.length - 2;

    if (!isNearScrollBottom && !isNearRenderedEnd) return;

    requestedAutoLoadCursorRef.current = nextCursorToken;
    onLoadMore();
  }, [listRef, loadingMoreList, nextCursorToken, onLoadMore, rows.length]);

  const armAutoLoad = useCallback(() => {
    autoLoadArmedRef.current = true;
  }, []);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;

    if (scrollTop > 12) {
      armAutoLoad();
    }

    requestNextPageIfNeeded();

    onScroll(event);
  };

  return (
    <List
      className="pr-1"
      defaultHeight={640}
      rowComponent={CareerHistoryVirtualRow}
      rowCount={rows.length}
      rowHeight={rowHeightCache}
      rowProps={rowProps}
      overscanCount={4}
      listRef={listRef}
      onScroll={handleScroll}
      onWheelCapture={armAutoLoad}
      onTouchMoveCapture={armAutoLoad}
      onPointerDownCapture={armAutoLoad}
      onKeyDownCapture={(event) => {
        if (
          event.key === "End" ||
          event.key === "PageDown" ||
          event.key === "ArrowDown" ||
          event.key === " "
        ) {
          armAutoLoad();
        }
      }}
      onRowsRendered={({ stopIndex }) => {
        visibleStopIndexRef.current = stopIndex;
        requestNextPageIfNeeded();
      }}
      style={{ height: "100%", width: "100%" }}
    />
  );
};

const CareerHistoryVirtualRow = ({
  index,
  style,
  rows,
  onOpenReplay,
}: RowComponentProps<CareerHistoryVirtualRowProps>) => {
  const row = rows[index];

  if (!row) return <div style={style} />;

  return (
    <div style={style} className="px-1 py-1">
      <CareerHistoryMatchCard
        item={row.item}
        onOpenReplay={onOpenReplay}
        animationDelayMs={Math.min(row.index * 22, 180)}
      />
    </div>
  );
};

export default CareerHistoryGroupedList;
