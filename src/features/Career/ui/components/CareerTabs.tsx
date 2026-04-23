import React from "react";

export type CareerTabKey = "overview" | "collectionRanks" | "history" | "share";

interface CareerTabsProps {
  activeTab: CareerTabKey;
  onChange: (tab: CareerTabKey) => void;
}

const tabs: Array<{
  key: CareerTabKey;
  label: string;
  description: string;
}> = [
  {
    key: "overview",
    label: "總覽",
    description: "綜合表現 / 趨勢 / 高光",
  },
  {
    key: "collectionRanks",
    label: "題庫戰績",
    description: "榜單名次 / Δ 變動",
  },
  {
    key: "history",
    label: "對戰歷史",
    description: "完整紀錄 / 回顧",
  },
  {
    key: "share",
    label: "分享",
    description: "模板 / 預覽 / 文案",
  },
];

const CareerTabs: React.FC<CareerTabsProps> = ({ activeTab, onChange }) => {
  return (
    <div className="shrink-0 rounded-[20px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(17,15,13,0.94),rgba(9,8,6,0.98))] p-2 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.72)]">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-pressed={active}
              className={`rounded-[16px] border px-3 py-2.5 text-left transition ${
                active
                  ? "border-sky-300/42 bg-[linear-gradient(180deg,rgba(20,78,126,0.34),rgba(8,31,52,0.9))] shadow-[0_12px_28px_-20px_rgba(14,165,233,0.55)]"
                  : "border-transparent bg-transparent hover:border-sky-300/18 hover:bg-sky-300/8"
              }`}
            >
              <div className="text-sm font-semibold tracking-[0.08em] text-[var(--mc-text)]">
                {tab.label}
              </div>

              <div className="mt-1 hidden text-[11px] leading-5 text-[var(--mc-text-muted)] sm:block">
                {tab.description}
              </div>

              {active && (
                <div className="mt-2 h-1 w-full rounded-full bg-sky-300/90" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CareerTabs;
