import React from "react";

import type {
  CareerCollectionRankShortcutItem,
  CareerCompositeScope,
  CareerCompositeStats,
  CareerHighlightItem,
  CareerOverviewScopeContent,
} from "../../types/career";
import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import CareerCollectionShortcutsSection from "./overview/CareerCollectionShortcutsSection";
import CareerCompositeSection from "./overview/CareerCompositeSection";

interface CareerOverviewTabProps {
  composite: CareerCompositeStats;
  compositeScopes: CareerCompositeScope[];
  highlights: CareerHighlightItem[];
  collectionShortcuts: CareerCollectionRankShortcutItem[];
  scopeContent: CareerOverviewScopeContent[];
  onOpenCollectionRanks: () => void;
  onOpenRecentMatch: (summary: RoomSettlementHistorySummary) => void;
}

const CareerOverviewTab: React.FC<CareerOverviewTabProps> = ({
  composite,
  compositeScopes,
  highlights,
  collectionShortcuts,
  scopeContent,
  onOpenCollectionRanks,
  onOpenRecentMatch,
}) => {
  const fallbackScopeKey = compositeScopes[0]?.key ?? "overall";
  const [activeScopeKey, setActiveScopeKey] = React.useState(fallbackScopeKey);

  React.useEffect(() => {
    if (compositeScopes.some((scope) => scope.key === activeScopeKey)) return;
    setActiveScopeKey(fallbackScopeKey);
  }, [activeScopeKey, compositeScopes, fallbackScopeKey]);

  const activeScope =
    compositeScopes.find((scope) => scope.key === activeScopeKey) ??
    compositeScopes[0];
  const activeScopeContent = scopeContent.find(
    (content) => content.scopeKey === activeScope?.key,
  );
  const activeHighlights =
    activeScopeContent?.highlights ??
    (activeScope?.key === fallbackScopeKey ? highlights : []);
  const activeCollectionShortcuts =
    activeScopeContent?.collectionShortcuts ??
    (activeScope?.key === fallbackScopeKey ? collectionShortcuts : []);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="grid min-w-0 flex-1 items-start gap-3 xl:grid-cols-[1.18fr_0.82fr] xl:items-stretch">
        <div className="flex min-w-0 flex-col">
          <CareerCompositeSection
            composite={composite}
            compositeScopes={compositeScopes}
            activeScopeKey={activeScopeKey}
            onActiveScopeChange={setActiveScopeKey}
            highlights={activeHighlights}
          />
        </div>

        <div className="flex min-w-0 flex-col">
          <CareerCollectionShortcutsSection
            items={activeCollectionShortcuts}
            activeScopeKind={activeScope?.kind ?? "casual"}
            onOpenCollectionRanks={onOpenCollectionRanks}
            onOpenMatch={onOpenRecentMatch}
          />
        </div>
      </div>
    </div>
  );
};

export default CareerOverviewTab;
