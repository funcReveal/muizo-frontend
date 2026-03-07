import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import {
  RECOMMEND_CATEGORY_FLOW,
  resolveAutoGuideStartTarget,
  resolveRecapPreviewNavigation,
  type RecommendCategory,
} from "../liveSettlementUtils";

type PreviewPlaybackMode = "idle" | "auto" | "manual";

interface RecommendCardRecapBase {
  key: string;
  order: number;
}

interface RecommendationCardLike<TRecap extends RecommendCardRecapBase> {
  recap: TRecap;
  previewUrl: string | null;
}

interface UseSettlementRecommendationNavigatorParams<
  TRecap extends RecommendCardRecapBase,
  TCard extends RecommendationCardLike<TRecap>,
> {
  recommendationCardsByCategory: Record<RecommendCategory, TCard[]>;
  recommendationCards: TCard[];
  activeRecommendCategory: RecommendCategory;
  safeRecommendIndex: number;
  autoPreviewEnabled: boolean;
  reviewDoubleClickPlayEnabled: boolean;
  previewPlaybackMode: PreviewPlaybackMode;
  canAutoGuideLoop: boolean;
  recommendPreviewSeconds: number;
  pausedCountdownRemainingMsRef: MutableRefObject<number | null>;
  previewPlayerStateRef: MutableRefObject<"idle" | "playing" | "paused">;
  pushPreviewSwitchNotice: (text: string) => void;
  setRecommendCategory: Dispatch<SetStateAction<RecommendCategory>>;
  setRecommendIndex: Dispatch<SetStateAction<number>>;
  setSelectedRecapKey: Dispatch<SetStateAction<string | null>>;
  setPreviewPlaybackMode: Dispatch<SetStateAction<PreviewPlaybackMode>>;
  setPreviewRecapKey: Dispatch<SetStateAction<string | null>>;
  setPreviewPlayerState: Dispatch<
    SetStateAction<"idle" | "playing" | "paused">
  >;
  setAutoAdvanceAtMs: Dispatch<SetStateAction<number | null>>;
  setPausedCountdownRemainingMs: Dispatch<SetStateAction<number | null>>;
  setPreviewCountdownSec: Dispatch<SetStateAction<number>>;
}

interface UseSettlementRecommendationNavigatorResult<
  TRecap extends RecommendCardRecapBase,
> {
  jumpToRecommendation: (
    nextCategory: RecommendCategory,
    nextIndex: number,
    options?: { forcePreview?: boolean; playbackMode?: PreviewPlaybackMode },
  ) => void;
  jumpToRecapPreview: (
    recap: TRecap,
    source?: "click" | "doubleClick",
  ) => boolean;
  startAutoGuideFromPreferredCategory: (preferredCategory: RecommendCategory) => void;
  activateRecommendationCategory: (nextCategory: RecommendCategory) => void;
  goPrevRecommendation: () => void;
  goNextRecommendation: () => void;
  recommendNavLabels: { prev: string; next: string };
  advanceAutoRecommendationLoop: () => void;
}

const useSettlementRecommendationNavigator = <
  TRecap extends RecommendCardRecapBase,
  TCard extends RecommendationCardLike<TRecap>,
>({
  recommendationCardsByCategory,
  recommendationCards,
  activeRecommendCategory,
  safeRecommendIndex,
  autoPreviewEnabled,
  reviewDoubleClickPlayEnabled,
  previewPlaybackMode,
  canAutoGuideLoop,
  recommendPreviewSeconds,
  pausedCountdownRemainingMsRef,
  previewPlayerStateRef,
  pushPreviewSwitchNotice,
  setRecommendCategory,
  setRecommendIndex,
  setSelectedRecapKey,
  setPreviewPlaybackMode,
  setPreviewRecapKey,
  setPreviewPlayerState,
  setAutoAdvanceAtMs,
  setPausedCountdownRemainingMs,
  setPreviewCountdownSec,
}: UseSettlementRecommendationNavigatorParams<
  TRecap,
  TCard
>): UseSettlementRecommendationNavigatorResult<TRecap> => {
  const recommendationCardsByCategoryRef = useRef(recommendationCardsByCategory);
  useEffect(() => {
    recommendationCardsByCategoryRef.current = recommendationCardsByCategory;
  }, [recommendationCardsByCategory]);

  const getFirstAutoPlayableIndex = useCallback((cards: TCard[]) => {
    if (!cards.length) return 0;
    const previewIndex = cards.findIndex((card) => Boolean(card.previewUrl));
    return previewIndex >= 0 ? previewIndex : 0;
  }, []);

  const jumpToRecommendation = useCallback(
    (
      nextCategory: RecommendCategory,
      nextIndex: number,
      options?: { forcePreview?: boolean; playbackMode?: PreviewPlaybackMode },
    ) => {
      const nextCards = recommendationCardsByCategoryRef.current[nextCategory];
      if (!nextCards.length) {
        setPreviewPlaybackMode("idle");
        setPreviewRecapKey(null);
        setPreviewPlayerState("idle");
        setAutoAdvanceAtMs(null);
        setPausedCountdownRemainingMs(null);
        return;
      }
      const safeIndex = Math.max(0, Math.min(nextIndex, nextCards.length - 1));
      const targetCard = nextCards[safeIndex];

      setRecommendCategory(nextCategory);
      setRecommendIndex(safeIndex);
      setSelectedRecapKey(targetCard?.recap.key ?? null);
      pushPreviewSwitchNotice(`已切換至第 ${targetCard.recap.order} 題`);

      const nextPlaybackMode =
        options?.playbackMode ?? (autoPreviewEnabled ? "auto" : "idle");
      const hasPreview = Boolean(targetCard?.previewUrl);
      const keepPausedWhenSwitching =
        !options?.forcePreview &&
        (pausedCountdownRemainingMsRef.current !== null ||
          previewPlayerStateRef.current === "paused");

      if (nextPlaybackMode === "manual") {
        setPreviewPlaybackMode("manual");
        if (!hasPreview) {
          setPreviewRecapKey(null);
          setPreviewPlayerState("idle");
          setAutoAdvanceAtMs(null);
          setPausedCountdownRemainingMs(null);
          setPreviewCountdownSec(recommendPreviewSeconds);
          return;
        }
        setPreviewRecapKey(targetCard.recap.key);
        if (keepPausedWhenSwitching) {
          const frozenMs =
            pausedCountdownRemainingMsRef.current ?? recommendPreviewSeconds * 1000;
          setPreviewPlayerState("paused");
          setAutoAdvanceAtMs(null);
          setPausedCountdownRemainingMs(frozenMs);
          setPreviewCountdownSec(Math.max(0, Math.ceil(frozenMs / 1000)));
        } else {
          setPreviewPlayerState("playing");
          setAutoAdvanceAtMs(null);
          setPausedCountdownRemainingMs(null);
          setPreviewCountdownSec(recommendPreviewSeconds);
        }
        return;
      }

      if (nextPlaybackMode === "auto" || options?.forcePreview) {
        setPreviewPlaybackMode("auto");
        if (keepPausedWhenSwitching) {
          const frozenMs =
            pausedCountdownRemainingMsRef.current ?? recommendPreviewSeconds * 1000;
          setPreviewRecapKey(hasPreview ? targetCard.recap.key : null);
          setPreviewPlayerState("paused");
          setAutoAdvanceAtMs(null);
          setPausedCountdownRemainingMs(frozenMs);
          setPreviewCountdownSec(Math.max(0, Math.ceil(frozenMs / 1000)));
        } else {
          setPreviewRecapKey(hasPreview ? targetCard.recap.key : null);
          setPreviewPlayerState("idle");
          setAutoAdvanceAtMs(
            hasPreview ? Date.now() + recommendPreviewSeconds * 1000 : null,
          );
          setPausedCountdownRemainingMs(null);
          setPreviewCountdownSec(recommendPreviewSeconds);
        }
        return;
      }

      setPreviewPlaybackMode("idle");
      setAutoAdvanceAtMs(null);
      if (keepPausedWhenSwitching) {
        const frozenMs =
          pausedCountdownRemainingMsRef.current ?? recommendPreviewSeconds * 1000;
        setPreviewRecapKey(hasPreview ? targetCard.recap.key : null);
        setPreviewPlayerState("paused");
        setPausedCountdownRemainingMs(frozenMs);
        setPreviewCountdownSec(Math.max(0, Math.ceil(frozenMs / 1000)));
      } else {
        setPreviewPlayerState("idle");
        setPausedCountdownRemainingMs(null);
        setPreviewCountdownSec(recommendPreviewSeconds);
        setPreviewRecapKey(null);
      }
    },
    [
      autoPreviewEnabled,
      pausedCountdownRemainingMsRef,
      previewPlayerStateRef,
      pushPreviewSwitchNotice,
      recommendPreviewSeconds,
      setAutoAdvanceAtMs,
      setPausedCountdownRemainingMs,
      setPreviewCountdownSec,
      setPreviewPlaybackMode,
      setPreviewPlayerState,
      setPreviewRecapKey,
      setRecommendCategory,
      setRecommendIndex,
      setSelectedRecapKey,
    ],
  );

  const jumpToRecapPreview = useCallback(
    (recap: TRecap, source: "click" | "doubleClick" = "doubleClick") => {
      for (const category of RECOMMEND_CATEGORY_FLOW) {
        const cards = recommendationCardsByCategoryRef.current[category];
        const targetIndex = cards.findIndex((card) => card.recap.key === recap.key);
        if (targetIndex < 0) continue;
        const navigation = resolveRecapPreviewNavigation(source, {
          autoPreviewEnabled,
          reviewDoubleClickPlayEnabled,
        });
        jumpToRecommendation(category, targetIndex, navigation);
        return true;
      }
      return false;
    },
    [autoPreviewEnabled, jumpToRecommendation, reviewDoubleClickPlayEnabled],
  );

  const startAutoGuideFromPreferredCategory = useCallback(
    (preferredCategory: RecommendCategory) => {
      const target = resolveAutoGuideStartTarget(
        recommendationCardsByCategoryRef.current,
        preferredCategory,
      );
      if (!target) {
        setPreviewPlaybackMode("idle");
        setPreviewRecapKey(null);
        setPreviewPlayerState("idle");
        setAutoAdvanceAtMs(null);
        setPausedCountdownRemainingMs(null);
        return;
      }
      jumpToRecommendation(target.category, target.index, {
        playbackMode: "auto",
      });
    },
    [
      jumpToRecommendation,
      setAutoAdvanceAtMs,
      setPausedCountdownRemainingMs,
      setPreviewPlaybackMode,
      setPreviewPlayerState,
      setPreviewRecapKey,
    ],
  );

  const activateRecommendationCategory = useCallback(
    (nextCategory: RecommendCategory) => {
      const nextCards = recommendationCardsByCategory[nextCategory];
      if (!nextCards.length) return;
      const nextIndex = getFirstAutoPlayableIndex(nextCards);
      jumpToRecommendation(nextCategory, nextIndex, {
        playbackMode: previewPlaybackMode === "manual" ? "manual" : undefined,
      });
    },
    [
      getFirstAutoPlayableIndex,
      jumpToRecommendation,
      previewPlaybackMode,
      recommendationCardsByCategory,
    ],
  );

  const goPrevRecommendation = useCallback(() => {
    const total = recommendationCards.length;
    if (total <= 0) return;
    if (safeRecommendIndex > 0) {
      jumpToRecommendation(activeRecommendCategory, safeRecommendIndex - 1, {
        playbackMode: previewPlaybackMode === "manual" ? "manual" : undefined,
      });
      return;
    }
    const currentFlowIdx = RECOMMEND_CATEGORY_FLOW.indexOf(activeRecommendCategory);
    for (let offset = 1; offset <= RECOMMEND_CATEGORY_FLOW.length; offset += 1) {
      const prevCategory =
        RECOMMEND_CATEGORY_FLOW[
          (currentFlowIdx - offset + RECOMMEND_CATEGORY_FLOW.length) %
            RECOMMEND_CATEGORY_FLOW.length
        ];
      const cards = recommendationCardsByCategoryRef.current[prevCategory];
      if (!cards.length) continue;
      jumpToRecommendation(prevCategory, cards.length - 1, {
        playbackMode: previewPlaybackMode === "manual" ? "manual" : undefined,
      });
      return;
    }
  }, [
    activeRecommendCategory,
    jumpToRecommendation,
    previewPlaybackMode,
    recommendationCards.length,
    safeRecommendIndex,
  ]);

  const goNextRecommendation = useCallback(() => {
    const total = recommendationCards.length;
    if (total <= 0) return;
    if (safeRecommendIndex < total - 1) {
      jumpToRecommendation(activeRecommendCategory, safeRecommendIndex + 1, {
        playbackMode: previewPlaybackMode === "manual" ? "manual" : undefined,
      });
      return;
    }
    const currentFlowIdx = RECOMMEND_CATEGORY_FLOW.indexOf(activeRecommendCategory);
    for (let offset = 1; offset <= RECOMMEND_CATEGORY_FLOW.length; offset += 1) {
      const nextCategory =
        RECOMMEND_CATEGORY_FLOW[
          (currentFlowIdx + offset) % RECOMMEND_CATEGORY_FLOW.length
        ];
      const cards = recommendationCardsByCategoryRef.current[nextCategory];
      if (!cards.length) continue;
      jumpToRecommendation(nextCategory, 0, {
        playbackMode: previewPlaybackMode === "manual" ? "manual" : undefined,
      });
      return;
    }
  }, [
    activeRecommendCategory,
    jumpToRecommendation,
    previewPlaybackMode,
    recommendationCards.length,
    safeRecommendIndex,
  ]);

  const recommendNavLabels = useMemo(() => {
    const total = recommendationCards.length;
    if (total <= 0) {
      return { prev: "上一首", next: "下一首" };
    }
    const currentFlowIdx = RECOMMEND_CATEGORY_FLOW.indexOf(activeRecommendCategory);
    let hasPrevCategory = false;
    let hasNextCategory = false;
    for (let offset = 1; offset < RECOMMEND_CATEGORY_FLOW.length; offset += 1) {
      const prevCategory =
        RECOMMEND_CATEGORY_FLOW[
          (currentFlowIdx - offset + RECOMMEND_CATEGORY_FLOW.length) %
            RECOMMEND_CATEGORY_FLOW.length
        ];
      const nextCategory =
        RECOMMEND_CATEGORY_FLOW[
          (currentFlowIdx + offset) % RECOMMEND_CATEGORY_FLOW.length
        ];
      if (
        !hasPrevCategory &&
        recommendationCardsByCategory[prevCategory].length > 0
      ) {
        hasPrevCategory = true;
      }
      if (
        !hasNextCategory &&
        recommendationCardsByCategory[nextCategory].length > 0
      ) {
        hasNextCategory = true;
      }
      if (hasPrevCategory && hasNextCategory) break;
    }
    return {
      prev: safeRecommendIndex <= 0 && hasPrevCategory ? "上一類" : "上一首",
      next:
        safeRecommendIndex >= total - 1 && hasNextCategory ? "下一類" : "下一首",
    };
  }, [
    activeRecommendCategory,
    recommendationCards.length,
    recommendationCardsByCategory,
    safeRecommendIndex,
  ]);

  const advanceAutoRecommendationLoop = useCallback(() => {
    if (!canAutoGuideLoop) return;
    const currentCards =
      recommendationCardsByCategoryRef.current[activeRecommendCategory];
    if (currentCards.length <= 0) return;
    if (safeRecommendIndex < currentCards.length - 1) {
      jumpToRecommendation(activeRecommendCategory, safeRecommendIndex + 1);
      return;
    }
    const currentFlowIdx = RECOMMEND_CATEGORY_FLOW.indexOf(activeRecommendCategory);
    for (let offset = 1; offset <= RECOMMEND_CATEGORY_FLOW.length; offset += 1) {
      const category =
        RECOMMEND_CATEGORY_FLOW[
          (currentFlowIdx + offset + RECOMMEND_CATEGORY_FLOW.length) %
            RECOMMEND_CATEGORY_FLOW.length
        ];
      const cards = recommendationCardsByCategoryRef.current[category];
      if (cards.length <= 0) continue;
      const nextIndex = getFirstAutoPlayableIndex(cards);
      jumpToRecommendation(category, nextIndex);
      return;
    }
  }, [
    activeRecommendCategory,
    canAutoGuideLoop,
    getFirstAutoPlayableIndex,
    jumpToRecommendation,
    safeRecommendIndex,
  ]);

  return {
    jumpToRecommendation,
    jumpToRecapPreview,
    startAutoGuideFromPreferredCategory,
    activateRecommendationCategory,
    goPrevRecommendation,
    goNextRecommendation,
    recommendNavLabels,
    advanceAutoRecommendationLoop,
  };
};

export default useSettlementRecommendationNavigator;
