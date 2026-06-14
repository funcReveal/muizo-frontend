import React from "react";
import { Link } from "react-router-dom";
import {
  AccountCircleRounded,
  AddCircleOutlineRounded,
  ArrowForwardRounded,
  BookmarksRounded,
  LibraryMusicRounded,
  MeetingRoomRounded,
  PersonRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";

import type { AuthUser } from "@shared/auth/AuthContext";
import { isCareerFeatureEnabled } from "@shared/config/featureFlags";
import AuthEntryPanel from "@shared/ui/auth/AuthEntryPanel";

interface GoogleLoginCardProps {
  authUser?: AuthUser | null;
  onGoogleLogin: () => void;
  onEmailLogin: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onEmailRegister: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  onPasswordResetRequest: (email: string) => Promise<boolean>;
  onResendVerification: (email: string) => Promise<boolean>;
  authLoading: boolean;
}

const entryActions = [
  {
    to: "/rooms",
    icon: <MeetingRoomRounded fontSize="small" />,
    title: "進入房間大廳",
    description: "建立房間、輸入代碼或接續最近的遊戲流程。",
    primary: true,
  },
  {
    to: "/collections/new",
    icon: <AddCircleOutlineRounded fontSize="small" />,
    title: "建立題庫",
    description: "貼上 YouTube 清單，或從帳號清單匯入歌曲。",
  },
  {
    to: "/collections",
    icon: <LibraryMusicRounded fontSize="small" />,
    title: "管理收藏庫",
    description: "整理自建題庫、公開狀態與可遊玩內容。",
  },
  {
    to: "/me/favorites",
    icon: <BookmarksRounded fontSize="small" />,
    title: "查看收藏歌曲",
    description: "回到遊戲中標記過的歌曲與 YouTube 影片。",
  },
  ...(isCareerFeatureEnabled
    ? [
        {
          to: "/career",
          icon: <AccountCircleRounded fontSize="small" />,
          title: "生涯總覽",
          description: "查看戰績、歷史紀錄與常玩的題庫表現。",
        },
      ]
    : []),
  {
    to: "/membership",
    icon: <WorkspacePremiumRounded fontSize="small" />,
    title: "會員升級",
    description: "查看目前身分與可升級項目。",
  },
] as const;

const formatMemberIdentity = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === "member" || normalized === "user") {
    return "一般會員";
  }

  if (normalized === "premium" || normalized === "pro") {
    return "進階會員";
  }

  if (normalized === "admin") {
    return "管理員";
  }

  return value?.trim() || "一般會員";
};

const AuthenticatedEntryCard: React.FC<{ authUser: AuthUser }> = ({
  authUser,
}) => {
  const displayName =
    authUser.display_name?.trim() || authUser.email?.trim() || "Muizo 會員";
  const memberIdentity = formatMemberIdentity(authUser.plan ?? authUser.role);

  return (
    <div className="landing-member-entry">
      <div className="landing-member-header">
        <div className="landing-member-avatar" aria-hidden="true">
          {authUser.avatar_url ? (
            <img src={authUser.avatar_url} alt="" />
          ) : (
            <PersonRounded fontSize="medium" />
          )}
        </div>
        <div className="min-w-0">
          <p className="landing-member-kicker">{memberIdentity}</p>
          <h2>{displayName}</h2>
        </div>
      </div>

      <Link className="landing-member-primary" to="/rooms">
        <span>
          <strong>前往房間大廳</strong>
          <small>開始建立房間、加入遊戲或選擇題庫。</small>
        </span>
        <ArrowForwardRounded fontSize="small" />
      </Link>

      <div className="landing-member-actions" aria-label="常用功能">
        {entryActions.slice(1).map((action) => (
          <Link key={action.to} className="landing-member-action" to={action.to}>
            <span className="landing-member-action-icon">{action.icon}</span>
            <span className="landing-member-action-copy">
              <strong>{action.title}</strong>
              <small>{action.description}</small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

const GoogleLoginCard: React.FC<GoogleLoginCardProps> = ({
  authUser,
  ...authEntryProps
}) => {
  return (
    <article
      className="landing-auth-card"
      aria-label={authUser ? "Muizo 功能入口" : "登入 Muizo"}
    >
      {authUser ? (
        <AuthenticatedEntryCard authUser={authUser} />
      ) : (
        <AuthEntryPanel {...authEntryProps} />
      )}
    </article>
  );
};

export default GoogleLoginCard;
