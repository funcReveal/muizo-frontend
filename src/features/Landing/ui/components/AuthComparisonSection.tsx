import React from "react";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";

import { AUTH_COMPARISON_ROWS } from "../../model/landingContent";

const AuthComparisonSection: React.FC = () => {
  return (
    <section className="landing-info-block">
      <header className="landing-info-header">
        <p className="landing-info-kicker">Guest vs Google</p>
        <h3 className="landing-info-title landing-title-with-icon">
          <FactCheckRoundedIcon fontSize="small" />
          登入方式比較
        </h3>
      </header>

      <div className="landing-compare-table" role="table" aria-label="登入方式比較">
        <div className="landing-compare-row landing-compare-row-head" role="row">
          <span role="columnheader">功能</span>
          <span role="columnheader">訪客</span>
          <span role="columnheader">Google</span>
        </div>
        {AUTH_COMPARISON_ROWS.map((row) => (
          <div key={row.label} className="landing-compare-row" role="row">
            <span role="cell">{row.label}</span>
            <span role="cell" className={row.guest ? "is-yes" : "is-no"}>
              {row.guest ? (
                <CheckCircleRoundedIcon className="landing-compare-icon" fontSize="inherit" />
              ) : (
                <CancelRoundedIcon className="landing-compare-icon" fontSize="inherit" />
              )}
              {row.guest ? "可用" : "不支援"}
            </span>
            <span role="cell" className={row.google ? "is-yes" : "is-no"}>
              {row.google ? (
                <CheckCircleRoundedIcon className="landing-compare-icon" fontSize="inherit" />
              ) : (
                <CancelRoundedIcon className="landing-compare-icon" fontSize="inherit" />
              )}
              {row.google ? "可用" : "不支援"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AuthComparisonSection;
