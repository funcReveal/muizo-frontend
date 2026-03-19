import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import SmartDisplayRoundedIcon from "@mui/icons-material/SmartDisplayRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

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
  recommendControlsTooltip: string;
  showRecommendControlsHint: boolean;
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
  isPreviewFrozen: boolean;
  previewCountdownSec: number;
  previewSwitchNotice: string | null;
  effectivePreviewVolume: number;
  settlementPreviewSyncGameVolume: boolean;
  recommendPreviewStageRef: React.RefObject<HTMLDivElement | null>;
  isCurrentRecommendationPreviewOpen: boolean;
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
  multilineEllipsis2Style: React.CSSProperties;
  onSupportArtistClick: () => void;
}

const CATEGORY_META: Array<{ key: RecommendCategory; icon: React.ElementType }> = [
  { key: "quick", icon: BoltRoundedIcon },
  { key: "confuse", icon: ShuffleRoundedIcon },
  { key: "hard", icon: LocalFireDepartmentRoundedIcon },
  { key: "other", icon: LibraryMusicRoundedIcon },
];

const RecommendGuideSection: React.FC<RecommendGuideSectionProps> = ({
  recommendSectionRef,
  activeCategoryTheme,
  activeRecommendCategory,
  recommendCategoryLabels,
  recommendCategoryShortHints,
  recommendControlsTooltip,
  showRecommendControlsHint,
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
  isPreviewFrozen,
  previewCountdownSec,
  previewSwitchNotice,
  effectivePreviewVolume,
  settlementPreviewSyncGameVolume,
  recommendPreviewStageRef,
  isCurrentRecommendationPreviewOpen,
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
  multilineEllipsis2Style,
  onSupportArtistClick,
}) => {
  const youtubeOverlayTitle = "如果喜歡這首音樂，別忘了到 YouTube 支持創作者喲！";
  const currentCard = currentRecommendation;
  const showPreviewCover = shouldShowPreviewOverlay || !isCurrentRecommendationPreviewOpen;

  return (
    <section
      ref={recommendSectionRef}
      className={`rounded-[30px] border p-5 transition-colors duration-300 ${activeCategoryTheme.shellClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[2rem] font-black tracking-tight text-white">推薦導覽</h3>
            <Tooltip title={recommendControlsTooltip} arrow>
              <IconButton
                size="small"
                className="!h-7 !w-7 !border !border-cyan-300/45 !bg-cyan-500/12 !text-cyan-100"
                aria-label="推薦導覽說明"
              >
                <HelpOutlineRoundedIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            {recommendCategoryShortHints[activeRecommendCategory]}
          </p>
        </div>

        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
            autoPreviewEnabled
              ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50"
              : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"
          }`}
          onClick={onToggleAutoPreview}
        >
          <GraphicEqRoundedIcon className="text-[1rem]" />
          自動導覽 {autoPreviewEnabled ? "ON" : "OFF"}
        </button>
      </div>

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
              } ${count <= 0 ? "cursor-not-allowed opacity-45" : ""}`}
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

      {showRecommendControlsHint && (
        <p className="mt-3 text-xs text-cyan-100/76">
          可切換分類、切換玩家視角，並直接點擊影片區播放或暫停。
        </p>
      )}

      {!currentCard ? (
        <div className="mt-4 rounded-[26px] border border-dashed border-slate-700/70 bg-slate-950/55 px-5 py-8 text-sm text-slate-400">
          目前沒有可顯示的推薦題目。
        </div>
      ) : (
        <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
          <article
            key={recommendationTransitionKey}
            className={`flex min-h-[680px] min-w-0 flex-col rounded-[28px] border p-5 transition-colors duration-300 ${activeCategoryTheme.sectionClass}`}
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
                  className={`mt-2 w-full text-left text-[2rem] font-black leading-tight text-white transition ${
                    hasCurrentRecommendationLink
                      ? "underline-offset-4 hover:text-cyan-200 hover:underline"
                      : "cursor-default"
                  }`}
                >
                  <span className="block min-w-0" style={multilineEllipsis2Style}>
                    {currentCard.recap.title}
                  </span>
                </button>
                <p className="mt-2 text-lg font-semibold text-slate-200">
                  作者：{currentCard.recap.uploader || "未知作者"}
                </p>
              </div>

              <div className="shrink-0">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-500/55 bg-slate-900/72 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
                  <SmartDisplayRoundedIcon />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`${reviewStatusBadgeBaseClass} ${currentRecommendationResultTone.badgeClass}`}>
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
                <span
                  className={`inline-flex h-7 items-center justify-center gap-1 rounded-full border px-3 text-xs font-semibold ${
                    isCurrentRecommendationGlobalFastest
                      ? "border-orange-300/45 bg-orange-500/18 text-orange-100"
                      : "border-amber-300/40 bg-amber-500/14 text-amber-100"
                  }`}
                  title={isCurrentRecommendationGlobalFastest ? "全場最快答對" : "速度表現亮眼"}
                >
                  <LocalFireDepartmentRoundedIcon className="text-[0.95rem]" />
                  {currentRecommendationFastestBadgeText}
                </span>
              )}
            </div>

            <div className="mt-4 rounded-[22px] border border-slate-700/70 bg-slate-950/55 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-slate-200">
                <span>{currentCard.hint}</span>
                <span>{currentCard.emphasis}</span>
                {typeof currentRecommendationAverageCorrectMs === "number" && (
                  <span>平均作答 {formatMs(currentRecommendationAverageCorrectMs)}</span>
                )}
                {hasCurrentRecommendationSpeedDelta && (
                  <span title={currentRecommendationSpeedNote}>
                    速度差 {currentRecommendationSpeedValue}
                  </span>
                )}
              </div>
              {currentRecommendationFastestCorrectMeta && (
                <p className="mt-2 text-xs text-slate-400">
                  最快 {currentRecommendationFastestCorrectMeta.username} ・{" "}
                  {formatMs(currentRecommendationFastestCorrectMeta.answeredAtMs)}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {hasCurrentRecommendationLink && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-400/60 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/60 hover:text-cyan-100"
                  onClick={onSupportArtistClick}
                >
                  <OpenInNewRoundedIcon className="text-[1rem]" />
                  前往YouTube支持作者
                </button>
              )}
              {canAutoGuideLoop && !isPreviewFrozen && (
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold ${activeCategoryTheme.badgeClass}`}
                >
                  AUTO {previewCountdownSec}s
                </span>
              )}
              {previewSwitchNotice && (
                <span className="rounded-full border border-cyan-300/40 bg-cyan-500/12 px-3 py-2 text-xs font-semibold text-cyan-100">
                  {previewSwitchNotice}
                </span>
              )}
            </div>

            <div
              ref={recommendPreviewStageRef}
              className="mt-4 flex min-h-0 flex-1 overflow-hidden rounded-[24px] border border-slate-700/80 bg-black/40"
            >
              <div className="relative aspect-video w-full self-stretch">
                {currentCard.recap.thumbnail && !isCurrentRecommendationPreviewOpen && (
                  <img
                    src={currentCard.recap.thumbnail}
                    alt={currentCard.recap.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-72"
                  />
                )}

                {isCurrentRecommendationPreviewOpen && currentRecommendationPreviewUrl && (
                  <iframe
                    ref={previewIframeRef}
                    src={currentRecommendationPreviewUrl}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={`settlement-preview-${currentCard.recap.key}`}
                    onLoad={onPreviewIframeLoad}
                  />
                )}

                {currentRecommendationPreviewUrl && (
                  <button
                    type="button"
                    className={`absolute inset-0 z-20 block h-full w-full ${
                      showPreviewCover
                        ? "bg-[linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.72))]"
                        : "bg-transparent"
                    }`}
                    onClick={onPreviewSurfaceClick}
                    aria-label="切換推薦影片播放狀態"
                  >
                    {showPreviewCover && (
                      <span className="mx-auto flex h-full max-w-[30rem] items-center justify-center px-6 text-center text-base font-semibold text-white">
                        {youtubeOverlayTitle}
                      </span>
                    )}
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>試聽音量 {effectivePreviewVolume}%</span>
              <span>{settlementPreviewSyncGameVolume ? "同步遊戲音量" : "獨立試聽音量"}</span>
            </div>
          </article>

          <aside
            className={`flex h-full min-h-[680px] min-w-0 flex-col rounded-[28px] border p-4 transition-colors duration-300 ${activeCategoryTheme.asideClass}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">題目清單</p>
                <p className="mt-1 text-xl font-black text-white">
                  {recommendationCards.length === 0
                    ? "0 / 0"
                    : `${safeRecommendIndex + 1} / ${recommendationCards.length}`}
                </p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-500/10 px-1 py-1">
                <button
                  type="button"
                  className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:opacity-40"
                  onClick={onGoPrevReviewParticipant}
                  disabled={!canCycleReviewParticipants}
                >
                  上一位
                </button>
                <span className="max-w-[10rem] truncate px-2 text-[11px] font-semibold text-sky-100">
                  {selectedReviewParticipantLabel}
                </span>
                <button
                  type="button"
                  className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:opacity-40"
                  onClick={onGoNextReviewParticipant}
                  disabled={!canCycleReviewParticipants}
                >
                  下一位
                </button>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="space-y-3">
                {recommendationCards.length === 0 ? (
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
                    目前沒有可顯示的題目清單。
                  </div>
                ) : (
                  recommendationCards.map((card, index) => {
                    const isActive = index === safeRecommendIndex;

                    return (
                      <button
                        key={card.recap.key}
                        type="button"
                        className={`block w-full rounded-[22px] border px-4 py-4 text-left transition ${
                          isActive
                            ? activeCategoryTheme.listActiveClass
                            : "border-slate-700/75 bg-slate-950/58 hover:border-slate-500/75"
                        }`}
                        onClick={() => onSelectRecommendation(index)}
                      >
                        <div className="min-w-0">
                          {card.link?.href ? (
                            <button
                              type="button"
                              className="block w-full text-left text-lg font-black leading-snug text-white underline-offset-4 transition hover:text-cyan-200 hover:underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectRecommendation(index);
                                onOpenCardLink(card);
                              }}
                            >
                              <span className="block" style={multilineEllipsis2Style}>
                                {card.recap.title}
                              </span>
                            </button>
                          ) : (
                            <p className="text-lg font-black leading-snug text-white">
                              <span className="block" style={multilineEllipsis2Style}>
                                {card.recap.title}
                              </span>
                            </p>
                          )}
                          <p
                            className="mt-2 min-w-0 text-sm text-slate-300"
                            style={multilineEllipsis2Style}
                          >
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
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-600/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 disabled:opacity-40"
                onClick={onGoPrevRecommendation}
                disabled={!canNavigateRecommendations}
              >
                {recommendNavLabels.prev}
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-600/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 disabled:opacity-40"
                onClick={onGoNextRecommendation}
                disabled={!canNavigateRecommendations}
              >
                {recommendNavLabels.next}
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

export default RecommendGuideSection;
