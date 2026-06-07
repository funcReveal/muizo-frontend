import React from "react";

import { recordDbActionEvent } from "@shared/analytics/actionEvents";
import { useAuth } from "@shared/auth/AuthContext";
import type {
  CareerCollectionRankRow,
  CareerCollectionRankSortKey,
  CareerCollectionRankSortOrder,
} from "../../types/career";
import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import CareerCollectionRanksMobileList from "./collectionRanks/CareerCollectionRanksMobileList";
import CareerCollectionRanksTable from "./collectionRanks/CareerCollectionRanksTable";
import CareerCollectionRankDetailDrawer from "./collectionRanks/CareerCollectionRankDetailDrawer";
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
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
}

const CareerCollectionRanksTab: React.FC<CareerCollectionRanksTabProps> = ({
  items,
  sortKey,
  sortOrder,
  setSortKey,
  setSortOrder,
  isLoading,
  error,
  onOpenMatch,
}) => {
  const { authToken, clientId, displayUsername, refreshAuthToken } = useAuth();
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(
    null,
  );

  const selectedItem = React.useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  React.useEffect(() => {
    if (selectedItemId && !selectedItem) {
      setSelectedItemId(null);
    }
  }, [selectedItem, selectedItemId]);

  const handleSelectItem = React.useCallback(
    (item: CareerCollectionRankRow) => {
      setSelectedItemId(item.id);
      if (authToken) {
        void recordDbActionEvent({
          eventName: "career.collection_rank.detail.opened",
          authToken,
          clientId,
          username: displayUsername,
          refreshAuthToken,
          collectionId: item.collectionId,
          metadata: {
            source: "career_collection_rank",
            detailSurface: "career_collection_rank",
          },
        }).catch((error) => {
          console.error("[career] failed to record detail open event", error);
        });
      }
    },
    [authToken, clientId, displayUsername, refreshAuthToken],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CareerWorkbenchShell className="flex min-h-0 flex-1 flex-col overflow-visible rounded-[18px] p-0 max-lg:border-transparent max-lg:shadow-none max-lg:[background-image:none] sm:rounded-[24px]">
        <div className="min-h-0 flex-1 p-0 sm:p-4">
          {isLoading ? (
            <CareerStatePanel>載入題庫戰績中...</CareerStatePanel>
          ) : error ? (
            <CareerStatePanel tone="danger">{error}</CareerStatePanel>
          ) : items.length === 0 ? (
            <CareerStatePanel>尚無足夠題庫排名資料。</CareerStatePanel>
          ) : (
            <>
              <CareerCollectionRanksTable
                items={items}
                selectedItemId={selectedItemId}
                sortKey={sortKey}
                sortOrder={sortOrder}
                setSortKey={setSortKey}
                setSortOrder={setSortOrder}
                onSelectItem={handleSelectItem}
              />
              <CareerCollectionRanksMobileList
                items={items}
                selectedItemId={selectedItemId}
                onSelectItem={handleSelectItem}
              />
            </>
          )}
        </div>
      </CareerWorkbenchShell>

      <CareerCollectionRankDetailDrawer
        open={Boolean(selectedItem)}
        item={selectedItem}
        onClose={() => setSelectedItemId(null)}
        onOpenMatch={onOpenMatch}
      />
    </div>
  );
};

export default CareerCollectionRanksTab;
