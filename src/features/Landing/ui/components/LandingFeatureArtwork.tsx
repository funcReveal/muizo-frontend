type Props = { kind: "live" | "library" | "play" };

/** Lightweight previews of the actual answer panel, collection builder and host settings. */
export default function LandingFeatureArtwork({ kind }: Props) {
  return (
    <svg className={`landing-feature-art landing-feature-art--${kind}`} viewBox="0 0 240 154" fill="none" aria-hidden="true">
      <rect x=".5" y=".5" width="239" height="153" rx="12" fill="var(--mc-bg)" stroke="var(--mc-border)" />
      {kind === "live" && <>
        <g className="landing-live-answer">
          <text x="14" y="20" fill="var(--mc-text)" fontSize="9">聽片段，選答案</text>
          <circle cx="120" cy="47" r="18" stroke="var(--mc-surface-strong)" strokeWidth="2" />
          <path d="M120 29a18 18 0 1 1-17 24" stroke="var(--mc-accent)" strokeWidth="2" strokeLinecap="round" />
          <text x="120" y="52" textAnchor="middle" fill="var(--mc-accent)" fontSize="16">18</text>
          {[
            [12, 76, "夜に駆ける", "Q"], [124, 76, "群青", "W"],
            [12, 106, "アイドル", "A"], [124, 106, "怪物", "S"],
          ].map(([x, y, title, key]) => <g key={key}>
            <rect x={Number(x)} y={Number(y)} width="104" height="24" rx="7" fill="var(--mc-surface)" stroke="var(--mc-border)" />
            {key === "A" && <>
              <rect className="landing-answer-selected" x={Number(x)} y={Number(y)} width="104" height="24" rx="7" fill="var(--mc-accent-soft)" stroke="var(--mc-accent)" />
              <rect className="landing-answer-correct" x={Number(x)} y={Number(y)} width="104" height="24" rx="7" fill="var(--mc-success-surface)" stroke="var(--mc-success-border)" />
            </>}
            <text x={Number(x) + 7} y={Number(y) + 15} fill="var(--mc-text)" fontSize="8">{title}</text>
            <text x={Number(x) + 93} y={Number(y) + 15} fill="var(--mc-text-muted)" fontSize="7">{key}</text>
          </g>)}
          <path className="landing-answer-cursor" d="m88 115 2 14 4-5 6-1-12-8Z" fill="var(--mc-text)" stroke="var(--mc-bg)" strokeWidth="1" strokeLinejoin="round" />
          <text className="landing-answer-correct" x="120" y="145" textAnchor="middle" fill="var(--mc-success)" fontSize="8">答對了 · +300</text>
        </g>
        <g className="landing-live-ranking">
        <text x="14" y="21" fill="var(--mc-text)" fontWeight="500" fontSize="10">即時排行</text>
        <text x="190" y="21" className="landing-demo-muted">總分</text>
        <g className="landing-rank-rival">
          <rect x="12" y="34" width="216" height="28" rx="7" fill="var(--mc-surface)" />
          <text className="landing-rank-before" x="23" y="52" fill="var(--mc-accent)" fontSize="10">1</text>
          <text className="landing-rank-after" x="23" y="52" fill="var(--mc-text-muted)" fontSize="10">2</text>
          <circle cx="51" cy="48" r="8" fill="#6b587d" />
          <text x="68" y="52" fill="var(--mc-text)" fontSize="9">玩家 A</text>
          <text x="214" y="52" textAnchor="end" fill="var(--mc-text)" fontSize="10">980</text>
        </g>
        <g className="landing-rank-self">
          <rect x="12" y="68" width="216" height="28" rx="7" fill="var(--mc-accent-soft)" stroke="var(--mc-accent-border)" />
          <text className="landing-rank-before" x="23" y="86" fill="var(--mc-text-muted)" fontSize="10">2</text>
          <text className="landing-rank-after" x="23" y="86" fill="var(--mc-accent)" fontSize="10">1</text>
          <circle cx="51" cy="82" r="8" fill="#36577f" />
          <text x="68" y="86" fill="var(--mc-text)" fontSize="9">你</text>
          <text className="landing-rank-before" x="214" y="86" textAnchor="end" fill="var(--mc-text)" fontSize="10">920</text>
          <text className="landing-rank-after" x="214" y="86" textAnchor="end" fill="var(--mc-accent)" fontSize="10">1,220</text>
        </g>
        <rect x="12" y="102" width="216" height="28" rx="7" fill="var(--mc-surface)" />
        <text x="23" y="120" fill="var(--mc-text-muted)" fontSize="10">3</text>
        <circle cx="51" cy="116" r="8" fill="#6f6751" />
        <text x="68" y="120" fill="var(--mc-text-muted)" fontSize="9">玩家 B</text>
        <text x="214" y="120" textAnchor="end" fill="var(--mc-text-muted)" fontSize="10">760</text>
        <text className="landing-rank-after" x="120" y="145" textAnchor="middle" fill="var(--mc-accent)" fontSize="8">↑ 超越一位玩家 · +300</text>
        </g>
      </>}
      {kind === "library" && <>
        <g className="landing-library-input">
          <text x="14" y="21" fill="var(--mc-text)" fontWeight="500" fontSize="10">匯入歌單</text><text x="222" y="21" textAnchor="end" fill="var(--mc-text-muted)" fontSize="8">01 / 03</text>
          <text x="14" y="44" className="landing-demo-muted">YouTube 播放清單連結</text>
          <rect x="12" y="54" width="216" height="26" rx="8" fill="var(--mc-bg)" stroke="var(--mc-accent-border)" />
          <text className="landing-library-placeholder" x="21" y="70" fill="var(--mc-text-muted)" fontSize="8">貼上播放清單連結</text>
          <text className="landing-library-url" x="21" y="70" fill="var(--mc-text)" fontSize="8">youtube.com/playlist?list=…</text>
          <text x="14" y="99" className="landing-demo-muted">貼上連結，匯入歌曲</text>
          <rect x="156" y="112" width="72" height="25" rx="7" fill="var(--mc-accent)" />
          <text x="192" y="128" textAnchor="middle" fill="var(--mc-accent-ink)" fontSize="9">匯入</text>
        </g>
        <g className="landing-library-content">
          <text x="14" y="21" fill="var(--mc-text)" fontWeight="500" fontSize="10">播放清單內容</text>
          <text x="180" y="21" fill="#95c5a5" fontSize="8">已匯入 3 首</text>
          {[
            [40, "IRIS OUT", "米津玄師 · 2:34", "#a88c48"],
            [74, "JANE DOE", "米津玄師、宇多田ヒカル", "#5a8274"],
            [108, "アイドル", "YOASOBI · 3:46", "#806c83"],
          ].map(([y, title, detail, color]) => <g key={title}>
            <rect x="12" y={Number(y)} width="216" height="29" rx="6" fill="#181f1c" />
            <rect x="19" y={Number(y) + 5} width="19" height="19" rx="4" fill={String(color)} />
            <path d={`M27 ${Number(y) + 18}v-8l6-1v7m-6 2c0 3-5 3-5 1s5-4 5-1`} stroke="#e9e8cf" strokeWidth="1.2" strokeLinecap="round" />
            <text x="46" y={Number(y) + 12} fill="#e1e6d9" fontSize="8">{title}</text>
            <text x="46" y={Number(y) + 23} fill="#9da997" fontSize="6.5">{detail}</text>
            <text x="210" y={Number(y) + 18} fill="#a7cead" fontSize="9">✓</text>
          </g>)}
        </g>
        <g className="landing-library-edit">
          <text x="14" y="21" fill="var(--mc-text)" fontWeight="500" fontSize="10">檢查與調整</text>
          <text x="14" y="42" className="landing-demo-muted">答案</text>
          <rect x="12" y="49" width="216" height="24" rx="7" fill="var(--mc-surface)" stroke="var(--mc-accent-border)" />
          <text className="landing-library-before" x="21" y="64" fill="var(--mc-text-muted)" fontSize="8">米津玄師 - IRIS OUT</text>
          <text className="landing-library-after" x="21" y="64" fill="var(--mc-accent)" fontSize="9">IRIS OUT</text>
          <text x="14" y="88" className="landing-demo-muted">播放起始</text>
          <text x="128" y="88" className="landing-demo-muted">作答時間</text>
          <rect x="12" y="95" width="102" height="23" rx="6" fill="var(--mc-surface)" stroke="var(--mc-border)" />
          <rect x="126" y="95" width="102" height="23" rx="6" fill="var(--mc-surface)" stroke="var(--mc-border)" />
          <g className="landing-library-before" fill="var(--mc-text-muted)" fontSize="9"><text x="22" y="110">0:00</text><text x="136" y="110">30 秒</text></g>
          <g className="landing-library-after" fill="var(--mc-accent)" fontSize="9"><text x="22" y="110">0:35</text><text x="136" y="110">10 秒</text></g>
          <rect x="151" y="128" width="77" height="18" rx="6" fill="var(--mc-accent)" />
          <text x="189.5" y="140" textAnchor="middle" fill="var(--mc-accent-ink)" fontSize="8">發布題庫</text>
        </g>
        <g className="landing-library-success">
          <circle cx="120" cy="59" r="25" fill="var(--mc-success-surface)" stroke="var(--mc-success-border)" />
          <path className="landing-library-check" d="m108 59 8 8 16-17" stroke="var(--mc-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="120" y="106" textAnchor="middle" fill="var(--mc-text)" fontSize="14">發布成功</text>
          <text x="120" y="127" textAnchor="middle" fill="var(--mc-text-muted)" fontSize="8">可以用這份題庫開房了</text>
        </g>
      </>}
      {kind === "play" && <>
        <text x="14" y="20" fill="var(--mc-text)" fontSize="10">房間設定</text>
        <rect x="12" y="30" width="103" height="29" rx="8" fill="var(--mc-accent-soft)" stroke="var(--mc-accent-border)" />
        <text x="22" y="48" fill="var(--mc-accent)" fontSize="9">休閒派對</text>
        <rect x="123" y="30" width="105" height="29" rx="8" fill="var(--mc-surface)" stroke="var(--mc-border)" />
        <text x="132" y="48" fill="var(--mc-text)" fontSize="9">排行挑戰</text>
        <text x="208" y="48" fill="var(--mc-accent)" fontSize="7">30題</text>
        <text x="15" y="79" className="landing-demo-muted">人數</text>
        <text x="135" y="79" className="landing-demo-muted">題數</text>
        <text x="22" y="101" fill="var(--mc-text)" fontSize="15">4<tspan fontSize="8"> 人</tspan></text>
        {Array.from({length: 11}, (_, index) => <text key={index} className={`landing-demo-count${index === 0 ? " landing-demo-count-initial" : ""}${index === 10 ? " landing-demo-count-final" : ""}`} style={{animationDelay: `${index * .15}s`}} x="143" y="101" fill="var(--mc-text)" fontSize="15">{10 + index}<tspan fontSize="8"> 題</tspan></text>)}
        <g fill="var(--mc-text-muted)" fontSize="9"><text x="87" y="100">＋</text><text x="207" y="100">＋</text></g>
        <path d="M13 112h214" stroke="var(--mc-border)" />
        <text x="15" y="129" className="landing-demo-muted">揭曉時間</text>
        <text className="landing-demo-guess" x="195" y="129" fill="var(--mc-text)" fontSize="8">5s</text>
        <text className="landing-demo-reveal" x="195" y="129" fill="var(--mc-text)" fontSize="8">10s</text>
        <path d="M17 140h201" stroke="var(--mc-border)" strokeWidth="3" strokeLinecap="round" />
        <path className="landing-demo-track-fill" d="M17 140h44" stroke="var(--mc-accent)" strokeWidth="3" strokeLinecap="round" />
        <circle className="landing-demo-knob" cx="61" cy="140" r="4" fill="var(--mc-text)" />
      </>}
    </svg>
  );
}
