import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { List, type RowComponentProps } from "react-window";

import { Box, Button } from "@mui/material";
import { useRoom } from "../../Room/model/useRoom";
import { ensureFreshAuthToken } from "../../../shared/auth/token";
import { trackEvent } from "../../../shared/analytics/track";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

type DbCollection = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
};

const DEFAULT_DURATION_SEC = 30;

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

const extractVideoId = (url: string | undefined | null) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    const id = parsed.searchParams.get("v");
    if (id) return id;
    const path = parsed.pathname.split("/").filter(Boolean);
    if (path[0] === "shorts" && path[1]) return path[1];
    if (path[0] === "embed" && path[1]) return path[1];
    return null;
  } catch {
    return null;
  }
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
            {item.duration ? ` 繚 ${item.duration}` : ""}
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
    playlistUrl,
    playlistItems,
    lastFetchedPlaylistTitle,
    playlistError,
    playlistLoading,
    handleFetchPlaylist,
    setPlaylistUrl,
    authLoading,
    refreshAuthToken,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
    loginWithGoogle,
  } = useRoom();

  const [collectionTitle, setCollectionTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [playlistSource, setPlaylistSource] = useState<"url" | "youtube">(
    "url",
  );
  const youtubeFetchedRef = useRef(false);
  const [selectedYoutubePlaylistId, setSelectedYoutubePlaylistId] =
    useState("");
  const [isImportingYoutubePlaylist, setIsImportingYoutubePlaylist] =
    useState(false);
  const [youtubeActionError, setYoutubeActionError] = useState<string | null>(
    null,
  );

  const ownerId = authUser?.id ?? null;
  const hasPlaylistItems = playlistItems.length > 0;

  useEffect(() => {
    if (!lastFetchedPlaylistTitle) return;
    setCollectionTitle(lastFetchedPlaylistTitle);
  }, [lastFetchedPlaylistTitle]);

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

    setCreateError(null);
    setIsCreating(true);

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
          start_sec: 0,
          end_sec: Math.max(1, endSec),
          answer_text: item.answerText || item.title || "Untitled",
          ...(durationSec ? { duration_sec: durationSec } : {}),
        };
      });

      const insert = async (token: string, allowRetry: boolean) => {
        const res = await fetch(
          `${API_URL}/api/collections/${created.id}/items`,
          {
            method: "POST",
            headers: buildJsonHeaders(token),
            body: JSON.stringify({ items: insertItems }),
          },
        );
        if (res.status === 401 && allowRetry) {
          const refreshed = await refreshAuthToken();
          if (refreshed) {
            return insert(refreshed, false);
          }
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to insert items");
        }
        return null;
      };

      await insert(token, true);
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
    }
  };

  return (
    <Box className="mx-auto w-full max-w-6xl px-4 pb-6 pt-4">
      <Box className="relative overflow-hidden p-5 text-[var(--mc-text)] shadow-[0_30px_70px_-50px_rgba(15,23,42,0.8)]">
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_60%)]" />
        </div>

        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.35em] text-[var(--mc-text-muted)]">
            Collection Studio
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-[var(--mc-text)]">
            建立收藏庫
          </div>

          {!authToken && !authLoading && (
            <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              請先使用 Google 登入後再建立收藏
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid gap-3 lg:grid-rows-[auto_auto_auto_1fr]">
              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[var(--mc-text-muted)]">
                    匯入來源
                  </div>
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
                    <div className="text-[11px] text-[var(--mc-text-muted)]">
                      貼上 YouTube 播放清單連結
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        placeholder="貼上 YouTube 播放清單網址"
                        className="min-w-[220px] flex-1 rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-2 text-sm text-[var(--mc-text)]"
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleFetchPlaylist()}
                        disabled={playlistLoading}
                      >
                        {playlistLoading ? "載入中..." : "匯入清單"}
                      </Button>
                    </div>
                    {playlistError && (
                      <div className="text-xs text-rose-300">
                        {playlistError}
                      </div>
                    )}
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
                      登入 Google 後可直接載入你的 YouTube 播放清單
                      {!authUser && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={loginWithGoogle}
                        >
                          登入 Google
                        </Button>
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
                <div className="text-xs text-[var(--mc-text-muted)]">
                  收藏標題
                </div>
                <input
                  value={collectionTitle}
                  onChange={(e) => {
                    setCollectionTitle(e.target.value);
                  }}
                  placeholder="請輸入收藏標題"
                  className="mt-2 w-full rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/70 px-3 py-2 text-sm text-[var(--mc-text)]"
                />
                <div className="mt-2 text-[11px] text-[var(--mc-text-muted)]">
                  匯入清單後會自動帶入標題，你也可以手動修改
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-3">
                <div className="text-xs text-[var(--mc-text-muted)]">
                  可見性
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      visibility === "private"
                        ? "border-amber-400/60 bg-amber-400/10 text-amber-100"
                        : "border-[var(--mc-border)] text-[var(--mc-text-muted)] hover:border-[var(--mc-accent)]/60"
                    }`}
                  >
                    私人
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      visibility === "public"
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                        : "border-[var(--mc-border)] text-[var(--mc-text-muted)] hover:border-[var(--mc-accent)]/60"
                    }`}
                  >
                    公開
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-[var(--mc-text-muted)]">
                  私人收藏僅自己可見，公開收藏可讓其他玩家瀏覽與使用
                </div>
              </div>

              {createError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
                  {createError}
                </div>
              )}
            </div>

            <div className="p-3 h-full">
              {/* <div className="text-xs text-[var(--mc-text-muted)]">
                ?嗉?摨恍?閬?
              </div> */}
              {collectionPreview ? (
                <div className="mt-3">
                  <div className="mt-1 flex items-center justify-between text-xs text-[var(--mc-text-muted)]">
                    <div className="text-base font-semibold text-[var(--mc-text)]">
                      {collectionPreview.title}
                    </div>
                    <span>{`${collectionPreview.count} 首歌曲`}</span>
                  </div>
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
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-3 text-[11px] text-[var(--mc-text-muted)]">
                  匯入播放清單後，這裡會顯示收藏內容預覽
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outlined" onClick={() => navigate("/collections")}>
              返回收藏列表
            </Button>
            <Button
              variant="contained"
              onClick={() => handleCreateCollection()}
              disabled={isCreating || authLoading || !authToken}
            >
              {isCreating ? "建立中..." : "建立收藏"}
            </Button>
          </div>
        </div>
      </Box>
    </Box>
  );
};

export default CollectionsCreatePage;

