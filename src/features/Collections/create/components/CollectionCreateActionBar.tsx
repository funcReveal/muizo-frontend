type CreateStep = "source" | "review" | "publish";

type Props = {
  currentStep: CreateStep;
  canGoNext: boolean;
  canCreate: boolean;
  isCreating: boolean;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
};

export default function CollectionCreateActionBar({
  currentStep,
  canGoNext,
  canCreate,
  isCreating,
  onBack,
  onNext,
  onCreate,
}: Props) {
  const isFirstStep = currentStep === "source";
  const isLastStep = currentStep === "publish";

  return (
    <div className="sticky bottom-3 z-10 mt-5 rounded-2xl border border-[var(--mc-border)] bg-[rgba(8,13,24,0.88)] px-3 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep || isCreating}
          className="rounded-full border border-[var(--mc-border)] px-4 py-2 text-sm font-semibold text-[var(--mc-text)] transition hover:border-[var(--mc-accent)]/60 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Back
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={onCreate}
            disabled={!canCreate || isCreating}
            className="rounded-full bg-[var(--mc-accent)] px-5 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isCreating ? "Creating..." : "Create Collection"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || isCreating}
            className="rounded-full bg-[var(--mc-accent)] px-5 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
