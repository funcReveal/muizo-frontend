import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditableItem } from "../utils/editTypes";

const AI_BATCH_PAGE_SIZE = 100;
const MAX_AI_ASSISTANT_URL_LENGTH = 45000;
const AI_PROVIDER = "gemini";
const AI_PROVIDER_LABEL = "Gemini";
const AI_PROVIDER_BASE_URL = "https://gemini.google.com/app";

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

export type AiPreviewItem = {
  id: string;
  title: string;
  oldAnswer: string;
  newAnswer: string;
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
  const [aiHelperNotice, setAiHelperNotice] = useState<string | null>(null);
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
        "You are a music quiz answer normalization assistant.",
        "Use each item's song title and uploader to revise answerText into the most official and commonly recognized song title.",
        "",
        "Rules:",
        "1. Return exactly one ```json``` code block and nothing else.",
        "2. Keep every original id. Do not add or remove items.",
        "3. Return only answerText for each item. Do not output any other fields.",
        "4. Preserve the song title's original dominant language whenever possible. Do not translate the title unless the translated form is clearly the official/common primary title.",
        "5. If the title is mixed-language, prefer the most official and widely recognized primary form.",
        "6. If you are uncertain, keep the original answerText unchanged.",
        '7. The output format must be {"items":[{"id":"...","answerText":"..."}]}.',
        "",
        "Items to normalize:",
        aiPromptPayload,
      ].join("\n"),
    [aiPromptPayload],
  );

  const aiPromptUrl = useMemo(() => {
    const encoded = encodeURIComponent(aiPromptText);
    return `${AI_PROVIDER_BASE_URL}?q=${encoded}`;
  }, [aiPromptText]);

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
    setAiHelperNotice(null);
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
      setAiHelperNotice(null);
      setAiBatchPageIndexState(nextIndex);
    },
    [aiPromptPages.length],
  );

  const setCurrentAiJsonDraft = useCallback(
    (value: string) => {
      setAiHelperNotice(null);
      setAiJsonDrafts((prev) => ({
        ...prev,
        [effectiveAiBatchPageIndex]: value,
      }));
      setAiAppliedPages((prev) => ({
        ...prev,
        [effectiveAiBatchPageIndex]: false,
      }));
    },
    [effectiveAiBatchPageIndex],
  );

  const resetAiBatchWriteState = useCallback(() => {
    setAiBatchWriteState({ status: "idle" });
  }, []);

  const handleCopyAiPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiPromptText);
      setAiHelperNotice("Prompt 已複製，可以直接貼到 AI。");
    } catch {
      setAiHelperNotice("無法自動複製，請手動複製下方內容。");
    }
  }, [aiPromptText]);

  const handleOpenAiAssistant = useCallback(async () => {
    if (aiPromptUrl && aiPromptUrl.length <= MAX_AI_ASSISTANT_URL_LENGTH) {
      window.open(aiPromptUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await navigator.clipboard.writeText(aiPromptText);
      setAiHelperNotice(
        `Prompt 過長，這次不會自動帶入 ${AI_PROVIDER_LABEL}，已改為複製內容並開啟首頁，請直接貼上。`,
      );
    } catch {
      setAiHelperNotice(
        `Prompt 過長，這次不會自動帶入 ${AI_PROVIDER_LABEL}。若未自動複製，請手動複製下方內容。`,
      );
    }

    window.open(AI_PROVIDER_BASE_URL, "_blank", "noopener,noreferrer");
  }, [aiPromptText, aiPromptUrl]);

  const handleApplyAiBatch = useCallback(async () => {
    if (!canApplyAiBatch || aiBatchWriteState.status !== "idle") return;

    const changedCount = aiPreview.changedItems.length;
    const appliedPageIndex = effectiveAiBatchPageIndex;
    const batchKey = `ai_${AI_PROVIDER}_${Date.now()}_p${appliedPageIndex + 1}`;
    const updatedAt = Math.floor(Date.now() / 1000);

    const updates = new Map(
      aiPreview.changedItems.map((item) => [item.id, item.newAnswer] as const),
    );
    const nextPlaylistItems = playlistItems.map((item) => {
      const key = item.dbId ?? item.localId;
      const nextAnswer = updates.get(key);
      if (!nextAnswer) return item;

      return {
        ...item,
        answerText: nextAnswer,
        answerStatus: "ai_modified",
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
    setAiHelperNotice(
      `已套用第 ${appliedPageIndex + 1} 批的 ${changedCount} 筆答案，正在自動寫入。`,
    );

    const totalPages = aiPromptPages.length;

    setAiBatchWriteState({
      status: "saving",
      pageIndex: appliedPageIndex,
      count: changedCount,
      totalPages,
    });

    const saved = await handleSaveCollection("auto", nextPlaylistItems);

    if (saved) {
      setAiHelperNotice(
        `已套用第 ${appliedPageIndex + 1} 批的 ${changedCount} 筆答案，已送出寫入。`,
      );

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

    setAiHelperNotice(
      `已套用第 ${appliedPageIndex + 1} 批的 ${changedCount} 筆答案，但自動寫入失敗，請檢查右上角儲存錯誤後重試。`,
    );

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
    aiHelperNotice,
    currentAiJsonDraft,
    setCurrentAiJsonDraft,
    aiBatchWriteState,
    resetAiBatchWriteState,
    aiPromptPages,
    currentAiPromptPage,
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
