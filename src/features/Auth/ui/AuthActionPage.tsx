import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { AUTH_API_URL } from "@domain/room/constants";
import {
  apiResetPassword,
  apiVerifyEmail,
} from "@features/RoomSession/model/roomApi";

type PageMode = "verify-email" | "reset-password";

const AuthActionPage: React.FC<{ mode: PageMode }> = ({ mode }) => {
  const location = useLocation();
  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("token") ?? "";
  }, [location.search]);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >(mode === "verify-email" ? "loading" : "idle");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (mode !== "verify-email") return;
    if (!token) {
      setStatus("error");
      setMessage("驗證連結缺少 token");
      return;
    }

    let cancelled = false;
    const run = async () => {
      const { ok, payload } = await apiVerifyEmail(AUTH_API_URL, { token });
      if (cancelled) return;
      if (ok) {
        setStatus("success");
        setMessage("Email 驗證完成，你可以繼續使用 Muizo。");
      } else {
        setStatus("error");
        setMessage(payload?.error ?? "驗證連結無效或已過期");
      }
    };

    void run().catch(() => {
      if (cancelled) return;
      setStatus("error");
      setMessage("驗證失敗，請稍後再試");
    });

    return () => {
      cancelled = true;
    };
  }, [mode, token]);

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage("重設連結缺少 token");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMessage("密碼至少需要 8 個字元");
      return;
    }

    setStatus("loading");
    const { ok, payload } = await apiResetPassword(AUTH_API_URL, {
      token,
      password,
    });

    if (ok) {
      setStatus("success");
      setMessage("密碼已更新，請使用新密碼登入。");
      setPassword("");
      return;
    }

    setStatus("error");
    setMessage(payload?.error ?? "重設連結無效或已過期");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center">
        <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/86 p-6 shadow-2xl">
          <h1 className="text-2xl font-semibold">
            {mode === "verify-email" ? "Email 驗證" : "重設密碼"}
          </h1>

          {mode === "reset-password" ? (
            <form className="mt-6 grid gap-4" onSubmit={handleResetPassword}>
              <label className="grid gap-2 text-sm text-slate-300">
                新密碼
                <input
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100 outline-none focus:border-cyan-300"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 8 個字元"
                  disabled={status === "loading"}
                />
              </label>
              <button
                className="rounded-xl border border-cyan-400/40 bg-cyan-900/50 px-4 py-3 text-sm tracking-[0.14em] text-cyan-50 disabled:opacity-60"
                type="submit"
                disabled={status === "loading"}
              >
                {status === "loading" ? "處理中..." : "更新密碼"}
              </button>
            </form>
          ) : null}

          {message ? (
            <p
              className={`mt-5 text-sm leading-6 ${
                status === "success" ? "text-emerald-200" : "text-rose-200"
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          <Link
            className="mt-6 inline-flex text-sm text-cyan-200 hover:text-cyan-100"
            to="/"
          >
            回到首頁
          </Link>
        </div>
      </section>
    </main>
  );
};

export default AuthActionPage;
