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
    description: "貼上房號或自己開房，朋友一鍵加入，開局前就能先同步題庫。",
  },
  {
    title: "回合猜歌對戰",
    description: "系統依序播放片段，大家即時作答，節奏快、互動密度高。",
  },
  {
    title: "即時結算排行",
    description: "每回合都更新分數與排名，結束後直接看到勝負與重點數據。",
  },
];

export const AUTH_COMPARISON_ROWS: AuthComparisonRow[] = [
  { label: "快速進入房間", guest: true, google: true },
  { label: "YouTube 題庫同步", guest: false, google: true },
  { label: "收藏與編輯紀錄保留", guest: false, google: true },
  { label: "跨裝置延續狀態", guest: false, google: true },
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
