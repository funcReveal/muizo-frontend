import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  closestCenter,
  DragOverlay,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import BackspaceRounded from "@mui/icons-material/BackspaceRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DifferenceRounded from "@mui/icons-material/DifferenceRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import ContentPasteRounded from "@mui/icons-material/ContentPasteRounded";
import {
  Button,
  CircularProgress,
  Drawer,
  FormControlLabel,
  IconButton,
  Switch,
  useMediaQuery,
} from "@mui/material";
import { MuizoSelectField, MuizoTextField } from "../../../../../shared/ui/form";
import type {
  AiBatchWriteState,
  AiPromptSettings,
  AiPageStatus,
  AiPromptPage,
  AiAppliedBatchRecord,
  AiAppliedResultItem,
  NonIdleAiBatchWriteState,
} from "../../hooks/useCollectionEditAiBatch";

type Props = {
  open: boolean;
  onClose: () => void;
  aiProviderLabel: string;
  playlistItemsCount: number;

  aiPromptPages: AiPromptPage[];
  aiBatchPageIndex: number;
  onAiBatchPageChange: (pageIndex: number) => void;

  aiJsonDrafts: Record<number, string>;
  aiAppliedPages: Record<number, boolean>;
  aiAppliedBatchRecords: Record<number, AiAppliedBatchRecord>;
  currentAiJsonDraft: string;
  onCurrentAiJsonDraftChange: (value: string) => void;

  aiParsedResult: {
    error: string | null;
    updates: Array<{
      id: string;
      answerText: string;
    }>;
  };
  aiPreview: {
    missingIds: string[];
    unchangedIds: string[];
    changedItems: Array<{
      id: string;
      title: string;
      oldAnswer: string;
      newAnswer: string;
    }>;
  };
  aiPageStatuses: AiPageStatus[];

  aiPromptSettings: AiPromptSettings;
  onAiPromptSettingsChange: (patch: Partial<AiPromptSettings>) => void;
  onAiSplitFieldChange: (index: number, value: string) => void;
  onAddAiSplitField: () => void;
  onRemoveAiSplitField: (index: number) => void;
  onReorderAiSplitField: (fromIndex: number, toIndex: number) => void;
  aiPromptText: string;
  onCopyAiPrompt: () => Promise<void>;
  onOpenAiAssistant: () => Promise<void>;

  canApplyAiBatch: boolean;
  onApplyAiBatch: () => Promise<void>;

  aiBatchWriteState: AiBatchWriteState;
  pendingAiBatchSave: NonIdleAiBatchWriteState | null;
  canCloseAiBatchModal: boolean;
  aiBatchSaveProgressLabel: string;
  aiBatchSaveStepLabel: string;
  onRetryAiBatchWrite: () => Promise<void>;
  onBackToPreview: () => void;
};

const promptModeOptions: Array<{
  value: AiPromptSettings["mode"];
  label: string;
  description: string;
  hint: string;
}> = [
  {
    value: "official-title",
    label: "清理成曲名",
    description: "最常用",
    hint: "適合 YouTube 標題很長、含 MV/歌詞/live/集數時，把答案收成正式曲名。",
  },
  {
    value: "split-fields",
    label: "分隔欄位",
    description: "固定格式",
    hint: "適合想把答案統一成「歌手 - 曲名 - 作品名稱」這類可預期格式。",
  },
  {
    value: "custom",
    label: "自訂規則",
    description: "特殊題庫",
    hint: "適合動漫、VTuber、翻唱、遊戲歌等需要你自己補規則的題庫。",
  },
];

const languageModeHints: Record<AiPromptSettings["languageMode"], string> = {
  preserve: "不強制翻譯，日文歌名仍保留日文，英文歌名仍保留英文。",
  "zh-TW": "盡量產生繁體中文答案；官方原名很常見時可保留。",
  ja: "盡量產生日文答案；適合日文題庫或想統一日文表記。",
  en: "盡量產生英文答案；適合國際曲庫或英文房間。",
  ko: "盡量產生韓文答案；適合 K-pop 題庫。",
  custom: "用你輸入的語言規則，例如台灣常用譯名或原文加中文括號。",
};

const uncertainPolicyHints: Record<
  AiPromptSettings["uncertainPolicy"],
  string
> = {
  "keep-current": "保守模式，AI 不確定時不改答案，適合避免誤修。",
  "infer-from-title":
    "積極模式，AI 會從標題和上傳者推測，適合空答案或答案品質很差時。",
};

const languageOptions = [
  {
    value: "preserve",
    label: "跟隨原文",
    description: "不強制翻譯",
  },
  {
    value: "zh-TW",
    label: "繁體中文",
    description: "台灣常用答案",
  },
  {
    value: "ja",
    label: "日文",
    description: "統一日文表記",
  },
  {
    value: "en",
    label: "英文",
    description: "國際曲庫",
  },
  {
    value: "ko",
    label: "韓文",
    description: "K-pop 題庫",
  },
  {
    value: "custom",
    label: "自訂語言規則",
    description: "例如原文加中文括號",
  },
] satisfies Array<{
  value: AiPromptSettings["languageMode"];
  label: string;
  description: string;
}>;

const uncertainPolicyOptions = [
  {
    value: "keep-current",
    label: "保守：保留原答案",
    description: "避免誤修",
  },
  {
    value: "infer-from-title",
    label: "積極：從標題推測",
    description: "適合空答案或品質較差",
  },
] satisfies Array<{
  value: AiPromptSettings["uncertainPolicy"];
  label: string;
  description: string;
}>;

const drawerFlowSteps = [
  {
    step: "prompt",
    label: "Prompt",
    icon: <ContentCopyRounded sx={{ fontSize: 17 }} />,
  },
  {
    step: "json",
    label: "貼回",
    icon: <ContentPasteRounded sx={{ fontSize: 17 }} />,
  },
  {
    step: "review",
    label: "比對",
    icon: <DifferenceRounded sx={{ fontSize: 17 }} />,
  },
] as const;

type SortableSplitFieldProps = {
  id: string;
  index: number;
  value: string;
  disabled: boolean;
  canRemove: boolean;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
};

function SplitFieldDragPreview({
  index,
  value,
}: {
  index: number;
  value: string;
}) {
  return (
    <div className="flex w-full items-center gap-2 rounded-xl border border-[var(--mc-accent)] bg-[#07111d] px-2 py-2 shadow-[0_18px_34px_-24px_rgba(34,211,238,0.95)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--mc-accent)]/30 bg-[var(--mc-accent)]/10 text-[var(--mc-accent)]">
        <DragIndicatorRounded sx={{ fontSize: 18 }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-[var(--mc-text-muted)]">
          第 {index + 1} 格
        </div>
        <div className="truncate text-sm font-medium text-[var(--mc-text)]">
          {value || "未命名欄位"}
        </div>
      </div>
    </div>
  );
}

function SortableSplitField({
  id,
  index,
  value,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: SortableSplitFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    zIndex: isDragging ? 2 : undefined,
    opacity: isDragging ? 0.24 : undefined,
    willChange: isDragging ? "transform" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-full items-center gap-2 rounded-xl border bg-[#050b14]/70 px-2 py-2 ${
        isDragging
          ? "border-[var(--mc-accent)]"
          : "border-[var(--mc-border)]"
      }`}
    >
      <button
        type="button"
        aria-label={`拖曳調整第 ${index + 1} 格`}
        disabled={disabled}
        className="flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--mc-text-muted)] transition hover:border-[var(--mc-accent)]/40 hover:text-[var(--mc-accent)] disabled:cursor-not-allowed disabled:opacity-45"
        {...attributes}
        {...listeners}
      >
        <DragIndicatorRounded sx={{ fontSize: 18 }} />
      </button>
      <MuizoTextField
        size="small"
        label={`第 ${index + 1} 格`}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(index, event.target.value)}
        fullWidth
      />
      <IconButton
        size="small"
        aria-label="移除欄位"
        disabled={disabled || !canRemove}
        onClick={() => onRemove(index)}
        className="!text-[var(--mc-text-muted)] hover:!text-rose-200"
      >
        <DeleteOutlineRounded sx={{ fontSize: 18 }} />
      </IconButton>
    </div>
  );
}

const getPageStatusMeta = ({
  page,
  pageStatus,
  hasDraft,
  isApplied,
}: {
  page: AiPromptPage;
  pageStatus: AiPageStatus | undefined;
  hasDraft: boolean;
  isApplied: boolean;
}) => {
  if (isApplied || pageStatus?.isComplete) {
    return {
      label: "已套用",
      className: "text-emerald-300",
      icon: <CheckCircleOutlineRounded sx={{ fontSize: 14 }} />,
    };
  }

  if (pageStatus?.isPartial) {
    return {
      label: `${pageStatus.completedCount}/${pageStatus.totalCount}`,
      className: "text-cyan-200",
      icon: <MoreHorizRounded sx={{ fontSize: 14 }} />,
    };
  }

  if (hasDraft) {
    return {
      label: "已貼回",
      className: "text-amber-200",
      icon: <MoreHorizRounded sx={{ fontSize: 14 }} />,
    };
  }

  return {
    label: `${page.start + 1}-${page.end}`,
    className: "text-[var(--mc-text-muted)]",
    icon: null,
  };
};

export default function CollectionEditAiBatchDrawer({
  open,
  onClose,
  aiProviderLabel,
  playlistItemsCount,

  aiPromptPages,
  aiBatchPageIndex,
  onAiBatchPageChange,

  aiJsonDrafts,
  aiAppliedPages,
  aiAppliedBatchRecords,
  currentAiJsonDraft,
  onCurrentAiJsonDraftChange,

  aiParsedResult,
  aiPreview,
  aiPageStatuses,

  aiPromptSettings,
  onAiPromptSettingsChange,
  onAiSplitFieldChange,
  onAddAiSplitField,
  onRemoveAiSplitField,
  onReorderAiSplitField,
  aiPromptText,
  onCopyAiPrompt,
  onOpenAiAssistant,

  canApplyAiBatch,
  onApplyAiBatch,

  aiBatchWriteState,
  pendingAiBatchSave,
  canCloseAiBatchModal,
  aiBatchSaveProgressLabel,
  aiBatchSaveStepLabel,
  onRetryAiBatchWrite,
  onBackToPreview,
}: Props) {
  const isCompact = useMediaQuery("(max-width:767px)");
  const [aiDrawerStepState, setAiDrawerStepState] = useState<{
    pageIndex: number;
    step: "prompt" | "json" | "applied";
  }>({
    pageIndex: 0,
    step: "prompt",
  });
  const controlsDisabled = pendingAiBatchSave !== null;
  const splitFieldIdCounterRef = useRef(aiPromptSettings.splitFields.length);
  const [splitFieldIds, setSplitFieldIds] = useState(() =>
    aiPromptSettings.splitFields.map((_, index) => `split-field-${index}`),
  );
  const [activeSplitFieldId, setActiveSplitFieldId] = useState<string | null>(
    null,
  );
  const [appliedResultTab, setAppliedResultTab] = useState<
    "changed" | "unchanged"
  >("changed");
  const splitFieldSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );
  const isIdle = aiBatchWriteState.status === "idle";
  const activePage = aiPromptPages[aiBatchPageIndex];
  const activePromptMode =
    promptModeOptions.find(
      (option) => option.value === aiPromptSettings.mode,
    ) ?? promptModeOptions[0];
  const aiDrawerStep =
    aiDrawerStepState.pageIndex === aiBatchPageIndex
      ? aiDrawerStepState.step
      : "prompt";
  const activeAppliedRecord = aiAppliedBatchRecords[aiBatchPageIndex] ?? null;
  const appliedChangedItems = activeAppliedRecord?.changedItems ?? [];
  const appliedUnchangedItems = activeAppliedRecord?.unchangedItems ?? [];
  const comparisonItems =
    aiDrawerStep === "applied"
      ? appliedChangedItems
      : aiPreview.changedItems;
  const comparisonTitle = "即將更新";
  const jsonDraftMinRows = isCompact ? 6 : 8;
  const jsonDraftMaxRows = isCompact ? 8 : 14;
  const activeAppliedTimeLabel = activeAppliedRecord
    ? new Date(activeAppliedRecord.appliedAt * 1000).toLocaleTimeString(
        "zh-TW",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      )
    : "";

  const handleRequestClose = () => {
    if (!canCloseAiBatchModal) return;
    setAiDrawerStepState({
      pageIndex: aiBatchPageIndex,
      step: "prompt",
    });
    onClose();
  };

  const handleStartGemini = async () => {
    await onOpenAiAssistant();
    setAiDrawerStepState({
      pageIndex: aiBatchPageIndex,
      step: "json",
    });
  };

  const handlePasteJson = async () => {
    if (!navigator.clipboard) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onCurrentAiJsonDraftChange(text);
      }
    } catch {
      // Browser clipboard permission errors are non-blocking.
    }
  };

  const handleClearJson = () => {
    onCurrentAiJsonDraftChange("");
  };

  const totalAppliedPages = aiPromptPages.reduce((count, page) => {
    const pageStatus = aiPageStatuses[page.pageIndex];
    return (
      count +
      (aiAppliedPages[page.pageIndex] === true ||
      aiAppliedBatchRecords[page.pageIndex] ||
      pageStatus?.isComplete
        ? 1
        : 0)
    );
  }, 0);

  const previewSummary = [
    {
      label: "會更新",
      value: aiPreview.changedItems.length,
      className: "text-cyan-100",
    },
    {
      label: "無變更",
      value: aiPreview.unchangedIds.length,
      className: "text-slate-100",
    },
    {
      label: "對不到 ID",
      value: aiPreview.missingIds.length,
      className: "text-amber-100",
    },
  ];

  useEffect(() => {
    setSplitFieldIds((prev) => {
      const fieldCount = aiPromptSettings.splitFields.length;
      if (prev.length === fieldCount) return prev;
      if (prev.length > fieldCount) return prev.slice(0, fieldCount);

      return [
        ...prev,
        ...Array.from({ length: fieldCount - prev.length }, () => {
          const nextId = `split-field-${splitFieldIdCounterRef.current}`;
          splitFieldIdCounterRef.current += 1;
          return nextId;
        }),
      ];
    });
  }, [aiPromptSettings.splitFields.length]);

  const handleRemoveSplitField = (index: number) => {
    setSplitFieldIds((prev) =>
      prev.filter((_id, fieldIndex) => fieldIndex !== index),
    );
    onRemoveAiSplitField(index);
  };

  const splitFieldSortableIds = aiPromptSettings.splitFields.map(
    (_field, index) => splitFieldIds[index] ?? `split-field-pending-${index}`,
  );

  const activeSplitFieldIndex = activeSplitFieldId
    ? splitFieldSortableIds.indexOf(activeSplitFieldId)
    : -1;

  const handleSplitFieldDragStart = (event: DragStartEvent) => {
    setActiveSplitFieldId(String(event.active.id));
  };

  const handleSplitFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSplitFieldId(null);
    if (!over || active.id === over.id) return;

    const fromIndex = splitFieldSortableIds.indexOf(String(active.id));
    const toIndex = splitFieldSortableIds.indexOf(String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;

    setSplitFieldIds((prev) => arrayMove(prev, fromIndex, toIndex));
    onReorderAiSplitField(fromIndex, toIndex);
  };

  const handleSplitFieldDragCancel = () => {
    setActiveSplitFieldId(null);
  };

  return (
    <Drawer
      anchor={isCompact ? "bottom" : "right"}
      open={open}
      onClose={(_, reason) => {
        if (!canCloseAiBatchModal) return;
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          handleRequestClose();
          return;
        }
        handleRequestClose();
      }}
      slotProps={{
        paper: {
          sx: {
            width: isCompact ? "100%" : "min(1180px, 94vw)",
            height: isCompact ? "100dvh" : "100%",
            maxHeight: "100dvh",
            borderTopLeftRadius: isCompact ? 0 : 24,
            borderBottomLeftRadius: isCompact ? 0 : 24,
            background:
              "linear-gradient(180deg, #10151d 0%, #0b1017 42%, #080b10 100%)",
            borderLeft: isCompact ? 0 : "1px solid rgba(148,163,184,0.22)",
            color: "var(--mc-text)",
            boxShadow: "0 24px 70px rgba(2,6,23,0.7)",
            overflow: "hidden",
          },
        },
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/70 bg-[#111821] px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-600/80 bg-slate-800 text-slate-200 sm:inline-flex">
              <AutoAwesomeRounded sx={{ fontSize: 22 }} />
            </span>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-base font-semibold text-[var(--mc-text)] sm:text-xl">
                  AI 批次修正答案
                </h2>
                <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-[var(--mc-text-muted)] sm:inline-flex">
                  {playlistItemsCount} 題
                </span>
              </div>

              <p className="mt-1 truncate text-xs text-[var(--mc-text-muted)]">
                {isIdle
                  ? activePage
                    ? `第 ${activePage.pageIndex + 1} 批 · ${activePage.start + 1}-${activePage.end}`
                    : "尚未建立批次"
                  : aiBatchSaveProgressLabel}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <IconButton
              size={isCompact ? "small" : "medium"}
              aria-label="關閉 AI 批次修正"
              onClick={handleRequestClose}
              disabled={!canCloseAiBatchModal}
              className="!text-[var(--mc-text)] hover:!bg-white/8 disabled:!text-slate-600"
            >
              <CloseRounded />
            </IconButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isIdle ? (
            <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-none">
              <aside className="min-w-0 max-w-full overflow-hidden border-b border-slate-700/70 bg-[#0d131b] px-3 py-2.5 lg:border-b-0 lg:border-r lg:px-5 lg:py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--mc-text)] sm:text-base">
                    批次進度
                  </div>
                  <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-slate-200 sm:px-2.5 sm:py-1 sm:text-xs">
                    {totalAppliedPages} / {aiPromptPages.length}
                  </div>
                </div>

                <div className="mt-2 flex w-full min-w-0 max-w-full snap-x gap-2 overflow-x-auto overflow-y-hidden pb-1 [touch-action:pan-x] [-webkit-overflow-scrolling:touch] lg:mt-3 lg:max-h-[calc(100dvh-190px)] lg:snap-none lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
                  {aiPromptPages.map((page) => {
                    const active = page.pageIndex === aiBatchPageIndex;
                    const hasDraft = Boolean(
                      aiJsonDrafts[page.pageIndex]?.trim(),
                    );
                    const appliedRecord =
                      aiAppliedBatchRecords[page.pageIndex] ?? null;
                    const isApplied =
                      aiAppliedPages[page.pageIndex] === true ||
                      appliedRecord !== null;
                    const pageStatus = aiPageStatuses[page.pageIndex];
                    const statusMeta = getPageStatusMeta({
                      page,
                      pageStatus,
                      hasDraft,
                      isApplied,
                    });

                    return (
                      <button
                        key={`${page.start}-${page.end}`}
                        type="button"
                        disabled={pendingAiBatchSave !== null}
                        onClick={() => {
                          setAiDrawerStepState({
                            pageIndex: page.pageIndex,
                            step: appliedRecord ? "applied" : "prompt",
                          });
                          onAiBatchPageChange(page.pageIndex);
                        }}
                        className={`w-[148px] flex-none snap-start rounded-xl border px-2.5 py-2 text-left transition sm:w-[156px] sm:rounded-2xl sm:px-3 sm:py-2.5 lg:w-full lg:flex-none lg:snap-start ${
                          active
                            ? "border-[var(--mc-accent)] bg-[var(--mc-accent)]/12 shadow-[0_18px_34px_-28px_rgba(34,211,238,0.9)]"
                            : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 hover:border-[var(--mc-accent)]/45 hover:bg-white/[0.04]"
                        } disabled:cursor-not-allowed disabled:opacity-55`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[var(--mc-text)] sm:text-sm">
                            第 {page.pageIndex + 1} 批
                          </span>
                          {statusMeta.icon ? (
                            <span
                              className={`inline-flex items-center ${statusMeta.className}`}
                            >
                              {statusMeta.icon}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                          <span className="text-[var(--mc-text-muted)]">
                            {page.start + 1}-{page.end}
                          </span>
                          <span className={statusMeta.className}>
                            {statusMeta.label}
                          </span>
                        </div>

                        {appliedRecord ? (
                          <div
                            className={`mt-2 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                              appliedRecord.unchangedItems.length === 0
                                ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-100"
                                : "border-amber-300/24 bg-amber-300/10 text-amber-100"
                            }`}
                          >
                            {appliedRecord.unchangedItems.length === 0 ? (
                              <>
                                <CheckCircleOutlineRounded
                                  sx={{ fontSize: 13 }}
                                />
                                全部完成
                              </>
                            ) : (
                              <>
                                <DifferenceRounded sx={{ fontSize: 13 }} />
                                {appliedRecord.unchangedItems.length}{" "}
                                筆未修改
                              </>
                            )}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="min-h-0 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-5">
                <div className="mx-auto max-w-5xl space-y-3 sm:space-y-4">
                  {aiDrawerStep === "applied" && activeAppliedRecord ? (
                    <section>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                            <CheckCircleOutlineRounded sx={{ fontSize: 22 }} />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-[var(--mc-text)]">
                              第 {activeAppliedRecord.pageIndex + 1} 批已套用
                            </div>
                            <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                              {activeAppliedTimeLabel}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditRounded />}
                          onClick={() =>
                            setAiDrawerStepState({
                              pageIndex: aiBatchPageIndex,
                              step: "prompt",
                            })
                          }
                          disabled={pendingAiBatchSave !== null}
                          className="!rounded-xl"
                        >
                          重新處理
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--mc-border)] bg-slate-950/25 p-1 sm:mt-4">
                        {[
                          {
                            key: "changed" as const,
                            label: "已更新",
                            count: appliedChangedItems.length,
                          },
                          {
                            key: "unchanged" as const,
                            label: "未修改",
                            count: appliedUnchangedItems.length,
                          },
                        ].map((tab) => {
                          const active = appliedResultTab === tab.key;

                          return (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setAppliedResultTab(tab.key)}
                              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                active
                                  ? "bg-emerald-400/12 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.28)]"
                                  : "text-[var(--mc-text-muted)] hover:bg-white/[0.04] hover:text-[var(--mc-text)]"
                              }`}
                            >
                              {tab.label}
                              <span className="ml-2 text-xs opacity-80">
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 space-y-2 sm:mt-4">
                        {appliedResultTab === "changed" ? (
                          appliedChangedItems.length > 0 ? (
                            appliedChangedItems.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                                      {item.title}
                                    </div>
                                    <div className="mt-1 text-sm font-medium text-emerald-50">
                                      {item.newAnswer}
                                    </div>
                                  </div>
                                  <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                                    已修改
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-[var(--mc-border)] px-3 py-4 text-sm text-[var(--mc-text-muted)]">
                              這一批沒有更新任何答案。
                            </div>
                          )
                        ) : appliedUnchangedItems.length > 0 ? (
                          appliedUnchangedItems.map(
                            (item: AiAppliedResultItem) => (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-[var(--mc-border)] bg-slate-950/25 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                                      {item.title}
                                    </div>
                                    <div className="mt-1 text-sm text-[var(--mc-text-muted)]">
                                      {item.answerText || "未填寫"}
                                    </div>
                                  </div>
                                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-[var(--mc-text-muted)]">
                                    未修改
                                  </span>
                                </div>
                              </div>
                            ),
                          )
                        ) : (
                          <div className="rounded-2xl border border-dashed border-[var(--mc-border)] px-3 py-4 text-sm text-[var(--mc-text-muted)]">
                            這一批沒有未修改的答案。
                          </div>
                        )}
                      </div>
                    </section>
                  ) : aiDrawerStep === "prompt" ? (
                    <section>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text font-semibold text-[var(--mc-text)]">
                          產生 Prompt
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
                        {drawerFlowSteps.map((item, index) => {
                          const active =
                            item.step === "prompt" ||
                            (item.step === "json" &&
                              Boolean(currentAiJsonDraft.trim())) ||
                            (item.step === "review" &&
                              aiPreview.changedItems.length > 0);

                          return (
                            <div
                              key={item.step}
                              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 sm:justify-start sm:gap-2 sm:px-3 ${
                                active
                                  ? "border-[var(--mc-accent)]/35 bg-[var(--mc-accent)]/10 text-[var(--mc-text)]"
                                  : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 text-[var(--mc-text-muted)]"
                              }`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg sm:h-7 sm:w-7 ${
                                  active
                                    ? "bg-[var(--mc-accent)]/18 text-[var(--mc-accent)]"
                                    : "bg-white/[0.04]"
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span className="truncate text-xs font-semibold sm:text-sm">
                                <span className="sm:hidden">{item.label}</span>
                                <span className="hidden sm:inline">
                                  {index + 1}. {item.label}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 sm:mt-4">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                              修正目標
                            </div>
                            <div className="mt-1 text-sm text-[var(--mc-text)]">
                              {activePromptMode.hint}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                          {promptModeOptions.map((option) => {
                            const active =
                              aiPromptSettings.mode === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                disabled={controlsDisabled}
                                onClick={() =>
                                  onAiPromptSettingsChange({
                                    mode: option.value,
                                  })
                                }
                                className={`rounded-xl border px-3 py-2.5 text-left transition sm:rounded-2xl sm:py-3 ${
                                  active
                                    ? "border-[var(--mc-accent)] bg-[var(--mc-accent)]/12"
                                    : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 hover:border-[var(--mc-accent)]/45"
                                } disabled:cursor-not-allowed disabled:opacity-55`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-[var(--mc-text)]">
                                    {option.label}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      active
                                        ? "bg-[var(--mc-accent)]/18 text-[var(--mc-accent)]"
                                        : "bg-white/[0.05] text-[var(--mc-text-muted)]"
                                    }`}
                                  >
                                    {option.description}
                                  </span>
                                </div>
                                <div className="mt-1.5 text-xs leading-5 text-[var(--mc-text-muted)]">
                                  {option.hint}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                          <div>
                            <MuizoSelectField
                              size="small"
                              label="答案語言"
                              value={aiPromptSettings.languageMode}
                              options={languageOptions}
                              disabled={controlsDisabled}
                              helper={
                                languageModeHints[
                                  aiPromptSettings.languageMode
                                ]
                              }
                              onChange={(languageMode) =>
                                onAiPromptSettingsChange({
                                  languageMode,
                                })
                              }
                              fullWidth
                            />
                          </div>

                          <FormControlLabel
                            className="!m-0 self-start rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 !px-3 !py-1"
                            control={
                              <Switch
                                checked={aiPromptSettings.keepOriginalText}
                                disabled={controlsDisabled}
                                onChange={(event) =>
                                  onAiPromptSettingsChange({
                                    keepOriginalText: event.target.checked,
                                  })
                                }
                              />
                            }
                            label={
                              <span className="block">
                                <span className="block text-sm text-[var(--mc-text)]">
                                  保留原文名稱
                                </span>
                                <span className="block text-xs leading-5 text-[var(--mc-text-muted)]">
                                  避免把專有名詞硬翻譯
                                </span>
                              </span>
                            }
                          />
                        </div>

                        {aiPromptSettings.languageMode === "custom" ? (
                          <MuizoTextField
                            className="!mt-3"
                            size="small"
                            label="自訂輸出語言"
                            value={aiPromptSettings.customLanguage}
                            disabled={controlsDisabled}
                            onChange={(event) =>
                              onAiPromptSettingsChange({
                                customLanguage: event.target.value,
                              })
                            }
                            placeholder="例如：台灣常用譯名、原文加中文括號、粵語常用名"
                            fullWidth
                          />
                        ) : null}

                        {aiPromptSettings.mode === "split-fields" ? (
                          <div className="mt-3 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45 p-3 sm:mt-4">
                            <div className="mb-3 rounded-xl bg-[var(--mc-accent)]/8 px-3 py-2">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                                輸出預覽
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {aiPromptSettings.splitFields.map(
                                  (field, index) => {
                                    const hasNext =
                                      index <
                                      aiPromptSettings.splitFields.length - 1;

                                    return (
                                      <span
                                        key={`${index}-${field}`}
                                        className="inline-flex items-center gap-2"
                                      >
                                        <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-sm font-medium text-[var(--mc-text)]">
                                          {field.trim() ||
                                            `第 ${index + 1} 格`}
                                        </span>
                                        {hasNext ? (
                                          <span className="font-mono text-sm text-cyan-100">
                                            {aiPromptSettings.separator || " "}
                                          </span>
                                        ) : null}
                                      </span>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                              <MuizoTextField
                                size="small"
                                label="分隔符號"
                                value={aiPromptSettings.separator}
                                disabled={controlsDisabled}
                                onChange={(event) =>
                                  onAiPromptSettingsChange({
                                    separator: event.target.value,
                                  })
                                }
                                placeholder=" - "
                              />
                              <div className="space-y-2">
                                <DndContext
                                  sensors={splitFieldSensors}
                                  collisionDetection={closestCenter}
                                  onDragStart={handleSplitFieldDragStart}
                                  onDragEnd={handleSplitFieldDragEnd}
                                  onDragCancel={handleSplitFieldDragCancel}
                                >
                                  <SortableContext
                                    items={splitFieldSortableIds}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <div className="flex flex-col gap-2">
                                      {aiPromptSettings.splitFields.map(
                                        (field, index) => (
                                          <SortableSplitField
                                            key={splitFieldSortableIds[index]}
                                            id={splitFieldSortableIds[index]}
                                            index={index}
                                            value={field}
                                            disabled={controlsDisabled}
                                            canRemove={
                                              aiPromptSettings.splitFields
                                                .length > 1
                                            }
                                            onChange={onAiSplitFieldChange}
                                            onRemove={handleRemoveSplitField}
                                          />
                                        ),
                                      )}
                                    </div>
                                  </SortableContext>
                                  <DragOverlay dropAnimation={null}>
                                    {activeSplitFieldIndex >= 0 ? (
                                      <SplitFieldDragPreview
                                        index={activeSplitFieldIndex}
                                        value={
                                          aiPromptSettings.splitFields[
                                            activeSplitFieldIndex
                                          ] ?? ""
                                        }
                                      />
                                    ) : null}
                                  </DragOverlay>
                                </DndContext>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<AddRounded />}
                                  disabled={controlsDisabled}
                                  onClick={onAddAiSplitField}
                                  className="!rounded-xl"
                                >
                                  增加欄位
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                          <div>
                            <MuizoSelectField
                              size="small"
                              label="AI 不確定時"
                              value={aiPromptSettings.uncertainPolicy}
                              options={uncertainPolicyOptions}
                              disabled={controlsDisabled}
                              helper={
                                uncertainPolicyHints[
                                  aiPromptSettings.uncertainPolicy
                                ]
                              }
                              onChange={(uncertainPolicy) =>
                                onAiPromptSettingsChange({
                                  uncertainPolicy,
                                })
                              }
                              fullWidth
                            />
                          </div>

                          <MuizoTextField
                            size="small"
                            label="補充規則"
                            value={aiPromptSettings.customPrompt}
                            disabled={controlsDisabled}
                            onChange={(event) =>
                              onAiPromptSettingsChange({
                                customPrompt: event.target.value,
                              })
                            }
                            placeholder="例如：動漫歌請保留作品名；VTuber 翻唱請用原曲曲名"
                            fullWidth
                          />
                        </div>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--mc-border)] bg-[#050b14] sm:mt-4">
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--mc-border)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--mc-text-muted)]">
                          <span>Prompt 預覽</span>
                          <IconButton
                            size="small"
                            aria-label="複製 Prompt"
                            onClick={() => void onCopyAiPrompt()}
                            disabled={pendingAiBatchSave !== null}
                            className="!text-[var(--mc-text-muted)] hover:!text-[var(--mc-accent)]"
                          >
                            <ContentCopyRounded sx={{ fontSize: 16 }} />
                          </IconButton>
                        </div>
                        <div className="max-h-44 overflow-y-auto px-3 py-3 sm:max-h-72 sm:px-4 sm:py-4">
                          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-slate-200">
                            {aiPromptText}
                          </pre>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[var(--mc-text)]">
                            貼回 JSON 並預覽
                          </div>
                          <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                            Gemini 回傳後貼在這裡。支援純 JSON，也支援 ```json
                            code block。
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<BackspaceRounded />}
                            onClick={handleClearJson}
                            disabled={
                              pendingAiBatchSave !== null ||
                              !currentAiJsonDraft.trim()
                            }
                            className="!rounded-xl"
                          >
                            清空
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditRounded />}
                            onClick={() =>
                              setAiDrawerStepState({
                                pageIndex: aiBatchPageIndex,
                                step: "prompt",
                              })
                            }
                            disabled={pendingAiBatchSave !== null}
                            className="!rounded-xl"
                          >
                            編輯 Prompt
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
                        {previewSummary.map((item) => (
                          <div
                            key={item.label}
                            className="min-w-[68px] rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 px-2 py-2 text-center sm:min-w-[72px] sm:px-3"
                          >
                            <div className="text-[10px] text-[var(--mc-text-muted)]">
                              {item.label}
                            </div>
                            <div
                              className={`mt-0.5 text-base font-semibold sm:text-lg ${item.className}`}
                            >
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="relative mt-3 sm:mt-4">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ContentPasteRounded />}
                          onClick={() => void handlePasteJson()}
                          disabled={pendingAiBatchSave !== null}
                          className="!absolute !right-3 !top-3 !z-10 !rounded-xl !bg-slate-100 !font-semibold !text-slate-950 hover:!bg-white disabled:!bg-slate-700 disabled:!text-slate-300"
                        >
                          貼上 JSON
                        </Button>
                        <MuizoTextField
                          value={currentAiJsonDraft}
                          disabled={pendingAiBatchSave !== null}
                          onChange={(event) => {
                            onCurrentAiJsonDraftChange(event.target.value);
                          }}
                          multiline
                          minRows={jsonDraftMinRows}
                          maxRows={jsonDraftMaxRows}
                          fullWidth
                          placeholder={
                            '```json\n{"items":[{"id":"item-id","answerText":"正式答案"}]}\n```'
                          }
                        />
                      </div>

                      {aiParsedResult.error ? (
                        <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                          {aiParsedResult.error}
                        </div>
                      ) : null}

                      {aiPreview.missingIds.length > 0 &&
                      !aiParsedResult.error ? (
                        <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                          以下 id 在目前題庫中找不到：
                          {aiPreview.missingIds.slice(0, 8).join(", ")}
                          {aiPreview.missingIds.length > 8 ? " ..." : ""}
                        </div>
                      ) : null}

                      <div className="mt-3 max-h-[min(20rem,calc(100dvh-360px))] space-y-2 overflow-y-auto pr-1 sm:max-h-80">
                        {aiPreview.changedItems.length === 0 &&
                        !aiParsedResult.error ? (
                          <div className="rounded-2xl border border-dashed border-[var(--mc-border)] px-3 py-4 text-sm text-[var(--mc-text-muted)]">
                            貼上有效 JSON 後，這裡會顯示即將更新的答案差異。
                          </div>
                        ) : (
                          comparisonItems.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3 sm:rounded-2xl"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-[var(--mc-text)]">
                                  {item.title}
                                </div>
                                <span className="shrink-0 rounded-full border border-[var(--mc-accent)]/25 bg-[var(--mc-accent)]/8 px-2 py-0.5 text-[10px] font-semibold text-[var(--mc-accent)]">
                                  {comparisonTitle}
                                </span>
                              </div>
                              <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
                                <div className="rounded-xl border border-slate-600/70 bg-slate-950/45 px-3 py-2">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
                                    原答案
                                  </div>
                                  <div className="mt-1 text-sm text-[var(--mc-text)]">
                                    {item.oldAnswer || "未填寫"}
                                  </div>
                                </div>
                                <div className="hidden items-center text-[var(--mc-accent)] md:flex">
                                  <DifferenceRounded sx={{ fontSize: 18 }} />
                                </div>
                                <div className="rounded-xl border border-[var(--mc-accent)]/35 bg-[var(--mc-accent)]/8 px-3 py-2">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
                                    新答案
                                  </div>
                                  <div className="mt-1 text-sm text-[var(--mc-text)]">
                                    {item.newAnswer}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </main>
            </div>
          ) : (
            <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-3 py-6 sm:min-h-[520px] sm:px-4 sm:py-8">
              <div className="w-full max-w-xl rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-3xl sm:p-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/50">
                  {aiBatchWriteState.status === "success" ? (
                    <CheckCircleOutlineRounded
                      className="text-emerald-300"
                      sx={{ fontSize: 34 }}
                    />
                  ) : aiBatchWriteState.status === "error" ? (
                    <MoreHorizRounded
                      className="text-rose-200"
                      sx={{ fontSize: 34 }}
                    />
                  ) : (
                    <CircularProgress
                      size={34}
                      className="!text-[var(--mc-accent)]"
                    />
                  )}
                </div>

                <div className="mt-5 text-lg font-semibold text-[var(--mc-text)]">
                  {aiBatchWriteState.status === "error"
                    ? "寫入失敗"
                    : aiBatchWriteState.status === "success"
                      ? aiBatchWriteState.hasNextPage
                        ? "本批寫入完成"
                        : "全部批次已完成"
                      : "正在套用並寫入變更"}
                </div>

                <div className="mt-2 text-sm text-[var(--mc-text-muted)]">
                  {aiBatchSaveProgressLabel}
                </div>
                <div className="mt-1 text-sm text-[var(--mc-text)]">
                  {aiBatchSaveStepLabel}
                </div>

                <div className="mt-5 grid gap-2 text-left text-sm">
                  <div
                    className={`rounded-xl border px-3 py-2 ${
                      aiBatchWriteState.status === "applying"
                        ? "border-[var(--mc-accent)]/45 bg-[var(--mc-accent)]/10 text-[var(--mc-text)]"
                        : "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                    }`}
                  >
                    1. 套用答案到本地狀態
                  </div>

                  <div
                    className={`rounded-xl border px-3 py-2 ${
                      aiBatchWriteState.status === "saving"
                        ? "border-[var(--mc-accent)]/45 bg-[var(--mc-accent)]/10 text-[var(--mc-text)]"
                        : aiBatchWriteState.status === "success"
                          ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                          : aiBatchWriteState.status === "error"
                            ? "border-rose-500/35 bg-rose-950/25 text-rose-100"
                            : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 text-[var(--mc-text-muted)]"
                    }`}
                  >
                    2. 寫入收藏庫
                  </div>

                  <div
                    className={`rounded-xl border px-3 py-2 ${
                      aiBatchWriteState.status === "success"
                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                        : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 text-[var(--mc-text-muted)]"
                    }`}
                  >
                    3. 準備下一批
                  </div>
                </div>

                {pendingAiBatchSave ? (
                  <div className="mt-5 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 px-4 py-3 text-sm text-[var(--mc-text-muted)]">
                    本批共 {pendingAiBatchSave.count}{" "}
                    筆變更。完成前請勿關閉視窗或切換批次。
                  </div>
                ) : null}

                {aiBatchWriteState.status === "error" ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/35 bg-rose-950/25 px-4 py-3 text-left text-sm text-rose-100">
                    {aiBatchWriteState.message}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-700/70 bg-[#0b1017] px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-18px_44px_-38px_rgba(15,23,42,0.9)] sm:px-6 sm:py-3">
          {aiBatchWriteState.status === "idle" ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              {aiDrawerStep !== "prompt" && (
                <Button
                  onClick={() =>
                    setAiDrawerStepState({
                      pageIndex: aiBatchPageIndex,
                      step: "prompt",
                    })
                  }
                  disabled={pendingAiBatchSave !== null}
                  className="!text-[var(--mc-text-muted)] disabled:!text-slate-600"
                >
                  上一步
                </Button>
              )}
              {aiDrawerStep === "prompt" ? (
                <Button
                  variant="contained"
                  startIcon={<OpenInNewRounded />}
                  onClick={() => void handleStartGemini()}
                  disabled={pendingAiBatchSave !== null}
                  className="!w-full !rounded-xl !bg-[var(--mc-accent)] !px-5 !font-semibold !text-slate-950 hover:!bg-[var(--mc-accent)]/90 disabled:!bg-slate-700 disabled:!text-slate-300 sm:!w-auto"
                >
                  複製並開啟 {aiProviderLabel}
                </Button>
              ) : aiDrawerStep === "json" ? (
                <Button
                  variant="contained"
                  onClick={() => void onApplyAiBatch()}
                  disabled={!canApplyAiBatch}
                  className="!w-full !rounded-xl !bg-[var(--mc-accent)] !px-5 !font-semibold !text-slate-950 hover:!bg-[var(--mc-accent)]/90 disabled:!bg-slate-700 disabled:!text-slate-300 sm:!w-auto"
                >
                  {`套用並寫入 ${aiPreview.changedItems.length} 筆變更`}
                </Button>
              ) : null}
            </div>
          ) : aiBatchWriteState.status === "error" ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                onClick={onBackToPreview}
                className="!text-[var(--mc-text-muted)]"
              >
                回到預覽
              </Button>
              <Button
                variant="contained"
                onClick={() => void onRetryAiBatchWrite()}
                className="!w-full !rounded-xl !bg-[var(--mc-accent)] !px-5 !font-semibold !text-slate-950 hover:!bg-[var(--mc-accent)]/90 sm:!w-auto"
              >
                重試寫入
              </Button>
            </div>
          ) : aiBatchWriteState.status === "success" &&
            !aiBatchWriteState.hasNextPage ? (
            <div className="flex justify-end">
              <Button
                variant="contained"
                onClick={handleRequestClose}
                className="!w-full !rounded-xl !bg-[var(--mc-accent)] !px-5 !font-semibold !text-slate-950 hover:!bg-[var(--mc-accent)]/90 sm:!w-auto"
              >
                完成
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                variant="contained"
                disabled
                className="disabled:!bg-slate-700 disabled:!text-slate-300"
              >
                寫入中...
              </Button>
            </div>
          )}
        </footer>
      </div>
    </Drawer>
  );
}
