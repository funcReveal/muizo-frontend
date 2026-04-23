import React from "react";

interface CareerStatCardProps {
  label: string;
  value: React.ReactNode;
  subvalue?: React.ReactNode;
  className?: string;
  emphasis?: "default" | "soft" | "accent";
}

const emphasisClassMap: Record<
  NonNullable<CareerStatCardProps["emphasis"]>,
  string
> = {
  default: "border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)]",
  soft: "border-[var(--mc-border)] bg-[rgba(10,18,30,0.42)]",
  accent: "border-sky-300/20 bg-[rgba(16,34,56,0.72)]",
};

const CareerStatCard: React.FC<CareerStatCardProps> = ({
  label,
  value,
  subvalue,
  className = "",
  emphasis = "default",
}) => {
  return (
    <div
      className={[
        "rounded-[18px] border p-3",
        emphasisClassMap[emphasis],
        className,
      ].join(" ")}
    >
      <div className="text-[11px] tracking-[0.12em] text-[var(--mc-text-muted)]">
        {label}
      </div>

      <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
        {value}
      </div>

      {subvalue ? (
        <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
          {subvalue}
        </div>
      ) : null}
    </div>
  );
};

export default CareerStatCard;
