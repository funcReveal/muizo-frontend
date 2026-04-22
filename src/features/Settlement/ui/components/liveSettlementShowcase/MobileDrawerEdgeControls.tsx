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
  // Anchor to the bottom of the screen, flush against the top of the fixed
  // settlement footer (`上一步 / 下一步`). The footer's safe-area padding is
  // `env(safe-area-inset-bottom) + 0.42rem` plus the button row (~2.6rem), so
  // the trigger sits right above it.
  closedTopClassName = "bottom-[calc(env(safe-area-inset-bottom)+4rem)]",
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
    // Icon-only trigger parked directly above the fixed bottom toolbar
    // (上一步 / 下一步). No pulse, no glow — just a small cyan tab that's
    // easy to notice because it sits in the natural thumb zone next to the
    // action buttons.
    <div className={`fixed right-[5px] z-[1750] ${closedTopClassName}`}>
      <button
        type="button"
        aria-label={
          progressLabel ? `${openAriaLabel}（${progressLabel}）` : openAriaLabel
        }
        onClick={onOpen}
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[14px] border border-cyan-300/35 bg-[linear-gradient(180deg,rgba(8,20,34,0.88),rgba(4,10,22,0.94))] text-cyan-100 shadow-[0_8px_20px_-14px_rgba(34,211,238,0.6)] backdrop-blur-[3px] transition hover:border-cyan-200/70 hover:text-cyan-50 active:scale-95"
      >
        {openIcon}
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
