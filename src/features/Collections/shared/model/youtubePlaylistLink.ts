/** Accept share text, but only extract links belonging to YouTube. */
export function extractYoutubePlaylistUrl(text: string): string | null {
  const trimmed = text.trim();
  const candidates = [
    trimmed,
    ...(trimmed.match(/https?:\/\/[^\s<>"'，。；！？「」『』]+/gi) ?? []),
  ];
  for (const candidate of candidates) {
    try {
      const value = candidate.replace(/[)\]}>.,;!?]+$/, "");
      const url = new URL(
        /^(?:(?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\//i.test(value)
          ? `https://${value}`
          : value,
      );
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      if (
        ![
          "youtube.com",
          "www.youtube.com",
          "m.youtube.com",
          "music.youtube.com",
          "youtu.be",
          "www.youtu.be",
        ].includes(url.hostname.toLowerCase())
      )
        continue;
      const list = url.searchParams.get("list");
      if (!list || !/^[a-zA-Z0-9_-]+$/.test(list)) continue;
      return `https://www.youtube.com/playlist?list=${list}`;
    } catch {
      /* A share caption or unrelated text is not a URL. */
    }
  }
  return null;
}
