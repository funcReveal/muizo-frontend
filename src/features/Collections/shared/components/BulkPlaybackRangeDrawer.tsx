import SiteTooltip from "@shared/ui/SiteTooltip";
import { motion, useReducedMotion } from "motion/react";
import CollectionToolDrawer from "./CollectionToolDrawer";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import {
  CircularProgress,
  IconButton,
  Popover,
  Slider,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { List, type RowComponentProps } from "react-window";

import type {
  BulkPlaybackDraft,
  BulkPlaybackPreviewItem,
} from "../model/bulkPlaybackRange";

type BulkPlaybackRangeDrawerProps = {
  open: boolean;
  draft: BulkPlaybackDraft;
  previewItems: BulkPlaybackPreviewItem[];
  affectedItems: BulkPlaybackPreviewItem[];
  canApply: boolean;
  isApplying?: boolean;
  applyProgress?: {
    completed: number;
    total: number;
    label?: string;
  } | null;
  applyLabel?: string;
  previewContent?: ReactNode;
  formatSeconds: (value: number) => string;
  onClose: () => void;
  onDraftChange: (draft: BulkPlaybackDraft) => void;
  onPreviewItem?: (id: string, startSec: number) => void;
  onApply: () => void;
};

type PreviewTab = "applies" | "shortened";

type PreviewRowProps = {
  items: BulkPlaybackPreviewItem[];
  isApplying: boolean;
  formatSeconds: (value: number) => string;
  onPreviewItem?: (id: string, startSec: number) => void;
};

const ROW_HEIGHT = 76;

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.75rem",
    backgroundColor: "var(--mc-surface-strong)",
    color: "var(--mc-text)",
    fontSize: "0.875rem",
    "& fieldset": {
      borderColor: "var(--mc-border)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(251, 191, 36, 0.45)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--mc-accent)",
    },
  },
  "& .MuiInputBase-input::placeholder": {
    color: "var(--mc-text-muted)",
    opacity: 0.75,
  },
  "& .MuiInputLabel-root": {
    color: "var(--mc-text-muted)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--mc-accent)",
  },
  "& .MuiSelect-icon": {
    color: "var(--mc-text-muted)",
  },
};

const labelSlotProps = {
  inputLabel: { shrink: true },
};

const modeButtonClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs transition-colors ${
    active
      ? "border-[var(--mc-accent)]/70 bg-[var(--mc-accent)]/18 text-[var(--mc-text)]"
      : "border-[var(--mc-border)] bg-[var(--mc-surface)]/55 text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
  }`;

const splitTimeInput = (value: string) => {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return { minutes: Math.max(0, parts[0]), seconds: Math.max(0, parts[1]) };
  }
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return {
      minutes: Math.max(0, parts[0] * 60 + parts[1]),
      seconds: Math.max(0, parts[2]),
    };
  }
  const raw = Number(value);
  if (Number.isFinite(raw)) {
    return { minutes: Math.max(0, Math.floor(raw / 60)), seconds: raw % 60 };
  }
  return { minutes: 0, seconds: 0 };
};

const buildTimeInput = (minutes: number, seconds: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes || 0));
  const safeSeconds = Math.min(59, Math.max(0, Math.floor(seconds || 0)));
  return `${safeMinutes}:${String(safeSeconds).padStart(2, "0")}`;
};

const buildMinuteOptions = (selectedMinute: number, maxDurationSec: number) => {
  const maxMinute = Math.max(selectedMinute, Math.floor(maxDurationSec / 60));
  return Array.from({ length: maxMinute + 1 }, (_item, index) => index);
};

function TimeWheelColumn({
  label,
  options,
  value,
  suffix,
  onSelect,
}: {
  label: string;
  options: number[];
  value: number;
  suffix: string;
  onSelect: (value: number) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);
  const skipNextAutoCenterRef = useRef(false);

  useEffect(() => {
    if (skipNextAutoCenterRef.current) {
      skipNextAutoCenterRef.current = false;
      return;
    }
    programmaticScrollRef.current = true;
    selectedRef.current?.scrollIntoView({
      block: "center",
      behavior: "auto",
    });
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 0);
  }, [value]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    if (programmaticScrollRef.current) return;
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const nextIndex = Math.min(
        options.length - 1,
        Math.max(0, Math.round(scrollElement.scrollTop / 36)),
      );
      const nextValue = options[nextIndex];
      if (typeof nextValue === "number" && nextValue !== value) {
        skipNextAutoCenterRef.current = true;
        onSelect(nextValue);
      }
    });
  };

  return (
    <div className="min-w-0">
      <div className="mb-1 text-center text-[11px] font-semibold text-[var(--mc-text-muted)]">
        {label}
      </div>
      <div className="relative h-36 overflow-hidden rounded-xl bg-[var(--mc-surface-strong)]">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-9 -translate-y-1/2 border-y border-[var(--mc-accent)]/35 bg-[var(--mc-accent)]/8" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-[#111821] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[#111821] to-transparent" />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full snap-y snap-mandatory overflow-y-auto px-1 py-[54px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {options.map((option) => {
            const active = option === value;
            return (
              <button
                key={option}
                ref={active ? selectedRef : undefined}
                type="button"
                onClick={() => onSelect(option)}
                className={`flex h-9 w-full snap-center snap-always items-center justify-center rounded-lg text-sm transition ${
                  active
                    ? "font-semibold text-[var(--mc-text)]"
                    : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                }`}
              >
                {String(option).padStart(2, "0")}
                <span className="ml-1 text-[10px] opacity-70">{suffix}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MinuteSecondInput({
  label,
  value,
  disabled,
  onChange,
  maxDurationSec,
  quickPresetsSec,
  recommendedPresetSec,
  helperText,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  maxDurationSec: number;
  quickPresetsSec?: number[];
  recommendedPresetSec?: number;
  helperText?: string;
}) {
  const time = splitTimeInput(value);
  const iconAnchorRef = useRef<HTMLSpanElement | null>(null);
  const [pickerAnchorEl, setPickerAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftTime, setDraftTime] = useState(time);
  const minuteOptions = useMemo(
    () => buildMinuteOptions(draftTime.minutes, maxDurationSec),
    [draftTime.minutes, maxDurationSec],
  );
  const secondOptions = useMemo(
    () => Array.from({ length: 60 }, (_item, index) => index),
    [],
  );
  const buildBoundedTime = useCallback(
    (minutes: number, seconds: number) => {
      const rawTotalSec =
        Math.max(0, Math.floor(minutes || 0)) * 60 +
        Math.min(59, Math.max(0, Math.floor(seconds || 0)));
      const boundedTotalSec = Math.min(
        Math.max(0, maxDurationSec),
        rawTotalSec,
      );
      return {
        minutes: Math.floor(boundedTotalSec / 60),
        seconds: boundedTotalSec % 60,
      };
    },
    [maxDurationSec],
  );
  const buildBoundedTimeInput = useCallback(
    (minutes: number, seconds: number) => {
      const boundedTime = buildBoundedTime(minutes, seconds);
      return buildTimeInput(boundedTime.minutes, boundedTime.seconds);
    },
    [buildBoundedTime],
  );
  const buildBoundedTotalTimeInput = useCallback(
    (totalSeconds: number) =>
      buildBoundedTimeInput(
        Math.floor(Math.max(0, totalSeconds) / 60),
        Math.max(0, totalSeconds) % 60,
      ),
    [buildBoundedTimeInput],
  );
  const commitDraft = useCallback(() => {
    onChange(buildBoundedTimeInput(draftTime.minutes, draftTime.seconds));
  }, [buildBoundedTimeInput, draftTime.minutes, draftTime.seconds, onChange]);

  const closePicker = useCallback(() => {
    commitDraft();
    setPickerOpen(false);
    setPickerAnchorEl(null);
  }, [commitDraft]);

  const updateDraftTime = useCallback(
    (minutes: number, seconds: number) => {
      setDraftTime(buildBoundedTime(minutes, seconds));
    },
    [buildBoundedTime],
  );

  const handleTogglePicker = () => {
    if (pickerOpen) {
      closePicker();
      return;
    }
    setDraftTime(time);
    setPickerOpen(true);
  };

  const handleDonePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
  };

  const handleDoneClick = () => {
    closePicker();
  };

  const committedLabel = buildTimeInput(time.minutes, time.seconds);
  const draftLabel = buildTimeInput(draftTime.minutes, draftTime.seconds);

  return (
    <div className="relative min-w-0 flex-1">
      <div className="mb-1 text-[11px] font-semibold text-[var(--mc-text-muted)]">
        {label}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setPickerAnchorEl(iconAnchorRef.current);
          handleTogglePicker();
        }}
        className="flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl bg-[var(--mc-surface-strong)] px-3 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`${label} 分秒選擇器`}
        aria-expanded={pickerOpen}
        aria-haspopup="dialog"
      >
        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--mc-text)]">
          {committedLabel}
        </span>
        <span
          ref={iconAnchorRef}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <AccessTimeRounded
            sx={{ fontSize: 26, color: "var(--mc-text-muted)" }}
          />
        </span>
      </button>
      <Popover
        sx={{ zIndex: 1800 }}
        open={pickerOpen}
        anchorEl={pickerAnchorEl}
        onClose={closePicker}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 256,
              borderRadius: "1rem",
              border: "1px solid var(--mc-border)",
              backgroundColor: "#20221d",
              color: "var(--mc-text)",
              boxShadow: "0 25px 50px -20px rgba(0,0,0,0.85)",
              overflow: "hidden",
            },
          },
        }}
      >
        <div
          className="p-3"
          role="dialog"
          aria-label={`${label}分秒設定`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-2">
            <TimeWheelColumn
              label="分鐘"
              options={minuteOptions}
              value={draftTime.minutes}
              suffix="分"
              onSelect={(minute) => updateDraftTime(minute, draftTime.seconds)}
            />
            <TimeWheelColumn
              label="秒鐘"
              options={secondOptions}
              value={draftTime.seconds}
              suffix="秒"
              onSelect={(second) => updateDraftTime(draftTime.minutes, second)}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--mc-border)]/70 pt-3">
            <span className="font-mono text-sm font-semibold tabular-nums text-[var(--mc-text)]">
              {draftLabel}
            </span>
            <button
              type="button"
              onPointerDown={handleDonePointerDown}
              onClick={handleDoneClick}
              className="inline-flex h-8 items-center justify-center rounded-full bg-[var(--mc-accent)] px-3 text-xs font-semibold text-slate-950 transition hover:brightness-110"
            >
              完成
            </button>
          </div>
        </div>
      </Popover>
      {quickPresetsSec?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quickPresetsSec.map((presetSec) => {
            const active =
              time.minutes * 60 + time.seconds ===
              Math.min(Math.max(0, maxDurationSec), presetSec);
            const recommended = presetSec === recommendedPresetSec;
            return (
              <button
                key={presetSec}
                type="button"
                disabled={disabled}
                onClick={() => onChange(buildBoundedTotalTimeInput(presetSec))}
                className={`relative inline-flex h-8 items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold transition ${
                  active
                    ? "border-[var(--mc-accent)] bg-[var(--mc-accent)]/22 text-[var(--mc-text)]"
                    : "border-[var(--mc-border)] bg-[var(--mc-surface)]/45 text-[var(--mc-text-muted)] hover:border-[var(--mc-accent)]/60 hover:text-[var(--mc-text)]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {presetSec >= 60
                  ? `${Math.floor(presetSec / 60)}:${String(presetSec % 60).padStart(2, "0")}`
                  : `${presetSec}秒`}
                {recommended ? (
                  <span className="ml-1 rounded-full bg-[var(--mc-accent)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-950">
                    推薦
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {helperText ? (
        <div className="mt-1.5 text-[11px] leading-4 text-[var(--mc-text-muted)]">
          {helperText}
        </div>
      ) : null}
    </div>
  );
}

const PreviewVirtualRow = ({
  index,
  style,
  items,
  isApplying,
  formatSeconds,
  onPreviewItem,
}: RowComponentProps<PreviewRowProps>) => {
  const item = items[index];
  if (!item) return <div style={style} />;

  return (
    <div style={style} className="px-1">
      <div className="flex h-full items-center gap-3 border-b border-[var(--mc-border)]/70 px-2 py-2">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="h-12 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="h-12 w-16 shrink-0 rounded-lg bg-[var(--mc-surface-strong)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
            {item.title}
          </div>
          <div className="mt-0.5 truncate text-xs text-[var(--mc-text-muted)]">
            {item.uploader || "Unknown"} · {formatSeconds(item.startSec)} -{" "}
            {formatSeconds(item.endSec)}
            {item.isShortened
              ? ` · 縮短為 ${formatSeconds(item.clipLengthSec)}`
              : ""}
          </div>
        </div>
        {onPreviewItem ? (
          <SiteTooltip title="預覽此曲目">
            <button
              type="button"
              disabled={isApplying}
              onClick={() => onPreviewItem(item.id, item.startSec)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 text-[var(--mc-text)] transition hover:border-[var(--mc-accent)]/70 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`預覽 ${item.title}`}
            >
              <PlayArrowRounded fontSize="small" />
            </button>
          </SiteTooltip>
        ) : null}
      </div>
    </div>
  );
};

export default function BulkPlaybackRangeDrawer({
  open,
  draft,
  previewItems,
  affectedItems,
  canApply,
  isApplying = false,
  applyProgress = null,
  applyLabel = "套用到全部曲目",
  previewContent,
  formatSeconds,
  onClose,
  onDraftChange,
  onPreviewItem,
  onApply,
}: BulkPlaybackRangeDrawerProps) {
  const isCompact = useMediaQuery("(max-width: 767px)");
  const reduce = useReducedMotion();
  const sample = previewItems[0];
  const [previewTab, setPreviewTab] = useState<PreviewTab>("applies");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const appliesItems = useMemo(
    () => previewItems.filter((item) => !item.isShortened),
    [previewItems],
  );
  const shortenedItems = useMemo(
    () => previewItems.filter((item) => item.isShortened),
    [previewItems],
  );
  const maxDurationSec = useMemo(
    () =>
      Math.max(
        60,
        ...previewItems.map((item) =>
          Number.isFinite(item.durationSec) ? item.durationSec : 0,
        ),
      ),
    [previewItems],
  );
  const activePreviewItems =
    previewTab === "shortened" ? shortenedItems : appliesItems;
  const activeRowProps = useMemo<PreviewRowProps>(
    () => ({
      items: activePreviewItems,
      isApplying,
      formatSeconds,
      onPreviewItem: onPreviewItem
        ? (id, startSec) => {
            onPreviewItem(id, startSec);
            if (isCompact && previewContent) {
              setMobilePreviewOpen(true);
            }
          }
        : undefined,
    }),
    [
      activePreviewItems,
      formatSeconds,
      isApplying,
      isCompact,
      onPreviewItem,
      previewContent,
    ],
  );
  const listHeight = Math.min(
    isCompact ? 340 : 420,
    Math.max(180, activePreviewItems.length * ROW_HEIGHT),
  );
  const progressPercent =
    applyProgress && applyProgress.total > 0
      ? Math.min(
          100,
          Math.round((applyProgress.completed / applyProgress.total) * 100),
        )
      : 0;
  const isWritingProgress = applyProgress?.label?.includes("寫入") ?? false;
  const applyButtonLabel =
    isApplying && applyProgress
      ? isWritingProgress
        ? `${applyProgress.label ?? "正在寫入資料庫"}，等待確認`
        : `${applyProgress.label ?? "正在套用"} · ${applyProgress.completed}/${applyProgress.total} · ${progressPercent}%`
      : isApplying
        ? "正在套用，請稍候"
        : applyLabel;

  return (
    <>
      <CollectionToolDrawer
        open={open}
        onClose={onClose}
        label="播放片段"
        width={940}
        busy={isApplying}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="border-b border-[var(--mc-border)]/80 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-[var(--mc-text)]">
                  批量修改播放區間
                </div>
              </div>
              <IconButton
                aria-label="關閉批量修改播放區間"
                onClick={onClose}
                disabled={isApplying}
                size="small"
                sx={{
                  color: "var(--mc-text-muted)",
                  "&:hover": {
                    color: "var(--mc-text)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                  },
                }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </div>
          </header>

          <main
            className={`grid min-h-0 flex-1 gap-0 overflow-hidden ${
              previewContent && !isCompact
                ? "md:grid-cols-[420px_minmax(0,1fr)]"
                : ""
            }`}
          >
            {previewContent && !isCompact ? (
              <aside className="min-h-0 border-r border-[var(--mc-border)]/70 p-4">
                {previewContent}
              </aside>
            ) : null}
            <div
              className="tool-playback-body flex min-h-0 flex-col px-5 py-4"
              data-has-player={Boolean(previewContent)}
            >
              <section className="shrink-0 space-y-4">
                {sample && (
                  <div className="tool-timeline-preview">
                    <div>
                      <span>片段位置</span>
                      <strong>
                        {formatSeconds(sample.startSec)} —{" "}
                        {formatSeconds(sample.endSec)}
                      </strong>
                    </div>
                    <div
                      className="tool-timeline"
                      aria-label={`第一首歌曲播放片段 ${formatSeconds(sample.startSec)} 至 ${formatSeconds(sample.endSec)}`}
                    >
                      <div className="tool-waveform" aria-hidden="true">
                        {Array.from({ length: 48 }, (_, index) => (
                          <i
                            key={index}
                            style={{ height: `${24 + ((index * 37) % 73)}%` }}
                          />
                        ))}
                      </div>
                      <motion.div
                        className="tool-timeline-range"
                        initial={false}
                        animate={{
                          left: `${(sample.startSec / sample.durationSec) * 100}%`,
                          width: `${(sample.clipLengthSec / sample.durationSec) * 100}%`,
                        }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 270, damping: 30 }
                        }
                      />
                    </div>
                    <p>{sample.title}</p>
                  </div>
                )}
                <div className="tool-mode-switch">
                  <button
                    type="button"
                    disabled={isApplying}
                    aria-pressed={draft.mode === "percent"}
                    onClick={() => onDraftChange({ ...draft, mode: "percent" })}
                    className={modeButtonClass(draft.mode === "percent")}
                  >
                    依歌曲百分比
                  </button>
                  <button
                    type="button"
                    disabled={isApplying}
                    aria-pressed={draft.mode === "fixed"}
                    onClick={() => onDraftChange({ ...draft, mode: "fixed" })}
                    className={modeButtonClass(draft.mode === "fixed")}
                  >
                    固定起始時間
                  </button>
                </div>

                {draft.mode === "percent" ? (
                  <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--mc-text)]">
                          每首從 {draft.percent}% 開始
                        </div>
                        <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                          適合略過前奏，依每首歌長度自動換算起點。
                        </div>
                      </div>
                      <TextField
                        label="百分比"
                        value={String(draft.percent)}
                        disabled={isApplying}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          onDraftChange({
                            ...draft,
                            percent: Number.isFinite(next)
                              ? Math.min(99, Math.max(0, next))
                              : draft.percent,
                          });
                        }}
                        type="number"
                        size="small"
                        sx={{ ...fieldSx, width: 104 }}
                        slotProps={labelSlotProps}
                      />
                    </div>
                    <Slider
                      aria-label="歌曲起點百分比"
                      value={draft.percent}
                      min={0}
                      max={99}
                      step={1}
                      disabled={isApplying}
                      onChange={(_, value) => {
                        if (typeof value !== "number") return;
                        onDraftChange({ ...draft, percent: value });
                      }}
                      sx={{
                        mt: 2,
                        color: "var(--mc-accent)",
                        "& .MuiSlider-rail": { opacity: 0.35 },
                        "& .MuiSlider-thumb": {
                          borderRadius: 1,
                          backgroundColor: "var(--mc-text)",
                        },
                      }}
                    />
                  </div>
                ) : null}

                <div className="flex flex-col gap-3">
                  {draft.mode === "fixed" ? (
                    <MinuteSecondInput
                      label="起始時間"
                      value={draft.startInput}
                      disabled={isApplying}
                      maxDurationSec={maxDurationSec}
                      onChange={(value) =>
                        onDraftChange({ ...draft, startInput: value })
                      }
                    />
                  ) : null}

                  <MinuteSecondInput
                    label="片段長度"
                    value={draft.clipLengthInput}
                    disabled={isApplying}
                    maxDurationSec={maxDurationSec}
                    quickPresetsSec={[15, 30, 45, 60]}
                    recommendedPresetSec={30}
                    helperText="片段長度會用作遊戲作答時間；30 秒通常不會太短或太長。"
                    onChange={(value) =>
                      onDraftChange({ ...draft, clipLengthInput: value })
                    }
                  />
                </div>
                {affectedItems.length > 0 ? (
                  <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <WarningAmberRounded
                        fontSize="small"
                        className="mt-0.5 text-amber-200"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-amber-100">
                          {affectedItems.length} 首會超出可播放長度
                        </div>
                        <div className="mt-1 text-xs leading-5 text-amber-100/80">
                          套用時會先自動收在歌曲結尾；這些曲目的片段會比設定短，建議逐首預覽後再微調。
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {affectedItems.slice(0, 4).map((item) => (
                            <span
                              key={item.id}
                              className="max-w-[210px] truncate rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-50"
                              title={item.title}
                            >
                              {item.title}
                            </span>
                          ))}
                          {affectedItems.length > 4 ? (
                            <span className="rounded-full border border-amber-300/30 px-2 py-1 text-[11px] text-amber-100/80">
                              +{affectedItems.length - 4}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="mt-5 flex min-h-0 flex-1 flex-col">
                <div className="mb-3 flex rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("applies")}
                    className={`min-w-0 flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      previewTab === "applies"
                        ? "bg-[var(--mc-accent)] text-slate-950"
                        : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                    }`}
                  >
                    可直接套用 · {appliesItems.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("shortened")}
                    className={`min-w-0 flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      previewTab === "shortened"
                        ? "bg-amber-300 text-slate-950"
                        : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
                    }`}
                  >
                    需額外調整 · {shortenedItems.length}
                  </button>
                </div>

                {activePreviewItems.length > 0 ? (
                  <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-[var(--mc-surface)]/35">
                    <List<PreviewRowProps>
                      style={{ height: listHeight, width: "100%" }}
                      rowCount={activePreviewItems.length}
                      rowHeight={ROW_HEIGHT}
                      rowProps={activeRowProps}
                      rowComponent={PreviewVirtualRow}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--mc-border)] px-3 py-5 text-center text-xs text-[var(--mc-text-muted)]">
                    {previewTab === "shortened"
                      ? "沒有需要額外調整的曲目。"
                      : "沒有可直接套用的曲目。"}
                  </div>
                )}
              </section>
            </div>
          </main>

          <footer className="border-t border-[var(--mc-border)]/80 px-5 py-4">
            <button
              type="button"
              onClick={onApply}
              disabled={!canApply || isApplying}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[var(--mc-surface-strong)] disabled:text-[var(--mc-text-muted)]"
            >
              {isApplying ? (
                <CircularProgress size={18} color="inherit" />
              ) : null}
              {applyButtonLabel}
            </button>
          </footer>
        </div>
      </CollectionToolDrawer>

      {previewContent ? (
        <CollectionToolDrawer
          open={isCompact && mobilePreviewOpen}
          onClose={() => setMobilePreviewOpen(false)}
          label="預覽播放器"
        >
          <div className="h-full overflow-y-auto p-3">
            <div className="mb-2 flex justify-end">
              <IconButton
                aria-label="關閉預覽播放器"
                onClick={() => setMobilePreviewOpen(false)}
                size="small"
                sx={{ color: "var(--mc-text-muted)" }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </div>
            {previewContent}
          </div>
        </CollectionToolDrawer>
      ) : null}
    </>
  );
}
