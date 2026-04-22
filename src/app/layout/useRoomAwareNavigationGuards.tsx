import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@shared/auth/AuthContext";
import { useRoomGame, useRoomSession } from "@features/RoomSession";
import ConfirmDialog from "@shared/ui/ConfirmDialog";

type NavigationTarget = "rooms" | "collections" | "history" | "settings";

const getNavigationPath = (target: NavigationTarget) => {
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
};

type UseRoomAwareNavigationGuardsParams = {
  onOpenSettings: () => void;
};

export function useRoomAwareNavigationGuards({
  onOpenSettings,
}: UseRoomAwareNavigationGuardsParams) {
  const navigate = useNavigate();
  const { authLoading, loginWithGoogle, logout } = useAuth();
  const { currentRoom, handleLeaveRoom } = useRoomSession();
  const { gameState } = useRoomGame();
  const [loginConfirmOpen, setLoginConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [privacyConfirmOpen, setPrivacyConfirmOpen] = useState(false);
  const [termsConfirmOpen, setTermsConfirmOpen] = useState(false);
  const [navigationConfirmTarget, setNavigationConfirmTarget] =
    useState<NavigationTarget | null>(null);

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
      startGoogleLogin();
    });
  }, [currentRoom, handleLeaveRoom, navigate, startGoogleLogin]);

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
        onOpenSettings();
        return;
      }
      const path = getNavigationPath(target);
      if (!currentRoom) {
        navigate(path);
        return;
      }
      setNavigationConfirmTarget(target);
    },
    [currentRoom, navigate, onOpenSettings],
  );

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
    });
  }, [currentRoom, handleLeaveRoom, navigate, navigationConfirmTarget]);

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
    });
  }, [currentRoom, handleLeaveRoom, navigate]);

  const handleConfirmTerms = useCallback(() => {
    setTermsConfirmOpen(false);
    if (!currentRoom) {
      navigate("/terms");
      return;
    }
    handleLeaveRoom(() => {
      navigate("/terms");
    });
  }, [currentRoom, handleLeaveRoom, navigate]);

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

  const navigationConfirmText = useMemo(() => {
    if (!navigationConfirmTarget) return null;
    const targetLabel =
      navigationConfirmTarget === "rooms"
        ? "房間列表"
        : navigationConfirmTarget === "collections"
          ? "收藏庫"
          : "生涯總覽";
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

  const dialogs = (
    <>
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
    </>
  );

  return {
    dialogs,
    handleLoginRequest,
    handleLogoutRequest,
    handleNavigateCollections: () => handleNavigateRequest("collections"),
    handleNavigateHistory: () => handleNavigateRequest("history"),
    handleNavigateRooms: () => handleNavigateRequest("rooms"),
    handleNavigateSettings: () => handleNavigateRequest("settings"),
    handlePrivacyRequest,
    handleTermsRequest,
  };
}
