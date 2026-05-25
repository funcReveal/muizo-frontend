import React from "react";
import type { PropsWithChildren } from "react";
import {
  CheckCircleOutline,
  HistoryEdu,
  PersonOutline,
} from "@mui/icons-material";
import { Link } from "react-router-dom";

import { useAuth } from "../../shared/auth/AuthContext";

type RequireAuthRouteProps = PropsWithChildren<{
  title?: string;
  description?: string;
  badge?: string;
  highlights?: string[];
  allowGuest?: boolean;
}>;

const RequireAuthRoute: React.FC<RequireAuthRouteProps> = ({
  children,
  title = "此頁面需先登入",
  description = "請先使用 Google 登入，再繼續使用這個功能。",
  badge = "Members Only",
  highlights = ["跨裝置同步", "保留歷史資料", "快速回到常用功能"],
  allowGuest = false,
}) => {
  const { authLoading, authUser, username, loginWithGoogle } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-[46vh] items-center justify-center text-[var(--mc-text-muted)]">
        正在確認登入狀態...
      </div>
    );
  }

  if (authUser || (allowGuest && Boolean(username))) return <>{children}</>;

  const statusLabel = username ? `目前為訪客（${username}）` : "尚未登入";
  const statusHint = allowGuest
    ? "建立訪客身分後即可查看此裝置的紀錄，登入後可跨裝置保存。"
    : username
      ? "訪客身分無法查看生涯紀錄，請登入帳號保存並查看完整歷史。"
      : "登入帳號後即可保存並查看完整歷史。";
  const primaryActionLabel = allowGuest
    ? "使用 Google 保存紀錄"
    : "使用 Google 登入";
  const secondaryActionLabel = allowGuest ? "先建立訪客身分" : "房間列表";

  return (
    <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.99))] text-[var(--mc-text)] shadow-[0_22px_54px_-38px_rgba(0,0,0,0.76)]">
      <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/22 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-amber-100/88">
            <HistoryEdu sx={{ fontSize: 15 }} />
            {badge}
          </div>

          <h2 className="mt-4 text-xl font-semibold tracking-tight text-[var(--mc-text)] sm:text-2xl">
            {title}
          </h2>
          <p className="mt-2 max-w-[64ch] text-sm leading-6 text-[var(--mc-text-muted)]">
            {description}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item}
                className="flex min-w-0 items-center gap-2 rounded-[14px] border border-white/8 bg-white/[0.035] px-3 py-2 text-sm text-[var(--mc-text)]"
              >
                <CheckCircleOutline
                  className="shrink-0 text-emerald-200/90"
                  sx={{ fontSize: 17 }}
                />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="inline-flex h-10 items-center justify-center rounded-[12px] border border-amber-200/34 bg-amber-300 px-4 text-sm font-semibold text-stone-950 shadow-[0_14px_28px_-22px_rgba(245,158,11,0.86)] transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200/36 active:translate-y-px"
            >
              {primaryActionLabel}
            </button>
            <Link
              to="/rooms"
              className="inline-flex h-10 items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.035] px-4 text-sm font-semibold text-[var(--mc-text)] transition hover:border-amber-200/24 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-amber-200/24 active:translate-y-px"
            >
              {secondaryActionLabel}
            </Link>
            {!allowGuest && !username && (
              <Link
                to="/"
                className="inline-flex h-10 items-center justify-center rounded-[12px] px-3 text-sm font-semibold text-[var(--mc-text-muted)] transition hover:bg-white/[0.045] hover:text-[var(--mc-text)] focus:outline-none focus:ring-2 focus:ring-white/12"
              >
                回首頁
              </Link>
            )}
          </div>
        </div>

        <aside className="border-t border-[var(--mc-border)] bg-black/18 p-5 sm:p-6 md:border-l md:border-t-0">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-amber-300/24 bg-amber-300/12 text-amber-100">
                <PersonOutline sx={{ fontSize: 22 }} />
              </div>
              <div className="mt-4 text-[11px] font-semibold tracking-[0.14em] text-[var(--mc-text-muted)]">
                目前狀態
              </div>
              <div className="mt-1 text-base font-semibold text-amber-100">
                {statusLabel}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--mc-text-muted)]">
                {statusHint}
              </p>
            </div>

            {allowGuest && (
              <p className="rounded-[14px] border border-white/8 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-[var(--mc-text-muted)]">
                訪客資料只綁定目前身分。更換裝置或清除資料後，建議使用 Google
                登入保存。
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default RequireAuthRoute;
