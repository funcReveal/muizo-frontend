import React from "react";
import { Button } from "@mui/material";

interface SettlementMobileFooterProps {
  onGoPrevStep: () => void;
  onGoNextStep: () => void;
  onOpenExitConfirm?: () => void;
  canGoPrev: boolean;
  hasNextStep: boolean;
  canFinish: boolean;
}

const SettlementMobileFooter: React.FC<SettlementMobileFooterProps> = ({
  onGoPrevStep,
  onGoNextStep,
  onOpenExitConfirm,
  canGoPrev,
  hasNextStep,
  canFinish,
}) => {
  const [dockSide, setDockSide] = React.useState<"top" | "bottom">("bottom");
  const [dockVisible, setDockVisible] = React.useState(true);
  const lastScrollYRef = React.useRef(0);
  const revealTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      if (Math.abs(delta) < 4) return;
      setDockSide(delta > 0 ? "bottom" : "top");
      setDockVisible(false);
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
      revealTimerRef.current = window.setTimeout(() => {
        setDockVisible(true);
        revealTimerRef.current = null;
      }, 160);
      lastScrollYRef.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={`game-settlement-mobile-footer game-settlement-mobile-footer--${dockSide} ${
        dockVisible ? "" : "game-settlement-mobile-footer--hidden"
      } fixed inset-x-0 z-[1600] border-t border-slate-700/70 bg-slate-950/92 px-2 backdrop-blur lg:hidden`}
    >
      <div
        className={`mx-auto flex w-full max-w-6xl items-center gap-2 ${
          dockSide === "top"
            ? "pb-2 pt-[calc(env(safe-area-inset-top)+0.4rem)]"
            : "py-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]"
        }`}
      >
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={onGoPrevStep}
          disabled={!canGoPrev}
          className="!min-w-0 !flex-1"
        >
          上一步
        </Button>
        {hasNextStep ? (
          <Button
            variant="contained"
            color="warning"
            size="small"
            onClick={onGoNextStep}
            className="!min-w-0 !flex-[1.1]"
          >
            下一步
          </Button>
        ) : canFinish ? (
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={onGoNextStep}
            className="!min-w-0 !flex-[1.1]"
          >
            完成結算
          </Button>
        ) : onOpenExitConfirm ? (
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={onOpenExitConfirm}
            className="!min-w-0 !flex-[1.1]"
          >
            離開房間
          </Button>
        ) : (
          <Button
            variant="contained"
            color="inherit"
            size="small"
            disabled
            className="!min-w-0 !flex-[1.1]"
          >
            等待房主
          </Button>
        )}
        {onOpenExitConfirm && hasNextStep && (
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={onOpenExitConfirm}
            className="!min-w-[84px] !shrink-0"
          >
            離開
          </Button>
        )}
      </div>
    </div>
  );
};

export default SettlementMobileFooter;
