import {
  AccountCircleOutlined,
  AccountCircleRounded,
  Bookmarks,
  ExpandMore,
  LibraryMusic,
  LockOutlined,
  Logout,
  MeetingRoom,
  Policy,
  Settings,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import { Box, Divider, Popover, Typography } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteAnnouncementNotice from "@/shared/announcement/SiteAnnouncementNotice";
import { isCareerFeatureEnabled } from "@/shared/config/featureFlags";
import BrandLogo from "@/shared/ui/BrandLogo";
import AuthEntryDialog, {
  type AuthFeaturePreview,
} from "@/shared/ui/auth/AuthEntryDialog";

const AUTH_REDIRECT_TARGET_KEY = "muizo_auth_redirect_target";

const consumeStoredRedirectTarget = () => {
  if (typeof window === "undefined") return null;
  const target = window.sessionStorage.getItem(AUTH_REDIRECT_TARGET_KEY);
  window.sessionStorage.removeItem(AUTH_REDIRECT_TARGET_KEY);
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  return target;
};

const clearStoredRedirectTarget = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_REDIRECT_TARGET_KEY);
};

type FeatureKey =
  | "rooms"
  | "career"
  | "collections"
  | "favorites"
  | "settings"
  | "legal";

const getMembershipLabel = ({
  role,
  plan,
}: {
  role?: string | null;
  plan?: string | null;
}) => {
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

const isUpgradeableMembership = ({
  role,
  plan,
}: {
  role?: string | null;
  plan?: string | null;
}) => {
  if (role === "admin") return false;
  const normalizedPlan = plan?.trim().toLowerCase();
  return !["premium", "business", "unlimited"].includes(normalizedPlan ?? "");
};

interface AppHeaderProps {
  displayUsername: string;
  authUser?: {
    id: string;
    email?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    plan?: string | null;
  } | null;
  authLoading?: boolean;
  onLogin?: () => void;
  onEmailLogin?: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onEmailRegister?: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onPasswordResetRequest?: (email: string) => Promise<boolean>;
  onResendVerification?: (email: string) => Promise<boolean>;
  onLogout?: () => void;
  onEditProfile?: () => void;
  onNavigateRooms?: () => void;
  onNavigateCollections?: () => void;
  onNavigateFavorites?: () => void;
  onNavigateCareer?: () => void;
  onNavigateSettings?: () => void;
  onNavigatePrivacy?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  displayUsername,
  authUser,
  authLoading = false,
  onLogin,
  onEmailLogin,
  onEmailRegister,
  onPasswordResetRequest,
  onResendVerification,
  onLogout,
  onNavigateRooms,
  onNavigateCollections,
  onNavigateFavorites,
  onNavigateCareer,
  onNavigateSettings,
  onNavigatePrivacy,
}) => {
  const navigate = useNavigate();

  const authLabel =
    authUser?.display_name || authUser?.id || displayUsername || "Muizo";
  const isAnonymousVisitor = !authUser;
  const membershipLabel = authUser
    ? getMembershipLabel({
        role: authUser.role,
        plan: authUser.plan,
      })
    : null;
  const canUpgradeMembership = authUser
    ? isUpgradeableMembership({
        role: authUser.role,
        plan: authUser.plan,
      })
    : false;

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAuthTarget, setPendingAuthTarget] = useState<string | null>(
    null,
  );
  const [pendingAuthFeatureKey, setPendingAuthFeatureKey] =
    useState<FeatureKey | null>(null);

  const isMenuOpen = Boolean(menuAnchorEl);
  const menuId = isMenuOpen ? "header-menu-popover" : undefined;

  const handleMenuToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl((prev) => (prev ? null : event.currentTarget));
  };

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const storeRedirectTarget = (targetPath: string) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(AUTH_REDIRECT_TARGET_KEY, targetPath);
  };

  const openAuthDialog = useCallback(
    (targetPath?: string | null, featureKey?: FeatureKey | null) => {
      if (targetPath) {
        setPendingAuthTarget(targetPath);
        storeRedirectTarget(targetPath);
      }
      setPendingAuthFeatureKey(featureKey ?? null);
      handleMenuClose();
      setAuthDialogOpen(true);
    },
    [handleMenuClose],
  );

  const handlePostLoginSuccess = () => {
    const target = pendingAuthTarget ?? consumeStoredRedirectTarget();
    if (!target) return;
    clearStoredRedirectTarget();
    navigate(target);
    setPendingAuthTarget(null);
  };

  useEffect(() => {
    if (!authUser || authLoading) return;
    const target = consumeStoredRedirectTarget();
    if (!target) return;
    navigate(target);
  }, [authLoading, authUser, navigate]);

  const handleBrandNavigate = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (authUser) {
        if (onNavigateRooms) {
          onNavigateRooms();
          return;
        }
        navigate("/rooms");
        return;
      }
      navigate("/");
    },
    [authUser, navigate, onNavigateRooms],
  );

  const handleNavigateCareer = useCallback(() => {
    if (!isCareerFeatureEnabled) return;

    handleMenuClose();

    if (isAnonymousVisitor) {
      openAuthDialog("/career", "career");
      return;
    }

    if (onNavigateCareer) {
      onNavigateCareer();
      return;
    }

    navigate("/career");
  }, [
    handleMenuClose,
    isAnonymousVisitor,
    navigate,
    onNavigateCareer,
    openAuthDialog,
  ]);

  const features = useMemo(
    () => [
      {
        key: "rooms" as const,
        label: "房間大廳",
        eyebrow: "Play",
        title: "建立或加入遊戲房間",
        description: isAnonymousVisitor
          ? "先瀏覽房間大廳，登入後即可建立房間、加入對戰並保存遊玩紀錄。"
          : "快速回到房間大廳，建立新房或加入朋友的對戰。",
        icon: <MeetingRoom fontSize="small" />,
        iconColor: "#fde68a",
        path: "/rooms",
        requiresAuth: false,
        actionLabel: "前往房間大廳",
        action: () => {
          if (onNavigateRooms) {
            onNavigateRooms();
            return;
          }
          navigate("/rooms");
        },
      },
      {
        key: "career" as const,
        label: "個人資料",
        eyebrow: "Career",
        title: "查看生涯紀錄與題庫戰績",
        description: isCareerFeatureEnabled
          ? "追蹤你的對戰歷史、排行表現與收藏庫挑戰紀錄。"
          : "個人資料功能暫時維護中。",
        icon: <AccountCircleRounded fontSize="small" />,
        iconColor: "#7dd3fc",
        path: "/career",
        requiresAuth: true,
        disabled: !isCareerFeatureEnabled,
        actionLabel: isAnonymousVisitor ? "登入後查看" : "查看個人資料",
        action: handleNavigateCareer,
      },
      {
        key: "collections" as const,
        label: "收藏庫",
        eyebrow: "Library",
        title: "建立自己的音樂收藏庫",
        description: "建立公開收藏庫、整理私人題庫，並快速套用到遊戲房間。",
        icon: <LibraryMusic fontSize="small" />,
        iconColor: "#a7f3d0",
        path: "/collections",
        requiresAuth: true,
        actionLabel: isAnonymousVisitor ? "登入後管理" : "前往收藏庫",
        action: () => {
          if (onNavigateCollections) {
            onNavigateCollections();
            return;
          }
          navigate("/collections");
        },
      },
      {
        key: "favorites" as const,
        label: "收藏歌曲",
        eyebrow: "Saved",
        title: "回顧遊戲中標記的歌曲",
        description: "查看你在遊玩過程收藏的歌曲與影片，方便之後回聽。",
        icon: <Bookmarks fontSize="small" />,
        iconColor: "#67e8f9",
        path: "/me/favorites",
        requiresAuth: true,
        actionLabel: isAnonymousVisitor ? "登入後查看" : "查看收藏歌曲",
        action: () => {
          if (onNavigateFavorites) {
            onNavigateFavorites();
            return;
          }
          navigate("/me/favorites");
        },
      },
      {
        key: "settings" as const,
        label: "設定",
        eyebrow: "Settings",
        title: "調整遊玩偏好",
        description: "調整快捷鍵、遊玩音量與房間大廳背景音。",
        icon: <Settings fontSize="small" />,
        iconColor: "#c4b5fd",
        requiresAuth: false,
        actionLabel: "開啟設定",
        action: () => {
          onNavigateSettings?.();
        },
      },
      {
        key: "legal" as const,
        label: "法律與政策",
        eyebrow: "Policy",
        title: "查看服務條款與隱私權政策",
        description: "了解 Muizo 如何處理資料、帳號與第三方服務授權。",
        icon: <Policy fontSize="small" />,
        iconColor: "#93c5fd",
        path: "/privacy",
        requiresAuth: false,
        actionLabel: "查看法律與政策",
        action: () => {
          if (onNavigatePrivacy) {
            onNavigatePrivacy();
            return;
          }
          navigate("/privacy");
        },
      },
    ],
    [
      handleNavigateCareer,
      isAnonymousVisitor,
      navigate,
      onNavigateCollections,
      onNavigateFavorites,
      onNavigatePrivacy,
      onNavigateRooms,
      onNavigateSettings,
    ],
  );

  const pendingAuthFeature = pendingAuthFeatureKey
    ? features.find((feature) => feature.key === pendingAuthFeatureKey)
    : null;

  const authFeaturePreview: AuthFeaturePreview | null = pendingAuthFeature
    ? {
        eyebrow: pendingAuthFeature.eyebrow,
        title: pendingAuthFeature.title,
        description: pendingAuthFeature.description,
        icon: pendingAuthFeature.icon,
        accentColor: pendingAuthFeature.iconColor,
        actionLabel: pendingAuthFeature.actionLabel,
      }
    : null;

  const handleFeatureSelect = (feature: (typeof features)[number]) => {
    if (feature.disabled) return;
    if (feature.requiresAuth && !authUser && feature.path) {
      openAuthDialog(feature.path, feature.key);
      return;
    }
    handleMenuClose();
    feature.action();
  };

  const handleUpgradeMembership = () => {
    handleMenuClose();
    navigate("/membership");
  };

  return (
    <header className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-2 text-(--mc-text) sm:gap-x-4 md:flex-nowrap">
      <div className="order-1 flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
        <button
          type="button"
          onClick={handleBrandNavigate}
          onPointerUp={(event) => {
            event.currentTarget.blur();
          }}
          className="inline-flex shrink-0 cursor-pointer items-center px-1.5 py-2 transition sm:px-3"
        >
          <BrandLogo compact />
        </button>

        <SiteAnnouncementNotice className="hidden max-w-[520px] md:flex" />
        <SiteAnnouncementNotice
          compact
          className="flex max-w-[min(52vw,240px)] flex-1 md:hidden"
        />
      </div>

      <div className="relative order-2 flex min-w-0 shrink-0 items-center justify-end md:flex-[0_1_auto]">
        {authUser ? (
          <button
            type="button"
            onClick={handleMenuToggle}
            className="app-header-profile-pill app-header-profile-pill-auth group max-w-full"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
          >
            {authUser.avatar_url ? (
              <img
                src={authUser.avatar_url}
                alt={authLabel}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="app-header-profile-avatar-fallback">
                {authLabel?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <span className="app-header-profile-label">{authLabel}</span>
            <span
              className={`app-header-profile-chevron ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            >
              <ExpandMore />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleMenuToggle}
            className="app-header-login-pill group"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
          >
            <span className="app-header-login-icon" aria-hidden="true">
              <AccountCircleOutlined sx={{ fontSize: 24 }} />
            </span>
            <span className="app-header-login-copy">
              <span className="app-header-login-text">登入</span>
            </span>
            <span
              className={`app-header-profile-chevron ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            >
              <ExpandMore />
            </span>
          </button>
        )}

        <Popover
          id={menuId}
          open={isMenuOpen}
          anchorEl={menuAnchorEl}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            className: "app-header-menu-popover",
            sx: {
              mt: 1.5,
              minWidth: 292,
              borderRadius: 2.5,
              border: "1px solid rgba(245, 158, 11, 0.18)",
              background:
                "radial-gradient(220px 140px at 16% 0%, rgba(245, 158, 11, 0.12), transparent 68%), linear-gradient(180deg, rgba(18, 17, 16, 0.98), rgba(7, 8, 11, 0.98))",
              boxShadow:
                "0 22px 54px rgba(2, 6, 23, 0.56), 0 0 0 1px rgba(245, 158, 11, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(18px) saturate(1.08)",
              overflow: "hidden",
            },
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.6,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              background:
                "linear-gradient(90deg, rgba(245, 158, 11, 0.11), rgba(255, 255, 255, 0.025))",
            }}
          >
            {isAnonymousVisitor ? (
              <Box
                component="button"
                type="button"
                onClick={() => openAuthDialog(null, null)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.9,
                  width: "100%",
                  minHeight: 44,
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 999,
                  background:
                    "linear-gradient(180deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.07)), rgba(12, 10, 8, 0.44)",
                  color: "rgba(255, 251, 235, 0.96)",
                  cursor: "pointer",
                  fontSize: "0.92rem",
                  fontWeight: 900,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 32px -28px rgba(245,158,11,0.72)",
                  transition:
                    "border-color 160ms ease, transform 160ms ease, filter 160ms ease",
                  "&:hover": {
                    borderColor: "rgba(245, 158, 11, 0.5)",
                    filter: "brightness(1.06)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <AccountCircleOutlined sx={{ fontSize: 18 }} />
                登入
              </Box>
            ) : (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1.1,
                  minWidth: 0,
                }}
              >
                {authUser.avatar_url ? (
                  <Box
                    component="img"
                    src={authUser.avatar_url}
                    alt={authLabel}
                    referrerPolicy="no-referrer"
                    sx={{
                      width: 34,
                      height: 34,
                      flex: "0 0 auto",
                      borderRadius: 999,
                      objectFit: "cover",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />
                ) : (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      flex: "0 0 auto",
                      borderRadius: 999,
                      border: "1px solid rgba(245, 158, 11, 0.24)",
                      background:
                        "linear-gradient(180deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.06)), rgba(15, 23, 42, 0.5)",
                      color: "rgba(255, 251, 235, 0.96)",
                      fontSize: "0.78rem",
                      fontWeight: 900,
                    }}
                  >
                    {authLabel?.[0]?.toUpperCase() ?? "?"}
                  </Box>
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: "rgba(253, 230, 138, 0.84)",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      letterSpacing: 0,
                      lineHeight: 1.1,
                    }}
                  >
                    {membershipLabel}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#e2e8f0",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      lineHeight: 1.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {authLabel}
                  </Typography>
                </Box>
              </Box>
            )}
            {authUser && (
              <Box
                component="button"
                type="button"
                aria-label={canUpgradeMembership ? "升級會員" : "會員已升級"}
                title={canUpgradeMembership ? "升級會員" : "會員已升級"}
                disabled={!canUpgradeMembership}
                onClick={handleUpgradeMembership}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.45,
                  flexShrink: 0,
                  minHeight: 32,
                  border: "1px solid rgba(245, 158, 11, 0.28)",
                  borderRadius: 999,
                  background: canUpgradeMembership
                    ? "rgba(245, 158, 11, 0.11)"
                    : "rgba(148, 163, 184, 0.08)",
                  color: canUpgradeMembership
                    ? "rgba(255, 251, 235, 0.96)"
                    : "rgba(203, 213, 225, 0.58)",
                  cursor: canUpgradeMembership ? "pointer" : "default",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  px: 1.15,
                  transition:
                    "border-color 160ms ease, background 160ms ease, color 160ms ease",
                  "&:hover": canUpgradeMembership
                    ? {
                        borderColor: "rgba(245, 158, 11, 0.48)",
                        background: "rgba(245, 158, 11, 0.16)",
                      }
                    : undefined,
                }}
              >
                <WorkspacePremiumRounded sx={{ fontSize: 15 }} />
                {canUpgradeMembership ? "升級" : "已升級"}
              </Box>
            )}
            {authUser && (
              <Box
                component="button"
                type="button"
                aria-label="登出"
                title="登出"
                onClick={() => {
                  handleMenuClose();
                  onLogout?.();
                }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.6,
                  flexShrink: 0,
                  minHeight: 34,
                  border: 0,
                  background: "transparent",
                  color: "#fecaca",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  padding: "0 2px",
                  transition: "color 160ms ease, opacity 160ms ease",
                  "&:hover": {
                    color: "#fee2e2",
                    opacity: 0.92,
                  },
                }}
              >
                <Logout sx={{ fontSize: 17 }} />
                登出
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: "rgba(245, 158, 11, 0.1)" }} />

          <Box
            sx={{
              display: "grid",
              gap: 0.5,
              p: 1,
              minWidth: { xs: 292, sm: 340 },
              maxWidth: "calc(100vw - 24px)",
            }}
            role="menu"
            aria-label="功能選單"
          >
            {features.map((feature) => {
              const locked = Boolean(feature.requiresAuth && !authUser);
              return (
                <Box
                  key={feature.key}
                  component="button"
                  type="button"
                  role="menuitem"
                  disabled={feature.disabled}
                  onClick={() => handleFeatureSelect(feature)}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: 1.2,
                    minHeight: 52,
                    width: "100%",
                    border: 0,
                    borderRadius: 1.75,
                    background: "transparent",
                    color: feature.disabled
                      ? "rgba(148,163,184,0.45)"
                      : "#e2e8f0",
                    cursor: feature.disabled ? "not-allowed" : "pointer",
                    px: 1.2,
                    py: 0.85,
                    textAlign: "left",
                    transition: "background 160ms ease, color 160ms ease",
                    "&:hover": {
                      background: feature.disabled
                        ? "transparent"
                        : "linear-gradient(90deg, rgba(245,158,11,0.09), rgba(255,255,255,0.025))",
                      color: feature.disabled
                        ? "rgba(148,163,184,0.45)"
                        : "rgba(255,251,235,0.96)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      color: feature.iconColor,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "inherit",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        lineHeight: 1.25,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {feature.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 0.25,
                        color: "rgba(148,163,184,0.82)",
                        fontSize: "0.72rem",
                        lineHeight: 1.25,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {feature.title}
                    </Typography>
                  </Box>
                  {locked ? (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.55,
                        color: "rgba(251,191,36,0.9)",
                        fontSize: "0.7rem",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Box
                        component="span"
                        sx={{ display: { xs: "none", sm: "inline" } }}
                      >
                        登入解鎖
                      </Box>
                      <LockOutlined sx={{ fontSize: 15 }} />
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        </Popover>

        {onLogin &&
        onEmailLogin &&
        onEmailRegister &&
        onPasswordResetRequest &&
        onResendVerification ? (
          <AuthEntryDialog
            open={authDialogOpen && !authUser}
            onClose={() => setAuthDialogOpen(false)}
            onGoogleLogin={onLogin}
            onEmailLogin={onEmailLogin}
            onEmailRegister={onEmailRegister}
            onPasswordResetRequest={onPasswordResetRequest}
            onResendVerification={onResendVerification}
            authLoading={authLoading}
            onLoginSuccess={handlePostLoginSuccess}
            featurePreview={authFeaturePreview}
          />
        ) : null}
      </div>
    </header>
  );
};

export default React.memo(AppHeader);
