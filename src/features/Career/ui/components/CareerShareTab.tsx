import React from "react";

import type {
  CareerShareCardData,
  CareerShareTemplate,
} from "../../types/career";
import CareerShareActionsSection from "./share/CareerShareActionsSection";
import CareerShareCaptionSection from "./share/CareerShareCaptionSection";
import CareerSharePreviewSection from "./share/CareerSharePreviewSection";
import CareerShareTemplateSection from "./share/CareerShareTemplateSection";

interface CareerShareTabProps {
  activeTemplate: CareerShareTemplate;
  setActiveTemplate: (value: CareerShareTemplate) => void;
  templates: Array<{
    key: CareerShareTemplate;
    label: string;
    description: string;
  }>;
  preview: CareerShareCardData;
  caption: string;
  isLoading: boolean;
  error: string | null;
}

const CareerShareTab: React.FC<CareerShareTabProps> = ({
  activeTemplate,
  setActiveTemplate,
  templates,
  preview,
  caption,
  isLoading,
  error,
}) => {
  return (
    <div className="h-full min-h-0 overflow-auto pr-1 xl:overflow-hidden xl:pr-0">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="grid min-h-0 gap-4 xl:grid-rows-[auto_minmax(0,1fr)]">
          <CareerShareTemplateSection
            activeTemplate={activeTemplate}
            setActiveTemplate={setActiveTemplate}
            templates={templates}
          />

          <CareerSharePreviewSection preview={preview} />
        </div>

        <div className="grid min-h-0 gap-4 xl:grid-rows-[auto_minmax(0,1fr)]">
          <CareerShareActionsSection />

          <CareerShareCaptionSection
            caption={caption}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default CareerShareTab;
