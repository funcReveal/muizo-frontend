import type {
  SettingsCategoryMeta,
  SettingsPageCopy,
  SettingsSectionMeta,
} from "./settingsTypes";

export const SETTINGS_PAGE_COPY: SettingsPageCopy = {
  badge: "Control Deck",
  title: "設定",
  description: "管理按鍵與音訊偏好。所有調整會即時套用到目前裝置。",
};

export const SETTINGS_CATEGORIES: SettingsCategoryMeta[] = [
  {
    id: "audio",
    title: "音訊",
    subtitle: "歌曲、背景音與提示音",
  },
  {
    id: "controls",
    title: "操作",
    subtitle: "調整按鍵與作答手感",
  },
];

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: "keybindings",
    categoryId: "controls",
    title: "按鍵配置",
    description: "設定 Q/W/A/S 對應槽位，重複按鍵會自動交換，保持唯一。",
    status: "ready",
  },
  {
    id: "control-preview",
    categoryId: "controls",
    title: "操作預覽",
    description: "快速確認四個槽位與作答流程，避免進房後才發現按鍵衝突。",
    status: "ready",
  },
  {
    id: "sfx",
    categoryId: "audio",
    title: "音訊設定",
    description: "分開調整遊戲歌曲、背景音樂、提示音與結算試聽音量。",
    status: "ready",
  },
  {
    id: "avatar-effects",
    categoryId: "display",
    title: "玩家頭像特效",
    description: "調整玩家頭像的辨識度、名次外框與成就感呈現，並可直接預覽。",
    status: "ready",
  },
  {
    id: "scoreboard-effects",
    categoryId: "display",
    title: "排行榜邊框特效",
    description: "選擇排行榜高光玩家的邊框風格，並可直接預覽動畫效果。",
    status: "ready",
  },
  {
    id: "display-presets",
    categoryId: "display",
    title: "顯示預設（規劃中）",
    description: "將提供資訊密度、動畫強度與字級等快速切換。",
    status: "planned",
  },
  {
    id: "accessibility-presets",
    categoryId: "accessibility",
    title: "無障礙預設（規劃中）",
    description: "將提供色弱友善、低動態與高對比等輔助配置。",
    status: "planned",
  },
];
