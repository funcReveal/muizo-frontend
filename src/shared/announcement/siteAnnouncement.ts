export type SiteAnnouncementSeverity =
  | "info"
  | "maintenance"
  | "update"
  | "warning";

export type SiteAnnouncement = {
  id: string;
  enabled: boolean;
  severity: SiteAnnouncementSeverity;
  title: string;
  shortMessage: string;
  detailTitle: string;
  detailDescription: string;
  startsAt?: string | null;
  endsAt?: string | null;
  maintenanceWindowLabel?: string | null;
  expectedDurationLabel?: string | null;
  impactItems?: string[];
  updateItems?: string[];
  note?: string | null;
};

export const SITE_ANNOUNCEMENT: SiteAnnouncement = {
  id: "maintenance-2026-04-29",
  enabled: true,
  severity: "maintenance",
  title: "維護公告",
  shortMessage: "4/29 02:00 短暫重啟",
  detailTitle: "Muizo 將進行短暫伺服器重啟",
  detailDescription:
    "我們會在該時段短暫重啟服務，以套用最新更新並改善排行榜與收藏庫體驗。",
  startsAt: null,
  endsAt: null,
  maintenanceWindowLabel: "4/29 03:30",
  expectedDurationLabel: "約 1～3 分鐘",
  impactItems: [
    "重啟期間可能會短暫無法進入房間",
    "進行中的房間可能會中斷連線",
    "建議避開這段時間開始排行榜挑戰",
  ],
  updateItems: [
    "排行榜顯示最佳排名與總參與數",
    "排行榜前三名增加更清楚的視覺標示",
    "優化收藏庫與排行榜 Drawer 的資訊呈現",
  ],
  note: "如果重啟後頁面沒有自動恢復，請重新整理頁面。",
};

export const isSiteAnnouncementActive = (
  announcement: SiteAnnouncement,
  now = new Date(),
) => {
  if (!announcement.enabled) return false;

  const nowTime = now.getTime();

  if (announcement.startsAt) {
    const startsAtTime = new Date(announcement.startsAt).getTime();
    if (Number.isFinite(startsAtTime) && nowTime < startsAtTime) {
      return false;
    }
  }

  if (announcement.endsAt) {
    const endsAtTime = new Date(announcement.endsAt).getTime();
    if (Number.isFinite(endsAtTime) && nowTime > endsAtTime) {
      return false;
    }
  }

  return true;
};
