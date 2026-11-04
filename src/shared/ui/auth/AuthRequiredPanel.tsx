import React from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import {
  ArrowBackRounded,
  LibraryMusic,
} from "@mui/icons-material";

import { useAuth } from "@/shared/auth/AuthContext";
import AuthEntryPanel from "./AuthEntryPanel";

type AuthRequiredPanelProps = {
  title?: string;
  description?: string;
  featureIcon?: React.ReactNode;
  currentBreadcrumbLabel?: string;
  compact?: boolean;
  onLoginSuccess?: () => void;
  secondaryAction?: {
    label: string;
    to: string;
    icon?: React.ReactNode;
  } | null;
};

const AUTH_REDIRECT_TARGET_KEY = "muizo_auth_redirect_target";

const storeCurrentRouteAsAuthTarget = (target: string) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_REDIRECT_TARGET_KEY, target);
};

const AuthRequiredPanel: React.FC<AuthRequiredPanelProps> = ({
  title = "此頁面需先登入",
  description = "登入或建立帳號後，即可繼續使用這個功能。",
  featureIcon = <LibraryMusic sx={{ fontSize: 22 }} />,
  compact = false,
  onLoginSuccess,
  secondaryAction,
}) => {
  const location = useLocation();
  const source = useOutletContext<{authReturnTo?: string | null} | null>();
  const {
    authLoading,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    requestPasswordReset,
    resendEmailVerification,
  } = useAuth();
  const returnLabels: Record<string, string> = {
    "/": "回到首頁",
    "/rooms": "返回大廳",
    "/collections": "返回題庫",
    "/career": "返回生涯紀錄",
    "/me/favorites": "返回收藏歌曲",
  };
  const sourcePath = source?.authReturnTo;
  const returnPath = secondaryAction?.to ?? (
    sourcePath && sourcePath !== location.pathname && returnLabels[sourcePath] ? sourcePath : "/"
  );
  const returnLabel = returnLabels[returnPath] ?? (secondaryAction ? `返回${secondaryAction.label}` : "回到首頁");

  const handleGoogleLogin = () => {
    storeCurrentRouteAsAuthTarget(
      `${location.pathname}${location.search}${location.hash}`,
    );
    loginWithGoogle();
  };

  return (
    <section className={`auth-required-page ${compact ? "is-compact" : ""}`}>
      <Link to={returnPath} className="auth-required-return">
        <ArrowBackRounded aria-hidden="true" />{returnLabel}
      </Link>
      <div className="auth-required-layout">
        <div className="auth-required-context">
          <span className="auth-required-feature" aria-hidden="true">{featureIcon}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="auth-required-form-card">
          <AuthEntryPanel
            onGoogleLogin={handleGoogleLogin}
            onEmailLogin={loginWithEmail}
            onEmailRegister={registerWithEmail}
            onPasswordResetRequest={requestPasswordReset}
            onResendVerification={resendEmailVerification}
            authLoading={authLoading}
            onLoginSuccess={onLoginSuccess}
          />
        </div>
      </div>
    </section>
  );
};

export default AuthRequiredPanel;
