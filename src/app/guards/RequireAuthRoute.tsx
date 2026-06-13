import React from "react";
import type { PropsWithChildren } from "react";

import { useAuth } from "@/shared/auth/AuthContext";
import AuthRequiredPanel from "@/shared/ui/auth/AuthRequiredPanel";

type RequireAuthRouteProps = PropsWithChildren<{
  title?: string;
  description?: string;
  featureIcon?: React.ReactNode;
  currentBreadcrumbLabel?: string;
}>;

const RequireAuthRoute: React.FC<RequireAuthRouteProps> = ({
  children,
  title = "此頁面需先登入",
  description = "登入或建立帳號後，即可繼續使用這個功能。",
  featureIcon,
  currentBreadcrumbLabel,
}) => {
  const { authLoading, authUser } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-[46vh] items-center justify-center text-[var(--mc-text-muted)]">
        正在確認登入狀態...
      </div>
    );
  }

  if (authUser) return <>{children}</>;

  return (
    <div className="flex min-h-[calc(100dvh-132px)] w-full items-start px-1 pb-6 pt-3 sm:px-2 sm:pt-4">
      <AuthRequiredPanel
        title={title}
        description={description}
        featureIcon={featureIcon}
        currentBreadcrumbLabel={currentBreadcrumbLabel}
      />
    </div>
  );
};

export default RequireAuthRoute;
