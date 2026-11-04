import AddRounded from "@mui/icons-material/AddRounded";
import { SEO_FAQ_ITEMS } from "../../model/landingContent";

export default function SearchDiscoverySection() {
  return <section className="landing-faq" aria-labelledby="landing-faq-title">
    <h2 id="landing-faq-title">常見問題</h2>
    <div className="landing-faq-list">
      {SEO_FAQ_ITEMS.map((item) => <details key={item.question} className="landing-faq-item">
        <summary>{item.question}<AddRounded aria-hidden="true" /></summary>
        <p>{item.answer}</p>
      </details>)}
    </div>
  </section>;
}
