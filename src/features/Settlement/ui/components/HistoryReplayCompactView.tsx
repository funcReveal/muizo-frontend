
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import useMediaQuery from "@mui/material/useMediaQuery";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trackEvent } from "../../../../shared/analytics/track";
import PlayerAvatar from "../../../../shared/ui/playerAvatar/PlayerAvatar";
import {
  resolveSettlementTrackLink,
  type SettlementTrackLink,
} from "../../model/settlementLinks";
import type {
  ChatMessage,
  ResultYoutubeCtaSource,
  RoomParticipant,
  RoomState,
} from "@features/RoomSession";
import {
  resolveTrackableYoutubeVideoId,
  useTrackResultYoutubeCta,
} from "@features/RoomSession";
import type { PlaylistItem } from "@features/PlaylistSource";
import type { SettlementQuestionRecap } from "./GameSettlementPanel";
import {
  resolvePreviewEmbedUrl,
  resolveRecapTrack,
} from "./liveSettlementShowcase/showcasePrimitives";

type ExtendedRecap = SettlementQuestionRecap & {
  provider?: string;
  sourceId?: string | null;
  channelId?: string | null;
  videoId?: string;
  url?: string;
};

type ParticipantResult = "correct" | "wrong" | "unanswered";

interface HistoryReplayCompactViewProps {
  room: RoomState["room"];
  participants: RoomParticipant[];
  messages: ChatMessage[];
  playlistItems?: PlaylistItem[];
  trackOrder?: number[];
  playedQuestionCount: number;
  startedAt?: number;
  endedAt?: number;
  meClientId?: string;
  questionRecaps?: SettlementQuestionRecap[];
  matchId?: string | null;
}

type YoutubeCtaTrackingContext = {
  source: ResultYoutubeCtaSource;
  buttonPlacement: string;
};

const HISTORY_PREVIEW_AUTOPLAY_STORAGE_KEY = "history_preview_autoplay";
const HISTORY_PREVIEW_VOLUME_STORAGE_KEY = "history_preview_volume";
const PREVIEW_OVERLAY_COPY = "如果喜歡這首音樂，別忘了到 YouTube 支持創作者喲！";
const HISTORY_PREVIEW_BRIDGE_ID = "history-replay-preview";

const RESULT_META: Record<
  ParticipantResult,
  {
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    textClassName: string;
    softBgClassName: string;
    barClassName: string;
    dotClassName: string;
  }
> = {
  correct: {
    label: "答對",
    shortLabel: "答對",
    icon: <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />,
    textClassName: "text-emerald-100",
    softBgClassName: "bg-emerald-400/14",
    barClassName: "from-emerald-300 via-emerald-400 to-emerald-500",
    dotClassName: "bg-emerald-300",
  },
  wrong: {
    label: "答錯",
    shortLabel: "答錯",
    icon: <HighlightOffRoundedIcon sx={{ fontSize: 16 }} />,
    textClassName: "text-rose-100",
    softBgClassName: "bg-rose-400/14",
    barClassName: "from-rose-300 via-rose-400 to-rose-500",
    dotClassName: "bg-rose-300",
  },
  unanswered: {
    label: "未作答",
    shortLabel: "未答",
    icon: <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />,
    textClassName: "text-slate-100",
    softBgClassName: "bg-slate-400/14",
    barClassName: "from-slate-400 via-slate-500 to-slate-600",
    dotClassName: "bg-slate-500",
  },
};

const DashboardMiniCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  toneClassName: string;
}> = ({ icon, label, value, toneClassName }) => (
  <div className="rounded-[16px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.66),rgba(7,12,20,0.9))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
    <div className={`inline-flex items-center gap-2 text-[11px] ${toneClassName}`}>
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-1.5 text-lg font-semibold tracking-tight text-slate-50">{value}</div>
  </div>
);

const DashboardDonut: React.FC<{
  value: number;
  total: number;
  label: string;
  grade?: string;
}> = ({ value, total, label, grade }) => {
  const safeTotal = total > 0 ? total : 1;
  const clampedValue = Math.max(0, Math.min(value, safeTotal));
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = clampedValue / safeTotal;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex items-center justify-end gap-4">
      <div className="flex min-w-[96px] flex-col items-center justify-center text-center">
        {grade ? (
          <div className="bg-[linear-gradient(135deg,#f8fafc,#a5f3fc,#f9a8d4)] bg-clip-text text-[1.85rem] font-black italic leading-none tracking-[0.06em] text-transparent drop-shadow-[0_0_12px_rgba(34,211,238,0.18)]">
            {grade}
          </div>
        ) : null}
        <div className="mt-2 bg-[linear-gradient(90deg,#93c5fd,#e2e8f0,#7dd3fc)] bg-clip-text text-[11px] font-semibold uppercase tracking-[0.32em] text-transparent">
          {label}
        </div>
      </div>
      <div className="relative h-[116px] w-[116px] shrink-0">
        <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(51,65,85,0.55)" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="url(#historyReplayDonut)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
          <defs>
            <linearGradient id="historyReplayDonut" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[1.7rem] font-bold leading-none text-slate-50">
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultStackBar: React.FC<{
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
}> = ({ correctCount, wrongCount, unansweredCount }) => {
  const total = Math.max(1, correctCount + wrongCount + unansweredCount);
  const segments = [
    { key: "correct", value: correctCount, className: "from-emerald-300 to-emerald-500" },
    { key: "wrong", value: wrongCount, className: "from-rose-300 to-rose-500" },
    { key: "unanswered", value: unansweredCount, className: "from-slate-400 to-slate-600" },
  ];

  return (
    <div className="overflow-hidden rounded-full bg-slate-800/85">
      <div className="flex h-8 w-full">
        {segments.map((segment) => {
          if (segment.value <= 0) return null;
          const ratio = (segment.value / total) * 100;
          const meta = RESULT_META[segment.key as ParticipantResult];
          return (
            <div
              key={segment.key}
              className={`flex h-full items-center justify-center bg-gradient-to-r ${segment.className} px-2 text-[10px] font-medium text-white`}
              style={{ width: `${ratio}%` }}
              title={`${meta.label} ${segment.value}`}
            >
              {ratio >= 18 ? `${meta.shortLabel} ${segment.value}` : segment.value}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlayerPerspectivePicker: React.FC<{
  rankedParticipants: RoomParticipant[];
  selectedParticipant: RoomParticipant | null;
  meClientId?: string;
  onSelect: (clientId: string) => void;
  minWidthClassName?: string;
}> = ({
  rankedParticipants,
  selectedParticipant,
  meClientId,
  onSelect,
  minWidthClassName = "min-w-[220px]",
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const selectedRank = selectedParticipant
    ? rankedParticipants.findIndex((item) => item.clientId === selectedParticipant.clientId) + 1
    : null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        className={`inline-flex items-center gap-2 rounded-full border border-slate-600/70 bg-slate-900/85 px-2 py-1.5 text-sm text-slate-100 transition hover:border-cyan-300/35 ${minWidthClassName}`}
      >
        <PlayerAvatar
          username={selectedParticipant?.username}
          clientId={selectedParticipant?.clientId}
          avatarUrl={selectedParticipant?.avatar_url ?? selectedParticipant?.avatarUrl ?? undefined}
          rank={selectedRank}
          combo={selectedParticipant?.combo ?? 0}
          isMe={Boolean(meClientId && selectedParticipant?.clientId === meClientId)}
          effectLevel="off"
          size={26}
          stateTone="neutral"
          hideRankMark
        />
        <span className="min-w-0 flex-1 truncate text-left">
          {selectedParticipant
            ? `#${selectedRank ?? "-"} ${selectedParticipant.username}${
                meClientId && selectedParticipant.clientId === meClientId ? "（你）" : ""
              }`
            : "選擇玩家"}
        </span>
        <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18, color: "rgb(148 163 184)" }} />
      </button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 230,
              borderRadius: "16px",
              border: "1px solid rgba(71,85,105,0.7)",
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(7,12,20,0.98))",
              color: "#e2e8f0",
              boxShadow: "0 16px 40px rgba(2,6,23,0.45)",
              overflow: "hidden",
            },
          },
        }}
      >
        {rankedParticipants.map((participant, index) => {
          const isSelected = participant.clientId === selectedParticipant?.clientId;
          const isMe = Boolean(meClientId && participant.clientId === meClientId);
          return (
            <MenuItem
              key={participant.clientId}
              selected={isSelected}
              onClick={() => {
                onSelect(participant.clientId);
                setAnchorEl(null);
              }}
              sx={{
                gap: 1.25,
                py: 1,
                px: 1.25,
                color: "#e2e8f0",
                "&.Mui-selected": {
                  backgroundColor: "rgba(34,211,238,0.14)",
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "rgba(34,211,238,0.18)",
                },
                "&:hover": {
                  backgroundColor: "rgba(30,41,59,0.88)",
                },
              }}
            >
              <PlayerAvatar
                username={participant.username}
                clientId={participant.clientId}
                avatarUrl={participant.avatar_url ?? participant.avatarUrl ?? undefined}
                rank={index + 1}
                combo={participant.combo ?? 0}
                isMe={isMe}
                effectLevel="off"
                size={24}
                stateTone="neutral"
                hideRankMark
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                #{index + 1} {participant.username}
                {isMe ? "（你）" : ""}
              </span>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

const readStoredPreviewVolume = () => {
  if (typeof window === "undefined") return 50;
  const raw = window.localStorage.getItem(HISTORY_PREVIEW_VOLUME_STORAGE_KEY);
  const value = Number(raw);
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value)));
};

const readStoredPreviewAutoplay = () => {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(HISTORY_PREVIEW_AUTOPLAY_STORAGE_KEY);
  if (raw === null) return true;
  return raw === "1";
};

const resolveAccuracyGrade = (percent: number) => {
  if (percent >= 100) return "SS";
  if (percent >= 95) return "S";
  if (percent >= 85) return "A";
  if (percent >= 75) return "B";
  if (percent >= 65) return "C";
  if (percent >= 50) return "D";
  return "E";
};

const formatMs = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "--";
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
};

const normalizeParticipantResult = (value: unknown): ParticipantResult => {
  if (value === "correct" || value === "wrong" || value === "unanswered") {
    return value;
  }
  return "unanswered";
};

const getParticipantAnswer = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
  meClientId?: string,
): {
  choiceIndex: number | null;
  result: ParticipantResult;
  answeredAtMs: number | null;
  scoreGain: number | null;
} => {
  if (!participantClientId) {
    return {
      choiceIndex: null as number | null,
      result: "unanswered" as ParticipantResult,
      answeredAtMs: null,
      scoreGain: null,
    };
  }
  const answer = recap.answersByClientId?.[participantClientId];
  if (answer) {
    return {
      choiceIndex: typeof answer.choiceIndex === "number" ? answer.choiceIndex : null,
      result: normalizeParticipantResult(answer.result),
      answeredAtMs:
        typeof answer.answeredAtMs === "number" && Number.isFinite(answer.answeredAtMs)
          ? answer.answeredAtMs
          : null,
      scoreGain:
        typeof answer.scoreBreakdown?.totalGainPoints === "number" &&
        Number.isFinite(answer.scoreBreakdown.totalGainPoints)
          ? answer.scoreBreakdown.totalGainPoints
          : null,
    };
  }
  if (meClientId && participantClientId === meClientId) {
    const choiceIndex =
      typeof recap.myChoiceIndex === "number" ? recap.myChoiceIndex : null;
    return {
      choiceIndex,
      result:
        choiceIndex === null
          ? "unanswered"
          : choiceIndex === recap.correctChoiceIndex
            ? "correct"
            : "wrong",
      answeredAtMs: null,
      scoreGain: null,
    };
  }
  return {
    choiceIndex: null as number | null,
    result: "unanswered" as ParticipantResult,
    answeredAtMs: null,
    scoreGain: null,
  };
};

const HoverMarqueeText: React.FC<{
  text: string;
  className?: string;
  autoRunOnTouch?: boolean;
}> = ({ text, className = "", autoRunOnTouch = false }) => {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const [canMarquee, setCanMarquee] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [hovered, setHovered] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
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
            Math.max(4.2, overflow / 48),
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

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarsePointer(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  const running = canMarquee && (hovered || (autoRunOnTouch && coarsePointer));

  return (
    <span
      ref={wrapRef}
      className={`game-settlement-title-marquee block overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={text}
    >
      <span
        ref={trackRef}
        className={`game-settlement-title-marquee-track ${
          running ? "game-settlement-title-marquee-track--run" : ""
        }`}
        style={style}
      >
        {text}
      </span>
    </span>
  );
};

const HistoryReplayCompactView: React.FC<HistoryReplayCompactViewProps> = ({
  room,
  participants,
  playlistItems = [],
  trackOrder = [],
  playedQuestionCount,
  meClientId,
  questionRecaps = [],
  matchId,
}) => {
  const isWide = useMediaQuery("(min-width: 640px)");
  const rankedParticipants = useMemo(
    () =>
      participants
        .slice()
        .sort(
          (a, b) => b.score - a.score || (b.correctCount ?? 0) - (a.correctCount ?? 0),
        ),
    [participants],
  );
  const participantMap = useMemo(
    () =>
      Object.fromEntries(
        rankedParticipants.map((participant) => [participant.clientId, participant]),
      ),
    [rankedParticipants],
  );
  const meParticipant = meClientId ? participantMap[meClientId] ?? null : null;
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    meClientId && participantMap[meClientId]
      ? meClientId
      : rankedParticipants[0]?.clientId ?? null,
  );
  const [selectedRecapKey, setSelectedRecapKey] = useState<string | null>(null);
  const [previewAutoplayEnabled, setPreviewAutoplayEnabled] = useState<boolean>(() =>
    readStoredPreviewAutoplay(),
  );
  const [previewVolume, setPreviewVolume] = useState<number>(() => readStoredPreviewVolume());
  const [previewPlayerState, setPreviewPlayerState] = useState<"idle" | "playing" | "paused">(
    "idle",
  );
  const [previewPlaybackSource, setPreviewPlaybackSource] = useState<string | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewPlaybackIntentRef = useRef<"idle" | "playing" | "paused">("idle");
  const previewBridgeRetryTimersRef = useRef<number[]>([]);
  const previewVolumeRetryTimersRef = useRef<number[]>([]);
  const previewPlayRetryTimersRef = useRef<number[]>([]);
  const previewVolumeUpdateSourceRef = useRef<"app" | "iframe" | null>(null);
  const recaps = useMemo<ExtendedRecap[]>(() => {
    if (questionRecaps.length > 0) {
      return questionRecaps.map((recap) => {
        const item = playlistItems[recap.trackIndex];
        return {
          ...(recap as ExtendedRecap),
          provider: (recap as ExtendedRecap).provider ?? item?.provider,
          sourceId: (recap as ExtendedRecap).sourceId ?? item?.sourceId ?? null,
          channelId: (recap as ExtendedRecap).channelId ?? item?.channelId ?? null,
          videoId: (recap as ExtendedRecap).videoId ?? item?.videoId,
          url: (recap as ExtendedRecap).url ?? item?.url,
        };
      });
    }
    return trackOrder.map((trackIndex, index) => {
      const item = playlistItems[trackIndex];
      return {
        key: `fallback:${index}:${trackIndex}`,
        order: index + 1,
        trackIndex,
        title: item?.answerText?.trim() || item?.title?.trim() || `第 ${index + 1} 題`,
        uploader: item?.uploader?.trim() || "未知作者",
        duration: item?.duration ?? null,
        thumbnail: item?.thumbnail ?? null,
        correctChoiceIndex: 0,
        myChoiceIndex: null,
        myResult: "unanswered",
        choices: trackOrder.slice(0, 4).map((choiceTrackIndex, choiceIndex) => {
          const choiceItem = playlistItems[choiceTrackIndex];
          return {
            index: choiceIndex,
            title:
              choiceItem?.answerText?.trim() ||
              choiceItem?.title?.trim() ||
              `選項 ${choiceIndex + 1}`,
            isCorrect: choiceTrackIndex === trackIndex,
            isSelectedByMe: false,
          };
        }),
        participantCount: participants.length,
        answeredCount: 0,
        correctCount: 0,
        wrongCount: 0,
        unansweredCount: participants.length,
      } as ExtendedRecap;
    });
  }, [participants.length, playlistItems, questionRecaps, trackOrder]);

  const resolvedSelectedRecapKey =
    selectedRecapKey && recaps.some((recap) => recap.key === selectedRecapKey)
      ? selectedRecapKey
      : recaps[0]?.key ?? null;
  const selectedRecap = resolvedSelectedRecapKey
    ? recaps.find((recap) => recap.key === resolvedSelectedRecapKey) ?? recaps[0] ?? null
    : null;
  const selectedRecapTrack = useMemo(
    () => (selectedRecap ? resolveRecapTrack(selectedRecap, playlistItems) : null),
    [playlistItems, selectedRecap],
  );
  const resolvedParticipantId =
    selectedParticipantId && participantMap[selectedParticipantId]
      ? selectedParticipantId
      : rankedParticipants[0]?.clientId ?? null;
  const selectedParticipant = resolvedParticipantId
    ? participantMap[resolvedParticipantId] ?? null
    : null;
  const selectedAnswer = useMemo(
    () =>
      selectedRecap
        ? getParticipantAnswer(selectedRecap, resolvedParticipantId, meClientId)
        : {
            choiceIndex: null as number | null,
            result: "unanswered" as ParticipantResult,
            answeredAtMs: null,
            scoreGain: null,
          },
    [meClientId, resolvedParticipantId, selectedRecap],
  );
  const selectedAnswerCorrectRank = useMemo(() => {
    if (!selectedRecap || !resolvedParticipantId) return null;
    const answer = selectedRecap.answersByClientId?.[resolvedParticipantId];
    if (
      !answer ||
      answer.result !== "correct" ||
      typeof answer.answeredAtMs !== "number" ||
      !Number.isFinite(answer.answeredAtMs)
    ) {
      return null;
    }
    const orderedCorrectAnswers = Object.values(selectedRecap.answersByClientId ?? {})
      .filter(
        (entry) =>
          entry.result === "correct" &&
          typeof entry.answeredAtMs === "number" &&
          Number.isFinite(entry.answeredAtMs),
      )
      .sort((a, b) => (a.answeredAtMs ?? Number.POSITIVE_INFINITY) - (b.answeredAtMs ?? Number.POSITIVE_INFINITY));
    const index = orderedCorrectAnswers.findIndex((entry) => entry === answer);
    return index >= 0 ? index + 1 : null;
  }, [resolvedParticipantId, selectedRecap]);
  const selectedAnswerRunningCombo = useMemo(() => {
    if (!resolvedParticipantId || !selectedRecap) return null;
    const orderedRecaps = recaps.slice().sort((a, b) => a.order - b.order);
    let combo = 0;
    for (const recap of orderedRecaps) {
      const answer = getParticipantAnswer(recap, resolvedParticipantId, meClientId);
      combo = answer.result === "correct" ? combo + 1 : 0;
      if (recap.key === selectedRecap.key) {
        return combo;
      }
    }
    return null;
  }, [meClientId, recaps, resolvedParticipantId, selectedRecap]);
  const selectedRecapDistribution = useMemo(() => {
    if (!selectedRecap || !selectedRecap.choices.length) return [];
    const counts = new Map<number, number>();
    selectedRecap.choices.forEach((choice) => counts.set(choice.index, 0));
    if (selectedRecap.answersByClientId) {
      Object.values(selectedRecap.answersByClientId).forEach((answer) => {
        if (typeof answer.choiceIndex !== "number") return;
        counts.set(answer.choiceIndex, (counts.get(answer.choiceIndex) ?? 0) + 1);
      });
    } else if (typeof selectedRecap.myChoiceIndex === "number") {
      counts.set(
        selectedRecap.myChoiceIndex,
        (counts.get(selectedRecap.myChoiceIndex) ?? 0) + 1,
      );
    }
    const maxCount = Math.max(...Array.from(counts.values()), 1);
    return selectedRecap.choices.map((choice) => ({
      choice,
      count: counts.get(choice.index) ?? 0,
      width:
        (counts.get(choice.index) ?? 0) > 0
          ? Math.max(8, Math.round(((counts.get(choice.index) ?? 0) / maxCount) * 100))
          : 0,
    }));
  }, [selectedRecap]);
  const selectedRecapDistributionMap = useMemo(
    () => new Map(selectedRecapDistribution.map((row) => [row.choice.index, row] as const)),
    [selectedRecapDistribution],
  );
  const selectedChoiceAvatarMap = useMemo(() => {
    if (!selectedRecap?.answersByClientId) return new Map<number, RoomParticipant[]>();
    const grouped = new Map<number, { participant: RoomParticipant; answeredAtMs: number | null }[]>();
    Object.entries(selectedRecap.answersByClientId).forEach(([clientId, answer]) => {
      if (typeof answer.choiceIndex !== "number") return;
      const participant = participantMap[clientId];
      if (!participant) return;
      const bucket = grouped.get(answer.choiceIndex) ?? [];
      bucket.push({
        participant,
        answeredAtMs:
          typeof answer.answeredAtMs === "number" && Number.isFinite(answer.answeredAtMs)
            ? answer.answeredAtMs
            : null,
      });
      grouped.set(answer.choiceIndex, bucket);
    });

    return new Map(
      Array.from(grouped.entries()).map(([choiceIndex, rows]) => [
        choiceIndex,
        rows
          .sort(
            (a, b) =>
              (a.answeredAtMs ?? Number.MAX_SAFE_INTEGER) -
              (b.answeredAtMs ?? Number.MAX_SAFE_INTEGER),
          )
          .map((row) => row.participant),
      ]),
    );
  }, [participantMap, selectedRecap]);

  const previewVolumeFillStyle = useMemo<React.CSSProperties>(
    () => ({ width: `${Math.max(0, Math.min(100, previewVolume))}%` }),
    [previewVolume],
  );
  const previewVolumeThumbStyle = useMemo<React.CSSProperties>(() => {
    if (previewVolume <= 0) return { left: "0px" };
    if (previewVolume >= 100) return { left: "calc(100% - 18px)" };
    return { left: `calc(${previewVolume}% - 9px)` };
  }, [previewVolume]);

  const selectedRecapLink = selectedRecap
    ? resolveSettlementTrackLink({
        provider: selectedRecap.provider ?? selectedRecapTrack?.provider,
        sourceId: selectedRecap.sourceId ?? selectedRecapTrack?.sourceId ?? null,
        channelId: selectedRecap.channelId ?? selectedRecapTrack?.channelId ?? undefined,
        videoId: selectedRecap.videoId ?? selectedRecapTrack?.videoId,
        url: selectedRecap.url ?? selectedRecapTrack?.url ?? "",
        title: selectedRecap.title ?? "",
        answerText: selectedRecap.title ?? "",
        uploader: selectedRecap.uploader ?? selectedRecapTrack?.uploader ?? "未知作者",
      })
    : null;
  const selectedRecapPreviewUrl = useMemo(() => {
    if (!selectedRecap || !selectedRecapLink) return null;
    return resolvePreviewEmbedUrl(selectedRecap, selectedRecapLink);
  }, [selectedRecap, selectedRecapLink]);
  const selectedPreviewTitle = selectedRecap?.title?.trim() || "未提供歌名";
  const selectedPreviewMeta = selectedRecap?.uploader?.trim() || "";

  const trackResultYoutubeCta = useTrackResultYoutubeCta();

  const openLink = useCallback(
    (
      link: SettlementTrackLink,
      recap: ExtendedRecap,
      trackingContext: YoutubeCtaTrackingContext = {
        source: "result_review",
        buttonPlacement: "review_open_youtube_button",
      },
    ) => {
      if (!link.href) return;
      trackEvent("settlement_outbound_click", {
        surface: "history",
        provider: link.provider,
        link_type: link.linkType,
        room_id: room.id,
        track_order: recap.order,
        source_id: link.sourceId ?? "",
      });
      if (link.provider === "youtube" || link.provider === "youtube_music") {
        trackResultYoutubeCta({
          roomId: room.id,
          matchId: matchId ?? undefined,
          source: trackingContext.source,
          buttonPlacement: trackingContext.buttonPlacement,
          questionIndex: recap.order,
          videoId: resolveTrackableYoutubeVideoId({
            videoId: recap.videoId,
            sourceId: link.sourceId ?? recap.sourceId,
            href: link.href,
            url: recap.url,
          }),
        });
      }
      window.open(link.href, "_blank", "noopener,noreferrer");
    },
    [matchId, room.id, trackResultYoutubeCta],
  );

  const postYouTubeCommand = useCallback((func: string, args: unknown[] = []) => {
    const contentWindow = previewIframeRef.current?.contentWindow;
    if (!contentWindow) return;
    contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  const clearPreviewBridgeRetryTimers = useCallback(() => {
    previewBridgeRetryTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    previewBridgeRetryTimersRef.current = [];
  }, []);

  const clearPreviewVolumeRetryTimers = useCallback(() => {
    previewVolumeRetryTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    previewVolumeRetryTimersRef.current = [];
  }, []);

  const clearPreviewPlayRetryTimers = useCallback(() => {
    previewPlayRetryTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    previewPlayRetryTimersRef.current = [];
  }, []);

  const registerYouTubeBridge = useCallback(() => {
    const contentWindow = previewIframeRef.current?.contentWindow;
    if (!contentWindow) return;
    const send = () => {
      contentWindow.postMessage(
        JSON.stringify({ event: "listening", id: HISTORY_PREVIEW_BRIDGE_ID }),
        "*",
      );
    };
    send();
    clearPreviewBridgeRetryTimers();
    previewBridgeRetryTimersRef.current = [220, 520, 1100].map((delay) =>
      window.setTimeout(send, delay),
    );
  }, [clearPreviewBridgeRetryTimers]);

  const syncPreviewVolume = useCallback(() => {
    const normalizedVolume = Math.max(0, Math.min(100, previewVolume));
    previewVolumeUpdateSourceRef.current = "app";
    const apply = () => {
      postYouTubeCommand("setVolume", [normalizedVolume]);
      if (normalizedVolume <= 0) {
        postYouTubeCommand("mute");
      } else {
        postYouTubeCommand("unMute");
      }
    };
    clearPreviewVolumeRetryTimers();
    apply();
    previewVolumeRetryTimersRef.current = [140, 360, 760].map((delay) =>
      window.setTimeout(apply, delay),
    );
  }, [clearPreviewVolumeRetryTimers, postYouTubeCommand, previewVolume]);

  const handlePreviewStart = useCallback(() => {
    previewPlaybackIntentRef.current = "playing";
    registerYouTubeBridge();
    clearPreviewPlayRetryTimers();
    postYouTubeCommand("playVideo");
    syncPreviewVolume();
    previewPlayRetryTimersRef.current = [180, 420, 920].map((delay) =>
      window.setTimeout(() => {
        postYouTubeCommand("playVideo");
        syncPreviewVolume();
      }, delay),
    );
    setPreviewPlaybackSource(selectedRecapPreviewUrl ?? null);
    setPreviewPlayerState("playing");
  }, [
    clearPreviewPlayRetryTimers,
    postYouTubeCommand,
    registerYouTubeBridge,
    selectedRecapPreviewUrl,
    syncPreviewVolume,
  ]);

  const handlePreviewFrameLoad = useCallback(() => {
    registerYouTubeBridge();
    window.setTimeout(() => {
      syncPreviewVolume();
      const shouldResumePlayback =
        previewPlaybackIntentRef.current === "playing" ||
        (previewPlaybackIntentRef.current === "idle" && previewAutoplayEnabled);
      if (shouldResumePlayback) handlePreviewStart();
    }, 260);
  }, [
    handlePreviewStart,
    previewAutoplayEnabled,
    registerYouTubeBridge,
    syncPreviewVolume,
  ]);

  const normalizePlayerNumeric = useCallback((value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }, []);

  const readYouTubePlayerSnapshot = useCallback(
    (
      rawData: unknown,
    ): { state: number | null; volume: number | null; muted: boolean | null } => {
      let payload: unknown = rawData;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return { state: null, volume: null, muted: null };
        }
      }
      if (!payload || typeof payload !== "object") {
        return { state: null, volume: null, muted: null };
      }
      const eventValue =
        "event" in payload ? (payload as { event?: unknown }).event : null;
      const infoValue =
        "info" in payload ? (payload as { info?: unknown }).info : null;
      if (eventValue === "onStateChange") {
        return {
          state:
            infoValue &&
            typeof infoValue === "object" &&
            "playerState" in infoValue
              ? normalizePlayerNumeric(
                  (infoValue as { playerState?: unknown }).playerState,
                )
              : normalizePlayerNumeric(infoValue),
          volume: null,
          muted: null,
        };
      }
      if (
        eventValue !== "infoDelivery" ||
        !infoValue ||
        typeof infoValue !== "object"
      ) {
        return { state: null, volume: null, muted: null };
      }
      return {
        state:
          "playerState" in infoValue
            ? normalizePlayerNumeric(
                (infoValue as { playerState?: unknown }).playerState,
              )
            : null,
        volume:
          "volume" in infoValue
            ? normalizePlayerNumeric((infoValue as { volume?: unknown }).volume)
            : null,
        muted:
          "muted" in infoValue
            ? Boolean((infoValue as { muted?: unknown }).muted)
            : null,
      };
    },
    [normalizePlayerNumeric],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HISTORY_PREVIEW_VOLUME_STORAGE_KEY, String(previewVolume));
    if (previewVolumeUpdateSourceRef.current === "iframe") {
      previewVolumeUpdateSourceRef.current = null;
      return;
    }
    syncPreviewVolume();
  }, [previewVolume, syncPreviewVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      HISTORY_PREVIEW_AUTOPLAY_STORAGE_KEY,
      previewAutoplayEnabled ? "1" : "0",
    );
  }, [previewAutoplayEnabled]);

  useEffect(() => {
    previewPlaybackIntentRef.current = previewPlayerState;
  }, [previewPlayerState]);

  const collectionTitle = room.playlist.title?.trim() || room.name || "回放紀錄";
  const meRank =
    meParticipant && meParticipant.clientId
      ? rankedParticipants.findIndex((item) => item.clientId === meParticipant.clientId) + 1
      : 0;
  const meCorrectCount = meParticipant?.correctCount ?? 0;
  const accuracyPercent =
    playedQuestionCount > 0 ? Math.round((meCorrectCount / playedQuestionCount) * 100) : 0;
  const accuracyGrade = resolveAccuracyGrade(accuracyPercent);
  const selectedResultMeta = RESULT_META[selectedAnswer.result];
  const selectedCorrectCount = selectedRecap?.correctCount ?? 0;
  const selectedWrongCount = selectedRecap?.wrongCount ?? 0;
  const selectedUnansweredCount = selectedRecap?.unansweredCount ?? 0;
  const selectedDistributionTotal = Math.max(
    1,
    selectedCorrectCount + selectedWrongCount + selectedUnansweredCount,
  );
  const supportCtaLabel =
    selectedRecapLink?.href
      ? "前往 YouTube 支持作者"
      : null;
  const previewTitleButtonClassName = selectedRecapLink?.href
    ? "mq-title-link mq-title-link--compact cursor-pointer transition"
    : "";
  const previewIsPlaying =
    Boolean(selectedRecapPreviewUrl) &&
    previewPlaybackSource === selectedRecapPreviewUrl &&
    previewPlayerState === "playing";
  React.useEffect(() => {
    clearPreviewPlayRetryTimers();
    clearPreviewVolumeRetryTimers();
    clearPreviewBridgeRetryTimers();
    setPreviewPlaybackSource(null);
    if (!selectedRecapPreviewUrl) {
      previewPlaybackIntentRef.current = "idle";
      setPreviewPlayerState("idle");
      return;
    }
    const carriedState = previewPlaybackIntentRef.current;
    setPreviewPlayerState(
      carriedState === "playing"
        ? "playing"
        : carriedState === "paused"
          ? "paused"
          : "idle",
    );
  }, [
    clearPreviewBridgeRetryTimers,
    clearPreviewPlayRetryTimers,
    clearPreviewVolumeRetryTimers,
    selectedRecap?.key,
    selectedRecapPreviewUrl,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedRecapPreviewUrl) return;
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin || "";
      const trusted =
        origin.includes("youtube.com") || origin.includes("youtube-nocookie.com");
      if (!trusted) return;
      const frameWindow = previewIframeRef.current?.contentWindow;
      if (frameWindow && event.source !== frameWindow) return;
      const snapshot = readYouTubePlayerSnapshot(event.data);
      if (snapshot.volume !== null) {
        const nextVolume = snapshot.muted ? 0 : snapshot.volume;
        const normalizedVolume = Math.max(0, Math.min(100, Math.round(nextVolume)));
        if (previewVolumeUpdateSourceRef.current === "app") {
          if (Math.abs(normalizedVolume - previewVolume) <= 1) {
            previewVolumeUpdateSourceRef.current = null;
          }
        } else if (Math.abs(normalizedVolume - previewVolume) >= 1) {
          clearPreviewVolumeRetryTimers();
          previewVolumeUpdateSourceRef.current = "iframe";
          setPreviewVolume(normalizedVolume);
        }
      }
      if (snapshot.state === 1) {
        clearPreviewPlayRetryTimers();
        setPreviewPlaybackSource(selectedRecapPreviewUrl);
        setPreviewPlayerState("playing");
        return;
      }
      if (snapshot.state === 2) {
        setPreviewPlaybackSource(selectedRecapPreviewUrl);
        setPreviewPlayerState("paused");
        return;
      }
      if (snapshot.state === 0 || snapshot.state === -1) {
        if (previewPlaybackIntentRef.current !== "idle") {
          return;
        }
        setPreviewPlayerState("idle");
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [
    clearPreviewPlayRetryTimers,
    clearPreviewVolumeRetryTimers,
    previewVolume,
    readYouTubePlayerSnapshot,
    selectedRecapPreviewUrl,
  ]);

  useEffect(
    () => () => {
      clearPreviewBridgeRetryTimers();
      clearPreviewPlayRetryTimers();
      clearPreviewVolumeRetryTimers();
    },
    [
      clearPreviewBridgeRetryTimers,
      clearPreviewPlayRetryTimers,
      clearPreviewVolumeRetryTimers,
    ],
  );
  if (isWide) {
    return (
      <div className="space-y-4 overflow-x-hidden">
        <section className="rounded-[24px] border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_24%),linear-gradient(180deg,rgba(8,14,24,0.92),rgba(4,8,16,0.98))] p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,380px)] xl:items-start">
            <div className="min-w-0">
              <div className="min-w-0 flex items-center gap-2.5">
                  <MusicNoteRoundedIcon sx={{ fontSize: 22, color: "rgb(186 230 253)" }} />
                  <p className="truncate text-[1.2rem] font-semibold tracking-tight text-slate-50">
                    {collectionTitle}
                  </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <DashboardMiniCard
                  icon={<EmojiEventsRoundedIcon sx={{ fontSize: 16 }} />}
                  label="名次"
                  value={meRank > 0 ? `${meRank}/${Math.max(1, rankedParticipants.length)}` : "--"}
                  toneClassName="text-amber-100"
                />
                <DashboardMiniCard
                  icon={<BarChartRoundedIcon sx={{ fontSize: 16 }} />}
                  label="分數"
                  value={String(meParticipant?.score ?? "--")}
                  toneClassName="text-emerald-100"
                />
                <DashboardMiniCard
                  icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
                  label="答對"
                  value={`${meCorrectCount}/${playedQuestionCount}`}
                  toneClassName="text-cyan-100"
                />
              </div>
            </div>

            <div className="xl:max-w-[360px]">
              <div className="flex justify-end xl:pt-1">
                <DashboardDonut
                  value={meCorrectCount}
                  total={playedQuestionCount}
                  label="Accuracy"
                  grade={accuracyGrade}
                />
              </div>
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(255px,280px)_minmax(0,1fr)] xl:items-start">
            <aside className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3 xl:w-[280px] xl:self-start">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">題目</p>
                <span className="text-xs text-slate-500">{recaps.length} 題</span>
              </div>
              <div className="mt-3 max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {recaps.map((recap) => {
                  const answer = getParticipantAnswer(recap, resolvedParticipantId, meClientId);
                  const resultMeta = RESULT_META[answer.result];
                  const active = selectedRecap?.key === recap.key;
                  return (
                    <button
                      key={recap.key}
                      type="button"
                      onClick={() => {
                        setSelectedRecapKey(recap.key);
                      }}
                      className={`group relative w-full cursor-pointer overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-amber-300/55 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(15,23,42,0.82))] shadow-[0_18px_30px_-26px_rgba(245,158,11,0.75)]"
                          : "border-slate-700/70 bg-slate-900/55 hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-slate-900/68"
                      }`}
                    >
                      {active ? (
                        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.42)]" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                          <span>Q{recap.order}</span>
                          <span className={`inline-flex items-center gap-1.5 ${resultMeta.textClassName}`}>
                            <span
                              className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${resultMeta.dotClassName} ${
                                active ? "shadow-[0_0_0_4px_rgba(255,255,255,0.04)]" : ""
                              }`}
                            />
                            <span>{resultMeta.shortLabel}</span>
                          </span>
                        </div>
                        <HoverMarqueeText
                          text={recap.title}
                          className="mt-1 min-w-0 max-w-full text-sm font-semibold text-slate-100"
                        />
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          {recap.uploader || "未知作者"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <article className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3 sm:p-4 xl:self-start">
              {selectedRecap ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex flex-col items-start">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        第 {selectedRecap.order} 題
                      </p>
                      {selectedRecapLink?.href ? (
                        <button
                          type="button"
                          onClick={() => openLink(selectedRecapLink, selectedRecap)}
                          className="mq-title-link mq-title-link--hero group mt-2 inline-grid max-w-full cursor-pointer text-left text-slate-100"
                        >
                          <HoverMarqueeText
                            text={selectedRecap.title}
                            className="w-full text-base font-semibold leading-tight text-current sm:text-lg"
                          />
                        </button>
                      ) : (
                        <HoverMarqueeText
                          text={selectedRecap.title}
                          className="mt-2 w-full text-base font-semibold leading-tight text-slate-100 sm:text-lg"
                        />
                      )}
                      {selectedRecapLink?.authorHref ? (
                        <a
                          href={selectedRecapLink.authorHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-author-href={selectedRecapLink.authorHref}
                          className="mq-author-link mq-author-link--subtle mt-1 block w-fit max-w-full text-sm text-slate-400"
                        >
                          <span className="truncate">{selectedRecap.uploader || "未知作者"}</span>
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-slate-400">{selectedRecap.uploader || "未知作者"}</p>
                      )}
                    </div>
                      <div className="flex flex-col items-end gap-2">
                        <PlayerPerspectivePicker
                          rankedParticipants={rankedParticipants}
                          selectedParticipant={selectedParticipant}
                          meClientId={meClientId}
                          onSelect={setSelectedParticipantId}
                        />
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedResultMeta.textClassName} ${selectedResultMeta.softBgClassName}`}>
                          {selectedResultMeta.icon}
                          {selectedResultMeta.shortLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <DashboardMiniCard
                        icon={<TimerRoundedIcon sx={{ fontSize: 16 }} />}
                        label="答題時間"
                        value={formatMs(selectedAnswer.answeredAtMs)}
                        toneClassName="text-emerald-100"
                      />
                      <DashboardMiniCard
                        icon={<EmojiEventsRoundedIcon sx={{ fontSize: 16 }} />}
                        label="第幾答"
                        value={selectedAnswerCorrectRank ? `#${selectedAnswerCorrectRank}` : "--"}
                        toneClassName="text-sky-100"
                      />
                      <DashboardMiniCard
                        icon={<BoltRoundedIcon sx={{ fontSize: 16 }} />}
                        label="當時 Combo"
                        value={selectedAnswerRunningCombo !== null ? `x${selectedAnswerRunningCombo}` : "--"}
                        toneClassName="text-fuchsia-100"
                      />
                      <DashboardMiniCard
                        icon={<BarChartRoundedIcon sx={{ fontSize: 16 }} />}
                        label="本題得分"
                        value={
                          selectedAnswer.scoreGain !== null
                            ? `${selectedAnswer.scoreGain > 0 ? "+" : ""}${selectedAnswer.scoreGain}`
                            : "--"
                        }
                        toneClassName="text-amber-100"
                      />
                    </div>

                    <div className="rounded-[22px] border border-slate-700/75 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(7,12,20,0.92))] px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                            本題統計
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <ResultStackBar
                          correctCount={selectedCorrectCount}
                          wrongCount={selectedWrongCount}
                          unansweredCount={selectedUnansweredCount}
                        />
                      </div>
                    </div>

                    {selectedRecap.choices.length > 0 ? (
                      <div className="rounded-2xl border border-slate-700/75 bg-slate-900/55 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                              題目選項與分布
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2.5">
                          {selectedRecap.choices.map((choice) => {
                            const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                            const isSelected = selectedAnswer.choiceIndex === choice.index;
                            const row = selectedRecapDistributionMap.get(choice.index);
                            const choiceParticipants = selectedChoiceAvatarMap.get(choice.index) ?? [];
                            const count = row?.count ?? 0;
                            const width = row?.width ?? 0;
                            return (
                              <div
                                key={`${selectedRecap.key}-${choice.index}`}
                                className={`relative overflow-visible rounded-[18px] border px-3 py-3 ${
                                  isCorrect
                                    ? "border-emerald-300/35 bg-emerald-500/10"
                                    : isSelected
                                      ? "border-sky-300/35 bg-sky-500/10"
                                      : "border-slate-700/70 bg-slate-900/45"
                                }`}
                              >
                                {choiceParticipants.length > 0 ? (
                                  <div className="absolute right-3 -top-[15px] z-10 inline-flex items-center opacity-80">
                                    {choiceParticipants.slice(0, 5).map((participant, avatarIndex) => (
                                      <PlayerAvatar
                                        key={`${choice.index}-${participant.clientId}`}
                                        username={participant.username}
                                        clientId={participant.clientId}
                                        avatarUrl={participant.avatar_url ?? participant.avatarUrl ?? undefined}
                                        rank={rankedParticipants.findIndex((item) => item.clientId === participant.clientId) + 1}
                                        combo={participant.combo ?? 0}
                                        isMe={Boolean(meClientId && participant.clientId === meClientId)}
                                        effectLevel="off"
                                        size={24}
                                        stateTone={
                                          participant.clientId === resolvedParticipantId
                                            ? "neutral"
                                            : "neutral"
                                        }
                                        hideRankMark
                                        className={avatarIndex > 0 ? "-ml-1.5" : ""}
                                      />
                                    ))}
                                    {choiceParticipants.length > 5 ? (
                                      <span className="-ml-1.5 inline-flex h-6 items-center rounded-full border border-white/8 bg-slate-900/85 px-2 text-[10px] font-semibold text-slate-200">
                                        +{choiceParticipants.length - 5}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-start gap-2">
                                      <HoverMarqueeText
                                        text={choice.title}
                                        className="min-w-0 max-w-full flex-1 text-sm font-medium text-slate-100"
                                      />
                                      <div className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold">
                                        {isCorrect ? (
                                          <span className="inline-flex items-center gap-1 text-emerald-100">
                                            <CheckCircleRoundedIcon sx={{ fontSize: 13 }} />
                                            正解
                                          </span>
                                        ) : null}
                                        {isSelected ? (
                                          <span className="inline-flex items-center gap-1 text-sky-100">
                                            <RadioButtonCheckedRoundedIcon sx={{ fontSize: 13 }} />
                                            你的選項
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="relative mt-3 h-8 overflow-hidden rounded-full bg-slate-800/85">
                                      {count > 0 ? (
                                        <div
                                          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${
                                            isCorrect
                                              ? "from-emerald-300 to-emerald-500"
                                              : isSelected
                                                ? "from-sky-300 to-sky-500"
                                                : "from-slate-500 to-slate-400"
                                          }`}
                                          style={{ width: `${width}%` }}
                                        />
                                      ) : null}
                                      <div className="absolute inset-0 flex items-center justify-center px-3 text-[10px] font-medium text-slate-100">
                                        {count} 人 · {selectedDistributionTotal > 0
                                          ? `${Math.round((count / selectedDistributionTotal) * 100)}%`
                                          : "0%"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-slate-700/75 bg-[linear-gradient(180deg,rgba(10,16,28,0.92),rgba(6,10,18,0.98))] p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="min-w-0">
                            {selectedRecapLink?.href ? (
                              <button
                                type="button"
                                onClick={() => openLink(selectedRecapLink, selectedRecap)}
                                className={`block min-w-0 max-w-full bg-transparent p-0 text-left text-sm font-semibold text-slate-100 ${previewTitleButtonClassName}`}
                                title={selectedPreviewTitle}
                              >
                                <HoverMarqueeText
                                  text={selectedPreviewTitle}
                                  className="min-w-0 max-w-full"
                                />
                              </button>
                            ) : (
                              <HoverMarqueeText
                                text={selectedPreviewTitle}
                                className="min-w-0 max-w-full text-sm font-semibold text-slate-100"
                              />
                            )}
                            {selectedPreviewMeta ? (
                              selectedRecapLink?.authorHref ? (
                                <a
                                  href={selectedRecapLink.authorHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-author-href={selectedRecapLink.authorHref}
                                  className="mq-author-link mq-author-link--subtle mt-1 block w-fit max-w-full truncate text-[11px] text-slate-400"
                                >
                                  {selectedPreviewMeta}
                                </a>
                              ) : (
                                <p className="mt-1 truncate text-[11px] text-slate-400">
                                  {selectedPreviewMeta}
                                </p>
                              )
                            ) : null}
                          </div>
                        </div>
                        {selectedRecapLink?.href && supportCtaLabel ? (
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:border-rose-200/55 hover:bg-rose-500/16 hover:text-white"
                            onClick={() => openLink(selectedRecapLink, selectedRecap)}
                          >
                            <OpenInNewRoundedIcon className="text-[0.95rem]" />
                            {supportCtaLabel}
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/80 bg-black/45">
                        <div className="relative aspect-[16/8.4] w-full">
                          {selectedRecapPreviewUrl ? (
                            <>
                              <iframe
                                key={`${selectedRecap.key}:${selectedRecapPreviewUrl}`}
                                ref={previewIframeRef}
                                src={selectedRecapPreviewUrl}
                                className="absolute inset-0 h-full w-full"
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                                title={`history-preview-${selectedRecap.key}`}
                                onLoad={handlePreviewFrameLoad}
                              />
                              {!previewIsPlaying ? (
                                <button
                                  type="button"
                                  className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-gradient-to-b from-slate-950/28 via-slate-950/58 to-slate-950/84 px-4 text-center transition hover:from-slate-950/18 hover:via-slate-950/50 hover:to-slate-950/80"
                                  onClick={handlePreviewStart}
                                >
                                  <span className="max-w-[30rem]">
                                    <span className="block text-sm font-semibold text-slate-100">
                                      {PREVIEW_OVERLAY_COPY}
                                    </span>
                                  </span>
                                </button>
                              ) : null}
                            </>
                          ) : selectedRecap.thumbnail ? (
                            <>
                              <img
                                src={selectedRecap.thumbnail}
                                alt={selectedRecap.title}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/22 via-slate-950/48 to-slate-950/82" />
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-400">
                              目前沒有可嵌入的預覽來源
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedRecapPreviewUrl ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                          <button
                            type="button"
                            aria-pressed={previewAutoplayEnabled}
                            aria-label={previewAutoplayEnabled ? "關閉自動播放" : "啟用自動播放"}
                            title={previewAutoplayEnabled ? "關閉自動播放" : "啟用自動播放"}
                            onClick={() => {
                              setPreviewAutoplayEnabled((prev) => {
                                const next = !prev;
                                if (next && selectedRecapPreviewUrl) {
                                  window.setTimeout(handlePreviewStart, 120);
                                }
                                return next;
                              });
                            }}
                            className={`group inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border transition ${
                              previewAutoplayEnabled
                                ? "border-cyan-300/45 bg-cyan-500/14 text-cyan-50"
                                : "border-slate-700/70 bg-slate-900/60 text-slate-200 hover:border-cyan-300/35 hover:bg-slate-900/78 hover:text-white"
                            }`}
                          >
                            <PlayCircleOutlineRoundedIcon className="text-[1.2rem]" />
                          </button>

                          <div className="flex min-w-[240px] flex-1 items-center gap-3 px-3 py-2.5">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-slate-100">
                              {previewVolume <= 0 ? (
                                <VolumeOffRoundedIcon className="text-[1.15rem]" />
                              ) : (
                                <VolumeUpRoundedIcon className="text-[1.15rem]" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="relative h-5">
                                <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-800/90" />
                                <div
                                  className="absolute inset-y-0 left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-400/90 via-sky-300/95 to-emerald-300/90 shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                                  style={previewVolumeFillStyle}
                                />
                                <span
                                  className="pointer-events-none absolute top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 rounded-full border border-slate-950/55 bg-white shadow-[0_0_0_4px_rgba(34,211,238,0.12),0_8px_20px_rgba(15,23,42,0.45)]"
                                  style={previewVolumeThumbStyle}
                                />
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={previewVolume}
                                  aria-label="歷史回放預覽音量"
                                  title="調整預覽音量"
                                  onChange={(event) => {
                                    setPreviewVolume(Number(event.target.value));
                                  }}
                                  className="absolute inset-0 z-20 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
                                />
                              </div>
                            </div>
                            <span className="shrink-0 min-w-[34px] px-2.5 py-0.5 text-right text-xs font-semibold tabular-nums text-cyan-100">
                              {previewVolume}%
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/45 px-4 text-sm text-slate-400">
                  請先從左側選擇要查看的題目。
                </div>
              )}
            </article>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-x-hidden sm:space-y-4">
      <section className="rounded-[20px] border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_24%),linear-gradient(180deg,rgba(8,14,24,0.94),rgba(4,8,16,0.98))] p-3 sm:rounded-[24px] sm:p-4">
        <div className="min-w-0 flex items-center gap-2.5">
          <div className="min-w-0 flex items-center gap-2.5">
            <MusicNoteRoundedIcon sx={{ fontSize: 20, color: "rgb(186 230 253)" }} />
            <HoverMarqueeText
              text={collectionTitle}
              className="w-full text-[1.3rem] font-semibold leading-tight text-slate-100 sm:text-[1.7rem]"
              autoRunOnTouch
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="grid grid-cols-3 gap-2">
            <DashboardMiniCard
              icon={<EmojiEventsRoundedIcon sx={{ fontSize: 15 }} />}
              label="名次"
              value={meRank > 0 ? `${meRank}/${Math.max(1, rankedParticipants.length)}` : "--"}
              toneClassName="text-amber-100"
            />
            <DashboardMiniCard
              icon={<BarChartRoundedIcon sx={{ fontSize: 15 }} />}
              label="分數"
              value={String(meParticipant?.score ?? "--")}
              toneClassName="text-emerald-100"
            />
            <DashboardMiniCard
              icon={<CheckCircleRoundedIcon sx={{ fontSize: 15 }} />}
              label="答對"
              value={`${meCorrectCount}/${playedQuestionCount}`}
              toneClassName="text-cyan-100"
            />
          </div>
          <div className="justify-self-end">
            <DashboardDonut
              value={meCorrectCount}
              total={playedQuestionCount}
              label="Accuracy"
              grade={accuracyGrade}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-slate-700/70 bg-slate-950/55 p-3 sm:rounded-[24px] sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">題目列表</p>
          </div>
          <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-200">
            {recaps.length} 題
          </span>
        </div>
        <div className="mt-3 max-h-[222px] space-y-2 overflow-y-auto pr-1 sm:max-h-[280px]">
          {recaps.map((recap) => {
            const answer = getParticipantAnswer(recap, resolvedParticipantId, meClientId);
            const resultMeta = RESULT_META[answer.result];
            const active = selectedRecap?.key === recap.key;
            return (
              <button
                key={recap.key}
                type="button"
                onClick={() => {
                  setSelectedRecapKey(recap.key);
                }}
                className={`group relative w-full cursor-pointer overflow-hidden rounded-[18px] border px-3 py-3 text-left transition ${
                  active
                    ? "border-amber-300/48 bg-amber-500/10 shadow-[0_18px_30px_-26px_rgba(245,158,11,0.75)]"
                    : "border-slate-700/70 bg-slate-900/55 hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-slate-900/68"
                }`}
              >
                {active ? (
                  <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.42)]" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Q{recap.order}</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] ${resultMeta.textClassName}`}>
                      <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${resultMeta.dotClassName}`} />
                      <span>{resultMeta.shortLabel}</span>
                    </span>
                  </div>
                  <HoverMarqueeText
                    text={recap.title}
                    className="mt-1 min-w-0 max-w-full text-sm font-semibold text-slate-100"
                    autoRunOnTouch
                  />
                  <p className="mt-1 truncate text-[11px] text-slate-400">
                    {recap.uploader || "未知作者"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <article className="rounded-[20px] border border-slate-700/70 bg-slate-950/55 p-3 sm:rounded-[24px] sm:p-4">
        {selectedRecap ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
              <span className="rounded-full border border-sky-300/28 bg-sky-500/10 px-2.5 py-1 text-sky-100">第 {selectedRecap.order} 題</span>
              <span className="rounded-full border border-emerald-300/28 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">答對 {selectedRecap.correctCount ?? 0}</span>
              <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2.5 py-1 text-slate-100">選項 {selectedRecap.choices.length}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-2.5">
              {selectedRecapLink?.href ? (
                <button
                  type="button"
                  onClick={() => openLink(selectedRecapLink, selectedRecap)}
                  className="mq-title-link mq-title-link--hero group inline-grid max-w-full cursor-pointer text-left text-slate-100"
                >
                  <HoverMarqueeText
                    text={selectedRecap.title}
                    className="w-full text-[1.35rem] font-semibold leading-tight text-current sm:text-[1.55rem]"
                    autoRunOnTouch
                  />
                </button>
              ) : (
                <HoverMarqueeText
                  text={selectedRecap.title}
                  className="w-full text-[1.35rem] font-semibold leading-tight text-slate-100 sm:text-[1.55rem]"
                  autoRunOnTouch
                />
              )}
              {selectedRecapLink?.authorHref ? (
                <a
                  href={selectedRecapLink.authorHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-author-href={selectedRecapLink.authorHref}
                  className="mq-author-link mq-author-link--subtle mt-1 block w-fit max-w-full text-sm text-slate-400"
                >
                  <span className="truncate">{selectedRecap.uploader || "未知作者"}</span>
                </a>
              ) : (
                <p className="text-sm text-slate-400">{selectedRecap.uploader || "未知作者"}</p>
              )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <PlayerPerspectivePicker
                  rankedParticipants={rankedParticipants}
                  selectedParticipant={selectedParticipant}
                  meClientId={meClientId}
                  onSelect={setSelectedParticipantId}
                  minWidthClassName="min-w-[168px]"
                />
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedResultMeta.textClassName} ${selectedResultMeta.softBgClassName}`}>
                  {selectedResultMeta.icon}
                  {selectedResultMeta.shortLabel}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <DashboardMiniCard
                icon={<TimerRoundedIcon sx={{ fontSize: 15 }} />}
                label="答題時間"
                value={formatMs(selectedAnswer.answeredAtMs)}
                toneClassName="text-emerald-100"
              />
              <DashboardMiniCard
                icon={<EmojiEventsRoundedIcon sx={{ fontSize: 15 }} />}
                label="第幾答"
                value={selectedAnswerCorrectRank ? `#${selectedAnswerCorrectRank}` : "--"}
                toneClassName="text-sky-100"
              />
              <DashboardMiniCard
                icon={<BoltRoundedIcon sx={{ fontSize: 15 }} />}
                label="當時 Combo"
                value={selectedAnswerRunningCombo !== null ? `x${selectedAnswerRunningCombo}` : "--"}
                toneClassName="text-fuchsia-100"
              />
              <DashboardMiniCard
                icon={<BarChartRoundedIcon sx={{ fontSize: 15 }} />}
                label="本題得分"
                value={
                  selectedAnswer.scoreGain !== null
                    ? `${selectedAnswer.scoreGain > 0 ? "+" : ""}${selectedAnswer.scoreGain}`
                    : "--"
                }
                toneClassName="text-amber-100"
              />
            </div>

            <div className="mt-4 rounded-[20px] border border-slate-700/75 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(7,12,20,0.92))] p-3">
              <div className="flex items-start gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">本題統計</p>
                </div>
              </div>
              <div className="mt-4">
                <ResultStackBar
                  correctCount={selectedCorrectCount}
                  wrongCount={selectedWrongCount}
                  unansweredCount={selectedUnansweredCount}
                />
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-slate-700/75 bg-slate-900/55 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">題目選項與分布</p>
                <span className="text-[11px] text-slate-400">{selectedRecap.choices.length} 個選項</span>
              </div>
              <div className="mt-3 grid gap-2">
                {selectedRecap.choices.map((choice) => {
                  const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                  const isSelected = selectedAnswer.choiceIndex === choice.index;
                  const row = selectedRecapDistributionMap.get(choice.index);
                  const choiceParticipants = selectedChoiceAvatarMap.get(choice.index) ?? [];
                  const count = row?.count ?? 0;
                  const width = row?.width ?? 0;
                  return (
                    <div
                      key={`${selectedRecap.key}-${choice.index}`}
                      className={`relative overflow-visible rounded-[18px] border px-3 py-3 ${
                        isCorrect
                          ? "border-emerald-300/35 bg-emerald-500/10"
                          : isSelected
                            ? "border-sky-300/35 bg-sky-500/10"
                            : "border-slate-700/70 bg-slate-900/45"
                      }`}
                    >
                      {choiceParticipants.length > 0 ? (
                        <div className="absolute right-3 -top-[15px] z-10 inline-flex items-center opacity-80">
                          {choiceParticipants.slice(0, 5).map((participant, avatarIndex) => (
                            <PlayerAvatar
                              key={`${choice.index}-${participant.clientId}`}
                              username={participant.username}
                              clientId={participant.clientId}
                              avatarUrl={participant.avatar_url ?? participant.avatarUrl ?? undefined}
                              rank={rankedParticipants.findIndex((item) => item.clientId === participant.clientId) + 1}
                              combo={participant.combo ?? 0}
                              isMe={Boolean(meClientId && participant.clientId === meClientId)}
                            effectLevel="off"
                            size={22}
                            stateTone={
                                participant.clientId === resolvedParticipantId
                                  ? "neutral"
                                  : "neutral"
                            }
                              hideRankMark
                              className={avatarIndex > 0 ? "-ml-1.5" : ""}
                            />
                          ))}
                          {choiceParticipants.length > 5 ? (
                            <span className="-ml-1.5 inline-flex h-6 items-center rounded-full border border-white/8 bg-slate-900/85 px-2 text-[10px] font-semibold text-slate-200">
                              +{choiceParticipants.length - 5}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex items-start gap-2">
                        <HoverMarqueeText text={choice.title} className="min-w-0 flex-1 text-sm leading-snug text-slate-100" autoRunOnTouch />
                        <div className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold">
                          {isCorrect ? <span className="inline-flex items-center gap-1 text-emerald-100"><CheckCircleRoundedIcon sx={{ fontSize: 13 }} />正解</span> : null}
                          {isSelected ? <span className="inline-flex items-center gap-1 text-sky-100"><RadioButtonCheckedRoundedIcon sx={{ fontSize: 13 }} />你的選項</span> : null}
                        </div>
                      </div>
                      <div className="relative mt-2 h-8 overflow-hidden rounded-full bg-slate-800/80">
                        {count > 0 ? (
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${isCorrect ? "from-emerald-300 to-emerald-500" : isSelected ? "from-sky-300 to-sky-500" : "from-slate-500 to-slate-400"}`}
                            style={{ width: `${width}%` }}
                          />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center px-3 text-[10px] font-medium text-slate-100">
                          {count} 人 · {selectedDistributionTotal > 0 ? `${Math.round((count / selectedDistributionTotal) * 100)}%` : "0%"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-slate-700/75 bg-slate-900/55 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {selectedRecapLink?.href ? (
                    <button
                      type="button"
                      onClick={() => openLink(selectedRecapLink, selectedRecap)}
                      className={`inline-grid min-w-0 max-w-full bg-transparent p-0 text-left text-sm font-semibold text-slate-100 ${previewTitleButtonClassName}`}
                      title={selectedPreviewTitle}
                    >
                      <HoverMarqueeText
                        text={selectedPreviewTitle}
                        className="min-w-0 max-w-full"
                        autoRunOnTouch
                      />
                    </button>
                  ) : (
                    <HoverMarqueeText
                      text={selectedPreviewTitle}
                      className="min-w-0 max-w-full text-sm font-semibold text-slate-100"
                      autoRunOnTouch
                    />
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {selectedPreviewMeta ? (
                      selectedRecapLink?.authorHref ? (
                        <a
                          href={selectedRecapLink.authorHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-author-href={selectedRecapLink.authorHref}
                          className="mq-author-link mq-author-link--subtle block w-fit max-w-full truncate text-[11px] text-slate-400"
                        >
                          <span className="truncate">{selectedPreviewMeta}</span>
                        </a>
                      ) : (
                        <span className="truncate text-[11px] text-slate-400">
                          {selectedPreviewMeta}
                        </span>
                      )
                    ) : null}
                  </div>
                </div>
                {selectedRecapLink?.href && supportCtaLabel ? (
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:border-rose-200/55 hover:bg-rose-500/16 hover:text-white"
                    onClick={() => openLink(selectedRecapLink, selectedRecap)}
                  >
                    <OpenInNewRoundedIcon className="text-[0.9rem]" />
                    {supportCtaLabel}
                  </button>
                ) : null}
              </div>

                    <div className="mt-3 overflow-hidden rounded-[18px] border border-slate-700/80 bg-black/40">
                <div className="relative aspect-[16/9.15] w-full">
                  {selectedRecapPreviewUrl ? (
                    <>
                      <iframe
                        key={`${selectedRecap.key}:${selectedRecapPreviewUrl}`}
                        ref={previewIframeRef}
                        src={selectedRecapPreviewUrl}
                        className="absolute inset-0 h-full w-full"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        title={`history-preview-${selectedRecap.key}`}
                        onLoad={handlePreviewFrameLoad}
                      />
                      {!previewIsPlaying ? (
                        <button
                          type="button"
                          className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-gradient-to-b from-slate-950/18 via-slate-950/48 to-slate-950/78 px-4 text-center transition hover:from-slate-950/10 hover:via-slate-950/42 hover:to-slate-950/72"
                          onClick={handlePreviewStart}
                        >
                          <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-slate-950/78 px-4 py-2 text-sm font-semibold text-slate-100 shadow-[0_18px_28px_-24px_rgba(34,211,238,0.45)]">
                            <PlayCircleOutlineRoundedIcon className="text-[1.1rem]" />
                            {PREVIEW_OVERLAY_COPY}
                          </span>
                        </button>
                      ) : null}
                    </>
                  ) : selectedRecap.thumbnail ? (
                    <>
                      <img src={selectedRecap.thumbnail} alt={selectedRecap.title} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/14 via-slate-950/42 to-slate-950/72" />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-400">目前沒有可播放的預覽來源</div>
                  )}
                </div>
              </div>

              {selectedRecapPreviewUrl ? (
                <div className="mt-3 px-3 py-3">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      aria-pressed={previewAutoplayEnabled}
                      onClick={() => {
                        setPreviewAutoplayEnabled((prev) => {
                          const next = !prev;
                          if (next && selectedRecapPreviewUrl) {
                            window.setTimeout(handlePreviewStart, 120);
                          }
                          return next;
                        });
                      }}
                      className={`group inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] border px-3 transition sm:w-auto sm:min-w-[152px] ${
                        previewAutoplayEnabled
                          ? "border-cyan-300/45 bg-cyan-500/14 text-cyan-50"
                          : "border-slate-700/70 bg-slate-900/60 text-slate-200 hover:border-cyan-300/35 hover:bg-slate-900/78 hover:text-white"
                      }`}
                    >
                      <PlayCircleOutlineRoundedIcon className="text-[1.1rem]" />
                      <span className="text-sm font-semibold">
                        {previewAutoplayEnabled ? "自動播放開啟" : "自動播放關閉"}
                      </span>
                    </button>

                    <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-slate-100">
                        {previewVolume <= 0 ? <VolumeOffRoundedIcon className="text-[1.05rem]" /> : <VolumeUpRoundedIcon className="text-[1.05rem]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="relative h-5">
                          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-800/90" />
                          <div className="absolute inset-y-0 left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-400/90 via-sky-300/95 to-emerald-300/90 shadow-[0_0_16px_rgba(34,211,238,0.18)]" style={previewVolumeFillStyle} />
                          <span className="pointer-events-none absolute top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 rounded-full border border-slate-950/55 bg-white shadow-[0_0_0_4px_rgba(34,211,238,0.08),0_8px_20px_rgba(15,23,42,0.35)]" style={previewVolumeThumbStyle} />
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={previewVolume}
                            aria-label="調整預覽音量"
                            onChange={(event) => {
                              setPreviewVolume(Number(event.target.value));
                            }}
                            className="absolute inset-0 z-20 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
                          />
                        </div>
                      </div>
                      <span className="shrink-0 min-w-[34px] px-2.5 py-0.5 text-right text-xs font-semibold tabular-nums text-cyan-100">{previewVolume}%</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/45 px-4 text-sm text-slate-400">
            尚未取得題目回放資料
          </div>
        )}
      </article>
    </div>
  );
};

export default HistoryReplayCompactView;
