import React from "react";

import type { CareerShareTemplate } from "../../../types/career";
import CareerShareSurface from "./CareerShareSurface";

interface CareerShareTemplateSectionProps {
  activeTemplate: CareerShareTemplate;
  setActiveTemplate: (value: CareerShareTemplate) => void;
  templates: Array<{
    key: CareerShareTemplate;
    label: string;
    description: string;
  }>;
}

const CareerShareTemplateSection: React.FC<CareerShareTemplateSectionProps> = ({
  activeTemplate,
  setActiveTemplate,
  templates,
}) => {
  return (
    <CareerShareSurface>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--mc-text)]">
            分享
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--mc-text-muted)]">
            先把模板、預覽、文案位置定住，之後再接實際輸出能力。
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border border-emerald-300/26 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-emerald-100">
          SHARE V1
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {templates.map((template) => {
          const active = template.key === activeTemplate;

          return (
            <button
              key={template.key}
              type="button"
              onClick={() => setActiveTemplate(template.key)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.08em] transition ${
                active
                  ? "border-sky-300/40 bg-sky-300/12 text-sky-100"
                  : "border-[var(--mc-border)] bg-transparent text-[var(--mc-text-muted)] hover:border-sky-300/24 hover:bg-sky-300/8"
              }`}
            >
              {template.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-xs text-[var(--mc-text-muted)]">
        {templates.find((item) => item.key === activeTemplate)?.description}
      </div>
    </CareerShareSurface>
  );
};

export default CareerShareTemplateSection;
