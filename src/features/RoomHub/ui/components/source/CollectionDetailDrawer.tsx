import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BarChartRounded,
  CloseRounded,
  EmojiEventsRounded,
  LockOutlined,
  MeetingRoomRounded,
  PlayArrowRounded,
  PublicOutlined,
  QuizRounded,
  StarBorderRounded,
  StarRounded,
  // TimelineRounded,
} from "@mui/icons-material";
import { Button, Drawer, IconButton, useMediaQuery } from "@mui/material";
import { List, type RowComponentProps } from "react-window";

import { API_URL } from "@domain/room/constants";
import {
  apiFetchCollectionItemPreview,
  type CollectionItemPreviewRecord,
} from "@features/CollectionContent/model/collectionContentApi";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import { useTransientScrollbar } from "@shared/hooks/useTransientScrollbar";
import {
  getLeaderboardModeLabel,
  getLeaderboardVariant,
  leaderboardModes,
  leaderboardVariants,
  type LeaderboardModeKey,
  type LeaderboardVariantKey,
} from "../../../model/leaderboardChallengeOptions";

type CollectionDetail = {
  id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public" | string | null;
  cover_title?: string | null;
  cover_channel_title?: string | null;
  cover_thumbnail_url?: string | null;
  cover_duration_sec?: number | null;
  cover_source_id?: string | null;
  cover_provider?: string | null;
  item_count?: number | null;
  use_count?: number | null;
  favorite_count?: number | null;
  is_favorited?: boolean | null;
  ai_edited_count?: number | null;
  has_ai_edited?: boolean | null;
};

type CollectionDetailDrawerProps = {
  open: boolean;
  collection: CollectionDetail | null;
  isPublicLibraryTab: boolean;
  isApplying?: boolean;
  isFavoriteUpdating?: boolean;
  onClose: () => void;
  onUseCollection: (collectionId: string) => void | Promise<void>;
  onStartCustomRoom?: (collectionId: string) => void | Promise<void>;
  onStartLeaderboardChallenge?: (collectionId: string) => void | Promise<void>;
  onToggleFavorite?: () => void | Promise<void | boolean>;
  formatDurationLabel: (value: number) => string | null;
  selectedLeaderboardMode: LeaderboardModeKey;
  selectedLeaderboardVariant: LeaderboardVariantKey;
  onLeaderboardModeChange: (value: LeaderboardModeKey) => void;
  onLeaderboardVariantChange: (value: LeaderboardVariantKey) => void;
};

const leaderboardPreviewByVariant: Record<
  LeaderboardVariantKey,
  {
    summary: Array<{ label: string; value: string }>;
    players: Array<{
      rank: number;
      name: string;
      score: string;
      meta: string;
    }>;
    currentUser: {
      rank: string;
      score: string;
      accuracy: string;
      attempts: string;
      hint: string;
    };
  }
> = {
  "30q": {
    summary: [
      { label: "最高分", value: "98,420" },
      { label: "平均命中", value: "91%" },
      { label: "挑戰局數", value: "162" },
    ],
    players: [
      {
        rank: 1,
        name: "Mika",
        score: "98,420",
        meta: "29/30 · 命中 97% · combo 18",
      },
      {
        rank: 2,
        name: "Rin",
        score: "91,880",
        meta: "28/30 · 命中 94% · combo 16",
      },
      {
        rank: 3,
        name: "Yuki",
        score: "87,120",
        meta: "27/30 · 命中 91% · combo 14",
      },
      {
        rank: 4,
        name: "Nana",
        score: "79,540",
        meta: "26/30 · 命中 88% · combo 13",
      },
    ],
    currentUser: {
      rank: "12",
      score: "68,120",
      accuracy: "84%",
      attempts: "8 局",
      hint: "你目前落後第 10 名 2,860 pts。",
    },
  },
  "50q": {
    summary: [
      { label: "最高分", value: "151,200" },
      { label: "平均命中", value: "89%" },
      { label: "挑戰局數", value: "94" },
    ],
    players: [
      {
        rank: 1,
        name: "Aki",
        score: "151,200",
        meta: "47/50 · 命中 94% · combo 26",
      },
      {
        rank: 2,
        name: "Mika",
        score: "146,880",
        meta: "46/50 · 命中 92% · combo 24",
      },
      {
        rank: 3,
        name: "Sora",
        score: "139,540",
        meta: "44/50 · 命中 88% · combo 21",
      },
      {
        rank: 4,
        name: "Rin",
        score: "133,020",
        meta: "43/50 · 命中 86% · combo 19",
      },
    ],
    currentUser: {
      rank: "#--",
      score: "--",
      accuracy: "--",
      attempts: "0 局",
      hint: "完成一次 50 題排行榜挑戰後，這裡會顯示你的紀錄。",
    },
  },
  "15m": {
    summary: [
      { label: "最高分", value: "132,800" },
      { label: "最高題數", value: "78" },
      { label: "挑戰局數", value: "96" },
    ],
    players: [
      {
        rank: 1,
        name: "Nana",
        score: "132,800",
        meta: "78 題 · 命中 91% · combo 24",
      },
      {
        rank: 2,
        name: "Kai",
        score: "128,460",
        meta: "74 題 · 命中 90% · combo 22",
      },
      {
        rank: 3,
        name: "Mika",
        score: "124,900",
        meta: "72 題 · 命中 89% · combo 21",
      },
      {
        rank: 4,
        name: "Yuki",
        score: "119,320",
        meta: "70 題 · 命中 87% · combo 18",
      },
    ],
    currentUser: {
      rank: "18",
      score: "92,440",
      accuracy: "81%",
      attempts: "5 局",
      hint: "15 分鐘內完成 61 題，距離前 15 名還差 4,200 pts。",
    },
  },
};

const COLLECTION_PREVIEW_PAGE_SIZE = 12;
const COLLECTION_PREVIEW_ROW_HEIGHT = 73;

type CollectionPreviewListRowProps = {
  items: CollectionItemPreviewRecord[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  formatDurationLabel: (value: number) => string | null;
};

const CollectionPreviewLoadingRow = ({ index }: { index: number }) => (
  <div className="flex h-full items-center gap-3 border-b border-white/8 px-2 py-3 last:border-b-0 sm:px-3">
    <div className="h-10 w-16 shrink-0 rounded-lg bg-white/8" />
    <div className="min-w-0 flex-1 space-y-2">
      <div
        className="h-3 rounded-full bg-white/10"
        style={{ width: `${72 - (index % 5) * 7}%` }}
      />
      <div
        className="h-2.5 rounded-full bg-white/6"
        style={{ width: `${40 + (index % 5) * 5}%` }}
      />
    </div>
    <span className="shrink-0 text-xs font-medium text-slate-500">
      #{index + 1}
    </span>
  </div>
);

const CollectionPreviewListRow = ({
  index,
  style,
  items,
  hasMore,
  isLoadingMore,
  onLoadMore,
  formatDurationLabel,
}: RowComponentProps<CollectionPreviewListRowProps>) => {
  const item = items[index];
  const isLoaderRow = !item && (hasMore || isLoadingMore);

  useEffect(() => {
    if (!isLoaderRow || !hasMore || isLoadingMore) return;
    onLoadMore();
  }, [hasMore, isLoaderRow, isLoadingMore, onLoadMore]);

  if (isLoaderRow) {
    return (
      <div style={style}>
        <CollectionPreviewLoadingRow index={index} />
      </div>
    );
  }

  if (!item) return <div style={style} />;

  const thumbnail =
    item.thumbnail_url ||
    (item.provider === "youtube" && item.source_id
      ? `https://i.ytimg.com/vi/${item.source_id}/hqdefault.jpg`
      : "");
  const duration =
    typeof item.duration_sec === "number"
      ? formatDurationLabel(item.duration_sec)
      : null;

  return (
    <div style={style}>
      <div className="flex h-full items-center gap-3 border-b border-white/8 px-2 py-3 last:border-b-0 sm:px-3">
        <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded-lg bg-slate-900/80">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={item.title || `題目 ${index + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
              無封面
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {item.title || `題目 ${index + 1}`}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {item.channel_title || "未知上傳者"}
            {duration ? ` · ${duration}` : ""}
          </p>
        </div>
        <span className="hidden shrink-0 text-xs font-medium text-cyan-100/70 sm:inline">
          #{index + 1}
        </span>
      </div>
    </div>
  );
};

const CollectionDetailDrawer = ({
  open,
  collection,
  isPublicLibraryTab,
  isApplying = false,
  isFavoriteUpdating = false,
  onClose,
  onUseCollection,
  onStartCustomRoom,
  onStartLeaderboardChallenge,
  onToggleFavorite,
  formatDurationLabel,
  selectedLeaderboardMode,
  selectedLeaderboardVariant,
  onLeaderboardModeChange,
  onLeaderboardVariantChange,
}: CollectionDetailDrawerProps) => {
  const { authToken, refreshAuthToken } = useAuth();
  const isCompact = useMediaQuery("(max-width:767px)");
  const [previewItems, setPreviewItems] = useState<
    CollectionItemPreviewRecord[]
  >([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLoadingMore, setPreviewLoadingMore] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequestIdRef = useRef(0);
  const { transientScrollbarClassName, revealScrollbar } =
    useTransientScrollbar();
  const previewThumbnail =
    collection?.cover_thumbnail_url ||
    (collection?.cover_provider === "youtube" && collection.cover_source_id
      ? `https://i.ytimg.com/vi/${collection.cover_source_id}/hqdefault.jpg`
      : "");
  const isPublic = (collection?.visibility ?? "private") === "public";
  const isFavorited = Boolean(collection?.is_favorited);
  const activeLeaderboardVariants =
    leaderboardVariants[selectedLeaderboardMode];
  const activeLeaderboardVariant = getLeaderboardVariant(
    selectedLeaderboardMode,
    selectedLeaderboardVariant,
  );
  const activeLeaderboardData =
    leaderboardPreviewByVariant[activeLeaderboardVariant.key];
  const activeLeaderboardModeLabel = getLeaderboardModeLabel(
    selectedLeaderboardMode,
  );
  const stats: Array<{
    key: string;
    label: string;
    value: string;
    icon: ReactNode;
  }> = [
    {
      key: "questions",
      label: "題數",
      value:
        typeof collection?.item_count === "number"
          ? `${Math.max(0, collection.item_count)} 題`
          : "未提供",
      icon: <QuizRounded sx={{ fontSize: 19 }} />,
    },
    {
      key: "plays",
      label: "使用",
      value:
        typeof collection?.use_count === "number"
          ? `${Math.max(0, collection.use_count)} 次`
          : "尚無資料",
      icon: <BarChartRounded sx={{ fontSize: 20 }} />,
    },
    {
      key: "favorites",
      label: "收藏",
      value:
        typeof collection?.favorite_count === "number"
          ? `${Math.max(0, collection.favorite_count)}`
          : "尚無資料",
      icon: isFavorited ? (
        <StarRounded sx={{ fontSize: 19 }} />
      ) : (
        <StarBorderRounded sx={{ fontSize: 19 }} />
      ),
    },
  ];

  const handleStartCustomRoom = () => {
    if (!collection) return;
    void (onStartCustomRoom ?? onUseCollection)(collection.id);
  };

  const handleStartLeaderboardChallenge = () => {
    if (!collection) return;
    void (onStartLeaderboardChallenge ?? onUseCollection)(collection.id);
  };

  const fetchPreviewPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      if (!collection?.id || !API_URL) return;

      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      if (mode === "append") {
        setPreviewLoadingMore(true);
      } else {
        setPreviewLoading(true);
        setPreviewItems([]);
      }
      setPreviewError(null);

      try {
        const token = await ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
          leewayMs: 60_000,
        });
        const result = await apiFetchCollectionItemPreview(
          API_URL,
          token,
          collection.id,
          {
            page,
            pageSize: COLLECTION_PREVIEW_PAGE_SIZE,
          },
        );
        if (requestId !== previewRequestIdRef.current) return;
        if (!result.ok) {
          const message =
            typeof result.payload?.error === "string"
              ? result.payload.error
              : "題庫內容預覽載入失敗";
          setPreviewError(message);
          if (mode === "replace") {
            setPreviewItems([]);
          }
          return;
        }

        const data = result.payload?.data;
        const nextItems = data?.items ?? [];
        setPreviewItems((currentItems) => {
          if (mode === "replace") return nextItems;
          const existingIds = new Set(currentItems.map((item) => item.id));
          return [
            ...currentItems,
            ...nextItems.filter((item) => !existingIds.has(item.id)),
          ];
        });
        setPreviewPage(data?.page ?? page);
        setPreviewHasMore(Boolean(data?.hasMore));
      } catch (error) {
        if (requestId !== previewRequestIdRef.current) return;
        setPreviewError(
          error instanceof Error ? error.message : "題庫內容預覽載入失敗",
        );
        if (mode === "replace") {
          setPreviewItems([]);
        }
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setPreviewLoading(false);
          setPreviewLoadingMore(false);
        }
      }
    },
    [authToken, collection?.id, refreshAuthToken],
  );

  const handleLoadMorePreviewItems = useCallback(() => {
    if (previewLoading || previewLoadingMore || !previewHasMore) return;
    void fetchPreviewPage(previewPage + 1, "append");
  }, [
    fetchPreviewPage,
    previewHasMore,
    previewLoading,
    previewLoadingMore,
    previewPage,
  ]);

  const previewRowCount =
    previewItems.length + (previewHasMore || previewLoadingMore ? 1 : 0);
  const previewListHeight = Math.min(
    430,
    Math.max(180, previewRowCount * COLLECTION_PREVIEW_ROW_HEIGHT),
  );
  const previewListRowProps = useMemo<CollectionPreviewListRowProps>(
    () => ({
      items: previewItems,
      hasMore: previewHasMore,
      isLoadingMore: previewLoadingMore,
      onLoadMore: handleLoadMorePreviewItems,
      formatDurationLabel,
    }),
    [
      formatDurationLabel,
      handleLoadMorePreviewItems,
      previewHasMore,
      previewItems,
      previewLoadingMore,
    ],
  );

  const handlePreviewListScroll = useCallback(() => {
    revealScrollbar();
  }, [revealScrollbar]);

  useEffect(() => {
    if (!open || !collection?.id || !API_URL) {
      setPreviewItems([]);
      setPreviewError(null);
      setPreviewLoading(false);
      setPreviewLoadingMore(false);
      setPreviewPage(1);
      setPreviewHasMore(false);
      return;
    }

    setPreviewPage(1);
    setPreviewHasMore(false);
    void fetchPreviewPage(1, "replace");

    return () => {
      previewRequestIdRef.current += 1;
    };
  }, [collection?.id, fetchPreviewPage, open]);

  useEffect(() => {
    const variants = leaderboardVariants[selectedLeaderboardMode];
    if (
      !variants.some((variant) => variant.key === selectedLeaderboardVariant)
    ) {
      onLeaderboardVariantChange(variants[0].key);
    }
  }, [
    onLeaderboardVariantChange,
    selectedLeaderboardMode,
    selectedLeaderboardVariant,
  ]);

  return (
    <Drawer
      anchor={isCompact ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: isCompact ? "100%" : "min(1180px, 94vw)",
            height: isCompact ? "100dvh" : "100%",
            maxHeight: "100dvh",
            borderTopLeftRadius: isCompact ? 0 : 24,
            borderBottomLeftRadius: isCompact ? 0 : 24,
            background:
              "linear-gradient(180deg, rgba(8,15,28,0.98), rgba(2,6,23,0.98))",
            borderLeft: isCompact ? 0 : "1px solid rgba(103,232,249,0.18)",
            color: "var(--mc-text)",
            boxShadow: "0 24px 70px rgba(2,6,23,0.72)",
            overflow: "hidden",
          },
        },
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-300/12 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-50 sm:text-xl">
              {collection?.title ?? "收藏庫"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-medium text-slate-400 sm:inline">
              Esc 關閉
            </span>
            <IconButton
              aria-label="關閉題庫詳情，或按 Esc"
              onClick={onClose}
              className="!text-slate-100 hover:!bg-white/8"
            >
              <CloseRounded />
            </IconButton>
          </div>
        </header>

        {collection ? (
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden md:grid-cols-[minmax(360px,0.8fr)_minmax(460px,1.2fr)] md:grid-rows-none">
            <main className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <section className="overflow-hidden rounded-[20px] border border-cyan-300/14 bg-slate-950/44 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="relative aspect-[16/5] min-h-28 overflow-hidden bg-slate-900/80 sm:min-h-32">
                  {previewThumbnail ? (
                    <img
                      src={previewThumbnail}
                      alt={collection.cover_title ?? collection.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                      無封面
                    </div>
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.18)_42%,rgba(2,6,23,0.88)_100%)]" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/56 px-2.5 py-1 text-xs font-medium text-slate-100 backdrop-blur">
                        {isPublic ? (
                          <PublicOutlined sx={{ fontSize: 14 }} />
                        ) : (
                          <LockOutlined sx={{ fontSize: 14 }} />
                        )}
                        {isPublic ? "公開收藏庫" : "私人收藏庫"}
                      </span>
                      {/* {collection.has_ai_edited ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/16 bg-teal-400/10 px-2.5 py-1 text-xs font-medium text-teal-100">
                          <TimelineRounded sx={{ fontSize: 14 }} />
                          已調整片段
                        </span>
                      ) : null} */}
                    </div>
                    <p className="line-clamp-2 text-xl font-semibold leading-tight text-white sm:text-2xl">
                      {collection.title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-white/8 px-4 py-2.5">
                  {stats.map((item) => (
                    <div
                      key={item.key}
                      className="inline-flex min-w-0 items-center gap-2 text-sm"
                    >
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-300/8 text-cyan-100">
                        {item.icon}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {item.label}
                      </span>
                      <span className="truncate font-semibold text-slate-50">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3">
                  <p
                    className={`whitespace-pre-wrap text-sm leading-6 ${
                      collection.description
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {collection.description || "題庫未提供說明。"}
                  </p>
                </div>
              </section>

              <section className="mt-1 px-1">
                <div className="overflow-hidden rounded-xl bg-slate-950/22">
                  {previewLoading ? (
                    <div>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <CollectionPreviewLoadingRow
                          key={`collection-preview-loading-${index}`}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : previewError ? (
                    <div className="px-2 py-6 text-sm text-rose-200 sm:px-3">
                      {previewError}
                    </div>
                  ) : previewItems.length === 0 ? (
                    <div className="px-2 py-6 text-sm text-slate-400 sm:px-3">
                      這個題庫目前沒有可預覽的題目。
                    </div>
                  ) : (
                    <List<CollectionPreviewListRowProps>
                      className={`transient-scrollbar ${transientScrollbarClassName}`}
                      style={{
                        height: previewListHeight,
                        width: "100%",
                      }}
                      rowCount={previewRowCount}
                      rowHeight={COLLECTION_PREVIEW_ROW_HEIGHT}
                      rowProps={previewListRowProps}
                      rowComponent={CollectionPreviewListRow}
                      onScroll={handlePreviewListScroll}
                    />
                  )}
                </div>
              </section>
            </main>

            <aside className="min-h-0 border-t border-cyan-300/12 bg-slate-950/36 p-4 md:border-l md:border-t-0 md:p-5">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-amber-200/12 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(15,23,42,0.2))] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-50">
                      全球排行榜
                    </h3>
                  </div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/16 bg-amber-300/10 text-amber-100">
                    <EmojiEventsRounded />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-white/8 bg-slate-950/28 p-1">
                  {leaderboardModes.map((mode) => {
                    const selected = selectedLeaderboardMode === mode.key;
                    return (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => onLeaderboardModeChange(mode.key)}
                        className={`h-9 rounded-lg text-sm font-semibold transition ${
                          selected
                            ? "bg-amber-300/16 text-amber-50 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.18)]"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {activeLeaderboardVariants.map((variant) => {
                    const selected = selectedLeaderboardVariant === variant.key;
                    return (
                      <button
                        key={variant.key}
                        type="button"
                        onClick={() => onLeaderboardVariantChange(variant.key)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          selected
                            ? "border-cyan-100/24 bg-cyan-300/12 text-cyan-50"
                            : "border-white/8 bg-slate-950/20 text-slate-400 hover:border-white/14 hover:text-slate-100"
                        }`}
                      >
                        {variant.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {activeLeaderboardData.summary.map((item, index) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-amber-100/14 bg-slate-950/30 px-3 py-2"
                    >
                      <p className="text-[11px] text-slate-400">{item.label}</p>
                      <p
                        className={`mt-1 text-base font-semibold ${
                          index === 0 ? "text-amber-50" : "text-slate-50"
                        }`}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2.5">
                  {activeLeaderboardData.players.map((player) => (
                    <div
                      key={`${activeLeaderboardVariant.key}-${player.rank}`}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-slate-950/34 px-3 py-3"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-sm font-bold text-slate-100">
                        {player.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {player.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {player.meta}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-50">
                          {player.score}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">pts</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-5">
                  <div className="rounded-2xl border border-cyan-100/14 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(15,23,42,0.24))] p-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-100/14 bg-cyan-300/10 text-xs font-bold text-cyan-100">
                        {activeLeaderboardData.currentUser.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-50">
                          {activeLeaderboardModeLabel} ·{" "}
                          {activeLeaderboardVariant.label}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[11px] text-slate-400">最高分</p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {activeLeaderboardData.currentUser.score}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">命中率</p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {activeLeaderboardData.currentUser.accuracy}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">挑戰</p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">
                              {activeLeaderboardData.currentUser.attempts}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          {activeLeaderboardData.currentUser.hint}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 hidden text-xs leading-5 text-slate-400 md:block">
                    目前為前端假資料，後續接上 API 後會替換為真實排行榜。
                  </p>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {isPublicLibraryTab && collection ? (
          <footer className="grid shrink-0 gap-3 border-t border-cyan-300/12 px-4 py-3 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500">
                  挑戰模式
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                  {activeLeaderboardModeLabel} ·{" "}
                  {activeLeaderboardVariant.label}
                </p>
              </div>
              <Button
                variant="text"
                size="small"
                startIcon={
                  isFavorited ? <StarRounded /> : <StarBorderRounded />
                }
                disabled={isFavoriteUpdating || !onToggleFavorite}
                onClick={() => {
                  void onToggleFavorite?.();
                }}
                className="!shrink-0"
              >
                {isFavorited ? "取消收藏" : "收藏"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
              <Button
                variant="outlined"
                startIcon={<MeetingRoomRounded />}
                disabled={isApplying}
                onClick={handleStartCustomRoom}
                className="!border-cyan-100/18 !text-cyan-50 hover:!border-cyan-100/32 hover:!bg-cyan-300/8"
              >
                {isApplying ? "載入中..." : "自訂房"}
              </Button>
              <Button
                variant="contained"
                startIcon={<PlayArrowRounded />}
                disabled={isApplying}
                onClick={handleStartLeaderboardChallenge}
              >
                {isApplying ? "載入中..." : "進行排行挑戰"}
              </Button>
            </div>
          </footer>
        ) : null}
      </div>
    </Drawer>
  );
};

export default CollectionDetailDrawer;
