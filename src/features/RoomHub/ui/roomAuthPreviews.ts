import type { AuthFeaturePreview } from "@shared/ui/auth/AuthEntryDialog";

export type RoomAuthFeature = "rooms" | "youtube" | "personal" | "createPublicCollection";

export const roomAuthPreviews: Record<RoomAuthFeature, AuthFeaturePreview> = {
  createPublicCollection: {
    kind: "collections",
    eyebrow: "登入後解鎖 · 建立公開題庫",
    title: "把喜歡的歌分享成題庫",
    description: "匯入播放清單、調整答案與播放片段，再發布成公開題庫，讓大家一起猜。",
    actionLabel: "建立公開題庫",
  },
  youtube: {
    kind: "youtube",
    eyebrow: "登入後解鎖 · YouTube 播放清單",
    title: "從你的 YouTube 歌單開始玩",
    description: "登入後連結 YouTube，直接選取帳號內的播放清單，匯入歌曲建立房間。",
    actionLabel: "YouTube 播放清單",
  },
  personal: {
    kind: "personal",
    eyebrow: "登入後解鎖 · 私人收藏庫",
    title: "用自己的私人題庫開房",
    description: "選取你整理的私人收藏庫，保留歌曲與答案設定，隨時邀請朋友一起猜。",
    actionLabel: "私人收藏庫",
  },
  rooms: {
    kind: "rooms",
    eyebrow: "登入後解鎖 · 房間大廳",
    title: "建立房間，邀朋友一起猜歌",
    description: "登入後即可套用題庫、調整玩法，並保存你的遊玩紀錄。",
    actionLabel: "房間大廳",
  },
};
