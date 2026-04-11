import React from "react";
import { createPortal } from "react-dom";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

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

// Tab width in px — must match the w-7 (28px) on the button below
const TAB_W = 28;

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
  if (typeof document === "undefined") return null;

  // Floating pill that appears when drawer is closed
  const openTrigger = (
    <div
      className={`fixed right-2 z-[1750] -translate-y-1/2 ${closedTopClassName}`}
    >
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

  // Handle tab that hugs the left edge of the drawer
  // left: max(4px, drawerLeftEdge - TAB_W) ensures tab never clips off screen
  const closeHandle = (
    <div
      className="fixed top-1/2 z-[1750] -translate-y-1/2"
      style={{
        left: `max(4px, calc(100vw - ${drawerWidthCss} - ${TAB_W}px))`,
      }}
    >
      <button
        type="button"
        aria-label={closeAriaLabel}
        onClick={onClose}
        style={{ width: TAB_W }}
        className={[
          // shape — left corners rounded, right edge flat (merges with drawer)
          "group relative flex h-14 cursor-pointer flex-col items-center justify-center gap-[5px]",
          "rounded-l-[10px] rounded-r-none",
          // background matches drawer: dark glass, gradient goes lighter→ toward drawer
          "bg-[linear-gradient(to_right,rgba(3,7,16,0.98),rgba(8,15,28,0.95))]",
          "backdrop-blur-md",
          // border: left/top/bottom only, no right (seamless join with drawer)
          "border border-r-0 border-slate-600/40",
          // subtle left-edge glow
          "shadow-[-5px_0_18px_-4px_rgba(34,211,238,0.18)]",
          // text & transitions
          "text-slate-400 transition-all duration-150",
          "hover:border-cyan-400/35 hover:text-cyan-300",
          "hover:shadow-[-6px_0_22px_-4px_rgba(34,211,238,0.28)]",
          "active:scale-95",
        ].join(" ")}
      >
        {/* grip mark — top dash */}
        <span className="block h-px w-3 rounded-full bg-current opacity-50 transition-opacity duration-150 group-hover:opacity-80" />

        {/* chevron points right = collapse / dismiss drawer */}
        <ChevronRightRoundedIcon
          className="text-[1rem] transition-transform duration-150 group-hover:translate-x-0.5"
        />

        {/* grip mark — bottom dash */}
        <span className="block h-px w-3 rounded-full bg-current opacity-50 transition-opacity duration-150 group-hover:opacity-80" />
      </button>
    </div>
  );

  return createPortal(open ? closeHandle : openTrigger, document.body);
};

export default MobileDrawerEdgeControls;
