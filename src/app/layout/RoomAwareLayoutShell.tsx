import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useMediaQuery } from "@mui/material";

import AppHeader from "./AppHeader";
import SettingsDrawer from "./SettingsDrawer";
import IdentityProfileDialog from "./IdentityProfileDialog";
import { useRoomAwareNavigationGuards } from "./useRoomAwareNavigationGuards";
import { useAuth } from "@shared/auth/AuthContext";
import { useRoomGameStatus, useRoomSession } from "@features/RoomSession";

const RoomAwareLayoutShell: React.FC = () => {
  const location = useLocation();
  const {
    authLoading,
    authUser,
    loginWithEmail,
    registerWithEmail,
    resendEmailVerification,
    requestPasswordReset,
    needsNicknameConfirm,
    nicknameDraft,
    setNicknameDraft,
    confirmNickname,
    isProfileEditorOpen,
    openProfileEditor,
    closeProfileEditor,
    displayUsername,
  } = useAuth();

  const { statusNotification, setStatusText, currentRoom } = useRoomSession();
  const { gameStatus } = useRoomGameStatus();
  const [inRoomSettingsOpen, setInRoomSettingsOpen] = useState(false);
  const isMobileViewport = useMediaQuery("(max-width: 1023.95px)");
  const handleOpenInRoomSettings = useCallback(() => {
    setInRoomSettingsOpen(true);
  }, []);

  const navigationGuards = useRoomAwareNavigationGuards({
    onOpenSettings: handleOpenInRoomSettings,
  });

  useEffect(() => {
    if (!statusNotification) return;
    setStatusText(null);
  }, [setStatusText, statusNotification]);

  const isGameMode = Boolean(currentRoom && gameStatus);
  const shouldDeferNicknameConfirm = Boolean(
    currentRoom && gameStatus === "playing",
  );
  const isRoomsHubPage = location.pathname === "/rooms";
  const isCareerPage = location.pathname === "/career";
  const isDashboardShellPage = isRoomsHubPage || isCareerPage;

  const roomsOutletClassName = isRoomsHubPage && isMobileViewport
    ? [
        "min-h-0 flex-1",
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
        isRoomsHubPage
          ? "h-dvh overflow-hidden"
          : isCareerPage
            ? "h-dvh overflow-hidden"
          : "min-h-screen"
      }`}
    >
      <div
        className={`flex w-full min-w-0 ${
          isGameMode
            ? "max-w-none px-3 pt-3 xl:px-5"
            : isDashboardShellPage
              ? "px-2 pb-2 pt-3 sm:p-4"
              : "p-4"
        } flex-col ${isDashboardShellPage ? "space-y-2" : "space-y-4"}${
          currentRoom && isMobileViewport ? " pb-4" : ""
        } ${
          isRoomsHubPage
            ? "h-full min-h-0"
            : isCareerPage
              ? "h-full min-h-0"
            : "min-h-screen"
        }`}
      >
        <AppHeader
          displayUsername={displayUsername}
          authUser={authUser}
          authLoading={authLoading}
          onLogin={navigationGuards.handleLoginRequest}
          onEmailLogin={loginWithEmail}
          onEmailRegister={registerWithEmail}
          onPasswordResetRequest={requestPasswordReset}
          onResendVerification={resendEmailVerification}
          onLogout={navigationGuards.handleLogoutRequest}
          onEditProfile={openProfileEditor}
          onNavigateRooms={navigationGuards.handleNavigateRooms}
          onNavigateCollections={navigationGuards.handleNavigateCollections}
          onNavigateFavorites={navigationGuards.handleNavigateFavorites}
          onNavigateCareer={navigationGuards.handleNavigateCareer}
          onNavigateSettings={navigationGuards.handleNavigateSettings}
          onNavigatePrivacy={navigationGuards.handlePrivacyRequest}
        />

        {isRoomsHubPage ? (
          <div className={roomsOutletClassName}>
            <Outlet />
          </div>
        ) : isCareerPage ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}

        {navigationGuards.dialogs}

        <SettingsDrawer
          open={inRoomSettingsOpen}
          onClose={() => setInRoomSettingsOpen(false)}
        />

        <IdentityProfileDialog
          needsNicknameConfirm={
            shouldDeferNicknameConfirm ? false : needsNicknameConfirm
          }
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

export default RoomAwareLayoutShell;
