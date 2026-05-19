import React from "react";

import type {
  CareerCollectionRankRow,
  CareerCollectionRankSortKey,
  CareerCollectionRankSortOrder,
} from "../../types/career";
import CareerCollectionRanksToolbar from "./collectionRanks/CareerCollectionRanksToolbar";
import CareerCollectionRanksMobileList from "./collectionRanks/CareerCollectionRanksMobileList";
import CareerCollectionRanksTable from "./collectionRanks/CareerCollectionRanksTable";
import CareerStatePanel from "./primitives/CareerStatePanel";
import CareerWorkbenchShell from "./primitives/CareerWorkbenchShell";

interface CareerCollectionRanksTabProps {
  items: CareerCollectionRankRow[];
  sortKey: CareerCollectionRankSortKey;
  sortOrder: CareerCollectionRankSortOrder;
  setSortKey: (value: CareerCollectionRankSortKey) => void;
  setSortOrder: (value: CareerCollectionRankSortOrder) => void;
  isLoading: boolean;
  error: string | null;
}

const CareerCollectionRanksTab: React.FC<CareerCollectionRanksTabProps> = ({
  items,
  sortKey,
  sortOrder,
  setSortKey,
  setSortOrder,
  isLoading,
  error,
}) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CareerWorkbenchShell className="flex min-h-0 flex-1 flex-col overflow-visible p-0">
        <div className="border-b border-[var(--mc-border)] p-3">
          <CareerCollectionRanksToolbar
            sortKey={sortKey}
            sortOrder={sortOrder}
            setSortKey={setSortKey}
            setSortOrder={setSortOrder}
          />
        </div>

        <div className="min-h-0 flex-1 p-4">
          {isLoading ? (
            <CareerStatePanel>載入題庫戰績中...</CareerStatePanel>
          ) : error ? (
            <CareerStatePanel tone="danger">{error}</CareerStatePanel>
          ) : items.length === 0 ? (
            <CareerStatePanel>尚無足夠題庫排名資料。</CareerStatePanel>
          ) : (
            <>
              <CareerCollectionRanksTable items={items} />
              <CareerCollectionRanksMobileList items={items} />
            </>
          )}
        </div>
      </CareerWorkbenchShell>
    </div>
  );
};

export default CareerCollectionRanksTab;
