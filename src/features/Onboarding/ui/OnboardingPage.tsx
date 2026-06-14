import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@shared/auth/AuthContext";
import { onboardingApi } from "../model/onboardingApi";
import OnboardingWizard from "./OnboardingWizard";

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { authToken, refreshAuthToken } = useAuth();
  const authParams = useMemo(
    () => ({ authToken, refreshAuthToken }),
    [authToken, refreshAuthToken],
  );

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["onboarding", "page"],
    queryFn: () => onboardingApi.get(authParams),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[calc(100dvh-132px)] items-center justify-center px-4 text-sm font-bold text-[var(--mc-text-muted)]">
        正在載入帳號設定...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto grid w-full max-w-xl gap-4 px-3 py-10 text-[var(--mc-text)]">
        <section className="rounded-3xl border border-red-300/18 bg-red-950/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <h1 className="text-xl font-black text-red-100">無法載入帳號設定</h1>
          <p className="mt-2 text-sm leading-6 text-red-100/72">
            請稍後再試，或重新登入後回到這個頁面。
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-red-200/24 bg-red-200/10 px-4 text-sm font-black text-red-50 transition hover:bg-red-200/16"
          >
            重新載入
          </button>
        </section>
      </main>
    );
  }

  return (
    <OnboardingWizard
      state={data}
      onClose={() => navigate("/rooms", { replace: true })}
      presentation="page"
    />
  );
};

export default OnboardingPage;
