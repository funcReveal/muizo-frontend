import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CollectionCreateStep } from "../hooks/useCollectionCreateReadiness";

type Props = {
  currentStep: CollectionCreateStep;
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
  const { t } = useTranslation("collectionCreate");

  const canGoBack = currentStep !== "source" && !isCreating;
  const isPublishStep = currentStep === "publish";

  const primaryDisabled = isPublishStep
    ? !canCreate || isCreating
    : !canGoNext || isCreating;

  const primaryLabel = useMemo(() => {
    if (isPublishStep) {
      return isCreating
        ? t("action.creating", { defaultValue: "建立中..." })
        : t("action.create", { defaultValue: "建立收藏庫" });
    }

    if (currentStep === "source") {
      return t("action.reviewNext", { defaultValue: "下一步：檢查內容" });
    }

    return t("action.publishNext", { defaultValue: "下一步：發布設定" });
  }, [currentStep, isCreating, isPublishStep, t]);

  const helperText = useMemo(() => {
    if (isPublishStep) {
      return canCreate
        ? t("action.readyToCreate", {
            defaultValue: "確認無誤後即可建立收藏庫。",
          })
        : t("action.createDisabledHint", {
            defaultValue: "請確認標題、曲目數量與收藏庫限制。",
          });
    }

    if (currentStep === "source") {
      return canGoNext
        ? t("action.sourceReadyHint", {
            defaultValue: "已可進入內容檢查。",
          })
        : t("action.sourceDisabledHint", {
            defaultValue: "請先匯入至少一個播放清單。",
          });
    }

    return canGoNext
      ? t("action.reviewReadyHint", {
          defaultValue: "內容檢查完成後可進入發布設定。",
        })
      : t("action.reviewDisabledHint", {
          defaultValue: "請確認收藏標題與曲目限制。",
        });
  }, [canCreate, canGoNext, currentStep, isPublishStep, t]);

  return (
    <div className="sticky bottom-0 z-30 -mx-3 border-t border-[var(--mc-border)] bg-[rgba(2,6,23,0.9)] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_48px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:static sm:mx-0 sm:rounded-2xl sm:border sm:bg-[var(--mc-surface)]/70 sm:px-4 sm:pb-4 sm:shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs leading-5 text-[var(--mc-text-muted)]">
          {helperText}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/45 px-4 py-2 text-sm font-semibold text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/65 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("action.back", { defaultValue: "上一步" })}
          </button>

          <button
            type="button"
            onClick={isPublishStep ? onCreate : onNext}
            disabled={primaryDisabled}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[var(--mc-accent)] px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_14px_34px_rgba(34,211,238,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
