import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { List as VirtualList, type RowComponentProps } from "react-window";
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
  reviewDrawerOpen: boolean;
  onToggleReviewDrawerOpen: () => void;
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
  previewPlayerState: "idle" | "playing" | "paused";
  onQuickPlayStart: () => void;
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

interface RecommendationRowProps {
  recommendationCards: RecommendationCardItem[];
  safeRecommendIndex: number;
  activeCategoryTheme: RecommendTheme;
  onSelectRecommendation: (index: number) => void;
  onOpenCardLink: (card: RecommendationCardItem) => void;
  multilineEllipsis2Style: React.CSSProperties;
}

const RecommendationListRow = (props: RowComponentProps<RecommendationRowProps>) => {
  const { index, style } = props;
  const legacyRowProps = (props as unknown as { rowProps?: RecommendationRowProps })
    .rowProps;
  const resolvedRowProps =
    legacyRowProps ??
    (props as unknown as Partial<RecommendationRowProps> | undefined);
  const recommendationCards = resolvedRowProps?.recommendationCards ?? [];
  const safeRecommendIndex = resolvedRowProps?.safeRecommendIndex ?? 0;
  const activeCategoryTheme = resolvedRowProps?.activeCategoryTheme;
  const onSelectRecommendation = resolvedRowProps?.onSelectRecommendation;
  const onOpenCardLink = resolvedRowProps?.onOpenCardLink;
  const multilineEllipsis2Style = resolvedRowProps?.multilineEllipsis2Style;
  if (
    !activeCategoryTheme ||
    !onSelectRecommendation ||
    !onOpenCardLink ||
    !multilineEllipsis2Style
  ) {
    return <div style={style} />;
  }
  const card = recommendationCards[index];
  if (!card) return <div style={style} />;
  const active = index === safeRecommendIndex;
  return (
    <div style={style} className="px-0.5 pb-2">
      <button
        type="button"
        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
          active
            ? activeCategoryTheme.listActiveClass
            : "border-slate-700/70 bg-slate-900/65 hover:border-slate-500/75"
        }`}
        onClick={() => onSelectRecommendation(index)}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-semibold text-slate-100">
            <span
              className={`block truncate ${
                card.link?.href
                  ? "cursor-pointer underline decoration-slate-500/60 underline-offset-2 transition hover:text-cyan-200 hover:decoration-cyan-300/70"
                  : ""
              }`}
              onClick={(event) => {
                if (!card.link?.href) return;
                event.stopPropagation();
                onOpenCardLink(card);
              }}
            >
              #{card.recap.order} {card.recap.title}
            </span>
          </p>
          <span className="shrink-0 rounded-full border border-slate-600/70 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-300">
            {card.providerLabel}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-300" style={multilineEllipsis2Style}>
          {card.recap.uploader || "Unknown"}
        </p>
        <p className="mt-1 text-[10px] text-slate-400">
          {card.hint} · {card.emphasis}
        </p>
      </button>
    </div>
  );
};

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
  reviewDrawerOpen,
  onToggleReviewDrawerOpen,
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
  previewPlayerState,
  onQuickPlayStart,
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
  const recommendationTitleButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const [recommendationTitleOverflowPx, setRecommendationTitleOverflowPx] =
    React.useState(0);

  React.useLayoutEffect(() => {
    const button = recommendationTitleButtonRef.current;
    if (!button) return;
    const measure = () => {
      const overflow = Math.max(0, Math.ceil(button.scrollWidth - button.clientWidth));
      setRecommendationTitleOverflowPx((prev) =>
        Math.abs(prev - overflow) <= 1 ? prev : overflow,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [currentRecommendation?.recap.title, recommendationTransitionKey]);

  const shouldRunTitleMarquee = recommendationTitleOverflowPx > 10;
  const marqueeDurationSec = Math.min(
    20,
    Math.max(7.2, 3.6 + recommendationTitleOverflowPx / 34),
  );
  const titleMarqueeStyle = shouldRunTitleMarquee
    ? ({
        ["--settlement-title-shift" as const]: `-${recommendationTitleOverflowPx}px`,
        ["--settlement-title-duration" as const]: `${marqueeDurationSec.toFixed(2)}s`,
      } as React.CSSProperties)
    : undefined;
  const isCurrentRecommendationLegendFastest =
    currentRecommendationFastestBadgeText === "全場最速王";

  const recommendationRowProps = React.useMemo<RecommendationRowProps>(
    () => ({
      recommendationCards,
      safeRecommendIndex,
      activeCategoryTheme,
      onSelectRecommendation,
      onOpenCardLink,
      multilineEllipsis2Style,
    }),
    [
      recommendationCards,
      safeRecommendIndex,
      activeCategoryTheme,
      onSelectRecommendation,
      onOpenCardLink,
      multilineEllipsis2Style,
    ],
  );

  return (
    <section
      ref={recommendSectionRef}
      className={`rounded-2xl border p-4 transition-colors duration-300 ${activeCategoryTheme.shellClass}`}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-slate-100">
                推薦導覽 · {recommendCategoryLabels[activeRecommendCategory]}
              </h3>
              <Tooltip title={recommendControlsTooltip} arrow>
                <IconButton
                  size="small"
                  className="!h-6 !w-6 !border !border-cyan-300/45 !bg-cyan-500/12 !text-cyan-100"
                  aria-label="推薦導覽提示"
                >
                  <HelpOutlineRoundedIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {recommendCategoryShortHints[activeRecommendCategory]}
            </p>
          </div>
          {showRecommendControlsHint && (
            <span className="rounded-full border border-cyan-300/45 bg-cyan-500/12 px-3 py-1 text-[11px] font-semibold text-cyan-100">
              提示：可切換分類、啟用自動導覽，並在回顧中雙擊播放
            </span>
          )}
        </div>

        <div className="game-settlement-controls-sticky game-settlement-controls-dock rounded-2xl border border-slate-500/35 bg-slate-950/72 p-2">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0 overflow-x-auto pb-1">
              <div
                className={`inline-flex min-w-max items-center gap-2 rounded-2xl border p-1.5 ${activeCategoryTheme.controlGroupClass}`}
                style={
                  showRecommendControlsHint
                    ? {
                        animation: "settlementControlHintPulse 1.2s ease-in-out 2",
                      }
                    : undefined
                }
              >
                {(
                  [
                    { key: "quick", icon: BoltRoundedIcon },
                    { key: "confuse", icon: ShuffleRoundedIcon },
                    { key: "hard", icon: LocalFireDepartmentRoundedIcon },
                    { key: "other", icon: LibraryMusicRoundedIcon },
                  ] as const
                ).map((item) => {
                  const category = item.key;
                  const active = activeRecommendCategory === category;
                  const count = recommendationCardsByCategory[category].length;
                  const Icon = item.icon;
                  const categoryHint = `${recommendCategoryLabels[category]}：${recommendCategoryShortHints[category]}`;
                  return (
                    <Tooltip key={category} title={categoryHint} placement="top" arrow>
                      <span className="inline-flex">
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? `${activeCategoryTheme.badgeClass} shadow-[0_0_0_1px_rgba(148,163,184,0.25)]`
                              : "border-slate-600/70 bg-slate-900/70 text-slate-200 hover:border-slate-400"
                          } ${count <= 0 ? "cursor-not-allowed opacity-45" : ""}`}
                          onClick={() => onActivateCategory(category)}
                          disabled={count <= 0}
                        >
                          <Icon fontSize="small" className="text-[0.95rem]" />
                          <span>{recommendCategoryLabels[category]}</span>
                          <span className="rounded-full border border-current/40 px-1.5 py-0 text-[10px] leading-5">
                            {count}
                          </span>
                        </button>
                      </span>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 overflow-x-auto pb-1 xl:justify-self-end">
              <div
                className={`inline-flex min-w-max items-center gap-2 rounded-2xl border p-1.5 ${activeCategoryTheme.controlGroupClass}`}
                style={
                  showRecommendControlsHint
                    ? {
                        animation:
                          "settlementControlHintPulse 1.2s ease-in-out 2 200ms",
                      }
                    : undefined
                }
              >
                <Tooltip
                  title="自動導覽會依倒數切歌；暫停時會凍結倒數"
                  placement="top"
                  arrow
                >
                  <span className="inline-flex">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        autoPreviewEnabled
                          ? "border-cyan-300/55 bg-cyan-500/18 text-cyan-50"
                          : "border-slate-600/70 bg-slate-900/70 text-slate-300 hover:border-slate-400"
                      }`}
                      onClick={onToggleAutoPreview}
                    >
                      <GraphicEqRoundedIcon
                        fontSize="small"
                        className="text-[0.95rem]"
                      />
                      自動導覽
                      <span className="rounded-full border border-current/40 px-1.5 py-0 text-[10px] leading-5">
                        {autoPreviewEnabled ? "ON" : "OFF"}
                      </span>
                    </button>
                  </span>
                </Tooltip>
                <Tooltip title="切換題目回顧面板顯示/隱藏" placement="top" arrow>
                  <span className="inline-flex">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        reviewDrawerOpen
                          ? "border-sky-300/60 bg-sky-500/18 text-sky-50"
                          : "border-slate-600/70 bg-slate-900/70 text-slate-300 hover:border-slate-400"
                      }`}
                      onClick={onToggleReviewDrawerOpen}
                    >
                      <GroupsRoundedIcon
                        fontSize="small"
                        className="text-[0.95rem]"
                      />
                      全員作答
                      <span className="rounded-full border border-current/40 px-1.5 py-0 text-[10px] leading-5">
                        {reviewDrawerOpen ? "顯示" : "隱藏"}
                      </span>
                    </button>
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!currentRecommendation || !hasCurrentRecommendationLink ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-600/70 bg-slate-900/55 px-4 py-6 text-sm text-slate-400">
          目前沒有可播放的推薦歌曲，請切換分類或回到題目回顧。
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <article
            key={recommendationTransitionKey}
            className={`rounded-2xl border p-4 ${activeCategoryTheme.sectionClass}`}
            style={{
              animation: "settlementSwapIn 240ms ease-out both",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Artist Spotlight
                </p>
                <button
                  ref={recommendationTitleButtonRef}
                  type="button"
                  onClick={onOpenRecommendationTitle}
                  disabled={!currentRecommendation.link?.href}
                  className="game-settlement-title-marquee mt-1 w-full overflow-hidden text-left text-2xl font-black leading-tight text-slate-100 underline-offset-4 transition hover:text-cyan-200 hover:underline disabled:cursor-default disabled:opacity-85 disabled:no-underline sm:text-[2rem]"
                >
                  <span
                    className={`game-settlement-title-marquee-track ${
                      shouldRunTitleMarquee
                        ? "game-settlement-title-marquee-track--run"
                        : ""
                    }`}
                    style={titleMarqueeStyle}
                  >
                    {currentRecommendation.recap.title}
                  </span>
                </button>
                <p className="mt-2 text-sm font-semibold text-slate-200">
                  作者：{currentRecommendation.recap.uploader || "Unknown"}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 flex-row flex-wrap items-center justify-end gap-1.5 sm:flex-col sm:items-end sm:justify-start">
                <span className="rounded-full border border-slate-500/55 bg-slate-800/75 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                  {currentRecommendation.providerLabel}
                </span>
                {isCurrentRecommendationFastest && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-orange-300/45 bg-orange-500/16 text-orange-100">
                    <LocalFireDepartmentRoundedIcon className="text-[0.85rem]" />
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="game-settlement-badge-row min-h-[2rem]">
                <span
                  className={`${reviewStatusBadgeBaseClass} game-settlement-pill game-settlement-pill--result ${currentRecommendationResultTone.badgeClass}`}
                >
                  {currentRecommendationResultTone.label}
                </span>
                {currentRecommendationGradeLabel &&
                  currentRecommendationGradeBadgeClass && (
                    <span
                      className={`inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold game-settlement-pill game-settlement-pill--grade ${currentRecommendationGradeBadgeClass}`}
                    >
                      評級 {currentRecommendationGradeLabel}
                    </span>
                  )}
                {isCurrentRecommendationFirstCorrect && (
                  <span className="inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-full border border-violet-300/45 bg-violet-500/16 px-2.5 text-[11px] font-semibold text-violet-50 game-settlement-pill game-settlement-pill--rank">
                    首答
                  </span>
                )}
                {showCurrentRecommendationRankBadge && (
                  <span className="inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-full border border-indigo-300/45 bg-indigo-500/16 px-2.5 text-[11px] font-semibold text-indigo-50 game-settlement-pill game-settlement-pill--rank">
                    第{currentRecommendationCorrectRank}答
                  </span>
                )}
                {hasCurrentRecommendationSpeedDelta && (
                  <span
                    className={`inline-flex h-6 min-w-[7.2rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold game-settlement-pill game-settlement-pill--speed ${
                      currentRecommendationSpeedValue.startsWith("-")
                        ? "border-rose-300/45 bg-rose-500/16 text-rose-100"
                        : "border-cyan-300/45 bg-cyan-500/16 text-cyan-100"
                    }`}
                    title={currentRecommendationSpeedNote}
                  >
                    速度差 {currentRecommendationSpeedValue}
                  </span>
                )}
                {typeof currentRecommendationAverageCorrectMs === "number" && (
                  <span className="inline-flex h-6 min-w-[9.8rem] items-center justify-center rounded-full border border-amber-300/40 bg-amber-500/14 px-2.5 text-[11px] font-semibold text-amber-100 game-settlement-pill game-settlement-pill--average">
                    平均答對時長 {formatMs(currentRecommendationAverageCorrectMs)}
                  </span>
                )}
              </div>
              <div className="game-settlement-badge-row min-h-[2rem]">
                {currentRecommendationFastestCorrectMeta && (
                  <span className="inline-flex h-6 min-w-[13rem] items-center justify-center rounded-full border border-orange-300/45 bg-orange-500/14 px-2.5 text-[11px] font-semibold text-orange-100 game-settlement-pill game-settlement-pill--fastest-meta">
                    全場最快 {currentRecommendationFastestCorrectMeta.username}{" "}
                    {formatMs(currentRecommendationFastestCorrectMeta.answeredAtMs)}
                  </span>
                )}
                {isCurrentRecommendationFastest && (
                  <Tooltip
                    title={
                      isCurrentRecommendationGlobalFastest
                        ? "你是本場所有玩家中的單題最快答對者"
                        : "這是你在本場所有答對題目中的最快一題"
                    }
                    placement="top"
                    arrow
                  >
                    <span
                      className={`inline-flex h-6 min-w-[8rem] items-center justify-center gap-1 rounded-full border border-orange-300/45 bg-orange-500/16 px-2.5 text-[11px] font-semibold text-orange-100 game-settlement-pill game-settlement-pill--fastest ${
                        isCurrentRecommendationLegendFastest
                          ? "game-settlement-pill--legend"
                          : ""
                      }`}
                    >
                      <LocalFireDepartmentRoundedIcon className="text-[0.85rem]" />
                      {currentRecommendationFastestBadgeText}
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2"> 
              <button
                type="button"
                className="rounded-full border border-sky-300/45 bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-100 transition hover:bg-sky-400/25"
                onClick={onSupportArtistClick}
                disabled={!currentRecommendation.link?.href}
              >
                如果喜歡這首歌曲，請至 YouTube 支持作者
              </button>
              {canAutoGuideLoop && !isPreviewFrozen && (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${activeCategoryTheme.badgeClass}`}
                >
                  AUTO {previewCountdownSec}s
                </span>
              )}
              {previewSwitchNotice && (
                <span
                  className="rounded-full border border-cyan-300/40 bg-cyan-500/12 px-2.5 py-1 text-[11px] font-semibold text-cyan-100"
                  style={{
                    animation: "settlementSwapIn 180ms ease-out both",
                  }}
                >
                  {previewSwitchNotice}
                </span>
              )}
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              試聽音量目標 {effectivePreviewVolume}% ·
              {settlementPreviewSyncGameVolume ? " 同步遊戲音量" : " 自訂試聽音量"}
            </p>

            <div
              ref={recommendPreviewStageRef}
              className="mt-3 overflow-hidden rounded-xl border border-slate-700/80 bg-black/45 scroll-mt-24"
            >
              <div className="relative aspect-video w-full">
                {currentRecommendation.recap.thumbnail &&
                  !isCurrentRecommendationPreviewOpen && (
                    <img
                      src={currentRecommendation.recap.thumbnail}
                      alt={currentRecommendation.recap.title}
                      className="absolute inset-0 h-full w-full object-cover opacity-30"
                    />
                  )}
                {isCurrentRecommendationPreviewOpen && currentRecommendationPreviewUrl && (
                  <iframe
                    ref={previewIframeRef}
                    src={currentRecommendationPreviewUrl}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={`preview-${currentRecommendation.recap.key}`}
                    onLoad={onPreviewIframeLoad}
                  />
                )}
                {shouldShowPreviewOverlay && (
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${
                      previewPlayerState === "paused"
                        ? "from-slate-950/48 via-slate-950/78 to-slate-950/95"
                        : "from-slate-950/25 via-slate-950/55 to-slate-950/82"
                    }`}
                  />
                )}
                {currentRecommendationPreviewUrl ? (
                  shouldShowPreviewOverlay && (
                    <button
                      type="button"
                      className="absolute inset-0 z-20 flex items-center justify-center px-4 text-center"
                      onClick={onQuickPlayStart}
                    >
                      <span className="text-xs font-semibold text-slate-100 sm:text-sm">
                        如果喜歡這首歌曲，請至 YouTube 支持作者。
                      </span>
                    </button>
                  )
                ) : (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <p className="text-sm font-semibold text-slate-200">
                      目前沒有可用的試聽來源
                    </p>
                    <p className="text-xs text-slate-400">
                      請改用 {currentRecommendation.providerLabel} 連結開啟
                    </p>
                  </div>
                )}
              </div>
            </div>
          </article>

          <aside
            className={`flex min-h-[420px] flex-col rounded-2xl border p-3 transition-colors duration-300 ${activeCategoryTheme.asideClass}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  推薦清單
                </p>
                <span className="text-xs text-slate-300">
                  {recommendationCards.length === 0
                    ? "0/0"
                    : `${safeRecommendIndex + 1}/${recommendationCards.length}`}
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-500/10 px-1 py-1">
                <button
                  type="button"
                  className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:opacity-40"
                  onClick={onGoPrevReviewParticipant}
                  disabled={!canCycleReviewParticipants}
                >
                  上一位
                </button>
                <span className="max-w-[150px] truncate whitespace-nowrap px-1 text-[11px] font-semibold text-sky-100">
                  {selectedReviewParticipantLabel}
                </span>
                <button
                  type="button"
                  className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:opacity-40"
                  onClick={onGoNextReviewParticipant}
                  disabled={!canCycleReviewParticipants}
                >
                  下一位
                </button>
              </div>
            </div>
            <div className="mt-3 flex-1 overflow-hidden pr-1">
              {recommendationCards.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700/70 bg-slate-900/55 px-3 text-sm text-slate-400">
                  目前沒有推薦清單
                </div>
              ) : (
                <VirtualList
                  style={{ height: "100%", width: "100%" }}
                  rowCount={recommendationCards.length}
                  rowHeight={96}
                  rowProps={recommendationRowProps}
                  rowComponent={RecommendationListRow}
                />
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-400 disabled:opacity-40"
                onClick={onGoPrevRecommendation}
                disabled={!canNavigateRecommendations}
              >
                {recommendNavLabels.prev}
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-400 disabled:opacity-40"
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




