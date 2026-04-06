/** Shared formatting utilities for time and numbers. */

/** Formats a duration in seconds to M:SS or H:MM:SS. */
export const formatSeconds = (value: number) => {
  const clamped = Math.max(0, Math.floor(value));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
};
