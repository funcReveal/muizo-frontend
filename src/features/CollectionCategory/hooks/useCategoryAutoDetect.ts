import { useState, useCallback, useRef, useEffect } from "react";
import {
  categoriesApi,
  type CategoryDetectResult,
  type DetectItemInput,
} from "../api/categoriesApi";

type UseCategoryAutoDetectOptions = {
  /** For edit flow: detect from saved collection */
  collectionId?: string | null;
  /** For create flow: detect from draft items in memory */
  items?: DetectItemInput[] | null;
  token: string | null | undefined;
};

type UseCategoryAutoDetectReturn = {
  suggestion: CategoryDetectResult | null;
  isDetecting: boolean;
  hasRun: boolean;
  runDetect: () => void;
};

export function useCategoryAutoDetect({
  collectionId,
  items,
  token,
}: UseCategoryAutoDetectOptions): UseCategoryAutoDetectReturn {
  // Single state object tracks the collectionId that triggered the last detection
  // so stale results from a previous collection are never surfaced.
  const [detectionState, setDetectionState] = useState<{
    collectionId: string | null | undefined;
    suggestion: CategoryDetectResult | null;
    isDetecting: boolean;
    hasRun: boolean;
  }>({
    collectionId,
    suggestion: null,
    isDetecting: false,
    hasRun: false,
  });

  const isDetectingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort any in-flight request when:
  //   a) collectionId changes (user switched collection) — cleanup fires, then new effect runs
  //   b) component unmounts — final cleanup fires
  // A single [collectionId] effect handles both cases; a separate [] effect is not needed.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isDetectingRef.current = false;
    };
  }, [collectionId]);

  const runDetect = useCallback(() => {
    if (!token || isDetectingRef.current) return;
    if (!collectionId && (!items || items.length === 0)) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    isDetectingRef.current = true;
    setDetectionState({
      collectionId,
      suggestion: null,
      isDetecting: true,
      hasRun: false,
    });

    const detectPromise = collectionId
      ? categoriesApi.detectCategory(token, collectionId)
      : categoriesApi.detectCategoryFromItems(token, items!);

    detectPromise
      .then((result) => {
        if (controller.signal.aborted) return;
        // Merge suggestion + terminal state in a single update — no intermediate render.
        setDetectionState({
          collectionId,
          suggestion: result,
          isDetecting: false,
          hasRun: true,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // 429 (rate-limited) or network error: mark as run with no suggestion.
        setDetectionState({
          collectionId,
          suggestion: null,
          isDetecting: false,
          hasRun: true,
        });
      })
      .finally(() => {
        // Only reset the ref — state was already set to isDetecting:false above.
        isDetectingRef.current = false;
      });
  }, [collectionId, items, token]);

  // Hide stale results when collectionId changed but runDetect hasn't fired yet.
  const isStaleCollection =
    collectionId !== undefined && detectionState.collectionId !== collectionId;

  return {
    suggestion: isStaleCollection ? null : detectionState.suggestion,
    isDetecting: isStaleCollection ? false : detectionState.isDetecting,
    hasRun: isStaleCollection ? false : detectionState.hasRun,
    runDetect,
  };
}
