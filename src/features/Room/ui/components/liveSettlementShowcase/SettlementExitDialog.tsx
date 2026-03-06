import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

interface SettlementExitDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

const SettlementExitDialog: React.FC<SettlementExitDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="xs"
    PaperProps={{
      sx: {
        background:
          "linear-gradient(180deg, rgba(10,16,28,0.96), rgba(6,10,18,0.98))",
        border: "1px solid rgba(56, 189, 248, 0.34)",
        color: "#f8fafc",
      },
    }}
  >
    <DialogTitle className="!font-black !text-slate-50">要離開結算畫面嗎？</DialogTitle>
    <DialogContent>
      <p className="text-sm font-semibold text-slate-200">
        離開後會回到房間大廳，仍可從歷史紀錄再次開啟本場結算。
      </p>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="inherit">
        取消
      </Button>
      <Button
        color="error"
        variant="contained"
        onClick={() => {
          onClose();
          onConfirm?.();
        }}
      >
        離開
      </Button>
    </DialogActions>
  </Dialog>
);

export default SettlementExitDialog;
