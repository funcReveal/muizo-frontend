import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import AppHeader from "../../../app/layout/AppHeader";
import { useAuth } from "../../../shared/auth/AuthContext";

const LegalLayout: React.FC = () => {
  const navigate = useNavigate();
  const {
    displayUsername,
    username,
    authUser,
    authLoading,
    loginWithGoogle,
    logout,
  } =
    useAuth();

  return (
    <div className="min-h-screen bg-[var(--mc-bg)] text-[var(--mc-text)] p-4">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <AppHeader
          displayUsername={displayUsername}
          hasGuestIdentity={Boolean(username)}
          authUser={authUser}
          authLoading={authLoading}
          onLogin={loginWithGoogle}
          onLogout={logout}
          onEditProfile={() => navigate("/rooms")}
          onNavigateRooms={() => navigate("/rooms")}
          onNavigateCollections={() => navigate("/collections")}
          onNavigateHistory={() => navigate("/history")}
          onNavigateSettings={() => navigate("/settings")}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-6 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">法律與政策</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 px-2 py-1 text-xs uppercase tracking-[0.2em] text-[var(--mc-text-muted)]">
            <NavLink
              to="/privacy"
              className={({ isActive }) =>
                `rounded-full px-3 py-1 font-semibold transition ${
                  isActive
                    ? "bg-[var(--mc-accent)]/20 text-[var(--mc-text)]"
                    : "hover:text-[var(--mc-text)]"
                }`
              }
            >
              隱私權政策
            </NavLink>
            <NavLink
              to="/terms"
              className={({ isActive }) =>
                `rounded-full px-3 py-1 font-semibold transition ${
                  isActive
                    ? "bg-[var(--mc-accent)]/20 text-[var(--mc-text)]"
                    : "hover:text-[var(--mc-text)]"
                }`
              }
            >
              服務條款
            </NavLink>
          </div>
        </header>
        <Outlet />
        <footer className="text-xs text-[var(--mc-text-muted)]">
          © 2026 Muizo
        </footer>
      </div>
    </div>
  );
};

export default LegalLayout;
