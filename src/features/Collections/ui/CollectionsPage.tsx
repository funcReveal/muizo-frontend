import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import CheckRounded from "@mui/icons-material/CheckRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import QuizRounded from "@mui/icons-material/QuizRounded";
import ShareRounded from "@mui/icons-material/ShareRounded";
import StarBorderRounded from "@mui/icons-material/StarBorderRounded";
import { useAuth } from "../../../shared/auth/AuthContext";
import { isAdminRole } from "../../../shared/auth/roles";
import { ensureFreshAuthToken } from "../../../shared/auth/token";
import { collectionsApi } from "../model/collectionsApi";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
} from "../model/collectionLimits";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";
import { appToast } from "../../../shared/ui/toastApi";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

type DbCollection = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
  cover_title?: string | null;
  cover_channel_title?: string | null;
  cover_thumbnail_url?: string | null;
  cover_duration_sec?: number | null;
  cover_source_id?: string | null;
  cover_provider?: string | null;
  item_count?: number | null;
  use_count?: number | null;
  favorite_count?: number | null;
};

const TEXT = {
  title: "我的收藏",
  create: "建立新收藏",
  emptyTitle: "目前沒有收藏",
  emptyBody: "先建立一個收藏，之後就可以快速開房使用。",
  loading: "載入中...",
  error: "載入失敗",
  open: "開啟",
  deleteConfirm: "刪除後無法復原，確定要刪除此收藏嗎？",
  deleteError: "刪除失敗",
  unknownError: "發生未知錯誤",
  loginHint: "請先使用 Google 登入，才能查看與管理收藏。",
  public: "公開",
  private: "私人",
  publicConfirm: "公開後其他人可以瀏覽與使用這份收藏，確定要設為公開嗎？",
};

const SKELETON_COUNT = 6;
const skeletonBase =
  "relative overflow-hidden rounded-md bg-gradient-to-r from-slate-900/60 via-slate-800/70 to-slate-900/60 animate-pulse";

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`${skeletonBase} ${className}`} />
);

const SkeletonCircle = ({ className = "" }: { className?: string }) => (
  <div className={`${skeletonBase} rounded-full ${className}`} />
);

const CollectionsSkeleton = () => (
  <div className="grid gap-3 sm:grid-cols-2">
    {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
      <div
        key={`collection-skeleton-${index}`}
        className="rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-4 space-y-3"
      >
        <SkeletonBlock className="h-3 w-14" />
        <SkeletonBlock className="h-5 w-2/3" />
        <SkeletonBlock className="h-3 w-4/5" />
        <div className="flex items-center gap-2 pt-1">
          <SkeletonCircle className="h-7 w-7" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
);

const CollectionsPage = () => {
  const navigate = useNavigate();
  const {
    authToken,
    authUser,
    displayUsername,
    authLoading,
    refreshAuthToken,
  } = useAuth();
  const [collections, setCollections] = useState<DbCollection[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<
    string | null
  >(null);
  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<{
    id: string;
    visibility: "private" | "public";
  } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedShareCollectionId, setCopiedShareCollectionId] = useState<
    string | null
  >(null);
  const [authResolved, setAuthResolved] = useState(() => !authLoading);
  const shareFeedbackTimerRef = useRef<number | null>(null);
  const ownerId = authUser?.id ?? null;
  const isAdmin = isAdminRole(authUser?.role);
  const privateCollectionsCount = collections.filter(
    (item) => item.visibility !== "public",
  ).length;
  const hasReachedCollectionLimit =
    !isAdmin && collections.length >= MAX_COLLECTIONS_PER_USER;
  const showSkeleton = loading && collections.length === 0;

  useEffect(() => {
    if (!authLoading) {
      setAuthResolved(true);
    }
  }, [authLoading]);

  useEffect(() => {
    return () => {
      if (shareFeedbackTimerRef.current !== null) {
        window.clearTimeout(shareFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!API_URL || !ownerId || !authToken) return;
    let active = true;

    const run = async (token: string, allowRetry: boolean) => {
      const userRes = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: ownerId,
          display_name: displayUsername || "Guest",
          provider: authUser?.provider ?? "google",
          provider_user_id: authUser?.provider_user_id ?? ownerId,
        }),
      });

      if (userRes.status === 401 && allowRetry) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          return run(refreshed, false);
        }
      }

      if (!userRes.ok) {
        const userPayload = await userRes.json().catch(() => null);
        throw new Error(userPayload?.error ?? TEXT.error);
      }

      const res = await fetch(
        `${API_URL}/api/collections?owner_id=${encodeURIComponent(
          ownerId,
        )}&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.status === 401 && allowRetry) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          return run(refreshed, false);
        }
      }

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? TEXT.error);
      }

      const items = (payload?.data?.items ?? []) as DbCollection[];
      if (!active) return;
      setCollections(items);
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) {
          throw new Error("Unauthorized");
        }
        await run(token, true);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : TEXT.unknownError);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [
    authToken,
    refreshAuthToken,
    authUser?.provider,
    authUser?.provider_user_id,
    displayUsername,
    ownerId,
  ]);

  const handleDeleteCollection = async (id: string) => {
    if (!API_URL || !authToken) return;
    setDeletingId(id);
    try {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) throw new Error("Unauthorized");
      const res = await fetch(`${API_URL}/api/collections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? TEXT.deleteError);
      }
      setCollections((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  const applyVisibilityChange = async (
    id: string,
    visibility: "private" | "public",
  ) => {
    if (!API_URL || !authToken) return;
    const targetCollection = collections.find((item) => item.id === id);
    if (
      !isAdmin &&
      visibility === "private" &&
      targetCollection?.visibility !== "private" &&
      privateCollectionsCount >= MAX_PRIVATE_COLLECTIONS_PER_USER
    ) {
      appToast.warning(
        `私人收藏最多只能建立 ${MAX_PRIVATE_COLLECTIONS_PER_USER} 個，請改為公開收藏或先整理現有私人收藏。`,
        { id: "private-collection-limit" },
      );
      return;
    }
    setVisibilityUpdatingId(id);
    try {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) throw new Error("Unauthorized");
      await collectionsApi.updateCollection(token, id, { visibility });
      setCollections((prev) =>
        prev.map((item) => (item.id === id ? { ...item, visibility } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.unknownError);
    } finally {
      setVisibilityUpdatingId(null);
    }
  };

  const handleShareCollection = async (collection: DbCollection) => {
    if (collection.visibility !== "public") {
      setError("請先將收藏庫設為公開後再分享");
      return;
    }
    try {
      const shareUrl = new URL("/rooms", window.location.origin);
      shareUrl.searchParams.set("sharedCollection", collection.id);
      await navigator.clipboard.writeText(shareUrl.toString());
      if (shareFeedbackTimerRef.current !== null) {
        window.clearTimeout(shareFeedbackTimerRef.current);
      }
      setCopiedShareCollectionId(collection.id);
      shareFeedbackTimerRef.current = window.setTimeout(() => {
        setCopiedShareCollectionId((current) =>
          current === collection.id ? null : current,
        );
        shareFeedbackTimerRef.current = null;
      }, 1400);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立分享連結失敗");
    }
  };

  if (!authResolved) {
    return (
      <Box className="w-full md:w-full lg:w-3/5 mx-auto space-y-4">
        <Box className="flex items-center justify-between gap-3">
          <Typography
            variant="h6"
            className="text-[var(--mc-text)] font-semibold"
          >
            {TEXT.title}
          </Typography>
        </Box>
        <CollectionsSkeleton />
      </Box>
    );
  }

  if (!authToken) {
    return (
      <Box className="w-full md:w-full lg:w-3/5 mx-auto space-y-4">
        <Box className="rounded-lg border border-amber-400/40 bg-amber-950/40 p-4 text-sm text-amber-200">
          {TEXT.loginHint}
        </Box>
      </Box>
    );
  }

  return (
    <Box className="w-full md:w-full lg:w-3/5 mx-auto space-y-4">
      <Box className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Typography
            variant="h6"
            className="text-[var(--mc-text)] font-semibold"
          >
            {TEXT.title}
          </Typography>
          {!isAdmin && (
            <div className="flex items-center gap-1 text-sm text-[var(--mc-text-muted)]">
              <span>{collections.length}</span>
              <span className="opacity-50">/</span>
              <span>{MAX_COLLECTIONS_PER_USER}</span>
              <span className="px-1 opacity-35">·</span>
              <span>私人</span>
              <span>{privateCollectionsCount}</span>
              <span className="opacity-50">/</span>
              <span>{MAX_PRIVATE_COLLECTIONS_PER_USER}</span>
            </div>
          )}
        </div>
      </Box>

      {showSkeleton ? (
        <CollectionsSkeleton />
      ) : (
        <>
          {error && (
            <Typography variant="body2" className="text-rose-300">
              {error}
            </Typography>
          )}
          <Box className="grid auto-rows-[1fr] gap-3 sm:grid-cols-2">
            <Card
              sx={{
                backgroundColor: "var(--mc-bg)",
                borderColor: "var(--mc-border)",
              }}
              className="h-full min-h-[180px] border-2 border-dashed"
            >
              <CardActionArea
                onClick={() => {
                  if (!hasReachedCollectionLimit) {
                    navigate("/collections/new");
                  }
                }}
                className="h-full"
                disabled={hasReachedCollectionLimit}
              >
                <CardContent className="flex h-full flex-col items-center justify-center text-center">
                  <Typography variant="h4" className="text-[var(--mc-text)]">
                    +
                  </Typography>
                  <Typography
                    variant="body2"
                    className="text-[var(--mc-text-muted)]"
                  >
                    {hasReachedCollectionLimit
                      ? `已達 ${MAX_COLLECTIONS_PER_USER} 個上限`
                      : TEXT.create}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>

            {collections.map((collection) => {
              const thumb =
                collection.cover_thumbnail_url ||
                (collection.cover_provider === "youtube" &&
                collection.cover_source_id
                  ? `https://i.ytimg.com/vi/${collection.cover_source_id}/hqdefault.jpg`
                  : "");
              const itemCount = Math.max(0, Number(collection.item_count ?? 0));
              const useCount = Math.max(0, Number(collection.use_count ?? 0));
              const favoriteCount = Math.max(
                0,
                Number(collection.favorite_count ?? 0),
              );
              return (
                <Card
                  key={collection.id}
                  variant="outlined"
                  sx={{
                    backgroundColor:
                      "color-mix(in srgb, var(--mc-surface-strong) 88%, black)",
                    borderColor: "var(--mc-border)",
                  }}
                  className="group relative h-full min-h-[180px] overflow-hidden"
                >
                  {thumb && (
                    <Box
                      className="absolute inset-0 bg-cover bg-center opacity-70 transition-opacity duration-300 group-hover:opacity-85"
                      style={{ backgroundImage: `url(${thumb})` }}
                    />
                  )}
                  <Box className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                  <CardActionArea
                    onClick={() =>
                      navigate(`/collections/${collection.id}/edit`)
                    }
                    className="relative z-10 h-full"
                  >
                    <CardContent className="flex h-full flex-col justify-between">
                      <Box className="flex items-center justify-between">
                        <Typography
                          variant="h6"
                          className="min-w-0 truncate pr-3 font-semibold text-white"
                          title={collection.title || collection.id}
                        >
                          {collection.title || collection.id}
                        </Typography>
                        <Box
                          className="flex items-center gap-1"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/30 px-2 py-0.5">
                            <Tooltip
                              title={
                                collection.visibility === "public"
                                  ? "公開"
                                  : "私人"
                              }
                            >
                              <span className="inline-flex items-center gap-1 text-[11px] text-white/80">
                                {collection.visibility === "public" ? (
                                  <PublicOutlined fontSize="inherit" />
                                ) : (
                                  <LockOutlined fontSize="inherit" />
                                )}
                                {collection.visibility === "public"
                                  ? "公開"
                                  : "私人"}
                              </span>
                            </Tooltip>
                            <Switch
                              size="small"
                              checked={collection.visibility === "public"}
                              disabled={visibilityUpdatingId === collection.id}
                              onChange={(_, checked) =>
                                checked
                                  ? (setPendingVisibility({
                                      id: collection.id,
                                      visibility: "public",
                                    }),
                                    setConfirmPublicOpen(true))
                                  : applyVisibilityChange(
                                      collection.id,
                                      "private",
                                    )
                              }
                              sx={{
                                "& .MuiSwitch-thumb": {
                                  backgroundColor: "white",
                                },
                                "& .MuiSwitch-track": {
                                  backgroundColor: "rgba(255,255,255,0.2)",
                                  opacity: 1,
                                },
                                "& .Mui-checked + .MuiSwitch-track": {
                                  backgroundColor: "rgba(56,189,248,0.6)",
                                  opacity: 1,
                                },
                              }}
                            />
                          </div>
                          <Tooltip
                            title={
                              collection.visibility === "public"
                                ? "分享公開收藏庫"
                                : "請先設為公開才能分享"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={collection.visibility !== "public"}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleShareCollection(collection);
                                }}
                                className="text-white/70 hover:text-white"
                                aria-label="share"
                              >
                                <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center overflow-hidden">
                                  <ShareRounded
                                    fontSize="small"
                                    className={`absolute transition-all duration-200 ${
                                      copiedShareCollectionId === collection.id
                                        ? "scale-75 opacity-0"
                                        : "scale-100 opacity-100"
                                    }`}
                                  />
                                  <CheckRounded
                                    fontSize="small"
                                    className={`absolute text-cyan-300 transition-all duration-200 ${
                                      copiedShareCollectionId === collection.id
                                        ? "scale-100 opacity-100"
                                        : "scale-75 opacity-0"
                                    }`}
                                  />
                                </span>
                              </IconButton>
                            </span>
                          </Tooltip>
                          <IconButton
                            size="small"
                            disabled={deletingId === collection.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setPendingDeleteId(collection.id);
                              setConfirmDeleteOpen(true);
                            }}
                            className="text-white/70 hover:text-white"
                            aria-label="delete"
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box>
                        <div className="flex flex-wrap gap-3 text-[14px] font-semibold leading-none text-slate-100/92">
                          <span className="inline-flex items-center gap-1.5">
                            <QuizRounded
                              sx={{
                                fontSize: 17,
                                color: "rgba(103, 232, 249, 0.94)",
                              }}
                            />
                            <span>{itemCount} 題</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <BarChartRounded
                              sx={{
                                fontSize: 18,
                                color: "rgba(125, 211, 252, 0.92)",
                              }}
                            />
                            <span>{useCount}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <StarBorderRounded
                              sx={{
                                fontSize: 17,
                                color: "rgba(250, 204, 21, 0.9)",
                              }}
                            />
                            <span>{favoriteCount}</span>
                          </span>
                        </div>
                        {collection.description && (
                          <Typography
                            variant="body2"
                            className="mt-3 line-clamp-2 text-white/70"
                          >
                            {collection.description}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
          <ConfirmDialog
            open={confirmPublicOpen}
            title="設為公開"
            description={TEXT.publicConfirm}
            confirmLabel="設為公開"
            onConfirm={() => {
              if (pendingVisibility) {
                applyVisibilityChange(
                  pendingVisibility.id,
                  pendingVisibility.visibility,
                );
              }
              setPendingVisibility(null);
              setConfirmPublicOpen(false);
            }}
            onCancel={() => {
              setPendingVisibility(null);
              setConfirmPublicOpen(false);
            }}
          />
          <ConfirmDialog
            open={confirmDeleteOpen}
            title="刪除收藏"
            description={TEXT.deleteConfirm}
            confirmLabel="確認"
            onConfirm={() => {
              const targetId = pendingDeleteId;
              setPendingDeleteId(null);
              setConfirmDeleteOpen(false);
              if (targetId) {
                void handleDeleteCollection(targetId);
              }
            }}
            onCancel={() => {
              setPendingDeleteId(null);
              setConfirmDeleteOpen(false);
            }}
          />
        </>
      )}
    </Box>
  );
};

export default CollectionsPage;
