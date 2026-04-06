/**
 * Shared text normalization utilities for display names, user-generated content,
 * and server-returned strings that may contain garbled or escaped Unicode.
 */

const GARBLED_TEXT_RE = /\uFFFD|\uFFFE|\uFFFF/;
const ESCAPED_UNICODE_RE = /\\[uU][0-9a-fA-F]{4}/;
const DOUBLY_ESCAPED_UNICODE_RE = /\\\\[uU]/g;

const looksBrokenText = (value: string) => {
  if (GARBLED_TEXT_RE.test(value)) return true;
  const replacementCount = (value.match(/\uFFFD/g) ?? []).length;
  const questionCount = (value.match(/\?/g) ?? []).length;
  return (
    replacementCount > 0 ||
    (questionCount >= 3 && questionCount / Math.max(1, value.length) > 0.15)
  );
};

const decodeEscapedUnicodeText = (value: string) => {
  let normalized = value;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const collapsed = normalized.replace(DOUBLY_ESCAPED_UNICODE_RE, "\\u");
    if (!ESCAPED_UNICODE_RE.test(collapsed)) {
      return collapsed;
    }
    normalized = collapsed.replace(
      /\\[uU]([0-9a-fA-F]{4})/g,
      (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
    );
  }
  return normalized.replace(DOUBLY_ESCAPED_UNICODE_RE, "\\u");
};

/**
 * Normalizes a display name from the server — decodes escaped Unicode and
 * returns `fallback` when the result looks garbled.
 */
export const normalizeRoomDisplayText = (
  value: string | null | undefined,
  fallback: string,
) => {
  const text = decodeEscapedUnicodeText((value ?? "").trim());
  if (!text) return fallback;
  return looksBrokenText(text) ? fallback : text;
};

/**
 * Sanitizes a server-returned string that may be garbled.
 * Unlike `normalizeRoomDisplayText`, does not accept null/undefined.
 */
export const sanitizePossibleGarbledText = (
  value: string,
  fallback = "發生錯誤",
) => {
  const text = decodeEscapedUnicodeText(value);
  return looksBrokenText(text) ? fallback : text;
};
