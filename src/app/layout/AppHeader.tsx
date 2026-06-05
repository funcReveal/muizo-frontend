import {
  AccountCircleRounded,
  ExpandMore,
  LibraryMusic,
  LockOutlined,
  Login,
  Logout,
  MeetingRoom,
  Policy,
  Settings,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuItem,
  MenuList,
  Popover,
  Typography,
} from "@mui/material";
import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SiteAnnouncementNotice from "@/shared/announcement/SiteAnnouncementNotice";
import { isCareerFeatureEnabled } from "@/shared/config/featureFlags";
import BrandLogo from "@/shared/ui/BrandLogo";

interface AppHeaderProps {
  displayUsername: string;
  hasGuestIdentity?: boolean;
  authUser?: {
    id: string;
    email?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  } | null;
  authLoading?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  onEditProfile?: () => void;
  onNavigateRooms?: () => void;
  onNavigateCollections?: () => void;
  onNavigateCareer?: () => void;
  onNavigateSettings?: () => void;
  onNavigatePrivacy?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  displayUsername,
  hasGuestIdentity = false,
  authUser,
  authLoading = false,
  onLogin,
  onLogout,
  onNavigateRooms,
  onNavigateCollections,
  onNavigateCareer,
  onNavigateSettings,
  onNavigatePrivacy,
}) => {
  const navigate = useNavigate();

  const authLabel =
    authUser?.display_name || authUser?.id || displayUsername || "Guest";
  const isAnonymousVisitor = !authUser && !hasGuestIdentity;
  const isGuestVisitor = !authUser && hasGuestIdentity;

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

  const isMenuOpen = Boolean(menuAnchorEl);
  const menuId = isMenuOpen ? "header-menu-popover" : undefined;

  const handleMenuToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl((prev) => (prev ? null : event.currentTarget));
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleBrandNavigate = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (authUser || hasGuestIdentity) {
        if (onNavigateRooms) {
          onNavigateRooms();
          return;
        }
        navigate("/rooms");
        return;
      }
      navigate("/");
    },
    [authUser, hasGuestIdentity, navigate, onNavigateRooms],
  );

  const menuItemSx = useMemo(
    () => ({
      px: 2,
      py: 1.1,
      gap: 1.5,
      "&:hover": {
        background:
          "linear-gradient(90deg, rgba(56, 189, 248, 0.14), rgba(129, 140, 248, 0.08))",
      },
      "& .MuiListItemText-primary": {
        color: "#e2e8f0",
        fontWeight: 600,
        fontSize: "0.92rem",
      },
      "& .MuiListItemText-secondary": {
        color: "rgba(148, 163, 184, 0.85)",
        fontSize: "0.72rem",
        marginTop: "2px",
      },
    }),
    [],
  );

  const handleNavigateCareer = () => {
    if (!isCareerFeatureEnabled) return;

    handleMenuClose();

    if (isAnonymousVisitor) {
      onLogin?.();
      return;
    }

    if (onNavigateCareer) {
      onNavigateCareer();
      return;
    }

    navigate("/career");
  };

  const authMenuItems = authUser
    ? [
        <MenuItem
          key="profile-career"
          onClick={() => {
            handleNavigateCareer();
          }}
          disabled={!isCareerFeatureEnabled}
          sx={menuItemSx}
        >
          <ListItemIcon sx={{ minWidth: 30, color: "#7dd3fc" }}>
            <AccountCircleRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="個人資料"
            secondary={
              isCareerFeatureEnabled
                ? "查看生涯紀錄、題庫戰績與編輯暱稱"
                : "個人資料功能暫時維護中"
            }
          />
        </MenuItem>,
      ]
    : hasGuestIdentity
      ? [
          <MenuItem
            key="login"
            onClick={() => {
              handleMenuClose();
              onLogin?.();
            }}
            disabled={authLoading}
            sx={menuItemSx}
          >
            <ListItemIcon sx={{ minWidth: 30, color: "#38bdf8" }}>
              <Login fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={authLoading ? "登入中..." : "使用 Google 登入"}
              secondary="啟用完整帳號同步功能"
            />
          </MenuItem>,
          <MenuItem
            key="guest-profile-career"
            onClick={() => {
              handleNavigateCareer();
            }}
            disabled={!isCareerFeatureEnabled}
            sx={menuItemSx}
          >
            <ListItemIcon sx={{ minWidth: 30, color: "#7dd3fc" }}>
              <AccountCircleRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                isCareerFeatureEnabled ? (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.7,
                    }}
                  >
                    <LockOutlined sx={{ fontSize: 14, color: "#fbbf24" }} />
                    個人資料
                  </Box>
                ) : (
                  "個人資料"
                )
              }
              secondary={
                isCareerFeatureEnabled
                  ? "登入後查看完整紀錄，並可編輯暱稱"
                  : "個人資料功能暫時維護中"
              }
            />
          </MenuItem>,
        ]
      : [
          <MenuItem
            key="login"
            onClick={() => {
              handleMenuClose();
              onLogin?.();
            }}
            disabled={authLoading}
            sx={menuItemSx}
          >
            <ListItemIcon sx={{ minWidth: 30, color: "#38bdf8" }}>
              <Login fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={authLoading ? "登入中..." : "登入 / 開始使用"}
              secondary="登入後可解鎖完整功能"
            />
          </MenuItem>,
          <MenuItem
            key="anonymous-profile-career"
            onClick={() => {
              handleNavigateCareer();
            }}
            disabled={!isCareerFeatureEnabled}
            sx={menuItemSx}
          >
            <ListItemIcon
              sx={{
                minWidth: 30,
                color: !isCareerFeatureEnabled
                  ? "rgba(148, 163, 184, 0.55)"
                  : "#7dd3fc",
              }}
            >
              <AccountCircleRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                !isCareerFeatureEnabled ? (
                  "個人資料"
                ) : (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.7,
                    }}
                  >
                    <LockOutlined sx={{ fontSize: 14, color: "#fbbf24" }} />
                    個人資料
                  </Box>
                )
              }
              secondary={
                isCareerFeatureEnabled
                  ? "登入後可查看生涯紀錄與題庫戰績"
                  : "個人資料功能暫時維護中"
              }
            />
          </MenuItem>,
        ];

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
        ) : isGuestVisitor ? (
          <button
            type="button"
            onClick={handleMenuToggle}
            className="app-header-profile-pill app-header-profile-pill-guest group max-w-full"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
          >
            <span className="app-header-profile-kicker">訪客</span>
            <span className="app-header-profile-divider" />
            <span className="app-header-profile-avatar-fallback">
              {authLabel?.[0]?.toUpperCase() ?? "?"}
            </span>
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
            <span className="inline-flex items-center gap-2">
              <span className="app-header-login-dot" />
              登入 Login
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
              minWidth: 260,
              borderRadius: 2.5,
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background:
                "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))",
              boxShadow:
                "0 18px 40px rgba(2, 6, 23, 0.45), 0 0 0 1px rgba(14, 165, 233, 0.08)",
              backdropFilter: "blur(16px)",
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
                "linear-gradient(90deg, rgba(14, 165, 233, 0.12), rgba(129, 140, 248, 0.05))",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#e2e8f0",
                  fontSize: "1rem",
                  fontWeight: 800,
                  lineHeight: 1.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {isAnonymousVisitor ? "尚未登入" : authLabel}
              </Typography>
            </Box>
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
                  transition:
                    "color 160ms ease, opacity 160ms ease",
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

          <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.14)" }} />

          <MenuList sx={{ py: 0 }}>
            {authMenuItems}

            <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.12)" }} />

            <MenuItem
              onClick={() => {
                handleMenuClose();
                if (onNavigateRooms) {
                  onNavigateRooms();
                  return;
                }
                navigate("/rooms");
              }}
              sx={menuItemSx}
            >
              <ListItemIcon sx={{ minWidth: 30, color: "#fde68a" }}>
                <MeetingRoom fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="房間大廳"
                secondary={
                  isAnonymousVisitor
                    ? "先登入即可開始完整對戰體驗"
                    : "建立與加入遊戲房間"
                }
              />
            </MenuItem>

            {!authUser ? (
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  onLogin?.();
                }}
                sx={menuItemSx}
              >
                <ListItemIcon sx={{ minWidth: 30, color: "#a7f3d0" }}>
                  <LibraryMusic fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.7,
                      }}
                    >
                      <LockOutlined sx={{ fontSize: 14, color: "#fbbf24" }} />
                      收藏庫
                    </Box>
                  }
                  secondary="登入後可建立與編輯題庫"
                />
              </MenuItem>
            ) : (
              authUser && (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    if (onNavigateCollections) {
                      onNavigateCollections();
                      return;
                    }
                    navigate("/collections");
                  }}
                  sx={menuItemSx}
                >
                  <ListItemIcon sx={{ minWidth: 30, color: "#a7f3d0" }}>
                    <LibraryMusic fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="收藏庫"
                    secondary="創建公開收藏庫 & 管理你的收藏庫"
                  />
                </MenuItem>
              )
            )}
          </MenuList>

          {!isAnonymousVisitor && (
            <MenuItem
              onClick={() => {
                handleMenuClose();
                if (onNavigateSettings) {
                  onNavigateSettings();
                }
              }}
              sx={menuItemSx}
            >
              <ListItemIcon sx={{ minWidth: 30, color: "#c4b5fd" }}>
                <Settings fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="設定"
                secondary="調整快捷鍵、遊玩音量與房間大廳背景音"
              />
            </MenuItem>
          )}

          <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.12)" }} />

          <MenuItem
            onClick={() => {
              handleMenuClose();
              if (onNavigatePrivacy) {
                onNavigatePrivacy();
                return;
              }
              navigate("/privacy");
            }}
            sx={menuItemSx}
          >
            <ListItemIcon sx={{ minWidth: 30, color: "#93c5fd" }}>
              <Policy fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="法律與政策"
              secondary="隱私權政策與服務條款"
            />
          </MenuItem>
        </Popover>
      </div>
    </header>
  );
};

export default React.memo(AppHeader);
