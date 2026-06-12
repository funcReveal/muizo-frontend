import React from "react";
import { createPortal } from "react-dom";

import AuthEntryPanel, { type AuthEntryPanelProps } from "./AuthEntryPanel";

export interface AuthFeaturePreview {
  eyebrow: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  accentColor?: string;
  actionLabel?: string;
}

interface AuthEntryDialogProps extends AuthEntryPanelProps {
  open: boolean;
  onClose: () => void;
  featurePreview?: AuthFeaturePreview | null;
}

const AuthEntryDialog: React.FC<AuthEntryDialogProps> = ({
  open,
  onClose,
  onLoginSuccess,
  featurePreview,
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
        className={`auth-entry-dialog ${
          featurePreview ? "auth-entry-dialog-with-feature" : ""
        }`}
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
        {featurePreview ? (
          <aside
            className="auth-entry-feature-card"
            style={
              {
                "--auth-feature-accent":
                  featurePreview.accentColor ?? "rgba(94, 234, 212, 0.95)",
              } as React.CSSProperties
            }
          >
            <div className="auth-entry-feature-orbit" aria-hidden="true" />
            <div className="auth-entry-feature-kicker">
              {featurePreview.icon ? (
                <span className="auth-entry-feature-icon">
                  {featurePreview.icon}
                </span>
              ) : null}
              <span>{featurePreview.eyebrow}</span>
            </div>
            <div>
              <h3>{featurePreview.title}</h3>
              <p>{featurePreview.description}</p>
            </div>
            <div className="auth-entry-feature-footer">
              <span>登入後會自動前往</span>
              <strong>{featurePreview.actionLabel ?? "繼續"}</strong>
            </div>
          </aside>
        ) : null}
        <div className="auth-entry-dialog-panel">
          <AuthEntryPanel
            {...panelProps}
            onLoginSuccess={() => {
              onLoginSuccess?.();
              onClose();
            }}
          />
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default AuthEntryDialog;
