import { useMemo, useState } from "react";

import type {
  CareerOverviewData,
  CareerShareCardData,
  CareerShareQueryResult,
  CareerShareTemplate,
} from "../types/career";
import {
  formatCareerPlayTime,
  formatCareerRank,
  formatCareerScore,
  formatCareerSignedInt,
  formatCareerSignedPercent,
} from "./careerUiFormatters";

const buildPreviewByTemplate = (
  template: CareerShareTemplate,
  overview: CareerOverviewData,
): CareerShareCardData => {
  const base: CareerShareCardData = {
    playerName: overview.hero.displayName,
    descriptor: overview.hero.descriptor,
    totalMatches: overview.hero.totalMatches,
    totalScore: overview.hero.totalScore,
    bestScore: overview.hero.bestScore,
    bestRank: overview.hero.bestRank,
    bestCombo: overview.hero.bestCombo,
    playTimeSec: overview.hero.playTimeSec,
    weeklyScoreDelta: overview.weekly.scoreDelta,
    weeklyMatchesDelta: overview.weekly.matchesDelta,
    weeklyAccuracyDelta: overview.weekly.accuracyDelta,
    highlightTitle: "生涯最高分",
    highlightValue: formatCareerScore(overview.hero.bestScore),
    highlightSubtitle: `最佳名次 ${formatCareerRank(overview.hero.bestRank)} · ${formatCareerPlayTime(
      overview.hero.playTimeSec,
    )}`,
  };

  if (template === "weekly") {
    return {
      ...base,
      descriptor: "本週成長摘要",
      highlightTitle: "本週總分成長",
      highlightValue: formatCareerSignedInt(overview.weekly.scoreDelta),
      highlightSubtitle: `對戰 ${formatCareerSignedInt(
        overview.weekly.matchesDelta,
      )} · 答對率 ${formatCareerSignedPercent(overview.weekly.accuracyDelta)}`,
    };
  }

  if (template === "highlight") {
    const highlight = overview.highlights[0];
    return {
      ...base,
      descriptor: "高光單場",
      highlightTitle: highlight?.label ?? "代表紀錄",
      highlightValue: highlight?.value ?? formatCareerScore(overview.hero.bestScore),
      highlightSubtitle: highlight?.subtitle ?? overview.hero.descriptor,
    };
  }

  return base;
};

const buildCaption = (
  template: CareerShareTemplate,
  overview: CareerOverviewData,
) => {
  if (template === "weekly") {
    return `這週在 Muizo 累積 ${overview.weekly.currentMatches} 場，總分 ${formatCareerScore(
      overview.weekly.currentScore,
    )}，比前一週 ${formatCareerSignedInt(overview.weekly.scoreDelta)}。`;
  }
  if (template === "highlight") {
    const highlight = overview.highlights[0];
    return `我在 Muizo 打出 ${highlight?.label ?? "代表紀錄"}：${
      highlight?.value ?? formatCareerScore(overview.hero.bestScore)
    }，來自 ${highlight?.subtitle ?? "近期對戰"}。`;
  }
  return `我的 Muizo 生涯目前累積 ${overview.hero.totalMatches} 場、總分 ${formatCareerScore(
    overview.hero.totalScore,
  )}，最佳名次 ${formatCareerRank(overview.hero.bestRank)}。`;
};

export const useCareerShareData = (
  overview: CareerOverviewData,
): CareerShareQueryResult => {
  const [activeTemplate, setActiveTemplate] =
    useState<CareerShareTemplate>("career");

  const templates = useMemo(
    () => [
      {
        key: "career" as const,
        label: "生涯版",
        description: "總覽型分享卡",
      },
      {
        key: "weekly" as const,
        label: "本週版",
        description: "近況與 delta",
      },
      {
        key: "highlight" as const,
        label: "高光版",
        description: "單場代表作",
      },
    ],
    [],
  );

  const preview = useMemo(
    () => buildPreviewByTemplate(activeTemplate, overview),
    [activeTemplate, overview],
  );

  const caption = useMemo(
    () => buildCaption(activeTemplate, overview),
    [activeTemplate, overview],
  );

  return {
    activeTemplate,
    setActiveTemplate,
    templates,
    preview,
    caption,
    isLoading: false,
    error: null,
  };
};

export default useCareerShareData;
