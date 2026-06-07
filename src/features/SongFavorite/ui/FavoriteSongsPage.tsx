import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AlbumRoundedIcon from "@mui/icons-material/AlbumRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import BookmarksRoundedIcon from "@mui/icons-material/BookmarksRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import ViewAgendaRoundedIcon from "@mui/icons-material/ViewAgendaRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { List, type RowComponentProps } from "react-window";

import { trackEvent } from "@shared/analytics/track";
import { useSongFavoriteList } from "../model/useSongFavoriteList";
import type {
  SongFavoriteRecord,
  SongFavoriteSortKey,
  SongFavoriteSortOrder,
} from "../model/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_HEIGHT = 98;
const OVERSCAN_COUNT = 5;
const BOTTOM_BAR_HEIGHT = 64;
// Bottom inset shrinks the virtualised list height so the page doesn't reach
// all the way down to the viewport edge. Desktop gets an extra 16px so the
// page feels less cramped against the footer / OS chrome.
const LIST_BOTTOM_INSET_MOBILE = 18;
const LIST_BOTTOM_INSET_DESKTOP = 34;
const DESKTOP_BREAKPOINT_PX = 640;
const LONG_PRESS_MS = 500;
const MAX_BATCH_DELETE_ITEMS = 100;

// Grid layout
const GRID_GAP_PX = 10;
const GRID_CONTENT_HEIGHT_PX = 60; // title (2 lines) + channel + padding
const GRID_ROW_PADDING_PX = 12;

const LAYOUT_STORAGE_KEY = "muizo_song_favorites_layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "songs" | "channels";
type Layout = "list" | "grid";

type ChannelGroup = {
  channelTitle: string;
  channelId: string | null;
  items: SongFavoriteRecord[];
  totalPlayCount: number;
};

type PendingDelete = { provider: "youtube"; sourceId: string }[];

type CommonRowProps = {
  isSelectMode: boolean;
  selectedKeys: ReadonlySet<string>;
  deletingKeys: ReadonlySet<string>;
  onToggleSelect: (key: string) => void;
  onRequestDelete: (provider: "youtube", sourceId: string) => void;
  onLongPress: (key: string) => void;
  onChannelClick: (item: SongFavoriteRecord) => void;
};

type FavoriteRowProps = CommonRowProps & {
  items: SongFavoriteRecord[];
};

type FavoriteGridRowProps = CommonRowProps & {
  items: SongFavoriteRecord[];
  itemsPerRow: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

type LoadedStats = {
  loadedCount: number;
  totalPlayCount: number;
  channelCount: number;
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const NUMBER_FORMATTER = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0,
});

const formatDate = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return DATE_FORMATTER.format(date);
};

const formatNumber = (value: number) => NUMBER_FORMATTER.format(value);

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const SORT_OPTIONS: {
  key: SongFavoriteSortKey;
  ariaLabel: string;
  descAriaLabel: string;
  ascAriaLabel: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "updatedAt",
    ariaLabel: "時間排序",
    descAriaLabel: "新到舊",
    ascAriaLabel: "舊到新",
    icon: <AccessTimeRoundedIcon sx={{ fontSize: 17 }} />,
  },
  {
    key: "playCount",
    ariaLabel: "收藏次數排序",
    descAriaLabel: "高到低",
    ascAriaLabel: "低到高",
    icon: <BookmarkRoundedIcon sx={{ fontSize: 17 }} />,
  },
];

const getDefaultSortOrder = (key: SongFavoriteSortKey): SongFavoriteSortOrder =>
  key === "updatedAt" ? "desc" : "desc";

const getFavoriteKey = (item: SongFavoriteRecord) =>
  `${item.provider}:${item.sourceId}`;

const getThumbnail = (item: SongFavoriteRecord) =>
  item.thumbnailUrl ||
  `https://i.ytimg.com/vi/${encodeURIComponent(item.sourceId)}/mqdefault.jpg`;

const getYoutubeUrl = (sourceId: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(sourceId)}`;

const getYoutubeChannelUrl = (channelId: string) =>
  `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`;

const getLoadedStats = (items: SongFavoriteRecord[]): LoadedStats => {
  let totalPlayCount = 0;
  const channels = new Set<string>();
  for (const item of items) {
    totalPlayCount += item.playCount;
    const channel = item.channelTitle?.trim();
    if (channel) channels.add(channel);
  }
  return { loadedCount: items.length, totalPlayCount, channelCount: channels.size };
};

// Compute how many cards fit per row in grid layout.
const computeItemsPerRow = (containerWidth: number): number => {
  if (containerWidth < 480) return 2;
  if (containerWidth < 768) return 3;
  if (containerWidth < 1024) return 4;
  return 5;
};

// Compute the height of one grid row given the available width.
// Card width = (container - gaps) / itemsPerRow; thumbnail = card × 9/16.
const computeGridRowHeight = (containerWidth: number, itemsPerRow: number): number => {
  if (itemsPerRow <= 0 || containerWidth <= 0) return 220;
  const totalGap = GRID_GAP_PX * (itemsPerRow - 1);
  const cardWidth = Math.max(40, Math.floor((containerWidth - totalGap) / itemsPerRow));
  const thumbnailH = Math.round((cardWidth * 9) / 16);
  return thumbnailH + GRID_CONTENT_HEIGHT_PX + GRID_ROW_PADDING_PX;
};

// Read persisted layout (defaults to grid for first-time visitors).
const readStoredLayout = (): Layout => {
  if (typeof window === "undefined") return "grid";
  try {
    const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    return stored === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

// ---------------------------------------------------------------------------
// SkeletonCard (list layout only — grid view skeleton is a div of the same shape)
// ---------------------------------------------------------------------------

const TITLE_WIDTHS = ["72%", "58%", "82%", "64%", "76%"] as const;
const META_WIDTHS = ["46%", "34%", "52%", "40%", "58%"] as const;

const SkeletonCard: React.FC<{ style?: React.CSSProperties; index?: number }> = ({
  style,
  index = 0,
}) => {
  const slot = index % TITLE_WIDTHS.length;
  return (
    <div style={style} className="py-1.5">
      <div className="relative h-[86px] overflow-hidden rounded-[18px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.82),rgba(8,7,5,0.94))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex h-full items-center gap-3">
          <div className="h-[58px] w-[104px] shrink-0 animate-pulse rounded-[14px] bg-white/8" />
          <div className="min-w-0 flex-1 space-y-3">
            <div
              className="h-3.5 animate-pulse rounded-full bg-white/10"
              style={{ width: TITLE_WIDTHS[slot] }}
            />
            <div
              className="h-2.5 animate-pulse rounded-full bg-white/7"
              style={{ width: META_WIDTHS[slot] }}
            />
          </div>
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/8" />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StatChip — compact pill, no inner icon frame
// ---------------------------------------------------------------------------

type StatChipProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  isActive?: boolean;
};

const StatChip: React.FC<StatChipProps> = ({ icon, label, value, onClick, isActive }) => {
  const className = [
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold leading-none transition duration-160",
    isActive
      ? "bg-amber-300/14 text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.24)]"
      : "border border-[var(--mc-border)] bg-black/22 text-[var(--mc-text-muted)]",
    onClick && !isActive
      ? "hover:border-amber-200/24 hover:bg-white/4 hover:text-[var(--mc-text)]"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className={isActive ? "text-amber-200" : "text-[var(--mc-text-muted)]"}>
        {icon}
      </span>
      <span aria-label={label}>{value}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-pressed={isActive}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
};

// ---------------------------------------------------------------------------
// SortControl
// ---------------------------------------------------------------------------

const SortControl: React.FC<{
  sortKey: SongFavoriteSortKey;
  sortOrder: SongFavoriteSortOrder;
  onChange: (key: SongFavoriteSortKey) => void;
}> = ({ sortKey, sortOrder, onChange }) => (
  <div className="flex min-w-0 items-center gap-1 rounded-[14px] border border-[var(--mc-border)] bg-black/18 p-1">
    {SORT_OPTIONS.map((option) => {
      const isActive = sortKey === option.key;
      const directionLabel =
        sortOrder === "desc" ? option.descAriaLabel : option.ascAriaLabel;
      const DirectionIcon =
        sortOrder === "desc" ? ArrowDownwardRoundedIcon : ArrowUpwardRoundedIcon;

      return (
        <Tooltip
          key={option.key}
          title={`${option.ariaLabel}：${isActive ? directionLabel : "點擊切換"}`}
          arrow
        >
          <button
            type="button"
            onClick={() => onChange(option.key)}
            className={[
              "inline-flex h-8 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold transition",
              isActive ? "w-12 gap-1.5" : "w-8",
              isActive
                ? "bg-amber-300/16 text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.24)]"
                : "text-[var(--mc-text-muted)] hover:bg-white/6 hover:text-[var(--mc-text)]",
            ].join(" ")}
            aria-pressed={isActive}
            aria-label={`${option.ariaLabel}，${isActive ? directionLabel : "點擊切換"}`}
          >
            {option.icon}
            {isActive && <DirectionIcon sx={{ fontSize: 14 }} />}
          </button>
        </Tooltip>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// LayoutControl — list/grid toggle (matches LibrarySourceToolbar pattern)
// ---------------------------------------------------------------------------

const LAYOUT_OPTIONS: {
  value: Layout;
  ariaLabel: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "grid",
    ariaLabel: "圖示檢視",
    icon: <GridViewRoundedIcon sx={{ fontSize: 17 }} />,
  },
  {
    value: "list",
    ariaLabel: "清單檢視",
    icon: <ViewAgendaRoundedIcon sx={{ fontSize: 17 }} />,
  },
];

const LayoutControl: React.FC<{
  layout: Layout;
  onChange: (next: Layout) => void;
}> = ({ layout, onChange }) => (
  <div className="flex min-w-0 items-center gap-1 rounded-[14px] border border-[var(--mc-border)] bg-black/18 p-1">
    {LAYOUT_OPTIONS.map((option) => {
      const isActive = layout === option.value;
      return (
        <Tooltip key={option.value} title={option.ariaLabel} arrow>
          <button
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            aria-label={option.ariaLabel}
            className={[
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] transition",
              isActive
                ? "bg-amber-300/16 text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.24)]"
                : "text-[var(--mc-text-muted)] hover:bg-white/6 hover:text-[var(--mc-text)]",
            ].join(" ")}
          >
            {option.icon}
          </button>
        </Tooltip>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// useFavoriteLongPress — shared pointer / long-press handler
// ---------------------------------------------------------------------------

function useFavoriteLongPress({
  onLongPress,
  enabled,
}: {
  onLongPress: () => void;
  enabled: boolean;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const handlers = useMemo(
    () => ({
      onPointerDown: (event: React.PointerEvent) => {
        if (!enabled) return;
        startRef.current = { x: event.clientX, y: event.clientY };
        timerRef.current = setTimeout(() => {
          onLongPress();
          timerRef.current = null;
          startRef.current = null;
        }, LONG_PRESS_MS);
      },
      onPointerMove: (event: React.PointerEvent) => {
        if (timerRef.current === null || !startRef.current) return;
        if (
          Math.abs(event.clientX - startRef.current.x) > 8 ||
          Math.abs(event.clientY - startRef.current.y) > 8
        ) {
          cancel();
        }
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
    }),
    [enabled, onLongPress, cancel],
  );

  return handlers;
}

// ---------------------------------------------------------------------------
// ChannelLink — clickable channel name with analytics tracking
// ---------------------------------------------------------------------------

type ChannelLinkProps = {
  item: SongFavoriteRecord;
  onChannelClick: (item: SongFavoriteRecord) => void;
  className?: string;
};

const ChannelLink: React.FC<ChannelLinkProps> = ({
  item,
  onChannelClick,
  className,
}) => {
  const label = item.channelTitle || "未知頻道";

  if (!item.channelId) {
    return <span className={className}>{label}</span>;
  }

  return (
    <a
      href={getYoutubeChannelUrl(item.channelId)}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => {
        event.stopPropagation();
        onChannelClick(item);
      }}
      className={[
        className ?? "",
        "transition hover:text-amber-100 hover:underline underline-offset-2",
      ].join(" ")}
      aria-label={`在 YouTube 開啟頻道 ${label}`}
    >
      {label}
    </a>
  );
};

// ---------------------------------------------------------------------------
// FavoriteRowContent — list-layout card body (shared with channel view rows)
// ---------------------------------------------------------------------------

function FavoriteRowContent({
  item,
  isSelectMode,
  isSelected,
  isDeleting,
  onToggleSelect,
  onRequestDelete,
  onLongPress,
  onChannelClick,
}: {
  item: SongFavoriteRecord;
  isSelectMode: boolean;
  isSelected: boolean;
  isDeleting: boolean;
  onToggleSelect: (key: string) => void;
  onRequestDelete: (provider: "youtube", sourceId: string) => void;
  onLongPress: (key: string) => void;
  onChannelClick: (item: SongFavoriteRecord) => void;
}): React.ReactElement {
  const key = getFavoriteKey(item);
  const longPressHandlers = useFavoriteLongPress({
    onLongPress: () => onLongPress(key),
    enabled: !isSelectMode,
  });

  return (
    <article
      className={[
        "group flex h-[86px] min-w-0 items-center gap-3 rounded-[18px] border px-2.5 py-2 transition duration-160",
        "bg-[linear-gradient(180deg,rgba(20,17,13,0.72),rgba(8,7,5,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]",
        isSelected
          ? "border-cyan-300/55 ring-1 ring-cyan-300/20"
          : "border-[var(--mc-border)] hover:border-amber-200/32 hover:bg-[linear-gradient(180deg,rgba(29,22,13,0.86),rgba(10,8,5,0.96))]",
        isDeleting ? "opacity-60" : "",
        isSelectMode ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ touchAction: "manipulation" }}
      onClick={isSelectMode ? () => onToggleSelect(key) : undefined}
      {...longPressHandlers}
      onContextMenu={(event) => event.preventDefault()}
    >
      <a
        href={getYoutubeUrl(item.sourceId)}
        target="_blank"
        rel="noreferrer"
        className="relative block h-[62px] w-[110px] shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-black/40"
        aria-label={`在 YouTube 開啟 ${item.title}`}
        onClick={isSelectMode ? (event) => event.preventDefault() : undefined}
      >
        <img
          src={getThumbnail(item)}
          alt=""
          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.025]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </a>

      <div className="min-w-0 flex-1">
        <a
          href={getYoutubeUrl(item.sourceId)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 text-[15px] font-semibold leading-tight text-[var(--mc-text)] transition hover:text-amber-100"
          onClick={isSelectMode ? (event) => event.preventDefault() : undefined}
        >
          <span className="truncate">{item.title}</span>
          <OpenInNewRoundedIcon
            sx={{ fontSize: 14 }}
            className="shrink-0 opacity-0 transition group-hover:opacity-55"
          />
        </a>

        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--mc-text-muted)]/74">
          <ChannelLink
            item={item}
            onChannelClick={onChannelClick}
            className="max-w-[48vw] truncate sm:max-w-[220px]"
          />
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-200/90">
            <BookmarkRoundedIcon sx={{ fontSize: 13 }} />
            {formatNumber(item.playCount)}
          </span>
          <span className="shrink-0">更新 {formatDate(item.updatedAt)}</span>
        </div>
      </div>

      {isSelectMode ? (
        <Checkbox
          size="small"
          checked={isSelected}
          onChange={() => onToggleSelect(key)}
          onClick={(event) => event.stopPropagation()}
          className="!p-0"
          inputProps={{ "aria-label": `選取 ${item.title}` }}
          sx={{
            color: "rgba(231,216,191,0.42)",
            "&.Mui-checked": { color: "#67e8f9" },
          }}
        />
      ) : (
        <Tooltip title="移除收藏" arrow placement="left">
          <span>
            <IconButton
              aria-label={`移除收藏：${item.title}`}
              disabled={isDeleting}
              onClick={(event) => {
                event.stopPropagation();
                onRequestDelete(item.provider, item.sourceId);
              }}
              size="small"
              className="!text-[var(--mc-text-muted)]/58 hover:!text-rose-300"
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// FavoriteRow — react-window wrapper around FavoriteRowContent
// ---------------------------------------------------------------------------

function FavoriteRow({
  ariaAttributes,
  index,
  style,
  items,
  selectedKeys,
  isSelectMode,
  deletingKeys,
  onToggleSelect,
  onRequestDelete,
  onLongPress,
  onChannelClick,
}: RowComponentProps<FavoriteRowProps>): React.ReactElement {
  const item = items[index];
  if (!item) return <SkeletonCard style={style} index={index} />;

  const key = getFavoriteKey(item);

  return (
    <div style={style} {...ariaAttributes} className="py-1.5">
      <FavoriteRowContent
        item={item}
        isSelectMode={isSelectMode}
        isSelected={selectedKeys.has(key)}
        isDeleting={deletingKeys.has(key)}
        onToggleSelect={onToggleSelect}
        onRequestDelete={onRequestDelete}
        onLongPress={onLongPress}
        onChannelClick={onChannelClick}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FavoriteGridCard — matrix-layout card (16:9 thumbnail, no crop)
// ---------------------------------------------------------------------------

function FavoriteGridCard({
  item,
  isSelectMode,
  isSelected,
  isDeleting,
  onToggleSelect,
  onRequestDelete,
  onLongPress,
  onChannelClick,
}: {
  item: SongFavoriteRecord;
  isSelectMode: boolean;
  isSelected: boolean;
  isDeleting: boolean;
  onToggleSelect: (key: string) => void;
  onRequestDelete: (provider: "youtube", sourceId: string) => void;
  onLongPress: (key: string) => void;
  onChannelClick: (item: SongFavoriteRecord) => void;
}): React.ReactElement {
  const key = getFavoriteKey(item);
  const longPressHandlers = useFavoriteLongPress({
    onLongPress: () => onLongPress(key),
    enabled: !isSelectMode,
  });

  return (
    <article
      className={[
        "group/card relative flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border transition duration-200",
        "bg-[linear-gradient(180deg,rgba(20,17,13,0.72),rgba(8,7,5,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]",
        isSelected
          ? "border-cyan-300/55 ring-1 ring-cyan-300/20"
          : "border-[var(--mc-border)] hover:border-amber-200/32 hover:shadow-[0_18px_38px_-22px_rgba(252,211,77,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]",
        isDeleting ? "opacity-60 pointer-events-none" : "",
        isSelectMode ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ touchAction: "manipulation" }}
      onClick={isSelectMode ? () => onToggleSelect(key) : undefined}
      {...longPressHandlers}
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* Thumbnail block — 16:9, no crop */}
      <a
        href={getYoutubeUrl(item.sourceId)}
        target="_blank"
        rel="noreferrer"
        aria-label={`在 YouTube 開啟 ${item.title}`}
        onClick={isSelectMode ? (event) => event.preventDefault() : undefined}
        className="relative block aspect-video w-full overflow-hidden bg-black/40"
      >
        <img
          src={getThumbnail(item)}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover/card:scale-[1.04]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Bottom gradient for readability into card content */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />

        {/* Top-right: select checkbox OR play count badge */}
        {isSelectMode ? (
          <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-[10px] bg-black/65 ring-1 ring-white/10 backdrop-blur-md">
            <Checkbox
              size="small"
              checked={isSelected}
              onChange={() => onToggleSelect(key)}
              onClick={(event) => event.stopPropagation()}
              className="!p-0"
              inputProps={{ "aria-label": `選取 ${item.title}` }}
              sx={{
                color: "rgba(231,216,191,0.62)",
                "&.Mui-checked": { color: "#67e8f9" },
                "& .MuiSvgIcon-root": { fontSize: 18 },
              }}
            />
          </span>
        ) : (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-amber-100 ring-1 ring-amber-200/15 backdrop-blur-md">
            <BookmarkRoundedIcon sx={{ fontSize: 11 }} />
            {formatNumber(item.playCount)}
          </span>
        )}

        {/* Bottom-right hover-reveal delete (suppressed in select mode) */}
        {!isSelectMode && (
          <button
            type="button"
            aria-label={`移除收藏：${item.title}`}
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRequestDelete(item.provider, item.sourceId);
            }}
            className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/72 text-rose-200 opacity-0 ring-1 ring-rose-300/20 backdrop-blur-md transition duration-200 group-hover/card:opacity-100 hover:bg-rose-500/35 hover:text-rose-100"
          >
            <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
          </button>
        )}
      </a>

      {/* Content block */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-2.5 py-2">
        <a
          href={getYoutubeUrl(item.sourceId)}
          target="_blank"
          rel="noreferrer"
          onClick={isSelectMode ? (event) => event.preventDefault() : undefined}
          className="line-clamp-2 text-[12.5px] font-semibold leading-snug tracking-tight text-[var(--mc-text)] transition group-hover/card:text-amber-50"
        >
          {item.title}
        </a>
        <ChannelLink
          item={item}
          onChannelClick={onChannelClick}
          className="truncate text-[10.5px] leading-tight text-[var(--mc-text-muted)]/82"
        />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// FavoriteGridRow — wraps N grid cards into one react-window row
// ---------------------------------------------------------------------------

function FavoriteGridRow({
  ariaAttributes,
  index,
  style,
  items,
  itemsPerRow,
  selectedKeys,
  isSelectMode,
  deletingKeys,
  hasNextPage,
  isFetchingNextPage,
  onToggleSelect,
  onRequestDelete,
  onLongPress,
  onChannelClick,
}: RowComponentProps<FavoriteGridRowProps>): React.ReactElement {
  const totalDataRows = Math.ceil(items.length / itemsPerRow);

  // Final row when hasNextPage → "load more" sentinel.
  if (index >= totalDataRows) {
    return (
      <div style={style} {...ariaAttributes} className="flex items-center justify-center gap-2 text-xs text-[var(--mc-text-muted)]">
        {hasNextPage && isFetchingNextPage ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--mc-border)] border-t-amber-300/60" />
            載入更多...
          </>
        ) : null}
      </div>
    );
  }

  const startIndex = index * itemsPerRow;
  const rowItems = items.slice(startIndex, startIndex + itemsPerRow);

  return (
    <div style={style} {...ariaAttributes} className="py-1.5">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
          gap: `${GRID_GAP_PX}px`,
        }}
      >
        {rowItems.map((item) => {
          const key = getFavoriteKey(item);
          return (
            <FavoriteGridCard
              key={key}
              item={item}
              isSelectMode={isSelectMode}
              isSelected={selectedKeys.has(key)}
              isDeleting={deletingKeys.has(key)}
              onToggleSelect={onToggleSelect}
              onRequestDelete={onRequestDelete}
              onLongPress={onLongPress}
              onChannelClick={onChannelClick}
            />
          );
        })}
        {/* Fill empty cells so last partial row stays aligned */}
        {Array.from({ length: itemsPerRow - rowItems.length }, (_, i) => (
          <div key={`empty-${i}`} aria-hidden />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChannelGroupRow — collapsible channel section (works for both layouts)
// ---------------------------------------------------------------------------

function ChannelGroupRow({
  group,
  layout,
  itemsPerRow,
  isExpanded,
  onToggle,
  isSelectMode,
  selectedKeys,
  deletingKeys,
  onToggleSelect,
  onRequestDelete,
  onLongPress,
  onChannelClick,
  onChannelHeaderClick,
}: CommonRowProps & {
  group: ChannelGroup;
  layout: Layout;
  itemsPerRow: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChannelHeaderClick: (group: ChannelGroup) => void;
}): React.ReactElement {
  return (
    <div className="mb-2">
      <div
        className={[
          "group/ch flex items-center gap-3 rounded-[16px] border px-3 py-2.5 transition duration-160",
          "bg-[linear-gradient(180deg,rgba(20,17,13,0.84),rgba(8,7,5,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
          isExpanded
            ? "border-amber-200/38 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.16),inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "border-[var(--mc-border)] hover:border-amber-200/28 hover:bg-[linear-gradient(180deg,rgba(24,19,10,0.88),rgba(10,8,3,0.97))]",
        ].join(" ")}
      >
        {/* Album icon (acts as visual marker, AND opens channel in YouTube when channelId exists) */}
        {group.channelId ? (
          <a
            href={getYoutubeChannelUrl(group.channelId)}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              event.stopPropagation();
              onChannelHeaderClick(group);
            }}
            aria-label={`在 YouTube 開啟頻道 ${group.channelTitle}`}
            className={[
              "grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border transition duration-160",
              isExpanded
                ? "border-amber-200/30 bg-amber-300/16 text-amber-200 hover:bg-amber-300/22"
                : "border-amber-200/14 bg-amber-300/10 text-amber-200/75 hover:border-amber-200/30 hover:text-amber-200",
            ].join(" ")}
          >
            <AlbumRoundedIcon sx={{ fontSize: 18 }} />
          </a>
        ) : (
          <span
            className={[
              "grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border transition duration-160",
              isExpanded
                ? "border-amber-200/30 bg-amber-300/16 text-amber-200"
                : "border-amber-200/14 bg-amber-300/10 text-amber-200/75",
            ].join(" ")}
          >
            <AlbumRoundedIcon sx={{ fontSize: 18 }} />
          </span>
        )}

        {/* Expand toggle (channel name + stats) — keeps name area separately clickable from icon */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold leading-tight text-[var(--mc-text)]">
              {group.channelTitle}
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-3 text-[11px] text-[var(--mc-text-muted)]">
              <span className="flex shrink-0 items-center gap-1">
                <QueueMusicRoundedIcon sx={{ fontSize: 12 }} />
                {group.items.length} 首
              </span>
              <span className="flex shrink-0 items-center gap-1 font-semibold text-amber-200/75">
                <BookmarkRoundedIcon sx={{ fontSize: 12 }} />
                {formatNumber(group.totalPlayCount)}
              </span>
            </div>
          </div>
          <span
            className={[
              "grid h-7 w-7 shrink-0 place-items-center rounded-[10px] transition duration-200",
              isExpanded
                ? "rotate-180 text-amber-200/80"
                : "text-[var(--mc-text-muted)] group-hover/ch:text-[var(--mc-text)]",
            ].join(" ")}
          >
            <ExpandMoreRoundedIcon sx={{ fontSize: 20 }} />
          </span>
        </button>
      </div>

      {/* Expanded items — list or grid layout */}
      {isExpanded && (
        <div className="ml-[21px] mt-1.5 border-l-2 border-amber-200/14 pl-3">
          {layout === "list" ? (
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const key = getFavoriteKey(item);
                return (
                  <FavoriteRowContent
                    key={key}
                    item={item}
                    isSelectMode={isSelectMode}
                    isSelected={selectedKeys.has(key)}
                    isDeleting={deletingKeys.has(key)}
                    onToggleSelect={onToggleSelect}
                    onRequestDelete={onRequestDelete}
                    onLongPress={onLongPress}
                    onChannelClick={onChannelClick}
                  />
                );
              })}
            </div>
          ) : (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
                gap: `${GRID_GAP_PX}px`,
              }}
            >
              {group.items.map((item) => {
                const key = getFavoriteKey(item);
                return (
                  <FavoriteGridCard
                    key={key}
                    item={item}
                    isSelectMode={isSelectMode}
                    isSelected={selectedKeys.has(key)}
                    isDeleting={deletingKeys.has(key)}
                    onToggleSelect={onToggleSelect}
                    onRequestDelete={onRequestDelete}
                    onLongPress={onLongPress}
                    onChannelClick={onChannelClick}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FavoriteSongsPage
// ---------------------------------------------------------------------------

const FavoriteSongsPage: React.FC = () => {
  const [sortKey, setSortKey] = useState<SongFavoriteSortKey>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SongFavoriteSortOrder>("desc");
  const {
    items: flatItems,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    deleteFavorite,
    batchDeleteFavorites,
    deleteAllFavorites,
    isBatchDeleting,
    isDeletingAll,
  } = useSongFavoriteList({
    limit: 50,
    sort: sortKey,
    order: sortOrder,
  });

  const [viewMode, setViewMode] = useState<ViewMode>("songs");
  const [layout, setLayout] = useState<Layout>(readStoredLayout);
  const [expandedChannels, setExpandedChannels] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [deletingKeys, setDeletingKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [operationError, setOperationError] = useState<string | null>(null);
  const [confirmSuppressChecked, setConfirmSuppressChecked] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [actionsMenuAnchor, setActionsMenuAnchor] =
    useState<HTMLElement | null>(null);
  const suppressDeleteConfirmRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const channelViewBottomRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // ---------------------------------------------------------------------------
  // Persist layout selection
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    } catch {
      // localStorage unavailable (private mode, quota) — fail silently.
    }
  }, [layout]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const stats = useMemo(() => getLoadedStats(flatItems), [flatItems]);

  const loadedKeys = useMemo(
    () => new Set(flatItems.map(getFavoriteKey)),
    [flatItems],
  );

  // Channel groups (computed only when channel view is active).
  // Channel id is the first non-null channelId we encounter for the group.
  const channelGroups = useMemo<ChannelGroup[]>(() => {
    if (viewMode !== "channels") return [];
    const map = new Map<string, { items: SongFavoriteRecord[]; channelId: string | null }>();
    for (const item of flatItems) {
      const title = item.channelTitle?.trim() || "未知頻道";
      const existing = map.get(title);
      if (existing) {
        existing.items.push(item);
        if (!existing.channelId && item.channelId) existing.channelId = item.channelId;
      } else {
        map.set(title, { items: [item], channelId: item.channelId ?? null });
      }
    }
    return Array.from(map.entries())
      .map(([channelTitle, value]) => ({
        channelTitle,
        channelId: value.channelId,
        items: value.items,
        totalPlayCount: value.items.reduce((sum, i) => sum + i.playCount, 0),
      }))
      .sort((a, b) => b.totalPlayCount - a.totalPlayCount);
  }, [flatItems, viewMode]);

  const itemsPerRow = useMemo(
    () => computeItemsPerRow(containerSize.width),
    [containerSize.width],
  );

  const gridRowHeight = useMemo(
    () => computeGridRowHeight(containerSize.width, itemsPerRow),
    [containerSize.width, itemsPerRow],
  );

  // ---------------------------------------------------------------------------
  // Container size tracking (single source of truth for width + height).
  // Replaces previous window-resize-based height computation, while still
  // accounting for the fixed select-mode bottom bar overlay.
  // ---------------------------------------------------------------------------

  const updateContainerSize = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const width = Math.max(0, rect.width);
    const bottomReduction = isSelectMode ? BOTTOM_BAR_HEIGHT : 0;
    const bottomInset =
      window.innerWidth >= DESKTOP_BREAKPOINT_PX
        ? LIST_BOTTOM_INSET_DESKTOP
        : LIST_BOTTOM_INSET_MOBILE;
    const height = Math.max(
      260,
      window.innerHeight - rect.top - bottomReduction - bottomInset,
    );
    setContainerSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, [isSelectMode]);

  useEffect(() => {
    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, [updateContainerSize]);

  useEffect(() => {
    updateContainerSize();
  }, [flatItems.length, operationError, layout, viewMode, updateContainerSize]);

  // ---------------------------------------------------------------------------
  // Channel view infinite scroll via IntersectionObserver
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (viewMode !== "channels" || !hasNextPage || isFetchingNextPage) return;
    const el = channelViewBottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ---------------------------------------------------------------------------
  // Selection management
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setSelectedKeys((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const key of prev) {
        if (loadedKeys.has(key)) next.add(key);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [loadedKeys]);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedKeys(new Set());
  }, []);

  // ---------------------------------------------------------------------------
  // View mode / layout / sort
  // ---------------------------------------------------------------------------

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      if (mode === viewMode) return;
      exitSelectMode();
      setExpandedChannels(new Set());
      setOperationError(null);
      setViewMode(mode);
    },
    [viewMode, exitSelectMode],
  );

  const handleLayoutChange = useCallback(
    (next: Layout) => {
      if (next === layout) return;
      exitSelectMode();
      setLayout(next);
    },
    [layout, exitSelectMode],
  );

  const toggleChannel = useCallback((channelTitle: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelTitle)) {
        next.delete(channelTitle);
      } else {
        next.add(channelTitle);
      }
      return next;
    });
  }, []);

  const handleSortChange = useCallback(
    (nextKey: SongFavoriteSortKey) => {
      setOperationError(null);
      exitSelectMode();
      if (nextKey === sortKey) {
        setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
        return;
      }
      setSortKey(nextKey);
      setSortOrder(getDefaultSortOrder(nextKey));
    },
    [exitSelectMode, sortKey],
  );

  // ---------------------------------------------------------------------------
  // Select / delete
  // ---------------------------------------------------------------------------

  const toggleSelect = useCallback((key: string) => {
    setOperationError(null);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      if (next.size >= MAX_BATCH_DELETE_ITEMS) return prev;
      next.add(key);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((key: string) => {
    setOperationError(null);
    setIsSelectMode(true);
    setSelectedKeys(new Set([key]));
  }, []);

  const executeDelete = useCallback(
    async (items: PendingDelete) => {
      setOperationError(null);
      try {
        if (items.length === 1) {
          const [item] = items;
          const key = `${item!.provider}:${item!.sourceId}`;
          setDeletingKeys((prev) => new Set([...prev, key]));
          try {
            await deleteFavorite({
              provider: item!.provider,
              sourceId: item!.sourceId,
            });
          } finally {
            setDeletingKeys((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }
          return;
        }

        if (items.length > MAX_BATCH_DELETE_ITEMS) {
          throw new Error(`一次最多可移除 ${MAX_BATCH_DELETE_ITEMS} 首已載入歌曲`);
        }

        await batchDeleteFavorites(items);
        exitSelectMode();
      } catch (err) {
        setOperationError(
          err instanceof Error ? err.message : "操作失敗，請稍後再試。",
        );
      }
    },
    [batchDeleteFavorites, deleteFavorite, exitSelectMode],
  );

  const requestDelete = useCallback(
    (items: PendingDelete) => {
      if (items.length === 0) return;
      if (suppressDeleteConfirmRef.current) {
        void executeDelete(items);
        return;
      }
      setConfirmSuppressChecked(false);
      setPendingDelete(items);
    },
    [executeDelete],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    if (confirmSuppressChecked) {
      suppressDeleteConfirmRef.current = true;
    }
    const items = pendingDelete;
    setPendingDelete(null);
    await executeDelete(items);
  }, [confirmSuppressChecked, executeDelete, pendingDelete]);

  const handleBatchDeleteSelected = useCallback(() => {
    const items = flatItems
      .filter((item) => selectedKeys.has(getFavoriteKey(item)))
      .map((item) => ({ provider: item.provider, sourceId: item.sourceId }));
    requestDelete(items);
  }, [flatItems, requestDelete, selectedKeys]);

  const handleClearAll = useCallback(async () => {
    setOperationError(null);
    try {
      await deleteAllFavorites();
      setShowClearAllConfirm(false);
      exitSelectMode();
    } catch (err) {
      setOperationError(
        err instanceof Error ? err.message : "清空收藏失敗，請稍後再試。",
      );
    }
  }, [deleteAllFavorites, exitSelectMode]);

  const handleSingleDelete = useCallback(
    (provider: "youtube", sourceId: string) => {
      requestDelete([{ provider, sourceId }]);
    },
    [requestDelete],
  );

  // ---------------------------------------------------------------------------
  // Channel click tracking — fires for both row-level and channel-header clicks
  // ---------------------------------------------------------------------------

  const handleChannelClick = useCallback((item: SongFavoriteRecord) => {
    if (!item.channelId) return;
    trackEvent("song_favorite_channel_click", {
      channel_id: item.channelId,
      channel_title: item.channelTitle ?? null,
      source_id: item.sourceId,
      origin: "song_card",
    });
  }, []);

  const handleChannelHeaderClick = useCallback((group: ChannelGroup) => {
    if (!group.channelId) return;
    trackEvent("song_favorite_channel_click", {
      channel_id: group.channelId,
      channel_title: group.channelTitle,
      source_id: null,
      origin: "channel_header",
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Songs view helpers
  // ---------------------------------------------------------------------------

  const totalDataRows = useMemo(() => {
    if (layout === "grid") {
      return itemsPerRow > 0 ? Math.ceil(flatItems.length / itemsPerRow) : 0;
    }
    return flatItems.length;
  }, [flatItems.length, itemsPerRow, layout]);

  const rowCount = totalDataRows + (hasNextPage ? 1 : 0);

  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      if (!hasNextPage || isFetchingNextPage) return;
      // Trigger when within 1-2 rows of the end (or 8 items in list mode).
      const threshold = layout === "grid" ? 2 : 8;
      if (visibleRows.stopIndex >= totalDataRows - threshold) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage, layout, totalDataRows],
  );

  const listRowProps = useMemo<FavoriteRowProps>(
    () => ({
      items: flatItems,
      selectedKeys,
      isSelectMode,
      deletingKeys,
      onToggleSelect: toggleSelect,
      onRequestDelete: handleSingleDelete,
      onLongPress: handleLongPress,
      onChannelClick: handleChannelClick,
    }),
    [
      deletingKeys,
      flatItems,
      handleChannelClick,
      handleLongPress,
      handleSingleDelete,
      isSelectMode,
      selectedKeys,
      toggleSelect,
    ],
  );

  const gridRowProps = useMemo<FavoriteGridRowProps>(
    () => ({
      items: flatItems,
      itemsPerRow,
      hasNextPage,
      isFetchingNextPage,
      selectedKeys,
      isSelectMode,
      deletingKeys,
      onToggleSelect: toggleSelect,
      onRequestDelete: handleSingleDelete,
      onLongPress: handleLongPress,
      onChannelClick: handleChannelClick,
    }),
    [
      deletingKeys,
      flatItems,
      handleChannelClick,
      handleLongPress,
      handleSingleDelete,
      hasNextPage,
      isFetchingNextPage,
      isSelectMode,
      itemsPerRow,
      selectedKeys,
      toggleSelect,
    ],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="flex min-h-[calc(100dvh-150px)] w-full min-w-0 flex-col overflow-hidden px-1 pb-1 text-[var(--mc-text)] sm:px-0">
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-2.5 sm:p-3">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="text-amber-200">
              <BookmarksRoundedIcon sx={{ fontSize: 28 }} />
            </span>
            <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--mc-text)] sm:text-3xl">
              收藏歌曲
            </h1>
          </div>

          {flatItems.length > 0 && (
            <>
              {/* Desktop: inline action buttons */}
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Button
                  variant={isSelectMode ? "contained" : "outlined"}
                  size="small"
                  startIcon={
                    isSelectMode ? (
                      <DoneAllRoundedIcon />
                    ) : (
                      <PlaylistAddCheckRoundedIcon />
                    )
                  }
                  onClick={isSelectMode ? exitSelectMode : () => setIsSelectMode(true)}
                  sx={
                    isSelectMode
                      ? {
                          borderRadius: "12px",
                          fontWeight: 700,
                          minWidth: 0,
                          px: 1.25,
                        }
                      : {
                          borderRadius: "12px",
                          borderColor: "rgba(245,158,11,0.24)",
                          color: "var(--mc-text)",
                          fontWeight: 700,
                          minWidth: 0,
                          px: 1.25,
                          "& .MuiButton-startIcon": {
                            mr: 0.75,
                            ml: 0,
                          },
                          "&:hover": {
                            borderColor: "rgba(245,158,11,0.46)",
                            backgroundColor: "rgba(245,158,11,0.08)",
                          },
                        }
                  }
                >
                  {isSelectMode ? "完成選取" : "批次管理"}
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteSweepRoundedIcon />}
                  onClick={() => setShowClearAllConfirm(true)}
                  disabled={isDeletingAll}
                  sx={{
                    borderRadius: "12px",
                    borderColor: "rgba(248,113,113,0.28)",
                    color: "rgba(254,202,202,0.86)",
                    fontWeight: 700,
                    minWidth: 0,
                    px: 1.25,
                    "& .MuiButton-startIcon": {
                      mr: 0.75,
                      ml: 0,
                    },
                    "&:hover": {
                      borderColor: "rgba(248,113,113,0.52)",
                      backgroundColor: "rgba(244,63,94,0.08)",
                    },
                  }}
                >
                  清空收藏
                </Button>
              </div>

              {/* Mobile: overflow menu (single icon → popover) */}
              <div className="shrink-0 sm:hidden">
                <IconButton
                  size="small"
                  onClick={(event) => setActionsMenuAnchor(event.currentTarget)}
                  aria-label="更多操作"
                  aria-haspopup="true"
                  aria-expanded={Boolean(actionsMenuAnchor)}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "12px",
                    border: "1px solid rgba(245,158,11,0.24)",
                    color: "var(--mc-text)",
                    "&:hover": {
                      borderColor: "rgba(245,158,11,0.46)",
                      backgroundColor: "rgba(245,158,11,0.08)",
                    },
                  }}
                >
                  <MoreVertRoundedIcon fontSize="small" />
                </IconButton>
              </div>
            </>
          )}
        </div>

        {/* Compact stats + sort + layout */}
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <StatChip
              icon={<QueueMusicRoundedIcon sx={{ fontSize: 15 }} />}
              label="歌曲數"
              value={`${formatNumber(stats.loadedCount)}${hasNextPage ? "+" : ""}`}
              onClick={() => handleViewModeChange("songs")}
              isActive={viewMode === "songs"}
            />
            <StatChip
              icon={<AlbumRoundedIcon sx={{ fontSize: 15 }} />}
              label="頻道數"
              value={formatNumber(stats.channelCount)}
              onClick={() => handleViewModeChange("channels")}
              isActive={viewMode === "channels"}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <SortControl
              sortKey={sortKey}
              sortOrder={sortOrder}
              onChange={handleSortChange}
            />
            <LayoutControl layout={layout} onChange={handleLayoutChange} />
          </div>
        </div>

        {/* Error banner */}
        {(operationError || error) && (
          <div className="mt-2 shrink-0 rounded-[14px] border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {operationError ||
              (error instanceof Error ? error.message : "收藏歌曲載入失敗")}
          </div>
        )}

        {/* List area */}
        <div ref={containerRef} className="mt-3 min-h-0 flex-1">
          {isLoading ? (
            <div>
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonCard key={index} index={index} />
              ))}
            </div>
          ) : flatItems.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[var(--mc-border)] bg-black/18 px-6 text-center"
              style={{ height: containerSize.height > 0 ? containerSize.height : 360 }}
            >
              <span className="grid h-16 w-16 place-items-center rounded-[22px] border border-amber-200/16 bg-amber-300/10 text-amber-100">
                <MusicNoteRoundedIcon sx={{ fontSize: 32 }} />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-[var(--mc-text)]">
                還沒有收藏歌曲
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--mc-text-muted)]">
                在遊戲中按下收藏後，歌曲會同步到這裡，方便你之後回聽或整理。
              </p>
            </div>
          ) : viewMode === "songs" && containerSize.height > 0 && containerSize.width > 0 ? (
            layout === "list" ? (
              <List
                style={{ height: containerSize.height }}
                rowComponent={FavoriteRow}
                rowCount={rowCount}
                rowHeight={ITEM_HEIGHT}
                rowProps={listRowProps}
                overscanCount={OVERSCAN_COUNT}
                onRowsRendered={handleRowsRendered}
              />
            ) : (
              <List
                style={{ height: containerSize.height }}
                rowComponent={FavoriteGridRow}
                rowCount={rowCount}
                rowHeight={gridRowHeight}
                rowProps={gridRowProps}
                overscanCount={OVERSCAN_COUNT}
                onRowsRendered={handleRowsRendered}
              />
            )
          ) : viewMode === "channels" && containerSize.height > 0 ? (
            <div
              className="overflow-y-auto"
              style={{ height: containerSize.height }}
            >
              {channelGroups.map((group) => (
                <ChannelGroupRow
                  key={group.channelTitle}
                  group={group}
                  layout={layout}
                  itemsPerRow={itemsPerRow}
                  isExpanded={expandedChannels.has(group.channelTitle)}
                  onToggle={() => toggleChannel(group.channelTitle)}
                  isSelectMode={isSelectMode}
                  selectedKeys={selectedKeys}
                  deletingKeys={deletingKeys}
                  onToggleSelect={toggleSelect}
                  onRequestDelete={handleSingleDelete}
                  onLongPress={handleLongPress}
                  onChannelClick={handleChannelClick}
                  onChannelHeaderClick={handleChannelHeaderClick}
                />
              ))}
              {hasNextPage && (
                <div
                  ref={channelViewBottomRef}
                  className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--mc-text-muted)]"
                >
                  {isFetchingNextPage ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--mc-border)] border-t-amber-300/60" />
                      載入更多...
                    </>
                  ) : (
                    "向下捲動載入更多歌曲"
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* Batch select bottom bar */}
      {isSelectMode && (
        <div
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--mc-border)] bg-[rgba(8,7,5,0.96)] px-3 shadow-[0_-18px_40px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl"
          style={{
            minHeight: `calc(${BOTTOM_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[var(--mc-text)]">
                已選取 {selectedKeys.size} 首
              </div>
              <div className="truncate text-xs text-[var(--mc-text-muted)]">
                單次批次上限 {MAX_BATCH_DELETE_ITEMS} 首
              </div>
            </div>
            <Button
              variant="text"
              size="small"
              onClick={exitSelectMode}
              sx={{ color: "var(--mc-text-muted)", fontWeight: 700 }}
            >
              取消
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              disabled={selectedKeys.size === 0 || isBatchDeleting}
              onClick={handleBatchDeleteSelected}
              startIcon={<DeleteOutlineRoundedIcon />}
              sx={{ borderRadius: "12px", fontWeight: 800 }}
            >
              移除
            </Button>
          </div>
        </div>
      )}

      {/* Single / batch delete confirm dialog */}
      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "rgba(8,7,5,0.98)",
            border: "1px solid rgba(248,113,113,0.24)",
            borderRadius: "20px",
            color: "var(--mc-text)",
            overflow: "hidden",
          },
        }}
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" />
        <DialogTitle
          sx={{
            pt: 2.5,
            pb: 1,
            color: "var(--mc-text)",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-rose-500/14 text-rose-200">
            <DeleteOutlineRoundedIcon sx={{ fontSize: 19 }} />
          </span>
          確定移除收藏？
        </DialogTitle>

        <DialogContent sx={{ pt: 0.5, pb: 1 }}>
          <DialogContentText sx={{ color: "var(--mc-text-muted)" }}>
            {pendingDelete?.length === 1
              ? "這首歌會從你的收藏歌曲中移除。"
              : `將移除 ${pendingDelete?.length ?? 0} 首已選取歌曲。`}
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={confirmSuppressChecked}
                onChange={(event) =>
                  setConfirmSuppressChecked(event.target.checked)
                }
                sx={{
                  color: "rgba(231,216,191,0.42)",
                  "&.Mui-checked": { color: "#67e8f9" },
                }}
              />
            }
            label={
              <span className="select-none text-xs text-[var(--mc-text-muted)]">
                本次頁面工作階段不再提示
              </span>
            }
            sx={{ mt: 1.5, ml: 0 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setPendingDelete(null)}
            sx={{ flex: 1, color: "var(--mc-text-muted)", fontWeight: 700 }}
          >
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            sx={{ flex: 1, fontWeight: 800 }}
            onClick={() => void handleConfirmDelete()}
          >
            確定移除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear all confirm dialog */}
      <Dialog
        open={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "rgba(8,7,5,0.98)",
            border: "1px solid rgba(245,158,11,0.24)",
            borderRadius: "20px",
            color: "var(--mc-text)",
            overflow: "hidden",
          },
        }}
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <DialogTitle
          sx={{
            pt: 2.5,
            pb: 1,
            color: "var(--mc-text)",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-amber-400/14 text-amber-100">
            <WarningAmberRoundedIcon sx={{ fontSize: 19 }} />
          </span>
          清空所有收藏？
        </DialogTitle>

        <DialogContent sx={{ pt: 0.5, pb: 1 }}>
          <DialogContentText sx={{ color: "var(--mc-text-muted)" }}>
            此操作會交由後端移除你所有收藏歌曲記錄，完成後無法復原。
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setShowClearAllConfirm(false)}
            sx={{ flex: 1, color: "var(--mc-text-muted)", fontWeight: 700 }}
          >
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            sx={{ flex: 1, fontWeight: 800 }}
            onClick={() => void handleClearAll()}
            disabled={isDeletingAll}
          >
            {isDeletingAll ? "清空中..." : "確定清空"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mobile overflow menu — collapses 批次管理 + 清空收藏 into a popover */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={() => setActionsMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        MenuListProps={{ dense: true, sx: { py: 0.5 } }}
        PaperProps={{
          sx: {
            mt: 0.75,
            minWidth: 180,
            bgcolor: "rgba(8,7,5,0.98)",
            backdropFilter: "blur(16px)",
            border: "1px solid var(--mc-border)",
            borderRadius: "14px",
            color: "var(--mc-text)",
            boxShadow:
              "0 22px 54px -28px rgba(0,0,0,0.92), inset 0 1px 0 rgba(255,255,255,0.04)",
            overflow: "hidden",
            "& .MuiListItemIcon-root": {
              minWidth: "0 !important",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setActionsMenuAnchor(null);
            if (isSelectMode) {
              exitSelectMode();
            } else {
              setIsSelectMode(true);
            }
          }}
          sx={{
            color: isSelectMode ? "#fde68a" : "var(--mc-text)",
            "& .MuiListItemIcon-root": {
              color: isSelectMode ? "#fde68a" : "var(--mc-text-muted)",
            },
            "&:hover": {
              backgroundColor: "rgba(245,158,11,0.10)",
            },
          }}
        >
          <ListItemIcon>
            {isSelectMode ? (
              <DoneAllRoundedIcon fontSize="small" />
            ) : (
              <PlaylistAddCheckRoundedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={isSelectMode ? "完成選取" : "批次管理"}
            primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            setActionsMenuAnchor(null);
            setShowClearAllConfirm(true);
          }}
          disabled={isDeletingAll}
          sx={{
            color: "rgba(254,202,202,0.92)",
            "& .MuiListItemIcon-root": {
              color: "rgba(254,202,202,0.92)",
            },
            "&:hover": {
              backgroundColor: "rgba(244,63,94,0.12)",
            },
          }}
        >
          <ListItemIcon>
            <DeleteSweepRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="清空收藏"
            primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
          />
        </MenuItem>
      </Menu>
    </main>
  );
};

export default FavoriteSongsPage;
