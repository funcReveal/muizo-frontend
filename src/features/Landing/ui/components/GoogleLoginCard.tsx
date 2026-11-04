import React from "react";
import { Link } from "react-router-dom";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";

import type { AuthUser } from "@shared/auth/AuthContext";
import AuthEntryPanel from "@shared/ui/auth/AuthEntryPanel";
import { useMediaQuery } from "@mui/material";
import LandingMobileEntry from "./LandingMobileEntry";

export interface GoogleLoginCardProps {
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

const AuthenticatedEntryCard: React.FC<{ authUser: AuthUser }> = ({
  authUser,
}) => {
  const displayName =
    authUser.display_name?.trim() || authUser.email?.trim() || "Muizo 會員";

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
          <h2>{displayName}</h2>
        </div>
      </div>

      <Link className="landing-member-path landing-member-path--play" to="/rooms">
        <span className="landing-member-path-icon" aria-hidden="true"><PlayArrowRounded /></span>
        <span className="landing-member-path-copy">
          <strong>開始玩</strong>
          <span>選題庫開房，或輸入房號加入朋友，一起搶答猜歌。</span>
        </span>
        <span className="landing-member-path-cta">進入房間 <ArrowForwardRounded fontSize="small" aria-hidden="true" /></span>
        <span className="landing-member-path-overlay" aria-hidden="true"><PlayArrowRounded /><strong>開始遊戲</strong><ArrowForwardRounded /></span>
      </Link>
      <Link className="landing-member-path landing-member-path--create" to="/collections/new">
        <span className="landing-member-path-icon" aria-hidden="true"><LibraryMusicRounded /></span>
        <span className="landing-member-path-copy">
          <strong>建立題庫</strong>
          <span>匯入播放清單、設定答案，把喜歡的歌變成題目。</span>
        </span>
        <span className="landing-member-path-cta">開始製作 <ArrowForwardRounded fontSize="small" aria-hidden="true" /></span>
        <span className="landing-member-path-overlay" aria-hidden="true"><LibraryMusicRounded /><strong>進入製作</strong><ArrowForwardRounded /></span>
      </Link>
    </div>
  );
};

const GoogleLoginCard: React.FC<GoogleLoginCardProps> = ({
  authUser,
  ...authEntryProps
}) => {
  const mobile = useMediaQuery("(max-width: 760px)", {noSsr: true});
  return (
    <article
      className="landing-auth-card"
      data-authenticated={Boolean(authUser)}
      aria-label={authUser ? "Muizo 功能入口" : "登入 Muizo"}
    >
      {mobile ? <LandingMobileEntry authUser={authUser} {...authEntryProps} /> : authUser ? (
        <AuthenticatedEntryCard authUser={authUser} />
      ) : (
        <AuthEntryPanel {...authEntryProps} />
      )}
    </article>
  );
};

export default GoogleLoginCard;
