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
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
    <DialogTitle>確認離開房間？</DialogTitle>
    <DialogContent>
      <p className="text-sm text-slate-700">
        離開後會中斷目前結算導覽，並返回房間外。
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
        確認離開
      </Button>
    </DialogActions>
  </Dialog>
);

export default SettlementExitDialog;
