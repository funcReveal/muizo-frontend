import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  EmailOutlined,
  HomeRounded,
  ReplayRounded,
  TuneRounded,
} from "@mui/icons-material";

import { useAuth } from "@shared/auth/AuthContext";

const AuthVerifyPendingPage = () => {
  const [searchParams] = useSearchParams();
  const { authUser, resendEmailVerification } = useAuth();
  const email = useMemo(
    () => searchParams.get("email") || authUser?.email || "",
    [authUser?.email, searchParams],
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);

  const handleResend = async () => {
    if (!email || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const ok = await resendEmailVerification(email);
      setMessage(ok ? "驗證信已重新寄出，請查看信箱。" : "無法寄出驗證信，請稍後再試。");
      setMessageOk(ok);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mc-bg)] px-5 py-10 text-[var(--mc-text)]">
      <section className="mx-auto flex min-h-[76vh] max-w-3xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[28px] border border-cyan-300/14 bg-[radial-gradient(520px_280px_at_12%_0%,rgba(45,212,191,0.13),transparent_66%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.76))] p-5 shadow-[0_30px_90px_-64px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.08] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_34px_-26px_rgba(34,211,238,0.95)]">
              <EmailOutlined sx={{ fontSize: 29 }} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">
                Email Verification
              </p>
              <h1 className="mt-2 text-2xl font-black leading-tight text-slate-50 sm:text-3xl">
                請到信箱完成驗證
              </h1>
              <p className="mt-3 max-w-[66ch] text-sm leading-6 text-[var(--mc-text-muted)]">
                我們已寄出驗證信{email ? ` 到 ${email}` : ""}。完成驗證後，帳號就能使用完整的收藏庫、評論與排行榜功能。
              </p>

              <div className="mt-5 grid gap-2 rounded-2xl border border-white/8 bg-slate-950/34 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-100">
                    1
                  </span>
                  <span>打開你的 Email 信箱，找到 Muizo 驗證信。</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-100">
                    2
                  </span>
                  <span>點擊信中的驗證連結，頁面會自動完成驗證。</span>
                </div>
              </div>

              {message ? (
                <p
                  className={`mt-4 text-sm leading-6 ${
                    messageOk ? "text-emerald-200" : "text-rose-200"
                  }`}
                  role="status"
                >
                  {message}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[linear-gradient(135deg,rgba(103,232,249,0.96),rgba(45,212,191,0.9))] px-4 py-2 text-sm font-bold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_18px_34px_-24px_rgba(34,211,238,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleResend}
                  disabled={!email || submitting}
                >
                  <ReplayRounded sx={{ fontSize: 18 }} />
                  {submitting ? "寄送中..." : "重新寄送驗證信"}
                </button>
                <Link
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-200/20 bg-slate-950/42 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:border-cyan-200/38 hover:bg-cyan-500/10"
                  to="/onboarding"
                >
                  <TuneRounded sx={{ fontSize: 18 }} />
                  繼續帳號設定
                </Link>
                <Link
                  className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/[0.045] hover:text-slate-100"
                  to="/"
                >
                  <HomeRounded sx={{ fontSize: 18 }} />
                  回首頁
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AuthVerifyPendingPage;
