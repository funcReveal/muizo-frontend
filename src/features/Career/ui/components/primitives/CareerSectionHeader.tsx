import React from "react";

interface CareerSectionHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}

const CareerSectionHeader: React.FC<CareerSectionHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  compact = false,
}) => {
  return (
    <div
      className={[
        "flex items-start justify-between gap-4",
        compact ? "" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <h2
          className={[
            "font-semibold tracking-tight text-[var(--mc-text)]",
            compact ? "text-lg" : "text-xl",
          ].join(" ")}
        >
          {title}
        </h2>

        {description ? (
          <p
            className={[
              "text-[var(--mc-text-muted)]",
              compact ? "mt-1 text-xs leading-5" : "mt-1 text-sm leading-6",
            ].join(" ")}
          >
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {badge ? (
          <div className="inline-flex items-center rounded-full border border-sky-300/28 bg-sky-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-sky-100">
            {badge}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CareerSectionHeader;
