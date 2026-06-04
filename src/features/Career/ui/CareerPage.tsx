import React, { useMemo, useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";

import useCareerCollectionRanksData from "../model/useCareerCollectionRanksData";
import useCareerHistoryWorkspace from "../model/useCareerHistoryWorkspace";
import useCareerOverviewData from "../model/useCareerOverviewData";
import CareerCollectionRanksTab from "./components/CareerCollectionRanksTab";
import CareerHistoryWorkspace from "./components/CareerHistoryWorkspace";
import CareerOverviewTab from "./components/CareerOverviewTab";
import CareerTabs, { type CareerTabKey } from "./components/CareerTabs";
import CareerTopOverviewStrip from "./components/CareerTopOverviewStrip";
import CareerStatePanel from "./components/primitives/CareerStatePanel";
import HistoryReplayDialog from "@features/Settlement/ui/components/roomHistoryPage/HistoryReplayDialog";

const CareerPageSkeleton: React.FC = () => {
  return (
    <div className="h-full min-h-0 space-y-2 overflow-y-auto pr-0.5 sm:space-y-3 sm:pr-1">
      <div className="rounded-[20px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.94),rgba(8,7,5,0.98))] p-3 sm:rounded-[26px] sm:p-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-40 animate-pulse rounded-full bg-white/12" />
            <div className="h-3 w-56 max-w-full animate-pulse rounded-full bg-white/8" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[72px] animate-pulse rounded-[16px] border border-white/8 bg-white/[0.045]"
            />
          ))}
        </div>
      </div>

      <div className="h-[64px] animate-pulse rounded-[22px] border border-[var(--mc-border)] bg-white/[0.04]" />
      <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="h-[360px] animate-pulse rounded-[24px] border border-white/8 bg-white/[0.045]" />
        <div className="h-[360px] animate-pulse rounded-[24px] border border-white/8 bg-white/[0.045]" />
      </div>
    </div>
  );
};

const CareerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CareerTabKey>("overview");
  const { authUser, openProfileEditor } = useAuth();

  const overviewQuery = useCareerOverviewData();
  const collectionRanksQuery = useCareerCollectionRanksData();
  const historyWorkspace = useCareerHistoryWorkspace();

  const topLevelError = useMemo(() => {
    if (overviewQuery.error) return overviewQuery.error;
    if (activeTab === "collectionRanks") return collectionRanksQuery.error;
    return null;
  }, [activeTab, collectionRanksQuery.error, overviewQuery.error]);

  const isInitialLoading = overviewQuery.isLoading && !overviewQuery.error;

  return (
    <main className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden px-0 pb-1 sm:px-0">
      {isInitialLoading ? (
        <CareerPageSkeleton />
      ) : (
        <>
          {topLevelError && (
            <CareerStatePanel tone="warning" className="mb-3">
              {topLevelError}
            </CareerStatePanel>
          )}

          <CareerTopOverviewStrip
            hero={overviewQuery.data.hero}
            avatarUrl={authUser?.avatar_url ?? null}
            onEditProfile={openProfileEditor}
          />

          <div className="mt-1.5 shrink-0 pb-1.5 sm:mt-2 sm:pb-2">
            <div className="rounded-[18px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.98),rgba(8,7,5,0.99))] p-1 shadow-[0_18px_36px_-28px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:rounded-[20px] sm:p-1.5">
              <CareerTabs
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </div>
          </div>

          <section
            className="mt-0.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:mt-1"
            aria-live="polite"
          >
            {activeTab === "overview" && (
              <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:pr-1">
                <CareerOverviewTab
                  composite={overviewQuery.data.composite}
                  compositeScopes={overviewQuery.data.compositeScopes}
                  highlights={overviewQuery.data.highlights}
                  collectionShortcuts={overviewQuery.data.collectionShortcuts}
                  scopeContent={overviewQuery.data.scopeContent}
                  onOpenCollectionRanks={() => setActiveTab("collectionRanks")}
                  onOpenRecentMatch={(summary) => {
                    void historyWorkspace.openReplayDetail(summary);
                  }}
                />
              </div>
            )}

            {activeTab === "collectionRanks" && (
              <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:pr-1">
                <CareerCollectionRanksTab
                  items={collectionRanksQuery.items}
                  sortKey={collectionRanksQuery.sortKey}
                  sortOrder={collectionRanksQuery.sortOrder}
                  setSortKey={collectionRanksQuery.setSortKey}
                  setSortOrder={collectionRanksQuery.setSortOrder}
                  isLoading={collectionRanksQuery.isLoading}
                  error={collectionRanksQuery.error}
                  onOpenMatch={(summary) => {
                    void historyWorkspace.openReplayDetail(summary);
                  }}
                />
              </div>
            )}

            {activeTab === "history" && (
              <div className="min-h-0 flex-1">
                <CareerHistoryWorkspace workspace={historyWorkspace} />
              </div>
            )}

          </section>

          {activeTab !== "history" && (
            <HistoryReplayDialog
              open={Boolean(historyWorkspace.selectedSummary)}
              onClose={historyWorkspace.closeReplayDetail}
              selectedSummary={historyWorkspace.selectedSummary}
              relatedSummaries={historyWorkspace.selectedRelatedSummaries}
              selectedReplay={historyWorkspace.selectedReplay}
              isLoadingSelectedReplay={
                historyWorkspace.isLoadingSelectedReplay
              }
              onSelectSummary={(summary) => {
                void historyWorkspace.openReplayDetail(summary);
              }}
              meClientId={historyWorkspace.clientId}
              questionRecaps={
                historyWorkspace.normalizedSelectedQuestionRecaps
              }
              formatDateTime={historyWorkspace.formatDateTime}
              getMatchDurationMs={historyWorkspace.getMatchDurationMs}
              formatDuration={historyWorkspace.formatDuration}
            />
          )}
        </>
      )}
    </main>
  );
};

export default CareerPage;
