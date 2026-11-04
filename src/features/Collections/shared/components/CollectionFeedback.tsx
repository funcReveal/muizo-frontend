import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import "./collectionFeedback.css";

type Props = {
  id?: string;
  title: string;
  message: string;
  tone?: "error" | "warning";
  action?: { label: string; onClick: () => void; disabled?: boolean };
};

export default function CollectionFeedback({
  id,
  title,
  message,
  tone = "error",
  action,
}: Props) {
  const titleId = useId();
  const reduce = useReducedMotion();
  return (
    <motion.div
      id={id}
      className="collection-feedback"
      data-tone={tone}
      role="alert"
      aria-atomic="true"
      aria-labelledby={titleId}
      initial={reduce ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.18 }}
    >
      <span className="collection-feedback-icon" aria-hidden="true">
        <ErrorOutlineRounded />
      </span>
      <div className="collection-feedback-body">
        <strong id={titleId}>{title}</strong>
        <p>{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
            <ArrowForwardRounded aria-hidden="true" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
