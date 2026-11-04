import React, { useId, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grow,
} from "@mui/material";
import { useReducedMotion } from "motion/react";

const CONFIRM_DIALOG_SX = {
  zIndex: 1800,
  "& .MuiBackdrop-root": {
    background: "rgba(7, 9, 7, 0.66)",
    backdropFilter: "blur(4px)",
  },
  "& .MuiDialog-paper": {
    width: "calc(100% - 32px)",
    maxWidth: 400,
    margin: "16px",
    overflow: "hidden",
    background: "var(--mc-surface)",
    color: "var(--mc-text)",
    border: "1px solid var(--mc-border)",
    borderRadius: "20px",
    boxShadow: "0 20px 64px rgba(5, 8, 5, 0.4)",
    fontFamily: '"OpenHuninn", "Noto Sans TC", sans-serif',
  },
  "& .MuiDialogTitle-root": {
    padding: "24px 24px 10px",
    fontFamily: "inherit",
    fontSize: "20px",
    lineHeight: 1.5,
    fontWeight: 600,
  },
  "& .MuiDialogContent-root": { padding: "0 24px 24px" },
  "& .MuiDialogContentText-root": {
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: 1.8,
    fontWeight: 400,
    color: "var(--mc-text-muted)",
  },
  "& .MuiDialogActions-root": {
    padding: "0 24px 24px",
    gap: "10px",
    "& > :not(style) ~ :not(style)": { marginLeft: 0 },
  },
  "& .MuiButton-root": {
    flex: 1,
    minHeight: "46px",
    borderRadius: "10px",
    paddingInline: "16px",
    textTransform: "none",
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: 600,
    boxShadow: "none",
  },
  "& .MuiButton-outlined": {
    borderColor: "var(--mc-border)",
    color: "var(--mc-text)",
    background: "var(--mc-surface-strong)",
    "&:hover": {
      background:
        "color-mix(in srgb, var(--mc-surface-strong) 90%, var(--mc-text))",
      borderColor: "var(--mc-border)",
    },
  },
  "& .MuiButton-contained": {
    background: "var(--mc-accent)",
    color: "var(--mc-accent-ink)",
    "&:hover": { background: "var(--mc-accent-hover)", boxShadow: "none" },
    "&:active": { background: "var(--mc-accent-pressed)" },
  },
  '& .MuiButton-contained[data-destructive="true"]': {
    background: "#d9655c",
    color: "#fff5ef",
    "&:hover": { background: "#e5756c" },
    "&:active": { background: "#c95750" },
  },
  "& .MuiButton-root:focus-visible": {
    outline: "2px solid var(--mc-accent)",
    outlineOffset: "3px",
  },
} as const;

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: ReactNode;
  extraContent?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  onExited?: () => void;
  destructive?: boolean;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = React.memo(
  function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "確認",
    cancelLabel = "取消",
    icon,
    extraContent,
    destructive = false,
    onConfirm,
    onCancel,
    onExited,
  }) {
    const id = useId();
    const reduceMotion = useReducedMotion();
    return (
      <Dialog
        open={open}
        onClose={onCancel}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        maxWidth="xs"
        fullWidth
        sx={CONFIRM_DIALOG_SX}
        slots={{ transition: Grow }}
        transitionDuration={reduceMotion ? 0 : { enter: 180, exit: 120 }}
        slotProps={{
          transition: {
            onExited,
            easing: {
              enter: "cubic-bezier(0.16, 1, 0.3, 1)",
              exit: "cubic-bezier(0.4, 0, 1, 1)",
            },
          },
        }}
      >
        {icon && (
          <div
            aria-hidden="true"
            style={{
              display: "grid",
              placeItems: "center",
              width: 44,
              height: 44,
              margin: "24px 24px 0",
              borderRadius: 12,
              background: "var(--mc-surface-strong)",
              color: "var(--mc-accent)",
            }}
          >
            {icon}
          </div>
        )}
        <DialogTitle
          id={`${id}-title`}
          sx={icon ? { "&&": { paddingTop: "16px" } } : undefined}
        >
          {title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id={`${id}-description`}>
            {description}
          </DialogContentText>
          {extraContent}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" disableRipple autoFocus onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant="contained"
            data-destructive={destructive}
            disableRipple
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

export default ConfirmDialog;
