import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowBackRounded,
  CheckCircleRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";

import { useAuth } from "@/shared/auth/AuthContext";

const getPlanLabel = (plan?: string | null, role?: string | null) => {
  if (role === "admin") return "管理員";
  const normalizedPlan = plan?.trim().toLowerCase();
  switch (normalizedPlan) {
    case "unlimited":
      return "無限會員";
    case "business":
      return "商務會員";
    case "premium":
      return "Premium 會員";
    case "pro":
      return "Pro 會員";
    case "plus":
      return "Plus 會員";
    default:
      return "一般會員";
  }
};

const MembershipPage: React.FC = () => {
  const { authUser } = useAuth();
  const currentPlanLabel = getPlanLabel(authUser?.plan, authUser?.role);

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-1 pb-10 pt-2 text-[var(--mc-text)] sm:px-3">
      <Link
        to="/rooms"
        className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1.5 text-sm font-bold text-[var(--mc-text-muted)] transition hover:bg-white/[0.045] hover:text-[var(--mc-text)]"
      >
        <ArrowBackRounded sx={{ fontSize: 18 }} />
        返回房間大廳
      </Link>

      <section className="overflow-hidden rounded-[24px] border border-amber-300/18 bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(255,255,255,0.035)_42%,rgba(15,23,42,0.72))] p-5 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/24 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
              <WorkspacePremiumRounded sx={{ fontSize: 16 }} />
              目前身分：{currentPlanLabel}
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight text-slate-50 sm:text-4xl">
              升級會員，擴充收藏庫與題庫容量
            </h1>
            <p className="mt-3 max-w-[62ch] text-sm leading-7 text-slate-300/86">
              會員方案會優先強化房主與題庫建立者的工作流，包含更大的收藏庫容量、更多私人題庫空間，以及後續進階管理工具。
            </p>
          </div>

          <button
            type="button"
            disabled
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-200/24 bg-amber-300/10 px-5 text-sm font-black text-amber-100 opacity-80"
          >
            升級結帳即將開放
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          {
            title: "Plus",
            detail: "適合常開房的玩家，收藏庫容量提高到 1000 題。",
          },
          {
            title: "Premium",
            detail: "適合重度房主與社群活動，單一收藏庫可整理到 2000 題。",
          },
          {
            title: "Business",
            detail: "適合活動、直播或團隊使用，保留更大的題庫空間。",
          },
        ].map((plan) => (
          <article
            key={plan.title}
            className="rounded-2xl border border-white/10 bg-slate-950/46 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <h2 className="text-lg font-black text-slate-50">{plan.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300/82">
              {plan.detail}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-200">
              <CheckCircleRounded sx={{ fontSize: 16 }} />
              方案資料已支援，付款流程待接入
            </div>
          </article>
        ))}
      </section>
    </main>
  );
};

export default MembershipPage;
