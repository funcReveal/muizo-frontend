import type {
  ChatMessage,
  RoomParticipant,
  RoomState,
} from "../../../model/types";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";

export const MAX_DANMU_TEXT_LENGTH = 56;
export const DANMU_LANE_COUNT = 6;

const MOBILE_UA_PATTERN = /Android|iPhone|iPad|iPod|Mobile/i;

export const extractYouTubeId = (
  url: string | null | undefined,
  fallbackId?: string | null,
): string | null => {
  if (fallbackId) return fallbackId;
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;
  const parseUrl = (value: string) => {
    const parsed = new URL(value);
    const vid = parsed.searchParams.get("v");
    if (vid) return vid;
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments.pop() || null;
  };
  try {
    return parseUrl(raw);
  } catch {
    try {
      return parseUrl(`https://${raw}`);
    } catch {
      const match =
        raw.match(/[?&]v=([^&]+)/) ||
        raw.match(/youtu\.be\/([^?&]+)/) ||
        raw.match(/youtube\.com\/embed\/([^?&]+)/);
      return match?.[1] ?? null;
    }
  }
};

export const createSilentWavDataUri = (durationSec: number) => {
  if (typeof window === "undefined" || typeof btoa !== "function") {
    return "data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA";
  }
  const safeDurationSec = Math.max(0.25, Math.min(10, durationSec));
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.max(1, Math.floor(sampleRate * safeDurationSec));
  const dataSize = frameCount * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
};

export const SILENT_AUDIO_SRC = createSilentWavDataUri(2);

export const collectAnsweredClientIds = (
  lockedOrder?: string[],
  lockedClientIds?: string[],
  answerOrderLatest?: string[],
  answersByClientId?: Record<
    string,
    {
      choiceIndex?: number | null;
      answeredAtMs?: number | null;
      firstAnsweredAtMs?: number | null;
      changedAnswerCount?: number;
    }
  >,
) => {
  if (Array.isArray(answerOrderLatest) && answerOrderLatest.length > 0) {
    const unique: string[] = [];
    const seen = new Set<string>();
    answerOrderLatest.forEach((clientId) => {
      if (!clientId || seen.has(clientId)) return;
      seen.add(clientId);
      unique.push(clientId);
    });
    if (unique.length > 0) {
      return unique;
    }
  }

  if (answersByClientId && typeof answersByClientId === "object") {
    const baseOrder = [...(lockedOrder ?? []), ...(lockedClientIds ?? [])];
    const baseIndexMap = new Map<string, number>();
    baseOrder.forEach((clientId, idx) => {
      if (!clientId || baseIndexMap.has(clientId)) return;
      baseIndexMap.set(clientId, idx);
    });
    const rows = Object.entries(answersByClientId)
      .map(([clientId, answer]) => {
        const hasChoice = typeof answer?.choiceIndex === "number";
        const answeredAtMs =
          typeof answer?.answeredAtMs === "number" &&
          Number.isFinite(answer.answeredAtMs)
            ? answer.answeredAtMs
            : null;
        const firstAnsweredAtMs =
          typeof answer?.firstAnsweredAtMs === "number" &&
          Number.isFinite(answer.firstAnsweredAtMs)
            ? answer.firstAnsweredAtMs
            : null;
        return {
          clientId,
          hasChoice,
          answeredAtMs,
          firstAnsweredAtMs,
          baseOrder: baseIndexMap.get(clientId) ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .filter((row) => row.clientId && (row.hasChoice || row.answeredAtMs !== null));

    if (rows.length > 0) {
      rows.sort((a, b) => {
        const aTs = a.answeredAtMs ?? a.firstAnsweredAtMs ?? Number.MAX_SAFE_INTEGER;
        const bTs = b.answeredAtMs ?? b.firstAnsweredAtMs ?? Number.MAX_SAFE_INTEGER;
        if (aTs !== bTs) return aTs - bTs;
        if (a.baseOrder !== b.baseOrder) return a.baseOrder - b.baseOrder;
        return a.clientId.localeCompare(b.clientId);
      });
      return rows.map((row) => row.clientId);
    }
  }

  const ordered = [...(lockedOrder ?? []), ...(lockedClientIds ?? [])];
  const unique: string[] = [];
  const seen = new Set<string>();
  ordered.forEach((clientId) => {
    if (!clientId || seen.has(clientId)) return;
    seen.add(clientId);
    unique.push(clientId);
  });
  return unique;
};

export const buildScoreBaselineMap = (rows: RoomParticipant[]) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.clientId] = row.score;
    return acc;
  }, {});

export const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  const legacyNavigator = navigator as Navigator & {
    msMaxTouchPoints?: number;
  };
  const ua = navigator.userAgent || "";
  const isMobileUa = MOBILE_UA_PATTERN.test(ua);
  const isIpadDesktopUa =
    navigator.platform === "MacIntel" &&
    (navigator.maxTouchPoints > 1 || (legacyNavigator.msMaxTouchPoints ?? 0) > 1);
  return isMobileUa || isIpadDesktopUa;
};

export const isDanmuCandidateMessage = (message: ChatMessage) => {
  const text = message.content?.trim() ?? "";
  if (!text) return false;
  const username = message.username?.trim().toLowerCase() ?? "";
  const userId = message.userId?.trim().toLowerCase() ?? "";
  if (!username || !userId) return true;
  if (username === "system" || username === "系統") return false;
  if (userId === "system" || userId === "sys") return false;
  return true;
};

export const toDanmuText = (message: ChatMessage) => {
  const compactContent = message.content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DANMU_TEXT_LENGTH);
  return `${message.username}: ${compactContent || "..."}`;
};

export const deferStateUpdate = (callback: () => void) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }
  void Promise.resolve().then(callback);
};

type HapticFeedbackKind =
  | "tap"
  | "reselect"
  | "confirm"
  | "correct"
  | "wrong"
  | "combo"
  | "comboBreak";

const HAPTIC_PATTERNS: Record<HapticFeedbackKind, number | number[]> = {
  tap: 8,
  reselect: [8, 28, 8],
  confirm: [10, 22, 14],
  correct: [12, 24, 18],
  wrong: [24, 42, 14],
  combo: [8, 20, 10, 20, 14],
  comboBreak: [26, 46, 16],
};

export const triggerHapticFeedback = (kind: HapticFeedbackKind) => {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;
  if (typeof document !== "undefined" && document.hidden) return false;
  if (!isMobileDevice()) return false;
  return navigator.vibrate(HAPTIC_PATTERNS[kind]);
};

export const cloneSettlementQuestionRecaps = (recaps: SettlementQuestionRecap[]) =>
  recaps.map((recap) => ({
    ...recap,
    choices: recap.choices.map((choice) => ({ ...choice })),
  }));

export const cloneRoomForSettlement = (room: RoomState["room"]): RoomState["room"] => ({
  ...room,
  gameSettings: room.gameSettings ? { ...room.gameSettings } : undefined,
  playlist: {
    ...room.playlist,
    items: room.playlist.items.map((item) => ({ ...item })),
  },
});
