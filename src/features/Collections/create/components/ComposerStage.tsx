import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CollectionCreateStep } from "../hooks/useCollectionCreateReadiness";

const order = { source: 0, review: 1, publish: 2 };

export default function ComposerStage({
  step,
  children,
}: {
  step: CollectionCreateStep;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [history, setHistory] = useState({ step, direction: 1 });
  if (history.step !== step) {
    setHistory({
      step,
      direction: order[step] >= order[history.step] ? 1 : -1,
    });
  }
  const direction = history.direction;
  return (
    <div className="create-stage-shell">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={step}
          className="create-stage-content"
          custom={direction}
          initial={
            reduce ? false : { opacity: 0.35, x: direction * 14, scale: 0.995 }
          }
          animate={{ opacity: 1, x: 0, scale: 1 }}
          variants={{
            leave: (travel: number) =>
              reduce
                ? { opacity: 1, transition: { duration: 0 } }
                : {
                    opacity: 0,
                    x: -travel * 10,
                    pointerEvents: "none",
                    transition: { duration: 0.13 },
                  },
          }}
          exit="leave"
          transition={
            reduce
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 380,
                  damping: 34,
                  mass: 0.65,
                  opacity: { duration: 0.2 },
                }
          }
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
