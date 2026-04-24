import React from "react";

import type {
  CareerCollectionRankShortcutItem,
  CareerCompositeStats,
  CareerHighlightItem,
  CareerWeeklyStats,
} from "../../types/career";
import CareerCollectionShortcutsSection from "./overview/CareerCollectionShortcutsSection";
import CareerCompositeSection from "./overview/CareerCompositeSection";
import CareerHighlightsSection from "./overview/CareerHighlightsSection";
import CareerWeeklySection from "./overview/CareerWeeklySection";

interface CareerOverviewTabProps {
  composite: CareerCompositeStats;
  weekly: CareerWeeklyStats;
  highlights: CareerHighlightItem[];
  collectionShortcuts: CareerCollectionRankShortcutItem[];
  onOpenCollectionRanks: () => void;
  onOpenShare: () => void;
}

const CareerOverviewTab: React.FC<CareerOverviewTabProps> = ({
  composite,
  weekly,
  highlights,
  collectionShortcuts,
  onOpenCollectionRanks,
  onOpenShare,
}) => {
  return (
    <div>
      <div className="grid gap-4 xl:grid-cols-[1.28fr_0.72fr]">
        <div>
          <CareerCompositeSection composite={composite} />
        </div>

        <div className="grid gap-4">
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
