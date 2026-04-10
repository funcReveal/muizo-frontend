
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trackEvent } from "../../../../shared/analytics/track";
import {
  resolveSettlementTrackLink,
  type SettlementTrackLink,
} from "../../model/settlementLinks";
import type {
  ChatMessage,
  PlaylistItem,
  RoomParticipant,
  RoomState,
} from "../../../Room/model/types";
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
}

const HISTORY_PREVIEW_AUTOPLAY_STORAGE_KEY = "history_preview_autoplay";
const HISTORY_PREVIEW_VOLUME_STORAGE_KEY = "history_preview_volume";
const PREVIEW_OVERLAY_COPY = "如果喜歡這首音樂，別忘了到 YouTube 支持創作者喲！";
const HISTORY_PREVIEW_BRIDGE_ID = "history-replay-preview";

const RESULT_TONE: Record<
  ParticipantResult,
  { label: string; chipClassName: string; dotClassName: string }
> = {
  correct: {
    label: "答對",
    chipClassName: "border-emerald-300/35 bg-emerald-500/12 text-emerald-100",
    dotClassName: "bg-emerald-300",
  },
  wrong: {
    label: "答錯",
    chipClassName: "border-rose-300/35 bg-rose-500/12 text-rose-100",
    dotClassName: "bg-rose-300",
  },
  unanswered: {
    label: "未答",
    chipClassName: "border-slate-400/40 bg-slate-700/45 text-slate-100",
    dotClassName: "bg-slate-500",
  },
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

const formatMs = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "--";
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
};

const formatPlayedOnDate = (timestamp?: number) => {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return `遊玩於 ${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")}`;
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
): { choiceIndex: number | null; result: ParticipantResult } => {
  if (!participantClientId) {
    return { choiceIndex: null as number | null, result: "unanswered" as ParticipantResult };
  }
  const answer = recap.answersByClientId?.[participantClientId];
  if (answer) {
    return {
      choiceIndex: typeof answer.choiceIndex === "number" ? answer.choiceIndex : null,
      result: normalizeParticipantResult(answer.result),
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
    };
  }
  return { choiceIndex: null as number | null, result: "unanswered" as ParticipantResult };
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

  const running = canMarquee && (hovered || (autoRunOnTouch && coarsePointer));

  return (
    <span
      ref={wrapRef}
      className={`game-settlement-title-marquee block overflow-hidden ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
  endedAt,
  meClientId,
  questionRecaps = [],
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
  const [playersExpanded, setPlayersExpanded] = useState(false);
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
  const selectedParticipantRank = selectedParticipant
    ? rankedParticipants.findIndex((participant) => participant.clientId === selectedParticipant.clientId) + 1
    : 0;
  const selectedAnswer = useMemo(
    () =>
      selectedRecap
        ? getParticipantAnswer(selectedRecap, resolvedParticipantId, meClientId)
        : { choiceIndex: null as number | null, result: "unanswered" as ParticipantResult },
    [meClientId, resolvedParticipantId, selectedRecap],
  );
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
  const playedOnLabel = formatPlayedOnDate(endedAt);

  const openLink = useCallback(
    (link: SettlementTrackLink, recap: ExtendedRecap) => {
      if (!link.href) return;
      trackEvent("settlement_outbound_click", {
        surface: "history",
        provider: link.provider,
        link_type: link.linkType,
        room_id: room.id,
        track_order: recap.order,
        source_id: link.sourceId ?? "",
      });
      window.open(link.href, "_blank", "noopener,noreferrer");
    },
    [room.id],
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
  const primaryParticipants = playersExpanded
    ? rankedParticipants
    : rankedParticipants.filter((participant) => participant.clientId === resolvedParticipantId);

  if (isWide) {
    return (
      <div className="space-y-4 overflow-x-hidden">
        <section className="rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(8,14,24,0.9),rgba(4,8,16,0.96))] p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(176px,208px)] sm:items-start">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-100 sm:text-xl">
                {collectionTitle}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {playedOnLabel ?? "可切換玩家視角、題目與作答分布。"}
              </p>
            </div>

            <div className="rounded-2xl border border-sky-300/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100 sm:justify-self-end sm:w-full sm:max-w-[208px]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-sky-200/85">
                你的本局表現
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300">名次</span>
                  <span className="font-semibold text-slate-50">
                    {meRank > 0 ? `${meRank}/${Math.max(1, rankedParticipants.length)}` : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300">分數</span>
                  <span className="font-semibold text-slate-50">
                    {meParticipant?.score ?? "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300">答對</span>
                  <span className="font-semibold text-slate-50">
                    {meParticipant?.correctCount ?? 0}/{playedQuestionCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <aside className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">玩家</p>
              <span className="text-xs text-slate-500">{rankedParticipants.length} 人</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,280px))] xl:justify-start">
              {rankedParticipants.map((participant, index) => {
                const active = resolvedParticipantId === participant.clientId;
                const isMe = meClientId && meClientId === participant.clientId;
                return (
                  <button
                    key={participant.clientId}
                    type="button"
                    onClick={() => setSelectedParticipantId(participant.clientId)}
                    className={`w-full max-w-[280px] cursor-pointer overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-cyan-300/45 bg-cyan-500/12"
                        : "border-slate-700/70 bg-slate-900/55 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-slate-900/68"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-100">
                        #{index + 1} {participant.username}
                        {isMe ? "（你）" : ""}
                      </p>
                      <span className="text-sm font-bold text-slate-100">{participant.score}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      答對 {participant.correctCount ?? 0}/{playedQuestionCount} · Combo x
                      {Math.max(participant.maxCombo ?? 0, participant.combo)}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="grid gap-3 xl:grid-cols-[minmax(255px,280px)_minmax(0,1fr)] xl:items-start">
            <aside className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3 xl:w-[280px] xl:self-start">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">題目</p>
                <span className="text-xs text-slate-500">{recaps.length} 題</span>
              </div>
              <div className="mt-3 max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {recaps.map((recap) => {
                  const answer = getParticipantAnswer(recap, resolvedParticipantId, meClientId);
                  const tone = RESULT_TONE[answer.result];
                  const active = selectedRecap?.key === recap.key;
                  return (
                    <button
                      key={recap.key}
                      type="button"
                      onClick={() => {
                        setSelectedRecapKey(recap.key);
                      }}
                      className={`w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-amber-300/55 bg-amber-500/10"
                          : "border-slate-700/70 bg-slate-900/55 hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-slate-900/68"
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                            active
                              ? "bg-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.12)]"
                              : "bg-slate-700"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <HoverMarqueeText
                            text={recap.title}
                            className="min-w-0 max-w-full text-sm font-semibold text-slate-100"
                          />
                          <p className="mt-1 truncate text-[11px] text-slate-400">
                            {recap.uploader || "未知作者"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.chipClassName}`}
                        >
                          {tone.label}
                        </span>
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
                      <p className="mt-1 text-[11px] text-slate-500">
                        {selectedParticipant?.username ?? "玩家視角"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        RESULT_TONE[selectedAnswer.result].chipClassName
                      }`}
                    >
                      {RESULT_TONE[selectedAnswer.result].label}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-emerald-300/35 bg-emerald-500/10 px-3 py-2.5">
                        <p className="text-[10px] text-emerald-100/90">玩家分數</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-50">
                          {selectedParticipant?.score ?? "--"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-sky-300/35 bg-sky-500/10 px-3 py-2.5">
                        <p className="text-[10px] text-sky-100/90">玩家名次</p>
                        <p className="mt-1 text-lg font-semibold text-sky-50">
                          {selectedParticipantRank > 0
                            ? `${selectedParticipantRank}/${Math.max(1, rankedParticipants.length)}`
                            : "--"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/10 px-3 py-2.5">
                        <p className="text-[10px] text-fuchsia-100/90">玩家最高 Combo</p>
                        <p className="mt-1 text-lg font-semibold text-fuchsia-50">
                          x
                          {selectedParticipant
                            ? Math.max(
                                selectedParticipant.maxCombo ?? 0,
                                selectedParticipant.combo,
                              )
                            : "--"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2.5">
                        <p className="text-[10px] text-amber-100/90">玩家最快答題</p>
                        <p className="mt-1 text-lg font-semibold text-amber-50">
                          {formatMs(selectedParticipant?.fastestCorrectMs)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-700/75 bg-slate-900/60 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        本題統計
                      </p>
                      <p className="mt-2 text-sm text-slate-200">
                        答對 {selectedRecap.correctCount ?? 0} · 答錯 {selectedRecap.wrongCount ?? 0}
                        · 未作答 {selectedRecap.unansweredCount ?? 0} · 最快答對{" "}
                        {formatMs(selectedRecap.fastestCorrectMs)}
                      </p>
                    </div>

                    {selectedRecap.choices.length > 0 ? (
                      <div className="rounded-2xl border border-slate-700/75 bg-slate-900/55 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                              題目選項與分布
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              正確答案、玩家選項與全體作答分布合併顯示。
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {selectedRecap.choices.length} 個選項
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2.5">
                          {selectedRecap.choices.map((choice) => {
                            const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                            const isSelected = selectedAnswer.choiceIndex === choice.index;
                            const row = selectedRecapDistributionMap.get(choice.index);
                            const count = row?.count ?? 0;
                            const width = row?.width ?? 0;
                            return (
                              <div
                                key={`${selectedRecap.key}-${choice.index}`}
                                className={`overflow-hidden rounded-xl border px-3 py-3 ${
                                  isCorrect
                                    ? "border-emerald-300/35 bg-emerald-500/10"
                                    : isSelected
                                      ? "border-sky-300/35 bg-sky-500/10"
                                      : "border-slate-700/70 bg-slate-900/45"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-start gap-2">
                                      <HoverMarqueeText
                                        text={choice.title}
                                        className="min-w-0 max-w-full flex-1 text-sm text-slate-100"
                                      />
                                      {count > 0 ? (
                                        <span className="shrink-0 rounded-full border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
                                          {count} 人
                                        </span>
                                      ) : (
                                        <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-slate-500">
                                          0 人
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {isCorrect ? (
                                        <span className="rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                                          正確
                                        </span>
                                      ) : null}
                                      {isSelected ? (
                                        <span className="rounded-full border border-sky-300/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
                                          玩家選項
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                                      {count > 0 ? (
                                        <div
                                          className={`h-full rounded-full ${
                                            isCorrect ? "bg-emerald-300/85" : "bg-sky-300/80"
                                          }`}
                                          style={{ width: `${width}%` }}
                                        />
                                      ) : null}
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
      <section className="rounded-[20px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(8,14,24,0.94),rgba(4,8,16,0.98))] p-3 sm:rounded-[24px] sm:p-4">
        <HoverMarqueeText
          text={collectionTitle}
          className="w-full text-[1.45rem] font-semibold leading-tight text-slate-100 sm:text-[1.7rem]"
          autoRunOnTouch
        />
        <p className="mt-2 text-xs text-slate-400">
          {playedOnLabel ?? "尚未取得遊玩日期"}
        </p>
      </section>

      <section className="rounded-[20px] border border-slate-700/70 bg-slate-950/55 p-3 sm:rounded-[24px] sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">玩家</p>
            <p className="mt-1 text-sm text-slate-300">目前查看 {selectedParticipant?.username ?? "玩家"}</p>
          </div>
          {rankedParticipants.length > 1 ? (
            <button
              type="button"
              className="cursor-pointer rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-300/35 hover:bg-slate-900/88 hover:text-white"
              onClick={() => setPlayersExpanded((current) => !current)}
            >
              {playersExpanded ? "收合玩家" : "切換玩家"}
            </button>
          ) : (
            <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-200">
              {rankedParticipants.length} 人
            </span>
          )}
        </div>
        <div className="mt-3 max-h-[174px] space-y-2 overflow-y-auto pr-1">
          {primaryParticipants.map((participant, index) => {
            const actualRank = rankedParticipants.findIndex((item) => item.clientId === participant.clientId) + 1;
            const isActive = participant.clientId === resolvedParticipantId;
            const isMe = participant.clientId === meClientId;
            return (
              <button
                key={participant.clientId}
                type="button"
                onClick={() => setSelectedParticipantId(participant.clientId)}
                className={`w-full cursor-pointer rounded-[18px] border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-cyan-300/45 bg-cyan-500/12"
                    : "border-slate-700/70 bg-slate-900/55 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-slate-900/68"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      #{actualRank || index + 1} {participant.username}
                      {isMe ? "（你）" : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">答對 {participant.correctCount ?? 0}/{playedQuestionCount} 題</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-50">{participant.score}</p>
                    <p className="text-[11px] text-slate-400">Combo x{Math.max(participant.maxCombo ?? 0, participant.combo)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[20px] border border-slate-700/70 bg-slate-950/55 p-3 sm:rounded-[24px] sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">題目列表</p>
            <p className="mt-1 text-sm text-slate-300">固定顯示，快速切換題目</p>
          </div>
          <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-200">
            {recaps.length} 題
          </span>
        </div>
        <div className="mt-3 max-h-[222px] space-y-2 overflow-y-auto pr-1 sm:max-h-[280px]">
          {recaps.map((recap) => {
            const answer = getParticipantAnswer(recap, resolvedParticipantId, meClientId);
            const tone = RESULT_TONE[answer.result];
            const active = selectedRecap?.key === recap.key;
            return (
              <button
                key={recap.key}
                type="button"
                onClick={() => {
                  setSelectedRecapKey(recap.key);
                }}
                className={`w-full cursor-pointer rounded-[18px] border px-3 py-3 text-left transition ${
                  active
                    ? "border-amber-300/48 bg-amber-500/10 shadow-[0_18px_30px_-26px_rgba(245,158,11,0.75)]"
                    : "border-slate-700/70 bg-slate-900/55 hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-slate-900/68"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dotClassName}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">第 {recap.order} 題</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.chipClassName}`}>
                        {tone.label}
                      </span>
                    </div>
                    <HoverMarqueeText
                      text={recap.title}
                      className="mt-1 min-w-0 max-w-full text-sm font-semibold text-slate-100"
                      autoRunOnTouch
                    />
                  </div>
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

            <div className="mt-3 flex flex-col gap-2.5">
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

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[18px] border border-sky-300/22 bg-sky-500/10 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">名次</p>
                <p className="mt-1 text-lg font-semibold text-sky-50">
                  {selectedParticipant
                    ? `${rankedParticipants.findIndex((item) => item.clientId === selectedParticipant.clientId) + 1}/${Math.max(1, rankedParticipants.length)}`
                    : "--"}
                </p>
              </div>
              <div className="rounded-[18px] border border-emerald-300/22 bg-emerald-500/10 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">分數</p>
                <p className="mt-1 text-lg font-semibold text-emerald-50">{selectedParticipant?.score ?? 0}</p>
              </div>
              <div className="rounded-[18px] border border-amber-300/22 bg-amber-500/10 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">結果</p>
                <p className="mt-1 text-lg font-semibold text-amber-50">{RESULT_TONE[selectedAnswer.result].label}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-slate-700/75 bg-slate-900/55 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">題目選項與分布</p>
                <span className="text-[11px] text-slate-400">答對 {selectedRecap.correctCount ?? 0} / 答錯 {selectedRecap.wrongCount ?? 0}</span>
              </div>
              <div className="mt-3 grid gap-2">
                {selectedRecap.choices.map((choice) => {
                  const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                  const isSelected = selectedAnswer.choiceIndex === choice.index;
                  const row = selectedRecapDistributionMap.get(choice.index);
                  const count = row?.count ?? 0;
                  const width = row?.width ?? 0;
                  return (
                    <div
                      key={`${selectedRecap.key}-${choice.index}`}
                      className={`overflow-hidden rounded-[18px] border px-3 py-3 ${
                        isCorrect
                          ? "border-emerald-300/35 bg-emerald-500/10"
                          : isSelected
                            ? "border-sky-300/35 bg-sky-500/10"
                            : "border-slate-700/70 bg-slate-900/45"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <HoverMarqueeText text={choice.title} className="min-w-0 flex-1 text-sm leading-snug text-slate-100" autoRunOnTouch />
                        <span className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">{count}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {isCorrect ? <span className="rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">正確答案</span> : null}
                        {isSelected ? <span className="rounded-full border border-sky-300/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-100">玩家選項</span> : null}
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                        {count > 0 ? (
                          <div
                            className={`h-full rounded-full ${isCorrect ? "bg-emerald-300/85" : "bg-sky-300/80"}`}
                            style={{ width: `${width}%` }}
                          />
                        ) : null}
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
