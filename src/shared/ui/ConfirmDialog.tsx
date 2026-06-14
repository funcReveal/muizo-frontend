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
  "& .MuiBackdrop-root": {
    background:
      "radial-gradient(circle at 50% 8%, rgba(45, 212, 191, 0.16), transparent 34%), radial-gradient(circle at 20% 86%, rgba(251, 191, 36, 0.08), transparent 34%), rgba(2, 6, 23, 0.7)",
    backdropFilter: "blur(14px) saturate(1.12)",
  },
  "& .MuiDialog-paper": {
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.115), rgba(255,255,255,0.024) 42%, rgba(94,234,212,0.05)), radial-gradient(320px 180px at 100% 0%, rgba(45,212,191,0.13), transparent 72%), rgba(5,8,12,0.82)",
    color: "oklch(94% 0.012 86)",
    border: "1px solid rgba(226, 232, 240, 0.18)",
    borderRadius: "24px",
    boxShadow:
      "0 32px 90px -46px rgba(0,0,0,0.94), inset 0 1px 0 rgba(255,255,255,0.17), inset 0 0 0 1px rgba(255,255,255,0.035)",
    backdropFilter: "blur(24px) saturate(1.18)",
  },
  "& .MuiDialog-paper::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "linear-gradient(115deg, transparent 0 18%, rgba(255,255,255,0.11) 22%, transparent 34%), radial-gradient(180px 220px at 100% 36%, rgba(94,234,212,0.08), transparent 76%)",
  },
  "& .MuiDialogTitle-root, & .MuiDialogContent-root, & .MuiDialogActions-root": {
    position: "relative",
    zIndex: 1,
  },
  "& .MuiDialogTitle-root": {
    padding: "24px 24px 10px",
    color: "rgba(248, 250, 252, 0.96)",
    fontFamily: '"OpenHuninn", "Noto Sans TC", sans-serif',
    fontSize: "1.18rem",
    fontWeight: 900,
    letterSpacing: 0,
  },
  "& .MuiDialogContent-root": {
    padding: "0 24px 8px",
  },
  "& .MuiDialogActions-root": {
    padding: "12px 24px 24px",
    gap: "10px",
  },
  "& .MuiButton-root": {
    minHeight: "42px",
    borderRadius: "999px",
    paddingInline: "18px",
    textTransform: "none",
    fontWeight: 900,
  },
  "& .MuiButton-outlined": {
    borderColor: "rgba(226, 232, 240, 0.16)",
    color: "rgba(226, 232, 240, 0.9)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025)), rgba(226,232,240,0.04)",
  },
  "& .MuiButton-outlined:hover": {
    borderColor: "rgba(94, 234, 212, 0.42)",
    backgroundColor: "rgba(226, 232, 240, 0.07)",
  },
  "& .MuiButton-contained": {
    background:
      "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.3), transparent 48%), linear-gradient(180deg, oklch(80% 0.135 162), oklch(77% 0.145 162))",
    color: "oklch(14% 0.02 205)",
    boxShadow:
      "0 18px 34px -26px rgba(45,212,191,0.8), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(6,78,59,0.32)",
  },
  "& .MuiButton-contained:hover": {
    filter: "brightness(1.04)",
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
  onExited?: () => void;
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
    onExited,
  }) => (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      sx={CONFIRM_DIALOG_SX}
      slotProps={{
        transition: {
          onExited,
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText className="!text-[14px] !font-semibold !leading-relaxed !text-slate-300">
          {description}
        </DialogContentText>
        {extraContent}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  ),
);

export default ConfirmDialog;
