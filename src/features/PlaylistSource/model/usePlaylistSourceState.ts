import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  PlaylistItem,
  PlaylistPreviewMeta,
  YoutubePlaylist,
} from "./types";
import {
  apiFetchYoutubePlaylistItems,
  apiFetchYoutubePlaylists,
  apiPreviewPlaylist,
} from "./playlistSourceApi";
import {
  clampQuestionCount,
  getQuestionMax,
  normalizePlaylistItems,
} from "./playlistSourceUtils";
import {
  QUESTION_MIN,
  QUESTION_STEP,
} from "@domain/room/constants";
import { getStoredQuestionCount } from "./playlistSourceStorage";
import { ensureFreshAuthToken } from "../../../shared/auth/token";
import {
  isGoogleReauthRequired,
  toGoogleReauthMessage,
} from "../../../shared/auth/providerAuth";

type UsePlaylistSourceStateOptions = {
  apiUrl: string;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  setStatusText: (value: string | null) => void;
  onResetCollection: () => void;
};

export type UsePlaylistSourceStateResult = {
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
  playlistItems: PlaylistItem[];
  setPlaylistItems: (items: PlaylistItem[]) => void;
  playlistError: string | null;
  playlistLoading: boolean;
  playlistStage: "input" | "preview";
  playlistLocked: boolean;
  playlistPreviewMeta: PlaylistPreviewMeta | null;
  lastFetchedPlaylistId: string | null;
  lastFetchedPlaylistTitle: string | null;
  questionCount: number;
  questionMin: number;
  questionMaxLimit: number;
  questionStep: number;
  updateQuestionCount: (value: number) => number;
  handleFetchPlaylist: (options?: {
    url?: string;
    force?: boolean;
    lock?: boolean;
  }) => Promise<void>;
  handleResetPlaylist: () => void;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  fetchYoutubePlaylists: () => Promise<void>;
  importYoutubePlaylist: (playlistId: string) => Promise<void>;
  applyPlaylistSource: (
    items: PlaylistItem[],
    sourceId: string,
    title?: string | null,
  ) => void;
  clearPlaylistError: () => void;
  resetPlaylistState: () => void;
  resetYoutubePlaylists: () => void;
};

const normalizePlaylistPreviewErrorMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("please provide a valid playlist url") ||
    normalized.includes("invalid playlist")
  ) {
    return "請貼上有效的 YouTube 播放清單連結。";
  }

  if (
    normalized.includes("private or restricted") ||
    normalized.includes("not publicly accessible") ||
    normalized.includes("cannot be accessed") ||
    normalized.includes("not public") ||
    normalized.includes("playlistitemsnotaccessible")
  ) {
    return "這份播放清單目前不是公開狀態，無法透過貼上連結匯入。";
  }

  if (
    normalized.includes("playlist not found") ||
    normalized.includes("playlistnotfound")
  ) {
    return "找不到這份播放清單，請確認連結是否正確，或清單是否仍存在。";
  }

  if (
    normalized.includes("auto mixes cannot be fetched") ||
    normalized.includes("auto mix") ||
    normalized.includes("mix cannot be fetched")
  ) {
    return "這個連結是 YouTube 合輯/自動混音，暫時不支援匯入，請改用一般公開播放清單。";
  }

  if (normalized.includes("playlist is too large")) {
    return "這份播放清單超過目前匯入上限，請改用較短的清單。";
  }

  if (
    normalized.includes("playlist item count") &&
    normalized.includes("exceeds the allowed limit")
  ) {
    const limitMatch = message.match(/allowed limit\s+(\d+)/i);
    const countMatch = message.match(/item count\s+(\d+)/i);
    const limit = limitMatch?.[1] ?? "800";
    const count = countMatch?.[1];
    return count
      ? `這份播放清單共有 ${count} 首，超過一般使用者 ${limit} 首上限。`
      : `這份播放清單超過一般使用者 ${limit} 首上限。`;
  }

  if (
    normalized.includes("no playable videos found") ||
    normalized.includes("清單沒有可用影片")
  ) {
    return "這份播放清單沒有可匯入的影片，可能包含私人、受限、限制級或不可嵌入內容。";
  }

  if (
    normalized.includes("failed to fetch playlist metadata") ||
    normalized.includes("failed to fetch playlist items")
  ) {
    return "讀取播放清單失敗，請稍後再試。";
  }

  return message;
};

export const usePlaylistSourceState = ({
  apiUrl,
  authToken,
  refreshAuthToken,
  setStatusText,
  onResetCollection,
}: UsePlaylistSourceStateOptions): UsePlaylistSourceStateResult => {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistStage, setPlaylistStage] = useState<"input" | "preview">(
    "input",
  );
  const [playlistLocked, setPlaylistLocked] = useState(false);
  const [playlistPreviewMeta, setPlaylistPreviewMeta] =
    useState<PlaylistPreviewMeta | null>(null);
  const [lastFetchedPlaylistId, setLastFetchedPlaylistId] = useState<
    string | null
  >(null);
  const [lastFetchedPlaylistTitle, setLastFetchedPlaylistTitle] = useState<
    string | null
  >(null);
  const [questionCount, setQuestionCount] = useState<number>(() => {
    const saved = getStoredQuestionCount();
    const initial =
      typeof saved === "number" && Number.isFinite(saved) ? saved : 10;
    return clampQuestionCount(initial, getQuestionMax(0));
  });

  const [youtubePlaylists, setYoutubePlaylists] = useState<YoutubePlaylist[]>(
    [],
  );
  const [youtubePlaylistsLoading, setYoutubePlaylistsLoading] = useState(false);
  const [youtubePlaylistsError, setYoutubePlaylistsError] = useState<
    string | null
  >(null);

  const questionMaxLimit = useMemo(
    () => getQuestionMax(playlistItems.length),
    [playlistItems.length],
  );

  const updateQuestionCount = (value: number) => {
    const clamped = clampQuestionCount(value, questionMaxLimit);
    setQuestionCount(clamped);
    return clamped;
  };

  const extractPlaylistId = (url: string) => {
    try {
      const parsed = new URL(url.trim());
      const listId = parsed.searchParams.get("list");
      if (listId) return listId;
      const segments = parsed.pathname.split("/");
      const last = segments[segments.length - 1];
      return last || null;
    } catch (error) {
      console.error("Invalid playlist url", error);
      return null;
    }
  };

  const fetchYoutubePlaylists = useCallback(async () => {
    if (!apiUrl || !authToken) {
      setYoutubePlaylistsError("請先登入後再使用播放清單");
      return;
    }
    setYoutubePlaylistsLoading(true);
    setYoutubePlaylistsError(null);
    try {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) {
        throw new Error("登入已過期，需要重新授權 Google");
      }
      const run = async (token: string, allowRetry: boolean) => {
        const { ok, status, payload } = await apiFetchYoutubePlaylists(
          apiUrl,
          token,
        );
        if (ok) {
          setYoutubePlaylists(payload?.data ?? []);
          return;
        }
        if (status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            await run(refreshed, false);
            return;
          }
        }
        const message = payload?.error ?? "載入播放清單失敗";
        if (isGoogleReauthRequired(payload)) {
          throw new Error(toGoogleReauthMessage(payload));
        }
        const normalized = String(message).toLowerCase();
        if (
          normalized.includes("insufficient authentication scopes") ||
          normalized.includes("insufficientpermissions")
        ) {
          throw new Error("需要重新授權 Google");
        }
        if (normalized.includes("channel not found")) {
          throw new Error("尚未建立 YouTube 頻道或沒有播放清單");
        }
        if (String(message).includes("Missing refresh token")) {
          throw new Error("需要重新授權 Google");
        }
        if (status === 401) {
          throw new Error("登入已過期，需要重新授權 Google");
        }
        throw new Error(message);
      };

      await run(token, true);
    } catch (error) {
      setYoutubePlaylistsError(
        error instanceof Error ? error.message : "載入播放清單失敗",
      );
    } finally {
      setYoutubePlaylistsLoading(false);
    }
  }, [apiUrl, authToken, refreshAuthToken]);

  const importYoutubePlaylist = useCallback(
    async (playlistId: string) => {
      if (!apiUrl || !authToken) {
        setPlaylistError("請先登入後再使用播放清單");
        return;
      }
      setPlaylistLoading(true);
      setPlaylistError(null);
      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) {
          throw new Error("登入已過期，需要重新授權 Google");
        }
        const run = async (token: string, allowRetry: boolean) => {
          const { ok, status, payload } = await apiFetchYoutubePlaylistItems(
            apiUrl,
            token,
            playlistId,
          );
          if (ok) {
            const data = payload?.data;
            if (!data?.items || data.items.length === 0) {
              throw new Error("清單沒有可用影片");
            }
            const normalizedItems = normalizePlaylistItems(data.items);
            setPlaylistItems(normalizedItems);
            setPlaylistStage("preview");
            setPlaylistLocked(true);
            setPlaylistPreviewMeta({
              expectedCount: data.expectedCount ?? null,
              skippedCount: data.skippedCount ?? 0,
              skippedItems: data.skippedItems ?? [],
            });
            setLastFetchedPlaylistId(data.playlistId ?? playlistId);
            const playlistTitle =
              data.title ??
              youtubePlaylists.find((item) => item.id === playlistId)?.title ??
              null;
            setLastFetchedPlaylistTitle(playlistTitle);
            if (
              typeof data.expectedCount === "number" &&
              data.expectedCount > normalizedItems.length
            ) {
              setStatusText(
                `已載入播放清單，共 ${normalizedItems.length} 首（已略過不可用影片）`,
              );
            } else {
              setStatusText(`已載入播放清單，共 ${normalizedItems.length} 首`);
            }
            return;
          }
          if (status === 401 && allowRetry) {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
              await run(refreshed, false);
              return;
            }
          }
          const message = payload?.error ?? "讀取播放清單失敗";
          if (isGoogleReauthRequired(payload)) {
            throw new Error(toGoogleReauthMessage(payload));
          }
          const normalized = String(message).toLowerCase();
          if (
            normalized.includes("insufficient authentication scopes") ||
            normalized.includes("insufficientpermissions")
          ) {
            throw new Error("需要重新授權 Google");
          }
          if (normalized.includes("channel not found")) {
            throw new Error("尚未建立 YouTube 頻道或沒有播放清單");
          }
          if (status === 401) {
            throw new Error("登入已過期，需要重新授權 Google");
          }
          throw new Error(message);
        };

        await run(token, true);
      } catch (error) {
        setPlaylistError(
          error instanceof Error ? error.message : "讀取播放清單時發生錯誤",
        );
        setPlaylistItems([]);
        setPlaylistStage("input");
        setPlaylistLocked(false);
        setPlaylistPreviewMeta(null);
        setLastFetchedPlaylistId(null);
        setLastFetchedPlaylistTitle(null);
      } finally {
        setPlaylistLoading(false);
      }
    },
    [apiUrl, authToken, refreshAuthToken, setStatusText, youtubePlaylists],
  );

  const handleFetchPlaylist = useCallback(
    async (options?: { url?: string; force?: boolean; lock?: boolean }) => {
      const shouldLock = options?.lock ?? true;
      const targetUrl = options?.url ?? playlistUrl;
    setPlaylistError(null);

    if (!options?.force && playlistLocked && lastFetchedPlaylistId) {
      setPlaylistError("播放清單已鎖定，如需重選請按「重選播放清單」");
      return;
    }

    const playlistId = extractPlaylistId(targetUrl);
    if (!playlistId) {
      setPlaylistError("請貼上有效的播放清單網址");
      return;
    }

    if (!apiUrl) {
      setPlaylistError("尚未設定播放清單 API 位置 (API_URL)");
      return;
    }

    setPlaylistLoading(true);

    try {
      const { ok, payload } = await apiPreviewPlaylist(
        apiUrl,
        targetUrl,
        playlistId,
        authToken,
      );
      if (payload && "error" in payload) {
        throw new Error(
          normalizePlaylistPreviewErrorMessage(
            payload.error || "讀取播放清單失敗，請稍後重試",
          ),
        );
      }
      if (!ok || !payload) {
        throw new Error("讀取播放清單失敗，請稍後重試");
      }

      const data = payload;

      if (!data?.items || data.items.length === 0) {
        throw new Error(
          "清單沒有可用影片，可能為私人/受限或自動合輯不受支援。",
        );
      }

      const normalizedItems = normalizePlaylistItems(data.items);
      setPlaylistItems(normalizedItems);
      setPlaylistStage("preview");
      setPlaylistLocked(shouldLock);
      setPlaylistPreviewMeta({
        expectedCount: data.expectedCount ?? null,
        skippedCount: data.skippedCount ?? 0,
        skippedItems: data.skippedItems ?? [],
      });
      setLastFetchedPlaylistId(data.playlistId ?? playlistId);
      setLastFetchedPlaylistTitle(data.title ?? null);

      if (
        data.expectedCount !== null &&
        data.expectedCount !== data.items.length
      ) {
        setStatusText(
          `已載入播放清單，共 ${normalizedItems.length} 首（已略過私人或無法存取的影片）`,
        );
      } else {
        setStatusText(`已載入播放清單，共 ${normalizedItems.length} 首`);
      }
    } catch (error) {
      console.error(error);
      setPlaylistError(
        error instanceof Error
          ? normalizePlaylistPreviewErrorMessage(error.message)
          : "讀取播放清單時發生錯誤，請確認網路後重試",
      );
      setPlaylistItems([]);
      setPlaylistStage("input");
      setPlaylistLocked(false);
      setPlaylistPreviewMeta(null);
      setLastFetchedPlaylistId(null);
      setLastFetchedPlaylistTitle(null);
    } finally {
      setPlaylistLoading(false);
    }
    },
    [
      apiUrl,
      authToken,
      lastFetchedPlaylistId,
      playlistLocked,
      playlistUrl,
      setStatusText,
    ],
  );

  const handleResetPlaylist = useCallback(() => {
    setPlaylistUrl("");
    setPlaylistItems([]);
    setPlaylistError(null);
    setPlaylistLoading(false);
    setPlaylistStage("input");
    setPlaylistLocked(false);
    setPlaylistPreviewMeta(null);
    setLastFetchedPlaylistId(null);
    setLastFetchedPlaylistTitle(null);
    onResetCollection();
  }, [onResetCollection]);

  const applyPlaylistSource = (
    items: PlaylistItem[],
    sourceId: string,
    title?: string | null,
  ) => {
    setPlaylistItems(items);
    setPlaylistStage("preview");
    setPlaylistLocked(true);
    setPlaylistPreviewMeta(null);
    setLastFetchedPlaylistId(sourceId);
    if (title !== undefined) {
      setLastFetchedPlaylistTitle(title ?? null);
    }
  };

  const clearPlaylistError = () => {
    setPlaylistError(null);
  };

  const resetPlaylistState = useCallback(() => {
    setPlaylistUrl("");
    setPlaylistItems([]);
    setPlaylistError(null);
    setPlaylistLoading(false);
    setPlaylistStage("input");
    setPlaylistLocked(false);
    setPlaylistPreviewMeta(null);
    setLastFetchedPlaylistId(null);
    setLastFetchedPlaylistTitle(null);
  }, []);

  const resetYoutubePlaylists = useCallback(() => {
    setYoutubePlaylists([]);
    setYoutubePlaylistsError(null);
    setYoutubePlaylistsLoading(false);
  }, []);

  useEffect(() => {
    if (playlistItems.length === 0) return;
    const maxValue = getQuestionMax(playlistItems.length);
    if (questionCount > maxValue) {
      setQuestionCount(maxValue);
    }
  }, [playlistItems.length, questionCount]);

  return {
    playlistUrl,
    setPlaylistUrl,
    playlistItems,
    setPlaylistItems,
    playlistError,
    playlistLoading,
    playlistStage,
    playlistLocked,
    playlistPreviewMeta,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    questionCount,
    questionMin: QUESTION_MIN,
    questionMaxLimit,
    questionStep: QUESTION_STEP,
    updateQuestionCount,
    handleFetchPlaylist,
    handleResetPlaylist,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
    applyPlaylistSource,
    clearPlaylistError,
    resetPlaylistState,
    resetYoutubePlaylists,
  };
};
