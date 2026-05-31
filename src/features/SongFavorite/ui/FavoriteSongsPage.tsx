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
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { List, type RowComponentProps } from "react-window";

import { useSongFavoriteList } from "../model/useSongFavoriteList";
import type { SongFavoriteRecord } from "../model/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_HEIGHT = 82;
const OVERSCAN_COUNT = 4;
/** Fixed bottom bar content height. CSS env() handles iOS safe-area separately. */
const BOTTOM_BAR_HEIGHT = 44;
/** Bottom breathing room below the virtual list (px). */
const LIST_BOTTOM_INSET = 16;
const LONG_PRESS_MS = 500;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Module-level singleton — Intl.DateTimeFormat construction is expensive. */
const DATE_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDate = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return DATE_FORMATTER.format(date);
};

const getThumbnail = (item: SongFavoriteRecord) =>
  item.thumbnailUrl ||
  `https://i.ytimg.com/vi/${item.sourceId}/mqdefault.jpg`;

const getYoutubeUrl = (sourceId: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(sourceId)}`;

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

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
        <div className="shrink-0 h-[50px] w-[88px] rounded-lg bg-slate-800/80" />
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="h-3 rounded-full bg-slate-800/80" style={{ width: TITLE_WIDTHS[slot] }} />
          <div className="flex items-center gap-2">
            <div className="h-2 rounded-full bg-slate-800/60" style={{ width: CHANNEL_WIDTHS[slot] }} />
            <div className="h-2 w-[10%] rounded-full bg-slate-800/40" />
            <div className="h-2 w-[14%] rounded-full bg-slate-800/40" />
          </div>
        </div>
        <div className="shrink-0 h-7 w-7 rounded-full bg-slate-800/50" />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Types shared between row and page
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Row component — module-level so react-window reuses the same reference
// ---------------------------------------------------------------------------

const FavoriteRow = React.memo(function FavoriteRow({
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
}: RowComponentProps<FavoriteRowProps>) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimer.current !== null) clearTimeout(longPressTimer.current);
    };
  }, []);

  const item = items[index];

  // Sentinel row while next page is loading
  if (!item) return <SkeletonCard style={style} index={index} />;

  const key = `${item.provider}:${item.sourceId}`;
  const isSelected = selectedKeys.has(key);
  const isDeleting = deletingKeys.has(key);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isSelectMode) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      onLongPress(key);
      longPressTimer.current = null;
      pointerStart.current = null;
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (longPressTimer.current === null || !pointerStart.current) return;
    if (
      Math.abs(e.clientX - pointerStart.current.x) > 8 ||
      Math.abs(e.clientY - pointerStart.current.y) > 8
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
    <div style={style} {...ariaAttributes} className="py-[5px]">
      <article
        className={[
          "h-[72px] flex items-center gap-3 px-3 rounded-xl border transition-all duration-150 select-none",
          isSelected
            ? "border-cyan-500/50 bg-cyan-950/35 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.15)]"
            : "border-slate-800/70 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80",
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
        onContextMenu={(e) => e.preventDefault()}
      >
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
            <span className="truncate text-sm font-bold leading-tight">{item.title}</span>
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
            <span className="shrink-0 text-[11px] text-slate-600">{formatDate(item.updatedAt)}</span>
          </div>
        </div>

        {/* Right action: checkbox in select mode, delete button otherwise */}
        {isSelectMode ? (
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
        ) : (
          <Tooltip title="移除收藏" arrow placement="left">
            <span>
              <IconButton
                aria-label={`移除收藏：${item.title}`}
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(item.provider, item.sourceId);
                }}
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
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());

  // --- Per-item in-flight state (covers error rollback path) ---
  const [deletingKeys, setDeletingKeys] = useState<ReadonlySet<string>>(() => new Set());

  // --- Delete confirmation ---
  const [confirmSuppressChecked, setConfirmSuppressChecked] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  /**
   * Session-scoped flag. Once the user checks "本次不再顯示" and confirms,
   * future delete actions skip the dialog until page reload.
   */
  const suppressDeleteConfirmRef = useRef(false);

  // --- Clear-all confirmation ---
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // --- Virtual list container height ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  /**
   * Measures available list height from the container's top to the viewport bottom,
   * subtracting the fixed bottom bar when in select mode.
   * Extracted into a stable callback so multiple effects can share it.
   */
  const updateHeight = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const bottomReduction = isSelectMode ? BOTTOM_BAR_HEIGHT : 0;
    setContainerHeight(Math.max(200, window.innerHeight - top - bottomReduction - LIST_BOTTOM_INSET));
  }, [isSelectMode]);

  // Re-measure on window resize and whenever select mode (bottom bar) toggles.
  useEffect(() => {
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [updateHeight]);

  // Re-measure when data first arrives so the list isn't stuck at height 0.
  useEffect(() => {
    updateHeight();
  }, [flatItems.length, updateHeight]);

  // ---------------------------------------------------------------------------
  // Selection handlers
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

  const handleLongPress = useCallback((key: string) => {
    setIsSelectMode(true);
    setSelectedKeys(new Set([key]));
  }, []);

  // ---------------------------------------------------------------------------
  // Delete logic
  // ---------------------------------------------------------------------------

  const executeDelete = useCallback(
    async (items: PendingDelete) => {
      if (items.length === 1) {
        const [item] = items;
        const key = `${item!.provider}:${item!.sourceId}`;
        setDeletingKeys((prev) => new Set([...prev, key]));
        try {
          await deleteFavorite({ provider: item!.provider, sourceId: item!.sourceId });
        } finally {
          setDeletingKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      } else {
        try {
          await batchDeleteFavorites(items);
          exitSelectMode();
        } catch {
          // Optimistic rollback handled by mutation onError.
        }
      }
    },
    [deleteFavorite, batchDeleteFavorites, exitSelectMode],
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
  }, [pendingDelete, confirmSuppressChecked, executeDelete]);

  const handleBatchDeleteSelected = useCallback(() => {
    const items = flatItems
      .filter((i) => selectedKeys.has(`${i.provider}:${i.sourceId}`))
      .map((i) => ({ provider: i.provider, sourceId: i.sourceId }));
    requestDelete(items);
  }, [selectedKeys, flatItems, requestDelete]);

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

  const rowCount = flatItems.length + (hasNextPage ? 1 : 0);

  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      if (!isFetchingNextPage && hasNextPage && visibleRows.stopIndex >= flatItems.length - 8) {
        void fetchNextPage();
      }
    },
    [isFetchingNextPage, hasNextPage, flatItems.length, fetchNextPage],
  );

  const rowProps = useMemo<FavoriteRowProps>(
    () => ({
      items: flatItems,
      selectedKeys,
      isSelectMode,
      deletingKeys,
      onToggleSelect: toggleSelect,
      onRequestDelete: (provider, sourceId) => requestDelete([{ provider, sourceId }]),
      onLongPress: handleLongPress,
    }),
    [flatItems, selectedKeys, isSelectMode, deletingKeys, toggleSelect, requestDelete, handleLongPress],
  );

  const allSelected = flatItems.length > 0 && selectedKeys.size === flatItems.length;
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < flatItems.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-3">

      {/* ── Header — single row: title + count badge | action buttons ── */}
      <section className="flex shrink-0 items-center justify-between gap-2">

        {/* Left: title + count badge inline */}
        <div className="flex min-w-0 items-center gap-2">
          <Typography variant="h4" className="!font-black text-slate-100 shrink-0">
            收藏歌曲
          </Typography>
          {flatItems.length > 0 && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-cyan-800/50 bg-cyan-950/60 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
              {flatItems.length}{hasNextPage ? "+" : ""}&nbsp;首
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        {flatItems.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant={isSelectMode ? "contained" : "outlined"}
              size="small"
              startIcon={<PlaylistAddCheckRoundedIcon />}
              onClick={isSelectMode ? exitSelectMode : () => setIsSelectMode(true)}
              sx={
                isSelectMode
                  ? { minWidth: 0 }
                  : {
                      minWidth: 0,
                      borderColor: "rgba(100,116,139,0.35)",
                      color: "rgba(148,163,184,0.8)",
                      "&:hover": { borderColor: "rgba(100,116,139,0.6)" },
                    }
              }
            >
              {/* Desktop: full text; Mobile: shorter label */}
              <span className="hidden sm:inline">{isSelectMode ? "取消多選" : "多選"}</span>
              <span className="sm:hidden">{isSelectMode ? "取消" : "多選"}</span>
            </Button>

            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteSweepRoundedIcon />}
              onClick={() => setShowClearAllConfirm(true)}
              disabled={isDeletingAll}
              sx={{
                minWidth: 0,
                borderColor: "rgba(239,68,68,0.3)",
                color: "rgba(252,165,165,0.75)",
                "&:hover": { borderColor: "rgba(239,68,68,0.6)" },
              }}
            >
              {/* Desktop: full text; Mobile: short label */}
              <span className="hidden sm:inline">清除全部</span>
              <span className="sm:hidden">清除</span>
            </Button>
          </div>
        )}
      </section>

      {/* ── Content area — container is ALWAYS in DOM so the ref is always valid ── */}
      <div ref={containerRef} className="flex-1 min-h-0">
        {isLoading ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </>
        ) : flatItems.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-5 rounded-xl border border-slate-800/60 bg-slate-950/50 px-6 text-center"
            style={{ height: containerHeight > 0 ? containerHeight : "100%" }}
          >
            <span className="grid h-16 w-16 place-items-center rounded-full border border-cyan-300/20 bg-gradient-to-b from-cyan-300/10 to-transparent text-cyan-300">
              <MusicNoteRoundedIcon sx={{ fontSize: 30 }} />
            </span>
            <div>
              <Typography variant="h6" className="!font-bold text-slate-100">
                還沒有收藏歌曲
              </Typography>
              <Typography variant="body2" className="mt-1.5 max-w-xs text-slate-400">
                遊戲進行中點擊書籤圖示，就能把歌曲記錄到這裡。
              </Typography>
            </div>
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

      {/* ── Bottom bar — fixed, compact, 全選 left of 刪除 ── */}
      {isSelectMode && (
        <div
          className="fixed bottom-0 inset-x-0 z-[60] flex items-center gap-2 border-t border-slate-700/60 bg-slate-950/95 px-3 backdrop-blur-md"
          style={{
            height: `calc(${BOTTOM_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Selected count */}
          <Typography variant="body2" className="flex-1 text-sm text-slate-300">
            已選 <strong className="text-cyan-300">{selectedKeys.size}</strong> 首
          </Typography>

          {/* 全選 checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
                sx={{
                  p: 0.25,
                  color: "rgba(100,116,139,0.5)",
                  "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: "#22d3ee" },
                }}
              />
            }
            label={<span className="select-none text-xs text-slate-400">全選</span>}
            sx={{ m: 0, gap: 0.5 }}
          />

          {/* Delete selected */}
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={selectedKeys.size === 0 || isBatchDeleting}
            onClick={handleBatchDeleteSelected}
            startIcon={<DeleteOutlineRoundedIcon />}
          >
            刪除 ({selectedKeys.size})
          </Button>
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "rgba(2,6,23,0.97)",
            border: "1px solid rgba(239,68,68,0.18)",
            borderRadius: "16px",
            backdropFilter: "blur(16px)",
            overflow: "hidden",
          },
        }}
      >
        {/* Accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-rose-700/0 via-rose-500/60 to-rose-700/0" />

        <DialogTitle
          sx={{
            pt: 2.5,
            pb: 1,
            color: "#f1f5f9",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-400">
            <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
          </span>
          確認刪除
        </DialogTitle>

        <DialogContent sx={{ pt: 0.5, pb: 1 }}>
          <DialogContentText sx={{ color: "#94a3b8" }}>
            {pendingDelete?.length === 1
              ? "確定要移除這首收藏歌曲嗎？"
              : `確定要刪除選取的 ${pendingDelete?.length ?? 0} 首歌曲嗎？`}
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={confirmSuppressChecked}
                onChange={(e) => setConfirmSuppressChecked(e.target.checked)}
                sx={{
                  color: "rgba(100,116,139,0.5)",
                  "&.Mui-checked": { color: "#22d3ee" },
                }}
              />
            }
            label={<span className="select-none text-xs text-slate-400">本次不再顯示</span>}
            sx={{ mt: 1.5, ml: 0 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setPendingDelete(null)}
            sx={{ flex: 1, color: "#94a3b8" }}
          >
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            sx={{ flex: 1 }}
            onClick={() => void handleConfirmDelete()}
          >
            確認刪除
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Clear-all confirmation dialog ── */}
      <Dialog
        open={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "rgba(2,6,23,0.97)",
            border: "1px solid rgba(234,179,8,0.18)",
            borderRadius: "16px",
            backdropFilter: "blur(16px)",
            overflow: "hidden",
          },
        }}
      >
        {/* Accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-amber-700/0 via-amber-500/60 to-amber-700/0" />

        <DialogTitle
          sx={{
            pt: 2.5,
            pb: 1,
            color: "#f1f5f9",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-400">
            <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
          </span>
          清除全部收藏？
        </DialogTitle>

        <DialogContent sx={{ pt: 0.5, pb: 1 }}>
          <DialogContentText sx={{ color: "#94a3b8" }}>
            此操作將移除你所有的收藏歌曲記錄，操作無法復原。
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setShowClearAllConfirm(false)}
            sx={{ flex: 1, color: "#94a3b8" }}
          >
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            sx={{ flex: 1 }}
            onClick={() => void handleClearAll()}
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
