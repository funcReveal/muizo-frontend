import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  useMediaQuery,
} from "@mui/material";

import AppHeader from "../../../app/layout/AppHeader";
import LandingPage from "../../Landing/ui/LandingPage";
import { USERNAME_MAX } from "../model/roomConstants";
import { useRoom } from "../model/useRoom";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";
import RouteRedirectNotice from "../../../shared/ui/RouteRedirectNotice";
import SettingsPage from "../../Setting/ui/SettingsPage";

type NavigationTarget = "rooms" | "collections" | "history" | "settings";

const RoomsLayoutShell: React.FC = () => {
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
    statusText,
    username,
    usernameInput,
    setUsernameInput,
    handleSetUsername,
    currentRoom,
    gameState,
    handleLeaveRoom,
    setStatusText,
  } = useRoom();
  const hasIdentity = Boolean(username || authUser);
  const shouldShowLandingOnly = !authLoading && !hasIdentity;
  const isInviteRoute = location.pathname.startsWith("/invited/");

  const shouldRedirectToRooms =
    shouldShowLandingOnly && location.pathname !== "/rooms" && !isInviteRoute;

  useEffect(() => {
    if (!shouldRedirectToRooms) return;
    const timer = window.setTimeout(() => {
      navigate("/rooms", { replace: true });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [navigate, shouldRedirectToRooms]);
  const [loginConfirmOpen, setLoginConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [inRoomSettingsOpen, setInRoomSettingsOpen] = useState(false);
  const settingsDialogFullScreen = useMediaQuery("(max-width: 900px)");
  const [navigationConfirmTarget, setNavigationConfirmTarget] =
    useState<NavigationTarget | null>(null);
  const getNavigationPath = useCallback((target: NavigationTarget) => {
    switch (target) {
      case "rooms":
        return "/rooms";
      case "collections":
        return "/collections";
      case "history":
        return "/history";
      case "settings":
        return "/settings";
      default:
        return "/rooms";
    }
  }, []);

  const loginConfirmText = useMemo(() => {
    if (gameState?.status === "playing") {
      return {
        title: "離開對戰並登入？",
        description:
          "目前房間正在遊玩中。前往 Google 登入前會先離開房間，登入後可重新加入。",
      };
    }
    return {
      title: "離開房間並登入？",
      description: "登入前會先離開目前房間，以避免保留舊的房間連線狀態。",
    };
  }, [gameState?.status]);

  const startGoogleLogin = useCallback(() => {
    if (authLoading) return;
    loginWithGoogle();
  }, [authLoading, loginWithGoogle]);

  const handleLoginRequest = useCallback(() => {
    if (!currentRoom) {
      startGoogleLogin();
      return;
    }
    setLoginConfirmOpen(true);
  }, [currentRoom, startGoogleLogin]);

  const handleConfirmLogin = useCallback(() => {
    setLoginConfirmOpen(false);
    if (!currentRoom) {
      startGoogleLogin();
      return;
    }
    handleLeaveRoom(() => {
      navigate("/rooms", { replace: true });
      setStatusText("已離開房間，前往 Google 登入");
      startGoogleLogin();
    });
  }, [currentRoom, handleLeaveRoom, navigate, setStatusText, startGoogleLogin]);

  const logoutConfirmText = useMemo(() => {
    if (currentRoom) {
      return {
        title: "確定要登出？",
        description: "登出後會離開目前登入狀態，並返回首頁入口頁。",
      };
    }
    return {
      title: "確定要登出？",
      description: "你將登出目前帳號。",
    };
  }, [currentRoom]);

  const handleLogoutRequest = useCallback(() => {
    setLogoutConfirmOpen(true);
  }, []);

  const handleConfirmLogout = useCallback(() => {
    setLogoutConfirmOpen(false);
    logout();
  }, [logout]);

  const handleNavigateRequest = useCallback(
    (target: NavigationTarget) => {
      if (target === "settings") {
        setInRoomSettingsOpen(true);
        setStatusText(currentRoom ? "已開啟房內設定" : "已開啟設定視窗");
        return;
      }
      const path = getNavigationPath(target);
      if (!currentRoom) {
        navigate(path);
        return;
      }
      setNavigationConfirmTarget(target);
    },
    [currentRoom, getNavigationPath, navigate, setStatusText],
  );

  const navigationConfirmText = useMemo(() => {
    if (!navigationConfirmTarget) return null;
    if (navigationConfirmTarget === "settings") {
      if (gameState?.status === "playing") {
        return {
          title: "離開房間並前往設定？",
          description: "前往設定時將保留目前房間連線，設定會以彈出視窗開啟。",
        };
      }
      return {
        title: "在房內開啟設定",
        description: "設定會以彈出視窗開啟，不會離開房間。",
      };
    }
    const targetLabel =
      navigationConfirmTarget === "rooms"
        ? "房間列表"
        : navigationConfirmTarget === "collections"
          ? "收藏庫"
          : "對戰歷史";
    if (gameState?.status === "playing") {
      return {
        title: `離開對戰並前往${targetLabel}？`,
        description: `目前房間正在遊玩中。前往 ${targetLabel} 前會先離開房間，之後可再重新加入。`,
      };
    }
    return {
      title: `離開房間並前往${targetLabel}？`,
      description: `前往 ${targetLabel} 前會先離開目前房間，以避免保留舊的房間連線狀態。`,
    };
  }, [gameState?.status, navigationConfirmTarget]);

  const handleConfirmNavigation = useCallback(() => {
    const target = navigationConfirmTarget;
    setNavigationConfirmTarget(null);
    if (!target) return;
    const path = getNavigationPath(target);
    if (!currentRoom) {
      navigate(path);
      return;
    }
    handleLeaveRoom(() => {
      navigate(path, { replace: target === "rooms" });
      if (target === "settings") {
        setStatusText("已離開房間，前往設定頁");
        return;
      }
      setStatusText(
        target === "rooms"
          ? "已離開房間，前往房間列表"
          : target === "collections"
            ? "已離開房間，前往收藏庫"
            : "已離開房間，前往對戰歷史",
      );
    });
  }, [
    currentRoom,
    getNavigationPath,
    handleLeaveRoom,
    navigate,
    navigationConfirmTarget,
    setStatusText,
  ]);

  return (
    <div className="flex min-h-screen bg-[var(--mc-bg)] text-[var(--mc-text)] justify-center items-start p-4">
      <div className="flex w-full min-w-0 max-w-[1600px] flex-col space-y-4">
        <div>
          <AppHeader
            displayUsername={displayUsername}
            authUser={authUser}
            authLoading={authLoading}
            onLogin={handleLoginRequest}
            onLogout={handleLogoutRequest}
            onEditProfile={openProfileEditor}
            onNavigateRooms={() => handleNavigateRequest("rooms")}
            onNavigateCollections={() => handleNavigateRequest("collections")}
            onNavigateHistory={() => handleNavigateRequest("history")}
            onNavigateSettings={() => handleNavigateRequest("settings")}
          />
        </div>

        {shouldRedirectToRooms && (
          <RouteRedirectNotice
            title="正在返回首頁登入"
            subtitle="尚未設定訪客身分或登入帳號，請先完成登入。"
            fullHeight
          />
        )}

        {shouldShowLandingOnly && !shouldRedirectToRooms && !isInviteRoute && (
          <LandingPage
            usernameInput={usernameInput}
            onInputChange={setUsernameInput}
            onConfirm={handleSetUsername}
            onGoogleLogin={handleLoginRequest}
            googleLoading={authLoading}
            nicknameMaxLength={USERNAME_MAX}
          />
        )}

        {(hasIdentity || isInviteRoute) && <Outlet />}

        <footer className="flex m-0 items-center justify-center gap-4 text-xs text-[var(--mc-text-muted)]">
          <Link to="/privacy" className="hover:text-[var(--mc-text)]">
            隱私權政策
          </Link>
          <span className="text-[var(--mc-border)]">‧</span>
          <Link to="/terms" className="hover:text-[var(--mc-text)]">
            服務條款
          </Link>
        </footer>

        {statusText && (
          <Snackbar message={`Status: ${statusText}`} open={true} />
        )}
        <ConfirmDialog
          open={loginConfirmOpen}
          title={loginConfirmText.title}
          description={loginConfirmText.description}
          confirmLabel="確認登入"
          cancelLabel="取消"
          onConfirm={handleConfirmLogin}
          onCancel={() => setLoginConfirmOpen(false)}
        />
        <ConfirmDialog
          open={logoutConfirmOpen}
          title={logoutConfirmText.title}
          description={logoutConfirmText.description}
          confirmLabel="確認登出"
          cancelLabel="取消"
          onConfirm={handleConfirmLogout}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
        <ConfirmDialog
          open={Boolean(navigationConfirmTarget)}
          title={navigationConfirmText?.title ?? ""}
          description={navigationConfirmText?.description ?? ""}
          confirmLabel="確認離開"
          cancelLabel="取消"
          onConfirm={handleConfirmNavigation}
          onCancel={() => setNavigationConfirmTarget(null)}
        />
        <Dialog
          open={inRoomSettingsOpen}
          onClose={() => setInRoomSettingsOpen(false)}
          fullScreen={settingsDialogFullScreen}
          fullWidth
          maxWidth="xl"
          PaperProps={{
            sx: {
              width: settingsDialogFullScreen
                ? "100vw"
                : "min(1400px, calc(100vw - 24px))",
              maxWidth: "unset",
              height: settingsDialogFullScreen
                ? "100dvh"
                : "min(920px, calc(100dvh - 24px))",
              maxHeight: settingsDialogFullScreen
                ? "100dvh"
                : "min(920px, calc(100dvh - 24px))",
              borderRadius: settingsDialogFullScreen ? 0 : { xs: 2, sm: 3 },
              m: settingsDialogFullScreen ? 0 : undefined,
              border: "1px solid rgba(148, 163, 184, 0.24)",
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.9), rgba(2,6,23,0.84))",
              boxShadow:
                "0 24px 64px rgba(2,6,23,0.45), 0 0 0 1px rgba(34,211,238,0.06)",
              backdropFilter: "blur(14px)",
            },
          }}
        >
          <DialogContent
            sx={{
              p: { xs: 1, sm: 1.5 },
              background: "transparent",
              display: "flex",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <SettingsPage
              embedded
              onRequestClose={() => setInRoomSettingsOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Dialog
          open={needsNicknameConfirm || isProfileEditorOpen}
          onClose={() => {
            if (!needsNicknameConfirm) {
              closeProfileEditor();
            }
          }}
        >
          <DialogTitle>
            {needsNicknameConfirm ? "請設定暱稱" : "編輯個人資料"}
          </DialogTitle>
          <DialogContent>
            <p className="text-sm text-[var(--mc-text-muted)] mb-2">
              {needsNicknameConfirm
                ? "你已使用 Google 登入，請設定顯示暱稱。之後可在個人資料中修改。"
                : "請更新顯示暱稱。"}
            </p>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--mc-surface-strong)] border border-[var(--mc-border)] outline-none focus:border-[var(--mc-accent)] focus:ring-1 focus:ring-[var(--mc-glow)]"
              placeholder="請輸入顯示暱稱"
              value={nicknameDraft}
              onChange={(e) =>
                setNicknameDraft(e.target.value.slice(0, USERNAME_MAX))
              }
              maxLength={USERNAME_MAX}
            />
          </DialogContent>
          <DialogActions>
            {!needsNicknameConfirm && (
              <Button onClick={closeProfileEditor} variant="outlined">
                取消
              </Button>
            )}
            <Button onClick={confirmNickname} variant="contained">
              確認
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default RoomsLayoutShell;
