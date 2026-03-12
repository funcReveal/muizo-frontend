import { Button } from "@mui/material";
import type { PropsWithChildren } from "react";
import React from "react";
import { Link } from "react-router-dom";

import { useRoom } from "../../features/Room/model/useRoom";

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
  const { authLoading, authUser, username, loginWithGoogle } = useRoom();

  if (authLoading) {
    return (
      <div className="flex min-h-[46vh] items-center justify-center text-[var(--mc-text-muted)]">
        正在確認登入狀態...
      </div>
    );
  }

  if (authUser || (allowGuest && Boolean(username))) return <>{children}</>;

  return (
    <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/80 text-[var(--mc-text)]">
      <div className="relative p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-0 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -right-16 bottom-0 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/90">
            {badge}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-[var(--mc-text-muted)]">
            {description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100/90"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--mc-border)]/70 bg-[var(--mc-surface-strong)]/50 px-4 py-3 text-sm text-[var(--mc-text-muted)]">
            目前狀態：
            {username ? (
              <span className="text-amber-200">訪客（{username}）</span>
            ) : (
              <span className="text-amber-200">尚未登入</span>
            )}
            。登入後即可解鎖此頁。
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="contained" onClick={loginWithGoogle}>
              使用 Google 登入
            </Button>
            <Button component={Link} to="/rooms" variant="outlined">
              先回房間列表
            </Button>
            <Button component={Link} to="/" variant="text">
              回首頁
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RequireAuthRoute;
