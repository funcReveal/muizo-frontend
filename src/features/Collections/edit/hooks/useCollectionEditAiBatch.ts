import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnswerAiProvider,
  AnswerStatus,
  EditableItem,
} from "../utils/editTypes";

const AI_BATCH_PAGE_SIZE = 100;

const AI_PROVIDER: AnswerAiProvider = "gemini";
const AI_MODIFIED_STATUS: AnswerStatus = "ai_modified";
const AI_PROVIDER_LABEL = "Gemini";
const AI_PROVIDER_BASE_URL = "https://gemini.google.com/app";

const reorderItems = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  if (movedItem === undefined) return items;
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const copyTextWithTextarea = (text: string) => {
  if (!text.trim()) return false;
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  const activeElement = document.activeElement as HTMLElement | null;
  const selection = window.getSelection();
  const selectedRanges: Range[] = [];

  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      selectedRanges.push(selection.getRangeAt(index));
    }
  }

  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("autocapitalize", "off");
  textarea.setAttribute("autocomplete", "off");
  textarea.setAttribute("autocorrect", "off");
  textarea.setAttribute("spellcheck", "false");

  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "0";
  textarea.style.outline = "0";
  textarea.style.boxShadow = "none";
  textarea.style.background = "transparent";
  textarea.style.fontSize = "16px";

  document.body.appendChild(textarea);

  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");

    if (selection) {
      selection.removeAllRanges();
      selectedRanges.forEach((range) => selection.addRange(range));
    }

    activeElement?.focus?.({ preventScroll: true });

    return copied;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

const copyTextToClipboard = async (text: string) => {
  if (!text.trim()) return false;
  if (typeof window === "undefined") return false;

  // 現代瀏覽器優先使用 Clipboard API。
  // 這對長文字、手機瀏覽器、Safari 會比 execCommand 穩定。
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 繼續 fallback
    }
  }

  return copyTextWithTextarea(text);
};

type AiAnswerUpdate = {
  id: string;
  answerText: string;
};

export type AiBatchWriteState =
  | { status: "idle" }
  | {
      status: "applying" | "saving";
      pageIndex: number;
      count: number;
      totalPages: number;
    }
  | {
      status: "success";
      pageIndex: number;
      count: number;
      totalPages: number;
      hasNextPage: boolean;
    }
  | {
      status: "error";
      pageIndex: number;
      count: number;
      totalPages: number;
      message: string;
    };

export type NonIdleAiBatchWriteState = Exclude<
  AiBatchWriteState,
  { status: "idle" }
>;

export type AiPromptPage = {
  pageIndex: number;
  start: number;
  end: number;
  items: Array<{
    id: string;
    title: string;
    uploader: string;
    answerText: string;
  }>;
};

export type AiPageStatus = {
  pageIndex: number;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  isPartial: boolean;
};

export type AiPromptMode =
  | "official-title"
  | "split-fields"
  | "custom";

export type AiLanguageMode =
  | "preserve"
  | "zh-TW"
  | "ja"
  | "en"
  | "ko"
  | "custom";

export type AiUncertainPolicy = "keep-current" | "infer-from-title";

export type AiPromptSettings = {
  mode: AiPromptMode;
  separator: string;
  splitFields: string[];
  keepOriginalText: boolean;
  languageMode: AiLanguageMode;
  customLanguage: string;
  uncertainPolicy: AiUncertainPolicy;
  customPrompt: string;
};

export type AiPreviewItem = {
  id: string;
  title: string;
  oldAnswer: string;
  newAnswer: string;
};

export type AiAppliedResultItem = {
  id: string;
  title: string;
  answerText: string;
};

export type AiAppliedBatchRecord = {
  pageIndex: number;
  batchKey: string;
  appliedAt: number;
  changedItems: AiPreviewItem[];
  unchangedItems: AiAppliedResultItem[];
};

const DEFAULT_AI_PROMPT_SETTINGS: AiPromptSettings = {
  mode: "official-title",
  separator: " - ",
  splitFields: ["作品名稱", "曲名", "歌手"],
  keepOriginalText: true,
  languageMode: "preserve",
  customLanguage: "",
  uncertainPolicy: "keep-current",
  customPrompt: "",
};

const AI_LANGUAGE_LABELS: Record<AiLanguageMode, string> = {
  preserve: "原文主要語言",
  "zh-TW": "繁體中文",
  ja: "日文",
  en: "英文",
  ko: "韓文",
  custom: "自訂語言",
};

const buildAiPromptInstructions = (settings: AiPromptSettings) => {
  const targetLanguage =
    settings.languageMode === "custom"
      ? settings.customLanguage.trim() || "使用者指定語言"
      : AI_LANGUAGE_LABELS[settings.languageMode];

  const outputRules = [
    "Output rules:",
    "1. Return exactly one ```json``` code block and nothing else.",
    "2. Keep every original id, item count, and item order.",
    "3. Return only answerText for each item.",
    '4. Format: {"items":[{"id":"...","answerText":"..."}]}.',
  ];

  const editingPreferences = [
    settings.languageMode === "preserve"
      ? "Language: keep each answer in its original/main language."
      : `Language: use ${targetLanguage} when a natural answer exists.`,
    settings.keepOriginalText
      ? "Names: keep recognizable original titles, artist names, and romanization."
      : "Names: rewrite or translate names when it makes the answer clearer.",
    settings.uncertainPolicy === "keep-current"
      ? "Uncertain: keep the current answerText."
      : "Uncertain: infer from title and uploader, without inventing facts.",
  ];

  const modeInstructions: Record<AiPromptMode, string[]> = {
    "official-title": [
      "Task: clean each answer into the official/common song title.",
      "Remove upload noise such as MV, live, lyrics, playlist tags, episode labels, brackets, and channel wording.",
    ],
    "split-fields": [
      "Task: rebuild each answer as structured fields.",
      `Separator: ${JSON.stringify(settings.separator || " ")}`,
      `Field order: ${settings.splitFields
        .map((field, index) => `${index + 1}. ${field.trim() || `欄位 ${index + 1}`}`)
        .join(" / ")}`,
      "Use only fields supported by the source. Do not add empty fields or extra separators.",
    ],
    custom: [
      "Task: follow the custom instruction below.",
    ],
  };

  const customRules = settings.customPrompt.trim()
    ? ["User custom prompt:", settings.customPrompt.trim()]
    : [];

  return [
    "You edit music quiz answers.",
    "",
    ...modeInstructions[settings.mode],
    "",
    "Preferences:",
    ...editingPreferences.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    ...outputRules,
    ...(customRules.length > 0 ? ["", ...customRules] : []),
  ].join("\n");
};

type UseCollectionEditAiBatchArgs = {
  playlistItems: EditableItem[];
  setPlaylistItems: React.Dispatch<React.SetStateAction<EditableItem[]>>;
  markDirty: () => void;
  markItemsDirty: (localIds: string[]) => void;
  handleSaveCollection: (
    mode: "manual" | "auto",
    itemsOverride?: EditableItem[],
  ) => Promise<boolean>;
  saveError: string | null;
};

export function useCollectionEditAiBatch({
  playlistItems,
  setPlaylistItems,
  markDirty,
  markItemsDirty,
  handleSaveCollection,
  saveError,
}: UseCollectionEditAiBatchArgs) {
  const [aiBatchModalOpen, setAiBatchModalOpen] = useState(false);
  const [aiBatchPageIndex, setAiBatchPageIndexState] = useState(0);
  const [aiJsonDrafts, setAiJsonDrafts] = useState<Record<number, string>>({});
  const [aiAppliedPages, setAiAppliedPages] = useState<Record<number, boolean>>(
    {},
  );
  const [aiAppliedBatchRecords, setAiAppliedBatchRecords] = useState<
    Record<number, AiAppliedBatchRecord>
  >({});
  const [aiPromptSettings, setAiPromptSettings] = useState<AiPromptSettings>(
    DEFAULT_AI_PROMPT_SETTINGS,
  );
  const [aiBatchWriteState, setAiBatchWriteState] = useState<AiBatchWriteState>(
    {
      status: "idle",
    },
  );
  const aiBatchSuccessTimerRef = useRef<number | null>(null);

  const aiPromptPages = useMemo<AiPromptPage[]>(() => {
    const pages: AiPromptPage[] = [];

    for (
      let start = 0;
      start < playlistItems.length;
      start += AI_BATCH_PAGE_SIZE
    ) {
      const end = Math.min(start + AI_BATCH_PAGE_SIZE, playlistItems.length);

      pages.push({
        pageIndex: pages.length,
        start,
        end,
        items: playlistItems.slice(start, end).map((item) => ({
          id: item.dbId ?? item.localId,
          title: item.title ?? "",
          uploader: item.uploader ?? "",
          answerText: item.answerText ?? "",
        })),
      });
    }

    return pages;
  }, [playlistItems]);

  const effectiveAiBatchPageIndex = useMemo(() => {
    if (aiPromptPages.length === 0) return 0;
    return Math.min(aiBatchPageIndex, aiPromptPages.length - 1);
  }, [aiBatchPageIndex, aiPromptPages.length]);

  const currentAiPromptPage = aiPromptPages[effectiveAiBatchPageIndex] ?? null;
  const currentAiJsonDraft = aiJsonDrafts[effectiveAiBatchPageIndex] ?? "";

  const aiPromptPayload = useMemo(
    () =>
      JSON.stringify(
        {
          items: currentAiPromptPage?.items ?? [],
        },
        null,
        2,
      ),
    [currentAiPromptPage],
  );

  const aiPromptText = useMemo(
    () =>
      [
        buildAiPromptInstructions(aiPromptSettings),
        "",
        "Items to normalize:",
        aiPromptPayload,
      ].join("\n"),
    [aiPromptPayload, aiPromptSettings],
  );

  const aiParsedResult = useMemo(() => {
    if (!currentAiJsonDraft.trim()) {
      return {
        error: null as string | null,
        updates: [] as AiAnswerUpdate[],
      };
    }

    try {
      const normalizedDraft = currentAiJsonDraft
        .trim()
        .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");

      const parsed = JSON.parse(normalizedDraft) as { items?: unknown };

      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.items)
      ) {
        return {
          error: "JSON 格式不正確，請確認最外層包含 items 陣列。",
          updates: [] as AiAnswerUpdate[],
        };
      }

      const seenIds = new Set<string>();
      const updates: AiAnswerUpdate[] = [];

      for (const rawItem of parsed.items) {
        if (!rawItem || typeof rawItem !== "object") {
          return {
            error: "items 內每一筆都必須是物件。",
            updates: [] as AiAnswerUpdate[],
          };
        }

        const candidateId = "id" in rawItem ? rawItem.id : null;
        const candidateAnswer =
          "answerText" in rawItem ? rawItem.answerText : null;

        const id = typeof candidateId === "string" ? candidateId.trim() : "";
        const answerText =
          typeof candidateAnswer === "string" ? candidateAnswer.trim() : "";

        if (!id || !answerText) {
          return {
            error: "每一筆都需要有效的 id 與 answerText。",
            updates: [] as AiAnswerUpdate[],
          };
        }

        if (seenIds.has(id)) {
          return {
            error: `JSON 內出現重複 id：${id}`,
            updates: [] as AiAnswerUpdate[],
          };
        }

        seenIds.add(id);
        updates.push({ id, answerText });
      }

      return {
        error: null as string | null,
        updates,
      };
    } catch {
      return {
        error: "JSON 解析失敗，請確認格式正確。",
        updates: [] as AiAnswerUpdate[],
      };
    }
  }, [currentAiJsonDraft]);

  const aiPreview = useMemo(() => {
    const lookup = new Map(
      (currentAiPromptPage?.items ?? []).map(
        (item) => [item.id, item] as const,
      ),
    );

    const missingIds: string[] = [];
    const unchangedIds: string[] = [];
    const changedItems: AiPreviewItem[] = [];

    for (const update of aiParsedResult.updates) {
      const target = lookup.get(update.id);

      if (!target) {
        missingIds.push(update.id);
        continue;
      }

      const currentAnswer = (target.answerText ?? "").trim();

      if (currentAnswer === update.answerText) {
        unchangedIds.push(update.id);
        continue;
      }

      changedItems.push({
        id: update.id,
        title: target.title ?? "未命名題目",
        oldAnswer: target.answerText ?? "",
        newAnswer: update.answerText,
      });
    }

    return {
      missingIds,
      unchangedIds,
      changedItems,
    };
  }, [aiParsedResult.updates, currentAiPromptPage]);

  const aiPageStatuses = useMemo<AiPageStatus[]>(
    () =>
      aiPromptPages.map((page) => {
        const completedCount = playlistItems
          .slice(page.start, page.end)
          .filter((item) => item.answerAiBatchKey !== null).length;

        return {
          pageIndex: page.pageIndex,
          completedCount,
          totalCount: page.items.length,
          isComplete:
            page.items.length > 0 && completedCount === page.items.length,
          isPartial: completedCount > 0 && completedCount < page.items.length,
        };
      }),
    [aiPromptPages, playlistItems],
  );

  const savedAiAppliedBatchRecords = useMemo<
    Record<number, AiAppliedBatchRecord>
  >(() => {
    const records: Record<number, AiAppliedBatchRecord> = {};

    aiPromptPages.forEach((page) => {
      const pageItems = playlistItems.slice(page.start, page.end);
      const appliedItems = pageItems.filter(
        (item) => item.answerAiBatchKey !== null,
      );

      if (appliedItems.length === 0) return;

      const newestAppliedAt = appliedItems.reduce(
        (latest, item) => Math.max(latest, item.answerAiUpdatedAt ?? 0),
        0,
      );
      const batchKey =
        appliedItems.find((item) => item.answerAiBatchKey)?.answerAiBatchKey ??
        `saved-ai-page-${page.pageIndex}`;

      records[page.pageIndex] = {
        pageIndex: page.pageIndex,
        batchKey,
        appliedAt: newestAppliedAt,
        changedItems: appliedItems.map((item) => ({
          id: item.dbId ?? item.localId,
          title: item.title ?? "未命名題目",
          oldAnswer: "",
          newAnswer: item.answerText ?? "",
        })),
        unchangedItems: pageItems
          .filter((item) => item.answerAiBatchKey === null)
          .map((item) => ({
            id: item.dbId ?? item.localId,
            title: item.title ?? "未命名題目",
            answerText: item.answerText ?? "",
          })),
      };
    });

    return records;
  }, [aiPromptPages, playlistItems]);

  const displayedAiAppliedBatchRecords = useMemo(
    () => ({
      ...savedAiAppliedBatchRecords,
      ...aiAppliedBatchRecords,
    }),
    [aiAppliedBatchRecords, savedAiAppliedBatchRecords],
  );

  const canApplyAiBatch =
    !aiParsedResult.error && aiPreview.changedItems.length > 0;

  const pendingAiBatchSave: NonIdleAiBatchWriteState | null =
    aiBatchWriteState.status === "idle" ? null : aiBatchWriteState;

  const canCloseAiBatchModal =
    aiBatchWriteState.status === "idle" ||
    aiBatchWriteState.status === "error" ||
    (aiBatchWriteState.status === "success" && !aiBatchWriteState.hasNextPage);

  const aiBatchSaveProgressLabel = pendingAiBatchSave
    ? `第 ${pendingAiBatchSave.pageIndex + 1} / ${pendingAiBatchSave.totalPages} 批`
    : "";

  const aiBatchSaveStepLabel =
    aiBatchWriteState.status === "applying"
      ? "正在套用答案變更"
      : aiBatchWriteState.status === "saving"
        ? "正在寫入收藏庫"
        : aiBatchWriteState.status === "success"
          ? aiBatchWriteState.hasNextPage
            ? "寫入完成，正在切換下一批"
            : "全部寫入完成"
          : aiBatchWriteState.status === "error"
            ? "寫入失敗"
            : "";

  const openAiBatchModal = useCallback(() => {
    setAiBatchPageIndexState(0);
    setAiBatchModalOpen(true);
  }, []);

  const closeAiBatchModal = useCallback(() => {
    if (!canCloseAiBatchModal) return;
    setAiBatchModalOpen(false);
  }, [canCloseAiBatchModal]);

  const setAiBatchPageIndex = useCallback(
    (pageIndex: number) => {
      const maxIndex = Math.max(0, aiPromptPages.length - 1);
      const nextIndex = Math.min(Math.max(0, pageIndex), maxIndex);
      setAiBatchPageIndexState(nextIndex);
    },
    [aiPromptPages.length],
  );

  const setCurrentAiJsonDraft = useCallback(
    (value: string) => {
      setAiJsonDrafts((prev) => ({
        ...prev,
        [effectiveAiBatchPageIndex]: value,
      }));
      setAiAppliedPages((prev) => ({
        ...prev,
        [effectiveAiBatchPageIndex]: false,
      }));
      setAiAppliedBatchRecords((prev) => {
        const next = { ...prev };
        delete next[effectiveAiBatchPageIndex];
        return next;
      });
    },
    [effectiveAiBatchPageIndex],
  );

  const updateAiPromptSettings = useCallback(
    (patch: Partial<AiPromptSettings>) => {
      setAiPromptSettings((prev) => ({
        ...prev,
        ...patch,
      }));
    },
    [],
  );

  const updateAiSplitField = useCallback((index: number, value: string) => {
    setAiPromptSettings((prev) => ({
      ...prev,
      splitFields: prev.splitFields.map((field, fieldIndex) =>
        fieldIndex === index ? value : field,
      ),
    }));
  }, []);

  const addAiSplitField = useCallback(() => {
    setAiPromptSettings((prev) => ({
      ...prev,
      splitFields: [...prev.splitFields, `欄位 ${prev.splitFields.length + 1}`],
    }));
  }, []);

  const removeAiSplitField = useCallback((index: number) => {
    setAiPromptSettings((prev) => {
      if (prev.splitFields.length <= 1) return prev;
      return {
        ...prev,
        splitFields: prev.splitFields.filter(
          (_field, fieldIndex) => fieldIndex !== index,
        ),
      };
    });
  }, []);

  const reorderAiSplitField = useCallback(
    (fromIndex: number, toIndex: number) => {
      setAiPromptSettings((prev) => {
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.splitFields.length ||
          toIndex >= prev.splitFields.length
        ) {
          return prev;
        }

        return {
          ...prev,
          splitFields: reorderItems(prev.splitFields, fromIndex, toIndex),
        };
      });
    },
    [],
  );

  const resetAiBatchWriteState = useCallback(() => {
    setAiBatchWriteState({ status: "idle" });
  }, []);

  const handleCopyAiPrompt = useCallback(async () => {
    await copyTextToClipboard(aiPromptText);
  }, [aiPromptText]);

  const handleOpenAiAssistant = useCallback(async () => {
    const copyPromise = copyTextToClipboard(aiPromptText);

    window.open(
      AI_PROVIDER_BASE_URL,
      "_blank",
      "noopener,noreferrer",
    );

    await copyPromise;
  }, [aiPromptText]);

  const handleApplyAiBatch = useCallback(async () => {
    if (!canApplyAiBatch || aiBatchWriteState.status !== "idle") return;

    const changedCount = aiPreview.changedItems.length;
    const appliedPageIndex = effectiveAiBatchPageIndex;
    const batchKey = `ai_${AI_PROVIDER}_${Date.now()}_p${appliedPageIndex + 1}`;
    const updatedAt = Math.floor(Date.now() / 1000);

    const updates = new Map(
      aiPreview.changedItems.map((item) => [item.id, item.newAnswer] as const),
    );
    const unchangedItems = (currentAiPromptPage?.items ?? [])
      .filter((item) => !updates.has(item.id))
      .map((item) => ({
        id: item.id,
        title: item.title || "未命名題目",
        answerText: item.answerText ?? "",
      }));
    const nextPlaylistItems: EditableItem[] = playlistItems.map((item) => {
      const key = item.dbId ?? item.localId;
      const nextAnswer = updates.get(key);
      if (!nextAnswer) return item;

      return {
        ...item,
        answerText: nextAnswer,
        answerStatus: AI_MODIFIED_STATUS,
        answerAiProvider: AI_PROVIDER,
        answerAiUpdatedAt: updatedAt,
        answerAiBatchKey: batchKey,
      };
    });
    const changedLocalIds = nextPlaylistItems
      .filter((item) => updates.has(item.dbId ?? item.localId))
      .map((item) => item.localId);

    setPlaylistItems(nextPlaylistItems);

    if (changedLocalIds.length > 0) {
      markItemsDirty(changedLocalIds);
    } else {
      markDirty();
    }

    setAiJsonDrafts((prev) => ({
      ...prev,
      [appliedPageIndex]: "",
    }));
    setAiAppliedPages((prev) => ({
      ...prev,
      [appliedPageIndex]: true,
    }));
    setAiAppliedBatchRecords((prev) => {
      return {
        ...prev,
        [appliedPageIndex]: {
          pageIndex: appliedPageIndex,
          batchKey,
          appliedAt: updatedAt,
          changedItems: aiPreview.changedItems,
          unchangedItems,
        },
      };
    });
    const totalPages = aiPromptPages.length;

    setAiBatchWriteState({
      status: "saving",
      pageIndex: appliedPageIndex,
      count: changedCount,
      totalPages,
    });

    const saved = await handleSaveCollection("auto", nextPlaylistItems);

    if (saved) {
      const hasNextPage = appliedPageIndex < aiPromptPages.length - 1;

      setAiBatchWriteState({
        status: "success",
        pageIndex: appliedPageIndex,
        count: changedCount,
        totalPages,
        hasNextPage,
      });

      if (hasNextPage) {
        if (aiBatchSuccessTimerRef.current) {
          window.clearTimeout(aiBatchSuccessTimerRef.current);
        }

        aiBatchSuccessTimerRef.current = window.setTimeout(() => {
          setAiBatchPageIndexState(appliedPageIndex + 1);
          setAiBatchWriteState({ status: "idle" });
          aiBatchSuccessTimerRef.current = null;
        }, 700);
      }

      return;
    }

    setAiBatchWriteState({
      status: "error",
      pageIndex: appliedPageIndex,
      count: changedCount,
      totalPages,
      message: saveError ?? "自動寫入失敗，請稍後再試。",
    });
  }, [
    aiBatchWriteState.status,
    aiPreview.changedItems,
    aiPromptPages.length,
    canApplyAiBatch,
    currentAiPromptPage?.items,
    effectiveAiBatchPageIndex,
    handleSaveCollection,
    markDirty,
    markItemsDirty,
    playlistItems,
    saveError,
    setPlaylistItems,
  ]);

  const handleRetryAiBatchWrite = useCallback(async () => {
    if (aiBatchWriteState.status !== "error") return;

    const retryState = aiBatchWriteState;

    setAiBatchWriteState({
      status: "saving",
      pageIndex: retryState.pageIndex,
      count: retryState.count,
      totalPages: retryState.totalPages,
    });

    const saved = await handleSaveCollection("auto");

    if (saved) {
      const hasNextPage = retryState.pageIndex < aiPromptPages.length - 1;

      setAiBatchWriteState({
        status: "success",
        pageIndex: retryState.pageIndex,
        count: retryState.count,
        totalPages: retryState.totalPages,
        hasNextPage,
      });

      if (hasNextPage) {
        if (aiBatchSuccessTimerRef.current) {
          window.clearTimeout(aiBatchSuccessTimerRef.current);
        }

        aiBatchSuccessTimerRef.current = window.setTimeout(() => {
          setAiBatchPageIndexState(retryState.pageIndex + 1);
          setAiBatchWriteState({ status: "idle" });
          aiBatchSuccessTimerRef.current = null;
        }, 700);
      }

      return;
    }

    setAiBatchWriteState({
      status: "error",
      pageIndex: retryState.pageIndex,
      count: retryState.count,
      totalPages: retryState.totalPages,
      message: saveError ?? "自動寫入失敗，請稍後再試。",
    });
  }, [
    aiBatchWriteState,
    aiPromptPages.length,
    handleSaveCollection,
    saveError,
  ]);

  useEffect(() => {
    return () => {
      if (aiBatchSuccessTimerRef.current) {
        window.clearTimeout(aiBatchSuccessTimerRef.current);
      }
    };
  }, []);

  return {
    aiProviderLabel: AI_PROVIDER_LABEL,
    aiBatchModalOpen,
    openAiBatchModal,
    closeAiBatchModal,
    aiBatchPageIndex: effectiveAiBatchPageIndex,
    setAiBatchPageIndex,
    aiJsonDrafts,
    aiAppliedPages,
    aiAppliedBatchRecords: displayedAiAppliedBatchRecords,
    currentAiJsonDraft,
    setCurrentAiJsonDraft,
    aiBatchWriteState,
    resetAiBatchWriteState,
    aiPromptPages,
    currentAiPromptPage,
    aiPromptSettings,
    updateAiPromptSettings,
    updateAiSplitField,
    addAiSplitField,
    removeAiSplitField,
    reorderAiSplitField,
    aiPromptText,
    aiParsedResult,
    aiPreview,
    aiPageStatuses,
    canApplyAiBatch,
    pendingAiBatchSave,
    canCloseAiBatchModal,
    aiBatchSaveProgressLabel,
    aiBatchSaveStepLabel,
    handleCopyAiPrompt,
    handleOpenAiAssistant,
    handleApplyAiBatch,
    handleRetryAiBatchWrite,
  };
}
