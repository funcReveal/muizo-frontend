import type { CollectionCreateSourceSkippedItem } from "../hooks/useCollectionCreateImportSources";

/** Translate the reason returned by the import API without guessing its cause. */
export function importFailureReason(item: CollectionCreateSourceSkippedItem): string {
  const reason = item.reason?.trim() ?? "";
  const normalized = reason.toLowerCase();
  if (normalized === "video metadata not found") return "YouTube 未提供影片資料，無法確認原因";
  if (normalized === "missing video id") return "缺少影片識別碼，無法確認原因";
  if (normalized.startsWith("private video")) return "影片為私人狀態";
  if (normalized.startsWith("deleted video")) return "影片已刪除";
  if (normalized === "embedding disabled") return "影片不允許嵌入播放";
  if (normalized === "age restricted") return "影片受到年齡限制";
  if (normalized.startsWith("blocked in region:")) return "影片在指定地區受到限制";
  if (normalized === "duplicate video in playlist") return "播放清單中有重複曲目，已略過";
  if (normalized === "privacy status: unlisted") return "影片為不公開狀態，目前不匯入";
  if (normalized.startsWith("privacy status:")) return "影片隱私狀態不符合匯入條件";
  if (normalized.startsWith("upload status:")) return "影片上傳狀態不符合匯入條件";
  if (/[\u3400-\u9fff]/.test(reason)) return reason;
  switch (item.status) {
    case "removed": return "影片已移除";
    case "private": return "影片為私人狀態";
    case "duplicate": return "播放清單中有重複曲目，已略過";
    case "blocked": return "影片受到播放限制，原因未明";
    case "unavailable": return "影片資料無法使用，原因未明";
    default: return "無法確認匯入失敗原因";
  }
}
