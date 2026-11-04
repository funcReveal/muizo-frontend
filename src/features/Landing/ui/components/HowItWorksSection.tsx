import { HOW_IT_WORKS_STEPS } from "../../model/landingContent";
import { Link } from "react-router-dom";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";

export default function HowItWorksSection() {
  return (
    <section className="landing-guide" aria-labelledby="landing-guide-title">
      <header className="landing-section-heading">
        <h2 id="landing-guide-title">開一場猜歌</h2>
        <Link to="/rooms">前往大廳<ArrowForwardRounded aria-hidden="true" /></Link>
      </header>
      <ol className="landing-guide-step-list">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="landing-guide-step-number" aria-hidden="true">{String(index + 1).padStart(2,"0")}</span>
            <div><h3>{step.title}</h3><p>{step.description}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
