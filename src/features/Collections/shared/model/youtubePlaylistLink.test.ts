import { expect, it } from "vitest";
import { extractYoutubePlaylistUrl } from "./youtubePlaylistLink";

it.each([
  "https://www.youtube.com/playlist?list=PL_abc-123&si=tracking",
  "https://music.youtube.com/playlist?list=PL_abc-123",
  "youtube.com/playlist?list=PL_abc-123",
  "推薦這份歌單：https://youtu.be/video?list=PL_abc-123。一起來玩！",
  "My playlist (https://m.youtube.com/watch?v=video&list=PL_abc-123)",
])("extracts a playlist from share text: %s", (text) => {
  expect(extractYoutubePlaylistUrl(text)).toBe(
    "https://www.youtube.com/playlist?list=PL_abc-123",
  );
});
it.each([
  "",
  "https://example.com/playlist?list=PL_fake",
  "https://youtube.com.evil.test/?list=PL_fake",
  "https://youtube.com/watch?v=video",
  "https://youtube.com/playlist?list=",
  "javascript:alert(1)",
])("rejects unrelated or invalid clipboard text: %s", (text) => {
  expect(extractYoutubePlaylistUrl(text)).toBeNull();
});
