import { Button } from "@mui/material";
import type { PropsWithChildren } from "react";
import React from "react";
import { Link } from "react-router-dom";

import { useRoom } from "../../features/Room/model/useRoom";

type RequireAuthRouteProps = PropsWithChildren<{
  title?: string;
  description?: string;
}>;

const RequireAuthRoute: React.FC<RequireAuthRouteProps> = ({
  children,
  title = "此功能需要登入",
  description = "請先使用 Google 登入後再繼續。",
}) => {
  const { authLoading, authUser, loginWithGoogle } = useRoom();

  if (authLoading) {
    return (
      <div className="flex min-h-[46vh] items-center justify-center text-[var(--mc-text-muted)]">
        驗證登入狀態中...
      </div>
    );
  }

  if (authUser) return <>{children}</>;

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/80 p-6 text-[var(--mc-text)]">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--mc-text-muted)]">{description}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="contained" onClick={loginWithGoogle}>
          立即登入
        </Button>
        <Button component={Link} to="/" variant="outlined">
          回到首頁
        </Button>
      </div>
    </section>
  );
};

export default RequireAuthRoute;
