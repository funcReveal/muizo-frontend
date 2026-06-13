import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeRounded,
  LibraryMusic,
  MeetingRoomRounded,
  NavigateNextRounded,
  PersonOutline,
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
  currentBreadcrumbLabel,
  compact = false,
  onLoginSuccess,
  secondaryAction = { label: "房間大廳", to: "/rooms" },
}) => {
  const location = useLocation();
  const {
    authLoading,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    requestPasswordReset,
    resendEmailVerification,
  } = useAuth();
  const breadcrumbCurrentLabel = currentBreadcrumbLabel ?? title;

  const handleGoogleLogin = () => {
    storeCurrentRouteAsAuthTarget(
      `${location.pathname}${location.search}${location.hash}`,
    );
    loginWithGoogle();
  };

  const contextContent = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="inline-flex shrink-0 items-center justify-center text-teal-100"
          aria-hidden="true"
        >
          {featureIcon}
        </span>
        <h2 className="max-w-[16ch] text-xl font-black leading-[1.08] tracking-[-0.01em] text-slate-50 sm:max-w-[13ch] sm:text-4xl">
          {title}
        </h2>
      </div>

      <p className="mt-2 max-w-[58ch] text-[13px] leading-5 text-slate-300/82 sm:mt-4 sm:text-sm sm:leading-6">
        {description}
      </p>
    </>
  );

  const breadcrumbs = (
    <nav
      aria-label="登入頁導覽"
      className="mb-3 flex min-w-0 items-center gap-1 overflow-x-auto px-1 text-xs font-bold text-slate-400 sm:mb-4 sm:text-sm"
    >
      <Link
        to="/"
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 transition hover:bg-white/[0.045] hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-white/12"
      >
        <HomeRounded sx={{ fontSize: 16 }} />
        首頁
      </Link>
      {secondaryAction ? (
        <>
          <NavigateNextRounded
            className="shrink-0 text-slate-600"
            sx={{ fontSize: 17 }}
          />
          <Link
            to={secondaryAction.to}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 transition hover:bg-white/[0.045] hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-200/24"
          >
            {secondaryAction.icon ?? <MeetingRoomRounded sx={{ fontSize: 16 }} />}
            {secondaryAction.label}
          </Link>
        </>
      ) : null}
      <NavigateNextRounded
        className="shrink-0 text-slate-600"
        sx={{ fontSize: 17 }}
      />
      <span className="truncate px-1 text-slate-200">
        {breadcrumbCurrentLabel}
      </span>
    </nav>
  );

  return (
    <section
      className={`relative mx-auto w-full overflow-hidden text-[var(--mc-text)] ${
        compact
          ? "max-w-[520px]"
          : "max-w-5xl rounded-[22px] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.018)_44%),radial-gradient(520px_280px_at_10%_0%,rgba(45,212,191,0.1),transparent_68%),rgba(5,8,12,0.68)] shadow-[0_30px_90px_-64px_rgba(0,0,0,0.92)] backdrop-blur-xl sm:rounded-[28px]"
      }`}
    >
      {!compact ? (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0_20%,rgba(255,255,255,0.065)_24%,transparent_38%)] opacity-60" />
      ) : null}
      <div
        className={`relative grid min-w-0 ${
          compact
            ? "gap-0"
            : "gap-3 p-0 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,430px)]"
        }`}
      >
        {!compact ? <div className="lg:col-span-2">{breadcrumbs}</div> : null}

        {!compact ? (
          <div className="relative hidden min-w-0 rounded-[22px] bg-slate-950/24 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] sm:block">
            {contextContent}

            <div className="mt-8 flex items-center gap-3 rounded-[18px] bg-amber-200/8 px-4 py-3 ring-1 ring-amber-200/12">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-amber-200/10 text-amber-100 ring-1 ring-amber-200/16">
                <PersonOutline sx={{ fontSize: 22 }} />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-black tracking-[0.14em] text-slate-400">
                  目前狀態
                </div>
                <div className="mt-0.5 text-sm font-bold text-amber-100">
                  尚未登入
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="auth-required-form-card min-w-0 rounded-[22px] bg-slate-950/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_50px_-40px_rgba(45,212,191,0.5)] ring-1 ring-white/10 sm:p-6">
          {compact ? breadcrumbs : null}

          <div className={`${compact ? "" : "sm:hidden"} mb-4`}>
            {contextContent}
          </div>

          <div className="mb-4 hidden items-center gap-2 text-xs font-black tracking-[0.14em] text-slate-400 sm:inline-flex">
            <LibraryMusic sx={{ fontSize: 16 }} />
            MUIZO ACCOUNT
          </div>
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
