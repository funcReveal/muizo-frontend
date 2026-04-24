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
    <div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <CareerShareTemplateSection
            activeTemplate={activeTemplate}
            setActiveTemplate={setActiveTemplate}
            templates={templates}
          />

          <CareerSharePreviewSection preview={preview} />
        </div>

        <div className="grid gap-4">
          <CareerShareActionsSection caption={caption} />

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
