import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Slider,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ViewAgendaRoundedIcon from "@mui/icons-material/ViewAgendaRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import { List as VirtualList, type RowComponentProps } from "react-window";

import type { CollectionEntry } from "../../model/RoomCollectionsContext";
import type {
  PlaylistItem,
  PlaylistSourceType,
  PlaylistSuggestion,
} from "../../model/types";
import type { YoutubePlaylist } from "../../model/RoomContext";
import { formatDurationLabel } from "../roomsHub/roomsHubViewModels";
import { normalizeDisplayText } from "./roomLobbyPanelUtils";

type SelectorTab = "suggestions" | "public" | "mine" | "youtube" | "link";
type ToolDateMode = "all" | "7d" | "30d";
type ToolPlayMode = "all" | "recent" | "quiet";
type BrowseViewMode = "grid" | "list";
type CollectionRowProps = {
  items: CollectionEntry[];
  render: (item: CollectionEntry, index: number) => React.ReactNode;
  columns: number;
};
type YoutubeRowProps = {
  items: YoutubePlaylist[];
  render: (item: YoutubePlaylist, index: number) => React.ReactNode;
  columns: number;
};
type GenericRowProps<T> = {
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
};

type Props = {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  isGoogleAuthed: boolean;
  playlistUrl: string;
  playlistItemsForChange: PlaylistItem[];
  playlistError?: string | null;
  playlistLoading: boolean;
  playlistSuggestions: PlaylistSuggestion[];
  collections: CollectionEntry[];
  collectionsLoading: boolean;
  collectionsLoadingMore: boolean;
  collectionsHasMore: boolean;
  collectionsError?: string | null;
  collectionItemsLoading: boolean;
  collectionItemsError: string | null;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  onPlaylistUrlChange: (value: string) => void;
  onPreviewPlaylistUrl: (url: string) => void;
  onApplyPlaylistUrlDirect: (url: string) => Promise<boolean>;
  onApplyCollectionDirect: (
    collectionId: string,
    title?: string | null,
  ) => Promise<boolean>;
  onApplyYoutubePlaylistDirect: (
    playlistId: string,
    title?: string | null,
  ) => Promise<boolean>;
  onApplySuggestionSnapshot: (suggestion: PlaylistSuggestion) => Promise<void>;
  onFetchCollections: (
    scope?: "owner" | "public",
    options?: { query?: string },
  ) => void;
  onLoadMoreCollections: () => void;
  onFetchYoutubePlaylists: (force?: boolean) => void;
  onRequestGoogleLogin: () => void;
  onMarkSuggestionsSeen: () => void;
  onRecordSourceApplied: (entry: {
    sourceType: PlaylistSourceType;
    title: string;
    sourceId?: string | null;
    url?: string | null;
    thumbnailUrl?: string | null;
    itemCount?: number | null;
  }) => void;
};

const FILTER_TAGS = ["動畫", "日文", "OP", "多人", "派對"];
const MODAL_W = 1180;
const MODAL_H = 820;
const GRID_H = 356;
const LIST_H = 132;
const SUGGESTION_H = 116;
const PREVIEW_H = 80;

const sourceType = (visibility?: "private" | "public") =>
  visibility === "private" ? "private_collection" : "public_collection";

const questionChip = (min: number, max: number) =>
  max >= 500 ? `題數 ${min}-500+` : `題數 ${min}-${max}`;

const previewCount = (count: number | null | undefined) => {
  const n = Math.max(0, Number(count ?? 0));
  return n > 500 ? "500+ 題" : `${n} 題`;
};

const GridCollectionRow = ({
  index,
  style,
  items,
  render,
  columns,
}: RowComponentProps<CollectionRowProps>) => {
  const start = index * columns;
  return (
    <div style={style} className="pb-4">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items
          .slice(start, start + columns)
          .map((item, offset) => render(item, start + offset))}
      </div>
    </div>
  );
};

const GridYoutubeRow = ({
  index,
  style,
  items,
  render,
  columns,
}: RowComponentProps<YoutubeRowProps>) => {
  const start = index * columns;
  return (
    <div style={style} className="pb-4">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items
          .slice(start, start + columns)
          .map((item, offset) => render(item, start + offset))}
      </div>
    </div>
  );
};

const GenericRow = <T,>({
  index,
  style,
  items,
  render,
}: RowComponentProps<GenericRowProps<T>>) => (
  <div style={style} className="pb-3">
    {render(items[index], index)}
  </div>
);

const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
    <div className="text-base font-semibold text-slate-100">{title}</div>
    <div className="mt-2 max-w-[520px] text-sm leading-6 text-slate-300/74">
      {description}
    </div>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

const Metrics = ({
  itemCount,
  useCount,
  favoriteCount,
}: {
  itemCount?: number | null;
  useCount?: number | null;
  favoriteCount?: number | null;
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-slate-200/92">
      <QuizRoundedIcon sx={{ fontSize: 17, color: "rgba(103,232,249,0.94)" }} />
      <span>{Math.max(0, Number(itemCount ?? 0))}</span>
    </span>
    {useCount !== undefined ? (
      <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-slate-200/92">
        <BarChartRoundedIcon
          sx={{ fontSize: 18, color: "rgba(125,211,252,0.92)" }}
        />
        <span>{Math.max(0, Number(useCount ?? 0))}</span>
      </span>
    ) : null}
    {favoriteCount !== undefined ? (
      <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-slate-200/92">
        <StarBorderRoundedIcon
          sx={{ fontSize: 17, color: "rgba(250,204,21,0.92)" }}
        />
        <span>{Math.max(0, Number(favoriteCount ?? 0))}</span>
      </span>
    ) : null}
  </div>
);

const SourceCard = ({
  title,
  subtitle,
  thumbnailUrl,
  badge,
  mode,
  metrics,
  disabled,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  badge?: string | null;
  mode: BrowseViewMode;
  metrics: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) => {
  const list = mode === "list";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        list
          ? "flex h-[120px] w-full items-center gap-4 overflow-hidden rounded-[24px] border border-cyan-300/18 bg-[#060b16] px-3 py-3 text-left transition hover:border-cyan-300/36 hover:bg-[#08101e] disabled:cursor-not-allowed disabled:opacity-55"
          : "group flex h-[340px] w-full flex-col overflow-hidden rounded-[24px] border border-cyan-300/18 bg-[#060b16] text-left transition hover:border-cyan-300/36 hover:bg-[#08101e] hover:shadow-[0_24px_50px_-32px_rgba(34,211,238,0.36)] disabled:cursor-not-allowed disabled:opacity-55"
      }
    >
      <div
        className={
          list
            ? "relative h-[94px] w-[156px] shrink-0 overflow-hidden rounded-[18px] bg-slate-950/70"
            : "relative aspect-[16/9] w-full overflow-hidden bg-slate-950/70"
        }
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.18),transparent_42%),linear-gradient(180deg,rgba(30,41,59,0.86),rgba(15,23,42,0.96))] text-cyan-100">
            <LibraryMusicRoundedIcon sx={{ fontSize: list ? 28 : 34 }} />
          </div>
        )}
        {badge ? (
          <span className="absolute left-3 top-3 rounded-full border border-white/12 bg-slate-950/78 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
            {badge}
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#060b16]/92 via-[#060b16]/46 to-transparent" />
      </div>
      <div
        className={
          list
            ? "flex min-w-0 flex-1 flex-col justify-between py-1"
            : "flex min-h-0 flex-1 flex-col justify-between px-4 pb-4 pt-3"
        }
      >
        <div className="space-y-1.5">
          <div className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-50">
            {title}
          </div>
          {subtitle ? (
            <div className="line-clamp-1 text-[13px] text-slate-300/78">
              {subtitle}
            </div>
          ) : null}
        </div>
        {metrics}
      </div>
    </button>
  );
};

const PlaylistSelectorModal = ({
  open,
  onClose,
  isHost,
  isGoogleAuthed,
  playlistUrl,
  playlistItemsForChange,
  playlistError,
  playlistLoading,
  playlistSuggestions,
  collections,
  collectionsLoading,
  collectionsLoadingMore,
  collectionsHasMore,
  collectionsError,
  collectionItemsLoading,
  collectionItemsError,
  youtubePlaylists,
  youtubePlaylistsLoading,
  youtubePlaylistsError,
  onPlaylistUrlChange,
  onPreviewPlaylistUrl,
  onApplyPlaylistUrlDirect,
  onApplyCollectionDirect,
  onApplyYoutubePlaylistDirect,
  onApplySuggestionSnapshot,
  onFetchCollections,
  onLoadMoreCollections,
  onFetchYoutubePlaylists,
  onRequestGoogleLogin,
  onMarkSuggestionsSeen,
  onRecordSourceApplied,
}: Props) => {
  const [activeTab, setActiveTab] = useState<SelectorTab>("suggestions");
  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<BrowseViewMode>("grid");
  const [toolAnchorEl, setToolAnchorEl] = useState<HTMLButtonElement | null>(
    null,
  );
  const [questionRange, setQuestionRange] = useState<number[]>([5, 500]);
  const [createdWindow, setCreatedWindow] = useState<ToolDateMode>("all");
  const [playWindow, setPlayWindow] = useState<ToolPlayMode>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [aiEditedOnly, setAiEditedOnly] = useState(false);
  const oneCol = useMediaQuery("(max-width:900px)");
  const twoCol = useMediaQuery("(max-width:1260px)");
  const columns = oneCol ? 1 : twoCol ? 2 : 3;
  const viewportH = Math.max(280, MODAL_H - 260);

  useEffect(() => {
    if (open) onMarkSuggestionsSeen();
  }, [open, onMarkSuggestionsSeen]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(
      () => setDebouncedSearch(searchDraft.trim().toLowerCase()),
      240,
    );
    return () => window.clearTimeout(id);
  }, [open, searchDraft]);

  useEffect(() => {
    if (!open) return;
    if (activeTab === "public") onFetchCollections("public", { query: debouncedSearch });
    if (activeTab === "mine" && isGoogleAuthed) onFetchCollections("owner");
    if (activeTab === "youtube" && isGoogleAuthed) onFetchYoutubePlaylists();
  }, [
    activeTab,
    debouncedSearch,
    isGoogleAuthed,
    onFetchCollections,
    onFetchYoutubePlaylists,
    open,
  ]);

  const matchCount = useCallback(
    (value: number | null | undefined) => {
      const n = Math.max(0, Number(value ?? 0));
      return questionRange[1] >= 500
        ? n >= questionRange[0]
        : n >= questionRange[0] && n <= questionRange[1];
    },
    [questionRange],
  );

  const matchText = useCallback(
    (...parts: Array<string | null | undefined>) => {
      if (!debouncedSearch) return true;
      return parts.filter(Boolean).join(" ").toLowerCase().includes(debouncedSearch);
    },
    [debouncedSearch],
  );

  const ownerCollections = useMemo(
    () =>
      collections.filter(
        (item) =>
          matchCount(item.item_count) &&
          matchText(
            item.title,
            item.description,
            item.cover_title,
            item.cover_channel_title,
          ),
      ),
    [collections, matchCount, matchText],
  );

  const publicCollections = useMemo(
    () =>
      collections.filter(
        (item) =>
          matchCount(item.item_count) &&
          matchText(
            item.title,
            item.description,
            item.cover_title,
            item.cover_channel_title,
          ),
      ),
    [collections, matchCount, matchText],
  );

  const youtubeItems = useMemo(
    () =>
      youtubePlaylists.filter(
        (item) =>
          matchCount(item.itemCount) &&
          matchText(item.title, item.description ?? ""),
      ),
    [youtubePlaylists, matchCount, matchText],
  );

  const suggestions = useMemo(
    () =>
      playlistSuggestions.filter(
        (item) =>
          matchCount(item.totalCount) &&
          matchText(item.username, item.title, item.value),
      ),
    [playlistSuggestions, matchCount, matchText],
  );

  const chips = useMemo(
    () => [
      questionChip(questionRange[0], questionRange[1]),
      ...(createdWindow === "all"
        ? []
        : [createdWindow === "7d" ? "新增 7 天內" : "新增 30 天內"]),
      ...(playWindow === "all"
        ? []
        : [playWindow === "recent" ? "近期常用" : "較少使用"]),
      ...(selectedTags.length ? [`標籤 ${selectedTags.join(" / ")}`] : []),
      ...(aiEditedOnly ? ["僅顯示 AI 編輯過"] : []),
    ],
    [aiEditedOnly, createdWindow, playWindow, questionRange, selectedTags],
  );

  const applyCollection = useCallback(
    async (item: CollectionEntry) => {
      const ok = await onApplyCollectionDirect(item.id, item.title);
      if (!ok) return;
      onRecordSourceApplied({
        sourceType: sourceType(item.visibility),
        title: item.title,
        sourceId: item.id,
        thumbnailUrl: item.cover_thumbnail_url ?? null,
        itemCount: item.item_count ?? null,
      });
      onClose();
    },
    [onApplyCollectionDirect, onClose, onRecordSourceApplied],
  );

  const renderCollectionCard = useCallback(
    (item: CollectionEntry, mode: BrowseViewMode, badge?: string | null) => (
      <SourceCard
        key={item.id}
        title={normalizeDisplayText(item.title, "未命名題庫")}
        subtitle={[
          normalizeDisplayText(item.cover_title, item.description ?? ""),
          item.cover_duration_sec ? formatDurationLabel(item.cover_duration_sec) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        thumbnailUrl={item.cover_thumbnail_url}
        badge={badge}
        mode={mode}
        disabled={collectionItemsLoading}
        metrics={
          <Metrics
            itemCount={item.item_count}
            useCount={item.use_count}
            favoriteCount={item.favorite_count}
          />
        }
        onClick={() => {
          void applyCollection(item);
        }}
      />
    ),
    [applyCollection, collectionItemsLoading],
  );

  const renderYoutubeCard = useCallback(
    (item: YoutubePlaylist, mode: BrowseViewMode) => (
      <SourceCard
        key={item.id}
        title={normalizeDisplayText(item.title, "未命名 YouTube 播放清單")}
        subtitle={item.description ?? null}
        thumbnailUrl={item.thumbnail ?? null}
        badge="YouTube"
        mode={mode}
        metrics={<Metrics itemCount={item.itemCount} />}
        onClick={() => {
          void (async () => {
            const ok = await onApplyYoutubePlaylistDirect(item.id, item.title);
            if (!ok) return;
            onRecordSourceApplied({
              sourceType: "youtube_google_import",
              title: item.title,
              sourceId: item.id,
              thumbnailUrl: item.thumbnail ?? null,
              itemCount: item.itemCount,
            });
            onClose();
          })();
        }}
      />
    ),
    [onApplyYoutubePlaylistDirect, onClose, onRecordSourceApplied],
  );

  const renderSuggestion = useCallback(
    (item: PlaylistSuggestion) => (
      <button
        key={`${item.clientId}-${item.suggestedAt}`}
        type="button"
        onClick={() => {
          void (async () => {
            if (item.items?.length) {
              await onApplySuggestionSnapshot(item);
              onClose();
              return;
            }
            if (item.type === "playlist") {
              const ok = await onApplyPlaylistUrlDirect(item.value);
              if (!ok) return;
              onRecordSourceApplied({
                sourceType: "youtube_pasted_link",
                title: item.title ?? item.value,
                sourceId: item.sourceId ?? null,
                url: item.value,
                itemCount: item.totalCount ?? null,
              });
              onClose();
              return;
            }
            const matched = collections.find((entry) => entry.id === item.value);
            const ok = await onApplyCollectionDirect(
              item.value,
              item.title ?? matched?.title ?? null,
            );
            if (!ok) return;
            onRecordSourceApplied({
              sourceType: sourceType(matched?.visibility),
              title: item.title ?? matched?.title ?? item.value,
              sourceId: item.value,
              thumbnailUrl: matched?.cover_thumbnail_url ?? null,
              itemCount: item.totalCount ?? matched?.item_count ?? null,
            });
            onClose();
          })();
        }}
        className="flex h-[108px] w-full items-center gap-4 rounded-[24px] border border-white/8 bg-[#060b16] px-4 text-left transition hover:border-cyan-300/34 hover:bg-[#08101e]"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-cyan-400/8 text-cyan-100">
          <TipsAndUpdatesRoundedIcon sx={{ fontSize: 24 }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-[15px] font-semibold text-slate-50">
            {normalizeDisplayText(
              item.title,
              item.type === "collection" ? "未命名題庫" : "未命名建議",
            )}
          </div>
          <div className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-300/78">
            {[
              `來自 ${item.username}`,
              item.totalCount ? `${Math.max(0, Number(item.totalCount))} 題` : null,
              item.type === "collection" ? "收藏庫建議" : "播放清單建議",
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </button>
    ),
    [
      collections,
      onApplyCollectionDirect,
      onApplyPlaylistUrlDirect,
      onApplySuggestionSnapshot,
      onClose,
      onRecordSourceApplied,
    ],
  );

  const renderPreview = useCallback(
    (item: PlaylistItem, index: number) => (
      <div
        key={`${item.videoId ?? item.url ?? index}`}
        className="flex h-[72px] items-center gap-3 rounded-[18px] border border-white/8 bg-[#060b16] px-3"
      >
        <div className="h-12 w-20 shrink-0 overflow-hidden rounded-[12px] bg-slate-900/70">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title ?? `歌曲 ${index + 1}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <LibraryMusicRoundedIcon sx={{ fontSize: 20 }} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-semibold text-slate-100">
            {normalizeDisplayText(item.title, `歌曲 ${index + 1}`)}
          </div>
          <div className="line-clamp-1 text-xs text-slate-400">
            {[item.uploader ?? null, item.duration ?? null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </div>
    ),
    [],
  );

  const renderCollectionViewport = (
    items: CollectionEntry[],
    badgeResolver?: (item: CollectionEntry) => string | null,
  ) =>
    viewMode === "grid" ? (
      <VirtualList<CollectionRowProps>
        style={{ height: viewportH, width: "100%" }}
        rowCount={Math.ceil(items.length / columns)}
        rowHeight={GRID_H}
        rowProps={{
          items,
          columns,
          render: (item) =>
            renderCollectionCard(
              item,
              "grid",
              badgeResolver ? badgeResolver(item) : undefined,
            ),
        }}
        rowComponent={GridCollectionRow as never}
      />
    ) : (
      <VirtualList<GenericRowProps<CollectionEntry>>
        style={{ height: viewportH, width: "100%" }}
        rowCount={items.length}
        rowHeight={LIST_H}
        rowProps={{
          items,
          render: (item) =>
            renderCollectionCard(
              item,
              "list",
              badgeResolver ? badgeResolver(item) : undefined,
            ),
        }}
        rowComponent={GenericRow as never}
      />
    );

  const renderYoutubeViewport = (items: YoutubePlaylist[]) =>
    viewMode === "grid" ? (
      <VirtualList<YoutubeRowProps>
        style={{ height: viewportH, width: "100%" }}
        rowCount={Math.ceil(items.length / columns)}
        rowHeight={GRID_H}
        rowProps={{
          items,
          columns,
          render: (item) => renderYoutubeCard(item, "grid"),
        }}
        rowComponent={GridYoutubeRow as never}
      />
    ) : (
      <VirtualList<GenericRowProps<YoutubePlaylist>>
        style={{ height: viewportH, width: "100%" }}
        rowCount={items.length}
        rowHeight={LIST_H}
        rowProps={{ items, render: (item) => renderYoutubeCard(item, "list") }}
        rowComponent={GenericRow as never}
      />
    );

  const content =
    activeTab === "suggestions" ? (
      !isHost ? (
        <EmptyState
          title="只有房主可以更換題庫"
          description="目前這個彈窗只開放房主切換題庫來源。"
        />
      ) : suggestions.length === 0 ? (
        <EmptyState
          title="目前沒有建議題庫"
          description="玩家提出題庫建議後，會顯示在這裡供房主快速套用。"
        />
      ) : (
        <VirtualList<GenericRowProps<PlaylistSuggestion>>
          style={{ height: viewportH, width: "100%" }}
          rowCount={suggestions.length}
          rowHeight={SUGGESTION_H}
          rowProps={{ items: suggestions, render: renderSuggestion }}
          rowComponent={GenericRow as never}
        />
      )
    ) : activeTab === "public" ? (
      collectionsLoading && publicCollections.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03]">
          <CircularProgress size={34} sx={{ color: "#67e8f9" }} />
        </div>
      ) : publicCollections.length === 0 ? (
        <EmptyState
          title="找不到公開收藏庫"
          description={
            collectionsError ??
            "目前沒有符合條件的公開收藏庫，可以調整搜尋或改用其他來源。"
          }
        />
      ) : (
        <div className="space-y-4">
          {renderCollectionViewport(publicCollections)}
          {collectionsHasMore ? (
            <div className="flex justify-center">
              <Button
                variant="outlined"
                color="inherit"
                disabled={collectionsLoadingMore}
                onClick={onLoadMoreCollections}
                className="!rounded-full !border-white/12 !px-5 !text-slate-100"
              >
                {collectionsLoadingMore ? "載入中..." : "載入更多"}
              </Button>
            </div>
          ) : null}
        </div>
      )
    ) : activeTab === "mine" ? (
      !isGoogleAuthed ? (
        <EmptyState
          title="登入後才能查看個人收藏庫"
          description="使用 Google 登入後，才能載入你擁有的收藏庫與 YouTube 播放清單。"
          action={
            <Button
              variant="contained"
              color="inherit"
              onClick={onRequestGoogleLogin}
            >
              前往登入 Google
            </Button>
          }
        />
      ) : collectionsLoading && ownerCollections.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03]">
          <CircularProgress size={34} sx={{ color: "#67e8f9" }} />
        </div>
      ) : ownerCollections.length === 0 ? (
        <EmptyState
          title="目前沒有可用的個人收藏庫"
          description={
            collectionsError ??
            "如果你已經建立收藏庫，請確認目前登入的帳號正確；公開與私人收藏都會顯示在這裡。"
          }
        />
      ) : (
        <div className="space-y-4">
          {renderCollectionViewport(ownerCollections, (item) =>
            item.visibility === "public" ? "公開" : "個人",
          )}
          {collectionsHasMore ? (
            <div className="flex justify-center">
              <Button
                variant="outlined"
                color="inherit"
                disabled={collectionsLoadingMore}
                onClick={onLoadMoreCollections}
                className="!rounded-full !border-white/12 !px-5 !text-slate-100"
              >
                {collectionsLoadingMore ? "載入中..." : "載入更多"}
              </Button>
            </div>
          ) : null}
        </div>
      )
    ) : activeTab === "youtube" ? (
      !isGoogleAuthed ? (
        <EmptyState
          title="登入後才能查看 YouTube 清單"
          description="使用 Google 登入後，就能直接匯入你帳號下的 YouTube 播放清單。"
          action={
            <Button
              variant="contained"
              color="inherit"
              onClick={onRequestGoogleLogin}
            >
              前往登入 Google
            </Button>
          }
        />
      ) : youtubePlaylistsLoading && youtubeItems.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03]">
          <CircularProgress size={34} sx={{ color: "#facc15" }} />
        </div>
      ) : youtubeItems.length === 0 ? (
        <EmptyState
          title="找不到 YouTube 播放清單"
          description={
            youtubePlaylistsError ??
            "目前沒有符合條件的 YouTube 播放清單，可以改用貼上連結匯入。"
          }
        />
      ) : (
        renderYoutubeViewport(youtubeItems)
      )
    ) : (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-sm font-semibold text-slate-100">
            貼上 YouTube 播放清單連結
          </div>
          <TextField
            fullWidth
            size="small"
            value={playlistUrl}
            onChange={(event) => onPlaylistUrlChange(event.target.value)}
            placeholder="https://www.youtube.com/playlist?list=..."
            className="mt-4"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outlined"
              color="inherit"
              disabled={!playlistUrl.trim() || playlistLoading}
              onClick={() => onPreviewPlaylistUrl(playlistUrl.trim())}
            >
              預覽
            </Button>
            <Button
              variant="contained"
              color="inherit"
              disabled={!playlistUrl.trim() || playlistLoading}
              onClick={() => {
                void (async () => {
                  const trimmed = playlistUrl.trim();
                  const ok = await onApplyPlaylistUrlDirect(trimmed);
                  if (!ok) return;
                  onRecordSourceApplied({
                    sourceType: "youtube_pasted_link",
                    title: trimmed,
                    url: trimmed,
                    itemCount: playlistItemsForChange.length || null,
                  });
                  onClose();
                })();
              }}
            >
              直接套用
            </Button>
          </div>
          {playlistError ? (
            <div className="mt-3 text-sm text-rose-300">{playlistError}</div>
          ) : null}
          {collectionItemsError ? (
            <div className="mt-2 text-sm text-rose-300">
              {collectionItemsError}
            </div>
          ) : null}
        </div>
        {playlistLoading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03]">
            <CircularProgress size={34} sx={{ color: "#67e8f9" }} />
          </div>
        ) : playlistItemsForChange.length > 0 ? (
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-100">預覽清單</div>
              <div className="text-xs text-slate-400">
                {previewCount(playlistItemsForChange.length)}
              </div>
            </div>
            <VirtualList<GenericRowProps<PlaylistItem>>
              style={{ height: Math.min(360, viewportH), width: "100%" }}
              rowCount={Math.min(playlistItemsForChange.length, 40)}
              rowHeight={PREVIEW_H}
              rowProps={{
                items: playlistItemsForChange.slice(0, 40),
                render: renderPreview,
              }}
              rowComponent={GenericRow as never}
            />
          </div>
        ) : (
          <EmptyState
            title="尚未預覽播放清單"
            description="貼上 YouTube 播放清單連結後，可以先預覽內容，再決定是否套用。"
          />
        )}
      </div>
    );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: `min(${MODAL_W}px, calc(100vw - 32px))`,
          maxWidth: `${MODAL_W}px`,
          height: `min(${MODAL_H}px, calc(100vh - 24px))`,
          maxHeight: `${MODAL_H}px`,
          borderRadius: "28px",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(58,66,87,0.98), rgba(52,60,81,0.98))",
          color: "#f8fafc",
          overflow: "hidden",
          boxShadow: "0 44px 140px -70px rgba(15,23,42,1)",
        },
      }}
    >
      <DialogTitle className="!p-0">
        <div className="border-b border-white/8 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <Typography className="!text-[2rem] !font-semibold !tracking-[-0.03em] !text-slate-50">
              更換題庫
            </Typography>
            <IconButton
              onClick={onClose}
              aria-label="關閉更換題庫"
              className="!text-slate-300"
            >
              <CloseRoundedIcon />
            </IconButton>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <TextField
              fullWidth
              size="small"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={
                activeTab === "link" ? "貼上 YouTube 播放清單連結" : "搜尋題庫"
              }
              disabled={activeTab === "link"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon
                      fontSize="small"
                      className="text-slate-400"
                    />
                  </InputAdornment>
                ),
              }}
              className="min-w-[240px] flex-1"
            />
            <Button
              variant="outlined"
              color="inherit"
              onClick={(event) =>
                setToolAnchorEl((current) =>
                  current ? null : (event.currentTarget as HTMLButtonElement),
                )
              }
              className="!min-h-[40px] !rounded-[14px] !border-white/12 !px-3 !text-slate-100"
              startIcon={<TuneRoundedIcon fontSize="small" />}
            >
              選項
            </Button>
            {activeTab === "public" ||
            activeTab === "mine" ||
            activeTab === "youtube" ? (
              <div className="inline-flex items-center gap-1 rounded-[14px] border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex items-center gap-1 rounded-[10px] px-3 py-2 text-xs ${
                    viewMode === "grid"
                      ? "bg-cyan-300/14 text-cyan-50"
                      : "text-slate-300"
                  }`}
                >
                  <GridViewRoundedIcon sx={{ fontSize: 16 }} />
                  <span>卡片</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1 rounded-[10px] px-3 py-2 text-xs ${
                    viewMode === "list"
                      ? "bg-cyan-300/14 text-cyan-50"
                      : "text-slate-300"
                  }`}
                >
                  <ViewAgendaRoundedIcon sx={{ fontSize: 16 }} />
                  <span>清單</span>
                </button>
              </div>
            ) : null}
          </div>
          <Popover
            open={Boolean(toolAnchorEl)}
            anchorEl={toolAnchorEl}
            onClose={() => setToolAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              className:
                "mt-2 w-[min(92vw,620px)] overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(45,53,73,0.98),rgba(40,48,68,0.98))] text-slate-50 shadow-[0_30px_80px_-50px_rgba(2,6,23,1)]",
            }}
          >
            <div className="max-h-[460px] overflow-y-auto p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[18px] border border-white/8 bg-black/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <LibraryMusicRoundedIcon sx={{ fontSize: 18 }} />
                    <span>題數範圍</span>
                  </div>
                  <div className="mt-3 px-2">
                    <Slider
                      value={questionRange}
                      min={5}
                      max={500}
                      step={5}
                      onChange={(_, value) => setQuestionRange(value as number[])}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) =>
                        value >= 500 ? "500+" : value
                      }
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    500 以上只在篩選顯示為 500+，收藏庫仍保留實際題數。
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/8 bg-black/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />
                    <span>新增時間</span>
                  </div>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={createdWindow}
                    onChange={(event) =>
                      setCreatedWindow(event.target.value as ToolDateMode)
                    }
                    className="mt-3"
                  >
                    <MenuItem value="all">不限</MenuItem>
                    <MenuItem value="7d">7 天內</MenuItem>
                    <MenuItem value="30d">30 天內</MenuItem>
                  </TextField>
                </div>
                <div className="rounded-[18px] border border-white/8 bg-black/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />
                    <span>遊玩次數</span>
                  </div>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={playWindow}
                    onChange={(event) =>
                      setPlayWindow(event.target.value as ToolPlayMode)
                    }
                    className="mt-3"
                  >
                    <MenuItem value="all">不限</MenuItem>
                    <MenuItem value="recent">近期常用</MenuItem>
                    <MenuItem value="quiet">較少使用</MenuItem>
                  </TextField>
                </div>
                <div className="rounded-[18px] border border-white/8 bg-black/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <SellRoundedIcon sx={{ fontSize: 18 }} />
                    <span>標籤</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FILTER_TAGS.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setSelectedTags((current) =>
                              active
                                ? current.filter((item) => item !== tag)
                                : [...current, tag],
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs ${
                            active
                              ? "border-cyan-300/30 bg-cyan-300/14 text-cyan-50"
                              : "border-white/10 bg-white/[0.02] text-slate-300"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-[18px] border border-white/8 bg-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />
                    <span>AI 編輯</span>
                  </div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={aiEditedOnly}
                        onChange={(_, checked) => setAiEditedOnly(checked)}
                      />
                    }
                    label="僅顯示 AI 編輯過"
                    className="!mr-0"
                    sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
                  />
                </div>
              </div>
            </div>
          </Popover>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              {
                key: "suggestions",
                label: "建議",
                icon: <TipsAndUpdatesRoundedIcon fontSize="small" />,
              },
              {
                key: "public",
                label: "公開",
                icon: <PublicRoundedIcon fontSize="small" />,
              },
              {
                key: "mine",
                label: "個人",
                icon: <BookmarkBorderRoundedIcon fontSize="small" />,
              },
              {
                key: "youtube",
                label: "YouTube",
                icon: <YouTubeIcon fontSize="small" />,
              },
              {
                key: "link",
                label: "連結",
                icon: <LinkRoundedIcon fontSize="small" />,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as SelectorTab)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                  activeTab === tab.key
                    ? "border-cyan-300/30 bg-cyan-300/14 text-cyan-50"
                    : "border-white/10 bg-white/[0.03] text-slate-300"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Chip
                key={chip}
                size="small"
                label={chip}
                sx={{
                  borderRadius: "999px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>
        </div>
      </DialogTitle>
      <DialogContent className="!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !p-5 sm:!p-6">
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(PlaylistSelectorModal);
