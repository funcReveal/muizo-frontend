import React from "react";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import { HOW_IT_WORKS_STEPS } from "../../model/landingContent";

const icons = [
  <MeetingRoomRoundedIcon fontSize="small" />,
  <GraphicEqRoundedIcon fontSize="small" />,
  <EmojiEventsRoundedIcon fontSize="small" />,
];

const HowItWorksSection: React.FC = () => {
  return (
    <section className="landing-info-block">
      <header className="landing-info-header">
        <p className="landing-info-kicker">How It Works</p>
        <h3 className="landing-info-title landing-title-with-icon">
          <AutoAwesomeRoundedIcon fontSize="small" />
          三步驟快速開局
        </h3>
      </header>
      <ol className="landing-step-list">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li key={step.title} className="landing-step-item">
            <span className="landing-step-index">{`0${index + 1}`}</span>
            <span className="landing-step-icon" aria-hidden="true">
              {icons[index]}
            </span>
            <div className="landing-step-content">
              <p className="landing-step-title">{step.title}</p>
              <p className="landing-step-desc">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default HowItWorksSection;
