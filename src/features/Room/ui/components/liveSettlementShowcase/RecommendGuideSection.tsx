import React from "react";
import { IconButton, Popover, Tooltip } from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import SmartDisplayRoundedIcon from "@mui/icons-material/SmartDisplayRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

import type { RecommendCategory } from "../liveSettlementUtils";

type RecommendationCardItem = {
  recap: {
    key: string;
    order: number;
    title: string;
    uploader?: string | null;
    thumbnail?: string | null;
  };
  hint: string;
  emphasis: string;
  providerLabel: string;
  link?: { href?: string | null } | null;
  previewUrl: string | null;
};

interface RecommendTheme {
  shellClass: string;
  sectionClass: string;
  asideClass: string;
  controlGroupClass: string;
  listActiveClass: string;
  badgeClass: string;
}

interface RecommendGuideSectionProps {
  isMobileView?: boolean;
  recommendSectionRef: React.RefObject<HTMLElement | null>;
  activeCategoryTheme: RecommendTheme;
  activeRecommendCategory: RecommendCategory;
  recommendCategoryLabels: Record<RecommendCategory, string>;
  recommendCategoryShortHints: Record<RecommendCategory, string>;
  recommendationCardsByCategory: Record<RecommendCategory, RecommendationCardItem[]>;
  onActivateCategory: (category: RecommendCategory) => void;
  autoPreviewEnabled: boolean;
  onToggleAutoPreview: () => void;
  currentRecommendation: RecommendationCardItem | null;
  hasCurrentRecommendationLink: boolean;
  recommendationTransitionKey: string;
  onOpenRecommendationTitle: () => void;
  isCurrentRecommendationFastest: boolean;
  reviewStatusBadgeBaseClass: string;
  currentRecommendationResultTone: { badgeClass: string; label: string };
  showCurrentRecommendationRankBadge: boolean;
  currentRecommendationCorrectRank: number | null;
  isCurrentRecommendationFirstCorrect: boolean;
  isCurrentRecommendationGlobalFastest: boolean;
  currentRecommendationGradeBadgeClass: string | null;
  currentRecommendationGradeLabel: string | null;
  hasCurrentRecommendationSpeedDelta: boolean;
  currentRecommendationSpeedValue: string;
  currentRecommendationSpeedNote: string;
  currentRecommendationAverageCorrectMs: number | null;
  formatMs: (value: number | null | undefined) => string;
  currentRecommendationFastestBadgeText: string;
  currentRecommendationFastestCorrectMeta: {
    clientId: string;
    username: string;
    answeredAtMs: number;
  } | null;
  canAutoGuideLoop: boolean;
  previewCountdownSec: number;
  previewSwitchNotice: string | null;
  recommendPreviewStageRef: React.RefObject<HTMLDivElement | null>;
  isCurrentRecommendationPreviewOpen: boolean;
  previewPlayerState: "idle" | "playing" | "paused";
  currentRecommendationPreviewUrl: string | null;
  previewIframeRef: React.RefObject<HTMLIFrameElement | null>;
  onPreviewIframeLoad: () => void;
  shouldShowPreviewOverlay: boolean;
  onPreviewSurfaceClick: () => void;
  recommendationCards: RecommendationCardItem[];
  selectedReviewParticipantLabel: string;
  canCycleReviewParticipants: boolean;
  onGoPrevReviewParticipant: () => void;
  onGoNextReviewParticipant: () => void;
  safeRecommendIndex: number;
  onSelectRecommendation: (index: number) => void;
  onOpenCardLink: (card: RecommendationCardItem) => void;
  canNavigateRecommendations: boolean;
  recommendNavLabels: { prev: string; next: string };
  onGoPrevRecommendation: () => void;
  onGoNextRecommendation: () => void;
  isMobileCategoryOpen: boolean;
  onToggleMobileCategoryOpen: () => void;
  isMobileInsightOpen: boolean;
  onToggleMobileInsightOpen: () => void;
  isMobileRecommendPanelOpen: boolean;
  onToggleMobileRecommendPanelOpen: () => void;
}

const CATEGORY_META: Array<{ key: RecommendCategory; icon: React.ElementType }> = [
  { key: "quick", icon: BoltRoundedIcon },
  { key: "confuse", icon: ShuffleRoundedIcon },
  { key: "hard", icon: LocalFireDepartmentRoundedIcon },
  { key: "other", icon: LibraryMusicRoundedIcon },
];

const AutoMarqueeTitle: React.FC<{
  text: string;
  className?: string;
}> = ({ text, className = "" }) => {
  const wrapRef = React.useRef<HTMLSpanElement | null>(null);
  const trackRef = React.useRef<HTMLSpanElement | null>(null);
  const [canMarquee, setCanMarquee] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const measure = () => {
      const overflow = track.scrollWidth - wrap.clientWidth;
      if (overflow > 10) {
        setCanMarquee(true);
        setStyle({
          ["--settlement-title-shift" as const]: `${-(overflow + 22)}px`,
          ["--settlement-title-duration" as const]: `${Math.min(
            11.5,
            Math.max(5.4, overflow / 44),
          ).toFixed(2)}s`,
        } as React.CSSProperties);
      } else {
        setCanMarquee(false);
        setStyle({});
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    observer.observe(track);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={wrapRef} className={`game-settlement-title-marquee block overflow-hidden ${className}`}>
      <span
        ref={trackRef}
        className={`game-settlement-title-marquee-track ${
          canMarquee ? "game-settlement-title-marquee-track--run" : ""
        }`}
        style={style}
      >
        {text}
      </span>
    </span>
  );
};

const RecommendGuideSection: React.FC<RecommendGuideSectionProps> = ({
  isMobileView = false,
  recommendSectionRef,
  activeCategoryTheme,
  activeRecommendCategory,
  recommendCategoryLabels,
  recommendCategoryShortHints,
  recommendationCardsByCategory,
  onActivateCategory,
  autoPreviewEnabled,
  onToggleAutoPreview,
  currentRecommendation,
  hasCurrentRecommendationLink,
  recommendationTransitionKey,
  onOpenRecommendationTitle,
  isCurrentRecommendationFastest,
  reviewStatusBadgeBaseClass,
  currentRecommendationResultTone,
  showCurrentRecommendationRankBadge,
  currentRecommendationCorrectRank,
  isCurrentRecommendationFirstCorrect,
  isCurrentRecommendationGlobalFastest,
  currentRecommendationGradeBadgeClass,
  currentRecommendationGradeLabel,
  hasCurrentRecommendationSpeedDelta,
  currentRecommendationSpeedValue,
  currentRecommendationSpeedNote,
  currentRecommendationAverageCorrectMs,
  formatMs,
  currentRecommendationFastestBadgeText,
  currentRecommendationFastestCorrectMeta,
  canAutoGuideLoop,
  previewCountdownSec,
  previewSwitchNotice,
  recommendPreviewStageRef,
  isCurrentRecommendationPreviewOpen,
  previewPlayerState,
  currentRecommendationPreviewUrl,
  previewIframeRef,
  onPreviewIframeLoad,
  shouldShowPreviewOverlay,
  onPreviewSurfaceClick,
  recommendationCards,
  selectedReviewParticipantLabel,
  canCycleReviewParticipants,
  onGoPrevReviewParticipant,
  onGoNextReviewParticipant,
  safeRecommendIndex,
  onSelectRecommendation,
  onOpenCardLink,
  canNavigateRecommendations,
  recommendNavLabels,
  onGoPrevRecommendation,
  onGoNextRecommendation,
  isMobileCategoryOpen,
  onToggleMobileCategoryOpen,
  isMobileInsightOpen,
  onToggleMobileInsightOpen,
  isMobileRecommendPanelOpen,
  onToggleMobileRecommendPanelOpen,
}) => {
  const [autoPreviewHelpAnchor, setAutoPreviewHelpAnchor] =
    React.useState<HTMLElement | null>(null);
  const youtubeOverlayTitle = "如果喜歡這首音樂，別忘了到 YouTube 支持創作者喲！";
  const currentCard = currentRecommendation;
  const shouldKeepLivePreviewVisible = currentRecommendationPreviewUrl !== null;
  const showPreviewCover =
    previewPlayerState !== "playing" &&
    (previewPlayerState === "paused" ||
      shouldShowPreviewOverlay ||
      !shouldKeepLivePreviewVisible);

  return (
    <section
      ref={recommendSectionRef}
      className={`transition-colors duration-300 ${
        isMobileView
          ? "rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,12,22,0.92),rgba(5,9,18,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          : "rounded-[22px] border p-3 lg:p-3.5"
      } ${isMobileView ? "" : activeCategoryTheme.shellClass}`}
    >
      {isMobileView ? (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <AutoAwesomeRoundedIcon className="shrink-0 text-[1.35rem] text-cyan-200" />
                <h3 className="min-w-0 text-[1.8rem] font-black tracking-tight text-white">
                  推薦導覽
                </h3>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              <button
                type="button"
                className={`inline-flex min-h-[2.5rem] cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  autoPreviewEnabled
                    ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50"
                    : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
                }`}
                onClick={onToggleAutoPreview}
              >
                <GraphicEqRoundedIcon className="text-[1rem]" />
                {autoPreviewEnabled ? "導覽 ON" : "導覽 OFF"}
              </button>
              <IconButton
                size="small"
                onClick={(event) =>
                  setAutoPreviewHelpAnchor((current) =>
                    current === event.currentTarget ? null : event.currentTarget,
                  )
                }
                className="!h-9 !w-9 !cursor-pointer !border !border-cyan-300/35 !bg-cyan-500/10 !text-cyan-100"
                aria-label="查看自動導覽說明"
              >
                <HelpOutlineRoundedIcon fontSize="inherit" />
              </IconButton>
            </div>
          </div>
          <p className="mt-1.5 pr-0 text-sm font-semibold leading-snug text-slate-300">
            {recommendCategoryShortHints[activeRecommendCategory]}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AutoAwesomeRoundedIcon className="shrink-0 text-[1.35rem] text-cyan-200" />
              <h3 className="min-w-0 text-[2rem] font-black tracking-tight text-white">
                推薦導覽
              </h3>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              {recommendCategoryShortHints[activeRecommendCategory]}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                autoPreviewEnabled
                  ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50"
                  : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
              }`}
              onClick={onToggleAutoPreview}
            >
              <GraphicEqRoundedIcon className="text-[1rem]" />
              {`自動導覽 ${autoPreviewEnabled ? "ON" : "OFF"}`}
            </button>
            <IconButton
              size="small"
              onClick={(event) =>
                setAutoPreviewHelpAnchor((current) =>
                  current === event.currentTarget ? null : event.currentTarget,
                )
              }
              className="!h-9 !w-9 !cursor-pointer !border !border-cyan-300/35 !bg-cyan-500/10 !text-cyan-100"
              aria-label="查看自動導覽說明"
            >
              <HelpOutlineRoundedIcon fontSize="inherit" />
            </IconButton>
          </div>
        </div>
      )}
      <Popover
        open={Boolean(autoPreviewHelpAnchor)}
        anchorEl={autoPreviewHelpAnchor}
        onClose={() => setAutoPreviewHelpAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          className:
            "!mt-2 !max-w-[280px] !rounded-[18px] !border !border-cyan-300/24 !bg-[linear-gradient(180deg,rgba(7,24,34,0.96),rgba(4,13,24,0.98))] !px-4 !py-3 !text-sm !text-cyan-50/92 !shadow-[0_22px_44px_-24px_rgba(34,211,238,0.55)]",
        }}
      >
        自動播放預覽，並在倒數結束後切換到下一首推薦歌曲。
      </Popover>

      {isMobileView ? (
        <div className="mt-4 rounded-[20px] border border-white/8 bg-black/14">
          <button
            type="button"
            onClick={onToggleMobileCategoryOpen}
            className="inline-flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <BoltRoundedIcon className="text-[1rem] text-cyan-200" />
              題型分類
            </span>
            <ExpandMoreRoundedIcon
              className={`text-slate-300 transition ${isMobileCategoryOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className={`overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${
              isMobileCategoryOpen ? "grid grid-rows-[1fr] opacity-100" : "grid grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_META.map((item) => {
                  const Icon = item.icon;
                  const active = activeRecommendCategory === item.key;
                  const count = recommendationCardsByCategory[item.key].length;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`inline-flex w-full items-center justify-between rounded-[18px] border px-3 py-3 text-xs font-semibold transition ${
                        active
                          ? activeCategoryTheme.badgeClass
                          : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
                      } ${count <= 0 ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                      onClick={() => onActivateCategory(item.key)}
                      disabled={count <= 0}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="text-[1rem]" />
                        <span>{recommendCategoryLabels[item.key]}</span>
                      </span>
                      <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] leading-none">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORY_META.map((item) => {
            const Icon = item.icon;
            const active = activeRecommendCategory === item.key;
            const count = recommendationCardsByCategory[item.key].length;

            return (
              <button
                key={item.key}
                type="button"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? activeCategoryTheme.badgeClass
                    : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
                } ${count <= 0 ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                onClick={() => onActivateCategory(item.key)}
                disabled={count <= 0}
              >
                <Icon className="text-[1rem]" />
                <span>{recommendCategoryLabels[item.key]}</span>
                <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] leading-none">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!currentCard ? (
        <div className="mt-4 rounded-[26px] border border-dashed border-slate-700/70 bg-slate-950/55 px-5 py-8 text-sm text-slate-400">
          目前沒有可顯示的推薦題目。
        </div>
      ) : (
        <div className={`mt-4 grid items-stretch ${isMobileView ? "gap-3" : "gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(380px,0.92fr)]"}`}>
          <article
            key={recommendationTransitionKey}
            className={`flex min-w-0 flex-col transition-colors duration-300 ${
              isMobileView
                ? "h-auto rounded-[22px] border border-white/6 p-4"
                : "h-[820px] rounded-[28px] border p-5"
            } ${activeCategoryTheme.sectionClass}`}
            style={{ animation: "settlementSwapIn 220ms ease-out both" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {recommendCategoryLabels[activeRecommendCategory]}
                </p>
                <button
                  type="button"
                  onClick={onOpenRecommendationTitle}
                  disabled={!hasCurrentRecommendationLink}
                  className={`mt-2 inline-flex max-w-full text-left ${isMobileView ? "text-[1.55rem]" : "text-[2rem]"} font-black leading-tight text-white transition ${
                    hasCurrentRecommendationLink
                      ? "cursor-pointer underline-offset-4 hover:text-cyan-200 hover:underline"
                      : "cursor-default"
                  }`}
                >
                  <AutoMarqueeTitle text={currentCard.recap.title} className="min-w-0 max-w-full" />
                </button>
                <p className="mt-2 text-lg font-semibold text-slate-200">
                  {currentCard.recap.uploader || "未知作者"}
                </p>
              </div>

              <div className="shrink-0">
                <YouTubeIcon className="text-[2rem] text-[#ff0033]" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`${reviewStatusBadgeBaseClass} h-7 px-3 text-xs ${currentRecommendationResultTone.badgeClass}`}
              >
                {currentRecommendationResultTone.label}
              </span>
              {currentRecommendationGradeLabel && currentRecommendationGradeBadgeClass && (
                <span
                  className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-xs font-semibold ${currentRecommendationGradeBadgeClass}`}
                >
                  評分 {currentRecommendationGradeLabel}
                </span>
              )}
              {isCurrentRecommendationFirstCorrect && (
                <span className="inline-flex h-7 items-center justify-center rounded-full border border-violet-300/45 bg-violet-500/16 px-3 text-xs font-semibold text-violet-50">
                  首答
                </span>
              )}
              {showCurrentRecommendationRankBadge && currentRecommendationCorrectRank !== null && (
                <span className="inline-flex h-7 items-center justify-center rounded-full border border-sky-300/45 bg-sky-500/16 px-3 text-xs font-semibold text-sky-100">
                  第 {currentRecommendationCorrectRank} 位答對
                </span>
              )}
              {isCurrentRecommendationFastest && (
                <Tooltip
                  title={isCurrentRecommendationGlobalFastest ? "全場最快答對" : "速度表現亮眼"}
                  arrow
                >
                  <span
                    className={`inline-flex h-7 items-center justify-center gap-1 rounded-full border px-3 text-xs font-semibold ${
                      isCurrentRecommendationGlobalFastest
                        ? "border-orange-300/45 bg-orange-500/18 text-orange-100"
                        : "border-amber-300/40 bg-amber-500/14 text-amber-100"
                    }`}
                  >
                    <LocalFireDepartmentRoundedIcon className="text-[0.95rem]" />
                    {currentRecommendationFastestBadgeText}
                  </span>
                </Tooltip>
              )}
            </div>

            <div className={`mt-4 w-full ${isMobileView ? "rounded-[20px] border border-white/8 bg-black/12 px-0 py-0 shadow-none" : "rounded-[22px] border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(10,20,36,0.9),rgba(3,7,18,0.94))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"}`}>
              {isMobileView ? (
                <>
                  <button
                    type="button"
                    onClick={onToggleMobileInsightOpen}
                    className="inline-flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                      <BoltRoundedIcon className="text-[1rem] text-cyan-200" />
                      題目摘要
                    </span>
                    <ExpandMoreRoundedIcon
                      className={`text-slate-300 transition ${isMobileInsightOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden px-3 pb-3 transition-[grid-template-rows,opacity] duration-300 ${
                      isMobileInsightOpen ? "grid grid-rows-[1fr] opacity-100" : "grid grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[16px] border border-white/6 bg-black/16 px-3 py-3">
                          <div className="flex items-center gap-2 text-slate-400">
                            <BoltRoundedIcon className="text-[1rem]" />
                            <p className="text-[11px]">題目亮點</p>
                          </div>
                          <p className="mt-2 text-sm font-black text-white">{currentCard.hint}</p>
                        </div>
                        <div className="rounded-[16px] border border-white/6 bg-black/16 px-3 py-3">
                          <div className="flex items-center gap-2 text-slate-400">
                            <LocalFireDepartmentRoundedIcon className="text-[1rem]" />
                            <p className="text-[11px]">表現重點</p>
                          </div>
                          <p className="mt-2 text-sm font-black text-white">{currentCard.emphasis}</p>
                        </div>
                        <div className="rounded-[16px] border border-white/6 bg-black/16 px-3 py-3">
                          <div className="flex items-center gap-2 text-slate-400">
                            <GraphicEqRoundedIcon className="text-[1rem]" />
                            <p className="text-[11px]">平均作答</p>
                          </div>
                          <p className="mt-2 text-sm font-black text-white">
                            {typeof currentRecommendationAverageCorrectMs === "number"
                              ? formatMs(currentRecommendationAverageCorrectMs)
                              : "--"}
                          </p>
                        </div>
                        <div className="rounded-[16px] border border-white/6 bg-black/16 px-3 py-3">
                          <div className="flex items-center gap-2 text-slate-400">
                            <SmartDisplayRoundedIcon className="text-[1rem]" />
                            <p className="text-[11px]">速度差</p>
                          </div>
                          <Tooltip title={currentRecommendationSpeedNote} arrow>
                            <p className="mt-2 text-sm font-black text-white">
                              {hasCurrentRecommendationSpeedDelta ? currentRecommendationSpeedValue : "--"}
                            </p>
                          </Tooltip>
                        </div>
                      </div>
                      {currentRecommendationFastestCorrectMeta && (
                        <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                          <GraphicEqRoundedIcon className="text-[0.95rem]" />
                          最快 {currentRecommendationFastestCorrectMeta.username} ・{" "}
                          {formatMs(currentRecommendationFastestCorrectMeta.answeredAtMs)}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[16px] bg-black/18 px-3 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <BoltRoundedIcon className="text-[1rem]" />
                        <p className="text-[11px]">題目亮點</p>
                      </div>
                      <p className="mt-2 text-sm font-black text-white">{currentCard.hint}</p>
                    </div>
                    <div className="rounded-[16px] bg-black/18 px-3 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <LocalFireDepartmentRoundedIcon className="text-[1rem]" />
                        <p className="text-[11px]">表現重點</p>
                      </div>
                      <p className="mt-2 text-sm font-black text-white">{currentCard.emphasis}</p>
                    </div>
                    <div className="rounded-[16px] bg-black/18 px-3 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <GraphicEqRoundedIcon className="text-[1rem]" />
                        <p className="text-[11px]">平均作答</p>
                      </div>
                      <p className="mt-2 text-sm font-black text-white">
                        {typeof currentRecommendationAverageCorrectMs === "number"
                          ? formatMs(currentRecommendationAverageCorrectMs)
                          : "--"}
                      </p>
                    </div>
                    <div className="rounded-[16px] bg-black/18 px-3 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <SmartDisplayRoundedIcon className="text-[1rem]" />
                        <p className="text-[11px]">速度差</p>
                      </div>
                      <Tooltip title={currentRecommendationSpeedNote} arrow>
                        <p className="mt-2 text-sm font-black text-white">
                          {hasCurrentRecommendationSpeedDelta ? currentRecommendationSpeedValue : "--"}
                        </p>
                      </Tooltip>
                    </div>
                  </div>
                  {currentRecommendationFastestCorrectMeta && (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                      <GraphicEqRoundedIcon className="text-[0.95rem]" />
                      最快 {currentRecommendationFastestCorrectMeta.username} ・{" "}
                      {formatMs(currentRecommendationFastestCorrectMeta.answeredAtMs)}
                    </p>
                  )}
                </>
              )}
            </div>

            <div
              ref={recommendPreviewStageRef}
              className={`mt-4 flex min-h-0 flex-1 overflow-hidden ${
                isMobileView
                  ? "rounded-[22px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(3,10,18,0.92),rgba(2,8,16,0.98))]"
                  : "rounded-[24px] border border-slate-700/80 bg-black/40"
              }`}
            >
              <div className={`relative h-full w-full self-stretch ${isMobileView ? "min-h-[220px]" : "min-h-[420px]"}`}>
                {currentCard.recap.thumbnail && !isCurrentRecommendationPreviewOpen && (
                  <img
                    src={currentCard.recap.thumbnail}
                    alt={currentCard.recap.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-72"
                  />
                )}

                {shouldKeepLivePreviewVisible && currentRecommendationPreviewUrl && (
                  <iframe
                    ref={previewIframeRef}
                    src={currentRecommendationPreviewUrl}
                    className="absolute inset-0 h-full w-full cursor-pointer"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={`settlement-preview-${currentCard.recap.key}`}
                    onLoad={onPreviewIframeLoad}
                  />
                )}

                {currentRecommendationPreviewUrl && showPreviewCover && (
                  <button
                    type="button"
                    className="absolute inset-0 z-20 block h-full w-full cursor-pointer bg-[linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.72))]"
                    onClick={onPreviewSurfaceClick}
                    aria-label="切換推薦影片播放狀態"
                  >
                    <span className="mx-auto flex h-full max-w-[30rem] items-center justify-center px-6 text-center text-base font-semibold text-white">
                      {youtubeOverlayTitle}
                    </span>
                  </button>
                )}

                {!currentRecommendationPreviewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                    <div>
                      <p className="text-base font-semibold text-slate-200">無法播放預覽</p>
                      <p className="mt-2 text-sm text-slate-400">
                        這題沒有可用的預覽來源，請直接前往 YouTube 支持作者。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`mt-3 text-xs text-slate-400 ${
                isMobileView ? "space-y-2.5" : "flex flex-wrap items-center justify-between gap-4"
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                {hasCurrentRecommendationLink && (
                  <button
                    type="button"
                    onClick={onOpenRecommendationTitle}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:border-rose-200/55 hover:bg-rose-500/16 ${
                      isMobileView ? "min-h-[3rem] w-full justify-center rounded-[18px] px-4" : ""
                    }`}
                  >
                    <OpenInNewRoundedIcon className="text-[0.9rem]" />
                    前往 YouTube 支持作者
                  </button>
                )}
                {canAutoGuideLoop && (
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${activeCategoryTheme.badgeClass} ${
                      isMobileView ? "min-h-[2.8rem] rounded-[18px]" : ""
                    }`}
                  >
                    AUTO {previewCountdownSec}s
                  </span>
                )}
                {previewSwitchNotice && (
                  <span className={`rounded-full border border-cyan-300/40 bg-cyan-500/12 px-3 py-1.5 text-xs font-semibold text-cyan-100 ${isMobileView ? "min-h-[2.8rem] rounded-[18px]" : ""}`}>
                    {previewSwitchNotice}
                  </span>
                )}
              </div>
            </div>
          </article>

          <aside
            className={`flex min-w-0 flex-col ${isMobileView ? "h-auto overflow-visible rounded-none border-0 bg-transparent p-0" : "h-[820px] overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(7,15,28,0.96),rgba(5,10,18,0.99))] p-4"} transition-colors duration-300 ${isMobileView ? "" : activeCategoryTheme.asideClass}`}
          >
            {isMobileView ? (
              <>
                <div className="rounded-[24px] border border-white/8 bg-transparent px-4 py-2.5">
                  <button
                    type="button"
                    onClick={onToggleMobileRecommendPanelOpen}
                    className="inline-flex w-full cursor-pointer items-center justify-between text-left transition"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                      <QueueMusicRoundedIcon className="text-[1rem] text-cyan-200" />
                      題目清單
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {recommendationCards.length === 0
                          ? "0 / 0"
                          : `${safeRecommendIndex + 1} / ${recommendationCards.length}`}
                      </span>
                    </span>
                    <ExpandMoreRoundedIcon
                      className={`text-slate-300 transition ${isMobileRecommendPanelOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-[grid-template-rows,opacity] duration-300 ${
                      isMobileRecommendPanelOpen ? "grid grid-rows-[1fr] opacity-100" : "grid grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden pt-3">
                      <div className="grid grid-cols-[78px_minmax(0,1fr)_78px] items-center gap-3">
                        <button
                          type="button"
                          className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-2 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          onClick={onGoPrevReviewParticipant}
                          disabled={!canCycleReviewParticipants}
                        >
                          上一位
                        </button>
                        <div className="min-w-0 px-1 text-center">
                          <span className="inline-flex items-center justify-center text-cyan-100">
                            <GroupsRoundedIcon className="text-[1rem]" />
                          </span>
                          <p className="mt-1 truncate text-[12px] font-semibold text-sky-100">
                            {selectedReviewParticipantLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-2 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          onClick={onGoNextReviewParticipant}
                          disabled={!canCycleReviewParticipants}
                        >
                          下一位
                        </button>
                      </div>

                      <div className="mt-4 overflow-y-auto">
                          <div className="space-y-3">
                            {recommendationCards.length === 0 ? (
                              <div className="flex h-full min-h-[240px] items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
                                目前沒有可顯示的題目清單。
                              </div>
                            ) : (
                              recommendationCards.map((card, index) => {
                                const isActive = index === safeRecommendIndex;

                                return (
                                  <div
                                    key={card.recap.key}
                                    role="button"
                                    tabIndex={0}
                                    className={`block w-full cursor-pointer rounded-[22px] border px-4 py-4 text-left transition ${
                                      isActive
                                        ? `${activeCategoryTheme.listActiveClass} shadow-[0_18px_34px_-28px_rgba(16,185,129,0.48)]`
                                        : "border-slate-700/75 bg-slate-950/58 hover:border-slate-500/75"
                                    }`}
                                    onClick={() => onSelectRecommendation(index)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        onSelectRecommendation(index);
                                      }
                                    }}
                                  >
                                    <div className="min-w-0">
                                      {card.link?.href ? (
                                        <button
                                          type="button"
                                          className="inline-block max-w-full cursor-pointer truncate text-left text-lg font-black leading-snug text-white underline-offset-4 transition hover:text-cyan-200 hover:underline"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectRecommendation(index);
                                            onOpenCardLink(card);
                                          }}
                                        >
                                          <span className="block truncate">{card.recap.title}</span>
                                        </button>
                                      ) : (
                                        <p className="truncate text-lg font-black leading-snug text-white">
                                          {card.recap.title}
                                        </p>
                                      )}
                                      <p className="mt-2 truncate text-sm text-slate-300">
                                        {card.recap.uploader || "未知作者"}
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        <span className="rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-100">
                                          {card.hint}
                                        </span>
                                        <span className="rounded-full border border-slate-500/55 bg-slate-800/70 px-2.5 py-1 text-[10.5px] font-semibold text-slate-100">
                                          {card.emphasis}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-600/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          onClick={onGoPrevRecommendation}
                          disabled={!canNavigateRecommendations}
                        >
                          {recommendNavLabels.prev}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-600/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          onClick={onGoNextRecommendation}
                          disabled={!canNavigateRecommendations}
                        >
                          {recommendNavLabels.next}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="shrink-0">
                      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        <QueueMusicRoundedIcon className="text-[1rem] text-cyan-200" />
                        題目清單
                      </p>
                      <p className="mt-1 whitespace-nowrap text-[1.95rem] font-black leading-none text-white">
                        {recommendationCards.length === 0
                          ? "0 / 0"
                          : `${safeRecommendIndex + 1} / ${recommendationCards.length}`}
                      </p>
                    </div>
                    <div className="grid min-w-0 w-full flex-1 grid-cols-[80px_minmax(0,1fr)_80px] items-center rounded-full border border-sky-300/35 bg-sky-500/10 px-1 py-1 sm:max-w-[340px]">
                      <button
                        type="button"
                        className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        onClick={onGoPrevReviewParticipant}
                        disabled={!canCycleReviewParticipants}
                      >
                        上一位
                      </button>
                      <span className="flex min-w-0 flex-col items-center justify-center px-2 text-center">
                        <span className="inline-flex text-cyan-200">
                          <GroupsRoundedIcon className="text-[0.95rem]" />
                        </span>
                        <span className="mt-1 block w-full truncate text-center text-[11px] font-semibold text-sky-100">
                          {selectedReviewParticipantLabel}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        onClick={onGoNextReviewParticipant}
                        disabled={!canCycleReviewParticipants}
                      >
                        下一位
                      </button>
                    </div>
                  </div>
                </div>

                <div className="game-settlement-recommend-list-viewport mt-4 min-h-0 flex-1 overflow-y-auto pr-1.5">
                  <div className="space-y-3">
                    {recommendationCards.length === 0 ? (
                      <div className="flex h-full min-h-[240px] items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
                        目前沒有可顯示的題目清單。
                      </div>
                    ) : (
                      recommendationCards.map((card, index) => {
                        const isActive = index === safeRecommendIndex;

                        return (
                          <div
                            key={card.recap.key}
                            role="button"
                            tabIndex={0}
                            className={`block w-full cursor-pointer rounded-[22px] border px-4 py-4 text-left transition ${
                              isActive
                                ? `${activeCategoryTheme.listActiveClass} shadow-[0_18px_34px_-28px_rgba(16,185,129,0.48)]`
                                : "border-slate-700/75 bg-slate-950/58 hover:border-slate-500/75"
                            }`}
                            onClick={() => onSelectRecommendation(index)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onSelectRecommendation(index);
                              }
                            }}
                          >
                            <div className="min-w-0">
                              {card.link?.href ? (
                                <button
                                  type="button"
                                  className="inline-block max-w-full cursor-pointer truncate text-left text-lg font-black leading-snug text-white underline-offset-4 transition hover:text-cyan-200 hover:underline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onSelectRecommendation(index);
                                    onOpenCardLink(card);
                                  }}
                                >
                                  <span className="block truncate">{card.recap.title}</span>
                                </button>
                              ) : (
                                <p className="truncate text-lg font-black leading-snug text-white">
                                  {card.recap.title}
                                </p>
                              )}
                              <p className="mt-2 truncate text-sm text-slate-300">
                                {card.recap.uploader || "未知作者"}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                <span className="rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-100">
                                  {card.hint}
                                </span>
                                <span className="rounded-full border border-slate-500/55 bg-slate-800/70 px-2.5 py-1 text-[10.5px] font-semibold text-slate-100">
                                  {card.emphasis}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-white/6 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-600/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      onClick={onGoPrevRecommendation}
                      disabled={!canNavigateRecommendations}
                    >
                      {recommendNavLabels.prev}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-600/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      onClick={onGoNextRecommendation}
                      disabled={!canNavigateRecommendations}
                    >
                      {recommendNavLabels.next}
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </section>
  );
};

export default RecommendGuideSection;
