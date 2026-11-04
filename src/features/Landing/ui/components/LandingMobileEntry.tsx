import {useState} from "react";
import {Link} from "react-router-dom";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import HeadphonesRounded from "@mui/icons-material/HeadphonesRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import Google from "@mui/icons-material/Google";
import MailOutlineRounded from "@mui/icons-material/MailOutlineRounded";
import AuthEntryPanel from "@shared/ui/auth/AuthEntryPanel";
import type {GoogleLoginCardProps} from "./GoogleLoginCard";

export default function LandingMobileEntry({authUser, ...authProps}: GoogleLoginCardProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const name = authUser?.display_name?.trim() || authUser?.email?.trim() || "玩家";

  return <div className="landing-mobile-entry" data-email-open={emailOpen}>
    <header className="landing-mobile-entry-header">
      <span className={authUser ? "landing-mobile-emblem landing-mobile-avatar" : "landing-mobile-emblem"} aria-hidden="true">
        {authUser ? (authUser.avatar_url ? <img src={authUser.avatar_url} alt="" /> : <PersonRounded />) : <HeadphonesRounded />}
      </span>
      <div>
        {!authUser && <p>和朋友一起搶答</p>}
        <h2>{authUser ? name : "準備好猜下一首了嗎？"}</h2>
      </div>
    </header>
    {authUser ? <div className="landing-mobile-entry-actions">
      <Link className="landing-mobile-play" to="/rooms"><PlayArrowRounded aria-hidden="true" /><strong>開始玩</strong><ArrowForwardRounded aria-hidden="true" /></Link>
      <Link className="landing-mobile-create" to="/collections/new"><LibraryMusicRounded aria-hidden="true" /><span>建立題庫</span><ArrowForwardRounded aria-hidden="true" /></Link>
    </div> : <>
      <div className="landing-mobile-login-choices" hidden={emailOpen}>
        <button className="landing-mobile-google" onClick={authProps.onGoogleLogin} disabled={authProps.authLoading}><Google aria-hidden="true" />{authProps.authLoading ? "連線中…" : "使用 Google 登入"}</button>
        <button className="landing-mobile-email" onClick={() => setEmailOpen(true)} disabled={authProps.authLoading}><MailOutlineRounded aria-hidden="true" />使用 Email 登入或註冊</button>
      </div>
      <div className="landing-mobile-email-form" hidden={!emailOpen}>
        <button type="button" className="landing-mobile-email-back" onClick={() => setEmailOpen(false)} disabled={authProps.authLoading}><ArrowBackRounded aria-hidden="true" />其他登入方式</button>
        <AuthEntryPanel {...authProps} emailOnly />
      </div>
    </>}
  </div>;
}
