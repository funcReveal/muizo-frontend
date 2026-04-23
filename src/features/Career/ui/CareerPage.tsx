import React, { useState } from "react";

import useCareerCollectionRanksData from "../model/useCareerCollectionRanksData";
import useCareerOverviewData from "../model/useCareerOverviewData";
import useCareerShareData from "../model/useCareerShareData";
import CareerCollectionRanksTab from "./components/CareerCollectionRanksTab";
import CareerHistoryWorkspace from "./components/CareerHistoryWorkspace";
import CareerOverviewTab from "./components/CareerOverviewTab";
import CareerShareTab from "./components/CareerShareTab";
import CareerTabs, { type CareerTabKey } from "./components/CareerTabs";

const CareerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CareerTabKey>("overview");

  const overviewQuery = useCareerOverviewData();
  const collectionRanksQuery = useCareerCollectionRanksData();
  const shareQuery = useCareerShareData();

  return (
    <div className="mx-auto flex h-[clamp(700px,calc(100dvh-176px),960px)] w-full max-w-[1380px] min-w-0 flex-col overflow-hidden px-1 sm:px-0">
      <section className="shrink-0 rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))] p-4 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--mc-text)]">
              戰績總覽
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--mc-text-muted)]">
              這一版改成單頁 workbench
              形式。整體盡量不做整頁上下捲動，改成在需要的清單區塊內部滾動。
            </p>
          </div>

          <div className="inline-flex items-center rounded-full border border-sky-300/28 bg-sky-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-sky-100">
            CAREER WORKBENCH
          </div>
        </div>

        <CareerTabs activeTab={activeTab} onChange={setActiveTab} />
      </section>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
        {activeTab === "overview" && (
          <CareerOverviewTab
            hero={overviewQuery.data.hero}
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
