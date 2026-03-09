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

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "建立或加入房間",
    description: "尋找想玩的題庫，進入房間或自己開房，一鍵邀請朋友加入。",
  },
  {
    title: "回合猜歌對戰",
    description: "系統隨機播放題目，透過選項即時作答。",
  },
  {
    title: "即時結算排行",
    description: "記錄每回合分數與排名，結束後可看到勝負與各項數據。",
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
