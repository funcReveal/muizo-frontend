import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const AnimatedSearchHint = ({ text, hidden, transitionKey = text }: { text: string; hidden: boolean; transitionKey?: string }) => {
  const reduceMotion = useReducedMotion();
  // Hide immediately while typing so the hint never overlaps entered text.
  return (
    <motion.div
      className="hub-library-search-hint"
      aria-hidden="true"
      style={{ visibility: hidden ? "hidden" : "visible" }}
      initial={false}
      animate={{ opacity: hidden ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.12 }}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.span
          key={transitionKey}
          className="hub-library-search-hint__text"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -3 }}
          transition={reduceMotion ? { duration: 0 } : {
            y: { type: "spring", stiffness: 420, damping: 32, mass: 0.6 },
            opacity: { duration: 0.12 },
          }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
};

export default AnimatedSearchHint;
