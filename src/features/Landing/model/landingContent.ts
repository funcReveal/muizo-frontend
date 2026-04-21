export interface HowItWorksStep {
  title: string;
  description: string;
}

export interface AuthComparisonRow {
  label: string;
  guest: boolean;
  google: boolean;
}

export interface LandingUpdateItem {
  date: string;
  title: string;
  description: string;
}

export interface SearchDiscoveryItem {
  title: string;
  description: string;
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "建立或加入房間",
    description: "尋找想玩的猜歌題庫，進入房間或自己開房，一鍵邀請朋友加入多人猜歌。",
  },
  {
    title: "回合猜歌對戰",
    description: "系統隨機播放歌曲片段，玩家透過選項即時作答，進行線上猜歌對戰。",
  },
  {
    title: "即時結算排行",
    description: "記錄每回合分數與排名，猜歌遊戲結束後可看到勝負與各項數據。",
  },
];

export const AUTH_COMPARISON_ROWS: AuthComparisonRow[] = [
  { label: "遊玩功能", guest: true, google: true },
  { label: "匯入 YouTube 清單", guest: false, google: true },
  { label: "建立平台收藏庫", guest: false, google: true },
  { label: "跨裝置保存資料", guest: false, google: true },
  { label: "完整歷史資料", guest: false, google: true },
];

export const LANDING_UPDATES: LandingUpdateItem[] = [
  {
    date: "2026-03-05",
    title: "Landing 入口重構",
    description: "首頁改為雙入口引導，並加入登入方式比較與玩法導覽。",
  },
  {
    date: "2026-02-28",
    title: "房內設定視窗優化",
    description: "在房間中可直接開啟設定視窗，減少跳頁與中斷操作。",
  },
  {
    date: "2026-02-20",
    title: "收藏庫體驗強化",
    description: "改善播放清單整理流程，縮短建立題庫與回放的操作時間。",
  },
];

export const SEARCH_DISCOVERY_ITEMS: SearchDiscoveryItem[] = [
  {
    title: "線上猜歌遊戲",
    description:
      "Muizo 是可直接在瀏覽器開房的線上猜歌網站，適合朋友聚會、Discord 語音、直播互動或遠端派對一起玩。",
  },
  {
    title: "YouTube 歌曲問答",
    description:
      "登入後可匯入 YouTube 播放清單建立題庫，把華語流行、動漫歌、遊戲 BGM、J-POP、K-POP 變成猜歌挑戰。",
  },
  {
    title: "多人即時對戰",
    description:
      "房主建立房間後分享連結，玩家即時加入作答，系統自動處理播放、計分、排行榜與結算回顧。",
  },
];

export const SEO_FAQ_ITEMS: SeoFaqItem[] = [
  {
    question: "Muizo 可以用來玩線上猜歌嗎？",
    answer:
      "可以。Muizo 是多人即時猜歌平台，玩家可以建立房間、邀請朋友加入，透過歌曲片段進行猜歌遊戲。",
  },
  {
    question: "Muizo 支援 YouTube 播放清單嗎？",
    answer:
      "支援。登入 Google 後可以匯入 YouTube 播放清單，也可以建立平台收藏題庫，快速套用到猜歌房間。",
  },
  {
    question: "Muizo 適合哪些場合？",
    answer:
      "適合朋友聚會、線上派對、社群語音、直播互動與音樂主題活動，讓多人一起進行歌曲問答與排行榜競賽。",
  },
];
