import { Link } from "react-router-dom";

export default function CommunityCallout() {
  const invite = import.meta.env.VITE_DISCORD_INVITE_URL?.trim();
  return <footer className="landing-community">
    <div className="landing-community-invite">
      <div><h2>一起聊聊音樂與 Muizo</h2><p>有想玩的題庫、功能建議，或遇到問題？來 Discord 告訴我們。</p></div>
      {invite ? <a href={invite} target="_blank" rel="noreferrer" className="landing-community-cta"><img src="/brand-icons/Discord-Symbol-Blurple.svg" width="22" height="18" alt="" />加入 Discord</a> : <span className="landing-community-unavailable">社群連結準備中</span>}
    </div>
    <div className="landing-footer-meta"><span>Muizo · 和朋友一起猜歌</span><nav aria-label="網站資訊"><Link to="/terms">服務條款</Link><Link to="/privacy">隱私權政策</Link></nav></div>
  </footer>;
}
