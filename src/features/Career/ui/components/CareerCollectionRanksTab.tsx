import React from "react";

import type {
  CareerCollectionRankRow,
  CareerCollectionRankSortKey,
  CareerCollectionRankSortOrder,
} from "../../types/career";
import CareerCollectionRanksHeaderSection from "./collectionRanks/CareerCollectionRanksHeaderSection";
import CareerCollectionRanksMobileList from "./collectionRanks/CareerCollectionRanksMobileList";
import CareerCollectionRanksTable from "./collectionRanks/CareerCollectionRanksTable";
import CareerCollectionRanksToolbar from "./collectionRanks/CareerCollectionRanksToolbar";
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
    <div className="flex flex-col gap-4">
      <CareerWorkbenchShell className="shrink-0 p-4">
        <CareerCollectionRanksHeaderSection />

        <div className="mt-4">
          <CareerCollectionRanksToolbar
            sortKey={sortKey}
            sortOrder={sortOrder}
            setSortKey={setSortKey}
            setSortOrder={setSortOrder}
          />
        </div>
      </CareerWorkbenchShell>

      <CareerWorkbenchShell className="p-4">
        <div>
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
