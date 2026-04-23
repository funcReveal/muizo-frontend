import React from "react";

import type {
  CareerCollectionRankShortcutItem,
  CareerCompositeStats,
  CareerHeroStats,
  CareerHighlightItem,
  CareerWeeklyStats,
} from "../../types/career";
import CareerCollectionShortcutsSection from "./overview/CareerCollectionShortcutsSection";
import CareerCompositeSection from "./overview/CareerCompositeSection";
import CareerHeroSection from "./overview/CareerHeroSection";
import CareerHighlightsSection from "./overview/CareerHighlightsSection";
import CareerWeeklySection from "./overview/CareerWeeklySection";

interface CareerOverviewTabProps {
  hero: CareerHeroStats;
  composite: CareerCompositeStats;
  weekly: CareerWeeklyStats;
  highlights: CareerHighlightItem[];
  collectionShortcuts: CareerCollectionRankShortcutItem[];
  onOpenCollectionRanks: () => void;
  onOpenShare: () => void;
}

const CareerOverviewTab: React.FC<CareerOverviewTabProps> = ({
  hero,
  composite,
  weekly,
  highlights,
  collectionShortcuts,
  onOpenCollectionRanks,
  onOpenShare,
}) => {
  return (
    <div className="h-full min-h-0 overflow-auto pr-1 xl:overflow-hidden xl:pr-0">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="flex min-h-0 flex-col gap-4">
          <CareerHeroSection hero={hero} />
          <CareerCompositeSection composite={composite} />
        </div>

        <div className="grid min-h-0 gap-4 xl:grid-rows-[auto_auto_minmax(0,1fr)]">
          <CareerWeeklySection weekly={weekly} />

          <CareerCollectionShortcutsSection
            items={collectionShortcuts}
            onOpenCollectionRanks={onOpenCollectionRanks}
          />

          <CareerHighlightsSection
            highlights={highlights}
            onOpenShare={onOpenShare}
          />
        </div>
      </div>
    </div>
  );
};

export default CareerOverviewTab;
