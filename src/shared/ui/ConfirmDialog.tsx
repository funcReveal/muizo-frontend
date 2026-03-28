import React, { type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

const CONFIRM_DIALOG_SX = {
  "& .MuiDialog-paper": {
    background:
      "linear-gradient(180deg, rgba(10,16,28,0.96), rgba(6,10,18,0.98))",
    color: "#f8fafc",
    border: "1px solid rgba(125, 211, 252, 0.28)",
    borderRadius: "1rem",
    boxShadow:
      "0 28px 80px -36px rgba(2,6,23,0.92), 0 0 0 1px rgba(56,189,248,0.12)",
  },
} as const;

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  extraContent?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = React.memo(
  ({
    open,
    title,
    description,
    confirmLabel = "確認",
    cancelLabel = "取消",
    extraContent,
    onConfirm,
    onCancel,
  }) => (
  <Dialog
    open={open}
    onClose={onCancel}
    maxWidth="xs"
    fullWidth
    sx={CONFIRM_DIALOG_SX}
  >
    <DialogTitle className="!font-black !text-slate-50">{title}</DialogTitle>
    <DialogContent>
      <DialogContentText className="!text-[15px] !font-semibold !leading-relaxed !text-slate-200">
        {description}
      </DialogContentText>
      {extraContent}
    </DialogContent>
    <DialogActions className="px-6 pb-5">
      <Button
        variant="outlined"
        onClick={onCancel}
        className="!border-[var(--mc-border)] !text-[var(--mc-text)] hover:!border-[var(--mc-accent)]/60"
      >
        {cancelLabel}
      </Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        className="!bg-[var(--mc-accent)]/80 !text-[var(--mc-text)] hover:!bg-[var(--mc-accent)]"
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
  ),
);

export default ConfirmDialog;
