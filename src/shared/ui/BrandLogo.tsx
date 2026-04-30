import React from "react";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  compact = false,
  className,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className ?? ""}`.trim()}>
      <div className="leading-none">
        <div
          className={`${compact ? "text-xl" : "text-lg"} font-semibold tracking-[0.08em] text-(--mc-text)`}
          style={{ fontFamily: '"OpenHuninn", "Noto Sans TC", sans-serif' }}
        >
          Muizo
        </div>
      </div>
    </div>
  );
};

export default BrandLogo;
