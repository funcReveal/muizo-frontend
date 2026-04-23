import React from "react";

interface CareerActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "primary" | "secondary" | "success" | "ghost";
}

const toneClassMap: Record<
  NonNullable<CareerActionButtonProps["tone"]>,
  string
> = {
  primary:
    "border-sky-300/30 bg-sky-300/10 text-sky-100 hover:border-sky-300/45 hover:bg-sky-300/16",
  secondary:
    "border-[var(--mc-border)] bg-transparent text-[var(--mc-text-muted)] hover:border-sky-300/24 hover:bg-sky-300/8",
  success:
    "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 hover:border-emerald-300/45 hover:bg-emerald-300/16",
  ghost:
    "border-transparent bg-transparent text-[var(--mc-text-muted)] hover:border-sky-300/18 hover:bg-sky-300/8",
};

const CareerActionButton: React.FC<CareerActionButtonProps> = ({
  children,
  tone = "primary",
  className = "",
  type = "button",
  ...rest
}) => {
  return (
    <button
      type={type}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.12em] transition",
        "disabled:cursor-not-allowed disabled:opacity-70",
        toneClassMap[tone],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
};

export default CareerActionButton;
