import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CollectionMetaChips,
  type CollectionMetaChipSource,
} from "@features/CollectionCategory";
import {
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ViewAgendaRoundedIcon from "@mui/icons-material/ViewAgendaRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { List, type RowComponentProps } from "react-window";

import {
  CollectionFilterBar,
  useFilterAggregationsQuery,
  type CollectionEntry,
} from "@features/CollectionContent";
import type {
  PlaylistItem,
  PlaylistSourceType,
  PlaylistSuggestion,
  RoomParticipant,
} from "@features/RoomSession";
import {
  resolveCollectionPlayableRequirement,
  resolveCollectionAvailabilityCounts,
} from "@features/RoomSession/model/playlistAvailability";
import type {
  PlaylistIssueListItem,
  PlaylistPreviewMeta,
  YoutubePlaylist,
} from "@features/PlaylistSource";
import {
  buildPlaylistIssueSummary,
  getPlaylistIssueTotal,
} from "@features/PlaylistSource";
import {
  API_URL,
  MIN_COLLECTION_PLAYABLE_COUNT,
  YOUTUBE_PLAYLIST_MIN_ITEM_COUNT,
} from "@domain/room/constants";
import { normalizeDisplayText } from "../roomLobbyDisplayUtils";

type SelectorTab = "suggestions" | "public" | "mine" | "youtube" | "link";
type BrowseViewMode = "grid" | "list";
type LinkPreviewTab = "available" | "unavailable";
type LinkPreviewIssueGroupKey =
  | "duplicate"
  | "removed"
  | "privateRestricted"
  | "embedBlocked"
  | "unavailable";
type VirtualSourceRowProps = {
  items: unknown[];
  columns: number;
  viewMode: BrowseViewMode;
  renderItem: (item: unknown, itemIndex: number) => React.ReactNode;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  renderLoader?: () => React.ReactNode;
};

type Props = {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  isGoogleAuthed: boolean;
  playlistUrl: string;
  playlistItemsForChange: PlaylistItem[];
  playlistPreviewMeta: PlaylistPreviewMeta | null;
  playlistError?: string | null;
  playlistLoading: boolean;
  playlistSuggestions: PlaylistSuggestion[];
  participants: RoomParticipant[];
  collections: CollectionEntry[];
  collectionsLoading: boolean;
  collectionsLoadingMore: boolean;
  collectionsHasMore: boolean;
  collectionsTotalCount: number | null;
  collectionsError?: string | null;
  collectionItemsLoading: boolean;
  collectionItemsError: string | null;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  onPlaylistUrlChange: (value: string) => void;
  onPreviewPlaylistUrl: (url: string) => void;
  onResetPlaylist: () => void;
  onApplyPlaylistUrlDirect: (url: string) => Promise<boolean>;
  onApplyCollectionDirect: (
    collectionId: string,
    title?: string | null,
  ) => Promise<boolean>;
  onApplyYoutubePlaylistDirect: (
    playlistId: string,
    title?: string | null,
  ) => Promise<boolean>;
  onApplySuggestionSnapshot: (
    suggestion: PlaylistSuggestion,
  ) => Promise<boolean>;
  onFetchCollections: (
    scope?: "owner" | "public",
    options?: {
      query?: string;
      categoryKeys?: string[] | null;
      subTags?: string[] | null;
    },
  ) => void;
  onLoadMoreCollections: () => void;
  onFetchYoutubePlaylists: (force?: boolean) => void;
  onRequestGoogleLogin: () => void;
  onSuggestPlaylist?: (
    type: "collection" | "playlist",
    value: string,
    options?: {
      useSnapshot?: boolean;
      sourceId?: string | null;
      title?: string | null;
      readToken?: string | null;
      totalCount?: number | null;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  extractPlaylistId?: (url: string) => string | null;
  openConfirmModal?: (
    title: string,
    detail: string | undefined,
    action: () => void,
  ) => void;
  onMarkSuggestionsSeen: () => void;
  initialTab?: SelectorTab;
  onRecordSourceApplied: (entry: {
    sourceType: PlaylistSourceType;
    title: string;
    sourceId?: string | null;
    url?: string | null;
    thumbnailUrl?: string | null;
    itemCount?: number | null;
  }) => void;
  currentSourceType?: PlaylistSourceType | null;
  currentSourceIds?: string[];
  leaderboardCollectionOnlyMode?: boolean;
  leaderboardCollectionOnlyReason?: string;
  leaderboardMinPlayableCount?: number | null;
};

const DRAWER_MAX_WIDTH = 1120;
const RECOMMENDATION_COOLDOWN_MS = 5000;

const sourceType = (visibility?: "private" | "public") =>
  visibility === "private" ? "private_collection" : "public_collection";

const normalizeSourceId = (value: unknown) => String(value ?? "").trim();

const formatCount = (value: number | null | undefined) =>
  Math.max(0, Number(value ?? 0)).toLocaleString("en-US");

const getPlaylistIdFromUrl = (url: string) => {
  try {
    const parsed = new URL(url.trim());
    const listId = parsed.searchParams.get("list");
    if (listId) return listId;
    return null;
  } catch {
    return null;
  }
};

type LinkPreviewAvailableRowProps = {
  items: PlaylistItem[];
};

type LinkPreviewIssueEntry =
  | {
      type: "group";
      key: string;
      label: string;
      count: number;
      className: string;
    }
  | {
      type: "item";
      key: string;
      label: string;
      item: PlaylistIssueListItem;
      className: string;
    }
  | {
      type: "empty";
      key: string;
      description: string;
      className: string;
    };

type LinkPreviewIssueRowProps = {
  entries: LinkPreviewIssueEntry[];
};

const canAttemptPlaylistPreview = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.searchParams.get("list"));
  } catch {
    return false;
  }
};

const getCollectionThumbnail = (collection: CollectionEntry) =>
  collection.cover_thumbnail_url ||
  (collection.cover_source_id
    ? `https://i.ytimg.com/vi/${collection.cover_source_id}/hqdefault.jpg`
    : null);

const getSuggestionThumbnail = (suggestion: PlaylistSuggestion) =>
  suggestion.coverThumbnailUrl ||
  suggestion.items?.find((item) => item.thumbnail)?.thumbnail ||
  null;

const getSourceKey = (type: "collection" | "playlist", value: string) =>
  `${type}:${value}`;

const isLeaderboardAllowedTab = (tab: SelectorTab) =>
  tab === "suggestions" || tab === "public";
const SOURCE_TABS: SelectorTab[] = ["public", "mine", "youtube", "link"];
const LINK_PREVIEW_ROW_HEIGHT = 74;
const LINK_PREVIEW_ISSUE_ROW_HEIGHT = 72;
const LINK_PREVIEW_MIN_LIST_HEIGHT = 220;
const LINK_PREVIEW_MAX_LIST_HEIGHT = 420;

const playlistIssueGroups = [
  {
    key: "duplicate",
    label: "重複略過",
    className: "border-emerald-300/24 bg-emerald-300/8 text-emerald-100",
  },
  {
    key: "removed",
    label: "已移除",
    className: "border-amber-300/26 bg-amber-300/9 text-amber-100",
  },
  {
    key: "privateRestricted",
    label: "隱私限制",
    className: "border-fuchsia-300/24 bg-fuchsia-300/8 text-fuchsia-100",
  },
  {
    key: "embedBlocked",
    label: "嵌入限制",
    className: "border-rose-300/26 bg-rose-300/9 text-rose-100",
  },
  {
    key: "unavailable",
    label: "其他不可用",
    className: "border-red-300/24 bg-red-300/8 text-red-100",
  },
] as const;
const defaultLinkPreviewIssueGroup: LinkPreviewIssueGroupKey = "unavailable";

const getInitial = (value: string) =>
  normalizeDisplayText(value, "?").trim().slice(0, 1).toUpperCase();

const findCollectionForSuggestion = (
  suggestion: PlaylistSuggestion,
  collections: CollectionEntry[],
) => {
  if (suggestion.type !== "collection") return null;
  const candidateIds = [
    normalizeSourceId(suggestion.sourceId),
    normalizeSourceId(suggestion.value),
  ].filter(Boolean);

  return (
    collections.find((collection) =>
      candidateIds.includes(normalizeSourceId(collection.id)),
    ) ?? null
  );
};

const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center rounded-[24px] border border-white/8 bg-slate-950/24 px-6 py-12 text-center">
    {icon ? (
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/14 bg-cyan-200/8 text-cyan-50">
        {icon}
      </div>
    ) : null}

    <div className="text-base font-semibold text-slate-100">{title}</div>
    <div className="mt-2 max-w-[520px] text-sm leading-6 text-slate-400">
      {description}
    </div>

    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

const LoadingState = ({ label = "載入中..." }: { label?: string }) => (
  <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-3 rounded-[24px] border border-white/8 bg-slate-950/24 text-slate-300">
    <CircularProgress size={26} color="inherit" />
    <span className="text-sm">{label}</span>
  </div>
);

const LinkPreviewAvailableRow = ({
  index,
  style,
  items,
}: RowComponentProps<LinkPreviewAvailableRowProps>) => {
  const item = items[index];

  return (
    <div style={style} className="px-3 py-1.5">
      <div className="flex h-full min-w-0 items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/6 text-xs font-semibold text-slate-300">
          {index + 1}
        </span>
        <img
          src={item.thumbnail || "https://img.youtube.com/vi/default/hqdefault.jpg"}
          alt={normalizeDisplayText(item.title, "未命名曲目")}
          className="h-12 w-[76px] shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-100">
            {normalizeDisplayText(item.title, "未命名曲目")}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-slate-400">
            <span className="min-w-0 truncate">
              {normalizeDisplayText(item.uploader, "YouTube")}
            </span>
            {item.duration ? (
              <span className="shrink-0 text-slate-500">{item.duration}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const getLeaderboardQuestionRestrictionReason = (
  playableCount: number | null | undefined,
  minPlayableCount: number | null | undefined,
) => {
  if (!minPlayableCount || minPlayableCount <= 0) return null;
  const safePlayableCount = Math.max(0, Math.floor(playableCount ?? 0));
  if (safePlayableCount >= minPlayableCount) return null;
  return `未滿 ${minPlayableCount} 題（目前 ${safePlayableCount} 題），不能用於目前排行挑戰。`;
};

const LinkPreviewIssueRow = ({
  index,
  style,
  entries,
}: RowComponentProps<LinkPreviewIssueRowProps>) => {
  const entry = entries[index];

  if (entry.type === "group") {
    return (
      <div style={style} className="px-3 py-1.5">
        <div
          className={`flex h-full items-center justify-between rounded-2xl border px-4 text-sm font-semibold ${entry.className}`}
        >
          <span>{entry.label}</span>
          <span>{entry.count} 首</span>
        </div>
      </div>
    );
  }

  if (entry.type === "empty") {
    return (
      <div style={style} className="px-3 py-1.5">
        <div
          className={`flex h-full min-w-0 items-center justify-center rounded-2xl border px-4 text-center text-sm font-semibold ${entry.className}`}
        >
          {entry.description}
        </div>
      </div>
    );
  }

  return (
    <div style={style} className="px-3 py-1.5">
      <div className="flex h-full min-w-0 items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3">
        <img
          src={entry.item.thumbnail || "https://img.youtube.com/vi/default/hqdefault.jpg"}
          alt={entry.item.title}
          className="h-11 w-[70px] shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-100">
            {entry.item.title}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-400">
            {entry.label} · {entry.item.reason}
          </div>
        </div>
      </div>
    </div>
  );
};

const VirtualSourceRow = ({
  index,
  style,
  items,
  columns,
  viewMode,
  renderItem,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  renderLoader,
}: RowComponentProps<VirtualSourceRowProps>) => {
  const rowStart = viewMode === "grid" ? index * columns : index;
  const rowItems =
    viewMode === "grid"
      ? items.slice(rowStart, rowStart + columns)
      : items.slice(rowStart, rowStart + 1);
  const isLoaderRow = rowItems.length === 0 && (hasMore || isLoadingMore);

  React.useEffect(() => {
    if (!isLoaderRow || !hasMore || isLoadingMore || !onLoadMore) return;
    onLoadMore();
  }, [hasMore, isLoaderRow, isLoadingMore, onLoadMore]);

  if (isLoaderRow) {
    return (
      <div style={style} className="flex items-center justify-center px-1 py-2">
        {renderLoader ? renderLoader() : null}
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div
        style={{
          ...style,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
        className="grid gap-4 px-1 py-2"
        data-row-index={index}
      >
        {rowItems.map((item, offset) => (
          <React.Fragment key={`${rowStart + offset}`}>
            {renderItem(item, rowStart + offset)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div style={style} className="px-1">
      {rowItems[0] ? renderItem(rowItems[0], rowStart) : null}
    </div>
  );
};

const SourceMetrics = ({
  itemCount,
  playableCount,
  useCount,
  favoriteCount,
  noWrap = false,
}: {
  itemCount?: number | null;
  playableCount?: number | null;
  useCount?: number | null;
  favoriteCount?: number | null;
  noWrap?: boolean;
}) => {
  return (
    <div
      className={`flex items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-slate-200/90 ${
        noWrap ? "min-w-0 flex-nowrap overflow-hidden" : "flex-wrap"
      }`}
    >
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <QuizRoundedIcon
          sx={{ fontSize: 16, color: "rgba(103,232,249,0.9)" }}
        />
        <span>
          {playableCount !== undefined && playableCount !== null
            ? formatCount(playableCount)
            : formatCount(itemCount)}
          題
        </span>
      </span>

      {typeof useCount !== "undefined" ? (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <BarChartRoundedIcon
            sx={{ fontSize: 17, color: "rgba(125,211,252,0.86)" }}
          />
          <span>{formatCount(useCount)}</span>
        </span>
      ) : null}

      {typeof favoriteCount !== "undefined" ? (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <FavoriteBorderRoundedIcon
            sx={{ fontSize: 16, color: "rgba(251,113,133,0.9)" }}
          />
          <span>{formatCount(favoriteCount)}</span>
        </span>
      ) : null}
    </div>
  );
};

const SourceRating = ({
  ratingAvg,
  ratingCount,
}: {
  ratingAvg?: number | null;
  ratingCount?: number | null;
}) => {
  const safeRatingCount = Math.max(0, Number(ratingCount ?? 0));
  const safeRatingAvg =
    safeRatingCount > 0 ? Math.max(0, Number(ratingAvg ?? 0)) : 0;
  const ratingAvgLabel =
    safeRatingCount > 0
      ? `${safeRatingAvg.toFixed(safeRatingAvg % 1 === 0 ? 0 : 1)} / 5`
      : "尚無評分";

  return (
    <div className="flex min-w-0 items-center gap-2 text-[12px] leading-5 text-slate-300/88">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <StarRoundedIcon
          sx={{
            fontSize: 15,
            color:
              safeRatingCount > 0
                ? "rgba(250,204,21,0.95)"
                : "rgba(148,163,184,0.56)",
          }}
        />
        <span className="shrink-0 font-semibold text-slate-100/92">
          {ratingAvgLabel}
        </span>
      </span>
      {safeRatingCount > 0 ? (
        <span className="min-w-0 truncate text-slate-400">
          {safeRatingCount} 則評分
        </span>
      ) : null}
    </div>
  );
};

const SourceBadge = ({
  icon,
  label,
}: {
  icon?: React.ReactNode;
  label: string;
}) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-slate-100 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.95)]">
    {icon}
    {label}
  </span>
);

const SourceCard = ({
  viewMode,
  title,
  description,
  thumbnailUrl,
  badge,
  metaCollection,
  rating,
  metrics,
  disabled,
  disabledReason,
  isCurrent,
  isRunning,
  onClick,
}: {
  viewMode: BrowseViewMode;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  badge?: React.ReactNode;
  metaCollection?: CollectionMetaChipSource | null;
  rating?: React.ReactNode;
  metrics: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string | null;
  isCurrent?: boolean;
  isRunning?: boolean;
  onClick: () => void;
}) => {
  const isList = viewMode === "list";

  return (
    <button
      type="button"
      disabled={disabled || isRunning}
      onClick={onClick}
      className={
        isList
          ? `group relative flex h-full w-full items-center gap-3 overflow-hidden border-b border-slate-700/55 px-3 py-2 text-left transition duration-200 ${
              disabled || isRunning
                ? "cursor-not-allowed bg-slate-950/20 opacity-75"
                : isCurrent
                  ? "bg-cyan-500/10"
                  : "bg-transparent hover:bg-cyan-500/[0.06]"
            }`
          : `group relative h-full min-h-[262px] overflow-hidden rounded-[22px] border text-left transition duration-200 ${
              disabled || isRunning
                ? "cursor-not-allowed border-white/10 bg-slate-950/42 opacity-75"
                : isCurrent
                  ? "border-cyan-300/55 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(8,47,73,0.42))] shadow-[0_24px_44px_-28px_rgba(34,211,238,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border-cyan-300/18 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.58))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_34px_-32px_rgba(15,23,42,0.9)] hover:border-cyan-300/38 hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(8,47,73,0.44))] hover:shadow-[0_22px_42px_-30px_rgba(34,211,238,0.32),inset_0_1px_0_rgba(255,255,255,0.06)]"
            }`
      }
    >
      <div
        className={
          isList
            ? "relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-slate-900/40"
            : "relative h-36 w-full overflow-hidden bg-slate-900/60"
        }
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_20%,rgba(34,211,238,0.16),transparent_42%),linear-gradient(180deg,rgba(30,41,59,0.9),rgba(15,23,42,0.95))] text-[11px] text-cyan-100">
            {isList ? (
              "無縮圖"
            ) : (
              <LibraryMusicRoundedIcon sx={{ fontSize: 36 }} />
            )}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.16)_46%,rgba(2,6,23,0.82)_100%)]" />

        {!isList && (badge || metaCollection) ? (
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-start gap-1.5">
            {badge}
            <CollectionMetaChips
              collection={metaCollection}
              maxVisible={3}
              variant="overlay"
            />
          </div>
        ) : null}

        {!isList && isRunning ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/78 px-2.5 py-1 text-[11px] font-semibold text-slate-100 backdrop-blur-sm">
            處理中...
          </span>
        ) : !isList && isCurrent ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-cyan-100/20 bg-cyan-950/78 px-2.5 py-1 text-[11px] font-semibold text-cyan-50 backdrop-blur-sm">
            <CheckRoundedIcon sx={{ fontSize: 14 }} />
            目前使用
          </span>
        ) : null}

        {!isList && disabledReason ? (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-amber-300/30 bg-slate-950/78 px-3 py-2 text-xs font-semibold text-amber-100 shadow-[0_16px_34px_-24px_rgba(251,191,36,0.55)]">
            {disabledReason}
          </div>
        ) : null}
      </div>

      <div
        className={
          isList
            ? "flex h-full min-w-0 flex-1 flex-col justify-center pr-2"
            : "space-y-3 px-4 py-3.5"
        }
      >
        <div className="min-w-0">
          {isList ? (
            /* List view priority: category (shrink-0) > title (min-w-[3rem]) > language (lowPriority)
               Language wrapper uses flex-shrink:999 so it collapses before title shrinks.
               Title guaranteed at least 3rem. No pr-20 / absolute positioning needed. */
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-[3rem] truncate text-[13px] font-semibold text-[var(--mc-text)] sm:text-sm">
                {title}
              </p>
              <CollectionMetaChips collection={metaCollection} toneFilter="category" />
              <CollectionMetaChips collection={metaCollection} toneFilter="language" lowPriority />
              {(isRunning || isCurrent || badge) ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  {isRunning ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] leading-none text-slate-200">
                      處理中...
                    </span>
                  ) : null}
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-100/20 bg-cyan-950/60 px-2 py-1 text-[10px] leading-none text-cyan-50">
                      <CheckRoundedIcon sx={{ fontSize: 12 }} />
                      目前使用
                    </span>
                  ) : null}
                  {badge}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-6 text-[var(--mc-text)]">
                  {title}
                </p>
              </div>
            </div>
          )}

          {rating ??
            (description ? (
              <div
                className={
                  isList
                    ? "mt-1 truncate text-xs text-[var(--mc-text-muted)]"
                    : "line-clamp-2 min-h-[2.5rem] text-[12px] leading-5 text-slate-300/88"
                }
              >
                {description}
              </div>
            ) : null)}
        </div>

        <div
          className={
            isList
              ? "mt-2 flex min-h-[18px] min-w-0 flex-nowrap gap-3 overflow-hidden"
              : "flex items-center gap-3"
          }
        >
          {metrics}
          {isList && disabledReason ? (
            <span className="min-w-0 truncate text-xs font-semibold text-amber-100">
              {disabledReason}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
};

const RoomPlaylistSelectorDrawer = (props: Props) => {
  const {
    open,
    onClose,
    isHost,
    isGoogleAuthed,
    playlistUrl,
    playlistItemsForChange,
    playlistPreviewMeta,
    playlistError,
    playlistLoading,
    playlistSuggestions,
    participants,
    collections,
    collectionsLoading,
    collectionsLoadingMore,
    collectionsHasMore,
    collectionsTotalCount,
    collectionsError,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    onPlaylistUrlChange,
    onPreviewPlaylistUrl,
    onResetPlaylist,
    onApplyPlaylistUrlDirect,
    onApplyCollectionDirect,
    onApplyYoutubePlaylistDirect,
    onApplySuggestionSnapshot,
    onFetchCollections,
    onLoadMoreCollections,
    onFetchYoutubePlaylists,
    onRequestGoogleLogin,
    onSuggestPlaylist,
    extractPlaylistId,
    onMarkSuggestionsSeen,
    initialTab = "public",
    onRecordSourceApplied,
    currentSourceType,
    currentSourceIds = [],
    leaderboardCollectionOnlyMode = false,
    leaderboardCollectionOnlyReason = "排行模式僅支援公開收藏庫",
    leaderboardMinPlayableCount = null,
  } = props;

  const theme = useTheme();
  const drawerAnchor = theme.direction === "rtl" ? "left" : "right";

  const isMobile = useMediaQuery("(max-width:640px)");
  const isTablet = useMediaQuery("(max-width:980px)");
  const columns = isMobile ? 1 : isTablet ? 2 : 3;

  const [activeTab, setActiveTab] = useState<SelectorTab>("public");
  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSuggestionClientId, setSelectedSuggestionClientId] =
    useState<string>("all");
  const [viewMode, setViewMode] = useState<BrowseViewMode>("grid");
  const [selectedSourceTab, setSelectedSourceTab] =
    useState<SelectorTab>("public");
  const [sourceMenuAnchor, setSourceMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const [browseCategoryKey, setBrowseCategoryKey] = useState<string | null>(null);
  const [browseSubTagKey, setBrowseSubTagKey] = useState<string | null>(null);
  const selectedBrowseCategoryKeys = useMemo(
    () => (browseCategoryKey ? [browseCategoryKey] : []),
    [browseCategoryKey],
  );
  const selectedBrowseSubTagKeys = useMemo(
    () => (browseSubTagKey ? [browseSubTagKey] : []),
    [browseSubTagKey],
  );
  const [browseFilterOpen, setBrowseFilterOpen] = useState(false);
  const [playlistUrlDraft, setPlaylistUrlDraft] = useState(playlistUrl);
  const [linkPreviewTab, setLinkPreviewTab] =
    useState<LinkPreviewTab>("available");
  const [selectedLinkIssueGroup, setSelectedLinkIssueGroup] =
    useState<LinkPreviewIssueGroupKey>(defaultLinkPreviewIssueGroup);
  const lastAutoPreviewUrlRef = React.useRef("");

  const normalizedCurrentSourceIds = useMemo(
    () => currentSourceIds.map(normalizeSourceId).filter(Boolean),
    [currentSourceIds],
  );

  const participantByClientId = useMemo(() => {
    const map = new Map<string, RoomParticipant>();
    participants.forEach((participant) => {
      map.set(participant.clientId, participant);
    });
    return map;
  }, [participants]);

  const suggestionAuthors = useMemo(() => {
    const map = new Map<
      string,
      {
        clientId: string;
        username: string;
        avatarUrl: string | null;
        count: number;
      }
    >();

    playlistSuggestions.forEach((suggestion) => {
      const clientId = normalizeSourceId(suggestion.clientId);
      if (!clientId) return;
      const participant = participantByClientId.get(clientId);
      const current = map.get(clientId);
      map.set(clientId, {
        clientId,
        username:
          current?.username ??
          participant?.username ??
          normalizeDisplayText(suggestion.username, "玩家"),
        avatarUrl:
          current?.avatarUrl ??
          participant?.avatar_url ??
          participant?.avatarUrl ??
          null,
        count: (current?.count ?? 0) + 1,
      });
    });

    return [...map.values()].sort((left, right) =>
      left.username.localeCompare(right.username, "zh-Hant"),
    );
  }, [participantByClientId, playlistSuggestions]);

  const availableTabs = useMemo<SelectorTab[]>(() => {
    return ["suggestions", "public", "mine", "youtube", "link"];
  }, []);
  const activeSourceTab = SOURCE_TABS.includes(activeTab)
    ? activeTab
    : selectedSourceTab;

  const isCooldownActive =
    !isHost && typeof cooldownUntil === "number" && cooldownUntil > Date.now();
  const cooldownSeconds = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - cooldownNow) / 1000))
    : 0;
  const toolbarMessage = isCooldownActive
    ? `推薦冷卻中，${cooldownSeconds} 秒後可再次推薦`
    : (actionError ?? actionNotice);
  const toolbarMessageTone = isCooldownActive
    ? "cooldown"
    : actionError
      ? "error"
      : "notice";

  const tabLabel = useCallback(
    (tab: SelectorTab) => {
      if (tab === "suggestions") return `推薦 ${playlistSuggestions.length}`;
      if (tab === "public") return "公開收藏庫";
      if (tab === "mine") return "我的收藏庫";
      if (tab === "youtube") return "YouTube";
      return "貼上連結";
    },
    [playlistSuggestions.length],
  );

  const tabIcon = (tab: SelectorTab) => {
    if (tab === "suggestions")
      return <TipsAndUpdatesRoundedIcon sx={{ fontSize: 16 }} />;
    if (tab === "public") return <PublicRoundedIcon sx={{ fontSize: 16 }} />;
    if (tab === "mine")
      return <BookmarkBorderRoundedIcon sx={{ fontSize: 16 }} />;
    if (tab === "youtube") return <YouTubeIcon sx={{ fontSize: 17 }} />;
    return <LinkRoundedIcon sx={{ fontSize: 16 }} />;
  };

  const isTabLocked = useCallback(
    (tab: SelectorTab) =>
      leaderboardCollectionOnlyMode && !isLeaderboardAllowedTab(tab),
    [leaderboardCollectionOnlyMode],
  );

  const handleSelectTab = useCallback((tab: SelectorTab) => {
    if (SOURCE_TABS.includes(tab)) {
      setSelectedSourceTab(tab);
    }
    setActiveTab(tab);
    setActionError(null);
    setActionNotice(null);
    setBrowseFilterOpen(false);
  }, []);

  const handleSourceTabClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (SOURCE_TABS.includes(activeTab)) {
        setSourceMenuAnchor(event.currentTarget);
        return;
      }

      handleSelectTab(activeSourceTab);
    },
    [activeSourceTab, activeTab, handleSelectTab],
  );

  useEffect(() => {
    if (!open) return;

    const nextTab = availableTabs.includes(initialTab) ? initialTab : "public";

    setActiveTab(nextTab);
    if (SOURCE_TABS.includes(nextTab)) {
      setSelectedSourceTab(nextTab);
    }
    setViewMode(isMobile ? "list" : "grid");
    setActionError(null);
    setActionNotice(null);
    setSelectedSuggestionClientId("all");
    setSourceMenuAnchor(null);
    setLinkPreviewTab("available");
    setSelectedLinkIssueGroup(defaultLinkPreviewIssueGroup);
    lastAutoPreviewUrlRef.current = "";
  }, [availableTabs, initialTab, isMobile, open]);

  useEffect(() => {
    if (!open) return;
    setPlaylistUrlDraft(playlistUrl);
  }, [open, playlistUrl]);

  useEffect(() => {
    if (
      selectedSuggestionClientId !== "all" &&
      !suggestionAuthors.some(
        (author) => author.clientId === selectedSuggestionClientId,
      )
    ) {
      setSelectedSuggestionClientId("all");
    }
  }, [selectedSuggestionClientId, suggestionAuthors]);

  useEffect(() => {
    if (!cooldownUntil) return;

    let tickId: number | null = null;
    const scheduleTick = () => {
      const now = Date.now();
      const remaining = cooldownUntil - now;
      if (remaining <= 0) {
        setCooldownUntil(null);
        setCooldownNow(now);
        return;
      }

      setCooldownNow(now);
      tickId = window.setTimeout(scheduleTick, Math.min(1000, remaining));
    };

    scheduleTick();

    return () => {
      if (tickId !== null) window.clearTimeout(tickId);
    };
  }, [cooldownUntil]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchDraft.trim().toLowerCase());
    }, 220);

    return () => window.clearTimeout(timer);
  }, [open, searchDraft]);

  const trimmedPlaylistUrlDraft = playlistUrlDraft.trim();
  const playlistUrlLooksValid =
    canAttemptPlaylistPreview(trimmedPlaylistUrlDraft);
  const hasLinkPreviewContent =
    Boolean(playlistPreviewMeta) ||
    (playlistItemsForChange.length > 0 && Boolean(trimmedPlaylistUrlDraft));
  const linkPreviewLocked =
    activeTab === "link" &&
    ((playlistLoading && playlistUrlLooksValid) ||
      hasLinkPreviewContent);
  const linkPreviewError = actionError ?? playlistError ?? null;
  const showPlaylistUrlError =
    Boolean(trimmedPlaylistUrlDraft) && Boolean(linkPreviewError);
  const showPlaylistUrlWarning =
    Boolean(trimmedPlaylistUrlDraft) &&
    !showPlaylistUrlError &&
    !playlistUrlLooksValid;
  const linkPreviewItems = hasLinkPreviewContent ? playlistItemsForChange : [];
  const linkPreviewIssueSummary = useMemo(
    () => buildPlaylistIssueSummary(playlistPreviewMeta),
    [playlistPreviewMeta],
  );
  const linkPreviewIssueTotal = useMemo(
    () => getPlaylistIssueTotal(linkPreviewIssueSummary),
    [linkPreviewIssueSummary],
  );
  const linkPreviewCover =
    linkPreviewItems.find((item) => Boolean(item.thumbnail))?.thumbnail ?? null;
  const linkPreviewListHeight = Math.min(
    LINK_PREVIEW_MAX_LIST_HEIGHT,
    Math.max(
      LINK_PREVIEW_MIN_LIST_HEIGHT,
      Math.min(linkPreviewItems.length, 5) * LINK_PREVIEW_ROW_HEIGHT,
    ),
  );
  const linkPreviewIssueGroups = useMemo(() => {
    const summary = linkPreviewIssueSummary;
    const groupedItems: Record<LinkPreviewIssueGroupKey, PlaylistIssueListItem[]> = {
      duplicate: summary.duplicate,
      removed: summary.removed,
      privateRestricted: summary.privateRestricted,
      embedBlocked: summary.embedBlocked,
      unavailable: [
        ...summary.unavailable,
        ...summary.unknown,
      ] as PlaylistIssueListItem[],
    };

    return playlistIssueGroups.map((group) => {
      const items = groupedItems[group.key] ?? [];
      const count =
        group.key === "unavailable"
          ? items.length + summary.unknownCount
          : items.length;

      const entries: LinkPreviewIssueEntry[] = items.map((item, index) => ({
        type: "item",
        key: `${group.key}-${item.title}-${index}`,
        label: group.label,
        item,
        className: group.className,
      }));

      if (group.key === "unavailable" && summary.unknownCount > 0) {
        entries.push({
          type: "empty",
          key: "unknown-count",
          description: `共 ${summary.unknownCount} 首，後端未提供明細`,
          className: group.className,
        });
      }

      return {
        ...group,
        count,
        entries,
      };
    });
  }, [linkPreviewIssueSummary]);
  const selectedLinkIssueGroupMeta =
    linkPreviewIssueGroups.find((group) => group.key === selectedLinkIssueGroup) ??
    linkPreviewIssueGroups.find((group) => group.count > 0) ??
    linkPreviewIssueGroups[0];
  const linkPreviewIssueEntries =
    selectedLinkIssueGroupMeta?.entries ?? [];

  const linkPreviewIssueListHeight = Math.min(
    LINK_PREVIEW_MAX_LIST_HEIGHT - 58,
    Math.max(
      160,
      Math.min(Math.max(linkPreviewIssueEntries.length, 1), 5) *
        LINK_PREVIEW_ISSUE_ROW_HEIGHT,
    ),
  );

  useEffect(() => {
    if (!open || activeTab !== "link") return;
    if (
      !playlistUrlLooksValid ||
      trimmedPlaylistUrlDraft === lastAutoPreviewUrlRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastAutoPreviewUrlRef.current = trimmedPlaylistUrlDraft;
      onPlaylistUrlChange(trimmedPlaylistUrlDraft);
      onPreviewPlaylistUrl(trimmedPlaylistUrlDraft);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    onPlaylistUrlChange,
    onPreviewPlaylistUrl,
    open,
    playlistUrlLooksValid,
    trimmedPlaylistUrlDraft,
  ]);

  useEffect(() => {
    if (!open || activeTab !== "suggestions") return;
    onMarkSuggestionsSeen();
  }, [activeTab, onMarkSuggestionsSeen, open]);

  useEffect(() => {
    if (!open || activeTab !== "public") return;
    onFetchCollections("public", {
      query: debouncedSearch,
      categoryKeys: selectedBrowseCategoryKeys,
      subTags: selectedBrowseSubTagKeys,
    });
  }, [
    activeTab,
    debouncedSearch,
    onFetchCollections,
    open,
    selectedBrowseCategoryKeys,
    selectedBrowseSubTagKeys,
  ]);

  useEffect(() => {
    if (!open || activeTab !== "mine" || !isGoogleAuthed) return;
    onFetchCollections("owner");
  }, [activeTab, isGoogleAuthed, onFetchCollections, open]);

  useEffect(() => {
    if (!open || activeTab !== "youtube" || !isGoogleAuthed) return;
    onFetchYoutubePlaylists();
  }, [activeTab, isGoogleAuthed, onFetchYoutubePlaylists, open]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (linkPreviewTab !== "unavailable" || linkPreviewIssueTotal > 0) return;
    setLinkPreviewTab("available");
  }, [linkPreviewIssueTotal, linkPreviewTab]);

  useEffect(() => {
    const selectedGroup = linkPreviewIssueGroups.find(
      (group) => group.key === selectedLinkIssueGroup,
    );
    if (selectedGroup && selectedGroup.count > 0) return;

    const firstGroupWithIssues = linkPreviewIssueGroups.find(
      (group) => group.count > 0,
    );
    if (!firstGroupWithIssues) {
      if (selectedLinkIssueGroup !== defaultLinkPreviewIssueGroup) {
        setSelectedLinkIssueGroup(defaultLinkPreviewIssueGroup);
      }
      return;
    }

    if (selectedLinkIssueGroup !== firstGroupWithIssues.key) {
      setSelectedLinkIssueGroup(firstGroupWithIssues.key);
    }
  }, [linkPreviewIssueGroups, selectedLinkIssueGroup]);

  const matchText = useCallback(
    (...parts: Array<string | null | undefined>) => {
      if (activeTab === "youtube" || activeTab === "link" || !debouncedSearch) {
        return true;
      }
      return parts
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(debouncedSearch);
    },
    [activeTab, debouncedSearch],
  );

  const activeBrowseFilterCount =
    (browseCategoryKey ? 1 : 0) + (browseSubTagKey ? 1 : 0);
  const browseFilterAggregationsQuery = useFilterAggregationsQuery({
    apiUrl: API_URL,
    visibility: "public",
    q: debouncedSearch.trim() || undefined,
    categoryKeys: selectedBrowseCategoryKeys,
    subTags: selectedBrowseSubTagKeys,
    enabled: open && activeTab === "public",
  });

  const publicCollections = useMemo(
    () =>
      collections.filter(
        (collection) => (collection.visibility ?? "public") !== "private",
      ),
    [collections],
  );

  const ownerCollections = useMemo(
    () =>
      collections.filter((collection) =>
        matchText(
          collection.title,
          collection.description,
          collection.cover_title,
          collection.cover_channel_title,
        ),
      ),
    [collections, matchText],
  );

  const filteredYoutubePlaylists = useMemo(
    () =>
      youtubePlaylists.filter((playlist) =>
        matchText(playlist.title, playlist.id),
      ),
    [matchText, youtubePlaylists],
  );

  const filteredSuggestions = useMemo(
    () =>
      playlistSuggestions.filter((suggestion) => {
        if (
          selectedSuggestionClientId !== "all" &&
          suggestion.clientId !== selectedSuggestionClientId
        ) {
          return false;
        }

        return matchText(
          suggestion.title,
          suggestion.username,
          suggestion.value,
        );
      }),
    [matchText, playlistSuggestions, selectedSuggestionClientId],
  );

  const sourceCountLabel = (() => {
    if (activeTab === "public") {
      if (collectionsLoading && publicCollections.length === 0) return "載入中";
      return `共 ${collectionsTotalCount ?? publicCollections.length} 筆`;
    }
    if (activeTab === "mine") {
      if (collectionsLoading && ownerCollections.length === 0) return "載入中";
      return `共 ${ownerCollections.length} 筆`;
    }
    if (activeTab === "youtube") {
      if (youtubePlaylistsLoading) return "載入中";
      return `共 ${filteredYoutubePlaylists.length} 筆`;
    }
    if (activeTab === "link") return null;
    return `共 ${filteredSuggestions.length} 筆`;
  })();

  const actionLabel = isHost ? "套用" : "推薦";
  const shouldShowSourceToolbar =
    activeTab !== "youtube" && activeTab !== "link";

  const runAction = useCallback(
    async (key: string, action: () => Promise<boolean>) => {
      if (pendingActionKey) return;

      setPendingActionKey(key);
      setActionError(null);
      setActionNotice(null);

      try {
        const ok = await action();
        if (!ok) {
          setActionError(
            (current) =>
              current ??
              (isHost ? "操作沒有完成，請稍後再試。" : "推薦題庫失敗。"),
          );
          return;
        }

        if (isHost) {
          setActionNotice("已套用題庫");
        } else {
          const now = Date.now();
          setCooldownNow(now);
          setCooldownUntil(now + RECOMMENDATION_COOLDOWN_MS);
          setActionNotice(null);
        }
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "操作失敗，請稍後再試。",
        );
      } finally {
        setPendingActionKey(null);
      }
    },
    [isHost, pendingActionKey],
  );

  const handleCollectionClick = useCallback(
    (collection: CollectionEntry) => {
      const type = sourceType(collection.visibility);
      const key = getSourceKey("collection", collection.id);
      const title = normalizeDisplayText(collection.title, "未命名收藏庫");
      const counts = resolveCollectionAvailabilityCounts(collection);
      const requirement = resolveCollectionPlayableRequirement(collection);

      if (requirement.disabled) {
        setActionError(
          requirement.detail ??
            `此收藏庫至少需要 ${MIN_COLLECTION_PLAYABLE_COUNT} 題可遊玩題目。`,
        );
        return;
      }

      if (leaderboardCollectionOnlyMode && type !== "public_collection") {
        setActionError(leaderboardCollectionOnlyReason);
        return;
      }

      const leaderboardQuestionRestrictionReason =
        getLeaderboardQuestionRestrictionReason(
          counts.playable,
          leaderboardMinPlayableCount,
        );
      if (leaderboardCollectionOnlyMode && leaderboardQuestionRestrictionReason) {
        setActionError(leaderboardQuestionRestrictionReason);
        return;
      }

      if (!isHost && isCooldownActive) {
        setActionError(null);
        setActionNotice(null);
        return;
      }

      void runAction(key, async () => {
        if (isHost) {
          const ok = await onApplyCollectionDirect(collection.id, title);
          if (ok) {
            onRecordSourceApplied({
              sourceType: type,
              title,
              sourceId: collection.id,
              thumbnailUrl: getCollectionThumbnail(collection),
              itemCount: counts.playable,
            });
            onClose();
          }
          return ok;
        }

        if (!onSuggestPlaylist) {
          setActionError("目前無法送出推薦。");
          return false;
        }

        const result = await onSuggestPlaylist("collection", collection.id, {
          sourceId: collection.id,
          title,
          readToken: collection.readToken ?? null,
          totalCount: counts.playable,
        });

        if (!result.ok && result.error) {
          setActionError(result.error);
        }

        return result.ok;
      });
    },
    [
      isHost,
      onApplyCollectionDirect,
      onClose,
      onRecordSourceApplied,
      onSuggestPlaylist,
      isCooldownActive,
      leaderboardCollectionOnlyMode,
      leaderboardCollectionOnlyReason,
      leaderboardMinPlayableCount,
      runAction,
    ],
  );

  const handleYoutubePlaylistClick = useCallback(
    (playlist: YoutubePlaylist) => {
      const key = getSourceKey("playlist", playlist.id);
      const title = normalizeDisplayText(playlist.title, "未命名播放清單");

      if (playlist.itemCount < YOUTUBE_PLAYLIST_MIN_ITEM_COUNT) {
        setActionError(
          `YouTube 播放清單至少需要 ${YOUTUBE_PLAYLIST_MIN_ITEM_COUNT} 首。`,
        );
        return;
      }

      if (leaderboardCollectionOnlyMode) {
        setActionError(leaderboardCollectionOnlyReason);
        return;
      }

      if (!isHost && isCooldownActive) {
        setActionError(null);
        setActionNotice(null);
        return;
      }

      void runAction(key, async () => {
        if (isHost) {
          const ok = await onApplyYoutubePlaylistDirect(playlist.id, title);
          if (ok) {
            onRecordSourceApplied({
              sourceType: "youtube_google_import",
              title,
              sourceId: playlist.id,
              thumbnailUrl: playlist.thumbnail ?? null,
              itemCount: playlist.itemCount,
            });
            onClose();
          }
          return ok;
        }

        if (!onSuggestPlaylist) {
          setActionError("目前無法送出推薦。");
          return false;
        }

        const result = await onSuggestPlaylist("playlist", playlist.id, {
          sourceId: playlist.id,
          title,
          totalCount: playlist.itemCount,
        });

        if (!result.ok && result.error) {
          setActionError(result.error);
        }

        return result.ok;
      });
    },
    [
      isHost,
      onApplyYoutubePlaylistDirect,
      onClose,
      onRecordSourceApplied,
      onSuggestPlaylist,
      isCooldownActive,
      leaderboardCollectionOnlyMode,
      leaderboardCollectionOnlyReason,
      runAction,
    ],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: PlaylistSuggestion) => {
      if (!isHost) return;

      const key = getSourceKey(
        suggestion.type,
        suggestion.sourceId ?? suggestion.value,
      );

      void runAction(key, async () => {
        const ok = await onApplySuggestionSnapshot(suggestion);
        if (ok) onClose();
        return ok;
      });
    },
    [isHost, onApplySuggestionSnapshot, onClose, runAction],
  );

  const handleApplyLink = useCallback(() => {
    const trimmed = playlistUrlDraft.trim();
    if (!trimmed) {
      setActionError("請先貼上 YouTube 播放清單連結。");
      return;
    }

    const playlistId =
      extractPlaylistId?.(trimmed) ?? getPlaylistIdFromUrl(trimmed);
    if (!playlistId) {
      setActionError("無法辨識播放清單 ID，請確認連結包含 list 參數。");
      return;
    }

    if (leaderboardCollectionOnlyMode) {
      setActionError(leaderboardCollectionOnlyReason);
      return;
    }

    if (!isHost && isCooldownActive) {
      setActionError(null);
      setActionNotice(null);
      return;
    }

    const key = getSourceKey("playlist", playlistId);

    void runAction(key, async () => {
      if (isHost) {
        const ok = await onApplyPlaylistUrlDirect(trimmed);
        if (ok) {
          onRecordSourceApplied({
            sourceType: "youtube_pasted_link",
            title: playlistId,
            sourceId: playlistId,
            url: trimmed,
            itemCount: playlistPreviewMeta?.expectedCount ?? null,
          });
          onClose();
        }
        return ok;
      }

      if (!onSuggestPlaylist) {
        setActionError("目前無法送出推薦。");
        return false;
      }

      const result = await onSuggestPlaylist("playlist", trimmed, {
        sourceId: playlistId,
        title: playlistId,
        totalCount: playlistPreviewMeta?.expectedCount ?? null,
      });

      if (!result.ok && result.error) {
        setActionError(result.error);
      }

      return result.ok;
    });
  }, [
    extractPlaylistId,
    isHost,
    onApplyPlaylistUrlDirect,
    onClose,
    onRecordSourceApplied,
    onSuggestPlaylist,
    isCooldownActive,
    leaderboardCollectionOnlyMode,
    leaderboardCollectionOnlyReason,
    playlistPreviewMeta?.expectedCount,
    playlistUrlDraft,
    runAction,
  ]);

  const handleClearLinkInput = useCallback(() => {
    if (linkPreviewLocked) {
      onResetPlaylist();
      onPlaylistUrlChange("");
    }
    setPlaylistUrlDraft("");
    setActionError(null);
    lastAutoPreviewUrlRef.current = "";
  }, [linkPreviewLocked, onPlaylistUrlChange, onResetPlaylist]);

  const renderCollection = (collection: CollectionEntry) => {
    const type = sourceType(collection.visibility);
    const title = normalizeDisplayText(collection.title, "未命名收藏庫");
    const counts = resolveCollectionAvailabilityCounts(collection);
    const requirement = resolveCollectionPlayableRequirement(collection);
    const lockedByLeaderboard =
      leaderboardCollectionOnlyMode && type !== "public_collection";
    const leaderboardQuestionRestrictionReason =
      leaderboardCollectionOnlyMode && type === "public_collection"
        ? getLeaderboardQuestionRestrictionReason(
            counts.playable,
            leaderboardMinPlayableCount,
          )
        : null;
    const key = getSourceKey("collection", collection.id);
    const isCurrent =
      currentSourceType === type &&
      normalizedCurrentSourceIds.includes(normalizeSourceId(collection.id));

    return (
      <SourceCard
        key={collection.id}
        viewMode={viewMode}
        title={title}
        description={collection.description || collection.cover_channel_title}
        thumbnailUrl={getCollectionThumbnail(collection)}
        badge={
          activeTab === "mine" ? (
            <SourceBadge
              icon={
                type === "public_collection" ? (
                  <PublicRoundedIcon sx={{ fontSize: 13 }} />
                ) : (
                  <BookmarkBorderRoundedIcon sx={{ fontSize: 13 }} />
                )
              }
              label={type === "public_collection" ? "公開收藏庫" : "私人收藏庫"}
            />
          ) : undefined
        }
        rating={
          <SourceRating
            ratingAvg={collection.rating_avg}
            ratingCount={collection.rating_count}
          />
        }
        metaCollection={collection}
        metrics={
          <SourceMetrics
            itemCount={counts.total}
            playableCount={counts.playable}
            useCount={collection.use_count}
            favoriteCount={collection.favorite_count}
            noWrap={viewMode === "list"}
          />
        }
        disabled={
          requirement.disabled ||
          lockedByLeaderboard ||
          Boolean(leaderboardQuestionRestrictionReason)
        }
        disabledReason={
          lockedByLeaderboard
            ? leaderboardCollectionOnlyReason
            : leaderboardQuestionRestrictionReason ?? requirement.reason
        }
        isCurrent={isCurrent}
        isRunning={pendingActionKey === key}
        onClick={() => handleCollectionClick(collection)}
      />
    );
  };

  const renderYoutubePlaylist = (playlist: YoutubePlaylist) => {
    const key = getSourceKey("playlist", playlist.id);
    const isCurrent =
      currentSourceType === "youtube_google_import" &&
      normalizedCurrentSourceIds.includes(normalizeSourceId(playlist.id));
    const disabledByCount =
      playlist.itemCount < YOUTUBE_PLAYLIST_MIN_ITEM_COUNT;
    const disabled = disabledByCount || leaderboardCollectionOnlyMode;

    return (
      <SourceCard
        key={playlist.id}
        viewMode={viewMode}
        title={normalizeDisplayText(playlist.title, "未命名播放清單")}
        description={`YouTube 播放清單 · ${formatCount(playlist.itemCount)} 首`}
        thumbnailUrl={playlist.thumbnail}
        metrics={
          <SourceMetrics
            itemCount={playlist.itemCount}
            noWrap={viewMode === "list"}
          />
        }
        disabled={disabled}
        disabledReason={
          leaderboardCollectionOnlyMode
            ? leaderboardCollectionOnlyReason
            : disabledByCount
              ? `至少需要 ${YOUTUBE_PLAYLIST_MIN_ITEM_COUNT} 首`
              : null
        }
        isCurrent={isCurrent}
        isRunning={pendingActionKey === key}
        onClick={() => handleYoutubePlaylistClick(playlist)}
      />
    );
  };

  const renderSuggestion = (suggestion: PlaylistSuggestion) => {
    const key = getSourceKey(
      suggestion.type,
      suggestion.sourceId ?? suggestion.value,
    );
    const matchedCollection = findCollectionForSuggestion(
      suggestion,
      collections,
    );
    const collectionCounts = matchedCollection
      ? resolveCollectionAvailabilityCounts(matchedCollection)
      : null;
    const title =
      normalizeDisplayText(matchedCollection?.title, "") ||
      normalizeDisplayText(suggestion.title, "") ||
      (suggestion.type === "collection" ? "未命名收藏庫" : "YouTube 播放清單");
    const lockedByLeaderboard =
      leaderboardCollectionOnlyMode &&
      (suggestion.type !== "collection" ||
        (matchedCollection?.visibility ?? "public") === "private");
    const lockedByRole = !isHost;
    const isPublicCollection =
      suggestion.type === "collection" &&
      (matchedCollection?.visibility ?? "public") !== "private";
    const suggestionPlayableCount =
      collectionCounts?.playable ??
      suggestion.playableCount ??
      suggestion.totalCount ??
      null;
    const leaderboardQuestionRestrictionReason =
      leaderboardCollectionOnlyMode && isPublicCollection
        ? getLeaderboardQuestionRestrictionReason(
            suggestionPlayableCount,
            leaderboardMinPlayableCount,
          )
        : null;
    const description = `${suggestion.username} 推薦 · ${
      suggestion.type === "collection"
        ? isPublicCollection
          ? "公開收藏庫"
          : "收藏庫"
        : "播放清單"
    }`;

    return (
      <SourceCard
        key={`${suggestion.clientId}-${suggestion.suggestedAt}-${suggestion.value}`}
        viewMode={viewMode}
        title={title}
        description={description}
        thumbnailUrl={
          matchedCollection
            ? getCollectionThumbnail(matchedCollection)
            : getSuggestionThumbnail(suggestion)
        }
        rating={
          matchedCollection ? (
            <SourceRating
              ratingAvg={matchedCollection.rating_avg}
              ratingCount={matchedCollection.rating_count}
            />
          ) : undefined
        }
        metaCollection={matchedCollection}
        metrics={
          <SourceMetrics
            itemCount={collectionCounts?.total ?? suggestion.totalCount}
            playableCount={
              collectionCounts?.playable ??
              suggestion.playableCount ??
              suggestion.totalCount
            }
            useCount={matchedCollection?.use_count}
            favoriteCount={matchedCollection?.favorite_count}
            noWrap={viewMode === "list"}
          />
        }
        disabled={
          lockedByLeaderboard ||
          lockedByRole ||
          Boolean(leaderboardQuestionRestrictionReason)
        }
        disabledReason={
          lockedByLeaderboard
            ? leaderboardCollectionOnlyReason
            : leaderboardQuestionRestrictionReason ??
              (lockedByRole ? "只有房主可以套用推薦" : null)
        }
        isRunning={pendingActionKey === key}
        onClick={() => handleSuggestionClick(suggestion)}
      />
    );
  };

  const virtualColumns = viewMode === "grid" ? columns : 1;
  const sourceRowHeight = viewMode === "grid" ? 286 : 112;
  const sourceListHeight = "100%";
  const renderVirtualSources = (
    items: unknown[],
    renderItem: (item: unknown, itemIndex: number) => React.ReactNode,
    options?: {
      hasMore?: boolean;
      isLoadingMore?: boolean;
      onLoadMore?: () => void;
      renderLoader?: () => React.ReactNode;
    },
  ) => {
    const hasLoader = Boolean(options?.hasMore || options?.isLoadingMore);
    const rowCount =
      Math.ceil(items.length / virtualColumns) + (hasLoader ? 1 : 0);

    return (
      <List<VirtualSourceRowProps>
        style={{
          height: sourceListHeight,
          width: "100%",
        }}
        rowCount={rowCount}
        rowHeight={sourceRowHeight}
        rowProps={{
          items,
          columns: virtualColumns,
          viewMode,
          renderItem,
          hasMore: options?.hasMore,
          isLoadingMore: options?.isLoadingMore,
          onLoadMore: options?.onLoadMore,
          renderLoader: options?.renderLoader,
        }}
        rowComponent={VirtualSourceRow}
      />
    );
  };

  const renderMainContent = () => {
    if (activeTab === "suggestions") {
      if (filteredSuggestions.length === 0) {
        return (
          <EmptyState
            icon={<TipsAndUpdatesRoundedIcon sx={{ fontSize: 26 }} />}
            title="目前沒有推薦題庫"
            description="其他玩家推薦後，房主可以在這裡快速套用。"
          />
        );
      }

      return renderVirtualSources(filteredSuggestions, (item) =>
        renderSuggestion(item as PlaylistSuggestion),
      );
    }

    if (activeTab === "public") {
      if (collectionsLoading && collections.length === 0) {
        return <LoadingState label="正在載入公開收藏庫..." />;
      }

      if (collectionsError && publicCollections.length === 0) {
        return (
          <EmptyState
            title="無法載入公開收藏庫"
            description={collectionsError}
          />
        );
      }

      if (publicCollections.length === 0) {
        return (
          <EmptyState
            icon={<PublicRoundedIcon sx={{ fontSize: 26 }} />}
            title="找不到符合條件的公開收藏庫"
            description="可以換個關鍵字搜尋，或先建立公開收藏庫。"
          />
        );
      }

      return (
        <>
          {renderVirtualSources(
            publicCollections,
            (item) => renderCollection(item as CollectionEntry),
            {
              hasMore: collectionsHasMore,
              isLoadingMore: collectionsLoadingMore,
              onLoadMore: onLoadMoreCollections,
              renderLoader: () => (
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/14 bg-slate-950/42 px-4 py-2 text-xs font-semibold text-slate-300">
                  {collectionsLoadingMore ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : null}
                  <span>
                    {collectionsLoadingMore ? "載入中..." : "準備載入更多"}
                  </span>
                </div>
              ),
            },
          )}
        </>
      );
    }

    if (activeTab === "mine") {
      if (!isGoogleAuthed) {
        return (
          <EmptyState
            icon={<BookmarkBorderRoundedIcon sx={{ fontSize: 26 }} />}
            title="登入後查看你的收藏庫"
            description="登入 Google 後，可以使用自己建立或收藏的題庫。"
            action={
              <Button
                type="button"
                variant="contained"
                onClick={onRequestGoogleLogin}
                sx={{ borderRadius: 999 }}
              >
                登入 Google
              </Button>
            }
          />
        );
      }

      if (collectionsLoading && collections.length === 0) {
        return <LoadingState label="正在載入你的收藏庫..." />;
      }

      if (collectionsError && ownerCollections.length === 0) {
        return (
          <EmptyState
            title="無法載入你的收藏庫"
            description={collectionsError}
          />
        );
      }

      if (ownerCollections.length === 0) {
        return (
          <EmptyState
            icon={<BookmarkBorderRoundedIcon sx={{ fontSize: 26 }} />}
            title="目前沒有可用的收藏庫"
            description="可以先到 RoomsHub 建立收藏庫，再回到房間套用。"
          />
        );
      }

      return renderVirtualSources(ownerCollections, (item) =>
        renderCollection(item as CollectionEntry),
      );
    }

    if (activeTab === "youtube") {
      if (!isGoogleAuthed) {
        return (
          <EmptyState
            icon={<YouTubeIcon sx={{ fontSize: 28 }} />}
            title="登入後查看 YouTube 播放清單"
            description="登入 Google 後，可以直接選擇你的 YouTube 播放清單。"
            action={
              <Button
                type="button"
                variant="contained"
                onClick={onRequestGoogleLogin}
                sx={{ borderRadius: 999 }}
              >
                登入 Google
              </Button>
            }
          />
        );
      }

      if (youtubePlaylistsLoading) {
        return <LoadingState label="正在載入 YouTube 播放清單..." />;
      }

      if (youtubePlaylistsError && filteredYoutubePlaylists.length === 0) {
        return (
          <EmptyState
            title="無法載入 YouTube 播放清單"
            description={youtubePlaylistsError}
            action={
              <Button
                type="button"
                variant="outlined"
                onClick={() => onFetchYoutubePlaylists(true)}
                sx={{ borderRadius: 999 }}
              >
                重新整理
              </Button>
            }
          />
        );
      }

      if (filteredYoutubePlaylists.length === 0) {
        return (
          <EmptyState
            icon={<YouTubeIcon sx={{ fontSize: 28 }} />}
            title="找不到播放清單"
            description="可以換個關鍵字搜尋，或改用貼上連結。"
          />
        );
      }

      return renderVirtualSources(filteredYoutubePlaylists, (item) =>
        renderYoutubePlaylist(item as YoutubePlaylist),
      );
    }

    return (
      <div className="mx-auto flex h-full w-full max-w-[760px] flex-col gap-4 rounded-[28px] border border-white/10 bg-slate-950/34 p-4 sm:p-5">
        <div>
          <div className="text-base font-semibold text-slate-100">
            貼上 YouTube 播放清單連結
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-400">
            支援含有 list 參數的 YouTube 播放清單連結。
          </div>
        </div>

        {leaderboardCollectionOnlyMode ? (
          <div className="rounded-2xl border border-amber-200/18 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
            {leaderboardCollectionOnlyReason}
          </div>
        ) : null}

        <TextField
          fullWidth
          value={playlistUrlDraft}
          disabled={leaderboardCollectionOnlyMode}
          error={showPlaylistUrlError}
          onChange={(event) => {
            setPlaylistUrlDraft(event.target.value);
            if (actionError) {
              setActionError(null);
            }
          }}
          placeholder="https://www.youtube.com/playlist?list=..."
          inputProps={{
            readOnly: linkPreviewLocked,
            autoComplete: "off",
            autoCorrect: "off",
            autoCapitalize: "off",
            spellCheck: "false",
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkRoundedIcon sx={{ color: "rgba(148,163,184,0.86)" }} />
              </InputAdornment>
            ),
            endAdornment: trimmedPlaylistUrlDraft ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  onClick={handleClearLinkInput}
                  aria-label={
                    linkPreviewLocked ? "取消目前清單預覽" : "清除播放清單連結"
                  }
                  sx={{
                    color: linkPreviewLocked
                      ? "#fbbf24"
                      : "rgba(148,163,184,0.92)",
                    backgroundColor: "transparent",
                    "&:hover": {
                      backgroundColor: "transparent",
                      color: linkPreviewLocked
                        ? "#fcd34d"
                        : "rgba(226,232,240,0.98)",
                    },
                  }}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
          sx={{
            "& .MuiInputLabel-root.Mui-focused": {
              color: showPlaylistUrlWarning
                ? "rgba(251,191,36,0.96)"
                : undefined,
            },
            "& .MuiOutlinedInput-root": {
              borderRadius: "18px",
              color: "rgba(248,250,252,0.94)",
              backgroundColor: "rgba(15,23,42,0.72)",
              "& fieldset": {
                borderColor: showPlaylistUrlWarning
                  ? "rgba(251,191,36,0.4)"
                  : showPlaylistUrlError
                    ? "rgba(248,113,113,0.5)"
                    : "rgba(148,163,184,0.22)",
              },
              "&:hover fieldset": {
                borderColor: showPlaylistUrlWarning
                  ? "rgba(251,191,36,0.56)"
                  : showPlaylistUrlError
                    ? "rgba(248,113,113,0.66)"
                    : "rgba(103,232,249,0.28)",
              },
              "&.Mui-focused fieldset": {
                borderColor: showPlaylistUrlWarning
                  ? "rgba(251,191,36,0.78)"
                  : showPlaylistUrlError
                    ? "rgba(248,113,113,0.72)"
                    : "rgba(103,232,249,0.55)",
              },
            },
          }}
        />

        {showPlaylistUrlWarning ? (
          <div className="rounded-2xl border border-amber-200/18 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
            請貼上含有 `list=` 參數的 YouTube 播放清單連結。
          </div>
        ) : null}

        {linkPreviewError ? (
          <div className="rounded-2xl border border-rose-300/16 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
            {linkPreviewError}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/20">
          {playlistLoading && playlistUrlLooksValid && linkPreviewItems.length === 0 ? (
            <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
              <CircularProgress size={28} color="inherit" className="text-cyan-300" />
              <div className="text-sm font-semibold text-slate-100">
                正在讀取播放清單
              </div>
              <div className="text-xs text-slate-400">
                正在驗證連結並整理可套用的曲目。
              </div>
            </div>
          ) : linkPreviewItems.length > 0 || linkPreviewIssueTotal > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-14 w-[88px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
                    {linkPreviewCover ? (
                      <img
                        src={linkPreviewCover}
                        alt="播放清單封面"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-cyan-100/80">
                        <YouTubeIcon sx={{ fontSize: 24 }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">
                      播放清單預覽
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-300">
                      <span className="rounded-full border border-cyan-300/22 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">
                        可用 {linkPreviewItems.length} 首
                      </span>
                      <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-2.5 py-1 text-rose-100">
                        不可用 {linkPreviewIssueTotal} 首
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="contained"
                  disabled={
                    playlistLoading ||
                    Boolean(pendingActionKey) ||
                    leaderboardCollectionOnlyMode ||
                    isCooldownActive ||
                    !playlistUrlLooksValid
                  }
                  onClick={handleApplyLink}
                  sx={{
                    minWidth: 88,
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {pendingActionKey ? "處理中..." : actionLabel}
                </Button>
              </div>

              <div
                role="tablist"
                aria-label="播放清單預覽分頁"
                className="mx-4 mt-3 grid h-11 grid-cols-2 overflow-visible rounded-2xl border border-cyan-100/14 bg-slate-950/42 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={linkPreviewTab === "available"}
                  onClick={() => setLinkPreviewTab("available")}
                  className={`inline-flex h-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                    linkPreviewTab === "available"
                      ? "bg-cyan-200/12 text-cyan-50 shadow-[0_10px_24px_-18px_rgba(34,211,238,0.85)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                  }`}
                >
                  <span>可用清單</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none text-slate-200">
                    {linkPreviewItems.length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={linkPreviewTab === "unavailable"}
                  disabled={linkPreviewIssueTotal <= 0}
                  onClick={() => setLinkPreviewTab("unavailable")}
                  className={`inline-flex h-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                    linkPreviewTab === "unavailable"
                      ? "bg-cyan-200/12 text-cyan-50 shadow-[0_10px_24px_-18px_rgba(34,211,238,0.85)]"
                      : linkPreviewIssueTotal <= 0
                        ? "cursor-not-allowed text-slate-600"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                  }`}
                >
                  <span>不可用項目</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none text-slate-200">
                    {linkPreviewIssueTotal}
                  </span>
                </button>
              </div>

              <div className="min-h-0 flex-1 px-1 py-2">
                {linkPreviewTab === "available" ? (
                  linkPreviewItems.length > 0 ? (
                    <List<LinkPreviewAvailableRowProps>
                      rowCount={linkPreviewItems.length}
                      rowHeight={LINK_PREVIEW_ROW_HEIGHT}
                      rowProps={{ items: linkPreviewItems }}
                      rowComponent={LinkPreviewAvailableRow}
                      style={{
                        height: linkPreviewListHeight,
                        width: "100%",
                      }}
                    />
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-sm text-slate-400">
                      目前沒有可套用的曲目。
                    </div>
                  )
                ) : (
                  <div className="flex h-full min-h-0 flex-col gap-2">
                    <div className="px-2">
                      <label
                        htmlFor="link-preview-issue-group"
                        className="sr-only"
                      >
                        不可用分類
                      </label>
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/54 px-3 py-2">
                        <span className="min-w-0 text-xs font-semibold text-slate-300">
                          不可用分類
                        </span>
                        <select
                          id="link-preview-issue-group"
                          value={selectedLinkIssueGroupMeta?.key}
                          onChange={(event) =>
                            setSelectedLinkIssueGroup(
                              event.target.value as LinkPreviewIssueGroupKey,
                            )
                          }
                          className="min-w-[156px] rounded-xl border border-white/10 bg-slate-950/90 px-3 py-1.5 text-sm font-semibold text-slate-100 outline-none transition focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/10"
                        >
                          {linkPreviewIssueGroups.map((group) => (
                            <option
                              key={group.key}
                              value={group.key}
                              disabled={group.count <= 0}
                            >
                              {group.label} {group.count}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {linkPreviewIssueEntries.length > 0 ? (
                      <List<LinkPreviewIssueRowProps>
                        rowCount={linkPreviewIssueEntries.length}
                        rowHeight={LINK_PREVIEW_ISSUE_ROW_HEIGHT}
                        rowProps={{ entries: linkPreviewIssueEntries }}
                        rowComponent={LinkPreviewIssueRow}
                        style={{
                          height: linkPreviewIssueListHeight,
                          width: "100%",
                        }}
                      />
                    ) : (
                      <div className="flex min-h-[160px] items-center justify-center px-4 text-center text-sm text-slate-400">
                        沒有不可用項目。
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-[240px] flex-1 items-center justify-center px-4 text-center text-sm text-slate-400">
              貼上連結後會自動讀取清單並顯示曲目預覽。
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Drawer
      anchor={drawerAnchor}
      open={open}
      onClose={() => onClose()}
      keepMounted
      sx={{
        zIndex: 1100,
        "& .MuiDrawer-paper": {
          left: "auto !important",
          right: "0 !important",
          width: {
            xs: "100vw",
            sm: "min(94vw, 760px)",
            md: "min(92vw, 940px)",
            lg: `min(88vw, ${DRAWER_MAX_WIDTH}px)`,
          },
          maxWidth: "100vw",
          height: {
            xs: "100dvh",
            sm: "100dvh",
          },
          maxHeight: {
            xs: "100dvh",
            sm: "100dvh",
          },
          mt: {
            xs: 0,
            sm: 0,
          },
          mb: {
            xs: 0,
            sm: 0,
          },
          borderRadius: {
            xs: 0,
            sm: "24px 0 0 24px",
          },
          overflow: "hidden",
          border: {
            xs: "none",
            sm: "1px solid rgba(148,163,184,0.18)",
          },
          borderRight: "none",
          background: "#020617",
          boxShadow:
            "-24px 0 80px -48px rgba(15,23,42,0.98), inset 1px 0 0 rgba(255,255,255,0.055)",
        },
      }}
      ModalProps={{
        BackdropProps: {
          sx: {
            background: "rgba(2,6,23,0.64)",
            backdropFilter: "blur(8px)",
          },
        },
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/10 bg-slate-950/36 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <Typography
                  component="h2"
                  sx={{
                    color: "rgba(248,250,252,0.98)",
                    fontSize: { xs: 18, sm: 22 },
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {isHost ? "更改題庫" : "推薦題庫"}
                </Typography>

                {leaderboardCollectionOnlyMode ? (
                  <span className="inline-flex rounded-full border border-amber-200/18 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-50">
                    {leaderboardCollectionOnlyReason}
                  </span>
                ) : null}
              </div>

              {leaderboardCollectionOnlyMode ? null : !isHost ? (
                <div className="mt-1 text-sm leading-6 text-slate-400">
                  推薦題庫給房主，房主確認後即可套用。
                </div>
              ) : null}
            </div>

            <IconButton
              type="button"
              onClick={onClose}
              sx={{
                color: "rgba(226,232,240,0.9)",
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "transparent",
                  color: "#ffffff",
                },
              }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </div>

          <div
            role={isMobile ? "tablist" : undefined}
            aria-label={isMobile ? "題庫來源分頁" : undefined}
            className={
              isMobile
                ? "mt-4 grid h-11 grid-cols-2 overflow-visible rounded-2xl border border-cyan-100/14 bg-slate-950/42 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
                : "mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            }
          >
            {isMobile ? (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "suggestions"}
                  onClick={() => handleSelectTab("suggestions")}
                  className={`inline-flex h-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                    activeTab === "suggestions"
                      ? "bg-cyan-200/12 text-cyan-50 shadow-[0_10px_24px_-18px_rgba(34,211,238,0.85)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                  }`}
                >
                  {tabIcon("suggestions")}
                  {tabLabel("suggestions")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={SOURCE_TABS.includes(activeTab)}
                  onClick={handleSourceTabClick}
                  className={`inline-flex h-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                    SOURCE_TABS.includes(activeTab)
                      ? "bg-cyan-200/12 text-cyan-50 shadow-[0_10px_24px_-18px_rgba(34,211,238,0.85)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                  }`}
                >
                  {tabIcon(activeSourceTab)}
                  {tabLabel(activeSourceTab)}
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSourceMenuAnchor(event.currentTarget);
                    }}
                    aria-hidden="true"
                  >
                    <ArrowDropDownRoundedIcon sx={{ fontSize: 18 }} />
                  </span>
                </button>
                <Menu
                  anchorEl={sourceMenuAnchor}
                  open={Boolean(sourceMenuAnchor)}
                  onClose={() => setSourceMenuAnchor(null)}
                  sx={{ zIndex: 1600 }}
                  slotProps={{
                    root: {
                      sx: { zIndex: 1600 },
                    },
                    paper: {
                      sx: {
                        mt: 0.75,
                        border: "1px solid rgba(148,163,184,0.18)",
                        backgroundColor: "#08111f",
                        color: "rgba(248,250,252,0.96)",
                        borderRadius: "14px",
                        minWidth: 172,
                        maxHeight: 320,
                      },
                    },
                  }}
                >
                  {SOURCE_TABS.map((tab) => {
                    const locked = isTabLocked(tab);

                    return (
                      <MenuItem
                        key={tab}
                        disabled={locked}
                        selected={activeTab === tab}
                        onClick={() => {
                          if (locked) return;
                          handleSelectTab(tab);
                          setSourceMenuAnchor(null);
                        }}
                        sx={{ gap: 1, fontSize: 13 }}
                      >
                        {locked ? (
                          <LockOutlinedIcon sx={{ fontSize: 15 }} />
                        ) : (
                          tabIcon(tab)
                        )}
                        {tabLabel(tab)}
                      </MenuItem>
                    );
                  })}
                </Menu>
              </>
            ) : (
              availableTabs.map((tab) => {
                const lockedByLeaderboard = isTabLocked(tab);

                return (
                  <button
                    key={tab}
                    type="button"
                    disabled={lockedByLeaderboard}
                    onClick={() => handleSelectTab(tab)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold transition ${
                      activeTab === tab
                        ? "border-cyan-200/34 bg-cyan-200/12 text-cyan-50"
                        : lockedByLeaderboard
                          ? "cursor-not-allowed border-amber-200/12 bg-amber-300/[0.03] text-slate-500"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/16 hover:bg-white/[0.07]"
                    }`}
                  >
                    {lockedByLeaderboard ? (
                      <LockOutlinedIcon sx={{ fontSize: 15 }} />
                    ) : (
                      tabIcon(tab)
                    )}
                    {tabLabel(tab)}
                  </button>
                );
              })
            )}
          </div>
        </header>

        {shouldShowSourceToolbar ? (
          <section className="shrink-0 border-b border-white/8 px-4 py-3 sm:px-6">
            <div className="flex flex-row items-center justify-between gap-2 md:gap-3">
              {activeTab === "suggestions" ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedSuggestionClientId("all")}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                      selectedSuggestionClientId === "all"
                        ? "border-cyan-200/34 bg-cyan-200/12 text-cyan-50"
                        : "border-white/10 bg-slate-950/48 text-slate-300 hover:border-cyan-200/22"
                    }`}
                  >
                    全部
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none text-slate-200">
                      {playlistSuggestions.length}
                    </span>
                  </button>

                  {suggestionAuthors.map((author) => {
                    const selected =
                      selectedSuggestionClientId === author.clientId;

                    return (
                      <button
                        key={author.clientId}
                        type="button"
                        title={`${author.username} 的推薦`}
                        aria-label={`${author.username} 的推薦`}
                        onClick={() =>
                          setSelectedSuggestionClientId(author.clientId)
                        }
                        className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition ${
                          selected
                            ? "border-cyan-200/55 bg-cyan-200/14 text-cyan-50 shadow-[0_0_0_3px_rgba(34,211,238,0.1)]"
                            : "border-white/12 bg-slate-950/54 text-slate-200 hover:border-cyan-200/30"
                        }`}
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-slate-100">
                          {author.avatarUrl ? (
                            <img
                              src={author.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span>{getInitial(author.username)}</span>
                          )}
                        </span>
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-cyan-300 px-1.5 text-[11px] font-bold leading-5 text-slate-950">
                          {author.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="relative min-w-0 flex-1">
                  <TextField
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="搜尋收藏庫"
                    size="small"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon
                            sx={{
                              color: "rgba(148,163,184,0.82)",
                              fontSize: 20,
                            }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment:
                        activeTab === "public" ? (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              size="small"
                              aria-label="開啟收藏庫篩選"
                              aria-expanded={browseFilterOpen}
                              onClick={() =>
                                setBrowseFilterOpen((current) => !current)
                              }
                              sx={{
                                position: "relative",
                                color: browseFilterOpen
                                  ? "rgba(186,230,253,0.98)"
                                  : "rgba(148,163,184,0.86)",
                                backgroundColor: browseFilterOpen
                                  ? "rgba(34,211,238,0.14)"
                                  : "transparent",
                                border: browseFilterOpen
                                  ? "1px solid rgba(103,232,249,0.28)"
                                  : "1px solid transparent",
                                borderRadius: "10px",
                                "&:hover": {
                                  backgroundColor: browseFilterOpen
                                    ? "rgba(34,211,238,0.18)"
                                    : "rgba(148,163,184,0.08)",
                                },
                              }}
                            >
                              <TuneRoundedIcon sx={{ fontSize: 18 }} />
                              {activeBrowseFilterCount > 0 ? (
                                <span
                                  aria-hidden
                                  className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-cyan-400 px-1 text-[9px] font-bold leading-none text-slate-950 shadow"
                                >
                                  {activeBrowseFilterCount}
                                </span>
                              ) : null}
                            </IconButton>
                          </InputAdornment>
                        ) : undefined,
                    }}
                    sx={{
                      minWidth: 0,
                      "& .MuiOutlinedInput-root": {
                        height: 42,
                        borderRadius: "999px",
                        color: "rgba(248,250,252,0.94)",
                        backgroundColor: "rgba(15,23,42,0.64)",
                        "& fieldset": {
                          borderColor: "rgba(148,163,184,0.18)",
                        },
                        "&:hover fieldset": {
                          borderColor: "rgba(103,232,249,0.26)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "rgba(103,232,249,0.5)",
                        },
                      },
                    }}
                  />
                  {activeTab === "public" && browseFilterOpen ? (
                    <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-[0_0_22px_22px] border border-cyan-300/24 border-t-0 bg-slate-950 px-3 pb-3 pt-4 shadow-[0_24px_48px_rgba(2,6,23,0.48)] sm:px-4">
                      <CollectionFilterBar
                        aggregations={browseFilterAggregationsQuery.data}
                        isLoading={
                          browseFilterAggregationsQuery.isLoading ||
                          browseFilterAggregationsQuery.isFetching
                        }
                        selectedCategoryKeys={selectedBrowseCategoryKeys}
                        selectedSubTagKeys={selectedBrowseSubTagKeys}
                        onSelectCategory={(key) =>
                          setBrowseCategoryKey((current) =>
                            current === key ? null : key,
                          )
                        }
                        onSelectSubTag={(key) =>
                          setBrowseSubTagKey((current) =>
                            current === key ? null : key,
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 md:gap-3">
                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                  {sourceCountLabel ? (
                    <span
                      className="inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1.5 text-[11px] font-semibold text-cyan-100/90"
                      aria-label={sourceCountLabel}
                      title={sourceCountLabel}
                    >
                      {sourceCountLabel}
                    </span>
                  ) : null}
                  {toolbarMessage ? (
                    <div
                      className={`min-w-0 truncate rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        toolbarMessageTone === "error"
                          ? "border-rose-300/18 bg-rose-500/10 text-rose-100"
                          : toolbarMessageTone === "cooldown"
                            ? "border-amber-200/18 bg-amber-300/10 text-amber-50"
                            : "border-cyan-200/18 bg-cyan-200/10 text-cyan-50"
                      }`}
                    >
                      {toolbarMessage}
                    </div>
                  ) : null}
                </div>

                <div className="inline-flex shrink-0 rounded-full border border-white/10 bg-slate-950/42 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`inline-flex h-8 w-9 items-center justify-center rounded-full transition ${
                      viewMode === "grid"
                        ? "bg-cyan-200/14 text-cyan-50"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <GridViewRoundedIcon sx={{ fontSize: 18 }} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`inline-flex h-8 w-9 items-center justify-center rounded-full transition ${
                      viewMode === "list"
                        ? "bg-cyan-200/14 text-cyan-50"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <ViewAgendaRoundedIcon sx={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <main className="min-h-0 flex-1 overflow-hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pb-4">
          {renderMainContent()}
        </main>
      </div>
    </Drawer>
  );
};

export default RoomPlaylistSelectorDrawer;
