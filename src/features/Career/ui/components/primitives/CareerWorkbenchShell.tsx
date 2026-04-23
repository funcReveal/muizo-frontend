import React from "react";

interface CareerWorkbenchShellProps {
  children: React.ReactNode;
  className?: string;
}

const CareerWorkbenchShell: React.FC<CareerWorkbenchShellProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={[
        "rounded-[24px]",
        "border border-[var(--mc-border)]",
        "bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))]",
        "shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)]",
        "min-h-0",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

export default CareerWorkbenchShell;
