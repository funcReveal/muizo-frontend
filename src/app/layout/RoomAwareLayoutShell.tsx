import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useMediaQuery } from "@mui/material";

import AppHeader from "./AppHeader";
import EmbeddedSettingsDialog from "./EmbeddedSettingsDialog";
import IdentityProfileDialog from "./IdentityProfileDialog";
import { useRoomAwareNavigationGuards } from "./useRoomAwareNavigationGuards";
import { useAuth } from "@shared/auth/AuthContext";
import { useRoomGameStatus, useRoomSession } from "@features/RoomSession";

const RoomAwareLayoutShell: React.FC = () => {
  const location = useLocation();
  const {
    authLoading,
    authUser,
    needsNicknameConfirm,
    nicknameDraft,
    setNicknameDraft,
    confirmNickname,
    isProfileEditorOpen,
    openProfileEditor,
    closeProfileEditor,
    displayUsername,
    username,
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
  const isRoomsEntryGatePage = isRoomsHubPage && !username;

  const roomsOutletClassName = isRoomsEntryGatePage
    ? [
        "min-h-0 flex-1",
        "overflow-y-auto overflow-x-hidden",
        "pb-[calc(88px+env(safe-area-inset-bottom))]",
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
        isRoomsHubPage ? "h-dvh overflow-hidden" : "min-h-screen"
      }`}
    >
      <div
        className={`flex w-full min-w-0 ${
          isGameMode ? "max-w-none px-3 pt-3 xl:px-5" : "max-w-[1600px] p-4"
        } flex-col ${isRoomsHubPage ? "space-y-2" : "space-y-4"}${
          currentRoom && isMobileViewport ? " pb-4" : ""
        } ${isRoomsHubPage ? "h-full min-h-0" : ""}`}
      >
        <AppHeader
          displayUsername={displayUsername}
          hasGuestIdentity={Boolean(username)}
          authUser={authUser}
          authLoading={authLoading}
          onLogin={navigationGuards.handleLoginRequest}
          onLogout={navigationGuards.handleLogoutRequest}
          onEditProfile={openProfileEditor}
          onNavigateRooms={navigationGuards.handleNavigateRooms}
          onNavigateCollections={navigationGuards.handleNavigateCollections}
          onNavigateCareer={navigationGuards.handleNavigateCareer}
          onNavigateSettings={navigationGuards.handleNavigateSettings}
          onNavigatePrivacy={navigationGuards.handlePrivacyRequest}
        />

        {isRoomsHubPage ? (
          <div className={roomsOutletClassName}>
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}

        {navigationGuards.dialogs}

        <EmbeddedSettingsDialog
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
