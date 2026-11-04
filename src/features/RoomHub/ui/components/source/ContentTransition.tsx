import type { ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";

type Props = {
  viewKey: string;
  children: ReactNode;
  className?: string;
  onEntered?: () => void;
};

const Pane = ({ children, onEntered }: Pick<Props, "children" | "onEntered">) => {
  const present = useIsPresent();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="flex min-h-0 min-w-0 flex-col"
      style={{ gridArea: "1 / 1", zIndex: present ? 1 : 0, pointerEvents: present ? "auto" : "none", background: "var(--mc-bg)" }}
      inert={!present}
      aria-hidden={!present || undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Keep the outgoing view opaque underneath the incoming view until it
      // has faded in. Sequential exits briefly expose an empty content area.
      exit={{ opacity: 0.999, transition: { duration: reduceMotion ? 0 : 0.18, ease: "linear" } }}
      transition={reduceMotion ? { duration: 0 } : {
        opacity: { duration: 0.18, ease: "easeOut" },
      }}
      onAnimationComplete={() => { if (present) onEntered?.(); }}
    >
      {children}
    </motion.div>
  );
};

const ContentTransition = ({ viewKey, children, className = "", onEntered }: Props) => (
  <div className={`isolate grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] ${className}`}>
    <AnimatePresence initial={false} mode="sync">
      <Pane key={viewKey} onEntered={onEntered}>{children}</Pane>
    </AnimatePresence>
  </div>
);

export default ContentTransition;
