import { useState, useCallback } from "react";
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

  const runDetect = useCallback(() => {
    if (!token || isDetecting) return;
    // Need either collectionId or items to detect
    if (!collectionId && (!items || items.length === 0)) return;

    setIsDetecting(true);

    const detectPromise = collectionId
      ? categoriesApi.detectCategory(token, collectionId)
      : categoriesApi.detectCategoryFromItems(token, items!);

    detectPromise
      .then((result) => {
        setSuggestion(result);
        setHasRun(true);
      })
      .catch(() => {
        // Non-fatal — user can still manually select
        setHasRun(true);
      })
      .finally(() => {
        setIsDetecting(false);
      });
  }, [collectionId, items, token, isDetecting]);

  return { suggestion, isDetecting, hasRun, runDetect };
}
