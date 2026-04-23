import React, { useState } from "react";

import useCareerCollectionRanksData from "../model/useCareerCollectionRanksData";
import useCareerOverviewData from "../model/useCareerOverviewData";
import useCareerShareData from "../model/useCareerShareData";
import CareerCollectionRanksTab from "./components/CareerCollectionRanksTab";
import CareerHistoryWorkspace from "./components/CareerHistoryWorkspace";
import CareerOverviewTab from "./components/CareerOverviewTab";
import CareerShareTab from "./components/CareerShareTab";
import CareerTabs, { type CareerTabKey } from "./components/CareerTabs";
import CareerTopOverviewStrip from "./components/CareerTopOverviewStrip";

const CareerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CareerTabKey>("overview");

  const overviewQuery = useCareerOverviewData();
  const collectionRanksQuery = useCareerCollectionRanksData();
  const shareQuery = useCareerShareData();

  return (
    <div className="mx-auto flex h-[clamp(760px,calc(100dvh-156px),980px)] w-full max-w-[1420px] min-w-0 flex-col overflow-hidden px-1 sm:px-0">
      <CareerTopOverviewStrip hero={overviewQuery.data.hero} />

      <div className="mt-3">
        <CareerTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
        {activeTab === "overview" && (
          <CareerOverviewTab
            composite={overviewQuery.data.composite}
            weekly={overviewQuery.data.weekly}
            highlights={overviewQuery.data.highlights}
            collectionShortcuts={overviewQuery.data.collectionShortcuts}
            onOpenCollectionRanks={() => setActiveTab("collectionRanks")}
            onOpenShare={() => setActiveTab("share")}
          />
        )}

        {activeTab === "collectionRanks" && (
          <CareerCollectionRanksTab
            items={collectionRanksQuery.items}
            sortKey={collectionRanksQuery.sortKey}
            sortOrder={collectionRanksQuery.sortOrder}
            setSortKey={collectionRanksQuery.setSortKey}
            setSortOrder={collectionRanksQuery.setSortOrder}
            isLoading={collectionRanksQuery.isLoading}
            error={collectionRanksQuery.error}
          />
        )}

        {activeTab === "history" && <CareerHistoryWorkspace />}

        {activeTab === "share" && (
          <CareerShareTab
            activeTemplate={shareQuery.activeTemplate}
            setActiveTemplate={shareQuery.setActiveTemplate}
            templates={shareQuery.templates}
            preview={shareQuery.preview}
            caption={shareQuery.caption}
            isLoading={shareQuery.isLoading}
            error={shareQuery.error}
          />
        )}
      </div>
    </div>
  );
};

export default CareerPage;
