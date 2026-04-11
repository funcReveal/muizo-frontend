import React from "react";
import { createPortal } from "react-dom";

type MobileDrawerEdgeControlsProps = {
  open: boolean;
  progressLabel?: string | null;
  openAriaLabel: string;
  closeAriaLabel: string;
  onOpen: () => void;
  onClose: () => void;
  openIcon: React.ReactNode;
  closeIcon?: React.ReactNode;
  drawerWidthCss: string;
  closedTopClassName?: string;
};

const TAB_W = 40;
const SWIPE_CLOSE_THRESHOLD_PX = 36;

const MobileDrawerEdgeControls: React.FC<MobileDrawerEdgeControlsProps> = ({
  open,
  progressLabel,
  openAriaLabel,
  closeAriaLabel,
  onOpen,
  onClose,
  openIcon,
  drawerWidthCss,
  closedTopClassName = "top-[85dvh]",
}) => {
  const swipeStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const swipeDeltaRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const resetSwipe = React.useCallback(() => {
    swipeStartRef.current = null;
    swipeDeltaRef.current = { x: 0, y: 0 };
  }, []);

  const handleTouchStart = React.useCallback((event: React.TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeDeltaRef.current = { x: 0, y: 0 };
  }, []);

  const handleTouchMove = React.useCallback((event: React.TouchEvent<HTMLButtonElement>) => {
    const start = swipeStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch) return;

    swipeDeltaRef.current = {
      x: touch.clientX - start.x,
      y: touch.clientY - start.y,
    };
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    const { x, y } = swipeDeltaRef.current;
    resetSwipe();

    if (x >= SWIPE_CLOSE_THRESHOLD_PX && Math.abs(x) > Math.abs(y)) {
      onClose();
    }
  }, [onClose, resetSwipe]);

  if (typeof document === "undefined") return null;

  const openTrigger = (
    <div className={`fixed right-2 z-[1750] -translate-y-1/2 ${closedTopClassName}`}>
      <button
        type="button"
        aria-label={openAriaLabel}
        onClick={onOpen}
        className="inline-flex h-10 w-[7rem] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-300/36 bg-[linear-gradient(180deg,rgba(8,20,34,0.9),rgba(4,10,22,0.96))] px-2.5 text-sm font-semibold text-cyan-50 shadow-[0_10px_28px_-18px_rgba(34,211,238,0.72)] backdrop-blur-md transition hover:border-cyan-200/58"
      >
        {openIcon}
        {progressLabel ? (
          <span className="inline-flex min-w-[3.5rem] shrink-0 items-center justify-center px-1 text-[10px] font-black leading-none tabular-nums text-cyan-100">
            {progressLabel}
          </span>
        ) : null}
      </button>
    </div>
  );

  const closeHandle = (
    <div
      className="fixed top-1/2 z-[1750] -translate-y-1/2"
      style={{
        left: `max(2px, calc(100vw - ${drawerWidthCss} - ${TAB_W}px + 8px))`,
      }}
    >
      <button
        type="button"
        aria-label={closeAriaLabel}
        onClick={onClose}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetSwipe}
        style={{ width: TAB_W, touchAction: "pan-y" }}
        className={[
          "group relative flex h-16 cursor-pointer items-center justify-center",
          "rounded-l-[12px] rounded-r-none",
          "bg-[linear-gradient(to_right,rgba(3,7,16,0.98),rgba(8,15,28,0.95))]",
          "backdrop-blur-md",
          "border border-r-0 border-slate-600/40",
          "shadow-[-5px_0_18px_-4px_rgba(34,211,238,0.18)]",
          "text-slate-400 transition-all duration-150",
          "hover:border-cyan-400/35 hover:text-cyan-300",
          "hover:shadow-[-6px_0_22px_-4px_rgba(34,211,238,0.28)]",
          "active:scale-95",
        ].join(" ")}
      >
        <span className="pointer-events-none flex h-10 w-3 flex-col items-center justify-center gap-1.5">
          <span className="block h-1 w-1 rounded-full bg-current opacity-55 transition-opacity duration-150 group-hover:opacity-90" />
          <span className="block h-4 w-[2px] rounded-full bg-current opacity-75 transition-[height,opacity] duration-150 group-hover:h-5 group-hover:opacity-100" />
          <span className="block h-1 w-1 rounded-full bg-current opacity-55 transition-opacity duration-150 group-hover:opacity-90" />
        </span>
      </button>
    </div>
  );

  return createPortal(open ? closeHandle : openTrigger, document.body);
};

export default MobileDrawerEdgeControls;
