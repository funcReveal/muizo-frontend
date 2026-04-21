import React from "react";

import {
  SEARCH_DISCOVERY_ITEMS,
  SEO_FAQ_ITEMS,
} from "../../model/landingContent";

const SearchDiscoverySection: React.FC = () => {
  return (
    <section className="landing-search-discovery">
      <div className="landing-search-copy">
        <h3 className="landing-search-title">
          想找猜歌遊戲、歌曲問答或多人音樂派對，都可以從 Muizo 開始
        </h3>
        <p className="landing-search-description">
          Muizo 專為朋友一起玩的線上猜歌體驗設計，支援即時房間、YouTube
          播放清單題庫、即時排行榜與結算回顧。無論是想玩華語流行猜歌、動漫歌曲問答、遊戲
          BGM 挑戰，或是 K-POP、J-POP 派對遊戲，都能快速開房邀請好友加入。
        </p>
      </div>

      <div className="landing-search-grid">
        {SEARCH_DISCOVERY_ITEMS.map((item) => (
          <article key={item.title} className="landing-search-card">
            <h4>{item.title}</h4>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="landing-faq-list" aria-label="Muizo 猜歌遊戲常見問題">
        {SEO_FAQ_ITEMS.map((item) => (
          <details key={item.question} className="landing-faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
};

export default SearchDiscoverySection;
