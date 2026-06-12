import React from "react";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import { AUTH_COMPARISON_ROWS } from "../../model/landingContent";

const AuthComparisonSection: React.FC = () => {
  return (
    <section className="landing-info-block landing-info-block-compare">
      <header className="landing-info-header">
        <p className="landing-info-kicker">Account Benefits</p>
        <h3 className="landing-info-title landing-title-with-icon">
          <FactCheckRoundedIcon fontSize="small" />
          登入後保留完整體驗
        </h3>
        <p className="landing-info-subtitle">
          Muizo 會逐步收斂到帳號制，建議先登入再開始建立題庫與遊玩。
        </p>
      </header>

      <div className="landing-benefit-list" aria-label="帳號登入優勢">
        {AUTH_COMPARISON_ROWS.map((row) => (
          <div key={row.label} className="landing-benefit-item">
            <CheckCircleRoundedIcon
              className="landing-compare-icon"
              fontSize="inherit"
            />
            <span>
              <strong>{row.label}</strong>
              <small>{row.description}</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AuthComparisonSection;
