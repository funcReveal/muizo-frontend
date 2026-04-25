type CreateStep = "source" | "review" | "publish";

type Props = {
  currentStep: CreateStep;
  onStepChange: (step: CreateStep) => void;
  canOpenReview: boolean;
  canOpenPublish: boolean;
};

const STEPS: Array<{
  key: CreateStep;
  label: string;
  description: string;
}> = [
  {
    key: "source",
    label: "Source",
    description: "Import playlist",
  },
  {
    key: "review",
    label: "Review",
    description: "Check items",
  },
  {
    key: "publish",
    label: "Publish",
    description: "Finalize settings",
  },
];

export default function CollectionCreateStepNav({
  currentStep,
  onStepChange,
  canOpenReview,
  canOpenPublish,
}: Props) {
  const canOpenStep = (step: CreateStep) => {
    if (step === "source") return true;
    if (step === "review") return canOpenReview;
    return canOpenPublish;
  };

  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {STEPS.map((step, index) => {
        const active = step.key === currentStep;
        const completed = index < currentIndex;
        const disabled = !canOpenStep(step.key);

        return (
          <button
            key={step.key}
            type="button"
            disabled={disabled}
            onClick={() => onStepChange(step.key)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              active
                ? "border-[var(--mc-accent)]/60 bg-[var(--mc-accent)]/10"
                : completed
                  ? "border-emerald-300/30 bg-emerald-300/8"
                  : "border-[var(--mc-border)] bg-[var(--mc-surface)]/55"
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--mc-text)]">
                {step.label}
              </div>
              <div className="text-xs tabular-nums text-[var(--mc-text-muted)]">
                {index + 1}/3
              </div>
            </div>
            <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
              {step.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
