import React from "react";

interface CareerShareSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

export const careerShareSurfaceClass =
  "rounded-[22px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.98))] p-4 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)]";

const CareerShareSurface: React.FC<CareerShareSurfaceProps> = ({
  children,
  className = "",
}) => {
  return (
    <section className={`${careerShareSurfaceClass} ${className}`}>
      {children}
    </section>
  );
};

export default CareerShareSurface;
