import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { Checkbox, FormControlLabel } from "@mui/material";

import {
  DndContext,
  DragOverlay,
  AutoScrollActivator,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Close from "@mui/icons-material/Close";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { List, useListCallbackRef } from "react-window";
import ConfirmDialog from "../../../../../shared/ui/ConfirmDialog";

type PlaylistItemView = {
  localId: string;
  title: string;
  uploader?: string;
  duration?: string;
  startSec: number;
  endSec: number;
  thumbnail?: string;
};

type PlaylistListPanelProps = {
  items: PlaylistItemView[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  listRef: RefObject<HTMLDivElement | null>;
  highlightIndex: number | null;
  clipDurationLabel: string;
  formatSeconds: (value: number) => string;
  onAddSingleToggle: () => void;
  singleTrackOpen: boolean;
  singleTrackUrl: string;
  singleTrackTitle: string;
  singleTrackAnswer: string;
  singleTrackError: string | null;
  singleTrackLoading: boolean;
  isDuplicate: boolean;
  canEditSingleMeta: boolean;
  onSingleTrackUrlChange: (value: string) => void;
  onSingleTrackTitleChange: (value: string) => void;
  onSingleTrackAnswerChange: (value: string) => void;
  onSingleTrackCancel: () => void;
  onAddSingle: () => void;
};

type SortableRowProps = {
  ariaAttributes?: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
  item: PlaylistItemView;
  index: number;
  isActive: boolean;
  isHighlighted: boolean;
  clipDurationLabel: string;
  formatSeconds: (value: number) => string;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  outerStyle?: CSSProperties;
};

const RowCard = ({
  item,
  index,
  isActive,
  isHighlighted,
  clipDurationLabel,
  formatSeconds,
  onSelect,
  onRemove,
  dndHandle,
  dimmed,
}: {
  item: PlaylistItemView;
  index: number;
  isActive: boolean;
  isHighlighted: boolean;
  clipDurationLabel: string;
  formatSeconds: (value: number) => string;
  onSelect?: (index: number) => void;
  onRemove?: (index: number) => void;
  dndHandle?: ReactNode;
  dimmed?: boolean;
}) => {
  return (
    <div
      onClick={onSelect ? () => onSelect(index) : undefined}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(index);
        }
      }}
      className={`relative flex items-center gap-3 rounded-xl border p-2 text-left transition-[border-color,background-color,box-shadow,transform,opacity] duration-150 ${
        isActive
          ? "border-[var(--mc-accent)] bg-[var(--mc-surface-strong)]"
          : "border-[var(--mc-border)] bg-[var(--mc-surface)]/60 hover:border-[var(--mc-accent)]/60"
      } ${
        isHighlighted
          ? "ring-1 ring-[var(--mc-accent)]/80 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]"
          : ""
      } ${dimmed ? "opacity-35" : ""}`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {dndHandle}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--mc-surface-strong)]">
        <span className="absolute left-1 top-1 rounded bg-[var(--mc-surface)]/80 px-1 py-0.5 text-[9px] text-[var(--mc-text)]">
          {index + 1}
        </span>
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-500">
            -
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] text-[var(--mc-text)]">
          {item.title}
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--mc-text-muted)]">
          {item.duration ?? "--:--"} - {clipDurationLabel}{" "}
          {formatSeconds(Math.max(0, item.endSec - item.startSec))}
        </div>
      </div>
      <div className="flex pb-5">
        {onRemove && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(index);
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-rose-400/45 bg-rose-500/12 text-rose-200 transition-colors hover:bg-rose-500/22"
            aria-label="Delete"
          >
            <Close sx={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    </div>
  );
};

const SortableRow = ({
  ariaAttributes,
  item,
  index,
  isActive,
  isHighlighted,
  clipDurationLabel,
  formatSeconds,
  onSelect,
  onRemove,
  outerStyle,
}: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.localId });

  // Important for virtualization:
  // react-window positions rows using `outerStyle.transform: translate3d(0, y, 0)`.
  // dnd-kit also uses a transform to move the active item.
  // If we concatenate both transforms on the same element, they compound and the row can jump
  // (often to the top) and the overlay won't track the pointer correctly.
  // Split these concerns across two elements: outer for virtualization positioning,
  // inner for DnD transform.
  const dndTransform = CSS.Transform.toString(transform);
  const innerStyle: CSSProperties = {
    transform: dndTransform || undefined,
    transition: transition || undefined,
    zIndex: isDragging ? 2 : undefined,
    willChange: isDragging ? "transform" : undefined,
  };

  return (
    <div
      style={outerStyle}
      {...(ariaAttributes ?? {})}
      className="box-border px-0 pb-2"
    >
      <div ref={setNodeRef} style={innerStyle}>
        <RowCard
          item={item}
          index={index}
          isActive={isActive}
          isHighlighted={isHighlighted}
          clipDurationLabel={clipDurationLabel}
          formatSeconds={formatSeconds}
          onSelect={onSelect}
          onRemove={onRemove}
          dimmed={isDragging}
          dndHandle={
            <span
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="mr-1 inline-flex h-12 w-5 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 text-[10px] text-[var(--mc-text-muted)] cursor-grab active:cursor-grabbing"
              title="Drag"
              aria-label="Drag"
            >
              ::
            </span>
          }
        />
      </div>
    </div>
  );
};

const OverlayCard = ({
  item,
  index,
  clipDurationLabel,
  formatSeconds,
}: {
  item: PlaylistItemView;
  index: number;
  clipDurationLabel: string;
  formatSeconds: (value: number) => string;
}) => (
  <div className="pointer-events-none">
    <div className="origin-top-left scale-[1.02] shadow-[0_18px_44px_-28px_rgba(0,0,0,0.9)]">
      <RowCard
        item={item}
        index={index}
        isActive={true}
        isHighlighted={false}
        clipDurationLabel={clipDurationLabel}
        formatSeconds={formatSeconds}
        dndHandle={
          <span className="mr-1 inline-flex h-12 w-5 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--mc-accent)]/70 bg-[var(--mc-surface-strong)]/70 text-[10px] text-[var(--mc-text)] shadow-[0_0_0_1px_rgba(245,158,11,0.35)]">
            ::
          </span>
        }
      />
    </div>
  </div>
);

const PlaylistListPanel = ({
  items,
  selectedIndex,
  onSelect,
  onRemove,
  onReorder,
  listRef,
  highlightIndex,
  clipDurationLabel,
  formatSeconds,
  onAddSingleToggle,
  singleTrackOpen,
  singleTrackUrl,
  singleTrackTitle,
  singleTrackAnswer,
  singleTrackError,
  singleTrackLoading,
  isDuplicate,
  canEditSingleMeta,
  onSingleTrackUrlChange,
  onSingleTrackTitleChange,
  onSingleTrackAnswerChange,
  onSingleTrackCancel,
  onAddSingle,
}: PlaylistListPanelProps) => {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const itemIds = useMemo(
    () => safeItems.map((item) => item.localId),
    [safeItems],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [skipRemoveConfirm, setSkipRemoveConfirm] = useState(false);
  const [pendingSkipRemoveConfirm, setPendingSkipRemoveConfirm] =
    useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Prevent accidental drags from minor pointer movements.
      activationConstraint: { distance: 6 },
    }),
  );

  const activeIndex = activeId ? itemIds.indexOf(activeId) : -1;
  const activeItem = activeIndex >= 0 ? safeItems[activeIndex] : null;
  const pendingRemoveItem = pendingRemoveId
    ? (safeItems.find((item) => item.localId === pendingRemoveId) ?? null)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }
    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
      const reordered = arrayMove(itemIds, oldIndex, newIndex);
      const nextIndex = reordered.indexOf(String(active.id));
      onReorder(oldIndex, nextIndex);
    }
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleRequestRemove = useCallback(
    (index: number) => {
      const target = safeItems[index];
      if (!target) return;
      if (skipRemoveConfirm) {
        onRemove(index);
        return;
      }
      setPendingSkipRemoveConfirm(skipRemoveConfirm);
      setPendingRemoveId(target.localId);
    },
    [onRemove, safeItems, skipRemoveConfirm],
  );

  const handleConfirmRemove = useCallback(() => {
    if (!pendingRemoveId) return;
    const targetIndex = safeItems.findIndex(
      (item) => item.localId === pendingRemoveId,
    );
    setSkipRemoveConfirm(pendingSkipRemoveConfirm);
    setPendingRemoveId(null);
    if (targetIndex >= 0) {
      onRemove(targetIndex);
    }
  }, [onRemove, pendingRemoveId, pendingSkipRemoveConfirm, safeItems]);

  const [listApi, setListApi] = useListCallbackRef(null);

  useEffect(() => {
    listRef.current = listApi?.element ?? null;
  }, [listApi, listRef]);

  useEffect(() => {
    if (highlightIndex === null) return;
    if (highlightIndex < 0 || highlightIndex >= safeItems.length) return;
    listApi?.scrollToRow({
      index: highlightIndex,
      align: "center",
      behavior: "smooth",
    });
  }, [highlightIndex, listApi, safeItems.length]);

  type VirtualRowProps = {
    items: PlaylistItemView[];
    selectedIndex: number;
    highlightIndex: number | null;
    clipDurationLabel: string;
    formatSeconds: (value: number) => string;
    onSelect: (index: number) => void;
    onRemove: (index: number) => void;
  };

  // Row height is (card ~64px) + (pb-2 = 8px).
  const ROW_HEIGHT = 72;

  const Row = useCallback(
    ({
      ariaAttributes,
      index,
      style,
      items,
      selectedIndex,
      highlightIndex,
      clipDurationLabel,
      formatSeconds,
      onSelect,
      onRemove,
    }: {
      ariaAttributes: {
        "aria-posinset": number;
        "aria-setsize": number;
        role: "listitem";
      };
      index: number;
      style: CSSProperties;
    } & VirtualRowProps) => {
      const item = items[index];
      if (!item) return <div style={style} />;
      return (
        <SortableRow
          ariaAttributes={ariaAttributes}
          item={item}
          index={index}
          isActive={index === selectedIndex}
          isHighlighted={highlightIndex === index}
          clipDurationLabel={clipDurationLabel}
          formatSeconds={formatSeconds}
          onSelect={onSelect}
          onRemove={onRemove}
          outerStyle={style}
        />
      );
    },
    [],
  );

  return (
    <div className="space-y-2 lg:sticky self-start">
      <div className="flex items-center justify-between text-[11px] text-[var(--mc-text-muted)] px-2">
        <span className="uppercase tracking-[0.22em]">播放清單</span>
        <span>{items.length} 題</span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={onAddSingleToggle}
          className={`w-full rounded-xl border border-dashed px-3 py-3 text-left text-[12px] text-[var(--mc-text-muted)] transition-colors ${
            singleTrackOpen
              ? "border-[var(--mc-accent)]/60 bg-[var(--mc-surface-strong)] opacity-60"
              : "border-[var(--mc-border)] bg-[var(--mc-surface)]/60 hover:border-[var(--mc-accent)]/60"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg text-[var(--mc-text)]">+</span>
            <span>Add a single track</span>
          </div>
        </button>

        <div
          className={`absolute left-0 top-0 z-20 w-full rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)] p-4 shadow-[0_16px_36px_-20px_rgba(0,0,0,0.8)] transition-all duration-200 ease-out ${
            singleTrackOpen
              ? "opacity-100 scale-100"
              : "pointer-events-none opacity-0 scale-95"
          }`}
          aria-hidden={!singleTrackOpen}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--mc-text-muted)]">
              Paste a YouTube link
            </div>
            <button
              type="button"
              onClick={onSingleTrackCancel}
              className="inline-flex items-center rounded-full border border-[var(--mc-border)] px-2 py-0.5 text-[10px] text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
            >
              Close
            </button>
          </div>
          <div className="mt-2 space-y-2">
            <div className="relative">
              <input
                value={singleTrackUrl}
                onChange={(event) => onSingleTrackUrlChange(event.target.value)}
                placeholder="YouTube link"
                aria-invalid={isDuplicate}
                className={`w-full rounded-lg border bg-[var(--mc-surface)] px-2.5 py-2 text-xs text-[var(--mc-text)] transition-colors ${
                  isDuplicate
                    ? "border-rose-400/70 text-rose-100 placeholder:text-rose-200/70 focus:border-rose-400"
                    : "border-[var(--mc-border)]"
                }`}
              />
              {isDuplicate && (
                <div className="absolute left-0 top-full z-20 mt-1 rounded-md border border-rose-400/40 bg-rose-950/90 px-2 py-1 text-[10px] text-rose-100 shadow">
                  This video is already in the list.
                </div>
              )}
            </div>
            <input
              value={singleTrackTitle}
              onChange={(event) => onSingleTrackTitleChange(event.target.value)}
              placeholder="Track title"
              disabled={!canEditSingleMeta}
              className="w-full rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface)] px-2 py-1.5 text-xs text-[var(--mc-text)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <input
              value={singleTrackAnswer}
              onChange={(event) =>
                onSingleTrackAnswerChange(event.target.value)
              }
              placeholder="Answer"
              disabled={!canEditSingleMeta}
              className="w-full rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface)] px-2 py-1.5 text-xs text-[var(--mc-text)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          {singleTrackError && (
            <div className="mt-2 text-[11px] text-rose-300">
              {singleTrackError}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onAddSingle}
              disabled={isDuplicate}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--mc-accent)] px-3 py-1.5 text-[11px] font-semibold text-[#1a1207] hover:bg-[var(--mc-accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add
            </button>
            {singleTrackLoading && (
              <span className="text-[11px] text-[var(--mc-text-muted)]">
                Loading...
              </span>
            )}
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        autoScroll={{
          enabled: true,
          activator: AutoScrollActivator.Pointer,
          // Keep auto-scroll constrained to the virtual list scroller.
          canScroll: (element) => element === listApi?.element,
          // Default is 0.2/0.2; tweak slightly for a smoother "edge scroll" feel.
          threshold: { x: 0.15, y: 0.22 },
          acceleration: 14,
          interval: 5,
        }}
        measuring={{
          // With virtualization, droppables mount/unmount and their rects can be stale.
          droppable: { strategy: MeasuringStrategy.Always },
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="h-[calc(100svh-420px)] lg:h-[calc(100vh-300px)]">
            <List<VirtualRowProps>
              listRef={setListApi}
              className="h-full overflow-y-auto pr-1"
              defaultHeight={420}
              rowCount={safeItems.length}
              rowHeight={ROW_HEIGHT}
              overscanCount={6}
              rowComponent={Row}
              rowProps={{
                items: safeItems,
                selectedIndex,
                highlightIndex,
                clipDurationLabel,
                formatSeconds,
                onSelect,
                onRemove: handleRequestRemove,
              }}
              style={{ height: "100%" }}
            />
          </div>
        </SortableContext>

        {typeof document !== "undefined"
          ? createPortal(
              <DragOverlay adjustScale>
                {activeItem ? (
                  <OverlayCard
                    item={activeItem}
                    index={activeIndex}
                    clipDurationLabel={clipDurationLabel}
                    formatSeconds={formatSeconds}
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>
      <ConfirmDialog
        open={Boolean(pendingRemoveId)}
        title="確認刪除題目"
        description={
          pendingRemoveItem
            ? `確定要刪除「${pendingRemoveItem.title || "未命名"}」嗎？`
            : "確定要刪除這個題目嗎？"
        }
        confirmLabel="刪除"
        extraContent={
          <div className="mt-3">
            <FormControlLabel
              control={
                <Checkbox
                  checked={pendingSkipRemoveConfirm}
                  onChange={(event) =>
                    setPendingSkipRemoveConfirm(event.target.checked)
                  }
                  size="small"
                />
              }
              label="本次編輯期間不再提示"
              className="text-[var(--mc-text-muted)]"
            />
          </div>
        }
        onConfirm={handleConfirmRemove}
        onCancel={() => {
          setPendingRemoveId(null);
          setPendingSkipRemoveConfirm(skipRemoveConfirm);
        }}
      />
    </div>
  );
};

export default memo(PlaylistListPanel);
