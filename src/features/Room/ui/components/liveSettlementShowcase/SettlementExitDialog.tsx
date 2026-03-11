import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

interface SettlementExitDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const SettlementExitDialog: React.FC<SettlementExitDialogProps> = ({
  open,
  onCancel,
  onConfirm,
}) => (
  <Dialog
    open={open}
    onClose={onCancel}
    fullWidth
    maxWidth="xs"
    PaperProps={{
      sx: {
        borderRadius: 3,
        border: "1px solid rgba(56, 189, 248, 0.32)",
        color: "#f8fafc",
        background:
          "radial-gradient(900px 420px at -8% -18%, rgba(56,189,248,0.20), transparent 62%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.92))",
        boxShadow:
          "0 34px 88px -44px rgba(2,6,23,0.95), 0 0 0 1px rgba(255,255,255,0.03)",
      },
    }}
  >
    <DialogTitle className="!pb-2 !text-base !font-extrabold !text-slate-50">
      要離開房間嗎？
    </DialogTitle>
    <DialogContent className="!pt-0">
      <Typography variant="body2" className="text-slate-100">
        離開後會返回房間列表；若要再次加入，請重新使用邀請連結。
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} variant="text">
        取消
      </Button>
      <Button color="warning" variant="contained" onClick={onConfirm}>
        確認
      </Button>
    </DialogActions>
  </Dialog>
);

export default SettlementExitDialog;
