export const SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX = "settlement-review:";

export const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString();
};

export const normalizeDisplayText = (
  value: string | null | undefined,
  fallback: string,
) => {
  const text = (value ?? "").trim();
  if (!text) return fallback;
  const replacementCount = (text.match(/\uFFFD/g) ?? []).length;
  const questionCount = (text.match(/\?/g) ?? []).length;
  const looksBroken =
    replacementCount > 0 ||
    (questionCount >= 3 && questionCount / Math.max(1, text.length) > 0.15);
  return looksBroken ? fallback : text;
};
