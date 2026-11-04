import { describe, expect, it } from "vitest";
import { importFailureReason } from "./importFailureReason";

describe("importFailureReason", () => {
  it.each([
    ["blocked", "Age restricted", "影片受到年齡限制"],
    ["blocked", "Embedding disabled", "影片不允許嵌入播放"],
    ["blocked", "Blocked in region: TW", "影片在指定地區受到限制"],
    ["unavailable", "Video metadata not found", "YouTube 未提供影片資料，無法確認原因"],
    ["unavailable", "Privacy status: unlisted", "影片為不公開狀態，目前不匯入"],
    ["unavailable", "Upload status: rejected", "影片上傳狀態不符合匯入條件"],
    ["duplicate", "Duplicate video in playlist", "播放清單中有重複曲目，已略過"],
    ["unknown", "Missing video id", "缺少影片識別碼，無法確認原因"],
    ["blocked", "unknown restriction", "影片受到播放限制，原因未明"],
  ] as const)("translates %s / %s", (status, reason, expected) => {
    expect(importFailureReason({ status, reason })).toBe(expected);
  });
});
