import React from "react";

import CareerShareSurface from "./CareerShareSurface";

interface CareerShareCaptionSectionProps {
  caption: string;
  isLoading: boolean;
  error: string | null;
}

const CareerShareCaptionSection: React.FC<CareerShareCaptionSectionProps> = ({
  caption,
  isLoading,
  error,
}) => {
  return (
    <CareerShareSurface className="min-h-0">
      <div className="text-sm font-semibold tracking-[0.08em] text-[var(--mc-text)]">
        分享文案
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)] p-4 text-sm text-[var(--mc-text-muted)]">
          載入分享內容中...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : (
        <div className="mt-4 h-[calc(100%-32px)] min-h-[220px] rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)] p-4 text-sm leading-6 text-[var(--mc-text-muted)] xl:min-h-0">
          {caption}
        </div>
      )}
    </CareerShareSurface>
  );
};

export default CareerShareCaptionSection;
