import CheckRounded from "@mui/icons-material/CheckRounded";
import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CollectionCreateStep } from "../hooks/useCollectionCreateReadiness";
import SiteTooltip from "@shared/ui/SiteTooltip";

type Props = {
  currentStep: CollectionCreateStep;
  onStepChange: (step: CollectionCreateStep) => void;
  canOpenReview: boolean;
  canOpenPublish: boolean;
};
const steps = [
  { key: "source", title: "匯入歌曲" },
  { key: "review", title: "整理題目" },
  { key: "publish", title: "完成設定" },
] as const;
export default function CollectionCreateStepNav({
  currentStep,
  onStepChange,
  canOpenReview,
  canOpenPublish,
}: Props) {
  const index = steps.findIndex((step) => step.key === currentStep);
  const motionId = useId();
  const reduce = useReducedMotion();
  return (
    <nav className="create-step-nav" aria-label="建立題庫步驟">
      <div
        className="create-step-track"
        role="progressbar"
        aria-label="建立題庫進度"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={index + 1}
        aria-valuetext={`第 ${index + 1} 步，共 3 步`}
      >
        <motion.span
          initial={false}
          animate={{ scaleX: index / 2 }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 150, damping: 28 }
          }
        />
      </div>
      {steps.map((step, i) => {
        const locked =
          step.key === "review"
            ? !canOpenReview
            : step.key === "publish"
              ? !canOpenPublish
              : false;
        return (
          <SiteTooltip
            key={step.key}
            title={
              locked
                ? step.key === "review"
                  ? "先匯入至少一首歌曲"
                  : "先完成曲目與題庫標題檢查"
                : undefined
            }
          >
            <motion.button
              whileTap={reduce || locked ? undefined : { scale: 0.98 }}
              type="button"
              className="create-step"
              data-active={i === index}
              data-done={i < index}
              aria-disabled={locked}
              aria-current={i === index ? "step" : undefined}
              onClick={() => {
                if (!locked) onStepChange(step.key);
              }}
            >
              {i === index && (
                <motion.span
                  className="create-step-selection"
                  layoutId={`${motionId}-step`}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 36 }
                  }
                />
              )}
              <span className="create-step-number">
                {i < index ? <CheckRounded fontSize="small" /> : `0${i + 1}`}
              </span>
              <span>{step.title}</span>
            </motion.button>
          </SiteTooltip>
        );
      })}
    </nav>
  );
}
