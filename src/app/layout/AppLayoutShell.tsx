import React, { useCallback, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import LogoutRounded from "@mui/icons-material/LogoutRounded";

import AppHeader from "./AppHeader";
import SettingsDrawer from "./SettingsDrawer";
import IdentityProfileDialog from "./IdentityProfileDialog";
import { useAuth } from "@shared/auth/AuthContext";
import ConfirmDialog from "@shared/ui/ConfirmDialog";

type NavigationTarget =
  | "rooms"
  | "collections"
  | "favorites"
  | "career"
  | "settings";

const getNavigationPath = (target: NavigationTarget) => {
  switch (target) {
    case "rooms":
      return "/rooms";
    case "collections":
      return "/collections";
    case "favorites":
      return "/me/favorites";
    case "career":
      return "/career";
    default:
      return "/rooms";
  }
};

const AppLayoutShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [routeTrail, setRouteTrail] = useState<{current: string; previous: string | null}>(() => ({current: location.pathname, previous: null}));
  if (routeTrail.current !== location.pathname) {
    setRouteTrail({current: location.pathname, previous: routeTrail.current});
  }
  const {
    authToken,
    refreshAuthToken,
    authLoading,
    authUser,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resendEmailVerification,
    requestPasswordReset,
    logout,
    needsNicknameConfirm,
    nicknameDraft,
    setNicknameDraft,
    confirmNickname,
    isProfileEditorOpen,
    openProfileEditor,
    closeProfileEditor,
    displayUsername,
  } = useAuth();

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobileViewport = useMediaQuery("(max-width: 1023.95px)");

  const isRoomsHubPage = location.pathname === "/rooms";
  const isCollectionsPage = location.pathname === "/collections";
  const isCollectionEditPage = /^\/collections\/[^/]+\/edit$/.test(location.pathname);
  const isFixedViewportPage =
    isRoomsHubPage || isCollectionsPage || isCollectionEditPage;

  const handleLoginRequest = useCallback(() => {
    if (authLoading) return;
    loginWithGoogle();
  }, [authLoading, loginWithGoogle]);

  const handleLogoutRequest = useCallback(() => {
    setLogoutConfirmOpen(true);
  }, []);

  const handleNavigateRequest = useCallback(
    (target: NavigationTarget) => {
      if (target === "settings") {
        setSettingsOpen(true);
        return;
      }

      navigate(getNavigationPath(target));
    },
    [navigate],
  );

  const handleNavigateRooms = useCallback(
    () => handleNavigateRequest("rooms"),
    [handleNavigateRequest],
  );
  const handleNavigateCollections = useCallback(
    () => handleNavigateRequest("collections"),
    [handleNavigateRequest],
  );
  const handleNavigateCareer = useCallback(
    () => handleNavigateRequest("career"),
    [handleNavigateRequest],
  );
  const handleNavigateFavorites = useCallback(
    () => handleNavigateRequest("favorites"),
    [handleNavigateRequest],
  );
  const handleNavigateSettings = useCallback(
    () => handleNavigateRequest("settings"),
    [handleNavigateRequest],
  );
  const handleNavigatePrivacy = useCallback(() => {
    navigate("/privacy");
  }, [navigate]);

  const shouldUseMobileScrollableOutlet =
    isMobileViewport &&
    (isRoomsHubPage || isCollectionsPage || isCollectionEditPage);

  const fixedViewportOutletClassName =
    shouldUseMobileScrollableOutlet
      ? [
          "min-h-0 flex-1",
          "collection-edit-mobile-scroll",
          "overflow-y-auto overflow-x-hidden",
          "pb-[calc(16px+env(safe-area-inset-bottom))]",
          "[-webkit-overflow-scrolling:touch]",
          "overscroll-y-contain",
          "[&>*]:!h-auto",
          "[&>*]:!min-h-full",
          "[&>*]:!overflow-visible",
        ].join(" ")
      : "min-h-0 flex-1 overflow-hidden pb-2";

  return (
    <div
      className={`flex bg-[var(--mc-bg)] text-[var(--mc-text)] justify-center items-start ${
        isFixedViewportPage ? "h-dvh overflow-hidden" : "min-h-screen"
      }`}
    >
      <div
        className={`flex w-full min-w-0 p-4 flex-col ${
          isFixedViewportPage ? "space-y-2 h-full min-h-0" : "space-y-4 min-h-screen"
        }`}
      >
        <AppHeader
          displayUsername={displayUsername}
          authUser={authUser}
          authLoading={authLoading}
          authToken={authToken}
          refreshAuthToken={refreshAuthToken}
          onLogin={handleLoginRequest}
          onEmailLogin={loginWithEmail}
          onEmailRegister={registerWithEmail}
          onPasswordResetRequest={requestPasswordReset}
          onResendVerification={resendEmailVerification}
          onLogout={handleLogoutRequest}
          onEditProfile={openProfileEditor}
          onNavigateRooms={handleNavigateRooms}
          onNavigateCollections={handleNavigateCollections}
          onNavigateFavorites={handleNavigateFavorites}
          onNavigateCareer={handleNavigateCareer}
          onNavigateSettings={handleNavigateSettings}
          onNavigatePrivacy={handleNavigatePrivacy}
        />

        {isFixedViewportPage ? (
          <div className={fixedViewportOutletClassName}>
            <Outlet context={{authReturnTo: routeTrail.previous}} />
          </div>
        ) : (
          <Outlet context={{authReturnTo: routeTrail.previous}} />
        )}

        <ConfirmDialog
          open={logoutConfirmOpen}
          title="確定要登出？"
          description="登出後仍可瀏覽公開題庫，重新登入即可繼續遊玩。"
          icon={<LogoutRounded sx={{ fontSize: 23 }} />}
          confirmLabel="確認登出"
          cancelLabel="保持登入"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => {
            setLogoutConfirmOpen(false);
            logout();
          }}
        />

        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        <IdentityProfileDialog
          needsNicknameConfirm={needsNicknameConfirm}
          isProfileEditorOpen={isProfileEditorOpen}
          nicknameDraft={nicknameDraft}
          setNicknameDraft={setNicknameDraft}
          confirmNickname={confirmNickname}
          closeProfileEditor={closeProfileEditor}
        />
      </div>
    </div>
  );
};

export default AppLayoutShell;
