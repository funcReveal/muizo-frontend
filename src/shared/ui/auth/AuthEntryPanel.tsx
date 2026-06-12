import React, { useState } from "react";

export type AuthEntryMode = "login" | "register";

export interface AuthEntryPanelProps {
  onGoogleLogin: () => void;
  onEmailLogin: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onEmailRegister: (
    email: string,
    password: string,
    displayName?: string | null,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onPasswordResetRequest: (email: string) => Promise<boolean>;
  onResendVerification: (email: string) => Promise<boolean>;
  authLoading: boolean;
  initialMode?: AuthEntryMode;
  onLoginSuccess?: () => void;
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
}) => {
  const [mode, setMode] = useState<AuthEntryMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formMessageOk, setFormMessageOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [registerSucceeded, setRegisterSucceeded] = useState(false);

  const isRegister = mode === "register";
  const busy = authLoading || submitting;

  const switchMode = (nextMode: AuthEntryMode) => {
    setMode(nextMode);
    setFormMessage(null);
    setFormMessageOk(false);
    setResetSent(false);
    setRegisterSucceeded(false);
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
        ? await onEmailRegister(
            normalizedEmail,
            password,
            displayName.trim() || null,
          )
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
        return;
      }

      onLoginSuccess?.();
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-entry-panel">
      <header className="auth-entry-header">
        <div>
          <h2>{isRegister ? "建立帳號" : "登入 Muizo"}</h2>
          <p>
            {isRegister
              ? "建立帳號後即可保存題庫、戰績與跨裝置紀錄。"
              : "使用 Email 或 Google 登入，延續你的收藏與遊玩進度。"}
          </p>
        </div>
      </header>

      <div className="auth-entry-tabs" role="tablist" aria-label="登入或註冊">
        <button
          type="button"
          className={mode === "login" ? "is-active" : ""}
          onClick={() => switchMode("login")}
        >
          登入
        </button>
        <button
          type="button"
          className={mode === "register" ? "is-active" : ""}
          onClick={() => switchMode("register")}
        >
          註冊
        </button>
      </div>

      <form className="auth-entry-form" onSubmit={handleSubmit}>
        {isRegister ? (
          <label>
            <span>顯示名稱</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              placeholder="可留空，之後也能修改"
              disabled={busy}
            />
          </label>
        ) : null}

        <label>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={busy}
            required
          />
        </label>

        {!registerSucceeded ? (
          <label>
            <span>密碼</span>
            <input
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "至少 8 個字元" : "輸入密碼"}
              disabled={busy}
              minLength={isRegister ? 8 : undefined}
              maxLength={128}
              required
            />
          </label>
        ) : null}

        {formMessage ? (
          <p
            className={`auth-entry-message ${formMessageOk ? "is-ok" : ""}`}
            role="alert"
          >
            {formMessage}
          </p>
        ) : null}

        {!registerSucceeded ? (
          <button type="submit" disabled={busy} className="auth-entry-submit">
            {submitting ? "處理中..." : isRegister ? "建立帳號" : "登入"}
          </button>
        ) : null}

        {registerSucceeded ? (
          <button
            type="button"
            className="auth-entry-link"
            onClick={handleResendVerification}
            disabled={busy}
          >
            {submitting ? "寄送中..." : "重新寄送驗證信"}
          </button>
        ) : null}

        {!isRegister && !registerSucceeded ? (
          <button
            type="button"
            className="auth-entry-link"
            onClick={handlePasswordReset}
            disabled={busy || resetSent}
          >
            {submitting
              ? "寄送中..."
              : resetSent
                ? "重設信已送出"
                : "忘記密碼？"}
          </button>
        ) : null}
      </form>

      <div className="auth-entry-divider">或</div>

      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={authLoading}
        className="auth-entry-google"
      >
        <span>G</span>
        {authLoading ? "登入中..." : "使用 Google 登入"}
      </button>
    </div>
  );
};

export default AuthEntryPanel;
