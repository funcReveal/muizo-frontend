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
  Tooltip,
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AlbumRoundedIcon from "@mui/icons-material/AlbumRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { List, type RowComponentProps } from "react-window";

import { useSongFavoriteList } from "../model/useSongFavoriteList";
import type {
  SongFavoriteRecord,
  SongFavoriteSortKey,
  SongFavoriteSortOrder,
} from "../model/types";

const ITEM_HEIGHT = 98;
const OVERSCAN_COUNT = 5;
const BOTTOM_BAR_HEIGHT = 64;
const LIST_BOTTOM_INSET = 18;
const LONG_PRESS_MS = 500;
const MAX_BATCH_DELETE_ITEMS = 100;

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

const formatDuration = (value: number | null) => {
  if (!value || value <= 0) return null;
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatNumber = (value: number) => NUMBER_FORMATTER.format(value);

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
    icon: <StarRoundedIcon sx={{ fontSize: 17 }} />,
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

type PendingDelete = { provider: "youtube"; sourceId: string }[];

type FavoriteRowProps = {
  items: SongFavoriteRecord[];
  selectedKeys: ReadonlySet<string>;
  isSelectMode: boolean;
  deletingKeys: ReadonlySet<string>;
  onToggleSelect: (key: string) => void;
  onRequestDelete: (provider: "youtube", sourceId: string) => void;
  onLongPress: (key: string) => void;
};

type LoadedStats = {
  loadedCount: number;
  totalPlayCount: number;
  channelCount: number;
};

const getLoadedStats = (items: SongFavoriteRecord[]): LoadedStats => {
  let totalPlayCount = 0;
  const channels = new Set<string>();

  for (const item of items) {
    totalPlayCount += item.playCount;
    const channel = item.channelTitle?.trim();
    if (channel) {
      channels.add(channel);
    }
  }

  return {
    loadedCount: items.length,
    totalPlayCount,
    channelCount: channels.size,
  };
};

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

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.78),rgba(8,7,5,0.92))] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:justify-start sm:gap-2 sm:px-2.5">
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[10px] border border-amber-200/14 bg-amber-300/10 text-amber-200">
      {icon}
    </span>
    <span className="sr-only truncate text-[11px] font-semibold tracking-[0.1em] text-[var(--mc-text-muted)] sm:not-sr-only">
      {label}
    </span>
    <span className="shrink-0 text-base font-semibold leading-none tracking-tight text-[var(--mc-text)] sm:text-lg">
      {value}
    </span>
  </div>
);

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
        sortOrder === "desc"
          ? ArrowDownwardRoundedIcon
          : ArrowUpwardRoundedIcon;

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
            aria-label={`${option.ariaLabel}，${
              isActive ? directionLabel : "點擊切換"
            }`}
          >
            {option.icon}
            {isActive && <DirectionIcon sx={{ fontSize: 14 }} />}
          </button>
        </Tooltip>
      );
    })}
  </div>
);

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
}: RowComponentProps<FavoriteRowProps>): React.ReactElement {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const item = items[index];

  useEffect(() => {
    return () => {
      if (longPressTimer.current !== null) clearTimeout(longPressTimer.current);
    };
  }, []);

  if (!item) return <SkeletonCard style={style} index={index} />;

  const key = getFavoriteKey(item);
  const isSelected = selectedKeys.has(key);
  const isDeleting = deletingKeys.has(key);
  const durationLabel = formatDuration(item.durationSec);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (isSelectMode) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = setTimeout(() => {
      onLongPress(key);
      longPressTimer.current = null;
      pointerStart.current = null;
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (longPressTimer.current === null || !pointerStart.current) return;
    if (
      Math.abs(event.clientX - pointerStart.current.x) > 8 ||
      Math.abs(event.clientY - pointerStart.current.y) > 8
    ) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      pointerStart.current = null;
    }
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pointerStart.current = null;
  };

  return (
    <div style={style} {...ariaAttributes} className="py-1.5">
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
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
          {durationLabel && (
            <span className="absolute bottom-1 right-1 rounded bg-black/72 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {durationLabel}
            </span>
          )}
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
            <span className="max-w-[48vw] truncate sm:max-w-[220px]">
              {item.channelTitle || "未知頻道"}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-200/90">
              <StarRoundedIcon sx={{ fontSize: 13 }} />
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
    </div>
  );
}

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
  const suppressDeleteConfirmRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const stats = useMemo(() => getLoadedStats(flatItems), [flatItems]);
  const loadedKeys = useMemo(
    () => new Set(flatItems.map(getFavoriteKey)),
    [flatItems],
  );

  const updateHeight = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const top = element.getBoundingClientRect().top;
    const bottomReduction = isSelectMode ? BOTTOM_BAR_HEIGHT : 0;
    setContainerHeight(
      Math.max(
        260,
        window.innerHeight - top - bottomReduction - LIST_BOTTOM_INSET,
      ),
    );
  }, [isSelectMode]);

  useEffect(() => {
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [updateHeight]);

  useEffect(() => {
    updateHeight();
  }, [flatItems.length, operationError, updateHeight]);

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

  const rowCount = flatItems.length + (hasNextPage ? 1 : 0);

  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      if (
        !isFetchingNextPage &&
        hasNextPage &&
        visibleRows.stopIndex >= flatItems.length - 8
      ) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, flatItems.length, hasNextPage, isFetchingNextPage],
  );

  const rowProps = useMemo<FavoriteRowProps>(
    () => ({
      items: flatItems,
      selectedKeys,
      isSelectMode,
      deletingKeys,
      onToggleSelect: toggleSelect,
      onRequestDelete: (provider, sourceId) =>
        requestDelete([{ provider, sourceId }]),
      onLongPress: handleLongPress,
    }),
    [
      deletingKeys,
      flatItems,
      handleLongPress,
      isSelectMode,
      requestDelete,
      selectedKeys,
      toggleSelect,
    ],
  );

  return (
    <main className="flex min-h-[calc(100dvh-150px)] w-full min-w-0 flex-col overflow-hidden px-1 pb-1 text-[var(--mc-text)] sm:px-0">
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(20,17,13,0.96),rgba(8,7,5,0.99))] p-2.5 shadow-[0_22px_54px_-38px_rgba(0,0,0,0.84),inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--mc-text)] sm:text-3xl">
              收藏歌曲
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {flatItems.length > 0 && (
              <>
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
                          px: { xs: 1, sm: 1.25 },
                        }
                      : {
                          borderRadius: "12px",
                          borderColor: "rgba(245,158,11,0.24)",
                          color: "var(--mc-text)",
                          fontWeight: 700,
                          minWidth: 0,
                          px: { xs: 1, sm: 1.25 },
                          "& .MuiButton-startIcon": {
                            mr: { xs: 0.5, sm: 0.75 },
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
                    px: { xs: 1, sm: 1.25 },
                    "& .MuiButton-startIcon": {
                      mr: { xs: 0.5, sm: 0.75 },
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
              </>
            )}
          </div>
        </div>

        <div className="mt-2 flex shrink-0 items-stretch gap-1.5 sm:gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 sm:gap-2">
            <StatTile
              icon={<QueueMusicRoundedIcon sx={{ fontSize: 17 }} />}
              label="已載入"
              value={`${formatNumber(stats.loadedCount)}${hasNextPage ? "+" : ""}`}
            />
            <StatTile
              icon={<StarRoundedIcon sx={{ fontSize: 17 }} />}
              label="收藏次數"
              value={formatNumber(stats.totalPlayCount)}
            />
            <StatTile
              icon={<AlbumRoundedIcon sx={{ fontSize: 17 }} />}
              label="頻道數"
              value={formatNumber(stats.channelCount)}
            />
          </div>
          <SortControl
            sortKey={sortKey}
            sortOrder={sortOrder}
            onChange={handleSortChange}
          />
        </div>

        {(operationError || error) && (
          <div className="mt-2 shrink-0 rounded-[14px] border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {operationError ||
              (error instanceof Error ? error.message : "收藏歌曲載入失敗")}
          </div>
        )}

        <div ref={containerRef} className="mt-2 min-h-0 flex-1">
            {isLoading ? (
              <div>
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonCard key={index} index={index} />
                ))}
              </div>
            ) : flatItems.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[var(--mc-border)] bg-black/18 px-6 text-center"
                style={{ height: containerHeight > 0 ? containerHeight : 360 }}
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
            ) : containerHeight > 0 ? (
              <List
                style={{ height: containerHeight }}
                rowComponent={FavoriteRow}
                rowCount={rowCount}
                rowHeight={ITEM_HEIGHT}
                rowProps={rowProps}
                overscanCount={OVERSCAN_COUNT}
                onRowsRendered={handleRowsRendered}
              />
            ) : null}
          </div>
      </section>

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
    </main>
  );
};

export default FavoriteSongsPage;
