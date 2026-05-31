import React, { useCallback, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
} from "@mui/material";

import AppHeader from "./AppHeader";
import SettingsDrawer from "./SettingsDrawer";
import IdentityProfileDialog from "./IdentityProfileDialog";
import { useAuth } from "@shared/auth/AuthContext";

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
  const {
    authLoading,
    authUser,
    loginWithGoogle,
    logout,
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

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobileViewport = useMediaQuery("(max-width: 1023.95px)");

  const isRoomsHubPage = location.pathname === "/rooms";

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
        isRoomsHubPage ? "h-dvh overflow-hidden" : "min-h-screen"
      }`}
    >
      <div
        className={`flex w-full min-w-0 p-4 flex-col ${
          isRoomsHubPage ? "space-y-2" : "space-y-4"
        }${isRoomsHubPage ? " h-full min-h-0" : " min-h-screen"}`}
      >
        <AppHeader
          displayUsername={displayUsername}
          hasGuestIdentity={Boolean(username)}
          authUser={authUser}
          authLoading={authLoading}
          onLogin={handleLoginRequest}
          onLogout={handleLogoutRequest}
          onEditProfile={openProfileEditor}
          onNavigateRooms={handleNavigateRooms}
          onNavigateCollections={handleNavigateCollections}
          onNavigateFavorites={handleNavigateFavorites}
          onNavigateCareer={handleNavigateCareer}
          onNavigateSettings={handleNavigateSettings}
          onNavigatePrivacy={handleNavigatePrivacy}
        />

        {isRoomsHubPage ? (
          <div className={roomsOutletClassName}>
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}

        <Dialog
          open={logoutConfirmOpen}
          onClose={() => setLogoutConfirmOpen(false)}
        >
          <DialogTitle>確定要登出？</DialogTitle>

          <DialogContent>
            <p className="text-sm text-[var(--mc-text-muted)]">
              你將登出目前帳號。
            </p>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => setLogoutConfirmOpen(false)}
              variant="outlined"
            >
              取消
            </Button>

            <Button
              onClick={() => {
                setLogoutConfirmOpen(false);
                logout();
              }}
              variant="contained"
            >
              確認登出
            </Button>
          </DialogActions>
        </Dialog>

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
