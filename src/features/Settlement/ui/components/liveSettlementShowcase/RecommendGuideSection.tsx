import React from "react";
import { Drawer, IconButton, Popover, Tooltip } from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";

import type { RecommendCategory } from "../../lib/settlementUtils";
import useAutoHideScrollbar from "../../../../../shared/hooks/useAutoHideScrollbar";
import MobileDrawerEdgeControls from "./MobileDrawerEdgeControls";

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
  link?: { href?: string | null; authorHref?: string | null } | null;
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
  previewVolume: number;
  onPreviewVolumeChange: (next: number) => void;
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
  isMobileRecommendPanelOpen,
  onToggleMobileRecommendPanelOpen,
  previewVolume,
  onPreviewVolumeChange,
}) => {
  const MOBILE_BADGE =
    "inline-flex h-6 min-w-[3.5rem] items-center justify-center gap-1 rounded-full border px-2.5 text-[10.5px] font-semibold";

  const recommendationListRef = useAutoHideScrollbar<HTMLDivElement>();
  const mobileDrawerListNodeRef = React.useRef<HTMLDivElement | null>(null);
  const mobileDrawerScrollbarRef = useAutoHideScrollbar<HTMLDivElement>();
  const mobileDrawerItemRefs = React.useRef(new Map<string, HTMLDivElement>());
  const mobileDrawerAutoScrollFrameRef = React.useRef<number | null>(null);

  const [autoPreviewHelpAnchor, setAutoPreviewHelpAnchor] =
    React.useState<HTMLElement | null>(null);
  const youtubeOverlayTitle = "如果喜歡這首音樂，別忘了到 YouTube 支持創作者喲！";

  const localPreviewVolumeRef = React.useRef(previewVolume);
  const previewIsDraggingRef = React.useRef(false);
  const previewRafRef = React.useRef<number | null>(null);
  const previewSliderRef = React.useRef<HTMLInputElement | null>(null);
  const previewFillRef = React.useRef<HTMLDivElement | null>(null);
  const previewThumbRef = React.useRef<HTMLSpanElement | null>(null);
  const previewTextRef = React.useRef<HTMLSpanElement | null>(null);
  const [previewIsMuted, setPreviewIsMuted] = React.useState(previewVolume <= 0);

  const applyPreviewVolumeDOM = React.useCallback((next: number) => {
    if (previewFillRef.current) previewFillRef.current.style.width = `${Math.max(0, Math.min(100, next))}%`;
    if (previewThumbRef.current) {
      previewThumbRef.current.style.left =
        next <= 0 ? "0px" : next >= 100 ? "calc(100% - 18px)" : `calc(${next}% - 9px)`;
    }
    if (previewTextRef.current) previewTextRef.current.textContent = `${Math.round(next)}%`;
  }, []);

  React.useEffect(() => {
    if (previewIsDraggingRef.current) return;
    localPreviewVolumeRef.current = previewVolume;
    if (previewSliderRef.current) previewSliderRef.current.value = String(previewVolume);
    applyPreviewVolumeDOM(previewVolume);
    setPreviewIsMuted(previewVolume <= 0);
  }, [previewVolume, applyPreviewVolumeDOM]);
  const currentCard = currentRecommendation;
  const shouldKeepLivePreviewVisible = currentRecommendationPreviewUrl !== null;
  const showPreviewCover =
    previewPlayerState !== "playing" &&
    (previewPlayerState === "paused" ||
      shouldShowPreviewOverlay ||
      !shouldKeepLivePreviewVisible);
  const [mobileQuestionDrawerOpen, setMobileQuestionDrawerOpen] = React.useState(false);
  const [mobileCategorySelectOpen, setMobileCategorySelectOpen] = React.useState(false);
  const [mobileCategoryHintAnchor, setMobileCategoryHintAnchor] = React.useState<HTMLElement | null>(null);
  const allRecommendationCards = React.useMemo(
    () => CATEGORY_META.flatMap((item) => recommendationCardsByCategory[item.key]),
    [recommendationCardsByCategory],
  );
  const mobileCurrentRecommendationIndex = currentCard
    ? allRecommendationCards.findIndex((card) => card.recap.key === currentCard.recap.key)
    : -1;
  const mobileListProgressLabel =
    allRecommendationCards.length === 0
      ? "0/0"
      : `${Math.min(
        allRecommendationCards.length,
        Math.max(
          1,
          (mobileCurrentRecommendationIndex >= 0
            ? mobileCurrentRecommendationIndex
            : safeRecommendIndex) + 1,
        ),
      )}/${allRecommendationCards.length}`;

  React.useEffect(() => {
    if (!mobileQuestionDrawerOpen) setMobileCategorySelectOpen(false);
  }, [mobileQuestionDrawerOpen]);

  const openMobileQuestionDrawer = React.useCallback(() => {
    setMobileQuestionDrawerOpen(true);
  }, []);

  const closeMobileQuestionDrawer = React.useCallback(() => {
    setMobileQuestionDrawerOpen(false);
  }, []);

  const registerMobileDrawerItemRef = React.useCallback(
    (recapKey: string) => (node: HTMLDivElement | null) => {
      if (node) {
        mobileDrawerItemRefs.current.set(recapKey, node);
        return;
      }
      mobileDrawerItemRefs.current.delete(recapKey);
    },
    [],
  );

  const setMobileDrawerListRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      mobileDrawerListNodeRef.current = node;
      mobileDrawerScrollbarRef(node);
    },
    [mobileDrawerScrollbarRef],
  );

  const scrollMobileDrawerToSelected = React.useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (!isMobileView || !mobileQuestionDrawerOpen || !currentCard) return;
      const row = mobileDrawerItemRefs.current.get(currentCard.recap.key);
      if (!row) return;

      row.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior,
      });
    },
    [currentCard, isMobileView, mobileQuestionDrawerOpen],
  );

  const handleMobileDrawerEntered = React.useCallback(() => {
    scrollMobileDrawerToSelected("auto");
  }, [scrollMobileDrawerToSelected]);

  React.useEffect(() => {
    if (!isMobileView || !mobileQuestionDrawerOpen || !currentCard) return;

    if (mobileDrawerAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(mobileDrawerAutoScrollFrameRef.current);
    }

    // Single rAF — nested rAF was unnecessary; layout is settled after one
    // commit → paint tick since the drawer itself isn't mid-transition here.
    mobileDrawerAutoScrollFrameRef.current = window.requestAnimationFrame(() => {
      mobileDrawerAutoScrollFrameRef.current = null;
      scrollMobileDrawerToSelected("auto");
    });

    return () => {
      if (mobileDrawerAutoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(mobileDrawerAutoScrollFrameRef.current);
        mobileDrawerAutoScrollFrameRef.current = null;
      }
    };
  }, [currentCard, isMobileView, mobileQuestionDrawerOpen, scrollMobileDrawerToSelected]);

  const renderCategorySelect = () => {
    const activeMeta = CATEGORY_META.find((item) => item.key === activeRecommendCategory) ?? CATEGORY_META[0];
    const ActiveIcon = activeMeta.icon;
    const activeCount = recommendationCardsByCategory[activeRecommendCategory].length;

    return (
      <div className="relative z-30">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-slate-400">
          題型分類
        </p>
        <button
          type="button"
          aria-expanded={mobileCategorySelectOpen}
          onClick={() => setMobileCategorySelectOpen((current) => !current)}
          className={`relative flex min-h-[3rem] w-full cursor-pointer items-center rounded-[18px] border px-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition ${activeCategoryTheme.badgeClass}`}
        >
          <span className="inline-flex min-w-0 flex-1 items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.18]">
              <ActiveIcon className="text-[1rem]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {recommendCategoryLabels[activeRecommendCategory]}
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-medium text-current/65">
                {recommendCategoryShortHints[activeRecommendCategory]}
              </span>
            </span>
          </span>
          <span className="mr-7 shrink-0 rounded-full border border-current/30 px-2 py-0.5 text-[10px] leading-none">
            {activeCount}
          </span>
          <ExpandMoreRoundedIcon className={`pointer-events-none absolute right-3 text-[1.15rem] text-current/80 transition ${mobileCategorySelectOpen ? "rotate-180" : ""}`} />
        </button>
        <div
          className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-[18px] border border-slate-600/45 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(3,7,18,0.99))] shadow-[0_22px_56px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-[opacity,transform] duration-180 ease-out ${
            mobileCategorySelectOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
          }`}
        >
          <div className="max-h-[13.5rem] overflow-y-auto p-1.5">
              {CATEGORY_META.map((item) => {
                const Icon = item.icon;
                const count = recommendationCardsByCategory[item.key].length;
                const active = activeRecommendCategory === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={count <= 0}
                    onClick={() => {
                      onActivateCategory(item.key);
                      setMobileCategorySelectOpen(false);
                    }}
                    className={`flex min-h-[3rem] w-full cursor-pointer items-center gap-2 rounded-[14px] px-3 text-left transition ${
                      active
                        ? "bg-cyan-400/[0.13] text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.22)]"
                        : "text-slate-200 hover:bg-white/[0.06]"
                    } ${count <= 0 ? "cursor-not-allowed opacity-45" : ""}`}
                  >
                    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                      active ? "bg-cyan-300/[0.16] text-cyan-100" : "bg-white/[0.05] text-slate-300"
                    }`}
                    >
                      <Icon className="text-[1rem]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{recommendCategoryLabels[item.key]}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-400">
                        {recommendCategoryShortHints[item.key]}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-current/25 px-2 py-0.5 text-[10px] font-semibold leading-none">
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  const renderRecommendationList = (closeOnSelect = false) => (
    <div className="space-y-3">
      {recommendationCards.length === 0 ? (
        <div className="flex h-full min-h-[240px] items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
          目前沒有可顯示的題目清單。
        </div>
      ) : (
        recommendationCards.map((card, index) => {
          const isActive = index === safeRecommendIndex;
          const selectCard = () => {
            onSelectRecommendation(index);
            if (closeOnSelect) setMobileQuestionDrawerOpen(false);
          };

          return (
            <div
              key={card.recap.key}
              ref={closeOnSelect ? registerMobileDrawerItemRef(card.recap.key) : undefined}
              role="button"
              tabIndex={0}
              className={`block w-full cursor-pointer rounded-[22px] border px-4 py-4 text-left transition ${
                isActive
                  ? `${activeCategoryTheme.listActiveClass} shadow-[0_18px_34px_-28px_rgba(16,185,129,0.48)]`
                  : "border-slate-700/75 bg-slate-950/58 hover:border-slate-500/75"
              }`}
              onClick={selectCard}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectCard();
                }
              }}
            >
              <div className="min-w-0 flex flex-col items-start">
                <div className="flex w-full items-start gap-2">
                  <p className="min-w-0 flex-1 truncate text-lg font-black leading-snug text-white">
                    {card.recap.title}
                  </p>
                  {closeOnSelect && card.link?.href ? (
                    <button
                      type="button"
                      aria-label="??????"
                      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-cyan-300/24 bg-cyan-500/10 text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-500/18"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectRecommendation(index);
                        onOpenCardLink(card);
                      }}
                    >
                      <OpenInNewRoundedIcon className="text-[1rem]" />
                    </button>
                  ) : null}
                </div>
                {card.link?.authorHref ? (
                  <a
                    href={card.link.authorHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-author-href={card.link.authorHref}
                    className={`mq-author-link mq-author-link--subtle mt-2 block w-fit max-w-full text-sm text-slate-300 ${closeOnSelect ? "pointer-events-none" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <span className="block truncate">{card.recap.uploader || "未知作者"}</span>
                  </a>
                ) : (
                  <p className="mt-2 block w-full truncate text-sm text-slate-300">
                    {card.recap.uploader || "未知作者"}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="cursor-default rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-100">
                    {card.hint}
                  </span>
                  <span className="cursor-default rounded-full border border-slate-500/55 bg-slate-800/70 px-2.5 py-1 text-[10.5px] font-semibold text-slate-100">
                    {card.emphasis}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const mobileQuestionDrawer =
    isMobileView && typeof document !== "undefined"
      ? (
        <>
          <MobileDrawerEdgeControls
            open={mobileQuestionDrawerOpen}
            progressLabel={mobileListProgressLabel}
            openAriaLabel="開啟推薦題目清單"
            closeAriaLabel="關閉推薦題目清單"
            onOpen={openMobileQuestionDrawer}
            onClose={closeMobileQuestionDrawer}
            openIcon={<QueueMusicRoundedIcon className="shrink-0 text-[1rem]" />}
            closeIcon={<KeyboardDoubleArrowRightRoundedIcon className="text-[1.35rem]" />}
            drawerWidthCss="min(92vw, 380px)"
          />
          <Drawer
            anchor="right"
            open={mobileQuestionDrawerOpen}
            onClose={closeMobileQuestionDrawer}
            PaperProps={{
              className: "!w-[min(92vw,380px)] !bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(4,8,18,0.99))] !border-l !border-slate-700/25",
            }}
            slotProps={{
              transition: {
                onEntered: handleMobileDrawerEntered,
              },
            }}
            sx={{ zIndex: 1700 }}
          >
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
                <span className="inline-flex min-w-0 items-baseline gap-3 font-semibold">
                  <span className="inline-flex items-center gap-2 text-sm text-white">
                    <QueueMusicRoundedIcon className="shrink-0 text-[1rem] text-cyan-200" />
                    題目清單
                  </span>
                  <span className="whitespace-nowrap text-[0.95rem] font-black tabular-nums text-cyan-200">
                    {mobileListProgressLabel}
                  </span>
                </span>
                <IconButton size="small" onClick={closeMobileQuestionDrawer} className="!text-slate-300">
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </div>
              <div className="shrink-0 border-b border-white/7 px-4 pb-3 pt-1">
                {renderCategorySelect()}
              </div>
              <div className="shrink-0 border-b border-white/7 px-4 py-3">
                <div className="grid grid-cols-[74px_minmax(0,1fr)_74px] items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2 py-2 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    onClick={onGoPrevReviewParticipant}
                    disabled={!canCycleReviewParticipants}
                  >
                    上一位
                  </button>
                  <div className="min-w-0 px-1 text-center">
                    <GroupsRoundedIcon className="text-[1rem] text-cyan-200" />
                    <p className="mt-1 truncate text-[12px] font-semibold text-sky-100">
                      {selectedReviewParticipantLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2 py-2 text-[11px] font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    onClick={onGoNextReviewParticipant}
                    disabled={!canCycleReviewParticipants}
                  >
                    下一位
                  </button>
                </div>
              </div>
              <div
                ref={setMobileDrawerListRef}
                className="mq-autohide-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4"
              >
                {renderRecommendationList(true)}
              </div>
              <div className="shrink-0 border-t border-white/7 px-4 py-3">
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
            </div>
          </Drawer>
        </>
      )
      : null;

  return (
    <section
      ref={recommendSectionRef}
      className={`transition-colors duration-300 ${
        isMobileView
          ? "rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,12,22,0.92),rgba(5,9,18,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          : "rounded-[22px] border p-3 lg:p-3.5"
      } ${isMobileView ? "" : activeCategoryTheme.shellClass}`}
    >
      {mobileQuestionDrawer}
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
          <div className="mt-1.5 flex items-center gap-1.5">
            {(() => {
              const activeMeta = CATEGORY_META.find(m => m.key === activeRecommendCategory);
              const AIcon = activeMeta?.icon;
              return (
                <span className={`inline-flex items-center gap-1 !border-0 !bg-transparent !p-0 !shadow-none ${activeCategoryTheme.badgeClass}`}>
                  {AIcon && <AIcon className="shrink-0 text-[1rem]" />}
                  <span className="text-[11px] font-semibold">
                    {recommendCategoryLabels[activeRecommendCategory]}
                  </span>
                </span>
              );
            })()}
            <button
              type="button"
              onClick={(e) => setMobileCategoryHintAnchor((curr) => curr === e.currentTarget ? null : e.currentTarget)}
              className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-slate-600/60 text-slate-400 transition hover:border-slate-400/70 hover:text-slate-200"
              aria-label="查看分類說明"
            >
              <HelpOutlineRoundedIcon sx={{ fontSize: 12 }} />
            </button>
          </div>
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
      <Popover
        open={Boolean(mobileCategoryHintAnchor)}
        anchorEl={mobileCategoryHintAnchor}
        onClose={() => setMobileCategoryHintAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          className:
            "!mt-2 !max-w-[240px] !rounded-[16px] !border !border-slate-600/40 !bg-[linear-gradient(180deg,rgba(12,18,32,0.97),rgba(6,10,22,0.99))] !px-3.5 !py-2.5 !text-xs !text-slate-300 !shadow-[0_16px_32px_-20px_rgba(0,0,0,0.8)]",
        }}
      >
        {recommendCategoryShortHints[activeRecommendCategory]}
      </Popover>

      {!isMobileView && (
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
              <div className="min-w-0 flex flex-1 flex-col items-start">
                {!isMobileView && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {recommendCategoryLabels[activeRecommendCategory]}
                  </p>
                )}
                <button
                  type="button"
                  onClick={onOpenRecommendationTitle}
                  disabled={!hasCurrentRecommendationLink}
                  className={`mq-title-link mq-title-link--hero mt-2 inline-grid max-w-full place-items-start text-left align-top ${isMobileView ? "text-[1.55rem]" : "text-[2rem]"} font-black leading-tight text-white transition ${
                    hasCurrentRecommendationLink
                      ? "cursor-pointer underline-offset-4 hover:text-cyan-200 hover:underline"
                      : "cursor-default"
                  }`}
                >
                  <AutoMarqueeTitle text={currentCard.recap.title} className="min-w-0 max-w-full text-current" />
                </button>
                {currentCard.link?.authorHref ? (
                  <a
                    href={currentCard.link.authorHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-author-href={currentCard.link.authorHref}
                    className="mq-author-link mq-author-link--hero mt-2 block max-w-full self-start text-lg font-semibold text-slate-200"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <span className="truncate">
                      {currentCard.recap.uploader || "未知作者"}
                    </span>
                  </a>
                ) : (
                  <p className="mt-2 block max-w-full self-start text-lg font-semibold text-slate-200">
                    {currentCard.recap.uploader || "未知作者"}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                <YouTubeIcon className="text-[2rem] text-[#ff0033]" />
              </div>
            </div>

            <div className={`mt-4 flex flex-wrap ${isMobileView ? "gap-1.5" : "gap-2"}`}>
              <span
                className={`${isMobileView ? MOBILE_BADGE : `${reviewStatusBadgeBaseClass} h-7 px-3 text-xs`} ${currentRecommendationResultTone.badgeClass}`}
              >
                {currentRecommendationResultTone.label}
              </span>
              {currentRecommendationGradeLabel && currentRecommendationGradeBadgeClass && (
                <span
                  className={`${isMobileView ? MOBILE_BADGE : "inline-flex items-center justify-center rounded-full border font-semibold h-7 px-3 text-xs"} ${currentRecommendationGradeBadgeClass}`}
                >
                  評分 {currentRecommendationGradeLabel}
                </span>
              )}
              {isCurrentRecommendationFirstCorrect && (
                <span className={`${isMobileView ? MOBILE_BADGE : "inline-flex items-center justify-center rounded-full border font-semibold h-7 px-3 text-xs"} border-violet-300/45 bg-violet-500/16 text-violet-50`}>
                  首答
                </span>
              )}
              {showCurrentRecommendationRankBadge && currentRecommendationCorrectRank !== null && (
                <span className={`${isMobileView ? MOBILE_BADGE : "inline-flex items-center justify-center rounded-full border font-semibold h-7 px-3 text-xs"} border-sky-300/45 bg-sky-500/16 text-sky-100`}>
                  第 {currentRecommendationCorrectRank} 位答對
                </span>
              )}
              {isCurrentRecommendationFastest && (
                <Tooltip
                  title={isCurrentRecommendationGlobalFastest ? "全場最快答對" : "速度表現亮眼"}
                  arrow
                >
                  <span
                    className={`${isMobileView ? MOBILE_BADGE : "inline-flex items-center justify-center rounded-full border font-semibold h-7 gap-1 px-3 text-xs"} ${
                      isCurrentRecommendationGlobalFastest
                        ? "border-orange-300/45 bg-orange-500/18 text-orange-100"
                        : "border-amber-300/40 bg-amber-500/14 text-amber-100"
                    }`}
                  >
                    <LocalFireDepartmentRoundedIcon className={isMobileView ? "text-[0.85rem] shrink-0" : "text-[0.95rem]"} />
                    {isMobileView ? "最速王" : currentRecommendationFastestBadgeText}
                  </span>
                </Tooltip>
              )}
            </div>

            <div className={`mt-4 w-full ${isMobileView ? "" : "rounded-[22px] border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(10,20,36,0.9),rgba(3,7,18,0.94))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"}`}>
              {isMobileView ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[16px] border border-white/6 bg-black/16 px-3 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <BoltRoundedIcon className="text-[1rem]" />
                        <p className="text-[11px]">作答概況</p>
                      </div>
                      <p className="mt-2 text-sm font-black text-white">
                        {currentCard.hint.replace(/，平均作答\s+\S+/g, "").trim()}
                      </p>
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
                        <CompareArrowsRoundedIcon className="text-[1rem]" />
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
                    <div className="mt-3 inline-flex items-center gap-1.5">
                      <EmojiEventsRoundedIcon className="shrink-0 text-[0.9rem] text-amber-300/90" />
                      <span className="text-[11px] text-slate-400">最快</span>
                      <span className="text-[12px] font-black text-amber-100 [text-shadow:0_0_10px_rgba(251,191,36,0.35)]">{currentRecommendationFastestCorrectMeta.username}</span>
                    </div>
                  )}
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
                        <CompareArrowsRoundedIcon className="text-[1rem]" />
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
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/[0.08] px-3 py-1.5">
                      <EmojiEventsRoundedIcon className="shrink-0 text-[0.95rem] text-amber-300/85" />
                      <span className="text-[11px] font-semibold text-slate-400">最快</span>
                      <span className="text-[12px] font-black text-amber-100">{currentRecommendationFastestCorrectMeta.username}</span>
                    </div>
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
              {!isMobileView && (
              <div className="ml-auto min-w-[320px] max-w-[420px] flex-1">
                <div className="flex min-w-0 items-center gap-3 px-1 py-1">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-slate-100">
                    {previewIsMuted ? <VolumeOffRoundedIcon className="text-[1.1rem]" /> : <VolumeUpRoundedIcon className="text-[1.1rem]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="relative h-5">
                      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-800/90" />
                      <div ref={previewFillRef} className="absolute inset-y-0 left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-linear-to-r from-cyan-400/90 via-sky-300/95 to-emerald-300/90 shadow-[0_0_16px_rgba(34,211,238,0.18)]" style={{ width: `${Math.max(0, Math.min(100, previewVolume))}%` }} />
                      <span ref={previewThumbRef} className="pointer-events-none absolute top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 rounded-full border border-slate-950/55 bg-white shadow-[0_0_0_4px_rgba(34,211,238,0.08),0_8px_20px_rgba(15,23,42,0.35)]" style={{ left: previewVolume <= 0 ? "0px" : previewVolume >= 100 ? "calc(100% - 18px)" : `calc(${previewVolume}% - 9px)` }} />
                      <input
                        ref={previewSliderRef}
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        defaultValue={previewVolume}
                        aria-label="預覽音量"
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          const wasMuted = localPreviewVolumeRef.current <= 0;
                          localPreviewVolumeRef.current = next;
                          applyPreviewVolumeDOM(next);
                          if ((next <= 0) !== wasMuted) setPreviewIsMuted(next <= 0);
                          if (previewRafRef.current === null) {
                            previewRafRef.current = requestAnimationFrame(() => {
                              previewRafRef.current = null;
                              onPreviewVolumeChange(localPreviewVolumeRef.current);
                            });
                          }
                        }}
                        onPointerDown={() => {
                          previewIsDraggingRef.current = true;
                        }}
                        onPointerUp={() => {
                          previewIsDraggingRef.current = false;
                          if (previewRafRef.current !== null) {
                            cancelAnimationFrame(previewRafRef.current);
                            previewRafRef.current = null;
                          }
                          onPreviewVolumeChange(localPreviewVolumeRef.current);
                        }}
                        className="absolute inset-0 z-20 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
                      />
                    </div>
                  </div>
                  <span ref={previewTextRef} className="shrink-0 min-w-[34px] text-right text-xs font-semibold tabular-nums text-cyan-100">{previewVolume}%</span>
                </div>
              </div>
              )}
            </div>
          </article>

          <aside
            className={`min-w-0 flex-col ${isMobileView ? "hidden" : "flex h-[820px] overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(7,15,28,0.96),rgba(5,10,18,0.99))] p-4"} transition-colors duration-300 ${isMobileView ? "" : activeCategoryTheme.asideClass}`}
          >
            {isMobileView ? (
              <>
                <div
                  className={`rounded-[24px] border transition-colors duration-200 ${
                    isMobileRecommendPanelOpen
                      ? "border-white/8 bg-transparent px-4 py-2.5"
                      : "border-transparent bg-transparent px-2 py-1"
                  }`}
                >
                  {isMobileRecommendPanelOpen ? (
                    <button
                      type="button"
                      onClick={onToggleMobileRecommendPanelOpen}
                      aria-label="收起題目清單"
                      className="inline-flex w-full cursor-pointer items-center justify-between text-left transition"
                    >
                      <span className="inline-flex items-baseline gap-3 font-semibold">
                        <span className="inline-flex items-center gap-2 text-sm text-white">
                          <QueueMusicRoundedIcon className="text-[1rem] text-cyan-200" />
                          題目清單
                        </span>
                        {/* Frameless count — bigger, cyan so it reads as a
                            secondary label rather than a chip. */}
                        <span className="text-[0.95rem] font-black tabular-nums text-cyan-200">
                          {recommendationCards.length === 0
                            ? "0 / 0"
                            : `${safeRecommendIndex + 1} / ${recommendationCards.length}`}
                        </span>
                      </span>
                      <ExpandMoreRoundedIcon className="text-slate-300 transition rotate-180" />
                    </button>
                  ) : (
                    // Collapsed: render ONLY a translucent music icon flush to
                    // the right edge. No label, no counter, no chevron — just
                    // a barely-there affordance that the user can tap to open
                    // the full list.
                    <div className="flex w-full justify-end">
                      <button
                        type="button"
                        onClick={onToggleMobileRecommendPanelOpen}
                        aria-label="展開題目清單"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-cyan-200/35 transition hover:text-cyan-200/70 active:scale-95"
                      >
                        <QueueMusicRoundedIcon className="text-[1.05rem]" />
                      </button>
                    </div>
                  )}
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
                                    <div className="min-w-0 flex flex-col items-start">
                                      {card.link?.href ? (
                                        <button
                                          type="button"
                                          className="mq-title-link mq-title-link--list inline-grid max-w-full cursor-pointer text-left text-lg font-black leading-snug text-white underline-offset-4 transition hover:text-cyan-200 hover:underline"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectRecommendation(index);
                                            onOpenCardLink(card);
                                          }}
                                        >
                                          <span className="block truncate">{card.recap.title}</span>
                                        </button>
                                      ) : (
                                        <p className="block w-full truncate text-lg font-black leading-snug text-white">
                                          {card.recap.title}
                                        </p>
                                      )}
                                      {card.link?.authorHref ? (
                                        <a
                                          href={card.link.authorHref}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          data-author-href={card.link.authorHref}
                                          className="mq-author-link mq-author-link--subtle mt-2 block w-fit max-w-full text-sm text-slate-300"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                          }}
                                        >
                                          <span className="block truncate">{card.recap.uploader || "未知作者"}</span>
                                        </a>
                                      ) : (
                                        <p className="mt-2 block w-full truncate text-sm text-slate-300">
                                          {card.recap.uploader || "未知作者"}
                                        </p>
                                      )}
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        <span className="cursor-default rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-100">
                                          {card.hint}
                                        </span>
                                        <span className="cursor-default rounded-full border border-slate-500/55 bg-slate-800/70 px-2.5 py-1 text-[10.5px] font-semibold text-slate-100">
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

                <div
                  ref={recommendationListRef}
                  className="game-settlement-recommend-list-viewport mq-autohide-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1.5"
                >
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
                            <div className="min-w-0 flex flex-col items-start">
                              {card.link?.href ? (
                                <button
                                  type="button"
                                  className="mq-title-link mq-title-link--list inline-grid max-w-full cursor-pointer text-left text-lg font-black leading-snug text-white underline-offset-4 transition hover:text-cyan-200 hover:underline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onSelectRecommendation(index);
                                    onOpenCardLink(card);
                                  }}
                                >
                                  <span className="block truncate">{card.recap.title}</span>
                                </button>
                              ) : (
                                <p className="block w-full truncate text-lg font-black leading-snug text-white">
                                  {card.recap.title}
                                </p>
                              )}
                              {card.link?.authorHref ? (
                                <a
                                  href={card.link.authorHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-author-href={card.link.authorHref}
                                  className="mq-author-link mq-author-link--subtle mt-2 block w-fit max-w-full text-sm text-slate-300"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                  }}
                                >
                                  <span className="block truncate">{card.recap.uploader || "未知作者"}</span>
                                </a>
                              ) : (
                                <p className="mt-2 block w-full truncate text-sm text-slate-300">
                                  {card.recap.uploader || "未知作者"}
                                </p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                <span className="cursor-default rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-100">
                                  {card.hint}
                                </span>
                                <span className="cursor-default rounded-full border border-slate-500/55 bg-slate-800/70 px-2.5 py-1 text-[10.5px] font-semibold text-slate-100">
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

export default React.memo(RecommendGuideSection);
