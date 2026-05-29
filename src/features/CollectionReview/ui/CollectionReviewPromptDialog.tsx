import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import { toast } from "sonner";
import { useAuth } from "@shared/auth/AuthContext";

import { CollectionReviewApiError } from "../model/collectionReviewApi";
import { useCollectionReview } from "../model/useCollectionReview";
import type {
  CollectionReviewSummary,
  CollectionReviewValue,
} from "../model/types";
import { CollectionReviewForm } from "./CollectionReviewForm";

type CollectionReviewPromptDialogProps = {
  collectionId: string | null | undefined;
  promptKey: string | null | undefined;
  enabled?: boolean;
  title?: string;
  description?: string;
  onSubmitted?: (summary: CollectionReviewSummary) => void;
};

const STORAGE_PREFIX = "collection-review-prompt:v1:";
const FIRST_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const SECOND_DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const FIRST_DISMISS_PLAY_COOLDOWN = 10;
const SECOND_DISMISS_PLAY_COOLDOWN = 20;
const MAX_SEEN_RESULT_KEYS = 30;
const MAX_NUDGE_STORAGE_ENTRIES = 300;
const NUDGE_STORAGE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

type ReviewPromptNudgeState = {
  lastPromptAt: number | null;
  dismissCount: number;
  completedSincePrompt: number;
  seenResultKeys: string[];
  disabled: boolean;
  updatedAt: number;
};

const createDefaultNudgeState = (): ReviewPromptNudgeState => ({
  lastPromptAt: null,
  dismissCount: 0,
  completedSincePrompt: 0,
  seenResultKeys: [],
  disabled: false,
  updatedAt: Date.now(),
});

const getStorageKey = (userId: string, collectionId: string) =>
  `${STORAGE_PREFIX}${userId}:${collectionId}`;

const normalizeSeenResultKeys = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .slice(-MAX_SEEN_RESULT_KEYS);
};

const readNudgeState = (
  userId: string,
  collectionId: string,
): ReviewPromptNudgeState => {
  if (typeof window === "undefined") return createDefaultNudgeState();
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId, collectionId));
    if (!raw) return createDefaultNudgeState();
    const parsed = JSON.parse(raw) as Partial<ReviewPromptNudgeState>;

    return {
      lastPromptAt:
        typeof parsed.lastPromptAt === "number" &&
        Number.isFinite(parsed.lastPromptAt)
          ? parsed.lastPromptAt
          : null,
      dismissCount:
        typeof parsed.dismissCount === "number" &&
        Number.isFinite(parsed.dismissCount)
          ? Math.max(0, Math.trunc(parsed.dismissCount))
          : 0,
      completedSincePrompt:
        typeof parsed.completedSincePrompt === "number" &&
        Number.isFinite(parsed.completedSincePrompt)
          ? Math.max(0, Math.trunc(parsed.completedSincePrompt))
          : 0,
      seenResultKeys: normalizeSeenResultKeys(parsed.seenResultKeys),
      disabled: parsed.disabled === true,
      updatedAt:
        typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
          ? parsed.updatedAt
          : typeof parsed.lastPromptAt === "number" &&
              Number.isFinite(parsed.lastPromptAt)
            ? parsed.lastPromptAt
            : Date.now(),
    };
  } catch {
    return createDefaultNudgeState();
  }
};

const pruneNudgeStorage = (now: number) => {
  if (typeof window === "undefined") return;
  try {
    const entries: Array<{ key: string; updatedAt: number }> = [];
    const staleKeys: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;

      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw
          ? (JSON.parse(raw) as Partial<ReviewPromptNudgeState>)
          : null;
        const updatedAt =
          typeof parsed?.updatedAt === "number" &&
          Number.isFinite(parsed.updatedAt)
            ? parsed.updatedAt
            : typeof parsed?.lastPromptAt === "number" &&
                Number.isFinite(parsed.lastPromptAt)
              ? parsed.lastPromptAt
              : 0;

        if (!updatedAt || now - updatedAt > NUDGE_STORAGE_TTL_MS) {
          staleKeys.push(key);
          continue;
        }

        entries.push({ key, updatedAt });
      } catch {
        staleKeys.push(key);
      }
    }

    const overflowCount = entries.length - MAX_NUDGE_STORAGE_ENTRIES;
    const overflowKeys =
      overflowCount > 0
        ? entries
            .sort((a, b) => a.updatedAt - b.updatedAt)
            .slice(0, overflowCount)
            .map((entry) => entry.key)
        : [];

    for (const key of [...staleKeys, ...overflowKeys]) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Pruning is best-effort and must never block settlement UI.
  }
};

const writeNudgeState = (
  userId: string,
  collectionId: string,
  state: ReviewPromptNudgeState,
) => {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    window.localStorage.setItem(
      getStorageKey(userId, collectionId),
      JSON.stringify({
        ...state,
        updatedAt: now,
        seenResultKeys: state.seenResultKeys.slice(-MAX_SEEN_RESULT_KEYS),
      }),
    );
    pruneNudgeStorage(now);
  } catch {
    // Storage failures should not block reviewing or normal settlement flow.
  }
};

const appendSeenResultKey = (
  state: ReviewPromptNudgeState,
  resultKey: string,
) => {
  if (state.seenResultKeys.includes(resultKey)) return state.seenResultKeys;
  return [...state.seenResultKeys, resultKey].slice(-MAX_SEEN_RESULT_KEYS);
};

const shouldShowPromptForState = (
  state: ReviewPromptNudgeState,
  now: number,
) => {
  if (state.disabled) return false;
  if (state.lastPromptAt === null) return true;
  if (state.dismissCount <= 1) {
    return (
      now - state.lastPromptAt >= FIRST_DISMISS_COOLDOWN_MS ||
      state.completedSincePrompt >= FIRST_DISMISS_PLAY_COOLDOWN
    );
  }
  if (state.dismissCount === 2) {
    return (
      now - state.lastPromptAt >= SECOND_DISMISS_COOLDOWN_MS ||
      state.completedSincePrompt >= SECOND_DISMISS_PLAY_COOLDOWN
    );
  }
  return false;
};

const markResultCompleted = (
  state: ReviewPromptNudgeState,
  resultKey: string,
) => ({
  ...state,
  completedSincePrompt: state.completedSincePrompt + 1,
  seenResultKeys: appendSeenResultKey(state, resultKey),
});

const markPromptShown = (
  state: ReviewPromptNudgeState,
  resultKey: string,
  now: number,
) => ({
  ...state,
  lastPromptAt: now,
  completedSincePrompt: 0,
  seenResultKeys: appendSeenResultKey(state, resultKey),
});

const markPromptDismissed = (state: ReviewPromptNudgeState) => {
  const dismissCount = state.dismissCount + 1;
  return {
    ...state,
    dismissCount,
    disabled: dismissCount >= 3,
  };
};

const buildFormKey = (summary: CollectionReviewSummary | null) => {
  const review = summary?.myReview;
  if (!review) return "new-review";
  return `${review.id}:${review.updatedAt}:${review.rating}`;
};

const getErrorMessage = (error: unknown): string | null => {
  if (!error) return null;

  if (error instanceof CollectionReviewApiError) {
    if (error.code === "COLLECTION_NOT_PLAYED") {
      return "完成遊玩後才能替這份收藏庫評分。";
    }

    if (error.code === "UNAUTHORIZED" || error.status === 401) {
      return "請先登入後再送出評分。";
    }

    return error.message;
  }

  if (error instanceof Error) return error.message;

  return "評分送出失敗，請稍後再試。";
};

export function CollectionReviewPromptDialog({
  collectionId,
  promptKey,
  enabled = true,
  title = "你覺得這個收藏庫好玩嗎？",
  description = "幫作者評分一下吧！",
  onSubmitted,
}: CollectionReviewPromptDialogProps) {
  const normalizedCollectionId = collectionId?.trim() ?? "";
  const normalizedPromptKey = promptKey?.trim() ?? "";
  const { authToken, authUser } = useAuth();
  const shouldAutoFocusComment = useMediaQuery("(min-width: 768px)");
  const activePromptStateRef = useRef<ReviewPromptNudgeState | null>(null);

  const {
    summary,
    myReview,
    isLoading,
    isError,
    error,
    submitReview,
    isSubmitting,
    submitError,
  } = useCollectionReview({
    collectionId: normalizedCollectionId,
    enabled:
      enabled &&
      normalizedCollectionId.length > 0 &&
      normalizedPromptKey.length > 0 &&
      Boolean(authToken && authUser),
  });

  const [open, setOpen] = useState(false);
  const formKey = useMemo(() => buildFormKey(summary), [summary]);
  const queryErrorMessage = isError ? getErrorMessage(error) : null;
  const submitErrorMessage = getErrorMessage(submitError);

  useEffect(() => {
    if (!enabled) return;
    if (!authToken || !authUser) return;
    if (!normalizedCollectionId || !normalizedPromptKey) return;
    if (isLoading || queryErrorMessage || !summary || myReview) return;

    const currentState = readNudgeState(authUser.id, normalizedCollectionId);
    if (currentState.seenResultKeys.includes(normalizedPromptKey)) return;

    const now = Date.now();
    if (!shouldShowPromptForState(currentState, now)) {
      writeNudgeState(
        authUser.id,
        normalizedCollectionId,
        markResultCompleted(currentState, normalizedPromptKey),
      );
      return;
    }

    const timer = window.setTimeout(() => {
      const nextState = markPromptShown(
        currentState,
        normalizedPromptKey,
        now,
      );
      activePromptStateRef.current = nextState;
      writeNudgeState(authUser.id, normalizedCollectionId, nextState);
      setOpen(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    authToken,
    authUser,
    enabled,
    isLoading,
    myReview,
    normalizedCollectionId,
    normalizedPromptKey,
    queryErrorMessage,
    summary,
  ]);

  const handleClose = () => {
    if (isSubmitting) return;
    if (authUser && normalizedCollectionId && activePromptStateRef.current) {
      const nextState = markPromptDismissed(activePromptStateRef.current);
      writeNudgeState(authUser.id, normalizedCollectionId, nextState);
      activePromptStateRef.current = null;
    }
    setOpen(false);
  };

  const handleSubmit = async (value: CollectionReviewValue) => {
    const nextSummary = await submitReview(value);
    toast.success("已送出評分，謝謝你的回饋。");
    activePromptStateRef.current = null;
    setOpen(false);
    onSubmitted?.(nextSummary);
  };

  if (!normalizedCollectionId || !normalizedPromptKey) {
    return null;
  }

  return (
    <Drawer
      anchor="bottom"
      open={open && !queryErrorMessage}
      onClose={handleClose}
      ModalProps={{ keepMounted: false }}
      PaperProps={{
        className:
          "!mx-auto !w-full !max-w-[520px] !rounded-t-[24px] !border-x !border-t !border-white/10 !bg-slate-950 !text-slate-100",
      }}
    >
      <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">
              <RateReviewRoundedIcon sx={{ fontSize: 22 }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black tracking-[0.02em] text-slate-50">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                {description}
              </p>
            </div>
          </div>

          <IconButton
            size="small"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="關閉評分提示"
            className="!h-9 !w-9 !shrink-0 !rounded-full !border !border-white/10 !bg-white/[0.03] !text-slate-200"
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </div>

        <CollectionReviewForm
          key={`${formKey}:prompt`}
          compact
          autoFocusComment={shouldAutoFocusComment}
          disabled={isSubmitting}
          submitting={isSubmitting}
          initialRating={null}
          initialComment={null}
          submitLabel="送出評分"
          errorMessage={submitErrorMessage}
          onSubmit={handleSubmit}
        />
      </div>
    </Drawer>
  );
}
