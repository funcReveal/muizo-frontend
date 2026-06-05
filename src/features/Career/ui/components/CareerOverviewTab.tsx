import React from "react";

import type {
  CareerCollectionRankShortcutItem,
  CareerCompositeScope,
  CareerCompositeStats,
  CareerOverviewScopeContent,
} from "../../types/career";
import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import CareerCompositeSection from "./overview/CareerCompositeSection";

const CAREER_OVERVIEW_SCOPE_STORAGE_KEY = "career_overview_active_scope";

interface CareerOverviewTabProps {
  composite: CareerCompositeStats;
  compositeScopes: CareerCompositeScope[];
  totalMatches: number;
  collectionShortcuts: CareerCollectionRankShortcutItem[];
  scopeContent: CareerOverviewScopeContent[];
  onOpenCollectionRanks: () => void;
  onOpenRecentMatch: (summary: RoomSettlementHistorySummary) => void;
}

const CareerOverviewTab: React.FC<CareerOverviewTabProps> = ({
  composite,
  compositeScopes,
  totalMatches,
  collectionShortcuts,
  scopeContent,
  onOpenCollectionRanks,
  onOpenRecentMatch,
}) => {
  const fallbackScopeKey = compositeScopes[0]?.key ?? "overall";
  const [activeScopeKey, setActiveScopeKey] = React.useState(() => {
    if (typeof window === "undefined") return fallbackScopeKey;

    try {
      return (
        window.localStorage.getItem(CAREER_OVERVIEW_SCOPE_STORAGE_KEY) ??
        fallbackScopeKey
      );
    } catch {
      return fallbackScopeKey;
    }
  });

  React.useEffect(() => {
    if (compositeScopes.some((scope) => scope.key === activeScopeKey)) return;
    setActiveScopeKey(fallbackScopeKey);
  }, [activeScopeKey, compositeScopes, fallbackScopeKey]);

  const handleActiveScopeChange = React.useCallback((scopeKey: string) => {
    setActiveScopeKey(scopeKey);

    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(CAREER_OVERVIEW_SCOPE_STORAGE_KEY, scopeKey);
    } catch {
      // ignore storage errors
    }
  }, []);

  const activeScope =
    compositeScopes.find((scope) => scope.key === activeScopeKey) ??
    compositeScopes[0];
  const activeScopeContent = scopeContent.find(
    (content) => content.scopeKey === activeScope?.key,
  );
  const activeCollectionShortcuts =
    activeScopeContent?.collectionShortcuts ??
    (activeScope?.key === fallbackScopeKey ? collectionShortcuts : []);

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <CareerCompositeSection
        composite={composite}
        compositeScopes={compositeScopes}
        totalMatches={totalMatches}
        activeScopeKey={activeScopeKey}
        onActiveScopeChange={handleActiveScopeChange}
        collectionShortcuts={activeCollectionShortcuts}
        onOpenCollectionRanks={onOpenCollectionRanks}
        onOpenRecentMatch={onOpenRecentMatch}
      />
    </div>
  );
};

export default CareerOverviewTab;
