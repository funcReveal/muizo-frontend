import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

type GameRoomExitDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const EXIT_DIALOG_PAPER_PROPS = {
  sx: {
    background:
      "linear-gradient(180deg, rgba(10,16,28,0.96), rgba(6,10,18,0.98))",
    border: "1px solid rgba(248, 113, 113, 0.38)",
    color: "#f8fafc",
  },
} as const;

const GameRoomExitDialog: React.FC<GameRoomExitDialogProps> = React.memo(
  ({ open, onCancel, onConfirm }) => (
  <Dialog
    open={open}
    onClose={onCancel}
    fullWidth
    maxWidth="xs"
    PaperProps={EXIT_DIALOG_PAPER_PROPS}
  >
    <DialogTitle className="!font-black !text-slate-50">要離開對戰嗎？</DialogTitle>
    <DialogContent>
      <Typography variant="body2" className="!font-semibold !text-slate-200">
        你將離開目前房間並中止這場對戰，確定要繼續嗎？
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} variant="text" color="inherit">
        取消
      </Button>
      <Button onClick={onConfirm} variant="contained" color="error">
        離開
      </Button>
    </DialogActions>
  </Dialog>
  ),
);

export default GameRoomExitDialog;
