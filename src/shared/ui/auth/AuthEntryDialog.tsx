import React from "react";
import { Dialog } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";

import AuthEntryPanel, { type AuthEntryPanelProps } from "./AuthEntryPanel";

export interface AuthFeaturePreview {
  kind: "rooms" | "collections" | "career" | "favorites" | "youtube" | "personal";
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      className="auth-entry-modal"
      aria-label="登入或註冊 Muizo"
      slotProps={{
        paper: { className: `auth-entry-dialog ${featurePreview ? "auth-entry-dialog-with-feature" : ""}` },
        backdrop: { className: "auth-entry-modal-backdrop" },
      }}
    >
        <button
          type="button"
          className="auth-entry-dialog-close"
          aria-label="關閉"
          onClick={onClose}
        >
          <CloseRounded fontSize="small" />
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
            <div className="auth-entry-feature-kicker">
              {featurePreview.icon ? (
                <span className="auth-entry-feature-icon">
                  {featurePreview.icon}
                </span>
              ) : null}
              <span>{featurePreview.eyebrow}</span>
            </div>
            <div className="auth-entry-feature-media" aria-hidden="true">
              <img src={`/feature-previews/${featurePreview.kind}.png`} alt="" />
            </div>
            <div className="auth-entry-feature-copy">
              <h3>{featurePreview.title}</h3>
              <p>{featurePreview.description}</p>
            </div>
            <div className="auth-entry-feature-footer">
              <span>登入後繼續</span>
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
    </Dialog>
  );
};

export default AuthEntryDialog;
