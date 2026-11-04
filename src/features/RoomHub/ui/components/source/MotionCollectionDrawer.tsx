import type { ReactNode } from "react";
import { Modal } from "@mui/material";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";

type Props = {
  open: boolean;
  compact: boolean;
  onClose: () => void;
  children: ReactNode;
};

const MotionCollectionDrawer = ({ open, compact, onClose, children }: Props) => {
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const hidden = compact ? { x: 0, y: "100%" } : { x: "100%", y: 0 };

  return (
    <AnimatePresence>
      {open ? (
        <Modal open hideBackdrop onClose={onClose} sx={{ zIndex: 1500 }}>
          <motion.div className="fixed inset-0 outline-none" tabIndex={-1}>
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="題庫詳情"
              className="absolute bottom-0 right-0 flex flex-col overflow-hidden outline-none [&_.text-slate-600]:text-stone-500"
              style={{
                width: compact ? "100%" : "min(1180px, 94vw)",
                height: "100dvh",
                maxHeight: "100dvh",
                borderRadius: compact ? 0 : "20px 0 0 20px",
                background: "var(--mc-surface)",
                color: "var(--mc-text)",
                boxShadow: "-16px 0 64px rgb(0 0 0 / 0.3)",
              }}
              initial={reduceMotion ? { opacity: 0 } : hidden}
              animate={{ x: 0, y: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : hidden}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              drag={compact ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              dragMomentum={false}
              dragTransition={{ bounceStiffness: 800, bounceDamping: 60 }}
              onPointerDownCapture={(event) => {
                const target = event.target as HTMLElement;
                if (compact && target.closest("[data-drawer-drag-handle]") && !target.closest("button")) {
                  dragControls.start(event);
                }
              }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || (info.offset.y > 20 && info.velocity.y > 650)) onClose();
              }}
            >
              {compact ? (
                <div data-drawer-drag-handle className="flex h-6 shrink-0 touch-none items-center justify-center" aria-hidden="true">
                  <span className="h-1 w-9 rounded-full bg-stone-500/70" />
                </div>
              ) : null}
              {children}
            </motion.div>
          </motion.div>
        </Modal>
      ) : null}
    </AnimatePresence>
  );
};

export default MotionCollectionDrawer;
