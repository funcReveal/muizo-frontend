import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useTransition } from "react";
import {
  CollectionMetaChips,
  useSubTagsQuery,
  useCategoriesQuery,
} from "@features/CollectionCategory";
import type { CategoryTreeItem } from "@features/CollectionCategory";

import {
  Box,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ShareRounded from "@mui/icons-material/ShareRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { useAuth } from "@/shared/auth/AuthContext";
import { isAdminRole } from "@/shared/auth/roles";
import { ensureFreshAuthToken } from "@/shared/auth/token";
import { CollectionReviewList } from "@features/CollectionReview";
import { getApiEnvelopeErrorMessage } from "@shared/api/apiEnvelope";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";
import {
  apiFetchCollectionItemPreview,
  apiFetchCollectionLeaderboardOverview,
  apiFetchCollectionLeaderboardRankings,
  type CollectionItemPreviewRecord,
  type CollectionLeaderboardEntry,
  type CollectionLeaderboardOverview,
} from "@features/CollectionContent/model/collectionContentApi";
import { collectionsApi } from "../shared/api/collectionsApi";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
} from "../shared/model/collectionLimits";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import { appToast } from "@/shared/ui/toastApi";
import { formatCollectionAvailabilityLabel } from "@features/RoomSession/model/playlistAvailability";
import {
  CreatorRangePicker,
  CreatorTrendChart,
  RatingChart,
  type CreatorDashboard,
  type CreatorInsights,
  type CreatorRange,
} from "./CreatorAnalytics";
import { fetchCreatorAnalytics, formatChange } from "./creatorAnalyticsApi";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");
const DEFAULT_LEADERBOARD_PROFILE_KEY = "classic_30";
const LEADERBOARD_INITIAL_LIMIT = 10;
const LEADERBOARD_PAGE_SIZE = 20;

import {
  type DbCollection,
  type CollectionWorkspaceSection,
  getCollectionIssues,
  canShareCollection,
} from "./collectionWorkspaceModel";
import CollectionWorkspace from "./CollectionWorkspace";

type CollectionDrawerTab = "overview" | "content" | "reviews" | "leaderboard";

const TEXT = {
  title: "我的題庫",
  error: "載入失敗",
  deleteConfirm: "刪除後無法復原，確定要刪除這份題庫嗎？",
  deleteError: "刪除失敗",
  unknownError: "發生未知錯誤",
  loginHint: "登入後即可查看與管理你的題庫。",
  publicConfirm: "其他玩家將能找到、遊玩並分享這份題庫。",
  privateConfirm: "其他玩家將無法瀏覽與使用這份題庫，原本的分享連結也會失效。",
};

const buildCategoryFromId = (
  categoryId: string,
  tree: CategoryTreeItem[],
): DbCollection["category"] | null => {
  for (const parent of tree) {
    if (parent.id === categoryId) {
      return {
        id: parent.id,
        key: parent.key,
        label: parent.label,
        parentKey: null,
        parentLabel: null,
      };
    }
    for (const child of parent.children) {
      if (child.id === categoryId) {
        return {
          id: child.id,
          key: child.key,
          label: child.label,
          parentKey: parent.key,
          parentLabel: parent.label,
        };
      }
    }
  }
  return null;
};

const formatRank = (rank: number | null | undefined) =>
  typeof rank === "number" && Number.isFinite(rank) && rank > 0
    ? `#${rank.toLocaleString("zh-TW")}`
    : "-";

const formatScore = (score: number | null | undefined) =>
  typeof score === "number" && Number.isFinite(score) && score >= 0
    ? score.toLocaleString("zh-TW")
    : "-";

const formatLeaderboardEntryMeta = (entry: CollectionLeaderboardEntry) => {
  const correct =
    entry.correctCount !== null && entry.questionCount !== null
      ? `${entry.correctCount}/${entry.questionCount}`
      : entry.correctCount !== null
        ? `${entry.correctCount} 題`
        : null;
  const accuracy =
    entry.correctCount !== null &&
    entry.questionCount !== null &&
    entry.questionCount > 0
      ? `正確率 ${Math.round((entry.correctCount / entry.questionCount) * 100)}%`
      : null;

  return [correct, accuracy, `Combo x${entry.maxCombo}`]
    .filter(Boolean)
    .join(" · ");
};

const formatDurationSec = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;
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
  const [confirmVisibilityOpen, setConfirmVisibilityOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<{
    id: string;
    visibility: "private" | "public";
  } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedShareCollectionId, setCopiedShareCollectionId] = useState<
    string | null
  >(null);
  const [authResolved, setAuthResolved] = useState(() => !authLoading);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobileWorkspace = useMediaQuery("(max-width: 1023.95px)", {
    noSsr: true,
  });
  const [selectedWorkspaceSection, setWorkspaceSection] =
    useState<CollectionWorkspaceSection | null>(null);
  const workspaceSection =
    selectedWorkspaceSection ?? (isMobileWorkspace ? "list" : "overview");
  const [collectionReloadTick, setCollectionReloadTick] = useState(0);
  const [previewCollectionId, setPreviewCollectionId] = useState<string | null>(
    null,
  );
  const [drawerTab, setDrawerTab] = useState<CollectionDrawerTab>("overview");
  const [creatorRange, setCreatorRange] = useState<CreatorRange>("30d");
  const [isRangeTransitionPending, startRangeTransition] = useTransition();
  const [previewItems, setPreviewItems] = useState<
    CollectionItemPreviewRecord[]
  >([]);
  const [previewItemsLoading, setPreviewItemsLoading] = useState(false);
  const [previewItemsError, setPreviewItemsError] = useState<string | null>(
    null,
  );
  const [activeLeaderboardProfileKey, setActiveLeaderboardProfileKey] =
    useState(DEFAULT_LEADERBOARD_PROFILE_KEY);
  const [leaderboardOverview, setLeaderboardOverview] =
    useState<CollectionLeaderboardOverview | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    CollectionLeaderboardEntry[]
  >([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardLoadingMore, setLeaderboardLoadingMore] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardHasMore, setLeaderboardHasMore] = useState(false);
  const [leaderboardNextOffset, setLeaderboardNextOffset] = useState<
    number | null
  >(null);
  const shareFeedbackTimerRef = useRef<number | null>(null);
  const leaderboardRequestIdRef = useRef(0);
  const previewItemsRequestIdRef = useRef(0);
  const ownerId = authUser?.id ?? null;
  const isAdmin = isAdminRole(authUser?.role);
  const { data: subTagsData = [] } = useSubTagsQuery();
  const { data: categoriesData = [] } = useCategoriesQuery();
  const subTagLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of subTagsData) map.set(tag.key, tag.label);
    return map;
  }, [subTagsData]);
  const filteredCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return collections.filter((collection) => {
      if (
        workspaceSection === "curation" &&
        !getCollectionIssues(collection).length
      )
        return false;
      if (!query) return true;
      const categoryText = collection.category
        ? `${collection.category.parentLabel ?? ""} ${collection.category.label}`
        : "";
      const languageText = (collection.sub_tag_keys ?? [])
        .map((key) => subTagLabelByKey.get(key) ?? key)
        .join(" ");
      return [
        collection.title,
        collection.description,
        collection.cover_title,
        collection.cover_channel_title,
        categoryText,
        languageText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [collections, searchQuery, subTagLabelByKey, workspaceSection]);
  const privateCollectionsCount = collections.filter(
    (item) => item.visibility !== "public",
  ).length;
  const hasReachedCollectionLimit =
    !isAdmin && collections.length >= MAX_COLLECTIONS_PER_USER;
  const previewCollection =
    collections.find((item) => item.id === previewCollectionId) ?? null;
  const activeLeaderboardProfile = leaderboardOverview?.activeProfile ?? null;
  const totalLeaderboardPlayers = activeLeaderboardProfile?.totalPlayers ?? 0;
  const engagementStats = leaderboardOverview?.engagement ?? {
    uniquePlayers: totalLeaderboardPlayers,
    totalPlays: Math.max(0, Number(previewCollection?.use_count ?? 0)),
    totalPlayerSessions: 0,
    casualPlays: 0,
    leaderboardPlays: 0,
  };
  const totalSplitPlays =
    engagementStats.casualPlays + engagementStats.leaderboardPlays;
  const casualPlayRatio =
    totalSplitPlays > 0
      ? (engagementStats.casualPlays / totalSplitPlays) * 100
      : 0;
  const leaderboardPlayRatio =
    totalSplitPlays > 0
      ? (engagementStats.leaderboardPlays / totalSplitPlays) * 100
      : 0;

  const visibilityConfirmContent =
    pendingVisibility?.visibility === "private"
      ? {
          title: "設為私人",
          description: TEXT.privateConfirm,
          confirmLabel: "設為私人",
        }
      : {
          title: "設為公開",
          description: TEXT.publicConfirm,
          confirmLabel: "設為公開",
        };

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

  const loadLeaderboardOverview = useCallback(
    async (collectionId: string, profileKey: string) => {
      if (!API_URL || !authToken) return;
      const requestId = leaderboardRequestIdRef.current + 1;
      leaderboardRequestIdRef.current = requestId;
      setLeaderboardLoading(true);
      setLeaderboardLoadingMore(false);
      setLeaderboardError(null);
      setLeaderboardOverview(null);
      setLeaderboardEntries([]);
      setLeaderboardHasMore(false);
      setLeaderboardNextOffset(null);

      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
          leewayMs: 60_000,
        });
        if (!token) throw new Error("Unauthorized");
        const result = await apiFetchCollectionLeaderboardOverview(
          API_URL,
          token,
          collectionId,
          {
            profileKey,
            limit: LEADERBOARD_INITIAL_LIMIT,
          },
        );
        if (requestId !== leaderboardRequestIdRef.current) return;
        if (!result.ok || !result.payload?.data) {
          throw new Error(
            getApiEnvelopeErrorMessage(result.payload, "排行榜資料載入失敗"),
          );
        }
        const data = result.payload.data;
        setLeaderboardOverview(data);
        setLeaderboardEntries(data.activeProfile.items);
        setLeaderboardHasMore(data.activeProfile.hasMore);
        setLeaderboardNextOffset(data.activeProfile.nextOffset);
      } catch (err) {
        if (requestId !== leaderboardRequestIdRef.current) return;
        setLeaderboardError(
          err instanceof Error ? err.message : "排行榜資料載入失敗",
        );
      } finally {
        if (requestId === leaderboardRequestIdRef.current) {
          setLeaderboardLoading(false);
        }
      }
    },
    [authToken, refreshAuthToken],
  );

  const loadMoreLeaderboardEntries = useCallback(async () => {
    if (
      !API_URL ||
      !authToken ||
      !previewCollection?.id ||
      !leaderboardHasMore ||
      leaderboardLoadingMore ||
      leaderboardNextOffset === null
    ) {
      return;
    }

    const requestId = leaderboardRequestIdRef.current + 1;
    leaderboardRequestIdRef.current = requestId;
    setLeaderboardLoadingMore(true);
    setLeaderboardError(null);

    try {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
        leewayMs: 60_000,
      });
      if (!token) throw new Error("Unauthorized");
      const result = await apiFetchCollectionLeaderboardRankings(
        API_URL,
        token,
        previewCollection.id,
        {
          profileKey: activeLeaderboardProfileKey,
          limit: LEADERBOARD_PAGE_SIZE,
          offset: leaderboardNextOffset,
        },
      );
      if (requestId !== leaderboardRequestIdRef.current) return;
      if (!result.ok || !result.payload?.data) {
        throw new Error(
          getApiEnvelopeErrorMessage(result.payload, "排行榜資料載入失敗"),
        );
      }
      const data = result.payload.data;
      setLeaderboardEntries((current) => {
        const seen = new Set(
          current.map((item) => `${item.rank}:${item.userId ?? ""}`),
        );
        return [
          ...current,
          ...data.items.filter(
            (item) => !seen.has(`${item.rank}:${item.userId ?? ""}`),
          ),
        ];
      });
      setLeaderboardHasMore(data.hasMore);
      setLeaderboardNextOffset(data.nextOffset);
    } catch (err) {
      if (requestId !== leaderboardRequestIdRef.current) return;
      setLeaderboardError(
        err instanceof Error ? err.message : "排行榜資料載入失敗",
      );
    } finally {
      if (requestId === leaderboardRequestIdRef.current) {
        setLeaderboardLoadingMore(false);
      }
    }
  }, [
    activeLeaderboardProfileKey,
    authToken,
    leaderboardHasMore,
    leaderboardLoadingMore,
    leaderboardNextOffset,
    previewCollection?.id,
    refreshAuthToken,
  ]);

  const loadPreviewItems = useCallback(
    async (collectionId: string) => {
      if (!API_URL || !authToken) return;
      const requestId = previewItemsRequestIdRef.current + 1;
      previewItemsRequestIdRef.current = requestId;
      setPreviewItemsLoading(true);
      setPreviewItemsError(null);
      setPreviewItems([]);

      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
          leewayMs: 60_000,
        });
        if (!token) throw new Error("Unauthorized");
        const result = await apiFetchCollectionItemPreview(
          API_URL,
          token,
          collectionId,
          { page: 1, pageSize: 10 },
        );
        if (requestId !== previewItemsRequestIdRef.current) return;
        if (!result.ok || !result.payload?.data) {
          throw new Error(result.payload?.error?.message ?? "題庫內容載入失敗");
        }
        setPreviewItems(result.payload.data.items ?? []);
      } catch (err) {
        if (requestId !== previewItemsRequestIdRef.current) return;
        setPreviewItemsError(
          err instanceof Error ? err.message : "題庫內容載入失敗",
        );
      } finally {
        if (requestId === previewItemsRequestIdRef.current) {
          setPreviewItemsLoading(false);
        }
      }
    },
    [authToken, refreshAuthToken],
  );

  useEffect(() => {
    if (!previewCollection?.id) {
      leaderboardRequestIdRef.current += 1;
      previewItemsRequestIdRef.current += 1;
      setLeaderboardOverview(null);
      setLeaderboardEntries([]);
      setLeaderboardError(null);
      setLeaderboardHasMore(false);
      setLeaderboardNextOffset(null);
      setPreviewItems([]);
      setPreviewItemsError(null);
      setPreviewItemsLoading(false);
      setDrawerTab("overview");
      return;
    }
    void loadLeaderboardOverview(
      previewCollection.id,
      activeLeaderboardProfileKey,
    );
    void loadPreviewItems(previewCollection.id);
  }, [
    activeLeaderboardProfileKey,
    loadLeaderboardOverview,
    loadPreviewItems,
    previewCollection?.id,
  ]);

  const dashboardQuery = useQuery({
    queryKey: ["creator-dashboard", ownerId, creatorRange],
    queryFn: async ({ signal }) => {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
        leewayMs: 60_000,
      });
      if (!token) throw new Error("Unauthorized");
      return fetchCreatorAnalytics<CreatorDashboard>(
        API_URL,
        token,
        `/api/collections/creator-dashboard?range=${creatorRange}`,
        signal,
      );
    },
    enabled: Boolean(API_URL && authToken && ownerId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const dashboardData = dashboardQuery.data ?? null;
  const dashboardError =
    dashboardQuery.error instanceof Error ? dashboardQuery.error.message : null;

  const insightsQuery = useQuery({
    queryKey: [
      "creator-insights",
      ownerId,
      previewCollection?.id ?? null,
      creatorRange,
    ],
    queryFn: async ({ signal }) => {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
        leewayMs: 60_000,
      });
      if (!token) throw new Error("Unauthorized");
      return fetchCreatorAnalytics<CreatorInsights>(
        API_URL,
        token,
        `/api/collections/${previewCollection?.id}/creator-insights?range=${creatorRange}`,
        signal,
      );
    },
    enabled: Boolean(API_URL && authToken && ownerId && previewCollection?.id),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const insightsData = insightsQuery.data ?? null;
  const insightsError =
    insightsQuery.error instanceof Error ? insightsQuery.error.message : null;
  const insightsLoading = insightsQuery.isLoading;
  const isCreatorAnalyticsRefreshing =
    dashboardQuery.isFetching ||
    insightsQuery.isFetching ||
    isRangeTransitionPending;
  const handleCreatorRangeChange = useCallback(
    (range: CreatorRange) => {
      if (range === creatorRange) return;
      startRangeTransition(() => setCreatorRange(range));
    },
    [creatorRange, startRangeTransition],
  );

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
    collectionReloadTick,
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

  // Quick-update a collection's category from the card (optimistic UI)
  const handleUpdateCategory = useCallback(
    async (collectionId: string, categoryId: string | null) => {
      if (!authToken) return;
      const target = collections.find((c) => c.id === collectionId);
      if (!target) return;

      // Block clearing category — required for both private and public (backend rejects null)
      if (categoryId === null) {
        appToast.warning("收藏庫必須選擇分類", {
          id: "category-required",
        });
        return;
      }

      const previousCategory = target.category ?? null;
      const optimisticCategory = buildCategoryFromId(
        categoryId,
        categoriesData,
      );

      // Optimistic update — UI reflects immediately using local tree data
      setCollections((prev) =>
        prev.map((item) =>
          item.id === collectionId
            ? { ...item, category: optimisticCategory }
            : item,
        ),
      );

      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) {
          setCollections((prev) =>
            prev.map((item) =>
              item.id === collectionId
                ? { ...item, category: previousCategory }
                : item,
            ),
          );
          return;
        }
        await collectionsApi.updateCollection(token, collectionId, {
          category_id: categoryId,
        });
      } catch (err) {
        // Revert on error
        setCollections((prev) =>
          prev.map((item) =>
            item.id === collectionId
              ? { ...item, category: previousCategory }
              : item,
          ),
        );
        setError(err instanceof Error ? err.message : "分類更新失敗");
      }
    },
    [authToken, collections, refreshAuthToken, categoriesData],
  );

  // Quick-update a collection's sub-tag keys from the card (optimistic UI)
  const handleUpdateSubTags = useCallback(
    async (collectionId: string, nextKeys: string[]) => {
      if (!authToken) return;
      const target = collections.find((c) => c.id === collectionId);
      if (!target) return;

      const previousKeys = target.sub_tag_keys ?? [];
      // Optimistic update — UI reflects immediately
      setCollections((prev) =>
        prev.map((item) =>
          item.id === collectionId ? { ...item, sub_tag_keys: nextKeys } : item,
        ),
      );

      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        });
        if (!token) return;
        await collectionsApi.updateCollection(token, collectionId, {
          sub_tag_keys: nextKeys,
        });
      } catch (err) {
        // Revert on error
        setCollections((prev) =>
          prev.map((item) =>
            item.id === collectionId
              ? { ...item, sub_tag_keys: previousKeys }
              : item,
          ),
        );
        setError(err instanceof Error ? err.message : "語系更新失敗");
      }
    },
    [authToken, collections, refreshAuthToken],
  );

  const handleShareCollection = async (collection: DbCollection) => {
    if (!canShareCollection(collection)) {
      setError("這份題庫尚未公開發布，暫時無法分享。");
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
      <Box className="w-full space-y-4">
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
      <Box className="w-full">
        <Box className="rounded-lg border border-amber-400/40 bg-amber-950/40 p-4 text-sm text-amber-200">
          {TEXT.loginHint}
        </Box>
      </Box>
    );
  }

  return (
    <Box className="h-full min-h-0 w-full min-w-0 text-[var(--mc-text)]">
      <CollectionWorkspace
        mobile={isMobileWorkspace}
        section={workspaceSection}
        onSectionChange={setWorkspaceSection}
        collections={collections}
        filteredCollections={filteredCollections}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        error={error}
        onRetryCollections={() => setCollectionReloadTick((value) => value + 1)}
        dashboard={dashboardData}
        dashboardError={dashboardError}
        dashboardRefreshing={isCreatorAnalyticsRefreshing}
        onRetryDashboard={() => void dashboardQuery.refetch()}
        range={creatorRange}
        onRangeChange={handleCreatorRangeChange}
        isAdmin={isAdmin}
        canCreate={!hasReachedCollectionLimit}
        onCreate={() => {
          if (!hasReachedCollectionLimit) navigate("/collections/new");
        }}
        onBrowse={() => navigate("/rooms")}
        onOpen={(id) => {
          if (
            collections.find((item) => item.id === id)?.lifecycle_status ===
            "draft"
          )
            navigate(`/collections/${id}/edit`);
          else setPreviewCollectionId(id);
        }}
        onEdit={(id) => navigate(`/collections/${id}/edit`)}
        onShare={(collection) => void handleShareCollection(collection)}
        onDelete={(id) => {
          setPendingDeleteId(id);
          setConfirmDeleteOpen(true);
        }}
        onVisibilityChange={(id, visibility) => {
          setPendingVisibility({ id, visibility });
          setConfirmVisibilityOpen(true);
        }}
        onUpdateCategory={(id, value) => void handleUpdateCategory(id, value)}
        onUpdateSubTags={(id, keys) => void handleUpdateSubTags(id, keys)}
        onResubmitted={(id) =>
          setCollections((previous) =>
            previous.map((item) =>
              item.id === id
                ? {
                    ...item,
                    moderation_status: "under_review",
                    moderation_edited: false,
                  }
                : item,
            ),
          )
        }
        deletingId={deletingId}
        visibilityUpdatingId={visibilityUpdatingId}
        copiedId={copiedShareCollectionId}
      />
      <Drawer
        anchor={isMobileWorkspace ? "bottom" : "right"}
        sx={{ zIndex: 1500 }}
        open={Boolean(previewCollection)}
        onClose={() => setPreviewCollectionId(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", lg: "min(1180px, 94vw)" },
            maxWidth: "100vw",
            borderLeft: "1px solid var(--mc-border)",
            background: "var(--mc-surface)",
            height: { xs: "calc(100dvh - 12px)", lg: "100%" },
            borderRadius: { xs: "22px 22px 0 0", lg: "22px 0 0 22px" },
            color: "var(--mc-text)",
          },
        }}
      >
        {previewCollection ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="relative shrink-0 overflow-hidden border-b border-[var(--mc-border)]">
              {(() => {
                const thumb =
                  previewCollection.cover_thumbnail_url ||
                  (previewCollection.cover_provider === "youtube" &&
                  previewCollection.cover_source_id
                    ? `https://i.ytimg.com/vi/${previewCollection.cover_source_id}/hqdefault.jpg`
                    : "");
                return thumb ? (
                  <div
                    className="absolute inset-0 scale-105 bg-cover bg-center opacity-28"
                    style={{ backgroundImage: `url(${thumb})` }}
                  />
                ) : null;
              })()}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,6,0.42),rgba(7,7,6,0.94)_72%,rgba(7,7,6,1))]" />
              <div className="relative p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-[0.18em] text-[var(--mc-accent)]">
                      CREATOR INSIGHT
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-2xl font-semibold leading-8 text-[var(--mc-text)]">
                      {previewCollection.title || previewCollection.id}
                    </h2>
                  </div>
                  <IconButton
                    size="small"
                    onClick={() => setPreviewCollectionId(null)}
                    aria-label="關閉題庫概覽"
                    sx={{
                      color: "var(--mc-text)",
                      backgroundColor: "rgba(0,0,0,0.28)",
                      border: "1px solid var(--mc-border)",
                    }}
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <CollectionMetaChips collection={previewCollection} />
                  <span className="rounded-full border border-white/16 bg-black/28 px-2 py-1 text-[11px] font-semibold text-slate-200">
                    {previewCollection.visibility === "public"
                      ? "公開"
                      : "私人"}
                  </span>
                  <span className="rounded-full border border-white/16 bg-black/28 px-2 py-1 text-[11px] font-semibold text-slate-200">
                    {formatCollectionAvailabilityLabel(previewCollection)}
                  </span>
                </div>

                {previewCollection.description ? (
                  <p className="mt-3 line-clamp-2 max-w-[62ch] text-sm leading-6 text-slate-300">
                    {previewCollection.description}
                  </p>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      label: "不重複玩家",
                      value: leaderboardLoading
                        ? "..."
                        : engagementStats.uniquePlayers.toLocaleString("zh-TW"),
                    },
                    {
                      label: "開房次數",
                      value: Math.max(
                        0,
                        Number(previewCollection.use_count ?? 0),
                      ).toLocaleString("zh-TW"),
                    },
                    {
                      label: "平均評分",
                      value:
                        Math.max(
                          0,
                          Number(previewCollection.rating_count ?? 0),
                        ) > 0
                          ? Number(previewCollection.rating_avg ?? 0).toFixed(1)
                          : "-",
                    },
                    {
                      label: "評分人數",
                      value: Math.max(
                        0,
                        Number(previewCollection.rating_count ?? 0),
                      ).toLocaleString("zh-TW"),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5"
                    >
                      <div className="text-[11px] text-slate-400">
                        {item.label}
                      </div>
                      <div className="mt-1 text-lg font-semibold leading-none text-slate-50">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/collections/${previewCollection.id}/edit`)
                    }
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--mc-accent)]/55 bg-[var(--mc-accent)] px-3 text-sm font-semibold text-black transition hover:bg-amber-300"
                  >
                    <EditRounded sx={{ fontSize: 16 }} />
                    編輯題庫
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleShareCollection(previewCollection)
                    }
                    disabled={!canShareCollection(previewCollection)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-black/28 px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    <ShareRounded sx={{ fontSize: 16 }} />
                    分享
                  </button>
                </div>
              </div>
            </div>

            <div
              className="grid grid-cols-4 gap-1 border-b border-[var(--mc-border)] bg-black/24 p-2"
              role="tablist"
              aria-label="題庫分析區段"
            >
              {[
                { key: "overview", label: "成效" },
                { key: "content", label: "健康" },
                { key: "reviews", label: "回饋" },
                { key: "leaderboard", label: "排行" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={drawerTab === item.key}
                  aria-controls={`collection-analysis-${item.key}`}
                  onClick={() => setDrawerTab(item.key as CollectionDrawerTab)}
                  className={`h-9 rounded-lg text-xs font-semibold transition ${
                    drawerTab === item.key
                      ? "bg-[var(--mc-accent)] text-black"
                      : "text-[var(--mc-text-muted)] hover:bg-white/[0.06] hover:text-[var(--mc-text)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div
                className={`min-h-0 h-full overflow-y-auto p-4 sm:p-5 ${drawerTab === "leaderboard" ? "hidden" : ""}`}
              >
                {drawerTab === "overview" && (
                  <section
                    id="collection-analysis-overview"
                    role="tabpanel"
                    className="rounded-2xl border border-[var(--mc-border)] bg-black/18 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--mc-text)]">
                          遊玩數據
                        </h3>
                        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                          不重複玩家、總場次與模式分布
                        </p>
                      </div>
                      <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200">
                        {engagementStats.totalPlayerSessions.toLocaleString(
                          "zh-TW",
                        )}{" "}
                        次參與
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                      {[
                        {
                          label: "不重複玩家",
                          value:
                            engagementStats.uniquePlayers.toLocaleString(
                              "zh-TW",
                            ),
                        },
                        {
                          label: "遊玩場次",
                          value:
                            engagementStats.totalPlays.toLocaleString("zh-TW"),
                        },
                        {
                          label: "開房次數",
                          value: Math.max(
                            0,
                            Number(previewCollection.use_count ?? 0),
                          ).toLocaleString("zh-TW"),
                        },
                        {
                          label: "收藏數",
                          value: Math.max(
                            0,
                            Number(previewCollection.favorite_count ?? 0),
                          ).toLocaleString("zh-TW"),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-white/10 bg-black/22 px-3 py-3"
                        >
                          <div className="text-[11px] text-slate-400">
                            {item.label}
                          </div>
                          <div className="mt-1 text-2xl font-semibold leading-none text-slate-50">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/18 p-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          休閒{" "}
                          {engagementStats.casualPlays.toLocaleString("zh-TW")}{" "}
                          場
                        </span>
                        <span>
                          排行{" "}
                          {engagementStats.leaderboardPlays.toLocaleString(
                            "zh-TW",
                          )}{" "}
                          場
                        </span>
                      </div>
                      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-black/40">
                        <div
                          className="bg-[var(--mc-accent)]"
                          style={{
                            width: `${Math.max(0, Math.min(100, casualPlayRatio))}%`,
                          }}
                        />
                        <div
                          className="bg-cyan-300"
                          style={{
                            width: `${Math.max(0, Math.min(100, leaderboardPlayRatio))}%`,
                          }}
                        />
                      </div>
                    </div>
                    {insightsLoading && !insightsData ? (
                      <div className="mt-4 h-44 animate-pulse rounded-xl bg-white/[0.04]" />
                    ) : insightsError ? (
                      <div className="mt-4 rounded-xl border border-rose-300/18 bg-rose-500/8 p-3 text-sm text-rose-100">
                        {insightsError}
                      </div>
                    ) : insightsData ? (
                      <>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            近 {insightsData.range.replace("d", " 天")}{" "}
                            與前一期比較
                          </span>
                          <CreatorRangePicker
                            value={creatorRange}
                            onChange={handleCreatorRangeChange}
                            isLoading={isCreatorAnalyticsRefreshing}
                          />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                          {[
                            { label: "開房", metric: insightsData.uses },
                            {
                              label: "玩家",
                              metric: insightsData.uniquePlayers,
                            },
                            { label: "收藏", metric: insightsData.favorites },
                            { label: "回饋", metric: insightsData.reviews },
                          ].map(({ label, metric }) => (
                            <div
                              key={label}
                              className="rounded-xl border border-white/10 bg-black/22 p-3"
                            >
                              <p className="text-[11px] text-slate-400">
                                {label}
                              </p>
                              <p className="mt-1 text-xl font-semibold text-white">
                                {metric.value.toLocaleString("zh-TW")}
                              </p>
                              <p className="mt-1 text-[11px] text-cyan-200/80">
                                {formatChange(metric)}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/18 p-3">
                          <CreatorTrendChart
                            data={insightsData.trend}
                            compact
                          />
                        </div>
                      </>
                    ) : null}
                  </section>
                )}

                {drawerTab === "content" && (
                  <section
                    id="collection-analysis-content"
                    role="tabpanel"
                    className="mt-4 rounded-2xl border border-[var(--mc-border)] bg-black/18"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--mc-border)] px-4 py-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--mc-text)]">
                          題庫內容
                        </h3>
                        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                          前 10 題預覽
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/collections/${previewCollection.id}/edit`)
                        }
                        className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-2.5 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20"
                      >
                        前往編輯
                      </button>
                    </div>
                    {insightsData ? (
                      <div className="mx-3 mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/18 p-3 sm:grid-cols-4">
                        <div>
                          <p className="text-[11px] text-slate-400">題目</p>
                          <p className="mt-1 font-semibold text-white">
                            {insightsData.contentHealth.itemCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">可播放</p>
                          <p className="mt-1 font-semibold text-cyan-200">
                            {insightsData.contentHealth.playableItemCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">不可用</p>
                          <p className="mt-1 font-semibold text-amber-200">
                            {insightsData.contentHealth.unavailableItemCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Metadata</p>
                          <p className="mt-1 font-semibold text-white">
                            {insightsData.contentHealth.hasCategory &&
                            insightsData.contentHealth.hasSubTags
                              ? "完整"
                              : "待補"}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <div className="p-3">
                      {previewItemsLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <div
                              key={index}
                              className="h-14 rounded-xl bg-white/[0.035]"
                            />
                          ))}
                        </div>
                      ) : previewItemsError ? (
                        <div className="rounded-xl border border-rose-300/18 bg-rose-500/8 px-3 py-3 text-sm text-rose-100">
                          {previewItemsError}
                        </div>
                      ) : previewItems.length > 0 ? (
                        <div className="space-y-2">
                          {previewItems.map((item, index) => {
                            const thumb =
                              item.thumbnail_url ||
                              (item.provider === "youtube" && item.source_id
                                ? `https://i.ytimg.com/vi/${item.source_id}/mqdefault.jpg`
                                : "");
                            return (
                              <div
                                key={item.id}
                                className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-2"
                              >
                                <div className="h-11 overflow-hidden rounded-lg bg-black/28">
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-100">
                                    {item.title || `題目 ${index + 1}`}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {item.channel_title || "未知頻道"}
                                  </p>
                                </div>
                                <span className="text-right text-xs font-semibold text-slate-500">
                                  #{index + 1}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.025] px-3 py-6 text-center text-sm text-[var(--mc-text-muted)]">
                          尚無題庫內容可預覽。
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {drawerTab === "reviews" && (
                  <section
                    id="collection-analysis-reviews"
                    role="tabpanel"
                    className="mt-4 flex min-h-[420px] flex-col rounded-2xl border border-[var(--mc-border)] bg-black/18"
                  >
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--mc-border)] px-4 py-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--mc-text)]">
                          評分與評論者
                        </h3>
                        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                          查看玩家留下的評分與文字回饋
                        </p>
                      </div>
                      <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200">
                        {Math.max(
                          0,
                          Number(previewCollection.rating_count ?? 0),
                        ).toLocaleString("zh-TW")}{" "}
                        人評分
                      </span>
                    </div>
                    {insightsData ? (
                      <div className="shrink-0 border-b border-[var(--mc-border)] p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-200">
                            平均{" "}
                            {insightsData.ratingCount
                              ? insightsData.ratingAvg.toFixed(1)
                              : "-"}{" "}
                            / 5
                          </p>
                          <span className="text-xs text-slate-400">
                            {insightsData.ratingCount} 人評分
                          </span>
                        </div>
                        <RatingChart data={insightsData.ratingDistribution} />
                      </div>
                    ) : null}
                    <div className="min-h-0 flex-1">
                      <CollectionReviewList
                        collectionId={previewCollection.id}
                        enabled={Boolean(previewCollection.id)}
                        limit={12}
                      />
                    </div>
                  </section>
                )}
              </div>

              <section
                id="collection-analysis-leaderboard"
                role="tabpanel"
                className={`min-h-0 h-full overflow-y-auto border-[var(--mc-border)] bg-black/18 p-4 sm:p-5 ${drawerTab !== "leaderboard" ? "hidden" : ""}`}
              >
                <div className="rounded-2xl border border-[var(--mc-border)] bg-black/18">
                  <div className="border-b border-[var(--mc-border)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--mc-text)]">
                          全球排行榜
                        </h3>
                        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                          完整玩家排名，依最佳成績排序
                        </p>
                      </div>
                      <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200">
                        {totalLeaderboardPlayers.toLocaleString("zh-TW")} 人
                      </span>
                    </div>

                    {leaderboardOverview?.profiles?.length ? (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {leaderboardOverview.profiles.map((profile) => (
                          <button
                            key={profile.profileKey}
                            type="button"
                            onClick={() =>
                              setActiveLeaderboardProfileKey(profile.profileKey)
                            }
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              activeLeaderboardProfileKey === profile.profileKey
                                ? "border-[var(--mc-accent)] bg-[var(--mc-accent)] text-black"
                                : "border-white/12 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]"
                            }`}
                          >
                            {profile.title}
                            <span className="ml-1 opacity-70">
                              {profile.totalPlayers}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="p-3">
                    {leaderboardLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-14 rounded-xl border border-white/8 bg-white/[0.035]"
                          />
                        ))}
                      </div>
                    ) : leaderboardError ? (
                      <div className="rounded-xl border border-rose-300/18 bg-rose-500/8 px-3 py-3 text-sm text-rose-100">
                        {leaderboardError}
                      </div>
                    ) : leaderboardEntries.length > 0 ? (
                      <div className="space-y-2">
                        {leaderboardEntries.map((entry) => {
                          const duration = formatDurationSec(entry.durationSec);
                          return (
                            <div
                              key={`${entry.rank}:${entry.userId ?? entry.displayName}`}
                              className={`grid grid-cols-[2.4rem_2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 ${
                                entry.isMe
                                  ? "border-[var(--mc-accent)]/45 bg-[var(--mc-accent)]/10"
                                  : "border-white/8 bg-white/[0.025]"
                              }`}
                            >
                              <div className="text-sm font-semibold text-slate-300">
                                {formatRank(entry.rank)}
                              </div>
                              <PlayerAvatar
                                username={entry.displayName}
                                clientId={entry.userId ?? `rank-${entry.rank}`}
                                avatarUrl={entry.avatarUrl}
                                size={32}
                                effectLevel="simple"
                                hideRankMark
                              />
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-100">
                                    {entry.displayName}
                                  </p>
                                  {entry.isMe ? (
                                    <span className="shrink-0 rounded-full bg-[var(--mc-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-black">
                                      你
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {formatLeaderboardEntryMeta(entry)}
                                  {duration ? ` · ${duration}` : ""}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-slate-50">
                                  {formatScore(entry.score)}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  score
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {leaderboardHasMore ? (
                          <button
                            type="button"
                            onClick={() => void loadMoreLeaderboardEntries()}
                            disabled={leaderboardLoadingMore}
                            className="mt-2 h-10 w-full rounded-xl border border-white/12 bg-white/[0.035] text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-wait disabled:text-slate-500"
                          >
                            {leaderboardLoadingMore
                              ? "載入中..."
                              : "載入更多排名"}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.025] px-3 py-6 text-center text-sm leading-6 text-[var(--mc-text-muted)]">
                        目前還沒有玩家進入這份題庫的全球排行榜。
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={confirmVisibilityOpen}
        title={visibilityConfirmContent.title}
        description={visibilityConfirmContent.description}
        confirmLabel={visibilityConfirmContent.confirmLabel}
        onConfirm={() => {
          const target = pendingVisibility;
          setConfirmVisibilityOpen(false);

          if (target) {
            void applyVisibilityChange(target.id, target.visibility);
          }
        }}
        onCancel={() => {
          setConfirmVisibilityOpen(false);
        }}
        onExited={() => {
          setPendingVisibility(null);
        }}
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="刪除題庫？"
        description={
          pendingDeleteId
            ? `「${collections.find((item) => item.id === pendingDeleteId)?.title ?? "未命名題庫"}」刪除後無法復原。`
            : TEXT.deleteConfirm
        }
        confirmLabel="刪除題庫"
        destructive
        onConfirm={() => {
          const targetId = pendingDeleteId;
          setConfirmDeleteOpen(false);

          if (targetId) {
            void handleDeleteCollection(targetId);
          }
        }}
        onCancel={() => {
          setConfirmDeleteOpen(false);
        }}
        onExited={() => {
          setPendingDeleteId(null);
        }}
      />
    </Box>
  );
};

export default CollectionsPage;
