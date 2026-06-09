export type GuessVideoDisplaySize =
  | "200x200"
  | "320x180"
  | "480x270"
  | "480plus";

export type YouTubePreferredQuality =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "unsupported-1p";

export type YouTubeSupportedPreferredQuality = Exclude<
  YouTubePreferredQuality,
  "unsupported-1p"
>;

export const DEFAULT_GUESS_VIDEO_DISPLAY_SIZE: GuessVideoDisplaySize =
  "200x200";

export const DEFAULT_YOUTUBE_PREFERRED_QUALITY: YouTubePreferredQuality = "tiny";

export const GUESS_VIDEO_DISPLAY_SIZE_OPTIONS: Array<{
  value: GuessVideoDisplaySize;
  label: string;
}> = [
  { value: "200x200", label: "200x200" },
  { value: "320x180", label: "320x180" },
  { value: "480x270", label: "480x270" },
  { value: "480plus", label: "480x270+" },
];

export const YOUTUBE_PREFERRED_QUALITY_OPTIONS: Array<{
  value: YouTubePreferredQuality;
  label: string;
}> = [
  { value: "tiny", label: "144p" },
  { value: "small", label: "240p" },
  { value: "medium", label: "360p" },
  { value: "large", label: "480p" },
  { value: "unsupported-1p", label: "1p test" },
];

export const toSupportedYouTubePreferredQuality = (
  quality: YouTubePreferredQuality,
): YouTubeSupportedPreferredQuality | null =>
  quality === "unsupported-1p" ? null : quality;
