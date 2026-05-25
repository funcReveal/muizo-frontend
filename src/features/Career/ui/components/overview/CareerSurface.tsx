import React from "react";

interface CareerSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

export const careerSurfaceClass =
  "relative overflow-hidden rounded-[22px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.94),rgba(8,7,5,0.985))] p-3.5 shadow-[0_18px_42px_-34px_var(--mc-glow),inset_0_1px_0_rgba(255,255,255,0.045)]";

export const careerMiniCardClass =
  "rounded-[14px] border border-white/8 bg-white/[0.045] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]";

const CareerSurface: React.FC<CareerSurfaceProps> = ({
  children,
  className = "",
}) => {
  return (
    <section className={`${careerSurfaceClass} ${className}`}>
      {children}
    </section>
  );
};

export default CareerSurface;
