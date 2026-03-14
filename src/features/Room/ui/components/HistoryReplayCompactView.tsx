import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
} from "../../model/types";
import type { SettlementQuestionRecap } from "./GameSettlementPanel";
import { resolvePreviewEmbedUrl } from "./liveSettlementShowcase/showcasePrimitives";

type ExtendedRecap = SettlementQuestionRecap & {
  provider?: string;
  sourceId?: string | null;
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

const HISTORY_PREVIEW_AUTOPLAY_STORAGE_KEY = "mq_history_preview_autoplay";
const HISTORY_PREVIEW_VOLUME_STORAGE_KEY = "mq_history_preview_volume";
const PREVIEW_OVERLAY_COPY = "如果喜歡這首音樂，別忘了到 YouTube 支持創作者喲！";

const RESULT_TONE: Record<
  ParticipantResult,
  { label: string; className: string }
> = {
  correct: {
    label: "答對",
    className: "border-emerald-300/35 bg-emerald-500/12 text-emerald-100",
  },
  wrong: {
    label: "答錯",
    className: "border-rose-300/35 bg-rose-500/12 text-rose-100",
  },
  unanswered: {
    label: "未作答",
    className: "border-slate-400/40 bg-slate-700/45 text-slate-100",
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

const formatDuration = (startedAt?: number, endedAt?: number) => {
  if (!startedAt || !endedAt || endedAt <= startedAt) return "-";
  const totalSec = Math.floor((endedAt - startedAt) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
};

const formatMs = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "--";
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
};

const getParticipantAnswer = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
  meClientId?: string,
) => {
  if (!participantClientId) {
    return {
      choiceIndex: null as number | null,
      result: "unanswered" as ParticipantResult,
      answeredAtMs: null as number | null,
    };
  }
  const answer = recap.answersByClientId?.[participantClientId];
  if (answer) {
    return {
      choiceIndex:
        typeof answer.choiceIndex === "number" ? answer.choiceIndex : null,
      result: answer.result ?? "unanswered",
      answeredAtMs:
        typeof answer.answeredAtMs === "number" ? answer.answeredAtMs : null,
    };
  }
  if (meClientId && participantClientId === meClientId) {
    const choiceIndex =
      typeof recap.myChoiceIndex === "number" ? recap.myChoiceIndex : null;
    let result: ParticipantResult = "unanswered";
    if (choiceIndex !== null) {
      result = choiceIndex === recap.correctChoiceIndex ? "correct" : "wrong";
    }
    return {
      choiceIndex,
      result,
      answeredAtMs: null,
    };
  }
  return {
    choiceIndex: null as number | null,
    result: "unanswered" as ParticipantResult,
    answeredAtMs: null as number | null,
  };
};

const buildFallbackRecaps = (
  playlistItems: PlaylistItem[],
  trackOrder: number[],
): ExtendedRecap[] =>
  trackOrder.map((trackIndex, index) => {
    const item = playlistItems[trackIndex];
    const title =
      item?.answerText?.trim() || item?.title?.trim() || `第 ${index + 1} 題`;
    const uploader = item?.uploader?.trim() || "Unknown";
    const choices = trackOrder.slice(0, 4).map((choiceTrackIndex, choiceIndex) => {
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
    });
    return {
      key: `fallback:${index}:${trackIndex}`,
      order: index + 1,
      trackIndex,
      title,
      uploader,
      duration: item?.duration ?? null,
      thumbnail: item?.thumbnail ?? null,
      myResult: "unanswered",
      myChoiceIndex: null,
      correctChoiceIndex: 0,
      choices,
      provider: item?.provider,
      sourceId: item?.sourceId ?? null,
      videoId: item?.videoId,
      url: item?.url,
    };
  });

const HoverMarqueeText: React.FC<{
  text: string;
  className?: string;
  trackClassName?: string;
}> = ({ text, className = "", trackClassName = "" }) => {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const [canMarquee, setCanMarquee] = useState(false);
  const [marqueeStyle, setMarqueeStyle] = useState<React.CSSProperties>({});
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    const measure = () => {
      const overflow = track.scrollWidth - wrap.clientWidth;
      if (overflow > 10) {
        const shift = -(overflow + 22);
        const durationSec = Math.min(11.5, Math.max(4.2, overflow / 48));
        setCanMarquee(true);
        setMarqueeStyle({
          ["--settlement-title-shift" as const]: `${shift}px`,
          ["--settlement-title-duration" as const]: `${durationSec.toFixed(2)}s`,
        });
        return;
      }
      setCanMarquee(false);
      setMarqueeStyle({});
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(wrap);
      observer.observe(track);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text]);

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
          canMarquee && hovered ? "game-settlement-title-marquee-track--run" : ""
        } ${trackClassName}`}
        style={marqueeStyle}
      >
        {text}
      </span>
    </span>
  );
};

const HistoryReplayCompactView: React.FC<HistoryReplayCompactViewProps> = ({
  room,
  participants,
  messages,
  playlistItems = [],
  trackOrder = [],
  playedQuestionCount,
  startedAt,
  endedAt,
  meClientId,
  questionRecaps = [],
}) => {
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

  const initialSelectedParticipantId =
    (meClientId && participantMap[meClientId] ? meClientId : rankedParticipants[0]?.clientId) ??
    null;

  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    initialSelectedParticipantId,
  );
  const [selectedRecapKey, setSelectedRecapKey] = useState<string | null>(null);
  const [previewAutoplayEnabled, setPreviewAutoplayEnabled] = useState<boolean>(() =>
    readStoredPreviewAutoplay(),
  );
  const [previewVolume, setPreviewVolume] = useState<number>(() => readStoredPreviewVolume());
  const [previewPlayerState, setPreviewPlayerState] = useState<"idle" | "playing" | "paused">(
    "idle",
  );
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  const recaps = useMemo<ExtendedRecap[]>(() => {
    if (questionRecaps.length > 0) {
      return questionRecaps.map((recap) => {
        const item = playlistItems[recap.trackIndex];
        return {
          ...(recap as ExtendedRecap),
          provider: (recap as ExtendedRecap).provider ?? item?.provider,
          sourceId: (recap as ExtendedRecap).sourceId ?? item?.sourceId ?? null,
          videoId: (recap as ExtendedRecap).videoId ?? item?.videoId,
          url: (recap as ExtendedRecap).url ?? item?.url,
        };
      });
    }
    return buildFallbackRecaps(playlistItems, trackOrder);
  }, [playlistItems, questionRecaps, trackOrder]);

  const selectedRecap = useMemo(() => {
    if (!recaps.length) return null;
    if (!selectedRecapKey) return recaps[0];
    return recaps.find((recap) => recap.key === selectedRecapKey) ?? recaps[0];
  }, [recaps, selectedRecapKey]);

  const selectedParticipant = selectedParticipantId
    ? participantMap[selectedParticipantId] ?? null
    : null;
  const selectedParticipantRank = selectedParticipantId
    ? rankedParticipants.findIndex(
        (participant) => participant.clientId === selectedParticipantId,
      ) + 1
    : 0;

  const endedAtLabel = endedAt || messages[messages.length - 1]?.timestamp;

  const selectedAnswer = useMemo(() => {
    if (!selectedRecap) {
      return {
        choiceIndex: null,
        result: "unanswered" as ParticipantResult,
        answeredAtMs: null,
      };
    }
    return getParticipantAnswer(selectedRecap, selectedParticipantId, meClientId);
  }, [meClientId, selectedParticipantId, selectedRecap]);

  const selectedRecapDistribution = useMemo(() => {
    if (!selectedRecap || !selectedRecap.choices.length) return [];
    const counts = new Map<number, number>();
    for (const choice of selectedRecap.choices) {
      counts.set(choice.index, 0);
    }
    if (selectedRecap.answersByClientId) {
      for (const answer of Object.values(selectedRecap.answersByClientId)) {
        if (typeof answer.choiceIndex !== "number") continue;
        counts.set(answer.choiceIndex, (counts.get(answer.choiceIndex) ?? 0) + 1);
      }
    } else if (typeof selectedRecap.myChoiceIndex === "number") {
      counts.set(
        selectedRecap.myChoiceIndex,
        (counts.get(selectedRecap.myChoiceIndex) ?? 0) + 1,
      );
    }
    const maxCount = Math.max(...Array.from(counts.values()), 1);
    return selectedRecap.choices.map((choice) => {
      const count = counts.get(choice.index) ?? 0;
      return {
        choice,
        count,
        width: count > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 0,
      };
    });
  }, [selectedRecap]);

  const selectedRecapDistributionMap = useMemo(
    () =>
      new Map(
        selectedRecapDistribution.map((row) => [row.choice.index, row] as const),
      ),
    [selectedRecapDistribution],
  );
  const previewVolumeFillStyle = useMemo<React.CSSProperties>(
    () => ({
      width: `${Math.max(0, Math.min(100, previewVolume))}%`,
    }),
    [previewVolume],
  );
  const previewVolumeThumbStyle = useMemo<React.CSSProperties>(() => {
    if (previewVolume <= 0) {
      return { left: "0px" };
    }
    if (previewVolume >= 100) {
      return { left: "calc(100% - 18px)" };
    }
    return { left: `calc(${previewVolume}% - 9px)` };
  }, [previewVolume]);

  const openLink = (link: SettlementTrackLink, recap: ExtendedRecap) => {
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
  };

  const selectedRecapLink = selectedRecap
    ? resolveSettlementTrackLink({
        provider: selectedRecap.provider,
        sourceId: selectedRecap.sourceId,
        videoId: selectedRecap.videoId,
        url: selectedRecap.url ?? "",
        title: selectedRecap.title ?? "",
        answerText: selectedRecap.title ?? "",
        uploader: selectedRecap.uploader,
      })
    : null;

  const selectedRecapPreviewUrl = useMemo(() => {
    if (!selectedRecap || !selectedRecapLink) return null;
    return resolvePreviewEmbedUrl(selectedRecap, selectedRecapLink);
  }, [selectedRecap, selectedRecapLink]);

  const postYouTubeCommand = useCallback((func: string, args: unknown[] = []) => {
    const contentWindow = previewIframeRef.current?.contentWindow;
    if (!contentWindow) return;
    contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  }, []);

  const registerYouTubeBridge = useCallback(() => {
    const contentWindow = previewIframeRef.current?.contentWindow;
    if (!contentWindow) return;
    const send = () => {
      contentWindow.postMessage(
        JSON.stringify({ event: "listening", id: "history-preview" }),
        "*",
      );
    };
    send();
    [260, 900, 1700].forEach((delay) => window.setTimeout(send, delay));
  }, []);

  const syncPreviewVolume = useCallback(() => {
    const normalizedVolume = Math.max(0, Math.min(100, previewVolume));
    postYouTubeCommand("setVolume", [normalizedVolume]);
    if (normalizedVolume <= 0) {
      postYouTubeCommand("mute");
    } else {
      postYouTubeCommand("unMute");
    }
  }, [postYouTubeCommand, previewVolume]);

  const handlePreviewStart = useCallback(() => {
    postYouTubeCommand("playVideo");
    syncPreviewVolume();
    setPreviewPlayerState("playing");
  }, [postYouTubeCommand, syncPreviewVolume]);

  const handlePreviewFrameLoad = useCallback(() => {
    registerYouTubeBridge();
    window.setTimeout(() => {
      syncPreviewVolume();
      if (previewAutoplayEnabled) {
        handlePreviewStart();
      }
    }, 220);
  }, [
    handlePreviewStart,
    previewAutoplayEnabled,
    registerYouTubeBridge,
    syncPreviewVolume,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin || "";
      const trusted =
        origin.includes("youtube.com") || origin.includes("youtube-nocookie.com");
      if (!trusted) return;
      const frameWindow = previewIframeRef.current?.contentWindow;
      if (frameWindow && event.source !== frameWindow) return;
      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== "object" || !("event" in payload)) return;
      const eventName = (payload as { event?: unknown }).event;
      const info = (payload as { info?: unknown }).info;
      const readState = (value: unknown) => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (value && typeof value === "object" && "playerState" in value) {
          const next = (value as { playerState?: unknown }).playerState;
          return typeof next === "number" && Number.isFinite(next) ? next : null;
        }
        return null;
      };
      const state =
        eventName === "onStateChange"
          ? readState(info)
          : eventName === "infoDelivery"
            ? readState(info)
            : null;
      if (state === 1) {
        setPreviewPlayerState("playing");
      } else if (state === 2) {
        setPreviewPlayerState("paused");
      } else if (state === 0) {
        setPreviewPlayerState("paused");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      HISTORY_PREVIEW_VOLUME_STORAGE_KEY,
      String(previewVolume),
    );
    syncPreviewVolume();
  }, [previewVolume, syncPreviewVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      HISTORY_PREVIEW_AUTOPLAY_STORAGE_KEY,
      previewAutoplayEnabled ? "1" : "0",
    );
  }, [previewAutoplayEnabled]);

  const collectionTitle = room.playlist.title?.trim() || "未命名收藏庫";
  const meRank =
    meParticipant && meParticipant.clientId
      ? rankedParticipants.findIndex((item) => item.clientId === meParticipant.clientId) + 1
      : 0;
  const supportCtaLabel = selectedRecapLink
    ? selectedRecapLink.provider === "youtube"
      ? "前往 YouTube 支持作者"
      : `前往 ${selectedRecapLink.providerLabel} 聆聽完整歌曲`
    : null;

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(8,14,24,0.9),rgba(4,8,16,0.96))] p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(176px,208px)] sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-300/28 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-sky-100">
                收藏庫回放
              </span>
              <span className="rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1 text-[11px] text-slate-300">
                {participants.length} 人
              </span>
              <span className="rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1 text-[11px] text-slate-300">
                {playedQuestionCount} 題
              </span>
              <span className="rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1 text-[11px] text-slate-300">
                局長 {formatDuration(startedAt, endedAt)}
              </span>
            </div>
            <p className="mt-3 truncate text-lg font-semibold text-slate-100 sm:text-xl">
              {collectionTitle}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {endedAtLabel
                ? `回放時間 ${new Date(endedAtLabel).toLocaleString()}`
                : "可切換玩家視角、題目與作答分布。"}
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
              const active = selectedParticipantId === participant.clientId;
              const isMe = meClientId && meClientId === participant.clientId;
              return (
                <button
                  key={participant.clientId}
                  type="button"
                  onClick={() => setSelectedParticipantId(participant.clientId)}
                  className={`w-full max-w-[280px] overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-cyan-300/45 bg-cyan-500/12"
                      : "border-slate-700/70 bg-slate-900/55 hover:border-slate-500/80"
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
                const answer = getParticipantAnswer(recap, selectedParticipantId, meClientId);
                const tone = RESULT_TONE[answer.result];
                const active = selectedRecap?.key === recap.key;
                return (
                  <button
                    key={recap.key}
                    type="button"
                    onClick={() => {
                      setSelectedRecapKey(recap.key);
                      setPreviewPlayerState("idle");
                    }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-amber-300/55 bg-amber-500/10"
                        : "border-slate-700/70 bg-slate-900/55 hover:border-slate-500/80"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                          active
                            ? "bg-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.12)]"
                            : "bg-slate-700"
                        }`}
                      />
                      <HoverMarqueeText
                        text={recap.title}
                        className="min-w-0 max-w-full flex-1 text-sm font-semibold text-slate-100"
                      />
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.className}`}
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
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    第 {selectedRecap.order} 題 · {selectedParticipant?.username ?? "玩家視角"}
                  </p>
                  {selectedRecapLink?.href ? (
                    <button
                      type="button"
                      onClick={() => openLink(selectedRecapLink, selectedRecap)}
                      className="mt-2 block w-full text-left"
                    >
                      <HoverMarqueeText
                        text={selectedRecap.title}
                        className="w-full text-base font-semibold leading-tight text-slate-100 sm:text-lg"
                        trackClassName="underline-offset-4 hover:text-cyan-200"
                      />
                    </button>
                  ) : (
                    <HoverMarqueeText
                      text={selectedRecap.title}
                      className="mt-2 w-full text-base font-semibold leading-tight text-slate-100 sm:text-lg"
                      trackClassName="underline-offset-4 hover:text-cyan-200"
                    />
                  )}
                  <p className="mt-1 text-sm text-slate-400">{selectedRecap.uploader}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    RESULT_TONE[selectedAnswer.result].className
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
                    · 未作答 {selectedRecap.unansweredCount ?? 0}
                    · 最快答對 {formatMs(selectedRecap.fastestCorrectMs)}
                  </p>
                </div>

                {selectedRecap.choices.length > 0 && (
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
                        const isCorrect =
                          choice.index === selectedRecap.correctChoiceIndex;
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
                                  {isCorrect && (
                                    <span className="rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                                      正確
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="rounded-full border border-sky-300/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
                                      玩家選項
                                    </span>
                                  )}
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
                )}

                <div className="rounded-2xl border border-slate-700/75 bg-[linear-gradient(180deg,rgba(10,16,28,0.92),rgba(6,10,18,0.98))] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        歌曲預覽
                      </p>
                      {selectedRecapLink?.providerLabel && (
                        <span className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2.5 py-1 text-[10px] font-semibold text-slate-200">
                          {selectedRecapLink.providerLabel}
                        </span>
                      )}
                    </div>
                    {selectedRecapLink?.href && supportCtaLabel && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-sky-300/35 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20"
                        onClick={() => openLink(selectedRecapLink, selectedRecap)}
                      >
                        {supportCtaLabel}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/80 bg-black/45">
                    <div className="relative aspect-[16/8.4] w-full">
                      {selectedRecapPreviewUrl ? (
                        <>
                          <iframe
                            ref={previewIframeRef}
                            src={selectedRecapPreviewUrl}
                            className="absolute inset-0 h-full w-full"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                            title={`history-preview-${selectedRecap.key}`}
                            onLoad={handlePreviewFrameLoad}
                          />
                          {previewPlayerState !== "playing" && (
                            <button
                              type="button"
                              className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-slate-950/28 via-slate-950/58 to-slate-950/84 px-4 text-center"
                              onClick={handlePreviewStart}
                            >
                              <span className="max-w-[30rem]">
                                <span className="block text-sm font-semibold text-slate-100">
                                  {PREVIEW_OVERLAY_COPY}
                                </span>
                              </span>
                            </button>
                          )}
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

                  {selectedRecapPreviewUrl && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/62 px-3 py-3">
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
                        className={`group inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition ${
                          previewAutoplayEnabled
                            ? "border-cyan-300/45 bg-cyan-500/14 text-cyan-50"
                            : "border-slate-700/70 bg-slate-900/60 text-slate-200 hover:border-slate-500/80"
                        }`}
                      >
                        <PlayCircleOutlineRoundedIcon className="text-[1.2rem]" />
                      </button>

                      <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/55 px-3 py-2.5">
                        <span
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-600/70 bg-slate-950/80 text-slate-100"
                          aria-hidden="true"
                        >
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
                        <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-100">
                          {previewVolume}%
                        </span>
                      </div>
                    </div>
                  )}

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
};

export default HistoryReplayCompactView;
