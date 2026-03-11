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
  return (
    <div
      className="game-settlement-mobile-footer game-settlement-mobile-footer--bottom fixed inset-x-0 z-[1600] border-t border-slate-700/70 bg-slate-950/95 px-2 lg:hidden"
    >
      <div
        className="mx-auto flex w-full max-w-6xl items-center gap-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]"
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
            暫無操作
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

export default React.memo(SettlementMobileFooter);
