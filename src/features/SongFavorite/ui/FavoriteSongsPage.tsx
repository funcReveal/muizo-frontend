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
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { motion, AnimatePresence } from "motion/react";
import { List, type RowComponentProps } from "react-window";

import { useSongFavoriteList } from "../model/useSongFavoriteList";
import type { SongFavoriteRecord } from "../model/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Total height (px) of each virtualized row, including 5 px vertical gap. */
const ITEM_HEIGHT = 82;
const OVERSCAN_COUNT = 4;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const formatDate = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getThumbnail = (item: SongFavoriteRecord) =>
  item.thumbnailUrl ||
  `https://i.ytimg.com/vi/${item.sourceId}/mqdefault.jpg`;

const getYoutubeUrl = (sourceId: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(sourceId)}`;

// ---------------------------------------------------------------------------
// Skeleton card — mirrors the real item layout for both initial load and
// the infinite-scroll sentinel row.
// ---------------------------------------------------------------------------

// Title widths cycle through 5 presets so consecutive skeletons don't look identical.
const TITLE_WIDTHS = ["72%", "60%", "78%", "55%", "68%"] as const;
const CHANNEL_WIDTHS = ["28%", "34%", "22%", "38%", "26%"] as const;

const SkeletonCard: React.FC<{ style?: React.CSSProperties; index?: number }> = ({
  style,
  index = 0,
}) => {
  const slot = index % TITLE_WIDTHS.length;
  return (
    <div style={style} className="py-[5px]">
      <div className="h-[72px] flex items-center gap-3 px-3 rounded-xl border border-slate-800/50 bg-slate-900/50 animate-pulse">
        {/* Thumbnail placeholder */}
        <div className="shrink-0 h-[50px] w-[88px] rounded-lg bg-slate-800/80" />
        {/* Text block placeholder */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div
            className="h-3 rounded-full bg-slate-800/80"
            style={{ width: TITLE_WIDTHS[slot] }}
          />
          <div className="flex items-center gap-2">
            <div
              className="h-2 rounded-full bg-slate-800/60"
              style={{ width: CHANNEL_WIDTHS[slot] }}
            />
            <div className="h-2 w-[10%] rounded-full bg-slate-800/40" />
            <div className="h-2 w-[14%] rounded-full bg-slate-800/40" />
          </div>
        </div>
        {/* Action placeholder */}
        <div className="shrink-0 h-7 w-7 rounded-full bg-slate-800/50" />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Row component — module-level to avoid re-creation on parent render
// ---------------------------------------------------------------------------

type FavoriteRowProps = {
  items: SongFavoriteRecord[];
  selectedKeys: ReadonlySet<string>;
  isSelectMode: boolean;
  deletingKeys: ReadonlySet<string>;
  onToggleSelect: (key: string) => void;
  onDelete: (provider: "youtube", sourceId: string) => void;
};

const FavoriteRow = React.memo(function FavoriteRow({
  ariaAttributes,
  index,
  style,
  items,
  selectedKeys,
  isSelectMode,
  deletingKeys,
  onToggleSelect,
  onDelete,
}: RowComponentProps<FavoriteRowProps>) {
  const item = items[index];

  // Sentinel row: renders a skeleton while the next page is being fetched.
  if (!item) {
    return <SkeletonCard style={style} index={index} />;
  }

  const key = `${item.provider}:${item.sourceId}`;
  const isSelected = selectedKeys.has(key);
  const isDeleting = deletingKeys.has(key);

  return (
    <div style={style} {...ariaAttributes} className="py-[5px]">
      <article
        className={[
          "h-[72px] flex items-center gap-3 px-3 rounded-xl border transition-all duration-150",
          isSelected
            ? "border-cyan-500/50 bg-cyan-950/35 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.15)]"
            : "border-slate-800/70 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80",
          isSelectMode ? "cursor-pointer" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={isSelectMode ? () => onToggleSelect(key) : undefined}
      >
        {/* Checkbox (select mode only) */}
        {isSelectMode && (
          <Checkbox
            size="small"
            checked={isSelected}
            onChange={() => onToggleSelect(key)}
            onClick={(e) => e.stopPropagation()}
            className="!p-0 shrink-0"
            sx={{
              color: "rgba(100,116,139,0.5)",
              "&.Mui-checked": { color: "#22d3ee" },
            }}
          />
        )}

        {/* Thumbnail */}
        <a
          href={getYoutubeUrl(item.sourceId)}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 block overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950"
          aria-label={`開啟 ${item.title}`}
          onClick={isSelectMode ? (e) => e.preventDefault() : undefined}
        >
          <img
            src={getThumbnail(item)}
            alt=""
            className="h-[50px] w-[88px] object-cover transition-opacity hover:opacity-80"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </a>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <a
            href={getYoutubeUrl(item.sourceId)}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex max-w-full items-center gap-1 text-slate-100 hover:text-cyan-200 transition-colors"
            onClick={isSelectMode ? (e) => e.preventDefault() : undefined}
          >
            <span className="truncate text-sm font-bold leading-tight">
              {item.title}
            </span>
            <OpenInNewRoundedIcon
              sx={{ fontSize: 12 }}
              className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
            />
          </a>

          <div className="flex items-center gap-1.5 mt-0.5">
            {item.channelTitle && (
              <>
                <span className="truncate text-[11px] text-slate-500 max-w-[130px] max-sm:max-w-[80px]">
                  {item.channelTitle}
                </span>
                <span className="text-slate-700 text-xs shrink-0">·</span>
              </>
            )}
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-400">
              <StarRoundedIcon sx={{ fontSize: 10 }} />
              {item.playCount}
            </span>
            <span className="text-slate-700 text-xs shrink-0">·</span>
            <span className="shrink-0 text-[11px] text-slate-600">
              {formatDate(item.updatedAt)}
            </span>
          </div>
        </div>

        {/* Delete button (normal mode only) */}
        {!isSelectMode && (
          <Tooltip title="移除收藏" arrow placement="left">
            <span>
              <IconButton
                aria-label={`移除收藏：${item.title}`}
                disabled={isDeleting}
                onClick={() => onDelete(item.provider, item.sourceId)}
                size="small"
                className="!text-slate-600 hover:!text-rose-300 !transition-colors"
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </article>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const FavoriteSongsPage: React.FC = () => {
  const {
    items: flatItems,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    deleteFavorite,
    batchDeleteFavorites,
    deleteAllFavorites,
    isBatchDeleting,
    isDeletingAll,
  } = useSongFavoriteList(50);

  // --- Selection ---
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // --- Per-item loading state (only needed for the error path; optimistic removes items) ---
  const [deletingKeys, setDeletingKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // --- Clear-all confirmation ---
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // --- Virtual list container height ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      if (entry) setContainerHeight(entry.contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedKeys(new Set());
  }, []);

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedKeys((prev) =>
      prev.size === flatItems.length
        ? new Set()
        : new Set(flatItems.map((i) => `${i.provider}:${i.sourceId}`)),
    );
  }, [flatItems]);

  const handleDelete = useCallback(
    async (provider: "youtube", sourceId: string) => {
      const key = `${provider}:${sourceId}`;
      setDeletingKeys((prev) => new Set([...prev, key]));
      try {
        await deleteFavorite({ provider, sourceId });
      } finally {
        setDeletingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [deleteFavorite],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    const items = flatItems
      .filter((i) => selectedKeys.has(`${i.provider}:${i.sourceId}`))
      .map((i) => ({ provider: i.provider, sourceId: i.sourceId }));
    try {
      await batchDeleteFavorites(items);
      exitSelectMode();
    } catch {
      // Optimistic rollback already handled by mutation onError.
    }
  }, [selectedKeys, flatItems, batchDeleteFavorites, exitSelectMode]);

  const handleClearAll = useCallback(async () => {
    try {
      await deleteAllFavorites();
    } finally {
      setShowClearAllConfirm(false);
      exitSelectMode();
    }
  }, [deleteAllFavorites, exitSelectMode]);

  // ---------------------------------------------------------------------------
  // Virtual list config
  // ---------------------------------------------------------------------------

  // +1 sentinel row renders a loading skeleton when more pages are available.
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
    [isFetchingNextPage, hasNextPage, flatItems.length, fetchNextPage],
  );

  // Memoize rowProps so react-window only re-renders rows when data changes.
  const rowProps = useMemo<FavoriteRowProps>(
    () => ({
      items: flatItems,
      selectedKeys,
      isSelectMode,
      deletingKeys,
      onToggleSelect: toggleSelect,
      onDelete: handleDelete,
    }),
    [flatItems, selectedKeys, isSelectMode, deletingKeys, toggleSelect, handleDelete],
  );

  const allSelected =
    flatItems.length > 0 && selectedKeys.size === flatItems.length;
  const someSelected =
    selectedKeys.size > 0 && selectedKeys.size < flatItems.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {/* ── Header ── */}
      <section className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <Typography variant="h4" className="!font-black text-slate-100">
            收藏歌曲
          </Typography>
          <div className="mt-1 flex items-center gap-2">
            <Typography variant="body2" className="text-slate-400">
              遊戲中收藏過的歌曲與影片。
            </Typography>
            {flatItems.length > 0 && (
              <span className="inline-flex items-center rounded-full border border-cyan-800/50 bg-cyan-950/60 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                {flatItems.length}
                {hasNextPage ? "+" : ""} 首
              </span>
            )}
          </div>
        </div>

        {flatItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant={isSelectMode ? "contained" : "outlined"}
              size="small"
              startIcon={<PlaylistAddCheckRoundedIcon />}
              onClick={isSelectMode ? exitSelectMode : () => setIsSelectMode(true)}
              sx={
                isSelectMode
                  ? {}
                  : {
                      borderColor: "rgba(100,116,139,0.35)",
                      color: "rgba(148,163,184,0.8)",
                      "&:hover": { borderColor: "rgba(100,116,139,0.6)" },
                    }
              }
            >
              {isSelectMode ? "取消多選" : "多選"}
            </Button>

            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteSweepRoundedIcon />}
              onClick={() => setShowClearAllConfirm(true)}
              disabled={isDeletingAll}
              sx={{
                borderColor: "rgba(239,68,68,0.3)",
                color: "rgba(252,165,165,0.75)",
                "&:hover": { borderColor: "rgba(239,68,68,0.6)" },
              }}
            >
              清除全部
            </Button>
          </div>
        )}
      </section>

      {/* ── Select-mode toolbar (animated) ── */}
      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            key="select-toolbar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/80 px-3 py-2 backdrop-blur-sm">
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
                className="!p-0 shrink-0"
                sx={{
                  color: "rgba(100,116,139,0.5)",
                  "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                    color: "#22d3ee",
                  },
                }}
              />

              <Typography variant="body2" className="flex-1 text-slate-300">
                已選{" "}
                <strong className="text-cyan-300">{selectedKeys.size}</strong>{" "}
                首
              </Typography>

              {/* "全選" only makes sense once all pages are loaded */}
              {!hasNextPage && flatItems.length > 0 && (
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  sx={{ color: "rgba(148,163,184,0.65)", fontSize: "0.72rem" }}
                >
                  {allSelected ? "取消全選" : "全選"}
                </Button>
              )}

              <Button
                variant="contained"
                color="error"
                size="small"
                disabled={selectedKeys.size === 0 || isBatchDeleting}
                onClick={() => {
                  void handleBatchDelete();
                }}
                startIcon={<DeleteOutlineRoundedIcon />}
              >
                刪除 ({selectedKeys.size})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content area ── */}
      {isLoading ? (
        /* Skeleton rows while the first page is loading */
        <div className="flex-1 min-h-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : flatItems.length === 0 ? (
        /* Empty state */
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-5 rounded-xl border border-slate-800/60 bg-slate-950/50 px-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-cyan-300/20 bg-gradient-to-b from-cyan-300/10 to-transparent text-cyan-300">
            <MusicNoteRoundedIcon sx={{ fontSize: 30 }} />
          </span>
          <div>
            <Typography variant="h6" className="!font-bold text-slate-100">
              還沒有收藏歌曲
            </Typography>
            <Typography
              variant="body2"
              className="mt-1.5 max-w-xs text-slate-400"
            >
              遊戲進行中點擊書籤圖示，就能把歌曲記錄到這裡。
            </Typography>
          </div>
        </div>
      ) : (
        /* Virtual list */
        <div ref={containerRef} className="flex-1 min-h-0">
          <List
            style={{ height: containerHeight }}
            rowComponent={FavoriteRow}
            rowCount={rowCount}
            rowHeight={ITEM_HEIGHT}
            rowProps={rowProps}
            overscanCount={OVERSCAN_COUNT}
            onRowsRendered={handleRowsRendered}
          />
        </div>
      )}

      {/* ── Clear-all confirmation dialog ── */}
      <Dialog
        open={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        PaperProps={{
          sx: {
            bgcolor: "rgba(2,6,23,0.97)",
            border: "1px solid rgba(51,65,85,0.55)",
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#f1f5f9", fontWeight: 700 }}>
          清除全部收藏？
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#94a3b8" }}>
            此操作將移除你所有的收藏歌曲記錄，操作無法復原。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setShowClearAllConfirm(false)}
            sx={{ color: "#94a3b8" }}
          >
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              void handleClearAll();
            }}
            disabled={isDeletingAll}
          >
            {isDeletingAll ? "清除中…" : "確認清除"}
          </Button>
        </DialogActions>
      </Dialog>
    </main>
  );
};

export default FavoriteSongsPage;
