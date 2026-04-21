import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Slider,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ViewAgendaRoundedIcon from "@mui/icons-material/ViewAgendaRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import { List as VirtualList, type RowComponentProps } from "react-window";

import type { CollectionEntry } from "@features/CollectionContent";
import type {
  PlaylistItem,
  PlaylistSourceType,
  PlaylistSuggestion,
} from "@features/RoomSession";
import {
  buildPlaylistIssueSummary,
  getPlaylistIssueTotal,
  PlaylistIssueSummaryDialog,
  type PlaylistPreviewMeta,
  type YoutubePlaylist,
} from "@features/PlaylistSource";
import { YOUTUBE_PLAYLIST_MIN_ITEM_COUNT } from "@domain/room/constants";
import { formatDurationLabel } from "../lib/roomsHubViewModels";
import { normalizeDisplayText } from "./roomLobbyDisplayUtils";

type SelectorTab = "suggestions" | "public" | "mine" | "youtube" | "link";
type ToolDateMode = "all" | "7d" | "30d" | "earliest" | "latest";
type ToolPlayMode = "all" | "recent" | "least";
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
type SuggestionGroup = {
  key: string;
  representative: PlaylistSuggestion;
  count: number;
  usernames: string[];
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
  onApplySuggestionSnapshot: (suggestion: PlaylistSuggestion) => Promise<void>;
  onFetchCollections: (
    scope?: "owner" | "public",
    options?: { query?: string },
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
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  extractPlaylistId?: (url: string) => string | null;
  openConfirmModal?: (
    title: string,
    detail: string | undefined,
    action: () => void,
  ) => void;
  onMarkSuggestionsSeen: () => void;
  /** Tab to activate when the modal opens. Defaults to "public". */
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
};

const MODAL_W = 1180;
const MODAL_H = 820;
const GRID_H = 372;
const LIST_H = 132;
const SUGGESTION_H = 116;
const PREVIEW_H = 80;
const RECOMMENDATION_COOLDOWN_MS = 5000;
const VIEWPORT_SAFE_GAP = 14;

const sourceType = (visibility?: "private" | "public") =>
  visibility === "private" ? "private_collection" : "public_collection";

const questionChip = (min: number, max: number) =>
  min <= 5 && max >= 500
    ? "題數：全部"
    : max >= 500
      ? `題數：${min} 題以上`
      : `題數：${min} - ${max} 題`;

const createdTimeChip = (mode: ToolDateMode) =>
  mode === "7d"
    ? "時間：7 天內"
    : mode === "30d"
      ? "時間：30 天內"
      : mode === "earliest"
        ? "時間：最早建立"
        : mode === "latest"
          ? "時間：最新建立"
          : "時間：全部";

const playCountChip = (mode: ToolPlayMode) =>
  mode === "recent"
    ? "人數：最多人玩"
    : mode === "least"
      ? "人數：最少人玩"
      : "人數：全部";

const previewCount = (count: number | null | undefined) => {
  const n = Math.max(0, Number(count ?? 0));
  return n > 500 ? "500 題以上" : `${n} 題`;
};

const canPreviewPlaylistUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.searchParams.get("list"));
  } catch {
    return false;
  }
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
  <div className="flex h-full min-h-[320px] w-full flex-1 flex-col items-center justify-center px-6 text-center">
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
  onClick,
  disabled = false,
  actionText,
}: {
  title: string;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  badge?: React.ReactNode;
  mode: BrowseViewMode;
  metrics: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  actionText?: string | null;
}) => {
  const list = mode === "list";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        list
          ? `relative flex h-[120px] w-full items-center gap-4 overflow-hidden rounded-[24px] border px-3 py-3 text-left transition duration-200 ${
              disabled
                ? "cursor-not-allowed border-white/10 bg-[#080d17]/88 text-slate-500"
                : "border-cyan-300/18 bg-[#060b16] hover:border-cyan-300/36 hover:bg-[#08101e]"
            }`
          : `group relative flex h-[356px] w-full flex-col overflow-hidden rounded-[24px] border text-left transition duration-200 ${
              disabled
                ? "cursor-not-allowed border-white/10 bg-[#080d17]/88 text-slate-500"
                : "border-cyan-300/18 bg-[#060b16] hover:border-cyan-300/36 hover:bg-[#08101e] hover:shadow-[0_24px_50px_-32px_rgba(34,211,238,0.36)]"
            }`
      }
    >
      {disabled ? (
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(8,13,23,0.24),rgba(8,13,23,0.52))]" />
      ) : null}
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
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/12 bg-slate-950/78 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
            {badge}
          </span>
        ) : null}
        {actionText ? (
          <span
            className={`absolute z-[2] rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              disabled
                ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-white/10 bg-black/55 text-slate-100 shadow-[0_14px_34px_-22px_rgba(15,23,42,0.95)]"
                : "right-3 top-3 border-white/12 bg-white/10 text-slate-100"
            }`}
          >
            {actionText}
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
          <div
            className={`line-clamp-2 text-[15px] font-semibold leading-6 ${
              disabled ? "text-slate-300/80" : "text-slate-50"
            }`}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              className={`line-clamp-1 text-[13px] ${
                disabled ? "text-slate-400/70" : "text-slate-300/78"
              }`}
            >
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
  playlistPreviewMeta,
  playlistError,
  playlistLoading,
  playlistSuggestions,
  collections,
  collectionsLoading,
  collectionsLoadingMore,
  collectionsHasMore,
  collectionsError,
  collectionItemsError,
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
  openConfirmModal,
  onMarkSuggestionsSeen,
  initialTab = "public",
  onRecordSourceApplied,
  currentSourceType,
  currentSourceIds = [],
}: Props) => {
  const isSuggestionMode = !isHost;
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
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Optimistic tracker of what *this* user has just suggested, keyed by
  // `${type}:${sourceId||value}`. The authoritative source is still the
  // server-pushed `playlistSuggestions`, but that arrives with a roundtrip
  // of latency — during which the card the user clicked would otherwise
  // stay clickable and lack the "已推薦" mask. This set gives instant
  // visual feedback without waiting for the socket echo.
  const [optimisticSuggestedKeys, setOptimisticSuggestedKeys] = useState<
    Set<string>
  >(() => new Set());
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const [actionRunning, setActionRunning] = useState(false);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [playlistIssueDialogOpen, setPlaylistIssueDialogOpen] =
    useState(false);
  const lastAutoPreviewUrlRef = React.useRef("");
  const oneCol = useMediaQuery("(max-width:900px)");
  const twoCol = useMediaQuery("(max-width:1260px)");
  const columns = oneCol ? 1 : twoCol ? 2 : 3;
  const viewportH = Math.max(280, MODAL_H - 260);
  const viewportSafeH = Math.max(248, viewportH - VIEWPORT_SAFE_GAP);
  const modalInteractionLocked = actionRunning;
  const normalizedCurrentSourceIds = useMemo(
    () =>
      currentSourceIds
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    [currentSourceIds],
  );

  const isCooldownActive =
    typeof cooldownUntil === "number" && cooldownUntil > Date.now();
  const cooldownSeconds = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - cooldownNow) / 1000))
    : 0;
  const cooldownProgress = cooldownUntil
    ? Math.max(
        0,
        Math.min(
          100,
          ((cooldownUntil - cooldownNow) / RECOMMENDATION_COOLDOWN_MS) * 100,
        ),
      )
    : 0;

  useEffect(() => {
    // Mark suggestions as seen only when the modal is explicitly opened to the
    // "suggestions" tab (i.e. the host clicked the "推薦 N" chip). Opening via
    // the "更換題庫" button goes to "public" and should NOT dismiss the badge.
    if (open && initialTab === "suggestions") onMarkSuggestionsSeen();
  }, [open, initialTab, onMarkSuggestionsSeen]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
    setActionError(null);
    setActionNotice(null);
  }, [initialTab, open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(
      () => setDebouncedSearch(searchDraft.trim().toLowerCase()),
      240,
    );
    return () => window.clearTimeout(id);
  }, [open, searchDraft]);

  useEffect(() => {
    if (!cooldownUntil) return;
    // Align wakeups to the next second boundary. setTimeout chain beats
    // setInterval on mobile: no drift when the tab is backgrounded, and we
    // only re-render once per visible-seconds change.
    let tick: number | null = null;
    const scheduleNextTick = () => {
      const now = Date.now();
      const untilNextSecond = 1000 - (now % 1000);
      tick = window.setTimeout(() => {
        setCooldownNow(Date.now());
        scheduleNextTick();
      }, untilNextSecond);
    };
    scheduleNextTick();
    const timer = window.setTimeout(() => {
      setCooldownUntil(null);
      setActionNotice(null);
    }, Math.max(0, cooldownUntil - Date.now()));
    return () => {
      if (tick !== null) window.clearTimeout(tick);
      window.clearTimeout(timer);
    };
  }, [cooldownUntil]);

  // Auto-dismiss transient action notices so the cooldown countdown can
  // reclaim the banner after ~2.5s. Errors stick around until the next
  // interaction (they set actionError, which isn't affected here).
  useEffect(() => {
    if (!actionNotice) return;
    const timerId = window.setTimeout(() => {
      setActionNotice(null);
    }, 2500);
    return () => window.clearTimeout(timerId);
  }, [actionNotice]);

  useEffect(() => {
    if (!open || activeTab !== "link") return;
    const trimmed = playlistUrl.trim();
    if (
      !canPreviewPlaylistUrl(trimmed) ||
      trimmed === lastAutoPreviewUrlRef.current
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      lastAutoPreviewUrlRef.current = trimmed;
      onPreviewPlaylistUrl(trimmed);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeTab, onPreviewPlaylistUrl, open, playlistUrl]);

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

  const createdAfterThreshold = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    if (createdWindow === "7d") return now - 7 * 24 * 60 * 60;
    if (createdWindow === "30d") return now - 30 * 24 * 60 * 60;
    return null;
  }, [createdWindow]);

  const collectionComparator = useCallback(
    (left: CollectionEntry, right: CollectionEntry) => {
      if (createdWindow === "earliest") {
        return (
          Math.max(0, Number(left.created_at ?? 0)) -
            Math.max(0, Number(right.created_at ?? 0)) ||
          Math.max(0, Number(left.use_count ?? 0)) -
            Math.max(0, Number(right.use_count ?? 0))
        );
      }
      if (createdWindow === "latest") {
        return (
          Math.max(0, Number(right.created_at ?? 0)) -
            Math.max(0, Number(left.created_at ?? 0)) ||
          Math.max(0, Number(right.use_count ?? 0)) -
            Math.max(0, Number(left.use_count ?? 0))
        );
      }
      if (playWindow === "recent") {
        return (
          Math.max(0, Number(right.use_count ?? 0)) -
            Math.max(0, Number(left.use_count ?? 0)) ||
          Math.max(0, Number(right.updated_at ?? 0)) -
            Math.max(0, Number(left.updated_at ?? 0))
        );
      }
      if (playWindow === "least") {
        return (
          Math.max(0, Number(left.use_count ?? 0)) -
            Math.max(0, Number(right.use_count ?? 0)) ||
          Math.max(0, Number(left.created_at ?? 0)) -
            Math.max(0, Number(right.created_at ?? 0))
        );
      }
      return 0;
    },
    [createdWindow, playWindow],
  );

  const filterAndSortCollections = useCallback(
    (items: CollectionEntry[]) =>
      [...items]
        .filter(
          (item) =>
            matchCount(item.item_count) &&
            matchText(
              item.title,
              item.description,
              item.cover_title,
              item.cover_channel_title,
            ) &&
            (createdAfterThreshold === null ||
              Math.max(0, Number(item.created_at ?? 0)) >=
                createdAfterThreshold)
        )
        .sort(collectionComparator),
    [
      collectionComparator,
      createdAfterThreshold,
      matchCount,
      matchText,
    ],
  );

  const ownerCollections = useMemo(
    () => filterAndSortCollections(collections),
    [collections, filterAndSortCollections],
  );

  const publicCollections = useMemo(
    () => filterAndSortCollections(collections),
    [collections, filterAndSortCollections],
  );

  const youtubeItems = useMemo(
    () =>
      youtubePlaylists.filter(
        (item) =>
          matchCount(item.itemCount) &&
          matchText(item.title, ""),
      ),
    [youtubePlaylists, matchCount, matchText],
  );

  const suggestions = useMemo(
    () =>
      playlistSuggestions.filter(
        (item) =>
          (typeof item.totalCount !== "number" || matchCount(item.totalCount)) &&
          matchText(item.username, item.title, item.value),
      ),
    [playlistSuggestions, matchCount, matchText],
  );

  // Group duplicate suggestions so that when multiple players recommend the
  // same collection/playlist, the host sees one card with a "×N" count badge
  // instead of N separate cards. Keyed by `${type}:${sourceId ?? value}`.
  // The representative is the newest suggestion (latest suggestedAt), which
  // tends to carry the freshest snapshot (items/title).
  const groupedSuggestions = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        representative: PlaylistSuggestion;
        count: number;
        usernames: string[];
      }
    >();
    for (const item of suggestions) {
      const keySource = String(item.sourceId ?? item.value ?? "").trim();
      const key = `${item.type}:${keySource}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          representative: item,
          count: 1,
          usernames: [item.username],
        });
        continue;
      }
      existing.count += 1;
      if (!existing.usernames.includes(item.username)) {
        existing.usernames.push(item.username);
      }
      if (item.suggestedAt > existing.representative.suggestedAt) {
        existing.representative = item;
      }
    }
    return Array.from(map.values());
  }, [suggestions]);

  const hasSuggestedSource = useCallback(
    (
      type: "collection" | "playlist",
      value: string,
      sourceId?: string | null,
    ) => {
      const normalizedValue = String(value ?? "").trim();
      const normalizedSourceId = String(sourceId ?? "").trim();
      // Optimistic check first — covers the window between submit and the
      // server socket echo updating `playlistSuggestions`.
      if (normalizedSourceId &&
        optimisticSuggestedKeys.has(`${type}:${normalizedSourceId}`)) {
        return true;
      }
      if (normalizedValue &&
        optimisticSuggestedKeys.has(`${type}:${normalizedValue}`)) {
        return true;
      }
      return playlistSuggestions.some((suggestion) => {
        if (suggestion.type !== type) return false;
        const suggestionValue = String(suggestion.value ?? "").trim();
        const suggestionSourceId = String(suggestion.sourceId ?? "").trim();
        return Boolean(
          (normalizedSourceId &&
            (suggestionSourceId === normalizedSourceId ||
              suggestionValue === normalizedSourceId)) ||
            (normalizedValue &&
              (suggestionValue === normalizedValue ||
                suggestionSourceId === normalizedValue)),
        );
      });
    },
    [playlistSuggestions, optimisticSuggestedKeys],
  );

  const chips = useMemo(
    () => [
      questionChip(questionRange[0], questionRange[1]),
      createdTimeChip(createdWindow),
      playCountChip(playWindow),
    ],
    [createdWindow, playWindow, questionRange],
  );

  const matchesCurrentSource = useCallback(
    (
      sourceTypeValue?: PlaylistSourceType | null,
      ...candidateIds: Array<string | null | undefined>
    ) => {
      if (currentSourceType && sourceTypeValue && currentSourceType !== sourceTypeValue) {
        return false;
      }
      const normalizedCandidates = candidateIds
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      if (normalizedCandidates.length === 0) return false;
      return normalizedCandidates.some((candidate) =>
        normalizedCurrentSourceIds.includes(candidate),
      );
    },
    [currentSourceType, normalizedCurrentSourceIds],
  );

  const runSuggestion = useCallback(
    async (
      type: "collection" | "playlist",
      value: string,
      options?: {
        useSnapshot?: boolean;
        sourceId?: string | null;
        title?: string | null;
      },
    ) => {
      if (!onSuggestPlaylist) return;
      if (actionRunning) return;
      if (hasSuggestedSource(type, value, options?.sourceId)) {
        setActionError(null);
        setActionNotice("這個題庫已經推薦過了，請等下一局再推薦相同內容。");
        return;
      }
      if (isCooldownActive) {
        setActionNotice(
          `請在 ${Math.max(1, cooldownSeconds)} 秒後再推薦下一個題庫。`,
        );
        return;
      }
      setActionError(null);
      setActionRunning(true);
      setPendingActionKey(`suggest:${type}:${options?.sourceId ?? value}`);
      try {
        const result = await onSuggestPlaylist(type, value, options);
        if (!result?.ok) {
          setActionError(result?.error ?? "推薦題庫失敗。");
          return;
        }
        setCooldownUntil(Date.now() + RECOMMENDATION_COOLDOWN_MS);
        setCooldownNow(Date.now());
        setActionNotice("題庫推薦已送出。");
        // Optimistically mark this source as suggested so the card gets
        // the "已推薦" mask immediately, before the socket echo arrives.
        const normalizedValue = String(value ?? "").trim();
        const normalizedSourceId = String(options?.sourceId ?? "").trim();
        setOptimisticSuggestedKeys((prev) => {
          const next = new Set(prev);
          if (normalizedSourceId) next.add(`${type}:${normalizedSourceId}`);
          if (normalizedValue) next.add(`${type}:${normalizedValue}`);
          return next;
        });
      } finally {
        setActionRunning(false);
        setPendingActionKey(null);
      }
    },
    [
      actionRunning,
      cooldownSeconds,
      hasSuggestedSource,
      isCooldownActive,
      onSuggestPlaylist,
    ],
  );

  const applyCollection = useCallback(
    async (item: CollectionEntry) => {
      if (matchesCurrentSource(sourceType(item.visibility), item.id)) return;
      if (actionRunning) return;
      if (isSuggestionMode) {
        const action = () => {
          void runSuggestion("collection", item.id, {
            useSnapshot: item.visibility === "private",
            sourceId: item.id,
            title: item.title ?? null,
          });
        };
        if (openConfirmModal) {
          openConfirmModal(
            "要推薦這個題庫嗎？",
            normalizeDisplayText(item.title, "未命名題庫"),
            action,
          );
        } else {
          action();
        }
        return;
      }
      setActionRunning(true);
      setPendingActionKey(`collection:${item.id}`);
      try {
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
      } finally {
        setActionRunning(false);
        setPendingActionKey(null);
      }
    },
    [
      actionRunning,
      isSuggestionMode,
      matchesCurrentSource,
      onApplyCollectionDirect,
      onClose,
      onRecordSourceApplied,
      openConfirmModal,
      runSuggestion,
    ],
  );

  const renderCollectionCard = useCallback(
    (item: CollectionEntry, mode: BrowseViewMode, badge?: React.ReactNode) => {
      const isCurrent = matchesCurrentSource(sourceType(item.visibility), item.id);
      const alreadySuggested =
        isSuggestionMode && hasSuggestedSource("collection", item.id, item.id);
      return (
        <SourceCard
          key={item.id}
          title={normalizeDisplayText(item.title, "未命名題庫")}
          subtitle={[
            normalizeDisplayText(item.cover_title, item.description ?? ""),
            item.cover_duration_sec ? formatDurationLabel(item.cover_duration_sec) : null,
          ]
            .filter(Boolean)
            .join(" 繚 ")}
          thumbnailUrl={item.cover_thumbnail_url}
          badge={badge}
          mode={mode}
          disabled={isCurrent || alreadySuggested}
          actionText={isCurrent ? "已套用" : alreadySuggested ? "已推薦" : null}
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
      );
    },
    [applyCollection, hasSuggestedSource, isSuggestionMode, matchesCurrentSource],
  );

  const renderYoutubeCard = useCallback(
    (item: YoutubePlaylist, mode: BrowseViewMode) => {
      const isCurrent = matchesCurrentSource("youtube_google_import", item.id);
      const alreadySuggested =
        isSuggestionMode && hasSuggestedSource("playlist", item.id, item.id);
      const isTooSmall = item.itemCount < YOUTUBE_PLAYLIST_MIN_ITEM_COUNT;
      const disabledReason = isTooSmall
        ? `低於 ${YOUTUBE_PLAYLIST_MIN_ITEM_COUNT} 題，不能用於題庫`
        : null;
      return (
      <SourceCard
        key={item.id}
        title={normalizeDisplayText(item.title, "未命名 YouTube 播放清單")}
        subtitle={disabledReason}
        thumbnailUrl={item.thumbnail ?? null}
        badge="YouTube"
        mode={mode}
        disabled={isCurrent || alreadySuggested || isTooSmall}
        actionText={
          isCurrent
            ? "已套用"
            : alreadySuggested
              ? "已推薦"
              : disabledReason
        }
        metrics={<Metrics itemCount={item.itemCount} />}
        onClick={() => {
          void (async () => {
            if (isTooSmall) return;
            if (isCurrent) return;
            if (actionRunning) return;
            if (isSuggestionMode) {
              const action = () => {
                void runSuggestion("playlist", item.id, {
                  useSnapshot: true,
                  sourceId: item.id,
                  title: item.title ?? null,
                });
              };
              if (openConfirmModal) {
                openConfirmModal(
                  "要推薦這份 YouTube 播放清單嗎？",
                  `${normalizeDisplayText(item.title, "未命名 YouTube 播放清單")} (${item.itemCount})`,
                  action,
                );
              } else {
                action();
              }
              return;
            }
            setActionRunning(true);
            setPendingActionKey(`youtube:${item.id}`);
            try {
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
            } finally {
              setActionRunning(false);
              setPendingActionKey(null);
            }
          })();
        }}
      />
      );
    },
    [
      actionRunning,
      hasSuggestedSource,
      isSuggestionMode,
      matchesCurrentSource,
      onApplyYoutubePlaylistDirect,
      onClose,
      onRecordSourceApplied,
      openConfirmModal,
      runSuggestion,
    ],
  );

  const renderSuggestion = useCallback(
    (group: {
      key: string;
      representative: PlaylistSuggestion;
      count: number;
      usernames: string[];
    }) => {
      const item = group.representative;
      const matchedCollection = collections.find((entry) => entry.id === item.value);
      const suggestionThumbnailUrl =
        item.type === "collection"
          ? matchedCollection?.cover_thumbnail_url ?? null
          : item.items?.[0]?.thumbnail ?? null;
      const suggestionSourceType =
        item.type === "collection"
          ? sourceType(matchedCollection?.visibility)
          : currentSourceType ?? "youtube_pasted_link";
      const isCurrent = matchesCurrentSource(
        suggestionSourceType,
        item.sourceId ?? item.value,
      );
      return (
        <button
        key={group.key}
        type="button"
        disabled={isCurrent}
        onClick={() => {
          void (async () => {
            if (isCurrent) return;
            if (actionRunning) return;
            if (item.items?.length) {
              setActionRunning(true);
              setPendingActionKey(`suggestion:${item.clientId}:${item.suggestedAt}`);
              try {
                await onApplySuggestionSnapshot(item);
                onClose();
              } finally {
                setActionRunning(false);
                setPendingActionKey(null);
              }
              return;
            }
            if (item.type === "playlist") {
              setActionRunning(true);
              setPendingActionKey(`suggestion:${item.clientId}:${item.suggestedAt}`);
              try {
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
              } finally {
                setActionRunning(false);
                setPendingActionKey(null);
              }
              return;
            }
            setActionRunning(true);
            setPendingActionKey(`suggestion:${item.clientId}:${item.suggestedAt}`);
            try {
              const ok = await onApplyCollectionDirect(
                item.value,
                item.title ?? matchedCollection?.title ?? null,
              );
              if (!ok) return;
              onRecordSourceApplied({
                sourceType: sourceType(matchedCollection?.visibility),
                title: item.title ?? matchedCollection?.title ?? item.value,
                sourceId: item.value,
                thumbnailUrl: matchedCollection?.cover_thumbnail_url ?? null,
                itemCount: item.totalCount ?? matchedCollection?.item_count ?? null,
              });
              onClose();
            } finally {
              setActionRunning(false);
              setPendingActionKey(null);
            }
          })();
        }}
        className={`relative flex h-[108px] w-full items-center gap-4 rounded-[24px] border px-4 text-left transition duration-200 ${
          isCurrent
            ? "cursor-not-allowed border-white/10 bg-[#080d17]/88 text-slate-500"
            : "border-white/8 bg-[#060b16] hover:border-cyan-300/34 hover:bg-[#08101e]"
        }`}
      >
        {isCurrent ? (
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(8,13,23,0.24),rgba(8,13,23,0.52))]" />
        ) : null}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-cyan-400/8 text-cyan-100">
          {suggestionThumbnailUrl ? (
            <img
              src={suggestionThumbnailUrl}
              alt={normalizeDisplayText(
                item.title,
                item.type === "collection" ? "未命名題庫" : "未命名推薦",
              )}
              className="h-full w-full object-cover"
            />
          ) : (
            <TipsAndUpdatesRoundedIcon sx={{ fontSize: 24 }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`line-clamp-1 text-[15px] font-semibold ${
              isCurrent ? "text-slate-300/80" : "text-slate-50"
            }`}
          >
            {normalizeDisplayText(
              item.title,
              item.type === "collection" ? "未命名題庫" : "未命名推薦",
            )}
          </div>
          <div
            className={`mt-1 line-clamp-2 text-[13px] leading-5 ${
              isCurrent ? "text-slate-400/70" : "text-slate-300/78"
            }`}
          >
            {[
              group.count > 1
                ? `推薦者 ${group.usernames.slice(0, 2).join("、")}${
                    group.usernames.length > 2 ? " 等" : ""
                  }`
                : `推薦者 ${item.username}`,
              item.totalCount ? `${Math.max(0, Number(item.totalCount))} 題` : null,
              item.type === "collection" ? "題庫推薦" : "播放清單推薦",
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-2">
          {group.count > 1 ? (
            <span
              className="rounded-full border border-cyan-300/30 bg-cyan-300/16 px-2.5 py-1 text-[11px] font-semibold text-cyan-50"
              title={`${group.count} 位玩家推薦了此題庫`}
            >
              ×{group.count}
            </span>
          ) : null}
          {isCurrent ? (
            <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
              已套用
            </span>
          ) : null}
        </div>
        </button>
      );
    },
    [
      actionRunning,
      currentSourceType,
      matchesCurrentSource,
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
              .join(" 繚 ")}
          </div>
        </div>
      </div>
    ),
    [],
  );

  const renderCollectionViewport = (
    items: CollectionEntry[],
    badgeResolver?: (item: CollectionEntry) => React.ReactNode,
  ) =>
    viewMode === "grid" ? (
      <div className="pr-3 pb-3">
        <VirtualList<CollectionRowProps>
          style={{ height: viewportSafeH, width: "100%" }}
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
      </div>
    ) : (
      <div className="pr-3 pb-3">
        <VirtualList<GenericRowProps<CollectionEntry>>
          style={{ height: viewportSafeH, width: "100%" }}
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
      </div>
    );

  const renderYoutubeViewport = (items: YoutubePlaylist[]) =>
    viewMode === "grid" ? (
      <div className="pr-3 pb-3">
        <VirtualList<YoutubeRowProps>
          style={{ height: viewportSafeH, width: "100%" }}
          rowCount={Math.ceil(items.length / columns)}
          rowHeight={GRID_H}
          rowProps={{
            items,
            columns,
            render: (item) => renderYoutubeCard(item, "grid"),
          }}
          rowComponent={GridYoutubeRow as never}
        />
      </div>
    ) : (
      <div className="pr-3 pb-3">
        <VirtualList<GenericRowProps<YoutubePlaylist>>
          style={{ height: viewportSafeH, width: "100%" }}
          rowCount={items.length}
          rowHeight={LIST_H}
          rowProps={{ items, render: (item) => renderYoutubeCard(item, "list") }}
          rowComponent={GenericRow as never}
        />
      </div>
    );

  const renderVisibilityBadge = (item: CollectionEntry) =>
    item.visibility === "public" ? (
      <>
        <PublicRoundedIcon sx={{ fontSize: 13 }} />
        <span>公開</span>
      </>
    ) : (
      <>
        <BookmarkBorderRoundedIcon sx={{ fontSize: 13 }} />
        <span>私人</span>
      </>
    );

  // Errors and transient notices show in the banner. Cooldown countdown is
  // now rendered as a full-modal overlay (see bottom of this component) so it
  // doesn't need to appear here as a banner as well.
  const statusBanner =
    actionError || actionNotice ? (
      <div
        className={`mb-4 overflow-hidden rounded-[18px] border px-4 py-3 text-sm ${
          actionError
            ? "border-rose-300/20 bg-rose-400/10 text-rose-100"
            : "border-cyan-300/20 bg-cyan-400/10 text-cyan-50"
        }`}
      >
        <div>{actionError ?? actionNotice}</div>
      </div>
    ) : null;

  const currentPlaylistIdFromUrl = playlistUrl.trim()
    ? extractPlaylistId?.(playlistUrl.trim()) ?? null
    : null;
  const linkAlreadySuggested =
    isSuggestionMode &&
    Boolean(playlistUrl.trim()) &&
    hasSuggestedSource("playlist", playlistUrl.trim(), currentPlaylistIdFromUrl);
  const linkAlreadyApplied = matchesCurrentSource(
    currentSourceType ?? "youtube_pasted_link",
    currentPlaylistIdFromUrl,
  );
  const trimmedPlaylistUrl = playlistUrl.trim();
  const playlistUrlLooksValid = canPreviewPlaylistUrl(trimmedPlaylistUrl);
  const linkHasPreview =
    playlistUrlLooksValid &&
    Boolean(playlistPreviewMeta) &&
    playlistItemsForChange.length > 0;
  const linkPreviewItems = linkHasPreview ? playlistItemsForChange : [];
  const linkPreviewLocked =
    activeTab === "link" &&
    ((playlistLoading && playlistUrlLooksValid) || linkHasPreview);
  const linkIssueSummary = useMemo(
    () => buildPlaylistIssueSummary(playlistPreviewMeta),
    [playlistPreviewMeta],
  );
  const linkIssueTotal = useMemo(
    () => getPlaylistIssueTotal(linkIssueSummary),
    [linkIssueSummary],
  );
  const showEmptyFrame =
    (activeTab === "suggestions" &&
      (!isHost || groupedSuggestions.length === 0)) ||
    (activeTab === "public" &&
      !collectionsLoading &&
      publicCollections.length === 0) ||
    (activeTab === "mine" &&
      (!isGoogleAuthed ||
        (!collectionsLoading && ownerCollections.length === 0))) ||
    (activeTab === "youtube" &&
      (!isGoogleAuthed ||
        (!youtubePlaylistsLoading && youtubeItems.length === 0))) ||
    (activeTab === "link" &&
      !playlistLoading &&
      linkPreviewItems.length === 0 &&
      !playlistUrl.trim());

  const content =
    activeTab === "suggestions" ? (
      !isHost ? (
        <EmptyState
          title="只有房主可以推薦題庫"
          description="目前只有房主可以查看與套用推薦題庫。"
        />
      ) : groupedSuggestions.length === 0 ? (
        <EmptyState
          title="目前沒有推薦題庫"
          description="暫時還沒有其他玩家推薦題庫，可以先搜尋公開題庫或改用其他來源。"
        />
      ) : (
        <div className="pr-3 pb-3">
          <VirtualList<GenericRowProps<SuggestionGroup>>
            style={{ height: viewportSafeH, width: "100%" }}
            rowCount={groupedSuggestions.length}
            rowHeight={SUGGESTION_H}
            rowProps={{ items: groupedSuggestions, render: renderSuggestion }}
            rowComponent={GenericRow as never}
          />
        </div>
      )
    ) : activeTab === "public" ? (
      collectionsLoading && publicCollections.length === 0 ? (
        <div className="flex h-full min-h-[320px] w-full flex-1 items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03]">
          <CircularProgress size={34} sx={{ color: "#67e8f9" }} />
        </div>
      ) : publicCollections.length === 0 ? (
        <EmptyState
          title="找不到公開題庫"
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
          title="連線 Google 以查看私人題庫"
          description="完成 Google 連線後，就能瀏覽自己的收藏庫與匯入來源。"
          action={
            <Button
              variant="contained"
              color="inherit"
              onClick={onRequestGoogleLogin}
            >
              連線 Google
            </Button>
          }
        />
      ) : collectionsLoading && ownerCollections.length === 0 ? (
        <div className="flex h-full min-h-[320px] w-full flex-1 items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03]">
          <CircularProgress size={34} sx={{ color: "#67e8f9" }} />
        </div>
      ) : ownerCollections.length === 0 ? (
        <EmptyState
          title="目前沒有你的題庫"
          description={
            collectionsError ??
            "你可以先建立自己的收藏庫，或切換到公開題庫、YouTube 清單與貼上連結匯入。"
          }
        />
      ) : (
        <div className="space-y-4">
          {renderCollectionViewport(ownerCollections, renderVisibilityBadge)}
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
          title="連線 Google 以查看 YouTube 清單"
          description="完成 Google 連線後，就能瀏覽自己的 YouTube 播放清單。"
          action={
            <Button
              variant="contained"
              color="inherit"
              onClick={onRequestGoogleLogin}
            >
              連線 Google
            </Button>
          }
        />
      ) : youtubePlaylistsLoading && youtubeItems.length === 0 ? (
        <div className="flex h-full min-h-[320px] w-full flex-1 items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03]">
          <CircularProgress size={34} sx={{ color: "#facc15" }} />
        </div>
      ) : youtubeItems.length === 0 ? (
        <EmptyState
          title="目前沒有 YouTube 清單"
          description={
            youtubePlaylistsError ??
            "目前沒有符合條件的 YouTube 播放清單，可以改用貼上連結匯入。"
          }
        />
      ) : (
        renderYoutubeViewport(youtubeItems)
      )
    ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {statusBanner}
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-sm font-semibold text-slate-100">
            貼上 YouTube 播放清單連結
          </div>
          <TextField
            fullWidth
            size="small"
            value={playlistUrl}
            onChange={(event) => {
              if (linkPreviewLocked) return;
              onResetPlaylist();
              onPlaylistUrlChange(event.target.value);
              setActionError(null);
              lastAutoPreviewUrlRef.current = "";
            }}
            placeholder="https://www.youtube.com/playlist?list=..."
            className="mt-4"
            InputProps={{
              readOnly: linkPreviewLocked,
              endAdornment: playlistUrl.trim() ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="取消目前播放清單連結"
                    onClick={() => {
                      onResetPlaylist();
                      onPlaylistUrlChange("");
                      setActionError(null);
                      lastAutoPreviewUrlRef.current = "";
                    }}
                    className="!text-amber-100"
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="contained"
              color="inherit"
              disabled={
                !playlistUrl.trim() ||
                playlistLoading ||
                linkPreviewItems.length === 0 ||
                actionRunning ||
                linkAlreadyApplied ||
                linkAlreadySuggested
              }
              onClick={() => {
                void (async () => {
                  if (linkAlreadyApplied || linkAlreadySuggested) return;
                  if (actionRunning) return;
                  const trimmed = playlistUrl.trim();
                  if (isSuggestionMode) {
                    const playlistId = extractPlaylistId?.(trimmed);
                    if (!playlistId) {
                      setActionError("請輸入有效的 YouTube 播放清單 URL。");
                      return;
                    }
                    const action = () => {
                      void runSuggestion("playlist", trimmed, {
                        useSnapshot: false,
                        sourceId: playlistId,
                      });
                    };
                    if (openConfirmModal) {
                      openConfirmModal("要推薦這份播放清單嗎？", trimmed, action);
                    } else {
                      action();
                    }
                    return;
                  }
                  setActionRunning(true);
                  setPendingActionKey("link:apply");
                  try {
                    const ok = await onApplyPlaylistUrlDirect(trimmed);
                    if (!ok) return;
                    onRecordSourceApplied({
                      sourceType: "youtube_pasted_link",
                      title: trimmed,
                      url: trimmed,
                      itemCount: linkPreviewItems.length || null,
                    });
                    onResetPlaylist();
                    onPlaylistUrlChange("");
                    lastAutoPreviewUrlRef.current = "";
                    onClose();
                  } finally {
                    setActionRunning(false);
                    setPendingActionKey(null);
                  }
                })();
              }}
              className={`!transition-all !duration-200 ${
                pendingActionKey === "link:apply"
                  ? "!scale-[0.985] !bg-cyan-300/20 !text-cyan-50"
                  : ""
              }`}
            >
              {actionRunning
                ? isSuggestionMode
                  ? "推薦中..."
                  : "套用中..."
                : linkAlreadyApplied
                  ? "已套用"
                : linkAlreadySuggested
                  ? "已推薦"
                : isSuggestionMode
                  ? "推薦此清單"
                  : "套用此清單"}
            </Button>
          </div>
          {playlistUrl.trim() && !playlistUrlLooksValid ? (
            <div className="mt-3 text-sm text-amber-200">
              請貼上有效的 YouTube 播放清單連結。
            </div>
          ) : null}
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
          <div className="flex h-full min-h-[320px] w-full flex-1 items-center justify-center rounded-[24px] border border-white/8 bg-white/[0.03]">
            <CircularProgress size={34} sx={{ color: "#67e8f9" }} />
          </div>
        ) : linkPreviewItems.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-100">預覽清單</div>
              <div className="text-xs text-slate-400">
                {previewCount(linkPreviewItems.length)}
              </div>
            </div>
            <VirtualList<GenericRowProps<PlaylistItem>>
              style={{ height: viewportSafeH, width: "100%" }}
              rowCount={Math.min(linkPreviewItems.length, 40)}
              rowHeight={PREVIEW_H}
              rowProps={{
                items: linkPreviewItems.slice(0, 40),
                render: renderPreview,
              }}
              rowComponent={GenericRow as never}
            />
            {linkIssueTotal > 0 ? (
              <button
                type="button"
                onClick={() => setPlaylistIssueDialogOpen(true)}
                className="mt-4 flex w-full cursor-pointer items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-left text-xs text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/15"
              >
                <span className="font-semibold">未成功匯入原因</span>
                <span>{linkIssueTotal} 首，查看明細</span>
              </button>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="貼上連結後可預覽清單"
            description="貼上 YouTube 播放清單連結後，會先顯示可匯入的曲目預覽。"
          />
        )}
      </div>
    );

  const selectorTabs = [
    ...(!isSuggestionMode
      ? [
          {
            key: "suggestions" as const,
            label: "推薦",
            icon: <TipsAndUpdatesRoundedIcon fontSize="small" />,
          },
        ]
      : []),
    {
      key: "public" as const,
      label: "公開",
      icon: <PublicRoundedIcon fontSize="small" />,
    },
    {
      key: "mine" as const,
      label: "私人",
      icon: <BookmarkBorderRoundedIcon fontSize="small" />,
    },
    {
      key: "youtube" as const,
      label: "YouTube",
      icon: <YouTubeIcon fontSize="small" />,
    },
    {
      key: "link" as const,
      label: "連結",
      icon: <LinkRoundedIcon fontSize="small" />,
    },
  ];
  const activeSelectorTab =
    selectorTabs.find((tab) => tab.key === activeTab) ?? selectorTabs[0];

  return (
    <>
      <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          position: "relative",
          width: `min(${MODAL_W}px, calc(100vw - 32px))`,
          maxWidth: `${MODAL_W}px`,
          height: oneCol
            ? `min(${MODAL_H}px, calc(100dvh - 96px))`
            : `min(${MODAL_H}px, calc(100vh - 24px))`,
          maxHeight: oneCol ? "calc(100dvh - 96px)" : `${MODAL_H}px`,
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
        <div className="border-b border-white/8 px-6 py-5 max-sm:px-6 max-sm:py-3.5">
          <div className="flex items-start justify-between gap-4">
            <Typography className="!text-[2rem] !font-semibold !tracking-[-0.03em] !text-slate-50 max-sm:!text-[1.75rem]">
              {isSuggestionMode ? "推薦題庫" : "更換題庫"}
            </Typography>
            <IconButton
              onClick={onClose}
              aria-label="關閉更換題庫"
              className="!text-slate-300"
            >
              <CloseRoundedIcon />
            </IconButton>
          </div>
          <div className="mt-5 flex flex-wrap items-stretch gap-3 max-sm:mt-3 max-sm:flex-row max-sm:flex-nowrap max-sm:gap-2">
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
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={(event) =>
                        setToolAnchorEl((current) =>
                          current ? null : (event.currentTarget as HTMLButtonElement),
                        )
                      }
                      edge="end"
                      aria-label="篩選工具"
                      className="!mr-0 !rounded-[12px] !text-slate-300"
                      sx={{
                        width: oneCol ? 32 : 36,
                        height: oneCol ? 32 : 36,
                        backgroundColor: "rgba(255,255,255,0.035)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <TuneRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  height: oneCol ? 38 : 44,
                  borderRadius: oneCol ? "12px" : "14px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                },
              }}
              className="min-w-[240px] flex-1 max-sm:!min-w-0"
            />
            {activeTab === "public" ||
            activeTab === "mine" ||
            activeTab === "youtube" ? (
              <div className="inline-flex min-h-[44px] shrink-0 items-stretch gap-2 self-stretch max-sm:min-h-0">
                <div className="inline-flex h-full items-stretch gap-1 rounded-[14px] border border-white/10 bg-white/[0.03] p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-label="格狀檢視"
                    className={`inline-flex h-full min-h-[34px] items-center justify-center rounded-[10px] px-3 py-2 text-xs ${
                      viewMode === "grid"
                        ? "bg-cyan-300/14 text-cyan-50"
                        : "text-slate-300"
                    }`}
                  >
                    <GridViewRoundedIcon sx={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="列表檢視"
                    className={`inline-flex h-full min-h-[34px] items-center justify-center rounded-[10px] px-3 py-2 text-xs ${
                      viewMode === "list"
                        ? "bg-cyan-300/14 text-cyan-50"
                        : "text-slate-300"
                    }`}
                  >
                    <ViewAgendaRoundedIcon sx={{ fontSize: 16 }} />
                  </button>
                </div>
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
              sx: {
                width: oneCol ? "calc(100vw - 100px)" : "min(92vw, 620px)",
                maxWidth: oneCol ? "270px" : "620px",
                borderRadius: oneCol ? "16px" : "24px",
              },
            }}
          >
            <div
              className={`overflow-y-auto ${oneCol ? "max-h-[52vh] p-2.5" : "max-h-[460px] p-4"}`}
            >
              <div className={`grid lg:grid-cols-2 ${oneCol ? "gap-2.5" : "gap-4"}`}>
                <div
                  className={`border border-white/8 bg-black/10 lg:col-span-2 ${
                    oneCol ? "rounded-[14px] p-2.5" : "rounded-[18px] p-4"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <LibraryMusicRoundedIcon sx={{ fontSize: 18 }} />
                    <span>題數範圍</span>
                  </div>
                  <div className="mt-2 px-2">
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
                </div>
                <div
                  className={`border border-white/8 bg-black/10 ${
                    oneCol ? "rounded-[14px] p-2.5" : "rounded-[18px] p-4"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />
                    <span>建立時間</span>
                  </div>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={createdWindow}
                    onChange={(event) =>
                      setCreatedWindow(event.target.value as ToolDateMode)
                    }
                    className={oneCol ? "mt-2" : "mt-3"}
                  >
                    <MenuItem value="all">全部</MenuItem>
                    <MenuItem value="7d">7 天內</MenuItem>
                    <MenuItem value="30d">30 天內</MenuItem>
                    <MenuItem value="earliest">最早建立</MenuItem>
                    <MenuItem value="latest">最新建立</MenuItem>
                  </TextField>
                </div>
                <div
                  className={`border border-white/8 bg-black/10 ${
                    oneCol ? "rounded-[14px] p-2.5" : "rounded-[18px] p-4"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />
                    <span>最近遊玩</span>
                  </div>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={playWindow}
                    onChange={(event) =>
                      setPlayWindow(event.target.value as ToolPlayMode)
                    }
                    className={oneCol ? "mt-2" : "mt-3"}
                  >
                    <MenuItem value="all">全部</MenuItem>
                    <MenuItem value="recent">最多人玩</MenuItem>
                    <MenuItem value="least">最少人玩</MenuItem>
                  </TextField>
                </div>
              </div>
            </div>
          </Popover>
          {oneCol ? (
            <TextField
              select
              fullWidth
              size="small"
              value={activeSelectorTab.key}
              onChange={(event) => setActiveTab(event.target.value as SelectorTab)}
              className="mt-2"
              SelectProps={{
                renderValue: (value) => {
                  const tab =
                    selectorTabs.find((item) => item.key === value) ??
                    activeSelectorTab;
                  return (
                    <span className="inline-flex items-center gap-2">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </span>
                  );
                },
              }}
              sx={{
                "& .MuiInputBase-root": {
                  height: 38,
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.035)",
                  color: "#e2e8f0",
                },
              }}
            >
              {selectorTabs.map((tab) => (
                <MenuItem key={tab.key} value={tab.key}>
                  <span className="inline-flex items-center gap-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </span>
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectorTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
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
          )}
          {chips.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 max-sm:gap-1.5">
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
          ) : null}
        </div>
      </DialogTitle>
      <DialogContent className="!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !p-5 max-sm:!p-4 sm:!p-6">
        <div
          className={`flex min-h-0 flex-1 flex-col ${
            showEmptyFrame
              ? "rounded-[24px] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              : ""
          }`}
        >
          {content}
        </div>
      </DialogContent>
      {modalInteractionLocked ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[linear-gradient(180deg,rgba(8,12,22,0.08),rgba(8,12,22,0.18))] backdrop-blur-[1.5px]">
          <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(16,27,46,0.84),rgba(8,18,34,0.92))] px-4 py-2 text-sm font-semibold text-cyan-50 shadow-[0_22px_44px_-30px_rgba(34,211,238,0.65)]">
            <CircularProgress size={16} sx={{ color: "#a5f3fc" }} />
            <span>{isSuggestionMode ? "正在送出推薦..." : "正在套用題庫..."}</span>
          </div>
        </div>
      ) : null}
      {isSuggestionMode && isCooldownActive && !modalInteractionLocked ? (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-[linear-gradient(180deg,rgba(6,10,20,0.72),rgba(4,8,16,0.86))] backdrop-blur-[4px]"
          // Block pointer events on every element below. We keep the close (×)
          // button clickable by layering a second, smaller element above the
          // overlay — see the close IconButton, which has its own z-index.
          onClick={(event) => event.stopPropagation()}
        >
          <div className="pointer-events-auto relative flex max-w-[320px] flex-col items-center gap-5 rounded-[28px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(16,27,46,0.96),rgba(8,18,34,0.98))] px-8 py-7 text-center shadow-[0_44px_140px_-60px_rgba(34,211,238,0.55)]">
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-slate-100"
            >
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </button>
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg
                viewBox="0 0 120 120"
                className="absolute inset-0 h-full w-full -rotate-90"
                aria-hidden
              >
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(165,243,252,0.12)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(103,232,249,0.9)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={
                    2 * Math.PI * 54 * (1 - cooldownProgress / 100)
                  }
                  style={{ transition: "stroke-dashoffset 0.3s linear" }}
                />
              </svg>
              <span className="relative text-[44px] font-bold leading-none text-cyan-50 tabular-nums">
                {cooldownSeconds}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-lg font-semibold text-cyan-50">
                推薦冷卻中
              </div>
              <div className="text-sm leading-5 text-slate-300/90">
                剛才的推薦已送出，請稍候 {cooldownSeconds} 秒後再推薦下一個題庫。
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </Dialog>
      <PlaylistIssueSummaryDialog
        open={playlistIssueDialogOpen}
        onClose={() => setPlaylistIssueDialogOpen(false)}
        summary={linkIssueSummary}
        total={linkIssueTotal}
        description={`共 ${linkIssueTotal} 首未能匯入房間清單`}
      />
    </>
  );
};

export default React.memo(PlaylistSelectorModal);
