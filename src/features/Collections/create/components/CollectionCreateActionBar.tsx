import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import { CircularProgress } from "@mui/material";
import type { CollectionCreateStep } from "../hooks/useCollectionCreateReadiness";
import SiteTooltip from "@shared/ui/SiteTooltip";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
type Props = {
  currentStep: CollectionCreateStep;
  canGoNext: boolean;
  canCreate: boolean;
  isCreating: boolean;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
  error?: string | null;
};
export default function CollectionCreateActionBar({
  currentStep,
  canGoNext,
  canCreate,
  isCreating,
  onBack,
  onNext,
  onCreate,
  error,
}: Props) {
  const publish = currentStep === "publish";
  const reduce = useReducedMotion();
  const ready = publish ? canCreate : canGoNext;
  const hint =
    currentStep === "source"
      ? "先匯入至少一首歌曲"
      : publish
        ? "請完成標題、分類及曲目檢查"
        : "確認題庫標題與曲目數量未超過限制";
  return (
    <footer className="create-action-bar">
      <div className="create-action-status" data-ready={ready} role="status">
        {ready ? (
          <CheckCircleRounded fontSize="small" />
        ) : (
          <span className="create-status-dot" />
        )}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={`${currentStep}-${ready}-${isCreating}`}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: reduce ? 0 : 0.16 }}
          >
            {isCreating
              ? "正在儲存"
              : ready
                ? publish
                  ? "可以建立題庫"
                  : currentStep === "source"
                    ? "歌單已就緒"
                    : "曲目已確認"
                : currentStep === "source"
                  ? "先加入歌曲"
                  : "尚有項目待確認"}
          </motion.span>
        </AnimatePresence>
      </div>
      {error && <span className="sr-only" role="alert">{error}</span>}
      <div className="create-action-buttons">
        {currentStep !== "source" && (
          <button
            type="button"
            className="create-secondary"
            onClick={onBack}
            disabled={isCreating}
          >
            <ArrowBackRounded fontSize="small" />
            上一步
          </button>
        )}
        <SiteTooltip title={error || (!ready ? hint : undefined)} open={error ? true : undefined}>
          <span tabIndex={!ready ? 0 : undefined}>
            <motion.button
              whileTap={reduce ? undefined : { scale: 0.98 }}
              type="button"
              className="create-primary"
              data-ready={ready}
              disabled={!ready || isCreating}
              onClick={publish ? onCreate : onNext}
            >
              {isCreating ? (
                <CircularProgress size={17} color="inherit" />
              ) : null}
              {isCreating
                ? "正在建立"
                : publish
                  ? "建立題庫"
                  : currentStep === "source"
                    ? "整理題目"
                    : "完成設定"}
              {!isCreating && <ArrowForwardRounded fontSize="small" />}
            </motion.button>
          </span>
        </SiteTooltip>
      </div>
    </footer>
  );
}
