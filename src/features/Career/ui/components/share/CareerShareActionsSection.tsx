import React from "react";

import CareerShareSurface from "./CareerShareSurface";

const CareerShareActionsSection: React.FC = () => {
  return (
    <CareerShareSurface>
      <div className="text-sm font-semibold tracking-[0.08em] text-[var(--mc-text)]">
        快速動作
      </div>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          className="rounded-[16px] border border-sky-300/30 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/16"
        >
          下載 PNG
        </button>

        <button
          type="button"
          className="rounded-[16px] border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/16"
        >
          複製分享文案
        </button>
      </div>
    </CareerShareSurface>
  );
};

export default CareerShareActionsSection;
