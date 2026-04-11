import React from "react";
import { IconButton, Drawer } from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";

import type { SettlementTrackLink } from "../../../model/settlementLinks";
import type { RoomParticipant } from "../../../../Room/model/types";
import RoomUiTooltip from "../../../../../shared/ui/RoomUiTooltip";
import PlayerAvatar from "../../../../../shared/ui/playerAvatar/PlayerAvatar";
import useAutoHideScrollbar from "../../../../../shared/hooks/useAutoHideScrollbar";
import type { SettlementQuestionRecap } from "../GameSettlementPanel";
import {
  resolveSongPerformanceSegments,
  type SongPerformanceGrade,
} from "../../lib/settlementUtils";
import {
  DEFAULT_AVATAR_EFFECT_LEVEL_VALUE,
  useSettingsModel,
} from "../../../../Setting/model/settingsContext";
import {
  resolvePreviewEmbedUrl,
} from "./showcasePrimitives";
import MobileDrawerEdgeControls from "./MobileDrawerEdgeControls";

type RecapAnswerResult = "correct" | "wrong" | "unanswered";
type ReviewListFilter = "all" | "correct" | "wrong" | "unanswered";

type SongPerformanceRating = {
  score: number;
  grade: SongPerformanceGrade;
  result: RecapAnswerResult;
  answeredRank: number | null;
  answeredAtMs: number | null;
  correctRate: number;
  answerWindowMs: number;
};

interface RecapAnswerSnapshot {
  choiceIndex: number | null;
  result: RecapAnswerResult;
}

interface ReviewRecapSectionProps {
  isMobileView?: boolean;
  activeCategoryTheme: { drawerClass: string };
  reviewRecapSummary: { correct: number; wrong: number; unanswered: number };
  sortedParticipants: RoomParticipant[];
  meClientId?: string;
  effectiveSelectedReviewParticipantClientId: string | null;
  selectedReviewParticipant: RoomParticipant | null;
  onSelectReviewParticipantClientId: (clientId: string | null) => void;
  reviewContextTransitionKey: string;
  reviewRecaps: SettlementQuestionRecap[];
  selectedRecap: SettlementQuestionRecap | null;
  selectedRecapKey: string | null;
  onSetSelectedRecapKey: (recapKey: string) => void;
  onJumpToRecapPreview: (
    recap: SettlementQuestionRecap,
    source: "click",
  ) => void;
  onNavigateRecapPreview?: (recap: SettlementQuestionRecap) => void;
  resolveParticipantResult: (
    recap: SettlementQuestionRecap,
    participantClientId: string | null,
    meClientId?: string,
  ) => RecapAnswerResult;
  resultMeta: Record<RecapAnswerResult, { label: string; badgeClass: string }>;
  performanceRatingByRecapKey: Map<string, SongPerformanceRating>;
  performanceGradeMeta: Record<
    SongPerformanceGrade,
    { badgeClass: string; detailClass: string }
  >;
  personalFastestCorrectRecapKeys?: Set<string>;
  reviewStatusBadgeBaseClass: string;
  reviewDetailTransitionKey: string;
  selectedRecapLink: SettlementTrackLink | null;
  onOpenTrackLink: (
    link: SettlementTrackLink,
    recap: SettlementQuestionRecap,
  ) => void;
  selectedRecapAnswer: RecapAnswerSnapshot;
  selectedRecapFastestCorrectMeta: {
    clientId: string;
    username: string;
    answeredAtMs: number;
  } | null;
  selectedRecapAverageCorrectMs: number | null;
  formatMs: (value: number | null | undefined) => string;
  selectedRecapRating: SongPerformanceRating | null;
  multilineEllipsis2Style: React.CSSProperties;
  isMobileListOpen: boolean;
  onToggleMobileListOpen: () => void;
  isMobileDetailTopOpen: boolean;
  onToggleMobileDetailTopOpen: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

const resolveMedian = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

const countChoiceVotes = (recap: SettlementQuestionRecap, choiceIndex: number) =>
  Object.values(recap.answersByClientId ?? {}).filter(
    (answer) => answer.choiceIndex === choiceIndex,
  ).length;

const resolveAnswerOrderLabel = (answeredRank: number | null | undefined) => {
  if (typeof answeredRank !== "number" || answeredRank <= 0) return null;
  return `第 ${answeredRank} 答`;
};

const renderParticipantMiniAvatar = (
  participant: RoomParticipant,
  sizeClass: string,
  avatarEffectLevel: "off" | "simple" | "full",
) => {
  const avatarUrl = participant.avatar_url ?? participant.avatarUrl ?? null;
  const size =
    sizeClass === "h-10 w-10" ? 40 : sizeClass === "h-8 w-8" ? 32 : 28;
  return (
    <PlayerAvatar
      username={participant.username}
      clientId={participant.clientId}
      avatarUrl={avatarUrl ?? undefined}
      size={size}
      effectLevel={avatarEffectLevel}
      className={`${sizeClass} player-avatar--review-choice`}
    />
  );
};

const ExtraParticipantsTooltipContent: React.FC<{
  participants: RoomParticipant[];
  avatarEffectLevel: "off" | "simple" | "full";
}> = ({ participants, avatarEffectLevel }) => (
  <div className="min-w-[12rem] space-y-2">
    <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">其餘玩家</div>
    <div className="space-y-1.5">
      {participants.map((p) => (
        <div key={p.clientId} className="flex items-center gap-2 text-sm text-slate-100">
          {renderParticipantMiniAvatar(p, "h-7 w-7", avatarEffectLevel)}
          <span className="truncate">{p.username}</span>
        </div>
      ))}
    </div>
  </div>
);

const renderResultBadgeContent = (result: RecapAnswerResult) => {
  switch (result) {
    case "correct": return <RadioButtonUncheckedRoundedIcon className="text-[0.85rem]" />;
    case "wrong": return <CloseRoundedIcon className="text-[0.85rem]" />;
    default: return <RemoveRoundedIcon className="text-[0.95rem]" />;
  }
};

const REVIEW_BADGE_PILL_CLASS =
  "inline-flex h-7 min-w-[4.25rem] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold";

// ─── marquee helpers (kept identical to original) ─────────────────────────────

const ChoiceMarqueeTitle: React.FC<{
  text: string;
  className?: string;
  disableMarquee?: boolean;
  staticStyle?: React.CSSProperties;
}> = ({ text, className = "", disableMarquee = false, staticStyle }) => {
  const wrapRef = React.useRef<HTMLSpanElement | null>(null);
  const trackRef = React.useRef<HTMLSpanElement | null>(null);
  const [running, setRunning] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    if (disableMarquee) { setRunning(false); setStyle({}); }
  }, [disableMarquee]);

  React.useLayoutEffect(() => {
    if (disableMarquee) return;
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    const measure = () => {
      const overflow = track.scrollWidth - wrap.clientWidth;
      if (overflow > 10) {
        setRunning(true);
        setStyle({
          ["--settlement-title-shift" as const]: `${-(overflow + 26)}px`,
          ["--settlement-title-duration" as const]: `${Math.min(12, Math.max(5.8, overflow / 36)).toFixed(2)}s`,
        } as React.CSSProperties);
      } else { setRunning(false); setStyle({}); }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap); observer.observe(track);
    return () => observer.disconnect();
  }, [disableMarquee, text]);

  if (disableMarquee) {
    return <span className={`block whitespace-normal break-words ${className}`} style={staticStyle}>{text}</span>;
  }
  return (
    <span ref={wrapRef} className={`block overflow-hidden ${className}`}>
      <span ref={trackRef} className={`game-settlement-choice-marquee-track ${running ? "game-settlement-choice-marquee-track--run" : ""}`} style={style}>
        <span>{text}</span>
      </span>
    </span>
  );
};

const RecapTitleMarquee: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  const wrapRef = React.useRef<HTMLSpanElement | null>(null);
  const trackRef = React.useRef<HTMLSpanElement | null>(null);
  const [canMarquee, setCanMarquee] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    const wrap = wrapRef.current; const track = trackRef.current;
    if (!wrap || !track) return;
    const measure = () => {
      const overflow = track.scrollWidth - wrap.clientWidth;
      if (overflow > 10) {
        setCanMarquee(true);
        setStyle({
          ["--settlement-title-shift" as const]: `${-(overflow + 22)}px`,
          ["--settlement-title-duration" as const]: `${Math.min(11.5, Math.max(5.4, overflow / 44)).toFixed(2)}s`,
        } as React.CSSProperties);
      } else { setCanMarquee(false); setStyle({}); }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap); observer.observe(track);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={wrapRef} className={`game-settlement-title-marquee block overflow-hidden ${className}`}>
      <span ref={trackRef} className={`game-settlement-title-marquee-track ${canMarquee ? "game-settlement-title-marquee-track--run" : ""}`} style={style}>
        {text}
      </span>
    </span>
  );
};

// ─── YouTube preview hook (extracted from HistoryReplayCompactView pattern) ──

const PREVIEW_BRIDGE_ID = "settlement-review-preview";
const PREVIEW_VOLUME_KEY = "settlement_review_volume";
const PREVIEW_AUTOPLAY_KEY = "settlement_review_autoplay";

const readStoredVolume = () => {
  if (typeof window === "undefined") return 50;
  const raw = window.localStorage.getItem(PREVIEW_VOLUME_KEY);
  const v = Number(raw);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 50;
};
const readStoredAutoplay = () => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(PREVIEW_AUTOPLAY_KEY);
  return raw === null ? true : raw === "1";
};

function useYouTubePreview(selectedRecapPreviewUrl: string | null) {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [playerState, setPlayerState] = React.useState<"idle" | "playing" | "paused">("idle");
  const [playbackSource, setPlaybackSource] = React.useState<string | null>(null);
  const [volume, setVolume] = React.useState<number>(() => readStoredVolume());
  const [autoplayEnabled, setAutoplayEnabled] = React.useState<boolean>(() => readStoredAutoplay());

  const intentRef = React.useRef<"idle" | "playing" | "paused">("idle");
  const volumeUpdateSourceRef = React.useRef<"app" | "iframe" | null>(null);
  const bridgeTimers = React.useRef<number[]>([]);
  const volumeTimers = React.useRef<number[]>([]);
  const playTimers = React.useRef<number[]>([]);

  const clearTimers = React.useCallback((ref: React.RefObject<number[]>) => {
    ref.current.forEach((id) => window.clearTimeout(id));
    ref.current = [];
  }, []);

  const postCmd = React.useCallback((func: string, args: unknown[] = []) => {
    const cw = iframeRef.current?.contentWindow;
    if (!cw) return;
    cw.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  const registerBridge = React.useCallback(() => {
    const cw = iframeRef.current?.contentWindow;
    if (!cw) return;
    const send = () => cw.postMessage(JSON.stringify({ event: "listening", id: PREVIEW_BRIDGE_ID }), "*");
    send();
    clearTimers(bridgeTimers);
    bridgeTimers.current = [220, 520, 1100].map((d) => window.setTimeout(send, d));
  }, [clearTimers]);

  const syncVolume = React.useCallback(() => {
    const v = Math.max(0, Math.min(100, volume));
    volumeUpdateSourceRef.current = "app";
    const apply = () => {
      postCmd("setVolume", [v]);
      if (v <= 0) postCmd("mute"); else postCmd("unMute");
    };
    clearTimers(volumeTimers);
    apply();
    volumeTimers.current = [140, 360, 760].map((d) => window.setTimeout(apply, d));
  }, [clearTimers, postCmd, volume]);

  const startPlayback = React.useCallback(() => {
    intentRef.current = "playing";
    registerBridge();
    clearTimers(playTimers);
    postCmd("playVideo");
    syncVolume();
    playTimers.current = [180, 420, 920].map((d) =>
      window.setTimeout(() => { postCmd("playVideo"); syncVolume(); }, d),
    );
    setPlaybackSource(selectedRecapPreviewUrl ?? null);
    setPlayerState("playing");
  }, [clearTimers, postCmd, registerBridge, selectedRecapPreviewUrl, syncVolume]);

  const pausePlayback = React.useCallback(() => {
    intentRef.current = "paused";
    clearTimers(playTimers);
    postCmd("pauseVideo");
    setPlayerState("paused");
  }, [clearTimers, postCmd]);

  const handleFrameLoad = React.useCallback(() => {
    registerBridge();
    window.setTimeout(() => {
      syncVolume();
      if (intentRef.current === "playing" || (intentRef.current === "idle" && autoplayEnabled)) {
        startPlayback();
      }
    }, 260);
  }, [autoplayEnabled, registerBridge, startPlayback, syncVolume]);

  // Reset on recap change
  React.useEffect(() => {
    clearTimers(playTimers); clearTimers(volumeTimers); clearTimers(bridgeTimers);
    setPlaybackSource(null);
    if (!selectedRecapPreviewUrl) {
      intentRef.current = "idle";
      setPlayerState("idle");
      return;
    }
    const carried = intentRef.current;
    setPlayerState(carried === "playing" ? "playing" : carried === "paused" ? "paused" : "idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecapPreviewUrl]);

  // Persist volume
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREVIEW_VOLUME_KEY, String(volume));
    if (volumeUpdateSourceRef.current === "iframe") {
      volumeUpdateSourceRef.current = null;
      return;
    }
    syncVolume();
  }, [volume, syncVolume]);

  // Persist autoplay
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREVIEW_AUTOPLAY_KEY, autoplayEnabled ? "1" : "0");
  }, [autoplayEnabled]);

  React.useEffect(() => { intentRef.current = playerState; }, [playerState]);

  // Message listener
  React.useEffect(() => {
    if (typeof window === "undefined" || !selectedRecapPreviewUrl) return;
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin || "";
      if (!origin.includes("youtube.com") && !origin.includes("youtube-nocookie.com")) return;
      const fw = iframeRef.current?.contentWindow;
      if (fw && event.source !== fw) return;
      let payload: unknown = event.data;
      if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch { return; } }
      if (!payload || typeof payload !== "object") return;
      const ev = (payload as { event?: unknown }).event;
      const info = (payload as { info?: unknown }).info;
      const getNum = (v: unknown) => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") { const n = Number(v.trim()); return Number.isFinite(n) ? n : null; }
        return null;
      };
      let state: number | null = null;
      let vol: number | null = null;
      let muted: boolean | null = null;
      if (ev === "onStateChange") {
        state = info && typeof info === "object" && "playerState" in info
          ? getNum((info as { playerState?: unknown }).playerState)
          : getNum(info);
      } else if (ev === "infoDelivery" && info && typeof info === "object") {
        state = "playerState" in info ? getNum((info as { playerState?: unknown }).playerState) : null;
        vol = "volume" in info ? getNum((info as { volume?: unknown }).volume) : null;
        muted = "muted" in info ? Boolean((info as { muted?: unknown }).muted) : null;
      }
      if (vol !== null) {
        const nv = Math.max(0, Math.min(100, Math.round(muted ? 0 : vol)));
        if (volumeUpdateSourceRef.current === "app") {
          if (Math.abs(nv - volume) <= 1) volumeUpdateSourceRef.current = null;
        } else if (Math.abs(nv - volume) >= 1) {
          clearTimers(volumeTimers);
          volumeUpdateSourceRef.current = "iframe";
          setVolume(nv);
        }
      }
      if (state === 1) { clearTimers(playTimers); setPlaybackSource(selectedRecapPreviewUrl); setPlayerState("playing"); }
      else if (state === 2) { setPlaybackSource(selectedRecapPreviewUrl); setPlayerState("paused"); }
      else if ((state === 0 || state === -1) && intentRef.current === "idle") { setPlayerState("idle"); }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecapPreviewUrl, volume]);

  // Cleanup
  React.useEffect(() => () => {
    clearTimers(bridgeTimers); clearTimers(playTimers); clearTimers(volumeTimers);
  }, [clearTimers]);

  const isPlaying = Boolean(selectedRecapPreviewUrl) && playbackSource === selectedRecapPreviewUrl && playerState === "playing";

  return { iframeRef, isPlaying, volume, setVolume, autoplayEnabled, setAutoplayEnabled, startPlayback, pausePlayback, handleFrameLoad, playerState };
}

// ─── collapsible section helper ───────────────────────────────────────────────

const CollapsibleSection: React.FC<{
  label: string;
  defaultOpen?: boolean;
  summary?: React.ReactNode;
  hideSummaryWhenOpen?: boolean;
  children: React.ReactNode;
}> = ({ label, defaultOpen = true, summary, hideSummaryWhenOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  const shouldShowSummary = Boolean(summary) && (!open || !hideSummaryWhenOpen);
  return (
    <div className="rounded-[18px] border border-white/7 bg-black/16 overflow-visible">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-white">{label}</span>
        <ExpandMoreRoundedIcon className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {summary ? (
        <div
          aria-hidden={!shouldShowSummary}
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${shouldShowSummary ? "max-h-[34rem] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="px-4 pb-3">
            {summary}
          </div>
        </div>
      ) : null}
      <div className={`transition-[grid-template-rows,opacity] duration-300 ${open ? "grid grid-rows-[1fr] overflow-visible opacity-100" : "grid grid-rows-[0fr] overflow-hidden opacity-0"}`}>
        <div className={`min-h-0 overflow-visible px-4 transition-[padding] duration-300 ${open ? "pt-3 pb-4" : "pt-0 pb-0"}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── question list item ────────────────────────────────────────────────────────

const RecapListItem: React.FC<{
  recap: SettlementQuestionRecap;
  result: RecapAnswerResult;
  isActive: boolean;
  resultMeta: Record<RecapAnswerResult, { label: string; badgeClass: string }>;
  rating: SongPerformanceRating | null;
  performanceGradeMeta: Record<SongPerformanceGrade, { badgeClass: string; detailClass: string }>;
  onClick: () => void;
}> = ({ recap, result, isActive, resultMeta, rating, performanceGradeMeta, onClick }) => {
  const gradeMeta = rating ? performanceGradeMeta[rating.grade] : null;
  const activeClass =
    result === "correct"
      ? "border-emerald-300/22 bg-[radial-gradient(circle_at_16%_8%,rgba(52,211,153,0.11),transparent_28%),linear-gradient(180deg,rgba(11,29,24,0.66),rgba(10,18,22,0.8))]"
      : result === "wrong"
        ? "border-rose-300/22 bg-[radial-gradient(circle_at_16%_8%,rgba(251,113,133,0.11),transparent_28%),linear-gradient(180deg,rgba(28,15,20,0.68),rgba(13,12,21,0.8))]"
        : "border-slate-300/14 bg-[radial-gradient(circle_at_16%_8%,rgba(148,163,184,0.08),transparent_30%),linear-gradient(180deg,rgba(22,27,39,0.62),rgba(12,16,25,0.78))]";
  const inactiveClass =
    result === "correct"
      ? "border-emerald-300/10 bg-[linear-gradient(180deg,rgba(9,22,19,0.34),rgba(6,10,18,0.72))] hover:border-emerald-300/18"
      : result === "wrong"
        ? "border-rose-300/10 bg-[linear-gradient(180deg,rgba(20,12,18,0.36),rgba(7,10,18,0.72))] hover:border-rose-300/18"
        : "border-slate-700/75 bg-slate-950/55 hover:border-slate-500/80";
  const orderBadgeClass =
    result === "correct"
      ? "border-emerald-300/28 bg-emerald-400/7 text-emerald-100"
      : result === "wrong"
        ? "border-rose-300/28 bg-rose-400/7 text-rose-100"
        : "border-slate-400/24 bg-slate-400/6 text-slate-100";

  return (
    <button
      type="button"
      className={`block w-full cursor-pointer rounded-[22px] border px-4 py-4 text-left transition ${isActive ? activeClass : inactiveClass}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${orderBadgeClass}`}>
          {recap.order}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1rem] font-black leading-snug text-white">{recap.title}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <RoomUiTooltip title={resultMeta[result].label}>
              <span className={`${REVIEW_BADGE_PILL_CLASS} ${resultMeta[result].badgeClass}`} aria-label={resultMeta[result].label}>
                {renderResultBadgeContent(result)}
              </span>
            </RoomUiTooltip>
            {gradeMeta && (
              <span className={`${REVIEW_BADGE_PILL_CLASS} ${gradeMeta.badgeClass}`}>評級 {rating?.grade}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

// ─── YouTube player area ───────────────────────────────────────────────────────

const YouTubePlayerArea: React.FC<{
  recap: SettlementQuestionRecap | null;
  selectedRecapLink: SettlementTrackLink | null;
  onOpenTrackLink: (link: SettlementTrackLink, recap: SettlementQuestionRecap) => void;
  isMobileView?: boolean;
}> = ({ recap, selectedRecapLink, onOpenTrackLink, isMobileView = false }) => {
  const previewUrl = React.useMemo(() => {
    if (!recap || !selectedRecapLink) return null;
    return resolvePreviewEmbedUrl(recap, selectedRecapLink);
  }, [recap, selectedRecapLink]);

  const { iframeRef, isPlaying, volume, setVolume, autoplayEnabled, setAutoplayEnabled, startPlayback, pausePlayback, handleFrameLoad, playerState } =
    useYouTubePreview(previewUrl);

  const [showTapOverlay, setShowTapOverlay] = React.useState(false);
  const shouldShowPauseOverlay = Boolean(previewUrl) && !isPlaying && (showTapOverlay || playerState === "paused");

  React.useEffect(() => {
    if (isPlaying) setShowTapOverlay(false);
  }, [isPlaying]);

  // Preserve pause intent across question switches; playing questions stay unobstructed.
  React.useEffect(() => {
    setShowTapOverlay(playerState === "paused");
  }, [playerState, previewUrl]);

  const volumeFillStyle = React.useMemo<React.CSSProperties>(
    () => ({ width: `${Math.max(0, Math.min(100, volume))}%` }),
    [volume],
  );
  const volumeThumbStyle = React.useMemo<React.CSSProperties>(() => {
    if (volume <= 0) return { left: "0px" };
    if (volume >= 100) return { left: "calc(100% - 18px)" };
    return { left: `calc(${volume}% - 9px)` };
  }, [volume]);

  if (!recap) return null;

  const supportLabel = selectedRecapLink?.href ? "前往 YouTube 支持作者" : null;
  const previewControls = previewUrl ? (
    <div className="flex items-center gap-3 px-1">
      <button
        type="button"
        aria-pressed={autoplayEnabled}
        title={autoplayEnabled ? "關閉自動播放" : "啟用自動播放"}
        onClick={() => {
          setAutoplayEnabled((prev) => {
            const next = !prev;
            if (next && previewUrl) window.setTimeout(startPlayback, 120);
            return next;
          });
        }}
        className={`inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition ${autoplayEnabled
            ? "border-cyan-300/45 bg-cyan-500/14 text-cyan-50"
            : "border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-cyan-300/35"
          }`}
      >
        <PlayCircleOutlineRoundedIcon className="text-[1.15rem]" />
      </button>

      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-100">
        {volume <= 0
          ? <VolumeOffRoundedIcon className="text-[1.1rem]" />
          : <VolumeUpRoundedIcon className="text-[1.1rem]" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="relative h-5">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-800/90" />
          <div
            className="absolute inset-y-0 left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-400/90 via-sky-300/95 to-emerald-300/90"
            style={volumeFillStyle}
          />
          <span
            className="pointer-events-none absolute top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 rounded-full border border-slate-950/55 bg-white shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
            style={volumeThumbStyle}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            aria-label="預覽音量"
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute inset-0 z-20 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
          />
        </div>
      </div>
      <span className="shrink-0 min-w-[34px] text-right text-xs font-semibold tabular-nums text-cyan-100">{volume}%</span>
    </div>
  ) : null;

  return (
    <div className="rounded-[20px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(10,16,28,0.92),rgba(6,10,18,0.98))] p-3">
      {/* title + CTA */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {selectedRecapLink?.href ? (
            <button
              type="button"
              onClick={() => onOpenTrackLink(selectedRecapLink, recap)}
              className="mq-title-link mq-title-link--compact block max-w-full truncate bg-transparent p-0 text-left text-sm font-semibold text-slate-100"
            >
              {recap.title}
            </button>
          ) : (
            <p className="truncate text-sm font-semibold text-slate-100">{recap.title}</p>
          )}
          {recap.uploader ? (
            selectedRecapLink?.authorHref ? (
              <a
                href={selectedRecapLink.authorHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mq-author-link mq-author-link--subtle mt-0.5 block max-w-full truncate text-xs text-slate-400"
              >
                {recap.uploader}
              </a>
            ) : (
              <p className="mt-0.5 truncate text-xs text-slate-400">{recap.uploader}</p>
            )
          ) : null}
        </div>
        {supportLabel && selectedRecapLink?.href ? (
          <button
            type="button"
            onClick={() => onOpenTrackLink(selectedRecapLink, recap)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/18"
          >
            <OpenInNewRoundedIcon className="text-[0.85rem]" />
            {supportLabel}
          </button>
        ) : null}
      </div>

      {isMobileView && previewControls ? (
        <div className="mb-3">{previewControls}</div>
      ) : null}

      {/* 16:9 player — tap top area to pause/resume; native YT controls at bottom untouched */}
      <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-black/45">
        <div className="relative aspect-video w-full">
          {previewUrl ? (
            <>
              <iframe
                key={`${recap.key}:${previewUrl}`}
                ref={iframeRef}
                src={previewUrl}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={`settlement-preview-${recap.key}`}
                onLoad={handleFrameLoad}
              />
              {isPlaying && (
                <button
                  type="button"
                  aria-label="暫停預覽"
                  className="absolute inset-x-0 top-0 bottom-10 cursor-pointer bg-transparent"
                  onClick={() => {
                    pausePlayback();
                    setShowTapOverlay(true);
                  }}
                />
              )}
              {shouldShowPauseOverlay && (
                <button
                  type="button"
                  aria-label="繼續播放預覽"
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-xl bg-black/64 px-5 text-center backdrop-blur-[2px]"
                  onClick={() => {
                    startPlayback();
                    setShowTapOverlay(false);
                  }}
                >
                  <span className="flex max-w-[16rem] flex-col items-center gap-2.5 rounded-[18px] border border-white/14 bg-black/50 px-4 py-4 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.95)]">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/28 bg-white/8">
                      <PlayCircleOutlineRoundedIcon className="text-[2rem] text-white/92" />
                    </span>
                    <span className="text-sm font-black text-white">已暫停</span>
                    <span className="text-xs leading-relaxed text-slate-200/88">
                      如果喜歡該影片請至 YouTube 支持作者
                    </span>
                  </span>
                </button>
              )}
            </>
          ) : recap.thumbnail ? (
            <>
              <img
                src={recap.thumbnail}
                alt={recap.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/22 via-slate-950/48 to-slate-950/82" />
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
                沒有可嵌入的預覽
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
              目前沒有可嵌入的預覽來源
            </div>
          )}
        </div>
      </div>
      {!isMobileView && previewControls ? (
        <div className="mt-3">{previewControls}</div>
      ) : null}
    </div>
  );
};

// ─── main component ────────────────────────────────────────────────────────────

const ReviewRecapSection: React.FC<ReviewRecapSectionProps> = ({
  isMobileView = false,
  reviewRecapSummary,
  sortedParticipants,
  meClientId,
  effectiveSelectedReviewParticipantClientId,
  selectedReviewParticipant,
  onSelectReviewParticipantClientId,
  reviewContextTransitionKey,
  reviewRecaps,
  selectedRecap,
  selectedRecapKey,
  onSetSelectedRecapKey,
  onJumpToRecapPreview,
  onNavigateRecapPreview,
  resolveParticipantResult,
  resultMeta,
  performanceRatingByRecapKey,
  performanceGradeMeta,
  reviewStatusBadgeBaseClass,
  reviewDetailTransitionKey,
  selectedRecapLink,
  onOpenTrackLink,
  selectedRecapAnswer,
  selectedRecapFastestCorrectMeta,
  selectedRecapAverageCorrectMs,
  formatMs,
  selectedRecapRating,
  multilineEllipsis2Style,
}) => {
  const settingsModel = useSettingsModel();
  const avatarEffectLevel = settingsModel.avatarEffectLevel ?? DEFAULT_AVATAR_EFFECT_LEVEL_VALUE;

  const [filter, setFilter] = React.useState<ReviewListFilter>("all");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [expandedChoiceParticipantsKey, setExpandedChoiceParticipantsKey] = React.useState<number | null>(null);
  const detailTopRef = React.useRef<HTMLDivElement | null>(null);
  const mobileDrawerListNodeRef = React.useRef<HTMLDivElement | null>(null);
  const mobileDrawerItemRefs = React.useRef(new Map<string, HTMLDivElement>());
  const mobileDrawerAutoScrollFrameRef = React.useRef<number | null>(null);
  const mobileParticipantStripRef = useAutoHideScrollbar<HTMLDivElement>();
  const desktopParticipantStripRef = useAutoHideScrollbar<HTMLDivElement>();
  const desktopReviewListRef = useAutoHideScrollbar<HTMLDivElement>();
  const mobileDrawerScrollbarRef = useAutoHideScrollbar<HTMLDivElement>();

  const filteredRecaps = React.useMemo(() => {
    if (filter === "all") return reviewRecaps;
    return reviewRecaps.filter((recap) => {
      const result = resolveParticipantResult(recap, effectiveSelectedReviewParticipantClientId, meClientId);
      return result === filter;
    });
  }, [effectiveSelectedReviewParticipantClientId, filter, meClientId, resolveParticipantResult, reviewRecaps]);

  const answers = Object.values(selectedRecap?.answersByClientId ?? {});
  const participantByClientId = React.useMemo(
    () => new Map(sortedParticipants.map((p) => [p.clientId, p])),
    [sortedParticipants],
  );

  const answerWindowMs = selectedRecapRating?.answerWindowMs ?? 15_000;
  const correctTimes = answers
    .filter((a) => a.result === "correct")
    .map((a) => (typeof a.answeredAtMs === "number" && a.answeredAtMs >= 0 ? Math.floor(a.answeredAtMs) : null))
    .filter((v): v is number => v !== null);
  const allResponseTimes = answers.map((a) =>
    typeof a.answeredAtMs === "number" && a.answeredAtMs >= 0 ? Math.floor(a.answeredAtMs) : answerWindowMs,
  );
  const participantCount = Math.max(
    1,
    typeof selectedRecap?.participantCount === "number" && Number.isFinite(selectedRecap.participantCount)
      ? selectedRecap.participantCount
      : answers.length,
  );
  const missingCount = Math.max(0, participantCount - answers.length);
  for (let i = 0; i < missingCount; i++) allResponseTimes.push(answerWindowMs);

  const medianMs = resolveMedian(allResponseTimes) ?? selectedRecapAverageCorrectMs;
  const answeredAtMs = selectedRecapRating?.answeredAtMs ?? null;
  const beatPercent =
    selectedRecapRating?.result === "correct" && answeredAtMs !== null && correctTimes.length > 0
      ? clampPercent((correctTimes.filter((v) => v > answeredAtMs).length / correctTimes.length) * 100)
      : 0;
  const speedDeltaMs =
    answeredAtMs !== null && typeof medianMs === "number" ? medianMs - answeredAtMs : null;

  const scoreSegments = resolveSongPerformanceSegments({
    result: selectedRecapRating?.result ?? "unanswered",
    participantCount: Math.max(1, typeof selectedRecap?.participantCount === "number" ? selectedRecap.participantCount : answers.length),
    correctRate: selectedRecapRating?.correctRate ?? 0,
    answeredAtMs: selectedRecapRating?.answeredAtMs ?? null,
    answeredRank: selectedRecapRating?.answeredRank ?? null,
    answerWindowMs: selectedRecapRating?.answerWindowMs ?? 15_000,
  }).map((s) => ({ label: s.label, max: s.max, value: s.value, color: s.color }));

  const totalSegmentScore = scoreSegments.reduce((sum, s) => sum + s.value, 0);
  const displayScore = selectedRecapRating?.score ?? totalSegmentScore;
  const totalRecapCount = reviewRecapSummary.correct + reviewRecapSummary.wrong + reviewRecapSummary.unanswered;
  const scorePercent = clampPercent(displayScore);
  const isPerfectScore = displayScore >= 100;

  const scoreVisualTone = isPerfectScore
    ? {
      gradeClass: "bg-[linear-gradient(180deg,#fff7d6,#f5b318_58%,#f59e0b)] bg-clip-text text-transparent [text-shadow:0_0_22px_rgba(251,191,36,0.48)]",
      ringGlowClass: "shadow-[0_0_48px_-8px_rgba(34,197,94,0.58)]",
      ringBaseClass: "border border-emerald-300/22 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.12),rgba(10,10,10,0.96))]",
      scoreClass: "text-emerald-100",
      statusGlowClass: "bg-[radial-gradient(circle,rgba(34,197,94,0.7)_0%,rgba(16,185,129,0.26)_42%,transparent_72%)]",
    }
    : selectedRecapAnswer.result === "correct"
      ? {
        gradeClass: "text-emerald-50 [text-shadow:0_0_18px_rgba(16,185,129,0.42)]",
        ringGlowClass: "shadow-[0_0_42px_-12px_rgba(45,212,191,0.48)]",
        ringBaseClass: "border border-emerald-300/16 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.12),rgba(2,6,23,0.96))]",
        scoreClass: "text-emerald-50",
        statusGlowClass: "bg-[radial-gradient(circle,rgba(16,185,129,0.98)_0%,rgba(45,212,191,0.44)_42%,transparent_78%)]",
      }
      : selectedRecapAnswer.result === "wrong"
        ? {
          gradeClass: "text-rose-50 [text-shadow:0_0_18px_rgba(244,63,94,0.4)]",
          ringGlowClass: "shadow-[0_0_42px_-12px_rgba(244,63,94,0.48)]",
          ringBaseClass: "border border-rose-300/16 bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.12),rgba(2,6,23,0.96))]",
          scoreClass: "text-rose-50",
          statusGlowClass: "bg-[radial-gradient(circle,rgba(244,63,94,0.98)_0%,rgba(251,113,133,0.42)_42%,transparent_78%)]",
        }
        : {
          gradeClass: "text-slate-100 [text-shadow:0_0_16px_rgba(148,163,184,0.28)]",
          ringGlowClass: "shadow-[0_0_34px_-16px_rgba(148,163,184,0.38)]",
          ringBaseClass: "border border-slate-300/10 bg-[radial-gradient(circle_at_50%_30%,rgba(148,163,184,0.08),rgba(2,6,23,0.96))]",
          scoreClass: "text-slate-100",
          statusGlowClass: "bg-[radial-gradient(circle,rgba(148,163,184,0.92)_0%,rgba(100,116,139,0.36)_42%,transparent_78%)]",
        };

  const scoreRingGradient =
    displayScore > 0
      ? `conic-gradient(${scoreSegments.filter((s) => s.value > 0).reduce((acc, s) => {
        const start = acc.offset; const end = start + s.value;
        acc.parts.push(`${s.color} ${start}% ${end}%`); acc.offset = end; return acc;
      }, { offset: 0, parts: [] as string[] }).parts.join(", ")}, rgba(255,255,255,0.08) ${scorePercent}% 100%)`
      : "conic-gradient(rgba(255,255,255,0.08) 0 100%)";

  const globalResultTotal =
    (selectedRecap?.correctCount ?? 0) + (selectedRecap?.wrongCount ?? 0) + (selectedRecap?.unansweredCount ?? 0);
  const scoreRankLabel =
    typeof selectedRecapRating?.answeredRank === "number" && selectedRecapRating.answeredRank > 0
      ? `#${selectedRecapRating.answeredRank}`
      : "--";
  const answerOrderLabel = resolveAnswerOrderLabel(selectedRecapRating?.answeredRank);

  const reviewSurfaceClass =
    selectedRecapAnswer.result === "correct"
      ? "rounded-[22px] border border-emerald-300/8 bg-[radial-gradient(circle_at_18%_0%,rgba(52,211,153,0.075),transparent_26%),linear-gradient(180deg,rgba(8,22,19,0.84),rgba(8,13,22,0.95))] p-3"
      : selectedRecapAnswer.result === "wrong"
        ? "rounded-[22px] border border-rose-300/8 bg-[radial-gradient(circle_at_18%_0%,rgba(251,113,133,0.065),transparent_27%),linear-gradient(180deg,rgba(23,13,18,0.84),rgba(8,12,22,0.96))] p-3"
        : "rounded-[22px] border border-slate-300/7 bg-[radial-gradient(circle_at_18%_0%,rgba(148,163,184,0.055),transparent_28%),linear-gradient(180deg,rgba(16,19,29,0.84),rgba(8,12,22,0.96))] p-3";

  const selectedRecapFilteredIndex = selectedRecapKey
    ? filteredRecaps.findIndex((r) => r.key === selectedRecapKey)
    : -1;
  const mobileRecapProgressLabel =
    filteredRecaps.length > 0
      ? `${selectedRecapFilteredIndex >= 0 ? selectedRecapFilteredIndex + 1 : 1}/${filteredRecaps.length}`
      : "0/0";

  React.useEffect(() => { setExpandedChoiceParticipantsKey(null); }, [selectedRecap?.key]);

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
      if (!isMobileView || !drawerOpen || !selectedRecapKey) return;
      const container = mobileDrawerListNodeRef.current;
      const row = mobileDrawerItemRefs.current.get(selectedRecapKey);
      if (!container || !row) return;

      const rowTop = row.offsetTop;
      const rowHeight = row.offsetHeight;
      const containerHeight = container.clientHeight;
      const targetScrollTop = Math.max(0, rowTop - (containerHeight - rowHeight) / 2);

      container.scrollTo({ top: targetScrollTop, behavior });
    },
    [drawerOpen, isMobileView, selectedRecapKey],
  );

  const handleMobileDrawerEntered = React.useCallback(() => {
    scrollMobileDrawerToSelected("auto");
  }, [scrollMobileDrawerToSelected]);

  React.useEffect(() => {
    if (!isMobileView || !drawerOpen) return;

    if (mobileDrawerAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(mobileDrawerAutoScrollFrameRef.current);
    }

    mobileDrawerAutoScrollFrameRef.current = window.requestAnimationFrame(() => {
      mobileDrawerAutoScrollFrameRef.current = window.requestAnimationFrame(() => {
        mobileDrawerAutoScrollFrameRef.current = null;
        scrollMobileDrawerToSelected("auto");
      });
    });

    return () => {
      if (mobileDrawerAutoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(mobileDrawerAutoScrollFrameRef.current);
        mobileDrawerAutoScrollFrameRef.current = null;
      }
    };
  }, [drawerOpen, filteredRecaps, isMobileView, scrollMobileDrawerToSelected, selectedRecapKey]);

  const goToRecapIndex = React.useCallback((nextIndex: number) => {
    const target = filteredRecaps[nextIndex];
    if (!target) return;
    onSetSelectedRecapKey(target.key);
    if (isMobileView) return;
    if (onNavigateRecapPreview) { onNavigateRecapPreview(target); return; }
    onJumpToRecapPreview(target, "click");
  }, [filteredRecaps, isMobileView, onJumpToRecapPreview, onNavigateRecapPreview, onSetSelectedRecapKey]);

  const goPrevRecap = React.useCallback(() => {
    if (!filteredRecaps.length) return;
    const prev = selectedRecapFilteredIndex <= 0 ? filteredRecaps.length - 1 : selectedRecapFilteredIndex - 1;
    goToRecapIndex(prev);
  }, [filteredRecaps.length, goToRecapIndex, selectedRecapFilteredIndex]);

  const goNextRecap = React.useCallback(() => {
    if (!filteredRecaps.length) return;
    const next = selectedRecapFilteredIndex < 0 || selectedRecapFilteredIndex >= filteredRecaps.length - 1 ? 0 : selectedRecapFilteredIndex + 1;
    goToRecapIndex(next);
  }, [filteredRecaps.length, goToRecapIndex, selectedRecapFilteredIndex]);

  const handleRecapCardClick = React.useCallback(
    (recap: SettlementQuestionRecap, fromDrawer = false) => {
      onSetSelectedRecapKey(recap.key);
      if (fromDrawer) {
        setDrawerOpen(false);
        // scroll detail back to top
        window.setTimeout(() => {
          detailTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
      if (isMobileView) return;
      if (onNavigateRecapPreview) { onNavigateRecapPreview(recap); return; }
      onJumpToRecapPreview(recap, "click");
    },
    [isMobileView, onJumpToRecapPreview, onNavigateRecapPreview, onSetSelectedRecapKey],
  );

  // ── shared: question list ──────────────────────────────────────────────────

  const filterBar = (
    <div className="flex flex-wrap items-center gap-1.5">
      {([["all", totalRecapCount], ["correct", reviewRecapSummary.correct], ["wrong", reviewRecapSummary.wrong], ["unanswered", reviewRecapSummary.unanswered]] as [ReviewListFilter, number][]).map(([f, count]) => {
        const icon = f === "all"
          ? <AppsRoundedIcon className="text-[0.92rem]" />
          : f === "correct"
            ? <RadioButtonUncheckedRoundedIcon className="text-[0.82rem]" />
            : f === "wrong"
              ? <CloseRoundedIcon className="text-[0.82rem]" />
              : <RemoveRoundedIcon className="text-[0.82rem]" />;
        const activeClass = f === "all"
          ? "border-sky-300/55 bg-sky-500/16 text-sky-50"
          : f === "correct"
            ? "border-emerald-300/55 bg-emerald-500/16 text-emerald-50"
            : f === "wrong"
              ? "border-rose-300/55 bg-rose-500/16 text-rose-50"
              : "border-slate-300/55 bg-slate-500/16 text-slate-50";
        return (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 transition ${filter === f ? activeClass : "border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}
          >
            {icon}
            <span className="text-[11px] font-semibold">{count}</span>
          </button>
        );
      })}
    </div>
  );

  const questionListItems = (fromDrawer: boolean) => (
    <div className="space-y-3">
      {filteredRecaps.map((recap) => {
        const result = resolveParticipantResult(recap, effectiveSelectedReviewParticipantClientId, meClientId);
        const rating = performanceRatingByRecapKey.get(recap.key) ?? null;
        return (
          <div
            key={recap.key}
            ref={fromDrawer ? registerMobileDrawerItemRef(recap.key) : undefined}
          >
            <RecapListItem
              recap={recap}
              result={result}
              isActive={selectedRecapKey === recap.key}
              resultMeta={resultMeta}
              rating={rating}
              performanceGradeMeta={performanceGradeMeta}
              onClick={() => handleRecapCardClick(recap, fromDrawer)}
            />
          </div>
        );
      })}
      {filteredRecaps.length === 0 && (
        <div className="flex h-20 items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
          沒有符合條件的題目
        </div>
      )}
    </div>
  );

  // ── mobile layout ──────────────────────────────────────────────────────────
  if (isMobileView) {
    const floatingDrawerTrigger = null;
    /* legacy trigger replaced by MobileDrawerEdgeControls
    typeof document !== "undefined"
      ? createPortal(
        <div className="fixed right-0.5 top-[85dvh] z-[1650] flex -translate-y-1/2 justify-end">
          <button
            type="button"
            aria-label="開啟題目清單"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 w-[7rem] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-300/36 bg-[linear-gradient(180deg,rgba(8,20,34,0.9),rgba(4,10,22,0.96))] px-2.5 text-sm font-semibold text-cyan-50 shadow-[0_10px_28px_-18px_rgba(34,211,238,0.72)] backdrop-blur-md transition hover:border-cyan-200/58"
          >
            <QueueMusicRoundedIcon className="shrink-0 text-[1rem]" />
            {filteredRecaps.length > 0 && (
              <span className="inline-flex min-w-[3.5rem] shrink-0 items-center justify-center px-1 text-[10px] font-black leading-none tabular-nums text-cyan-100">
                {mobileRecapProgressLabel}
              </span>
            )}
          </button>
        </div>,
        document.body,
      )
      : null;
    */

    return (
      <>
        <MobileDrawerEdgeControls
          open={drawerOpen}
          progressLabel={mobileRecapProgressLabel}
          openAriaLabel="開啟題目清單"
          closeAriaLabel="關閉題目清單"
          onOpen={() => setDrawerOpen(true)}
          onClose={() => setDrawerOpen(false)}
          openIcon={<QueueMusicRoundedIcon className="shrink-0 text-[1rem]" />}
          closeIcon={<KeyboardDoubleArrowRightRoundedIcon className="text-[1.35rem]" />}
          drawerWidthCss="min(92vw, 360px)"
        />
        <section className={`mt-4 ${reviewSurfaceClass}`}>
          {/* header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HistoryRoundedIcon className="text-amber-100" />
              <h3 className="text-[1.6rem] font-black tracking-tight text-white">題目回顧</h3>
            </div>
          </div>

          {/* participant selector */}
          {sortedParticipants.length > 0 && (
            <div
              ref={mobileParticipantStripRef}
              className="mq-autohide-scrollbar mt-4 overflow-x-auto pb-1"
            >
              <div className="inline-flex min-w-max items-center gap-2">
                {sortedParticipants.map((p, index) => {
                  const isActive = p.clientId === effectiveSelectedReviewParticipantClientId;
                  return (
                    <button key={p.clientId} type="button" onClick={() => onSelectReviewParticipantClientId(p.clientId)}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${isActive ? "bg-sky-500/16 text-sky-50" : "border border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}
                    >
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-current/35 px-1 text-[10px] leading-none">{index + 1}</span>
                      <span className="max-w-[9rem] truncate">{p.username}{p.clientId === meClientId ? "（你）" : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* right-side drawer */}
          <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            TransitionProps={{ onEntered: handleMobileDrawerEntered }}
            PaperProps={{
              className: "!w-[min(92vw,360px)] !bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(4,8,18,0.99))] !border-l !border-slate-700/25",
            }}
            sx={{ zIndex: 1700 }}
          >
            <div className="flex h-full flex-col overflow-hidden">
              {/* drawer header */}
              <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
                <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
                  題目清單
                  {filteredRecaps.length > 0 && (
                    <span className="inline-flex min-w-[3.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-black leading-none tabular-nums text-slate-300">
                      {mobileRecapProgressLabel}
                    </span>
                  )}
                </span>
                <IconButton size="small" onClick={() => setDrawerOpen(false)} className="!text-slate-300">
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </div>

              {/* filter bar inside drawer */}
              <div className="shrink-0 px-4 pb-3 pt-1">
                {filterBar}
              </div>

              {/* scrollable list */}
              <div
                ref={setMobileDrawerListRef}
                className="mq-autohide-scrollbar flex-1 overflow-y-auto px-3 pb-4 pt-1"
              >
                {questionListItems(true)}
              </div>
            </div>
          </Drawer>

          {/* single question detail area */}
          <div ref={detailTopRef} className="mt-4">
            {selectedRecap ? (
              <div
                key={reviewDetailTransitionKey}
                style={{ animation: "settlementSwapIn 240ms ease-out both" }}
              >
                {/* question meta */}
                <div className="relative z-10 flex flex-col gap-4">
                  {/* glow */}
                  <div className="pointer-events-none absolute rounded-br-[6.25rem] rounded-tl-[20px] -left-3 -top-3 h-[11.75rem] w-[13.5rem]">
                    <div className={`absolute rounded-full opacity-70 ${scoreVisualTone.statusGlowClass} -left-[4.4rem] -top-[4.6rem] h-[9.8rem] w-[12.8rem] blur-[58px]`} />
                  </div>

                  <div className="relative flex min-w-0 flex-1 flex-col items-start pr-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      題目 {selectedRecap.order}
                      {selectedReviewParticipant ? ` ・ ${selectedReviewParticipant.username}` : ""}
                      {answerOrderLabel ? ` ・ ${answerOrderLabel}` : ""}
                    </p>
                    <button
                      type="button"
                      className={`mq-title-link mq-title-link--hero mt-3 inline-grid max-w-full place-items-start text-left align-top text-[1.5rem] font-black leading-tight transition ${selectedRecapLink?.href ? "cursor-pointer text-white underline-offset-4 hover:text-cyan-50 hover:underline" : "cursor-default text-white"}`}
                      onClick={() => { if (selectedRecapLink?.href) onOpenTrackLink(selectedRecapLink, selectedRecap); }}
                      disabled={!selectedRecapLink?.href}
                    >
                      <ChoiceMarqueeTitle text={selectedRecap.title} className="w-full text-[1.5rem] font-black leading-tight text-current" />
                    </button>
                    {selectedRecapLink?.authorHref ? (
                      <a href={selectedRecapLink.authorHref} target="_blank" rel="noopener noreferrer" className="mq-author-link mq-author-link--hero mt-2 block max-w-full self-start text-lg text-slate-300">
                        <span className="truncate">{selectedRecap.uploader || "未知作者"}</span>
                      </a>
                    ) : (
                      <p className="mt-2 block max-w-full self-start text-lg text-slate-300">{selectedRecap.uploader || "未知作者"}</p>
                    )}
                  </div>

                  {/* score ring + stats — collapsible on mobile */}
                  <CollapsibleSection
                    label="題目數據"
                    defaultOpen={false}
                    summary={(
                      <div className="flex items-center justify-between gap-4 overflow-visible rounded-[16px] border border-white/5 bg-white/[0.025] px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-500">GRADE</p>
                          <p className={`mt-1 text-[3.2rem] font-black leading-none ${scoreVisualTone.gradeClass}`}>
                            {selectedRecapRating?.grade ?? "E"}
                          </p>
                        </div>
                        <div className="group/score relative isolate flex h-24 w-24 shrink-0 items-center justify-center overflow-visible rounded-full" style={{ background: scoreRingGradient }}>
                          <div className={`pointer-events-none absolute -inset-4 rounded-full opacity-55 blur-[22px] ${scoreVisualTone.statusGlowClass}`} />
                          <div className={`absolute inset-[17px] rounded-full ${scoreVisualTone.ringBaseClass} bg-slate-950/100`} />
                          <div className="relative z-10 flex h-[4.3rem] w-[4.3rem] flex-col items-center justify-center rounded-full bg-slate-950/100">
                            <span className="text-[8px] font-semibold tracking-[0.2em] text-slate-500">SCORE</span>
                            <span className={`mt-0.5 text-[1.55rem] font-black leading-none ${scoreVisualTone.scoreClass}`}>{displayScore}</span>
                            <span className="mt-0.5 text-[8px] font-semibold tracking-[0.16em] text-slate-500">{scoreRankLabel}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[16px] border border-white/6 bg-white/[0.03] px-3 py-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400"><EmojiEventsRoundedIcon className="text-[1rem] text-amber-200" />全場最快</div>
                        <p className="mt-2 text-sm font-black text-white">{selectedRecapFastestCorrectMeta ? selectedRecapFastestCorrectMeta.username : "--"}</p>
                        <p className="mt-1 text-xs text-slate-300">{selectedRecapFastestCorrectMeta ? formatMs(selectedRecapFastestCorrectMeta.answeredAtMs) : "--"}</p>
                      </div>
                      <div className="rounded-[16px] border border-white/6 bg-white/[0.03] px-3 py-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400"><TimerRoundedIcon className="text-[1rem] text-cyan-200" />中位作答</div>
                        <p className="mt-2 text-sm font-black text-white">{typeof medianMs === "number" ? formatMs(medianMs) : "--"}</p>
                      </div>
                      <div className="rounded-[16px] border border-white/6 bg-white/[0.03] px-3 py-3">
                        <div className="text-[11px] tracking-[0.16em] text-slate-400">你的作答</div>
                        <div className="mt-2 text-sm font-black text-white">{answeredAtMs !== null ? formatMs(answeredAtMs) : "--"}</div>
                      </div>
                      <div className="rounded-[16px] border border-white/6 bg-white/[0.03] px-3 py-3">
                        <div className="text-[11px] tracking-[0.16em] text-slate-400">比中位快慢</div>
                        <div className={`mt-2 text-sm font-black ${speedDeltaMs === null ? "text-white" : speedDeltaMs >= 0 ? "text-emerald-100" : "text-rose-100"}`}>
                          {speedDeltaMs === null ? "--" : `${speedDeltaMs >= 0 ? "+" : "-"}${formatMs(Math.abs(speedDeltaMs))}`}
                        </div>
                      </div>
                      <div className="col-span-2 rounded-[16px] border border-white/6 bg-white/[0.03] px-3 py-3">
                        <div className="text-[11px] tracking-[0.16em] text-slate-400">贏過比例</div>
                        <div className="mt-2 text-sm font-black text-white">{beatPercent > 0 ? `${beatPercent}%` : "--"}</div>
                      </div>
                    </div>

                    {/* result bar */}
                    <div className="mt-4 overflow-hidden rounded-[16px]">
                      <div className="flex h-8 w-full overflow-hidden rounded-[16px]">
                        {(selectedRecap.correctCount ?? 0) > 0 && (
                          <div className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))] px-3 text-sm font-black text-emerald-50"
                            style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.correctCount ?? 0) / globalResultTotal) * 100 : 0}%` }}>
                            {selectedRecap.correctCount ?? 0}
                          </div>
                        )}
                        {(selectedRecap.wrongCount ?? 0) > 0 && (
                          <div className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(244,63,94,0.95),rgba(251,113,133,0.92))] px-3 text-sm font-black text-rose-50"
                            style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.wrongCount ?? 0) / globalResultTotal) * 100 : 0}%` }}>
                            {selectedRecap.wrongCount ?? 0}
                          </div>
                        )}
                        {(selectedRecap.unansweredCount ?? 0) > 0 && (
                          <div className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(100,116,139,0.92),rgba(148,163,184,0.88))] px-3 text-sm font-black text-slate-100"
                            style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.unansweredCount ?? 0) / globalResultTotal) * 100 : 0}%` }}>
                            {selectedRecap.unansweredCount ?? 0}
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* choices — collapsible */}
                  <CollapsibleSection
                    label="選項分析"
                    defaultOpen={false}
                    hideSummaryWhenOpen
                    summary={(() => {
                      const myChoiceIdx = selectedRecapAnswer.choiceIndex;
                      const correctIdx = selectedRecap.correctChoiceIndex;
                      const myChoice = myChoiceIdx !== null ? selectedRecap.choices.find((c) => c.index === myChoiceIdx) : null;
                      const correctChoice = selectedRecap.choices.find((c) => c.index === correctIdx);
                      if (!correctChoice) return null;
                      const summaryChoices = [
                        ...(myChoice && myChoice.index !== correctChoice.index ? [myChoice] : []),
                        correctChoice,
                      ];
                      return (
                        <div className="space-y-2.5">
                          {summaryChoices.map((choice) => {
                            const isCorrect = choice.index === correctChoice.index;
                            const isMine = myChoice?.index === choice.index;
                            const pickedCount = countChoiceVotes(selectedRecap, choice.index);
                            const totalAnswers = Math.max(1, Object.keys(selectedRecap.answersByClientId ?? {}).length);
                            const pickedPercent = clampPercent((pickedCount / totalAnswers) * 100);
                            const choiceCardClass = `relative overflow-visible rounded-[22px] px-5 py-4 ${isCorrect ? "border border-emerald-300/34 bg-[linear-gradient(180deg,rgba(6,42,34,0.7),rgba(4,18,20,0.66))]" : isMine ? "border border-rose-300/30 bg-[linear-gradient(180deg,rgba(64,16,28,0.68),rgba(26,10,18,0.62))]" : "bg-black/18"}`;
                            return (
                              <div
                                key={`summary-${selectedRecap.key}-${choice.index}`}
                                className={choiceCardClass}
                              >
                                <div className="space-y-3.5">
                                  <div className="flex flex-col items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1 pr-2">
                                      <ChoiceMarqueeTitle text={choice.title} disableMarquee className="text-[1.02rem] font-semibold text-white leading-[1.38]" staticStyle={multilineEllipsis2Style} />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {isCorrect && <span className={`${reviewStatusBadgeBaseClass} h-6 border-emerald-300/45 bg-emerald-400/15 px-2.5 text-[10px] text-emerald-100`}>正確答案</span>}
                                      {isMine && <span className={`${reviewStatusBadgeBaseClass} h-6 border-rose-300/45 bg-rose-400/18 px-2.5 text-[10px] text-rose-100`}>你的選擇</span>}
                                      <span className="inline-flex h-6 items-center justify-center rounded-full border border-slate-500/65 bg-slate-900/75 px-2.5 text-[10px] font-semibold text-slate-200">{pickedCount} 票</span>
                                      <span className="inline-flex h-6 items-center justify-center rounded-full border border-white/10 bg-black/20 px-2.5 text-[10px] font-semibold text-slate-200">{pickedPercent}%</span>
                                    </div>
                                  </div>
                                  <div className="h-3 w-full overflow-hidden rounded-full bg-black/25">
                                    <div className={`h-full rounded-full ${isCorrect ? "bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))]" : isMine ? "bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(96,165,250,0.95))]" : "bg-[linear-gradient(90deg,rgba(100,116,139,0.9),rgba(148,163,184,0.85))]"}`}
                                      style={{ width: `${pickedPercent}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  >
                    <div className="space-y-3.5">
                      {selectedRecap.choices.map((choice) => {
                        const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                        const isMine = selectedRecapAnswer.choiceIndex === choice.index;
                        const pickedCount = countChoiceVotes(selectedRecap, choice.index);
                        const totalAnswers = Math.max(1, Object.keys(selectedRecap.answersByClientId ?? {}).length);
                        const pickedPercent = clampPercent((pickedCount / totalAnswers) * 100);
                        const pickedParticipants = Object.entries(selectedRecap.answersByClientId ?? {})
                          .filter(([, a]) => a.choiceIndex === choice.index)
                          .sort(([, la], [, ra]) => {
                            const lMs = typeof la.answeredAtMs === "number" ? la.answeredAtMs : Number.MAX_SAFE_INTEGER;
                            const rMs = typeof ra.answeredAtMs === "number" ? ra.answeredAtMs : Number.MAX_SAFE_INTEGER;
                            return lMs !== rMs ? lMs - rMs : 0;
                          })
                          .map(([cid]) => participantByClientId.get(cid))
                          .filter((p): p is RoomParticipant => Boolean(p));
                        const visiblePicked = pickedParticipants.slice(0, 4);
                        const hiddenPicked = pickedParticipants.slice(4);
                        const isExpanded = expandedChoiceParticipantsKey === choice.index;
                        const choiceCardClass = `relative overflow-visible rounded-[22px] px-5 py-4 ${isCorrect ? "border border-emerald-300/34 bg-[linear-gradient(180deg,rgba(6,42,34,0.7),rgba(4,18,20,0.66))]" : isMine ? "border border-rose-300/30 bg-[linear-gradient(180deg,rgba(64,16,28,0.68),rgba(26,10,18,0.62))]" : "bg-black/18"}`;
                        return (
                          <div key={`${selectedRecap.key}-${choice.index}`} className={choiceCardClass}>
                            {pickedParticipants.length > 0 && (
                              <div className="pointer-events-auto absolute right-4 top-0 flex -translate-y-[66%] items-center z-10">
                                {visiblePicked.map((p, idx) => (
                                  <RoomUiTooltip key={`${choice.index}-${p.clientId}`} title={p.username}>
                                    <div className="relative" style={{ marginLeft: idx === 0 ? 0 : -9 }}>
                                      {renderParticipantMiniAvatar(p, "h-8 w-8", avatarEffectLevel)}
                                    </div>
                                  </RoomUiTooltip>
                                ))}
                                {hiddenPicked.length > 0 && (
                                  <RoomUiTooltip title={<ExtraParticipantsTooltipContent participants={hiddenPicked} avatarEffectLevel={avatarEffectLevel} />} placement="top">
                                    <button type="button"
                                      onClick={() => setExpandedChoiceParticipantsKey((c) => c === choice.index ? null : choice.index)}
                                      className="relative ml-2 inline-flex h-8 min-w-[1.9rem] items-center justify-center rounded-full border border-slate-700/38 bg-[linear-gradient(180deg,rgba(24,34,52,0.66),rgba(10,15,28,0.78))] px-2 text-[9px] font-black text-slate-100/92 transition hover:border-slate-500/60"
                                    >
                                      +{hiddenPicked.length}
                                    </button>
                                  </RoomUiTooltip>
                                )}
                              </div>
                            )}
                            <div className="space-y-3.5">
                              <div className="flex flex-col items-start justify-between gap-2">
                                <div className="min-w-0 flex-1 pr-2">
                                  <ChoiceMarqueeTitle text={choice.title} disableMarquee className="text-[1.02rem] font-semibold text-white leading-[1.38]" staticStyle={multilineEllipsis2Style} />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {isCorrect && <span className={`${reviewStatusBadgeBaseClass} h-6 border-emerald-300/45 bg-emerald-400/15 px-2.5 text-[10px] text-emerald-100`}>正確答案</span>}
                                  {isMine && <span className={`${reviewStatusBadgeBaseClass} h-6 border-rose-300/45 bg-rose-400/18 px-2.5 text-[10px] text-rose-100`}>你的選擇</span>}
                                  <span className="inline-flex h-6 items-center justify-center rounded-full border border-slate-500/65 bg-slate-900/75 px-2.5 text-[10px] font-semibold text-slate-200">{pickedCount} 票</span>
                                  <span className="inline-flex h-6 items-center justify-center rounded-full border border-white/10 bg-black/20 px-2.5 text-[10px] font-semibold text-slate-200">{pickedPercent}%</span>
                                </div>
                              </div>
                              <div className="h-3 w-full overflow-hidden rounded-full bg-black/25">
                                <div className={`h-full rounded-full ${isCorrect ? "bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))]" : isMine ? "bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(96,165,250,0.95))]" : "bg-[linear-gradient(90deg,rgba(100,116,139,0.9),rgba(148,163,184,0.85))]"}`}
                                  style={{ width: `${pickedPercent}%` }} />
                              </div>
                              {isExpanded && hiddenPicked.length > 0 && (
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {hiddenPicked.map((p) => (
                                    <div key={`${choice.index}-expanded-${p.clientId}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-2.5 py-1.5 text-xs text-slate-100">
                                      {renderParticipantMiniAvatar(p, "h-7 w-7", avatarEffectLevel)}
                                      <span className="max-w-[9rem] truncate">{p.username}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>

                  {/* prev / next navigation */}
                  {filteredRecaps.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={goPrevRecap}
                        className="flex flex-1 items-center justify-center gap-1 rounded-full border border-slate-600/70 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400">
                        <ChevronLeftRoundedIcon className="text-[1.1rem]" />上一題
                      </button>
                      <span className="shrink-0 rounded-full border border-white/10 bg-black/18 px-4 py-3 text-sm font-semibold tabular-nums text-white">
                        {selectedRecapFilteredIndex >= 0 ? selectedRecapFilteredIndex + 1 : 1} / {filteredRecaps.length}
                      </span>
                      <button type="button" onClick={goNextRecap}
                        className="flex flex-1 items-center justify-center gap-1 rounded-full border border-cyan-300/28 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/44">
                        下一題<ChevronRightRoundedIcon className="text-[1.1rem]" />
                      </button>
                    </div>
                  )}

                  {/* YouTube preview */}
                  <YouTubePlayerArea
                    recap={selectedRecap}
                    selectedRecapLink={selectedRecapLink}
                    onOpenTrackLink={onOpenTrackLink}
                    isMobileView
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[180px] items-center justify-center rounded-[22px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
                點擊題目清單選擇一題後即可查看回顧
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  // ── desktop layout (unchanged from original) ──────────────────────────────
  const reviewSurfaceClassDesktop =
    selectedRecapAnswer.result === "correct"
      ? "rounded-[22px] border border-emerald-300/9 bg-[radial-gradient(circle_at_18%_0%,rgba(52,211,153,0.07),transparent_24%),linear-gradient(180deg,rgba(8,20,21,0.86),rgba(8,13,24,0.97))] p-2.5 lg:p-3"
      : selectedRecapAnswer.result === "wrong"
        ? "rounded-[22px] border border-rose-300/9 bg-[radial-gradient(circle_at_18%_0%,rgba(251,113,133,0.06),transparent_24%),linear-gradient(180deg,rgba(20,13,19,0.85),rgba(8,13,24,0.97))] p-2.5 lg:p-3"
        : "rounded-[22px] border border-slate-300/8 bg-[radial-gradient(circle_at_18%_0%,rgba(148,163,184,0.05),transparent_25%),linear-gradient(180deg,rgba(14,18,29,0.86),rgba(8,13,24,0.97))] p-2.5 lg:p-3";

  return (
    <section className={`mt-4 ${reviewSurfaceClassDesktop}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <HistoryRoundedIcon className="text-amber-100" />
          <h3 className="text-[2rem] font-black tracking-tight text-white">題目回顧</h3>
        </div>
      </div>

      {sortedParticipants.length > 0 && (
        <div
          ref={desktopParticipantStripRef}
          className="mq-autohide-scrollbar mt-4 overflow-x-auto pb-1"
        >
          <div className="inline-flex min-w-max items-center gap-2">
            {sortedParticipants.map((p, index) => {
              const isActive = p.clientId === effectiveSelectedReviewParticipantClientId;
              return (
                <button key={p.clientId} type="button" onClick={() => onSelectReviewParticipantClientId(p.clientId)}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${isActive ? "bg-sky-500/16 text-sky-50 shadow-none" : "border border-slate-600/70 bg-slate-900/68 text-slate-300 hover:border-slate-400"}`}>
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-current/35 px-1 text-[10px] leading-none">{index + 1}</span>
                  <span className="max-w-[9rem] truncate">{p.username}{p.clientId === meClientId ? "（你）" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[304px_minmax(0,1fr)]">
        {/* left: list */}
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-1">
            {filterBar}
          </div>
          <div key={`review-list-${reviewContextTransitionKey}`} className="lg:h-[min(880px,calc(100vh-14rem))]" style={{ animation: "settlementSwapIn 220ms ease-out both" }}>
            <div
              ref={desktopReviewListRef}
              className="mq-autohide-scrollbar h-full overflow-y-auto pr-1.5"
            >
              {questionListItems(false)}
            </div>
          </div>
        </div>

        {/* right: detail */}
        <div className="relative min-h-0 overflow-visible rounded-[28px] bg-[linear-gradient(180deg,rgba(9,15,29,0.94),rgba(8,13,24,0.98))] p-4">
          {selectedRecap ? (
            <div key={reviewDetailTransitionKey} className="relative overflow-visible p-2" style={{ animation: "settlementSwapIn 240ms ease-out both" }}>
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
                <div className="relative flex min-w-0 flex-1 flex-col items-start pr-2">
                  <div className="pointer-events-none absolute overflow-hidden rounded-br-[6.25rem] rounded-tl-[28px] -left-6 -top-6 h-[14rem] w-[18.5rem]">
                    <div className={`absolute rounded-full opacity-70 ${scoreVisualTone.statusGlowClass} -left-[3.8rem] -top-[3.8rem] h-[10.6rem] w-[14.8rem] blur-[64px]`} />
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    題目 {selectedRecap.order}
                    {selectedReviewParticipant ? ` ・ ${selectedReviewParticipant.username}` : ""}
                    {answerOrderLabel ? ` ・ ${answerOrderLabel}` : ""}
                  </p>
                  <button type="button"
                    className={`mq-title-link mq-title-link--hero mt-3 inline-grid max-w-full place-items-start text-left align-top text-[2rem] font-black leading-tight transition ${selectedRecapLink?.href ? "cursor-pointer text-white underline-offset-4 hover:text-cyan-50 hover:underline" : "cursor-default text-white"}`}
                    onClick={() => { if (selectedRecapLink?.href) onOpenTrackLink(selectedRecapLink, selectedRecap); }}
                    disabled={!selectedRecapLink?.href}
                  >
                    <RecapTitleMarquee text={selectedRecap.title} className="w-full text-[2rem] font-black leading-tight text-current" />
                  </button>
                  {selectedRecapLink?.authorHref ? (
                    <a href={selectedRecapLink.authorHref} target="_blank" rel="noopener noreferrer" className="mq-author-link mq-author-link--hero mt-2 block max-w-full self-start text-lg text-slate-300">
                      <span className="truncate">{selectedRecap.uploader || "未知作者"}</span>
                    </a>
                  ) : (
                    <p className="mt-2 block max-w-full self-start text-lg text-slate-300">{selectedRecap.uploader || "未知作者"}</p>
                  )}
                </div>

                <div className="contents">
                  <div className="flex shrink-0 items-center gap-10 pr-3">
                    <div className="flex min-h-[8rem] items-center justify-center">
                      <p className={`text-[4.5rem] font-black leading-[0.88] ${scoreVisualTone.gradeClass}`}>{selectedRecapRating?.grade ?? "E"}</p>
                    </div>
                    <div className="group/score relative isolate overflow-visible px-2 py-1">
                      <div className={`pointer-events-none absolute -inset-6 rounded-full opacity-65 blur-[34px] transition duration-300 ease-out group-hover/score:opacity-100 ${scoreVisualTone.statusGlowClass}`} />
                      <div className={`relative flex h-32 w-32 items-center justify-center rounded-full transition duration-300 ease-out ${scoreVisualTone.ringGlowClass}`} style={{ background: scoreRingGradient }}>
                        <div className="absolute inset-[6px] rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_74%)] opacity-70" />
                        <div className="pointer-events-none absolute inset-[2px] rounded-full bg-[conic-gradient(from_220deg,rgba(255,255,255,0.18),transparent_18%,transparent_72%,rgba(255,255,255,0.12)_86%,transparent)] mix-blend-screen opacity-55" />
                        <div className={`absolute inset-[22px] rounded-full transition duration-300 ease-out ${scoreVisualTone.ringBaseClass} bg-slate-950/100`} />
                        <div className="relative z-10 flex h-[5.7rem] w-[5.7rem] flex-col items-center justify-center rounded-full bg-slate-950/100">
                          <span className="text-[9px] font-semibold tracking-[0.24em] text-slate-400">SCORE</span>
                          <span className={`mt-1 text-[2.1rem] font-black leading-none ${scoreVisualTone.scoreClass}`}>{displayScore}</span>
                          <span className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-slate-500 transition duration-200 group-hover/score:text-cyan-100/70">{scoreRankLabel}</span>
                        </div>
                      </div>
                      <div className="pointer-events-none absolute left-[calc(100%+0.85rem)] top-1/2 z-20 hidden min-w-[12rem] -translate-y-1/2 rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,24,0.96),rgba(3,8,18,0.98))] px-3 py-3 shadow-[0_24px_50px_-26px_rgba(15,23,42,0.9)] opacity-0 transition duration-150 group-hover/score:block group-hover/score:opacity-100 max-lg:hidden">
                        <div className="space-y-2.5">
                          {scoreSegments.filter((s) => s.max > 0).map((s) => (
                            <div key={s.label} className="flex items-center gap-2.5">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full opacity-90" style={{ background: s.color }} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-white">
                                  <span>{s.label}</span>
                                  <span className="text-slate-300">{s.value}/{s.max}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 w-full p-1">
                    <div className="grid gap-4">
                      <div className="grid gap-3 rounded-[18px] border border-white/6 bg-black/18 p-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400"><EmojiEventsRoundedIcon className="text-[1rem] text-amber-200" />全場最快</div>
                          <p className="mt-2 text-sm font-black text-white">{selectedRecapFastestCorrectMeta?.username ?? "--"}</p>
                          <p className="mt-1 text-xs text-slate-300">{selectedRecapFastestCorrectMeta ? formatMs(selectedRecapFastestCorrectMeta.answeredAtMs) : "--"}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400"><TimerRoundedIcon className="text-[1rem] text-cyan-200" />中位作答</div>
                          <p className="mt-2 text-sm font-black text-white">{typeof medianMs === "number" ? formatMs(medianMs) : "--"}</p>
                        </div>
                        <div>
                          <div className="text-[11px] tracking-[0.16em] text-slate-400">你的作答</div>
                          <div className="mt-2 text-sm font-black text-white">{answeredAtMs !== null ? formatMs(answeredAtMs) : "--"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] tracking-[0.16em] text-slate-400">比中位快慢</div>
                          <div className={`mt-2 text-sm font-black ${speedDeltaMs === null ? "text-white" : speedDeltaMs >= 0 ? "text-emerald-100" : "text-rose-100"}`}>
                            {speedDeltaMs === null ? "--" : `${speedDeltaMs >= 0 ? "+" : "-"}${formatMs(Math.abs(speedDeltaMs))}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] tracking-[0.16em] text-slate-400">贏過比例</div>
                          <div className="mt-2 text-sm font-black text-white">{beatPercent > 0 ? `${beatPercent}%` : "--"}</div>
                        </div>
                      </div>

                      <div className="group px-1 pt-1">
                        <div className="overflow-hidden rounded-[16px]">
                          <div className="flex h-8 w-full overflow-hidden rounded-[16px]">
                            {(selectedRecap.correctCount ?? 0) > 0 && (
                              <div className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))] px-3 text-sm font-black text-emerald-50"
                                style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.correctCount ?? 0) / globalResultTotal) * 100 : 0}%` }}>
                                <span className="group-hover:hidden">{selectedRecap.correctCount ?? 0}</span>
                                <span className="hidden group-hover:inline">{globalResultTotal > 0 ? clampPercent(((selectedRecap.correctCount ?? 0) / globalResultTotal) * 100) : 0}%</span>
                              </div>
                            )}
                            {(selectedRecap.wrongCount ?? 0) > 0 && (
                              <div className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(244,63,94,0.95),rgba(251,113,133,0.92))] px-3 text-sm font-black text-rose-50"
                                style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.wrongCount ?? 0) / globalResultTotal) * 100 : 0}%` }}>
                                <span className="group-hover:hidden">{selectedRecap.wrongCount ?? 0}</span>
                                <span className="hidden group-hover:inline">{globalResultTotal > 0 ? clampPercent(((selectedRecap.wrongCount ?? 0) / globalResultTotal) * 100) : 0}%</span>
                              </div>
                            )}
                            {(selectedRecap.unansweredCount ?? 0) > 0 && (
                              <div className="flex items-center justify-center bg-[linear-gradient(90deg,rgba(100,116,139,0.92),rgba(148,163,184,0.88))] px-3 text-sm font-black text-slate-100"
                                style={{ width: `${globalResultTotal > 0 ? ((selectedRecap.unansweredCount ?? 0) / globalResultTotal) * 100 : 0}%` }}>
                                <span className="group-hover:hidden">{selectedRecap.unansweredCount ?? 0}</span>
                                <span className="hidden group-hover:inline">{globalResultTotal > 0 ? clampPercent(((selectedRecap.unansweredCount ?? 0) / globalResultTotal) * 100) : 0}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* choices (desktop) */}
              <div className="mt-6">
                <div className="grid gap-3.5">
                  {selectedRecap.choices.map((choice) => {
                    const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                    const isMine = selectedRecapAnswer.choiceIndex === choice.index;
                    const pickedCount = countChoiceVotes(selectedRecap, choice.index);
                    const totalAnswers = Math.max(1, Object.keys(selectedRecap.answersByClientId ?? {}).length);
                    const pickedPercent = clampPercent((pickedCount / totalAnswers) * 100);
                    const pickedParticipants = Object.entries(selectedRecap.answersByClientId ?? {})
                      .filter(([, a]) => a.choiceIndex === choice.index)
                      .sort(([, la], [, ra]) => {
                        const lMs = typeof la.answeredAtMs === "number" ? la.answeredAtMs : Number.MAX_SAFE_INTEGER;
                        const rMs = typeof ra.answeredAtMs === "number" ? ra.answeredAtMs : Number.MAX_SAFE_INTEGER;
                        return lMs !== rMs ? lMs - rMs : 0;
                      })
                      .map(([cid]) => participantByClientId.get(cid))
                      .filter((p): p is RoomParticipant => Boolean(p));
                    const visiblePicked = pickedParticipants.slice(0, 4);
                    const hiddenPicked = pickedParticipants.slice(4);
                    const isExpanded = expandedChoiceParticipantsKey === choice.index;
                    const choiceCardClass = `relative overflow-visible rounded-[22px] px-5 py-4 ${isCorrect ? "border border-emerald-300/34 bg-[linear-gradient(180deg,rgba(6,42,34,0.7),rgba(4,18,20,0.66))]" : isMine ? "border border-rose-300/30 bg-[linear-gradient(180deg,rgba(64,16,28,0.68),rgba(26,10,18,0.62))]" : "bg-black/18"}`;
                    return (
                      <div key={`${selectedRecap.key}-${choice.index}`} className={choiceCardClass}>
                        {pickedParticipants.length > 0 && (
                          <div className="pointer-events-auto absolute right-5 top-0 z-10 flex -translate-y-[62%] items-center">
                            {visiblePicked.map((p, idx) => (
                              <RoomUiTooltip key={`${choice.index}-${p.clientId}`} title={p.username}>
                                <div className="relative" style={{ marginLeft: idx === 0 ? 0 : -10 }}>
                                  {renderParticipantMiniAvatar(p, "h-10 w-10", avatarEffectLevel)}
                                </div>
                              </RoomUiTooltip>
                            ))}
                            {hiddenPicked.length > 0 && (
                              <RoomUiTooltip title={<ExtraParticipantsTooltipContent participants={hiddenPicked} avatarEffectLevel={avatarEffectLevel} />} placement="top">
                                <button type="button"
                                  onClick={() => setExpandedChoiceParticipantsKey((c) => c === choice.index ? null : choice.index)}
                                  className="relative ml-2 inline-flex h-10 min-w-[2.25rem] items-center justify-center rounded-full border border-slate-700/38 bg-[linear-gradient(180deg,rgba(24,34,52,0.66),rgba(10,15,28,0.78))] px-2 text-[10px] font-black text-slate-100/92 transition hover:border-slate-500/60"
                                >
                                  +{hiddenPicked.length}
                                </button>
                              </RoomUiTooltip>
                            )}
                          </div>
                        )}
                        <div className="space-y-3.5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 pr-2">
                              <ChoiceMarqueeTitle text={choice.title} className="text-[1.02rem] font-semibold text-white leading-relaxed" />
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2 justify-end self-start">
                              {isCorrect && <span className={`${reviewStatusBadgeBaseClass} h-6 border-emerald-300/45 bg-emerald-400/15 px-2.5 text-[10px] text-emerald-100`}>正確答案</span>}
                              {isMine && <span className={`${reviewStatusBadgeBaseClass} h-6 border-rose-300/45 bg-rose-400/18 px-2.5 text-[10px] text-rose-100`}>你的選擇</span>}
                              <span className="inline-flex h-6 items-center justify-center rounded-full border border-slate-500/65 bg-slate-900/75 px-2.5 text-[10px] font-semibold text-slate-200">{pickedCount} 票</span>
                              <span className="inline-flex h-6 items-center justify-center rounded-full border border-white/10 bg-black/20 px-2.5 text-[10px] font-semibold text-slate-200">{pickedPercent}%</span>
                            </div>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-black/25">
                            <div className={`h-full rounded-full ${isCorrect ? "bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(45,212,191,0.95))]" : isMine ? "bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(96,165,250,0.95))]" : "bg-[linear-gradient(90deg,rgba(100,116,139,0.9),rgba(148,163,184,0.85))]"}`}
                              style={{ width: `${pickedPercent}%` }} />
                          </div>
                          {isExpanded && hiddenPicked.length > 0 && (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {hiddenPicked.map((p) => (
                                <div key={`${choice.index}-expanded-${p.clientId}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-2.5 py-1.5 text-xs text-slate-100">
                                  {renderParticipantMiniAvatar(p, "h-7 w-7", avatarEffectLevel)}
                                  <span className="max-w-[9rem] truncate">{p.username}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-slate-700/70 bg-slate-950/55 px-4 text-sm text-slate-400">
              選擇一題後即可查看回顧
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default React.memo(ReviewRecapSection);
