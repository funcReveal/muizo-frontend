import React from "react";

interface GoogleLoginCardProps {
  onGoogleLogin: () => void;
  googleLoading: boolean;
}

const GoogleLoginCard: React.FC<GoogleLoginCardProps> = ({
  onGoogleLogin,
  googleLoading,
}) => {
  return (
    <article className="landing-card landing-card-google">
      <header className="space-y-3">
        <span className="landing-badge landing-badge-recommended">
          推薦登入
        </span>
        <h3 className="landing-card-title">Google 登入</h3>
        <p className="landing-card-desc">
          你的進度與資料會穩定保存，避免重整後狀態遺失，也能跨裝置無縫延續。
        </p>
      </header>

      <ul className="landing-feature-list">
        <li className="landing-feature-item">
          同步 YouTube 播放清單，快速建立題庫
        </li>
        <li className="landing-feature-item">保留個人收藏與編輯紀錄</li>
        <li className="landing-feature-item">跨裝置延續登入狀態</li>
        <li className="landing-feature-item">新功能優先支援登入用戶</li>
      </ul>

      <div className="flex h-full flex-col justify-end">
        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={googleLoading}
          className="landing-button landing-button-google cursor-pointer flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center gap-2 ">
            {googleLoading ? "登入中..." : "透過 Google 登入"}
          </span>
        </button>
      </div>
    </article>
  );
};

export default GoogleLoginCard;
