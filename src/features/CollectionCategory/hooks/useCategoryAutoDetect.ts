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

  // Use ref to avoid stale closure on isDetecting check
  const isDetectingRef = useRef(false);
  // Abort controller for the current in-flight request
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset all detection state when collectionId changes (user switched collection)
  // and clean up on unmount.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isDetectingRef.current = false;
    };
  }, [collectionId]);

  // Cancel in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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
        setDetectionState({
          collectionId,
          suggestion: result,
          isDetecting: true,
          hasRun: true,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDetectionState({
          collectionId,
          suggestion: null,
          isDetecting: true,
          hasRun: true,
        });
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        isDetectingRef.current = false;
        setDetectionState((current) => ({
          ...current,
          isDetecting: false,
        }));
      });
  }, [collectionId, items, token]);

  const isStaleCollection =
    collectionId !== undefined && detectionState.collectionId !== collectionId;

  return {
    suggestion: isStaleCollection ? null : detectionState.suggestion,
    isDetecting: isStaleCollection ? false : detectionState.isDetecting,
    hasRun: isStaleCollection ? false : detectionState.hasRun,
    runDetect,
  };
}
