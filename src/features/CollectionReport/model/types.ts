export type CollectionReportType =
  | "wrong_category"
  | "inappropriate_content"
  | "platform_violation";

export type CollectionReportStatus = "pending" | "reviewed" | "dismissed";

export type CollectionReport = {
  id: string;
  collectionId: string;
  reportType: CollectionReportType;
  description: string | null;
  status: CollectionReportStatus;
  createdAt: number;
  updatedAt: number;
};

export type CollectionReportValue = {
  reportType: CollectionReportType;
  description: string | null;
};

export const COLLECTION_REPORT_TYPE_OPTIONS: Array<{
  value: CollectionReportType;
  label: string;
  description: string;
}> = [
  {
    value: "wrong_category",
    label: "分類錯誤",
    description: "此收藏庫的分類或語言標籤與內容不符",
  },
  {
    value: "inappropriate_content",
    label: "不雅內容",
    description: "包含色情、暴力或令人不適的內容",
  },
  {
    value: "platform_violation",
    label: "不適合本平台",
    description: "內容違反平台規範或不適合出現在公開題庫",
  },
];
