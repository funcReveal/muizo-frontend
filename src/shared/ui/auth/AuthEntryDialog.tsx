import React from "react";
import { createPortal } from "react-dom";

import AuthEntryPanel, { type AuthEntryPanelProps } from "./AuthEntryPanel";

interface AuthEntryDialogProps extends AuthEntryPanelProps {
  open: boolean;
  onClose: () => void;
}

const AuthEntryDialog: React.FC<AuthEntryDialogProps> = ({
  open,
  onClose,
  onLoginSuccess,
  ...panelProps
}) => {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="auth-entry-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="auth-entry-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="登入或註冊 Muizo"
      >
        <button
          type="button"
          className="auth-entry-dialog-close"
          aria-label="關閉"
          onClick={onClose}
        >
          ✕
        </button>
        <AuthEntryPanel
          {...panelProps}
          onLoginSuccess={() => {
            onLoginSuccess?.();
            onClose();
          }}
        />
      </section>
    </div>,
    document.body,
  );
};

export default AuthEntryDialog;
