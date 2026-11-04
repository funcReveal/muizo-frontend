export interface HowItWorksStep {
  title: string;
  description: string;
}

export interface AuthComparisonRow {
  label: string;
  description: string;
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
  { title: "挑一份題庫", description: "選公開題庫，或匯入自己的 YouTube 歌單。" },
  { title: "邀朋友進房", description: "設定題數與作答時間，分享連結或六碼房號。" },
  { title: "聽歌，選答案", description: "聽片段搶答，每回合結束就能看見最新排名。" },
];

export const AUTH_COMPARISON_ROWS: AuthComparisonRow[] = [
  { label: "保存遊玩紀錄", description: "生涯戰績、排行榜表現與房間紀錄會綁定帳號。" },
  { label: "匯入 YouTube 清單", description: "登入 Google 後可把播放清單直接變成猜歌題庫。" },
  { label: "建立平台收藏庫", description: "整理自己的題庫，之後開房可快速套用。" },
  { label: "跨裝置延續", description: "換電腦或手機也能接回同一份收藏與設定。" },
  { label: "完整功能支援", description: "後續新功能會以登入帳號為主要使用路徑。" },
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
      "登入後可匯入 YouTube 播放清單建立題庫，把華語流行、動畫主題、遊戲配樂、J-POP、K-POP 變成猜歌挑戰。",
  },
  {
    title: "多人即時對戰",
    description:
      "房主建立房間後分享連結，玩家即時加入作答，系統自動處理播放、計分、排行榜與結算回顧。",
  },
];

export const SEO_FAQ_ITEMS: SeoFaqItem[] = [
  {
    question: "一定要先準備歌單嗎？",
    answer:
      "不用。到大廳選一份公開題庫，就能建立猜歌房間。想自己出題時，再建立專屬題庫。",
  },
  {
    question: "朋友已經開好房間，要怎麼加入？",
    answer:
      "直接開啟朋友分享的房間連結，或到大廳的「加入房間」輸入六碼房號，不需要輸入連字號。",
  },
  {
    question: "可以用自己的 YouTube 播放清單嗎？",
    answer:
      "可以。建立題庫時貼上公開或不公開的播放清單連結，再調整答案與播放片段。私人播放清單則需先連結 Google 帳號。",
  },
];
