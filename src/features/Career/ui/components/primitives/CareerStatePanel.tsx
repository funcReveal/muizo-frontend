import React from "react";

interface CareerStatePanelProps {
  children: React.ReactNode;
  tone?: "default" | "warning" | "danger";
  className?: string;
}

const toneClassMap: Record<
  NonNullable<CareerStatePanelProps["tone"]>,
  string
> = {
  default:
    "border-[var(--mc-border)] bg-[rgba(10,18,30,0.45)] text-[var(--mc-text-muted)]",
  warning: "border-amber-300/28 bg-amber-300/10 text-amber-100",
  danger: "border-rose-400/20 bg-rose-950/20 text-rose-100",
};

const CareerStatePanel: React.FC<CareerStatePanelProps> = ({
  children,
  tone = "default",
  className = "",
}) => {
  return (
    <div
      className={[
        "rounded-[18px] border px-4 py-4 text-sm",
        toneClassMap[tone],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

export default CareerStatePanel;
