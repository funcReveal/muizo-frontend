import { useCallback } from "react";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import RestoreRounded from "@mui/icons-material/RestoreRounded";
import { List as VirtualList, type RowComponentProps } from "react-window";

import useAutoHideScrollbar from "@shared/hooks/useAutoHideScrollbar";

export type VirtualPlaylistItemStatus = "normal" | "long" | "removed";

export type VirtualPlaylistItemView = {
  key: string;
  title: string;
  answerText?: string;
  uploader?: string;
  duration?: string;
  thumbnail?: string;
  sourceTitle?: string;
  startSec?: number;
  endSec?: number;
  status?: VirtualPlaylistItemStatus;
  raw?: unknown;
};

type RowActionLabels = {
  noCover: string;
  unknownUploader: string;
  answer: string;
  playbackRange: string;
  fullTrack: string;
  remove: string;
  restore: string;
};

type RowProps = {
  items: VirtualPlaylistItemView[];
  labels: RowActionLabels;
  showIndex: boolean;
  onRemove?: (item: VirtualPlaylistItemView) => void;
  onRestore?: (item: VirtualPlaylistItemView) => void;
};

type Props = {
  items: VirtualPlaylistItemView[];
  emptyText: string;
  labels: RowActionLabels;
  height?: number;
  rowHeight?: number;
  showIndex?: boolean;
  className?: string;
  onRemove?: (item: VirtualPlaylistItemView) => void;
  onRestore?: (item: VirtualPlaylistItemView) => void;
};

const formatClock = (seconds?: number) => {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;

  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const getRangeLabel = (
  item: VirtualPlaylistItemView,
  labels: RowActionLabels,
) => {
  const start = formatClock(item.startSec);
  const end = formatClock(item.endSec);

  if (start && end) return `${labels.playbackRange} ${start}-${end}`;
  if (start) return `${labels.playbackRange} ${start}`;
  return labels.fullTrack;
};

const PlaylistItemRow = ({
  index,
  style,
  items,
  labels,
  showIndex,
  onRemove,
  onRestore,
}: RowComponentProps<RowProps>) => {
  const item = items[index];
  const isRemoved = item.status === "removed";
  const isLong = item.status === "long";
  const answer = item.answerText?.trim() || item.title;

  const rowTone = isRemoved
    ? "border-rose-300/15 bg-rose-950/10 opacity-80"
    : isLong
      ? "border-amber-300/20 bg-amber-300/8"
      : "border-transparent hover:border-[var(--mc-border)] hover:bg-[var(--mc-surface-strong)]/35";

  return (
    <div style={style} className="px-1 py-1">
      <div
        className={`flex h-full min-w-0 items-center gap-2.5 rounded-xl border px-2 transition sm:gap-3 ${rowTone}`}
      >
        {showIndex && (
          <div className="w-7 shrink-0 text-right text-[11px] tabular-nums text-[var(--mc-text-muted)]">
            {index + 1}
          </div>
        )}

        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            loading="lazy"
            className="h-12 w-[78px] shrink-0 rounded-lg border border-[var(--mc-border)] object-cover sm:h-14 sm:w-[96px]"
          />
        ) : (
          <div className="flex h-12 w-[78px] shrink-0 items-center justify-center rounded-lg border border-[var(--mc-border)] bg-[linear-gradient(145deg,rgba(56,189,248,0.16),rgba(15,23,42,0.25))] text-[10px] text-[var(--mc-text-muted)] sm:h-14 sm:w-[96px]">
            {labels.noCover}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div
            className={`overflow-hidden text-xs font-semibold leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] sm:text-sm ${
              isRemoved
                ? "text-[var(--mc-text-muted)] line-through"
                : "text-[var(--mc-text)]"
            }`}
          >
            {item.title}
          </div>

          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 text-[var(--mc-text-muted)]">
            <span className="max-w-full truncate">
              {item.uploader || labels.unknownUploader}
              {item.duration ? ` · ${item.duration}` : ""}
            </span>
            {item.sourceTitle && (
              <span className="hidden max-w-[180px] truncate lg:inline">
                {item.sourceTitle}
              </span>
            )}
          </div>

          <div className="mt-1 grid min-w-0 grid-cols-1 gap-1 text-[11px] leading-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 truncate rounded-full border border-[var(--mc-border)]/70 bg-[var(--mc-surface-strong)]/35 px-2 py-0.5 text-[var(--mc-text)]">
              <span className="text-[var(--mc-text-muted)]">
                {labels.answer}
              </span>{" "}
              {answer}
            </div>
            <div className="min-w-0 truncate rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-cyan-100">
              {getRangeLabel(item, labels)}
            </div>
          </div>
        </div>

        {!isRemoved && onRemove && (
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-rose-400/10 hover:text-rose-200"
            aria-label={labels.remove}
            title={labels.remove}
          >
            <DeleteOutlineRounded sx={{ fontSize: 18 }} />
          </button>
        )}

        {isRemoved && onRestore && (
          <button
            type="button"
            onClick={() => onRestore(item)}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-emerald-400/10 hover:text-emerald-200"
            aria-label={labels.restore}
            title={labels.restore}
          >
            <RestoreRounded sx={{ fontSize: 18 }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default function VirtualPlaylistItemList({
  items,
  emptyText,
  labels,
  height = 520,
  rowHeight = 92,
  showIndex = true,
  className,
  onRemove,
  onRestore,
}: Props) {
  const viewportRef = useAutoHideScrollbar<HTMLDivElement>();
  const handleListRef = useCallback(
    (instance: { element: HTMLDivElement | null } | null) => {
      viewportRef(instance?.element ?? null);
    },
    [viewportRef],
  );

  if (items.length <= 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--mc-border)] px-3 py-3 text-xs text-[var(--mc-text-muted)]">
        {emptyText}
      </div>
    );
  }

  const listHeight = Math.min(
    height,
    Math.max(rowHeight, items.length * rowHeight),
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/20 ${className ?? ""}`}
      style={{ height: listHeight }}
    >
      <VirtualList
        className="mq-autohide-scrollbar"
        listRef={handleListRef}
        style={{ width: "100%", height: "100%" }}
        rowCount={items.length}
        rowHeight={rowHeight}
        rowProps={{
          items,
          labels,
          showIndex,
          onRemove,
          onRestore,
        }}
        rowComponent={PlaylistItemRow}
      />
    </div>
  );
}
