import React from "react";

interface CareerSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

export const careerSurfaceClass =
  "rounded-[22px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))] p-4 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)]";

export const careerMiniCardClass =
  "rounded-[18px] border border-[var(--mc-border)] bg-[rgba(10,18,30,0.55)] p-3";

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
