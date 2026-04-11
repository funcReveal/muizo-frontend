import React from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
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
        className="mx-auto flex w-full max-w-6xl items-center gap-2 py-1.5 pb-[calc(env(safe-area-inset-bottom)+0.42rem)]"
      >
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={onGoPrevStep}
          disabled={!canGoPrev}
          className="game-settlement-mobile-footer__btn game-settlement-mobile-footer__btn--ghost !min-w-0 !flex-1"
          startIcon={<ArrowBackRoundedIcon fontSize="small" />}
        >
          上一步
        </Button>
        {hasNextStep ? (
          <Button
            variant="contained"
            color="warning"
            size="small"
            onClick={onGoNextStep}
            className="game-settlement-mobile-footer__btn game-settlement-mobile-footer__btn--next !min-w-0 !flex-[1.1]"
            endIcon={<ArrowForwardRoundedIcon fontSize="small" />}
          >
            下一步
          </Button>
        ) : canFinish ? (
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={onGoNextStep}
            className="game-settlement-mobile-footer__btn game-settlement-mobile-footer__btn--finish !min-w-0 !flex-[1.1]"
            endIcon={<CheckRoundedIcon fontSize="small" />}
          >
            完成結算
          </Button>
        ) : onOpenExitConfirm ? (
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={onOpenExitConfirm}
            className="game-settlement-mobile-footer__btn game-settlement-mobile-footer__btn--exit !min-w-0 !flex-[1.1]"
            startIcon={<LogoutRoundedIcon fontSize="small" />}
          >
            離開房間
          </Button>
        ) : (
          <Button
            variant="contained"
            color="inherit"
            size="small"
            disabled
            className="game-settlement-mobile-footer__btn game-settlement-mobile-footer__btn--disabled !min-w-0 !flex-[1.1]"
          >
            稍後可用
          </Button>
        )}
        {onOpenExitConfirm && hasNextStep && (
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={onOpenExitConfirm}
            className="game-settlement-mobile-footer__btn game-settlement-mobile-footer__btn--exit !min-w-[84px] !shrink-0"
            startIcon={<LogoutRoundedIcon fontSize="small" />}
          >
            離開
          </Button>
        )}
      </div>
    </div>
  );
};

export default React.memo(SettlementMobileFooter);
