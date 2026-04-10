import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { List, type RowComponentProps } from "react-window";
import { AnimatePresence, motion } from "motion/react";

import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import CloseRounded from "@mui/icons-material/CloseRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PlaylistAddRounded from "@mui/icons-material/PlaylistAddRounded";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
} from "@mui/material";
import { useAuth } from "../../../shared/auth/AuthContext";
import { useRoomPlaylist } from "../../Room/model/RoomPlaylistContext";
import { useRoomCollections } from "../../Room/model/RoomCollectionsContext";
import { isAdminRole } from "../../../shared/auth/roles";
import { ensureFreshAuthToken } from "../../../shared/auth/token";
import { isGoogleReauthRequired } from "../../../shared/auth/providerAuth";
import { trackEvent } from "../../../shared/analytics/track";
import { extractVideoId } from "../../../shared/utils/youtube";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
  resolveCollectionItemLimit,
} from "../model/collectionLimits";
import { appToast } from "../../../shared/ui/toastApi";
import { fadeInUp } from "../../../shared/motion/motionPresets";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const PUBLIC_SWITCH_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f172a"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm6.93 9h-3.1a15.9 15.9 0 0 0-1.38-5.02A8.02 8.02 0 0 1 18.93 11ZM12 4.04c.83 1.2 1.86 3.63 2.16 6.96H9.84C10.14 7.67 11.17 5.24 12 4.04ZM4.07 13h3.1a15.9 15.9 0 0 0 1.38 5.02A8.02 8.02 0 0 1 4.07 13Zm3.1-2h-3.1a8.02 8.02 0 0 1 4.48-5.02A15.9 15.9 0 0 0 7.17 11Zm4.83 8.96c-.83-1.2-1.86-3.63-2.16-6.96h4.32c-.3 3.33-1.33 5.76-2.16 6.96ZM14.45 18.02A15.9 15.9 0 0 0 15.83 13h3.1a8.02 8.02 0 0 1-4.48 5.02Z"/></svg>',
);
const PRIVATE_SWITCH_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f172a"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 8.73V17a1 1 0 1 0 2 0v-.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 0 1 4 0v2Z"/></svg>',
);

type DbCollection = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
};

const DEFAULT_DURATION_SEC = 30;
const COLLECTION_ITEMS_CHUNK_SIZE = 200;

type PlaylistIssueTab =
  | "removed"
  | "privateRestricted"
  | "embedBlocked"
  | "unavailable";

const parseDurationToSeconds = (duration?: string): number | null => {
  if (!duration) return null;
  const parts = duration.split(":").map((part) => Number(part));
  if (parts.some((value) => Number.isNaN(value))) return null;
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  return null;
};

const createServerId = () =>
  crypto.randomUUID?.() ??
  `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

const buildJsonHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

type PreviewVirtualRowProps = {
  items: Array<{
    title: string;
    answerText?: string;
    uploader?: string;
    duration?: string;
    thumbnail?: string;
  }>;
};

const PREVIEW_ROW_HEIGHT = 60;

const PreviewVirtualRow = ({
  index,
  style,
  items,
}: RowComponentProps<PreviewVirtualRowProps>) => {
  const item = items[index];
  if (!item) return <div style={style} />;

  return (
    <div style={style} className="px-2">
      <div className="flex items-center gap-3 px-1">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title || item.answerText || "歌曲封面"}
            loading="lazy"
            className="h-9 w-16 shrink-0 rounded-md border border-[var(--mc-border)] object-cover"
          />
        ) : (
          <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded-md border border-[var(--mc-border)] bg-[linear-gradient(145deg,rgba(56,189,248,0.18),rgba(15,23,42,0.25))] text-[10px] text-[var(--mc-text-muted)]">
            No Cover
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-[var(--mc-text)]">
            {item.title || item.answerText || "未命名歌曲"}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--mc-text-muted)]">
            {item.uploader || "未知上傳者"}
            {item.duration ? ` ． ${item.duration}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

const CollectionsCreatePage = () => {
  const navigate = useNavigate();
  const {
    authToken,
    authUser,
    authLoading,
    refreshAuthToken,
    loginWithGoogle,
  } = useAuth();
  const {
    playlistUrl,
    playlistItems,
    lastFetchedPlaylistTitle,
    playlistError,
    playlistLoading,
    playlistProgress,
    playlistPreviewMeta,
    handleFetchPlaylist,
    handleResetPlaylist,
    setPlaylistUrl,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
  } = useRoomPlaylist();
  const { collections, collectionScope, fetchCollections } =
    useRoomCollections();

  const [collectionTitle, setCollectionTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createStageLabel, setCreateStageLabel] = useState<string | null>(null);
  const [createProgress, setCreateProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [playlistSource, setPlaylistSource] = useState<"url" | "youtube">(
    "url",
  );
  const youtubeFetchedRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const lastAutoImportUrlRef = useRef("");
  const [selectedYoutubePlaylistId, setSelectedYoutubePlaylistId] =
    useState("");
  const [isImportingYoutubePlaylist, setIsImportingYoutubePlaylist] =
    useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [youtubeActionError, setYoutubeActionError] = useState<string | null>(
    null,
  );
  const [isPlaylistUrlFocused, setIsPlaylistUrlFocused] = useState(false);
  const [playlistIssueDialogOpen, setPlaylistIssueDialogOpen] =
    useState(false);
  const [playlistIssueTab, setPlaylistIssueTab] =
    useState<PlaylistIssueTab>("removed");
  const needsGoogleReauth = isGoogleReauthRequired({
    error: youtubePlaylistsError ?? youtubeActionError,
  });

  const ownerId = authUser?.id ?? null;
  const isAdmin = isAdminRole(authUser?.role);
  const privateCollectionsCount = collections.filter(
    (item) => item.visibility !== "public",
  ).length;
  const remainingCollectionSlots = Math.max(
    0,
    MAX_COLLECTIONS_PER_USER - collections.length,
  );
  const remainingPrivateCollectionSlots = Math.max(
    0,
    MAX_PRIVATE_COLLECTIONS_PER_USER - privateCollectionsCount,
  );
  const reachedCollectionLimit =
    !isAdmin && collections.length >= MAX_COLLECTIONS_PER_USER;
  const reachedPrivateCollectionLimit =
    !isAdmin && privateCollectionsCount >= MAX_PRIVATE_COLLECTIONS_PER_USER;
  const collectionItemLimit = resolveCollectionItemLimit({
    role: authUser?.role,
    plan: authUser?.plan,
  });
  const hasPlaylistItems = playlistItems.length > 0;
  const trimmedPlaylistUrl = playlistUrl.trim();
  const playlistUrlLooksValid = useMemo(() => {
    if (!trimmedPlaylistUrl) return false;
    try {
      const parsed = new URL(trimmedPlaylistUrl);
      return Boolean(parsed.searchParams.get("list"));
    } catch {
      return false;
    }
  }, [trimmedPlaylistUrl]);
  const showPlaylistUrlError = Boolean(
    trimmedPlaylistUrl && !playlistUrlLooksValid,
  );
  const playlistUrlTooltipMessage = showPlaylistUrlError
    ? "請貼上有效的 YouTube 播放清單連結，例如含有 list 參數的網址。"
    : "";

  useEffect(() => {
    handleResetPlaylist();
    return () => {
      handleResetPlaylist();
    };
  }, [handleResetPlaylist]);

  useEffect(() => {
    if (!lastFetchedPlaylistTitle) return;
    setCollectionTitle(lastFetchedPlaylistTitle);
    setTitleDraft(lastFetchedPlaylistTitle);
  }, [lastFetchedPlaylistTitle]);

  useEffect(() => {
    if (!authToken || !authUser?.id) return;
    if (collectionScope === "owner") return;
    void fetchCollections("owner");
  }, [authToken, authUser?.id, collectionScope, fetchCollections]);

  useEffect(() => {
    setTitleDraft(collectionTitle);
  }, [collectionTitle]);

  useEffect(() => {
    if (!reachedPrivateCollectionLimit) return;
    setVisibility((current) => (current === "private" ? "public" : current));
  }, [reachedPrivateCollectionLimit]);

  useEffect(() => {
    if (!isTitleEditing) return;
    window.requestAnimationFrame(() => {
      const input = titleInputRef.current;
      if (!input) return;
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }, [isTitleEditing]);

  useEffect(() => {
    if (playlistSource !== "url") return;
    if (!playlistUrlLooksValid) return;
    if (playlistLoading) return;
    if (trimmedPlaylistUrl === lastAutoImportUrlRef.current) return;
    const timer = window.setTimeout(() => {
      lastAutoImportUrlRef.current = trimmedPlaylistUrl;
      void handleFetchPlaylist({ url: trimmedPlaylistUrl }).catch(() => {
        // Errors are surfaced through playlistError in room state.
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    handleFetchPlaylist,
    playlistLoading,
    playlistSource,
    playlistUrlLooksValid,
    trimmedPlaylistUrl,
  ]);

  const collectionPreview = useMemo(() => {
    if (!hasPlaylistItems) return null;
    const first = playlistItems[0];
    return {
      title: collectionTitle || lastFetchedPlaylistTitle || "未命名收藏",
      subtitle: first?.title ?? "",
      count: playlistItems.length,
    };
  }, [
    collectionTitle,
    hasPlaylistItems,
    lastFetchedPlaylistTitle,
    playlistItems,
  ]);
  const previewListHeight = useMemo(
    () =>
      Math.min(
        320,
        Math.max(
          PREVIEW_ROW_HEIGHT * 3,
          playlistItems.length * PREVIEW_ROW_HEIGHT,
        ),
      ),
    [playlistItems.length],
  );
  const previewRowProps = useMemo<PreviewVirtualRowProps>(
    () => ({ items: playlistItems }),
    [playlistItems],
  );
  const importProgressPercent = useMemo(() => {
    if (playlistProgress.total <= 0) return null;
    return Math.min(
      100,
      Math.round((playlistProgress.received / playlistProgress.total) * 100),
    );
  }, [playlistProgress.received, playlistProgress.total]);
  const importProgressLabel = useMemo(() => {
    if (!playlistLoading) return null;
    if (playlistProgress.total > 0) {
      return `目前已處理 ${playlistProgress.received} / ${playlistProgress.total} 首`;
    }
    return playlistSource === "youtube"
      ? "正在整理 YouTube 播放清單內容..."
      : "正在載入播放清單內容...";
  }, [
    playlistLoading,
    playlistProgress.received,
    playlistProgress.total,
    playlistSource,
  ]);
  const createProgressPercent = useMemo(() => {
    if (!createProgress || createProgress.total <= 0) return null;
    return Math.min(
      100,
      Math.round((createProgress.completed / createProgress.total) * 100),
    );
  }, [createProgress]);
  const playlistIssueSummary = useMemo(() => {
    if (playlistPreviewMeta?.skippedItems?.length) {
      const removed: string[] = [];
      const privateRestricted: string[] = [];
      const embedBlocked: string[] = [];
      const unavailable: string[] = [];
      const unknown: string[] = [];
      playlistPreviewMeta.skippedItems.forEach((item) => {
        const label = item.title?.trim() || item.videoId || "未知項目";
        if (item.status === "removed") {
          removed.push(label);
          return;
        }
        if (item.status === "private") {
          privateRestricted.push(label);
          return;
        }
        if (item.status === "blocked") {
          embedBlocked.push(label);
          return;
        }
        if (item.status === "unavailable") {
          unavailable.push(label);
          return;
        }
        unknown.push(label);
      });
      return {
        removed,
        privateRestricted,
        embedBlocked,
        unavailable,
        unknown,
        unknownCount: 0,
      };
    }
    return {
      removed: [] as string[],
      privateRestricted: [] as string[],
      embedBlocked: [] as string[],
      unavailable: [] as string[],
      unknown: [] as string[],
      unknownCount: playlistPreviewMeta?.skippedCount ?? 0,
    };
  }, [playlistPreviewMeta]);
  const playlistIssueTotal =
    playlistIssueSummary.removed.length +
    playlistIssueSummary.privateRestricted.length +
    playlistIssueSummary.embedBlocked.length +
    playlistIssueSummary.unavailable.length +
    playlistIssueSummary.unknown.length +
    playlistIssueSummary.unknownCount;
  const playlistIssueGroups = [
    {
      key: "removed" as const,
      label: "已移除",
      count: playlistIssueSummary.removed.length,
      items: playlistIssueSummary.removed,
      className: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    },
    {
      key: "privateRestricted" as const,
      label: "隱私限制",
      count: playlistIssueSummary.privateRestricted.length,
      items: playlistIssueSummary.privateRestricted,
      className: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
    },
    {
      key: "embedBlocked" as const,
      label: "嵌入限制",
      count: playlistIssueSummary.embedBlocked.length,
      items: playlistIssueSummary.embedBlocked,
      className: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    },
    {
      key: "unavailable" as const,
      label: "其他不可用",
      count:
        playlistIssueSummary.unavailable.length +
        playlistIssueSummary.unknown.length +
        playlistIssueSummary.unknownCount,
      items: [
        ...playlistIssueSummary.unavailable,
        ...playlistIssueSummary.unknown,
      ],
      fallback:
        playlistIssueSummary.unknownCount > 0
          ? `共 ${playlistIssueSummary.unknownCount} 首，後端未提供明細`
          : "無",
      className: "border-red-300/30 bg-red-300/10 text-red-100",
    },
  ];
  const activePlaylistIssueGroup =
    playlistIssueGroups.find((group) => group.key === playlistIssueTab) ??
    playlistIssueGroups[0];

  useEffect(() => {
    if (!playlistIssueDialogOpen) return;
    const firstGroupWithItems = playlistIssueGroups.find(
      (group) => group.count > 0,
    );
    if (firstGroupWithItems) {
      setPlaylistIssueTab(firstGroupWithItems.key);
    }
  }, [
    playlistIssueDialogOpen,
    playlistIssueSummary.embedBlocked.length,
    playlistIssueSummary.privateRestricted.length,
    playlistIssueSummary.removed.length,
    playlistIssueSummary.unavailable.length,
    playlistIssueSummary.unknown.length,
    playlistIssueSummary.unknownCount,
  ]);

  useEffect(() => {
    if (playlistSource !== "youtube") return;
    if (!authUser) return;
    if (youtubeFetchedRef.current) return;
    youtubeFetchedRef.current = true;
    void fetchYoutubePlaylists();
  }, [playlistSource, authUser, fetchYoutubePlaylists]);

  const ensureYoutubePlaylists = () => {
    if (!authUser) return;
    if (youtubeFetchedRef.current) return;
    youtubeFetchedRef.current = true;
    void fetchYoutubePlaylists();
  };

  const handleImportSelectedYoutubePlaylist = async (playlistId: string) => {
    if (!playlistId) {
      setYoutubeActionError("請先選擇 YouTube 播放清單");
      return;
    }
    setYoutubeActionError(null);
    setIsImportingYoutubePlaylist(true);
    try {
      await importYoutubePlaylist(playlistId);
    } catch {
      setYoutubeActionError("匯入失敗，請稍後再試");
    } finally {
      setIsImportingYoutubePlaylist(false);
    }
  };

  const handleTitleSave = () => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleDraft(collectionTitle);
      setIsTitleEditing(false);
      return;
    }
    setCollectionTitle(nextTitle);
    setTitleDraft(nextTitle);
    setIsTitleEditing(false);
  };

  const handleTitleCancel = () => {
    setTitleDraft(collectionTitle);
    setIsTitleEditing(false);
  };

  const handleClearPlaylistUrl = () => {
    setPlaylistUrl("");
    lastAutoImportUrlRef.current = "";
  };

  const handleVisibilityChange = (nextVisibility: "private" | "public") => {
    if (nextVisibility === "private" && reachedPrivateCollectionLimit) {
      appToast.warning(
        `私人收藏最多只能建立 ${MAX_PRIVATE_COLLECTIONS_PER_USER} 個，請改為公開收藏或先整理現有私人收藏。`,
        { id: "private-collection-limit" },
      );
      return;
    }
    setVisibility(nextVisibility);
  };

  const handleCreateCollection = async () => {
    if (!API_URL) {
      setCreateError("尚未設定收藏 API 位址（VITE_API_URL）");
      return;
    }
    if (!authToken || !ownerId) {
      setCreateError("請先使用 Google 登入後再建立收藏");
      return;
    }
    if (!collectionTitle.trim()) {
      setCreateError("請輸入收藏標題");
      return;
    }
    if (!hasPlaylistItems) {
      setCreateError("請先匯入播放清單");
      return;
    }
    if (reachedCollectionLimit) {
      setCreateError(
        `你目前最多只能建立 ${MAX_COLLECTIONS_PER_USER} 個收藏庫，請先刪除或整理現有收藏。`,
      );
      return;
    }
    if (visibility === "private" && reachedPrivateCollectionLimit) {
      setCreateError(
        `私人收藏最多只能建立 ${MAX_PRIVATE_COLLECTIONS_PER_USER} 個，請改為公開收藏或先整理現有私人收藏。`,
      );
      return;
    }
    if (
      collectionItemLimit !== null &&
      playlistItems.length > collectionItemLimit
    ) {
      setCreateError(
        `一般使用者每個收藏庫最多只能保留 ${collectionItemLimit} 題`,
      );
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    setCreateStageLabel("正在建立收藏庫");
    setCreateProgress({ completed: 0, total: 1 });

    const create = async (token: string, allowRetry: boolean) => {
      const res = await fetch(`${API_URL}/api/collections`, {
        method: "POST",
        headers: buildJsonHeaders(token),
        body: JSON.stringify({
          owner_id: ownerId,
          title: collectionTitle.trim(),
          description: null,
          visibility,
        }),
      });

      if (res.status === 401 && allowRetry) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          return create(refreshed, false);
        }
      }

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to create collection");
      }
      return payload?.data as DbCollection;
    };

    try {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) {
        throw new Error("Unauthorized");
      }
      const created = await create(token, true);
      if (!created?.id) {
        throw new Error("Missing collection id");
      }

      const insertItems = playlistItems.map((item, idx) => {
        const durationSec =
          parseDurationToSeconds(item.duration) ?? DEFAULT_DURATION_SEC;
        const safeDuration = Math.max(1, durationSec);
        const endSec = Math.min(DEFAULT_DURATION_SEC, safeDuration);
        const id = createServerId();
        const videoId = extractVideoId(item.url);
        const provider = videoId ? "youtube" : "manual";
        const sourceId = videoId ?? id;
        return {
          id,
          sort: idx,
          provider,
          source_id: sourceId,
          title: item.title || item.answerText || "Untitled",
          channel_title: item.uploader ?? null,
          channel_id: item.channelId ?? null,
          start_sec: 0,
          end_sec: Math.max(1, endSec),
          answer_text: item.answerText || item.title || "Untitled",
          ...(durationSec ? { duration_sec: durationSec } : {}),
        };
      });
      const totalChunks = Math.max(
        1,
        Math.ceil(insertItems.length / COLLECTION_ITEMS_CHUNK_SIZE),
      );
      setCreateProgress({ completed: 1, total: totalChunks + 1 });
      setCreateStageLabel("正在整理歌曲資料");

      const insertChunk = async (
        token: string,
        itemsChunk: typeof insertItems,
        allowRetry: boolean,
      ) => {
        const res = await fetch(
          `${API_URL}/api/collections/${created.id}/items`,
          {
            method: "POST",
            headers: buildJsonHeaders(token),
            body: JSON.stringify({ items: itemsChunk }),
          },
        );
        if (res.status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return insertChunk(refreshed, itemsChunk, false);
          }
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to insert items");
        }
      };

      for (
        let index = 0;
        index < insertItems.length;
        index += COLLECTION_ITEMS_CHUNK_SIZE
      ) {
        const chunkIndex = Math.floor(index / COLLECTION_ITEMS_CHUNK_SIZE) + 1;
        const chunk = insertItems.slice(
          index,
          index + COLLECTION_ITEMS_CHUNK_SIZE,
        );
        setCreateStageLabel(`正在匯入歌曲 ${chunkIndex} / ${totalChunks}`);
        await insertChunk(token, chunk, true);
        setCreateProgress({
          completed: chunkIndex + 1,
          total: totalChunks + 1,
        });
      }
      setCreateStageLabel("正在開啟收藏編輯頁");
      trackEvent("collection_create_success", {
        collection_id: created.id,
        collection_visibility: visibility,
        item_count: insertItems.length,
        import_source: playlistSource,
      });
      navigate(`/collections/${created.id}/edit`, { replace: true });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "建立收藏失敗");
    } finally {
      setIsCreating(false);
      setCreateStageLabel(null);
      setCreateProgress(null);
    }
  };

  return (
    <Box className="mx-auto w-full max-w-6xl px-4 pb-6 pt-4">
      <Box className="relative overflow-hidden p-5 text-[var(--mc-text)]">
        {isCreating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(2,6,23,0.72)] backdrop-blur-md">
            <div className="w-full max-w-md rounded-[28px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(10,18,32,0.9))] p-6 shadow-[0_32px_120px_-48px_rgba(34,211,238,0.5)]">
              <div className="flex items-center gap-4">
                <div className="relative inline-flex h-16 w-16 items-center justify-center">
                  <CircularProgress
                    size={56}
                    thickness={4}
                    variant={
                      createProgressPercent === null
                        ? "indeterminate"
                        : "determinate"
                    }
                    value={createProgressPercent ?? undefined}
                    sx={{ color: "#67e8f9" }}
                  />
                  <PlaylistAddRounded
                    sx={{
                      position: "absolute",
                      fontSize: 24,
                      color: "#cffafe",
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-[var(--mc-text)]">
                    {createStageLabel ?? "正在建立收藏庫"}
                  </div>
                  <div className="mt-1 text-sm text-[var(--mc-text-muted)]">
                    這一步會先建立收藏，再分批寫入歌曲，題目越多等待時間越長。
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#67e8f9,#f59e0b)] transition-[width] duration-300 ease-out"
                    style={{ width: `${createProgressPercent ?? 16}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--mc-text-muted)]">
                  <span>{createStageLabel ?? "準備中"}</span>
                  <span>
                    {createProgress
                      ? `${createProgress.completed}/${createProgress.total}`
                      : "0/0"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/collections")}
                aria-label="返回收藏列表"
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--mc-surface-strong)]/40 text-[var(--mc-text)] transition hover:bg-[var(--mc-surface-strong)]/60"
              >
                <ArrowBackIosNew fontSize="small" />
              </button>
              <div className="text-2xl font-semibold leading-none text-[var(--mc-text)]">
                建立收藏庫
              </div>
            </div>
            <Button
              variant="contained"
              onClick={() => handleCreateCollection()}
              disabled={
                isCreating ||
                authLoading ||
                !authToken ||
                reachedCollectionLimit
              }
              size="small"
              className="shrink-0"
            >
              {isCreating ? "建立中..." : "建立收藏"}
            </Button>
          </div>

          {!authToken && !authLoading && (
            <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              請先使用 Google 登入後再建立收藏
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-3 lg:grid-rows-[auto_auto_1fr]">
              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPlaylistSource("url")}
                      className={`rounded-full px-3 py-1 transition ${
                        playlistSource === "url"
                          ? "bg-[var(--mc-accent)]/15 text-[var(--mc-text)]"
                          : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                      }`}
                    >
                      連結
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaylistSource("youtube")}
                      className={`rounded-full px-3 py-1 transition ${
                        playlistSource === "youtube"
                          ? "bg-[var(--mc-accent-2)]/15 text-[var(--mc-text)]"
                          : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                      }`}
                    >
                      YouTube 清單
                    </button>
                  </div>
                </div>

                <div className="relative mt-3 min-h-[120px]">
                  <div
                    className={`space-y-3 transition-all duration-200 ${
                      playlistSource === "url"
                        ? "opacity-100 translate-x-0"
                        : "pointer-events-none opacity-0 -translate-x-2"
                    }`}
                    hidden={playlistSource !== "url"}
                  >
                    <div className="rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(2,6,23,0.34),rgba(15,23,42,0.22))] p-4 sm:p-5">
                      <div>
                        <Tooltip
                          title={playlistUrlTooltipMessage}
                          placement="top"
                          arrow
                          open={Boolean(
                            isPlaylistUrlFocused && trimmedPlaylistUrl,
                          )}
                          disableFocusListener
                          disableHoverListener
                          disableTouchListener
                        >
                          <TextField
                            fullWidth
                            size="small"
                            label="YouTube 播放清單網址"
                            placeholder="https://www.youtube.com/playlist?list=..."
                            value={playlistUrl}
                            autoComplete="off"
                            error={showPlaylistUrlError}
                            onFocus={() => setIsPlaylistUrlFocused(true)}
                            onBlur={() => setIsPlaylistUrlFocused(false)}
                            onChange={(e) => setPlaylistUrl(e.target.value)}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" || playlistLoading)
                                return;
                              event.preventDefault();
                              void handleFetchPlaylist();
                            }}
                            slotProps={{
                              inputLabel: { shrink: true },
                              input: {
                                endAdornment: trimmedPlaylistUrl ? (
                                  <InputAdornment position="end">
                                    <IconButton
                                      size="small"
                                      onClick={handleClearPlaylistUrl}
                                      edge="end"
                                      aria-label="清除播放清單網址"
                                      sx={{ color: "rgba(148,163,184,0.92)" }}
                                    >
                                      <CloseRounded fontSize="small" />
                                    </IconButton>
                                  </InputAdornment>
                                ) : undefined,
                              },
                              htmlInput: {
                                lang: "en",
                                autoComplete: "off",
                                autoCorrect: "off",
                                autoCapitalize: "off",
                                inputMode: "url",
                                spellCheck: "false",
                                style: { imeMode: "disabled" },
                              },
                            }}
                            sx={{
                              "& .MuiInputLabel-root": {
                                color: "rgba(248, 250, 252, 0.72)",
                              },
                              "& .MuiInputLabel-root.Mui-focused": {
                                color: showPlaylistUrlError
                                  ? "rgba(251, 113, 133, 0.96)"
                                  : "rgba(251, 191, 36, 0.96)",
                              },
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "20px",
                                backgroundColor: "rgba(2, 6, 23, 0.32)",
                                boxShadow:
                                  "0 0 0 1px rgba(148, 163, 184, 0.12), 0 10px 28px rgba(2, 6, 23, 0.18)",
                                transition:
                                  "background-color 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                                "& fieldset": {
                                  borderColor: showPlaylistUrlError
                                    ? "rgba(248, 113, 113, 0.5)"
                                    : "rgba(148, 163, 184, 0.2)",
                                },
                                "&:hover": {
                                  backgroundColor: "rgba(15, 23, 42, 0.52)",
                                  boxShadow: showPlaylistUrlError
                                    ? "0 0 0 1px rgba(248, 113, 113, 0.26), 0 18px 38px rgba(127, 29, 29, 0.18)"
                                    : "0 0 0 1px rgba(34, 211, 238, 0.16), 0 16px 34px rgba(8, 47, 73, 0.2)",
                                },
                                "&:hover fieldset": {
                                  borderColor: showPlaylistUrlError
                                    ? "rgba(248, 113, 113, 0.66)"
                                    : "rgba(34, 211, 238, 0.34)",
                                },
                                "&.Mui-focused": {
                                  backgroundColor: "rgba(15, 23, 42, 0.62)",
                                  boxShadow: showPlaylistUrlError
                                    ? "0 0 0 1px rgba(248, 113, 113, 0.28), 0 18px 38px rgba(127, 29, 29, 0.18)"
                                    : "0 0 0 1px rgba(251, 191, 36, 0.28), 0 18px 38px rgba(120, 53, 15, 0.18)",
                                },
                                "&.Mui-focused fieldset": {
                                  borderColor: showPlaylistUrlError
                                    ? "rgba(248, 113, 113, 0.72)"
                                    : "rgba(251, 191, 36, 0.72)",
                                },
                              },
                            }}
                          />
                        </Tooltip>
                      </div>

                      {playlistLoading ? (
                        <div className="mt-4 flex justify-end">
                          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/8 px-3 py-1.5 text-xs text-cyan-100/90">
                            <CircularProgress
                              size={14}
                              thickness={5}
                              sx={{ color: "#38bdf8" }}
                            />
                            載入中...
                          </div>
                        </div>
                      ) : null}

                      {playlistError && (
                        <div className="mt-3 rounded-2xl border border-rose-500/35 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
                          {playlistError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={`space-y-3 transition-all duration-200 ${
                      playlistSource === "youtube"
                        ? "opacity-100 translate-x-0"
                        : "pointer-events-none opacity-0 translate-x-2"
                    }`}
                    hidden={playlistSource !== "youtube"}
                  >
                    <div className="text-[11px] text-[var(--mc-text-muted)]">
                      {(!authUser || needsGoogleReauth) && (
                        <>
                          登入 Google 後可直接載入你的 YouTube 播放清單
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={loginWithGoogle}
                          >
                            登入 Google
                          </Button>
                        </>
                      )}
                      {youtubePlaylistsError && (
                        <span className="text-[11px] text-rose-300">
                          {youtubePlaylistsError}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <select
                        value={selectedYoutubePlaylistId}
                        onFocus={ensureYoutubePlaylists}
                        onChange={async (e) => {
                          const nextId = e.target.value;
                          setSelectedYoutubePlaylistId(nextId);
                          setYoutubeActionError(null);
                          if (!nextId) return;
                          await handleImportSelectedYoutubePlaylist(nextId);
                        }}
                        disabled={
                          youtubePlaylistsLoading || isImportingYoutubePlaylist
                        }
                        className="w-full rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/75 px-3 py-2 text-sm text-[var(--mc-text)] disabled:cursor-not-allowed disabled:opacity-65"
                      >
                        <option value="">
                          {youtubePlaylistsLoading
                            ? "載入播放清單中..."
                            : "請選擇 YouTube 播放清單"}
                        </option>
                        {youtubePlaylists.map((playlist) => (
                          <option key={playlist.id} value={playlist.id}>
                            {`${playlist.title}（${playlist.itemCount} 首）`}
                          </option>
                        ))}
                      </select>

                      {youtubePlaylistsLoading && (
                        <div className="rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 px-3 py-2 text-xs text-[var(--mc-text-muted)] animate-pulse">
                          正在載入你的播放清單...
                        </div>
                      )}

                      {youtubeActionError && (
                        <div className="rounded-lg border border-rose-500/35 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
                          {youtubeActionError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/55 text-[var(--mc-accent)]">
                      {visibility === "public" ? (
                        <PublicOutlined sx={{ fontSize: 18 }} />
                      ) : (
                        <LockOutlined sx={{ fontSize: 18 }} />
                      )}
                    </div>
                    <div className="text-sm font-semibold text-[var(--mc-text)]">
                      {visibility === "public" ? "公開收藏" : "私人收藏"}
                    </div>
                  </div>
                  <Tooltip title={visibility === "public" ? "公開中" : "私人"}>
                    <Switch
                      size="small"
                      checked={visibility === "public"}
                      onChange={(_, checked) =>
                        handleVisibilityChange(checked ? "public" : "private")
                      }
                      inputProps={{
                        "aria-label": "切換收藏庫可見性",
                      }}
                      sx={{
                        width: 52,
                        height: 32,
                        padding: 0,
                        "& .MuiSwitch-switchBase": {
                          padding: "4px",
                          transitionDuration: "200ms",
                        },
                        "& .MuiSwitch-switchBase.Mui-checked": {
                          transform: "translateX(20px)",
                          color: "#fff",
                        },
                        "& .MuiSwitch-thumb": {
                          position: "relative",
                          width: 24,
                          height: 24,
                          boxShadow: "none",
                          backgroundColor: "var(--mc-text)",
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            inset: 0,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                            backgroundSize: "16px 16px",
                            backgroundImage: `url("data:image/svg+xml,${visibility === "public" ? PUBLIC_SWITCH_ICON : PRIVATE_SWITCH_ICON}")`,
                          },
                        },
                        "& .MuiSwitch-track": {
                          borderRadius: 999,
                          backgroundColor: "rgba(148, 163, 184, 0.28)",
                          opacity: 1,
                        },
                        "& .Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "var(--mc-accent)",
                          opacity: 0.65,
                        },
                      }}
                    />
                  </Tooltip>
                </div>
                <div className="mt-2 text-[12px] text-[var(--mc-text-muted)]">
                  私人收藏僅自己可見，公開收藏可讓其他玩家瀏覽與使用
                </div>
                {!isAdmin && (
                  <>
                    <div className="mt-2 text-[12px] text-[var(--mc-text-muted)]">
                      目前已建立 {collections.length} /{" "}
                      {MAX_COLLECTIONS_PER_USER} 個收藏庫，還能再建立{" "}
                      {remainingCollectionSlots} 個。
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--mc-text-muted)]">
                      私人收藏目前 {privateCollectionsCount} /{" "}
                      {MAX_PRIVATE_COLLECTIONS_PER_USER} 個，還能再建立{" "}
                      {remainingPrivateCollectionSlots} 個。
                    </div>
                    {reachedCollectionLimit && (
                      <div className="mt-2 rounded-lg border border-amber-400/35 bg-amber-950/35 px-2.5 py-2 text-[12px] text-amber-200">
                        已達收藏庫建立上限，請先整理現有收藏後再建立新的收藏庫。
                      </div>
                    )}
                    {!reachedCollectionLimit &&
                      reachedPrivateCollectionLimit && (
                        <div className="mt-2 rounded-lg border border-amber-400/35 bg-amber-950/35 px-2.5 py-2 text-[12px] text-amber-200">
                          私人收藏已達上限，目前只能建立公開收藏。
                        </div>
                      )}
                  </>
                )}
              </div>

              {createError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
                  {createError}
                </div>
              )}
            </div>

            <div className="h-full rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 p-3">
              {(playlistLoading || isImportingYoutubePlaylist) && (
                <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/8 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative inline-flex h-12 w-12 items-center justify-center">
                      <CircularProgress
                        size={44}
                        thickness={4}
                        variant={
                          importProgressPercent === null
                            ? "indeterminate"
                            : "determinate"
                        }
                        value={importProgressPercent ?? undefined}
                        sx={{ color: "#38bdf8" }}
                      />
                      <span className="absolute text-[10px] font-semibold text-[var(--mc-text)]">
                        {importProgressPercent === null
                          ? "..."
                          : `${importProgressPercent}%`}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--mc-text)]">
                        {playlistSource === "youtube"
                          ? "正在匯入 YouTube 清單"
                          : "正在匯入播放清單"}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--mc-text-muted)]">
                        {importProgressLabel ?? "正在準備匯入內容..."}
                      </div>
                      {playlistProgress.total > 0 && (
                        <div className="mt-1 text-[11px] text-cyan-100/90">
                          完成後會自動更新右側清單預覽
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {collectionPreview ? (
                <div
                  className={
                    playlistLoading || isImportingYoutubePlaylist ? "mt-3" : ""
                  }
                >
                  <div className="mt-1 flex items-center justify-between text-xs text-[var(--mc-text-muted)]">
                    {isTitleEditing ? (
                      <input
                        ref={titleInputRef}
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            handleTitleCancel();
                            return;
                          }
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleTitleSave();
                          }
                        }}
                        placeholder="請輸入收藏標題"
                        className="min-w-0 flex-1 rounded-none border-0 border-b border-[var(--mc-border)] bg-transparent px-0 py-1 text-base font-semibold text-[var(--mc-text)] outline-none"
                      />
                    ) : (
                      <div className="flex min-w-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsTitleEditing(true)}
                          className="min-w-0 cursor-pointer text-left"
                          aria-label="編輯收藏標題"
                        >
                          <div className="truncate text-base font-semibold text-[var(--mc-text)]">
                            {collectionPreview.title}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsTitleEditing(true)}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-[var(--mc-surface)]/60 hover:text-[var(--mc-text)]"
                          aria-label="編輯收藏標題"
                        >
                          <EditOutlined sx={{ fontSize: 16 }} />
                        </button>
                      </div>
                    )}
                    <span>{`${collectionPreview.count} 首歌曲`}</span>
                  </div>
                  {!isAdmin && (
                    <div className="mt-2 text-[11px] text-[var(--mc-text-muted)]">
                      一般使用者每個收藏庫最多可收錄{" "}
                      {collectionItemLimit === null
                        ? "無上限"
                        : collectionItemLimit}{" "}
                      題。
                    </div>
                  )}
                  <div className="mt-3 border-t border-[var(--mc-border)]/70 pt-3">
                    <div className="h-full w-full overflow-hidden rounded-lg">
                      <List<PreviewVirtualRowProps>
                        style={{ height: previewListHeight, width: "100%" }}
                        rowCount={playlistItems.length}
                        rowHeight={PREVIEW_ROW_HEIGHT}
                        rowProps={previewRowProps}
                        rowComponent={PreviewVirtualRow}
                      />
                    </div>
                  </div>
                  {playlistIssueTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => setPlaylistIssueDialogOpen(true)}
                      className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-left text-xs text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/15"
                    >
                      <span className="font-semibold">未成功匯入原因</span>
                      <span>{playlistIssueTotal} 首，查看明細</span>
                    </button>
                  )}
                </div>
              ) : !(playlistLoading || isImportingYoutubePlaylist) ? (
                <div className="mt-3 rounded-xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-3 text-[11px] text-[var(--mc-text-muted)]">
                  匯入播放清單後，這裡會顯示收藏內容預覽
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <Dialog
          open={playlistIssueDialogOpen}
          onClose={() => setPlaylistIssueDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          sx={{
            "& .MuiDialog-container": {
              alignItems: "flex-start",
            },
          }}
          PaperProps={{
            sx: {
              borderRadius: 3,
              border: "1px solid rgba(148, 163, 184, 0.22)",
              background:
                "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(2,6,23,0.98))",
              color: "var(--mc-text)",
              mt: { xs: 12, sm: 14 },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold">未成功匯入原因</div>
                <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  共 {playlistIssueTotal} 首未能匯入收藏庫
                </div>
              </div>
              <IconButton
                size="small"
                onClick={() => setPlaylistIssueDialogOpen(false)}
                aria-label="關閉未成功匯入原因"
                sx={{ color: "var(--mc-text-muted)" }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </div>
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Tabs
              value={playlistIssueTab}
              onChange={(_, value: PlaylistIssueTab) =>
                setPlaylistIssueTab(value)
              }
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
                "& .MuiTabs-indicator": {
                  height: 2,
                  borderRadius: 999,
                  backgroundColor: "var(--mc-accent)",
                },
                "& .MuiTab-root": {
                  minHeight: 36,
                  px: 1.5,
                  color: "var(--mc-text-muted)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "none",
                },
                "& .Mui-selected": {
                  color: "var(--mc-text)",
                },
              }}
            >
              {playlistIssueGroups.map((group) => (
                <Tab
                  key={group.key}
                  value={group.key}
                  label={`${group.label} ${group.count}`}
                />
              ))}
            </Tabs>

            <div className="min-h-[180px] pb-2 pt-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePlaylistIssueGroup.key}
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  style={{ originY: 0 }}
                  transition={{
                    layout: {
                      duration: 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                  className={`rounded-2xl border px-4 py-3 ${activePlaylistIssueGroup.className}`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>{activePlaylistIssueGroup.label}</span>
                    <span>{activePlaylistIssueGroup.count} 首</span>
                  </div>
                  <div className="mt-3 max-h-64 overflow-y-auto pr-1">
                    {activePlaylistIssueGroup.items.length > 0 ? (
                      <div className="space-y-1.5">
                        {activePlaylistIssueGroup.items.map((item, index) => (
                          <div
                            key={`${activePlaylistIssueGroup.key}-${item}-${index}`}
                            className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 px-3 py-2"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-[11px] font-semibold">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1 truncate text-xs leading-5">
                              {item}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-3 text-xs opacity-90">
                        {activePlaylistIssueGroup.fallback ?? "無"}
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
};

export default CollectionsCreatePage;
