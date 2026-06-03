import React from "react";

export type CareerTabKey = "overview" | "collectionRanks" | "history";

interface CareerTabsProps {
  activeTab: CareerTabKey;
  onChange: (tab: CareerTabKey) => void;
  docked?: boolean;
}

const tabs: Array<{
  key: CareerTabKey;
  label: string;
  shortLabel: string;
}> = [
  {
    key: "overview",
    label: "總覽",
    shortLabel: "總覽",
  },
  {
    key: "collectionRanks",
    label: "題庫戰績",
    shortLabel: "題庫",
  },
  {
    key: "history",
    label: "對戰歷史",
    shortLabel: "歷史",
  },
];

const CareerTabs: React.FC<CareerTabsProps> = ({
  activeTab,
  onChange,
  docked = false,
}) => {
  return (
    <nav>
      <div className="grid grid-cols-3 gap-1.5">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-pressed={active}
              className={`relative min-w-0 border px-2 py-2 text-center transition sm:px-3 ${
                docked ? "rounded-b-[16px] rounded-t-none" : "rounded-[16px]"
              } ${
                active
                  ? "border-amber-300/40 bg-amber-300/12 text-amber-50"
                  : "border-transparent text-[var(--mc-text-muted)] hover:border-amber-300/18 hover:bg-amber-300/8 hover:text-[var(--mc-text)]"
              }`}
            >
              <div className="truncate text-xs font-semibold sm:hidden">
                {tab.shortLabel}
              </div>

              <div className="hidden truncate text-sm font-semibold sm:block">
                {tab.label}
              </div>

              <div
                className={`mx-auto mt-1.5 h-0.5 rounded-full transition ${
                  active ? "w-8 bg-amber-200" : "w-0 bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default CareerTabs;
