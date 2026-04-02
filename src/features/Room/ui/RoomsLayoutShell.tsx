import React, { useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
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
import { USERNAME_MAX } from "../model/roomConstants";
import { useRoom } from "../model/useRoom";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";
import SettingsPage from "../../Setting/ui/SettingsPage";
import FloatingChatWindow from "./components/FloatingChatWindow";

type NavigationTarget = "rooms" | "collections" | "history" | "settings";

const RoomsLayoutShell: React.FC = () => {
  const navigate = useNavigate();
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
    currentRoom,
    gameState,
    handleLeaveRoom,
    setStatusText,
  } = useRoom();
  const [loginConfirmOpen, setLoginConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [inRoomSettingsOpen, setInRoomSettingsOpen] = useState(false);
  const [privacyConfirmOpen, setPrivacyConfirmOpen] = useState(false);
  const [termsConfirmOpen, setTermsConfirmOpen] = useState(false);
  const settingsDialogFullScreen = useMediaQuery("(max-width: 900px)");
  const isMobileViewport = useMediaQuery("(max-width: 1023.95px)");
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
  const handleHistoryRequest = useCallback(() => {
    handleNavigateRequest("history");
  }, [handleNavigateRequest]);

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
  const handlePrivacyRequest = useCallback(() => {
    if (!currentRoom) {
      navigate("/privacy");
      return;
    }
    setPrivacyConfirmOpen(true);
  }, [currentRoom, navigate]);
  const handleTermsRequest = useCallback(() => {
    if (!currentRoom) {
      navigate("/terms");
      return;
    }
    setTermsConfirmOpen(true);
  }, [currentRoom, navigate]);
  const handleConfirmPrivacy = useCallback(() => {
    setPrivacyConfirmOpen(false);
    if (!currentRoom) {
      navigate("/privacy");
      return;
    }
    handleLeaveRoom(() => {
      navigate("/privacy");
      setStatusText("已離開房間，前往隱私權政策");
    });
  }, [currentRoom, handleLeaveRoom, navigate, setStatusText]);
  const handleConfirmTerms = useCallback(() => {
    setTermsConfirmOpen(false);
    if (!currentRoom) {
      navigate("/terms");
      return;
    }
    handleLeaveRoom(() => {
      navigate("/terms");
      setStatusText("已離開房間，前往服務條款");
    });
  }, [currentRoom, handleLeaveRoom, navigate, setStatusText]);
  const handleStatusClose = useCallback(
    (_event: Event | React.SyntheticEvent, reason?: string) => {
      if (reason === "clickaway") return;
      setStatusText(null);
    },
    [setStatusText],
  );

  const isGameMode = Boolean(currentRoom && gameState);

  const settingsDialogPaperProps = useMemo(
    () => ({
      sx: {
        width: settingsDialogFullScreen ? "100vw" : "min(1400px, calc(100vw - 24px))",
        maxWidth: "unset",
        height: settingsDialogFullScreen ? "100dvh" : "min(920px, calc(100dvh - 24px))",
        maxHeight: settingsDialogFullScreen ? "100dvh" : "min(920px, calc(100dvh - 24px))",
        borderRadius: settingsDialogFullScreen ? 0 : { xs: 2, sm: 3 },
        m: settingsDialogFullScreen ? 0 : undefined,
        border: "1px solid rgba(148, 163, 184, 0.24)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.9), rgba(2,6,23,0.84))",
        boxShadow: "0 24px 64px rgba(2,6,23,0.45), 0 0 0 1px rgba(34,211,238,0.06)",
        backdropFilter: "none",
      },
    }),
    [settingsDialogFullScreen],
  );

  return (
    <div className="flex min-h-screen bg-[var(--mc-bg)] text-[var(--mc-text)] justify-center items-start">
      <div className={`flex w-full min-w-0 max-w-[1600px] flex-col space-y-4${isGameMode ? " px-6 pt-4" : " p-4"}${currentRoom && !isGameMode ? " pb-16" : ""}${currentRoom && isMobileViewport ? " pb-4" : ""}`}>
        <div>
          <AppHeader
            displayUsername={displayUsername}
            hasGuestIdentity={Boolean(username)}
            authUser={authUser}
            authLoading={authLoading}
            onLogin={handleLoginRequest}
            onLogout={handleLogoutRequest}
            onEditProfile={openProfileEditor}
            onNavigateRooms={() => handleNavigateRequest("rooms")}
            onNavigateCollections={() => handleNavigateRequest("collections")}
            onNavigateHistory={handleHistoryRequest}
            onNavigateSettings={() => handleNavigateRequest("settings")}
          />
        </div>

        <Outlet />

        <footer
          className={`flex m-0 items-center justify-center gap-4 text-xs text-[var(--mc-text-muted)] ${
            isGameMode && isMobileViewport ? "game-room-mobile-legal-footer" : ""
          }`}
        >
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-xs text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
            onClick={handlePrivacyRequest}
          >
            隱私權政策
          </button>
          <span className="text-[var(--mc-border)]">‧</span>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-xs text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
            onClick={handleTermsRequest}
          >
            服務條款
          </button>
        </footer>
        <Snackbar
          key={statusText ?? "status-empty"}
          message={statusText ? `Status: ${statusText}` : ""}
          open={Boolean(statusText)}
          autoHideDuration={4000}
          onClose={handleStatusClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        />
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
        <ConfirmDialog
          open={privacyConfirmOpen}
          title="前往隱私權政策並離開房間？"
          description="前往隱私權政策會離開目前房間。確定要離開並前往隱私權頁面嗎？"
          confirmLabel="確認前往"
          cancelLabel="留在房間"
          onConfirm={handleConfirmPrivacy}
          onCancel={() => setPrivacyConfirmOpen(false)}
        />
        <ConfirmDialog
          open={termsConfirmOpen}
          title="前往服務條款並離開房間？"
          description="前往服務條款會離開目前房間。確定要離開並前往服務條款頁面嗎？"
          confirmLabel="確認前往"
          cancelLabel="留在房間"
          onConfirm={handleConfirmTerms}
          onCancel={() => setTermsConfirmOpen(false)}
        />
        <Dialog
          open={inRoomSettingsOpen}
          onClose={() => setInRoomSettingsOpen(false)}
          fullScreen={settingsDialogFullScreen}
          fullWidth
          maxWidth="xl"
          PaperProps={settingsDialogPaperProps}
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
        {currentRoom && <FloatingChatWindow />}
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
