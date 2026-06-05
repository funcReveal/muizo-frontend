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
  const [suggestion, setSuggestion] = useState<CategoryDetectResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasRun, setHasRun] = useState(false);

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

  useEffect(() => {
    if (collectionId !== undefined) {
      setSuggestion(null);
      setHasRun(false);
      setIsDetecting(false);
    }
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
    setIsDetecting(true);

    const detectPromise = collectionId
      ? categoriesApi.detectCategory(token, collectionId)
      : categoriesApi.detectCategoryFromItems(token, items!);

    detectPromise
      .then((result) => {
        if (controller.signal.aborted) return;
        setSuggestion(result);
        setHasRun(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setHasRun(true);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        isDetectingRef.current = false;
        setIsDetecting(false);
      });
  }, [collectionId, items, token]);

  return { suggestion, isDetecting, hasRun, runDetect };
}
