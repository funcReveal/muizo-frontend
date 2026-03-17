import React from "react";
import { IconButton, Popover, Tooltip } from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
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
          {card.hint} 繚 {card.emphasis}
        </p>
      </button>
    </div>
  );
};

const RecommendGuideSection: React.FC<RecommendGuideSectionProps> = ({
  isMobileView = false,
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
  const [mobileDetailExpanded, setMobileDetailExpanded] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("settlement:mobile:detail-expanded") === "1";
  });
  const [mobileControlsAnchorEl, setMobileControlsAnchorEl] =
    React.useState<HTMLButtonElement | null>(null);
  const [mobileListExpanded, setMobileListExpanded] = React.useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(max-width: 1023.95px)").matches;
  });
  const [mobileHintOpen, setMobileHintOpen] = React.useState(false);
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

  React.useEffect(() => {
    if (!isMobileView) {
      setMobileControlsAnchorEl(null);
      setMobileHintOpen(false);
    }
  }, [isMobileView]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "settlement:mobile:detail-expanded",
      mobileDetailExpanded ? "1" : "0",
    );
  }, [mobileDetailExpanded]);

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
  const youtubeSupportCtaLabel = "前往 YouTube 收聽並支持創作者";
  const youtubeOverlayTitle = "如果喜歡這首音樂，別忘了到 YouTube 支持創作者喲！";
  const isCurrentRecommendationLegendFastest =
    currentRecommendationFastestBadgeText.includes("全場") &&
    currentRecommendationFastestBadgeText.includes("最快");
  const mobileControlsPopoverOpen = Boolean(mobileControlsAnchorEl);

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
      className={`game-settlement-recommend-shell rounded-2xl border p-4 transition-colors duration-300 ${activeCategoryTheme.shellClass}`}
    >
      <div className="space-y-3">
        <div className="game-settlement-recommend-head flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-slate-100">
                推薦導覽 ・ {recommendCategoryLabels[activeRecommendCategory]}
              </h3>
              {isMobileView ? (
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-500/12 text-cyan-100 transition hover:border-cyan-200/70"
                  aria-label={mobileHintOpen ? "收合推薦導覽說明" : "展開推薦導覽說明"}
                  onClick={() => setMobileHintOpen((prev) => !prev)}
                >
                  <HelpOutlineRoundedIcon fontSize="inherit" />
                </button>
              ) : (
                <Tooltip title={recommendControlsTooltip} arrow>
                  <IconButton
                    size="small"
                    className="!h-6 !w-6 !border !border-cyan-300/45 !bg-cyan-500/12 !text-cyan-100"
                    aria-label="推薦導覽說明"
                  >
                    <HelpOutlineRoundedIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
            <div
              className={`game-settlement-mobile-meta-panel ${
                !isMobileView || mobileHintOpen
                  ? "game-settlement-mobile-meta-panel--open"
                  : ""
              }`}
            >
              <div className="game-settlement-mobile-meta-panel__content">
                <p className="mt-1 text-xs text-slate-300">
                  {recommendCategoryShortHints[activeRecommendCategory]}
                </p>
              </div>
            </div>
          </div>
          {isMobileView && (
            <button
              type="button"
              className="inline-flex min-w-[84px] items-center justify-center gap-1 self-start rounded-full border border-slate-500/65 bg-slate-900/68 px-2.5 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-300/70"
              onClick={(event) =>
                setMobileControlsAnchorEl((prev) =>
                  prev ? null : (event.currentTarget as HTMLButtonElement),
                )
              }
              aria-label={mobileControlsPopoverOpen ? "收合工具面板" : "展開工具面板"}
            >
              <DashboardCustomizeRoundedIcon className="text-[1rem]" />
              <span>檢視</span>
              {mobileControlsPopoverOpen ? (
                <KeyboardArrowUpRoundedIcon className="text-[1rem]" />
              ) : (
                <KeyboardArrowDownRoundedIcon className="text-[1rem]" />
              )}
            </button>
          )}
          {!isMobileView && showRecommendControlsHint && (
            <span className="rounded-full border border-cyan-300/45 bg-cyan-500/12 px-3 py-1 text-[11px] font-semibold text-cyan-100">
              可切換分類、啟用自動導覽，並快速瀏覽題目與推薦預覽
            </span>
          )}
        </div>

        {isMobileView ? (
          <Popover
            open={mobileControlsPopoverOpen}
            anchorEl={mobileControlsAnchorEl}
            onClose={() => setMobileControlsAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                className:
                  "mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-500/35 bg-slate-950/95 shadow-[0_28px_64px_-32px_rgba(8,15,35,0.92)]",
              },
            }}
          >
            <div className="game-settlement-controls-dock rounded-2xl border-0 bg-transparent p-2">
              <div className="game-settlement-mobile-control-grid">
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
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`game-settlement-mobile-control-tile ${
                        active
                          ? `${activeCategoryTheme.badgeClass} game-settlement-mobile-control-tile--active`
                          : "border-slate-600/70 bg-slate-900/72 text-slate-200"
                      } ${count <= 0 ? "cursor-not-allowed opacity-45" : ""}`}
                      onClick={() => onActivateCategory(category)}
                      disabled={count <= 0}
                    >
                      <span className="inline-flex items-center justify-center">
                        <Icon fontSize="small" className="text-[1rem]" />
                      </span>
                      <span className="text-[11px] font-semibold">{recommendCategoryLabels[category]}</span>
                      <span className="rounded-full border border-current/40 px-2 py-0.5 text-[10px] leading-none">
                        {count}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`game-settlement-mobile-control-tile game-settlement-mobile-control-tile--wide ${
                    autoPreviewEnabled
                      ? "border-cyan-300/55 bg-cyan-500/18 text-cyan-50"
                      : "border-slate-600/70 bg-slate-900/72 text-slate-300"
                  }`}
                  onClick={onToggleAutoPreview}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <GraphicEqRoundedIcon fontSize="small" className="text-[1rem]" />
                    自動導覽
                  </span>
                  <span className="rounded-full border border-current/40 px-2 py-0.5 text-[10px] leading-none">
                    {autoPreviewEnabled ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>
          </Popover>
        ) : (
          <div className="game-settlement-controls-sticky game-settlement-controls-dock rounded-2xl border border-slate-500/35 bg-slate-950/72 p-2">
            <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="game-settlement-recommend-control-scroll min-w-0 overflow-x-auto pb-1">
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

                <div className="game-settlement-recommend-control-scroll min-w-0 overflow-x-auto pb-1 xl:justify-self-end">
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
                      title="自動導覽會依倒數切歌，遇到瀏覽器限制時可手動點擊開始"
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
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {!currentRecommendation || !hasCurrentRecommendationLink ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-600/70 bg-slate-900/55 px-4 py-6 text-sm text-slate-400">
          目前沒有可播放的推薦歌曲，請切換分類或回到題目回顧。
        </div>
      ) : (
        <div
          className={`game-settlement-recommend-layout mt-4 grid gap-4 ${
            isMobileView
              ? "grid-cols-1"
              : "xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]"
          }`}
        >
          <article
            key={recommendationTransitionKey}
            className={`game-settlement-recommend-preview-card rounded-2xl border p-4 ${activeCategoryTheme.sectionClass}`}
            style={{
              animation: "settlementSwapIn 240ms ease-out both",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                {!isMobileView && (
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Artist Spotlight
                  </p>
                )}
                <button
                  ref={recommendationTitleButtonRef}
                  type="button"
                  onClick={onOpenRecommendationTitle}
                  disabled={!currentRecommendation.link?.href}
                  className={`game-settlement-title-marquee mt-1 w-full overflow-hidden text-left font-black leading-tight text-slate-100 underline-offset-4 transition hover:text-cyan-200 hover:underline disabled:cursor-default disabled:opacity-85 disabled:no-underline ${
                    isMobileView ? "text-[1.55rem]" : "text-2xl sm:text-[2rem]"
                  }`}
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
                {(!isMobileView || mobileDetailExpanded) &&
                  currentRecommendationGradeLabel &&
                  currentRecommendationGradeBadgeClass && (
                    <span
                      className={`inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold game-settlement-pill game-settlement-pill--grade ${currentRecommendationGradeBadgeClass}`}
                    >
                      評級 {currentRecommendationGradeLabel}
                    </span>
                  )}
                {(!isMobileView || mobileDetailExpanded) &&
                  isCurrentRecommendationFirstCorrect && (
                    <span className="inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-full border border-violet-300/45 bg-violet-500/16 px-2.5 text-[11px] font-semibold text-violet-50 game-settlement-pill game-settlement-pill--rank">
                      首答
                    </span>
                  )}
                {(!isMobileView || mobileDetailExpanded) &&
                  showCurrentRecommendationRankBadge && (
                    <span className="inline-flex h-6 min-w-[4.4rem] items-center justify-center rounded-full border border-indigo-300/45 bg-indigo-500/16 px-2.5 text-[11px] font-semibold text-indigo-50 game-settlement-pill game-settlement-pill--rank">
                      {`第 ${currentRecommendationCorrectRank} 答`}
                    </span>
                  )}
                {!isMobileView && hasCurrentRecommendationSpeedDelta && (
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
                {!isMobileView &&
                  typeof currentRecommendationAverageCorrectMs === "number" && (
                    <span className="inline-flex h-6 min-w-[9.8rem] items-center justify-center rounded-full border border-amber-300/40 bg-amber-500/14 px-2.5 text-[11px] font-semibold text-amber-100 game-settlement-pill game-settlement-pill--average">
                      平均答對時間 {formatMs(currentRecommendationAverageCorrectMs)}
                    </span>
                  )}
              </div>
              {isMobileView && (
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-500/65 bg-slate-900/68 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-300/70"
                  onClick={() => setMobileDetailExpanded((prev) => !prev)}
                >
                  {mobileDetailExpanded ? "收合其他標籤" : "展開其他標籤"}
                </button>
              )}
              {isMobileView && mobileDetailExpanded && (
                <div className="game-settlement-mobile-metrics rounded-lg border border-slate-700/70 bg-slate-950/55 px-2.5 py-2 text-[11px] text-slate-200">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {hasCurrentRecommendationSpeedDelta && (
                      <span
                        className={
                          currentRecommendationSpeedValue.startsWith("-")
                            ? "text-rose-200"
                            : "text-cyan-200"
                        }
                        title={currentRecommendationSpeedNote}
                      >
                        速度差 {currentRecommendationSpeedValue}
                      </span>
                    )}
                    {typeof currentRecommendationAverageCorrectMs === "number" && (
                      <span className="text-amber-200">
                        平均答對時間 {formatMs(currentRecommendationAverageCorrectMs)}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {(!isMobileView || mobileDetailExpanded) && (
                <div className="game-settlement-badge-row min-h-[2rem]">
                  {currentRecommendationFastestCorrectMeta && (
                    <span className={`inline-flex h-6 ${isMobileView ? "min-w-[10.8rem]" : "min-w-[13rem]"} items-center justify-center rounded-full border border-orange-300/45 bg-orange-500/14 px-2.5 text-[11px] font-semibold text-orange-100 game-settlement-pill game-settlement-pill--fastest-meta`}>
                      全場最快 {currentRecommendationFastestCorrectMeta.username}{" "}
                      {formatMs(currentRecommendationFastestCorrectMeta.answeredAtMs)}
                    </span>
                  )}
                  {isCurrentRecommendationFastest && (
                    <Tooltip
                      title={
                        isCurrentRecommendationGlobalFastest
                          ? "全場玩家最快答對，已達傳奇級紀錄"
                          : "全場仍有更快紀錄，可再挑戰速度"
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
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-sky-300/45 bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-100 transition hover:bg-sky-400/25"
                onClick={onSupportArtistClick}
                disabled={!currentRecommendation.link?.href}
              >
                {youtubeSupportCtaLabel}
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

            {(!isMobileView || mobileDetailExpanded) && (
              <p className="mt-2 text-[11px] text-slate-400">
                試聽音量目標 {effectivePreviewVolume}%
                {settlementPreviewSyncGameVolume ? " ・同步遊戲音量" : " ・使用獨立試聽音量"}
              </p>
            )}

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
                      <span className="max-w-[28rem] text-xs font-semibold text-slate-100 sm:text-sm">
                        {youtubeOverlayTitle}
                      </span>
                    </button>
                  )
                ) : (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <p className="text-sm font-semibold text-slate-200">
                      目前沒有可播放的推薦來源
                    </p>
                    <p className="text-xs text-slate-400">
                      請切換 {currentRecommendation.providerLabel} 類別後再試
                    </p>
                  </div>
                )}
              </div>
            </div>
            {isMobileView && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-400 disabled:opacity-40"
                  onClick={onGoPrevRecommendation}
                  disabled={!canNavigateRecommendations}
                >
                  {recommendNavLabels.prev}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-400 disabled:opacity-40"
                  onClick={onGoNextRecommendation}
                  disabled={!canNavigateRecommendations}
                >
                  {recommendNavLabels.next}
                </button>
              </div>
            )}
          </article>

          <div
            className={`${
              isMobileView
                ? ""
                : ""
            }`}
          >
            {isMobileView && (
              <button
                type="button"
                className="game-settlement-mobile-accordion__trigger flex w-full items-center justify-between gap-3 rounded-2xl border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-left text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/70"
                onClick={() => setMobileListExpanded((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-2">
                  <SubjectRoundedIcon className="text-[1rem]" />
                  題目清單
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded-full border border-current/35 px-2 py-0.5 text-[10px] leading-none text-cyan-50/90">
                    {recommendationCards.length}
                  </span>
                  {mobileListExpanded ? (
                    <KeyboardArrowUpRoundedIcon className="text-[1rem]" />
                  ) : (
                    <KeyboardArrowDownRoundedIcon className="text-[1rem]" />
                  )}
                </span>
              </button>
            )}
            <div
              className={`game-settlement-mobile-collapsible ${
                !isMobileView || mobileListExpanded
                  ? "game-settlement-mobile-collapsible--open"
                  : ""
              }`}
            >
            <aside
              className={`game-settlement-recommend-list-card flex flex-col rounded-2xl border p-3 transition-colors duration-300 ${
                isMobileView ? "min-h-[272px]" : "min-h-[420px]"
              } ${activeCategoryTheme.asideClass}`}
            >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  {isMobileView ? "題目清單" : "推薦清單"}
                </p>
                <span className="text-xs text-slate-300">
                  {recommendationCards.length === 0
                    ? "0/0"
                    : `${safeRecommendIndex + 1}/${recommendationCards.length}`}
                </span>
              </div>
              {!isMobileView && (
                <div className="game-settlement-recommend-review-switch flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-500/10 px-1 py-1">
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
              )}
            </div>
            <div
              className={`game-settlement-recommend-list-viewport mt-3 flex-1 overflow-hidden pr-1 ${
                isMobileView ? "h-[clamp(240px,42vh,360px)]" : ""
              }`}
            >
              {recommendationCards.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700/70 bg-slate-900/55 px-3 text-sm text-slate-400">
                  目前沒有可顯示的題目清單
                </div>
              ) : (
                <VirtualList
                  style={{ height: "100%", width: "100%" }}
                  rowCount={recommendationCards.length}
                  rowHeight={isMobileView ? 90 : 96}
                  rowProps={recommendationRowProps}
                  rowComponent={RecommendationListRow}
                />
              )}
            </div>
            <div className="game-settlement-recommend-list-nav mt-3 flex items-center justify-between gap-2">
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
          </div>
        </div>
      )}
    </section>
  );
};

export default RecommendGuideSection;
