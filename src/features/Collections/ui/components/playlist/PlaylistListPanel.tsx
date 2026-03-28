import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
} from "@mui/material";

import {
  DndContext,
  DragOverlay,
  AutoScrollActivator,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import Close from "@mui/icons-material/Close";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import LibraryMusic from "@mui/icons-material/LibraryMusic";
import SearchRounded from "@mui/icons-material/SearchRounded";
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
  answerText?: string;
  uploader?: string;
  duration?: string;
  startSec: number;
  endSec: number;
  thumbnail?: string;
  answerStatus?: "original" | "ai_modified" | "manual_reviewed";
  answerAiProvider?: "grok" | "perplexity" | "chatgpt" | null;
  answerAiUpdatedAt?: number | null;
  answerAiBatchKey?: string | null;
};

type PlaylistFilterMode = "all" | "ai" | "manual" | "untouched";
type SortableBindings = ReturnType<typeof useSortable>;

const NoChangeIcon = ({
  active = false,
  showQuestion = true,
}: {
  active?: boolean;
  showQuestion?: boolean;
}) => (
  <span className="relative inline-flex h-6 w-6 items-center justify-center">
    <CheckCircleOutlineRounded sx={{ fontSize: 16 }} />
    {showQuestion ? (
      <span
        className={`absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
          active
            ? "bg-emerald-400 text-slate-950"
            : "bg-slate-800 text-emerald-200"
        }`}
      >
        <HelpOutlineRounded sx={{ fontSize: 10 }} />
      </span>
    ) : null}
  </span>
);

const ManualReviewedIcon = () => (
  <span className="inline-flex h-6 w-6 items-center justify-center">
    <CheckCircleOutlineRounded sx={{ fontSize: 16 }} />
  </span>
);

type PlaylistListPanelProps = {
  items: PlaylistItemView[];
  maxItems: number | null;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onToggleNoChange: (index: number) => void;
  listRef: RefObject<HTMLDivElement | null>;
  highlightIndex: number | null;
  clipDurationLabel: string;
  formatSeconds: (value: number) => string;
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
  onToggleNoChange: (index: number) => void;
  totalCount: number;
  outerStyle?: CSSProperties;
  canDrag?: boolean;
  showQuestionForNoChange?: boolean;
  isTouchDevice?: boolean;
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
  onToggleNoChange,
  totalCount,
  dimmed,
  dragAttributes,
  dragListeners,
  showQuestionForNoChange,
  isTouchDevice,
}: {
  item: PlaylistItemView;
  index: number;
  isActive: boolean;
  isHighlighted: boolean;
  clipDurationLabel: string;
  formatSeconds: (value: number) => string;
  onSelect?: (index: number) => void;
  onRemove?: (index: number) => void;
  onToggleNoChange?: (index: number) => void;
  totalCount?: number;
  dimmed?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SortableBindings["listeners"];
  showQuestionForNoChange?: boolean;
  isTouchDevice?: boolean;
}) => {
  const isMarkedNoChange =
    item.answerStatus === "manual_reviewed" &&
    (item.answerText ?? "") === (item.title ?? "");
  const canMarkNoChange = item.answerStatus === "original";

  return (
    <div
      {...(isTouchDevice ? {} : (dragAttributes ?? {}))}
      {...(isTouchDevice ? {} : (dragListeners ?? {}))}
      onClick={onSelect ? () => onSelect(index) : undefined}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(index);
        }
      }}
      className={`relative flex min-h-[84px] cursor-pointer items-stretch overflow-hidden text-left transition-[background-color,box-shadow,transform,opacity] duration-150 ${
        isActive
          ? "bg-[rgba(255,255,255,0.11)]"
          : "bg-[var(--mc-surface)]/55 hover:bg-[rgba(255,255,255,0.13)]"
      } ${
        isHighlighted ? "shadow-[inset_0_0_0_1px_rgba(245,158,11,0.45)]" : ""
      } ${dimmed ? "opacity-35" : ""}`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div
        className={`relative flex shrink-0 self-stretch items-stretch p-2 ${
          isTouchDevice ? "w-24" : "w-20"
        }`}
      >
        {dragListeners && isTouchDevice ? (
          <button
            type="button"
            {...(dragAttributes ?? {})}
            {...(dragListeners ?? {})}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className="mr-2 inline-flex w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--mc-surface-strong)]/60 text-[var(--mc-text)] transition active:scale-95"
            aria-label="拖曳排序"
            title="按住拖曳排序"
          >
            <DragIndicatorRounded sx={{ fontSize: 18 }} />
          </button>
        ) : null}
        <span
          className={`absolute top-1 rounded bg-[var(--mc-surface)]/80 px-1 py-0.5 text-[9px] text-[var(--mc-text)] ${
            isTouchDevice ? "left-8" : "left-1"
          }`}
        >
          {index + 1}
        </span>
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="h-full w-full rounded-lg object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-500">
            -
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 pr-12">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] text-[var(--mc-text)]">
            {item.title}
          </div>
          <div className="mt-1 text-[11px] text-[var(--mc-text-muted)]">
            {item.duration ?? "--:--"} - {clipDurationLabel}{" "}
            {formatSeconds(Math.max(0, item.endSec - item.startSec))}
          </div>
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/8 text-rose-200 transition-all duration-150 hover:bg-rose-500/18 hover:text-rose-100 active:scale-95"
          aria-label="Delete"
        >
          <Close sx={{ fontSize: 14 }} />
        </button>
      )}
      {item.answerStatus === "ai_modified" && (
        <span
          className="absolute bottom-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-cyan-200 transition-all duration-150 hover:text-cyan-100 hover:drop-shadow-[0_0_6px_rgba(103,232,249,0.55)]"
          title="AI 已修改"
          aria-label="AI 已修改"
        >
          <AutoFixHighOutlined sx={{ fontSize: 14 }} />
        </span>
      )}
      {isMarkedNoChange && (
        <span
          className="absolute bottom-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-emerald-200 transition-all duration-150 hover:text-emerald-100 hover:drop-shadow-[0_0_6px_rgba(74,222,128,0.45)]"
          title="已標記為無需修改"
          aria-label="已標記為無需修改"
        >
          <NoChangeIcon
            active
            showQuestion={showQuestionForNoChange !== false}
          />
        </span>
      )}
      {item.answerStatus === "manual_reviewed" && !isMarkedNoChange && (
        <span
          className="absolute bottom-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-emerald-200 transition-all duration-150 hover:text-emerald-100 hover:drop-shadow-[0_0_6px_rgba(74,222,128,0.45)]"
          title="已手動確認"
          aria-label="已手動確認"
        >
          <ManualReviewedIcon />
        </span>
      )}
      {canMarkNoChange && onToggleNoChange && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleNoChange(index);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          className="absolute bottom-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/30 bg-slate-950/85 text-emerald-200 transition-colors hover:border-emerald-300/55 hover:bg-emerald-500/10 hover:text-emerald-100"
          title="標記為無需修改"
          aria-label="標記為無需修改"
        >
          <NoChangeIcon showQuestion={showQuestionForNoChange !== false} />
        </button>
      )}
      {index < (totalCount ?? 0) - 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--mc-border)]/55" />
      )}
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
  onToggleNoChange,
  totalCount,
  outerStyle,
  canDrag,
  showQuestionForNoChange,
  isTouchDevice,
}: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.localId, disabled: !canDrag });

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
      className="box-border px-0"
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
          onToggleNoChange={onToggleNoChange}
          totalCount={totalCount}
          showQuestionForNoChange={showQuestionForNoChange}
          isTouchDevice={isTouchDevice}
          dimmed={isDragging}
          dragAttributes={canDrag ? attributes : undefined}
          dragListeners={canDrag ? listeners : undefined}
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
        totalCount={index + 1}
      />
    </div>
  </div>
);

const PlaylistListPanel = ({
  items,
  maxItems,
  selectedIndex,
  onSelect,
  onRemove,
  onReorder,
  onToggleNoChange,
  listRef,
  highlightIndex,
  clipDurationLabel,
  formatSeconds,
}: PlaylistListPanelProps) => {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const itemIds = useMemo(
    () => safeItems.map((item) => item.localId),
    [safeItems],
  );
  const [filterMode, setFilterMode] = useState<PlaylistFilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const canReorder = filterMode === "all" && searchQuery.trim().length === 0;
  const [isTouchDevice, setIsTouchDevice] = useState(false);

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

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const hoverQuery = window.matchMedia("(hover: none)");
    const updateDeviceMode = () => {
      setIsTouchDevice(coarseQuery.matches || hoverQuery.matches);
    };

    updateDeviceMode();
    coarseQuery.addEventListener("change", updateDeviceMode);
    hoverQuery.addEventListener("change", updateDeviceMode);

    return () => {
      coarseQuery.removeEventListener("change", updateDeviceMode);
      hoverQuery.removeEventListener("change", updateDeviceMode);
    };
  }, []);

  const activeIndex = activeId ? itemIds.indexOf(activeId) : -1;
  const activeItem = activeIndex >= 0 ? safeItems[activeIndex] : null;
  const pendingRemoveItem = pendingRemoveId
    ? (safeItems.find((item) => item.localId === pendingRemoveId) ?? null)
    : null;
  const visibleIndexMap = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return safeItems.reduce<number[]>((result, item, index) => {
      const hasAiModification =
        item.answerStatus === "ai_modified" ||
        item.answerAiProvider != null ||
        item.answerAiUpdatedAt != null ||
        item.answerAiBatchKey != null;
      const hasManualModification = item.answerStatus === "manual_reviewed";

      if (filterMode === "ai" && !hasAiModification) return result;
      if (filterMode === "manual" && !hasManualModification) return result;
      if (
        filterMode === "untouched" &&
        (hasAiModification || hasManualModification)
      ) {
        return result;
      }
      if (normalizedQuery) {
        const haystacks = [
          item.title,
          item.answerText,
          item.uploader,
          item.duration,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();
        if (!haystacks.includes(normalizedQuery)) {
          return result;
        }
      }

      result.push(index);
      return result;
    }, []);
  }, [filterMode, safeItems, searchQuery]);
  const visibleItems = useMemo(
    () => visibleIndexMap.map((index) => safeItems[index]).filter(Boolean),
    [safeItems, visibleIndexMap],
  );
  const aiModifiedCount = useMemo(
    () =>
      safeItems.filter(
        (item) =>
          item.answerStatus === "ai_modified" ||
          item.answerAiProvider != null ||
          item.answerAiUpdatedAt != null ||
          item.answerAiBatchKey != null,
      ).length,
    [safeItems],
  );
  const manualModifiedCount = useMemo(
    () =>
      safeItems.filter((item) => item.answerStatus === "manual_reviewed")
        .length,
    [safeItems],
  );
  const untouchedCount = useMemo(
    () =>
      safeItems.filter(
        (item) =>
          item.answerStatus !== "manual_reviewed" &&
          item.answerStatus !== "ai_modified" &&
          item.answerAiProvider == null &&
          item.answerAiUpdatedAt == null &&
          item.answerAiBatchKey == null,
      ).length,
    [safeItems],
  );
  const visibleItemIds = useMemo(
    () => visibleItems.map((item) => item.localId),
    [visibleItems],
  );
  const visibleSelectedIndex = useMemo(
    () => visibleIndexMap.indexOf(selectedIndex),
    [selectedIndex, visibleIndexMap],
  );
  const visibleHighlightIndex = useMemo(
    () =>
      highlightIndex === null ? null : visibleIndexMap.indexOf(highlightIndex),
    [highlightIndex, visibleIndexMap],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }
    const oldVisibleIndex = visibleItemIds.indexOf(String(active.id));
    const newVisibleIndex = visibleItemIds.indexOf(String(over.id));
    if (
      oldVisibleIndex >= 0 &&
      newVisibleIndex >= 0 &&
      oldVisibleIndex !== newVisibleIndex
    ) {
      const reordered = arrayMove(
        visibleItemIds,
        oldVisibleIndex,
        newVisibleIndex,
      );
      const nextVisibleIndex = reordered.indexOf(String(active.id));
      const oldIndex = visibleIndexMap[oldVisibleIndex];
      const nextIndex = visibleIndexMap[nextVisibleIndex];
      if (oldIndex === undefined || nextIndex === undefined) {
        setActiveId(null);
        return;
      }
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
    if (visibleHighlightIndex === null || visibleHighlightIndex < 0) return;
    if (visibleHighlightIndex >= visibleItems.length) return;
    listApi?.scrollToRow({
      index: visibleHighlightIndex,
      align: "center",
      behavior: "smooth",
    });
  }, [listApi, visibleHighlightIndex, visibleItems.length]);

  type VirtualRowProps = {
    items: PlaylistItemView[];
    selectedIndex: number;
    highlightIndex: number | null;
    clipDurationLabel: string;
    formatSeconds: (value: number) => string;
    onSelect: (index: number) => void;
    onRemove: (index: number) => void;
    onToggleNoChange: (index: number) => void;
    totalCount: number;
    canDrag?: boolean;
    showQuestionForNoChange?: boolean;
    isTouchDevice?: boolean;
  };

  const ROW_HEIGHT = 84;

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
      onToggleNoChange,
      totalCount,
      canDrag,
      showQuestionForNoChange,
      isTouchDevice,
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
          onToggleNoChange={onToggleNoChange}
          totalCount={totalCount}
          outerStyle={style}
          canDrag={canDrag}
          showQuestionForNoChange={showQuestionForNoChange}
          isTouchDevice={isTouchDevice}
        />
      );
    },
    [],
  );

  return (
    <div className="space-y-2 lg:sticky self-start">
      <div className="px-1 py-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-base font-semibold text-[var(--mc-text)]">
                <LibraryMusic sx={{ fontSize: 18 }} />
                <span>
                  {visibleItems.length === items.length
                    ? `${items.length}`
                    : `${visibleItems.length} / ${items.length}`}
                </span>
              </span>
              <span className="inline-flex items-center rounded-full bg-[var(--mc-surface-strong)]/45 px-2 py-0.5 text-[11px] font-medium leading-none text-[var(--mc-text-muted)]">
                {maxItems === null ? "未限制上限" : `上限 ${maxItems} 題`}
              </span>
            </div>
          </div>
          <div className="flex w-full items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/55 px-3 py-1.5 text-[var(--mc-text)]">
              <SearchRounded sx={{ fontSize: 16 }} className="shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜尋歌曲、答案、上傳者"
                className="min-w-0 flex-1 bg-transparent text-base text-[var(--mc-text)] outline-none placeholder:text-[var(--mc-text-muted)] sm:text-[12px]"
              />
              <span className="h-5 w-px shrink-0 bg-[var(--mc-border)]/80" />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--mc-text-muted)] transition hover:bg-[var(--mc-surface)]/70 hover:text-[var(--mc-text)]"
                  aria-label="清除搜尋"
                >
                  <Close sx={{ fontSize: 12 }} />
                </button>
              ) : null}
              <FormControl
                size="small"
                className="shrink-0"
                sx={{
                  minWidth: 124,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "transparent",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "& .MuiSelect-select": {
                    display: "flex",
                    alignItems: "center",
                    minHeight: "auto",
                    padding: "0 24px 0 0",
                  },
                  "& .MuiSvgIcon-root": {
                    color: "var(--mc-text-muted)",
                  },
                }}
              >
                <Select
                  value={filterMode}
                  onChange={(event) =>
                    setFilterMode(event.target.value as PlaylistFilterMode)
                  }
                  displayEmpty
                  sx={{
                    color: "var(--mc-text)",
                    fontSize: {
                      xs: "16px",
                      sm: "12px",
                    },
                  }}
                >
                  <MenuItem value="all">{`全部 (${safeItems.length})`}</MenuItem>
                  <MenuItem value="ai">{`AI (${aiModifiedCount})`}</MenuItem>
                  <MenuItem value="manual">{`手動 (${manualModifiedCount})`}</MenuItem>
                  <MenuItem value="untouched">{`未修改 (${untouchedCount})`}</MenuItem>
                </Select>
              </FormControl>
            </label>
          </div>
        </div>
      </div>
      {!canReorder && (
        <div className="px-2 text-[11px] text-[var(--mc-text-muted)]">
          目前僅顯示符合篩選或搜尋條件的題目，已確認包含手動修改與「這題沒問題」標記；若要拖曳排序請先清除篩選與搜尋。
        </div>
      )}

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
        <SortableContext
          items={visibleItemIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="h-[calc(100svh-420px)] lg:h-[calc(100vh-300px)]">
            <List<VirtualRowProps>
              listRef={setListApi}
              className="collection-edit-scrollbar h-full overflow-y-auto pr-1"
              defaultHeight={420}
              rowCount={visibleItems.length}
              rowHeight={ROW_HEIGHT}
              overscanCount={6}
              rowComponent={Row}
              rowProps={{
                items: visibleItems,
                selectedIndex: visibleSelectedIndex,
                highlightIndex: visibleHighlightIndex,
                clipDurationLabel,
                formatSeconds,
                onSelect: (index) => {
                  const nextIndex = visibleIndexMap[index];
                  if (nextIndex !== undefined) onSelect(nextIndex);
                },
                onRemove: (index) => {
                  const nextIndex = visibleIndexMap[index];
                  if (nextIndex !== undefined) handleRequestRemove(nextIndex);
                },
                onToggleNoChange: (index) => {
                  const nextIndex = visibleIndexMap[index];
                  if (nextIndex !== undefined) onToggleNoChange(nextIndex);
                },
                totalCount: visibleItems.length,
                canDrag: canReorder,
                showQuestionForNoChange: filterMode !== "manual",
                isTouchDevice,
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
