import React, { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useNavigate } from "react-router-dom";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import "./authEntry.css";

export type AuthEntryMode = "login" | "register";

const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com.tw", "yahoo.com", "icloud.com"];

export interface AuthEntryPanelProps {
  onGoogleLogin: () => void;
  onEmailLogin: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onEmailRegister: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onPasswordResetRequest: (email: string) => Promise<boolean>;
  onResendVerification: (email: string) => Promise<boolean>;
  authLoading: boolean;
  initialMode?: AuthEntryMode;
  onLoginSuccess?: () => void;
  emailOnly?: boolean;
}

const AuthEntryPanel: React.FC<AuthEntryPanelProps> = ({
  onGoogleLogin,
  onEmailLogin,
  onEmailRegister,
  onPasswordResetRequest,
  onResendVerification,
  authLoading,
  initialMode = "login",
  onLoginSuccess,
  emailOnly = false,
}) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [mode, setMode] = useState<AuthEntryMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formMessageOk, setFormMessageOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [registerSucceeded, setRegisterSucceeded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailSuggestionsId = useId();
  const [emailName, emailDomain = ""] = email.trim().split("@");
  const emailSuggestions = emailName && !/\s/.test(email) && email.split("@").length <= 2
    ? EMAIL_DOMAINS.filter((domain) => domain.startsWith(emailDomain.toLowerCase()))
      .map((domain) => `${emailName}@${domain}`)
      .filter((suggestion) => suggestion !== email.trim())
    : [];

  const isRegister = mode === "register";
  const busy = authLoading || submitting;

  const switchMode = (nextMode: AuthEntryMode) => {
    setMode(nextMode);
    setFormMessage(null);
    setFormMessageOk(false);
    setResetSent(false);
    setRegisterSucceeded(false);
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setFormMessage("請輸入 email 與密碼");
      setFormMessageOk(false);
      return;
    }

    if (isRegister && password.length < 8) {
      setFormMessage("密碼至少需要 8 個字元");
      setFormMessageOk(false);
      return;
    }

    setFormMessage(null);
    setSubmitting(true);

    try {
      const result = isRegister
        ? await onEmailRegister(normalizedEmail, password)
        : await onEmailLogin(normalizedEmail, password);

      if (!result.ok) {
        setFormMessage(result.error ?? (isRegister ? "註冊失敗" : "登入失敗"));
        setFormMessageOk(false);
        return;
      }

      if (isRegister) {
        setPassword("");
        setRegisterSucceeded(true);
        setFormMessage("帳號已建立，請到信箱完成 email 驗證。");
        setFormMessageOk(true);
        navigate(
          `/auth/verify-pending?email=${encodeURIComponent(normalizedEmail)}`,
        );
        return;
      }

      onLoginSuccess?.();
    } catch {
      setFormMessage("暫時無法連線，請稍後再試。");
      setFormMessageOk(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setFormMessage("請先輸入 email");
      setFormMessageOk(false);
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onPasswordResetRequest(normalizedEmail);
      setResetSent(ok);
      setFormMessage(
        ok ? "如果帳號存在，重設密碼信已寄出" : "無法寄出重設密碼信",
      );
      setFormMessageOk(ok);
    } catch {
      setFormMessage("無法寄出重設密碼信，請稍後再試。");
      setFormMessageOk(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

    setSubmitting(true);
    try {
      const ok = await onResendVerification(normalizedEmail);
      setFormMessage(ok ? "驗證信已重新寄出" : "無法寄出驗證信，請稍後再試");
      setFormMessageOk(ok);
    } catch {
      setFormMessage("無法寄出驗證信，請稍後再試。");
      setFormMessageOk(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-entry-panel" data-mode={mode}>
      {!emailOnly && <header className="auth-entry-header">
        <h2>{isRegister ? "建立 Muizo 帳號" : "登入 Muizo"}</h2>
        <p>{isRegister ? "收藏喜歡的音樂，建立自己的猜歌題庫。" : "你的題庫與遊玩紀錄，都在這裡。"}</p>
      </header>}
      <div className="auth-entry-switch-region">
        {!emailOnly && <><button type="button" onClick={onGoogleLogin} disabled={busy} className="auth-entry-google">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.36Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.41 13.93a6 6 0 0 1 0-3.86V7.48H3.07a10 10 0 0 0 0 9.04l3.34-2.59Z" />
            <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z" />
          </svg>
          {authLoading ? "連線中…" : "使用 Google 登入"}
        </button>
        <div className="auth-entry-divider">或使用 Email</div></>}
        <form className="auth-entry-form" onSubmit={handleSubmit} aria-busy={busy}>
          <label>
            <span>Email</span>
            <input type="email" autoComplete="email" list={emailSuggestionsId} autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={busy} required />
          </label>
          <datalist id={emailSuggestionsId}>
            {emailSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
          </datalist>
          {!registerSucceeded && <div className="auth-entry-password-field">
            <div className="auth-entry-field-heading">
              <label htmlFor={`${emailSuggestionsId}-password`}>密碼</label>
              {!isRegister && <button type="button" className="auth-entry-link" onClick={handlePasswordReset} disabled={busy || resetSent}>{resetSent ? "重設信已送出" : "忘記密碼？"}</button>}
            </div>
            <div className="auth-entry-password-input">
              <input id={`${emailSuggestionsId}-password`} type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "至少 8 個字元" : "輸入密碼"} disabled={busy} minLength={isRegister ? 8 : undefined} maxLength={128} required aria-describedby={isRegister ? `${emailSuggestionsId}-hint` : undefined} />
              <button type="button" aria-label={showPassword ? "隱藏密碼" : "顯示密碼"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} disabled={busy}>{showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}</button>
            </div>
            <div className="auth-entry-password-hint" id={`${emailSuggestionsId}-hint`}>
              {isRegister && <><span data-complete={password.length >= 8} />至少 8 個字元</>}
            </div>
          </div>}
          {formMessage && <motion.div initial={prefersReducedMotion ? false : {opacity: .5, y: -3}} animate={{opacity: 1, y: 0}} className={`auth-entry-message ${formMessageOk ? "is-ok" : ""}`} role={formMessageOk ? "status" : "alert"}>
            {formMessageOk ? <CheckCircleOutlineRounded /> : <ErrorOutlineRounded />}<span>{formMessage}</span>
          </motion.div>}
          {!registerSucceeded && <button type="submit" disabled={busy} className="auth-entry-submit">{busy ? "處理中…" : isRegister ? "建立帳號" : "登入"}</button>}
          {registerSucceeded && <button type="button" className="auth-entry-link" onClick={handleResendVerification} disabled={busy}>重新寄送驗證信</button>}
        </form>
      </div>
      <div className="auth-entry-mode-switch">
        <span>{isRegister ? "已經有帳號？" : "還沒有帳號？"}</span>
        <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")} disabled={busy}>{isRegister ? "登入" : "註冊"}</button>
      </div>
    </div>
  );
};

export default AuthEntryPanel;
