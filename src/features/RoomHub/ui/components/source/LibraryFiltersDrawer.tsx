import type { ReactNode } from "react";
import { Modal } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import "./libraryFiltersDrawer.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onReset?: () => void;
  resultCount: number | null;
  loading: boolean;
  children: ReactNode;
};

export default function LibraryFiltersDrawer({ open, onClose, onReset, resultCount, loading, children }: Props) {
  const reducedMotion = useReducedMotion();
  const controls = useDragControls();
  return <AnimatePresence>
    {open && <Modal open hideBackdrop onClose={onClose} sx={{ zIndex: 1500 }}>
      <motion.div className="library-filters-overlay" tabIndex={-1}>
        <motion.div className="library-filters-backdrop" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .18 }} onClick={onClose} />
        <motion.section
          className="library-filters-drawer"
          data-public-collection-filters
          role="dialog"
          aria-modal="true"
          aria-labelledby="library-filters-title"
          initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
          animate={{ y: 0, opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
          transition={{ duration: reducedMotion ? 0 : .26, ease: [.22, 1, .36, 1] }}
          drag="y" dragControls={controls} dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: .3 }} dragMomentum={false}
          onPointerDownCapture={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("[data-filter-drag-handle]") && !target.closest("button")) controls.start(event);
          }}
          onDragEnd={(_, info) => { if (info.offset.y > 90 || (info.offset.y > 20 && info.velocity.y > 650)) onClose(); }}
        >
          <div className="library-filters-grip" data-filter-drag-handle aria-hidden="true"><span /></div>
          <header data-filter-drag-handle>
            <div><h2 id="library-filters-title">篩選題庫</h2><p>依排序、分類與語言找到想玩的題庫</p></div>
            <button type="button" className="library-filters-close" aria-label="關閉篩選" onClick={onClose}><CloseRounded sx={{ fontSize: 21 }} /></button>
          </header>
          <div className="library-filters-body">{children}</div>
          <footer>
            {onReset && <button type="button" className="library-filters-reset" onClick={onReset}>清除篩選</button>}
            <button type="button" className="library-filters-done" onClick={onClose}>{loading || resultCount === null ? "查看題庫" : `顯示 ${resultCount.toLocaleString("zh-TW")} 筆題庫`}</button>
          </footer>
        </motion.section>
      </motion.div>
    </Modal>}
  </AnimatePresence>;
}
