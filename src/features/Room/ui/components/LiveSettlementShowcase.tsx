
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Chip } from "@mui/material";

import { trackEvent } from "../../../../shared/analytics/track";
import { useSettingsModel } from "../../../Setting/model/settingsContext";
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

type LiveSettlementTab = "overview" | "recommend";
type RecommendCategory = "quick" | "confuse" | "hard";

type ExtendedRecap = SettlementQuestionRecap & {
  provider?: string;
  sourceId?: string | null;
  videoId?: string;
  url?: string;
};

type RecommendationCard = {
  recap: ExtendedRecap;
  hint: string;
  emphasis: string;
  link: SettlementTrackLink;
  providerLabel: string;
  previewUrl: string | null;
};

interface LiveSettlementShowcaseProps {
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
  upcomingGameStartAt?: number | null;
  nowMs?: number;
  onBackToLobby?: () => void;
  onRequestExit?: () => void;
}

const TAB_ORDER: LiveSettlementTab[] = ["overview", "recommend"];

const TAB_LABELS: Record<LiveSettlementTab, string> = {
  overview: "總覽",
  recommend: "推薦 + 題目回顧",
};

const TAB_HINTS: Record<LiveSettlementTab, string> = {
  overview: "先看本局勝負與個人表現",
  recommend: "邊聽推薦、邊查看全員作答回顧",
};

const RECAPS_PER_PAGE = 12;
const RECOMMEND_PREVIEW_SECONDS = 15;
const RECOMMEND_MAX_ITEMS = 5;
const RECOMMEND_CATEGORY_FLOW: RecommendCategory[] = ["quick", "confuse", "hard"];

const MULTILINE_ELLIPSIS_2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const MULTILINE_ELLIPSIS_3: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const RESULT_META: Record<
  "correct" | "wrong" | "unanswered",
  { label: string; badgeClass: string }
> = {
  correct: {
    label: "答對",
    badgeClass:
      "border-emerald-300/45 bg-emerald-500/18 text-emerald-50",
  },
  wrong: {
    label: "答錯",
    badgeClass:
      "border-rose-300/45 bg-rose-500/18 text-rose-50",
  },
  unanswered: {
    label: "未作答",
    badgeClass:
      "border-slate-400/55 bg-slate-700/55 text-slate-100",
  },
};

const AUTO_PREVIEW_STORAGE_KEY = "mq_settlement_auto_preview";

const readStoredBoolean = (key: string, fallback: boolean) => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
};

const resolveParticipantAnswer = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
  meClientId?: string,
) => {
  if (!participantClientId) {
    return {
      choiceIndex: null as number | null,
      result: "unanswered" as SettlementQuestionRecap["myResult"],
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
    const fallbackChoiceIndex =
      typeof recap.myChoiceIndex === "number" ? recap.myChoiceIndex : null;
    const fallbackResult: SettlementQuestionRecap["myResult"] =
      fallbackChoiceIndex === null
        ? "unanswered"
        : fallbackChoiceIndex === recap.correctChoiceIndex
          ? "correct"
          : "wrong";
    return {
      choiceIndex: fallbackChoiceIndex,
      result: fallbackResult,
      answeredAtMs: null as number | null,
    };
  }
  return {
    choiceIndex: null as number | null,
    result: "unanswered" as SettlementQuestionRecap["myResult"],
    answeredAtMs: null as number | null,
  };
};

const resolveParticipantResult = (
  recap: SettlementQuestionRecap,
  participantClientId: string | null,
  meClientId?: string,
): "correct" | "wrong" | "unanswered" => {
  const answer = resolveParticipantAnswer(recap, participantClientId, meClientId);
  if (answer.result === "correct" || answer.result === "wrong") {
    return answer.result;
  }
  if (typeof answer.choiceIndex !== "number") return "unanswered";
  return answer.choiceIndex === recap.correctChoiceIndex ? "correct" : "wrong";
};

const formatElapsed = (startedAt?: number, endedAt?: number) => {
  if (!startedAt || !endedAt || endedAt <= startedAt) return null;
  const totalSeconds = Math.floor((endedAt - startedAt) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatMs = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "--";
  }
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
};

const formatPercent = (value: number) => `${Math.round(Math.max(0, value) * 100)}%`;

const resolveRecapTrack = (
  recap: ExtendedRecap,
  playlistItems: PlaylistItem[],
): PlaylistItem | null => {
  const direct = playlistItems[recap.trackIndex];
  return direct ?? null;
};

const resolveParticipantCount = (
  recap: SettlementQuestionRecap,
  fallbackCount: number,
) => {
  const count =
    typeof recap.participantCount === "number" &&
    Number.isFinite(recap.participantCount)
      ? recap.participantCount
      : fallbackCount;
  return Math.max(1, count);
};

const buildFallbackRecaps = (
  playlistItems: PlaylistItem[],
  trackOrder: number[],
): ExtendedRecap[] =>
  trackOrder.map((trackIndex, index) => {
    const item = playlistItems[trackIndex];
    const title =
      item?.answerText?.trim() ||
      item?.title?.trim() ||
      `第 ${index + 1} 題`;
    const uploader = item?.uploader?.trim() || "Unknown";
    const choices = trackOrder.slice(0, 4).map((choiceTrackIndex, choiceIndex) => {
      const choiceItem = playlistItems[choiceTrackIndex];
      const choiceTitle =
        choiceItem?.answerText?.trim() ||
        choiceItem?.title?.trim() ||
        `選項 ${choiceIndex + 1}`;
      return {
        index: choiceIndex,
        title: choiceTitle,
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

const extractYouTubeId = (
  sourceId?: string | null,
  videoId?: string | null,
  url?: string | null,
): string | null => {
  if (sourceId?.trim()) return sourceId.trim();
  if (videoId?.trim()) return videoId.trim();
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;
  const m1 = raw.match(/[?&]v=([^&]+)/);
  if (m1?.[1]) return m1[1];
  const m2 = raw.match(/youtu\.be\/([^?&]+)/);
  if (m2?.[1]) return m2[1];
  const m3 = raw.match(/youtube\.com\/embed\/([^?&]+)/);
  if (m3?.[1]) return m3[1];
  return null;
};

const resolvePreviewEmbedUrl = (
  recap: ExtendedRecap,
  link: SettlementTrackLink,
): string | null => {
  const provider = (recap.provider || link.provider || "").toLowerCase();
  if (provider === "youtube") {
    const id = extractYouTubeId(recap.sourceId, recap.videoId, recap.url || link.href);
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
  }
  return null;
};

const buildRecommendationLink = (recap: ExtendedRecap) =>
  resolveSettlementTrackLink({
    provider: recap.provider,
    sourceId: recap.sourceId,
    videoId: recap.videoId,
    url: recap.url ?? "",
    title: recap.title ?? "",
    answerText: recap.title ?? "",
    uploader: recap.uploader,
  });

const buildRecommendationCard = (
  recap: ExtendedRecap,
  hint: string,
  emphasis: string,
): RecommendationCard => {
  const link = buildRecommendationLink(recap);
  const providerLabel =
    link.providerLabel ||
    ((recap.provider ?? "").trim() ? (recap.provider ?? "").trim().toUpperCase() : "Unknown");
  return {
    recap,
    hint,
    emphasis,
    link,
    providerLabel,
    previewUrl: link ? resolvePreviewEmbedUrl(recap, link) : null,
  };
};

const LiveSettlementShowcase: React.FC<LiveSettlementShowcaseProps> = ({
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
  upcomingGameStartAt = null,
  nowMs,
  onBackToLobby,
  onRequestExit,
}) => {
  const getChangedAnswerCount = (answer: unknown): number => {
    if (!answer || typeof answer !== "object") return 0;
    const value = (answer as { changedAnswerCount?: number }).changedAnswerCount;
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const {
    gameVolume,
    sfxEnabled,
    sfxVolume,
    settlementPreviewSyncGameVolume,
    settlementPreviewVolume,
  } = useSettingsModel();
  const [activeTab, setActiveTab] = useState<LiveSettlementTab>("overview");
  const [recommendCategory, setRecommendCategory] = useState<RecommendCategory>("quick");
  const [recommendIndex, setRecommendIndex] = useState(0);
  const [autoPreviewEnabled, setAutoPreviewEnabled] = useState(() =>
    readStoredBoolean(AUTO_PREVIEW_STORAGE_KEY, true),
  );
  const [previewCountdownSec, setPreviewCountdownSec] = useState(
    RECOMMEND_PREVIEW_SECONDS,
  );
  const [autoAdvanceAtMs, setAutoAdvanceAtMs] = useState<number | null>(null);
  const [selectedRecapKey, setSelectedRecapKey] = useState<string | null>(null);
  const [previewRecapKey, setPreviewRecapKey] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(true);
  const [tabRenderKey, setTabRenderKey] = useState(0);
  const [tickerNowMs, setTickerNowMs] = useState(() => Date.now());
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const recommendSectionRef = useRef<HTMLElement | null>(null);
  const recommendPreviewStageRef = useRef<HTMLDivElement | null>(null);
  const celebrationKeyRef = useRef<string | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const hasAutoCenteredRecommendRef = useRef(false);
  const previewVolumeRetryTimersRef = useRef<number[]>([]);

  const stepIndex = TAB_ORDER.indexOf(activeTab);
  const sortedParticipants = useMemo(
    () =>
      participants
        .slice()
        .sort((a, b) => b.score - a.score || (b.correctCount ?? 0) - (a.correctCount ?? 0)),
    [participants],
  );

  const winner = sortedParticipants[0] ?? null;
  const runnerUp = sortedParticipants[1] ?? null;
  const thirdPlace = sortedParticipants[2] ?? null;

  const me = meClientId
    ? sortedParticipants.find((participant) => participant.clientId === meClientId) ?? null
    : null;
  const myRank = meClientId
    ? sortedParticipants.findIndex((participant) => participant.clientId === meClientId) + 1
    : 0;
  const [selectedReviewParticipantClientId, setSelectedReviewParticipantClientId] =
    useState<string | null>(() => {
      if (meClientId) return meClientId;
      return sortedParticipants[0]?.clientId ?? null;
    });
  const effectiveSelectedReviewParticipantClientId = useMemo(() => {
    if (!sortedParticipants.length) return null;
    if (
      selectedReviewParticipantClientId &&
      sortedParticipants.some(
        (participant) => participant.clientId === selectedReviewParticipantClientId,
      )
    ) {
      return selectedReviewParticipantClientId;
    }
    if (
      meClientId &&
      sortedParticipants.some((participant) => participant.clientId === meClientId)
    ) {
      return meClientId;
    }
    return sortedParticipants[0]?.clientId ?? null;
  }, [meClientId, selectedReviewParticipantClientId, sortedParticipants]);
  const topAccuracyEntry = useMemo(() => {
    if (playedQuestionCount <= 0) return null;
    const ranked = sortedParticipants
      .map((participant) => {
        const correctCount = Math.max(0, participant.correctCount ?? 0);
        return {
          participant,
          correctCount,
          accuracy: correctCount / playedQuestionCount,
        };
      })
      .sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        return b.participant.score - a.participant.score;
      });
    return ranked[0] ?? null;
  }, [playedQuestionCount, sortedParticipants]);
  const topComboEntry = useMemo(() => {
    const ranked = sortedParticipants
      .map((participant) => ({
        participant,
        combo: Math.max(participant.maxCombo ?? 0, participant.combo),
      }))
      .sort((a, b) => {
        if (b.combo !== a.combo) return b.combo - a.combo;
        return b.participant.score - a.participant.score;
      });
    return ranked[0] ?? null;
  }, [sortedParticipants]);
  const fastestAverageAnswerEntry = useMemo(() => {
    const ranked = sortedParticipants
      .flatMap((participant) => {
        const avgCorrectMs =
          typeof participant.avgCorrectMs === "number" &&
          Number.isFinite(participant.avgCorrectMs) &&
          participant.avgCorrectMs >= 0
            ? participant.avgCorrectMs
            : null;
        const correctCount = Math.max(0, participant.correctCount ?? 0);
        if (avgCorrectMs === null || correctCount <= 0) return [];
        return [{ participant, ms: avgCorrectMs, correctCount }];
      })
      .sort((a, b) => {
        if (a.ms !== b.ms) return a.ms - b.ms;
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        return b.participant.score - a.participant.score;
      });
    return ranked[0] ?? null;
  }, [sortedParticipants]);

  const participantScoreMeta = useMemo(() => {
    const rows = sortedParticipants.map((participant) => {
      const correct = Math.max(0, participant.correctCount ?? 0);
      const accuracy = playedQuestionCount > 0 ? correct / playedQuestionCount : 0;
      const avgSpeedMs =
        typeof participant.avgCorrectMs === "number" &&
        Number.isFinite(participant.avgCorrectMs) &&
        participant.avgCorrectMs >= 0
          ? participant.avgCorrectMs
          : null;
      const combo = Math.max(participant.maxCombo ?? 0, participant.combo);
      return {
        participant,
        accuracy,
        avgSpeedMs,
        combo,
      };
    });

    const maxAccuracy = rows.reduce(
      (max, row) => Math.max(max, row.accuracy),
      0,
    );
    const maxCombo = rows.reduce((max, row) => Math.max(max, row.combo), 0);
    const fastestAvgSpeedMs = rows.reduce<number | null>((min, row) => {
      if (row.avgSpeedMs === null) return min;
      if (min === null) return row.avgSpeedMs;
      return Math.min(min, row.avgSpeedMs);
    }, null);

    const titleByClientId: Record<string, string> = {};
    rows.forEach((row, idx) => {
      if (idx === 0) {
        titleByClientId[row.participant.clientId] = "冠軍";
        return;
      }
      if (maxAccuracy > 0 && Math.abs(row.accuracy - maxAccuracy) < 0.00001) {
        titleByClientId[row.participant.clientId] = "高命中";
        return;
      }
      if (maxCombo > 0 && row.combo === maxCombo) {
        titleByClientId[row.participant.clientId] = "連擊王";
        return;
      }
      if (
        fastestAvgSpeedMs !== null &&
        row.avgSpeedMs !== null &&
        row.avgSpeedMs === fastestAvgSpeedMs
      ) {
        titleByClientId[row.participant.clientId] = "快手";
        return;
      }
      titleByClientId[row.participant.clientId] = "穩定";
    });

    return {
      byClientId: titleByClientId,
      metricsByClientId: rows.reduce<
        Record<string, { accuracy: number; avgSpeedMs: number | null; combo: number }>
      >((acc, row) => {
        acc[row.participant.clientId] = {
          accuracy: row.accuracy,
          avgSpeedMs: row.avgSpeedMs,
          combo: row.combo,
        };
        return acc;
      }, {}),
    };
  }, [playedQuestionCount, sortedParticipants]);

  useEffect(() => {
    if (typeof nowMs === "number" && Number.isFinite(nowMs)) return;
    const timer = window.setInterval(() => {
      setTickerNowMs(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, [nowMs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      AUTO_PREVIEW_STORAGE_KEY,
      autoPreviewEnabled ? "1" : "0",
    );
  }, [autoPreviewEnabled]);

  const effectivePreviewVolume = settlementPreviewSyncGameVolume
    ? gameVolume
    : settlementPreviewVolume;

  useEffect(() => {
    if (!sfxEnabled) return;
    if (typeof window === "undefined") return;
    const celebrationKey = `${room.id}:${startedAt ?? 0}`;
    if (celebrationKeyRef.current === celebrationKey) return;
    celebrationKeyRef.current = celebrationKey;
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const gain = ctx.createGain();
    gain.gain.value =
      Math.max(0, Math.min(1, sfxVolume / 100)) *
      Math.max(0, Math.min(1, gameVolume / 100)) *
      0.06;
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const notes = [587.33, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = now + idx * 0.12;
      const stop = start + 0.1;
      osc.start(start);
      osc.stop(stop);
    });
    const closeTimer = window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 700);
    return () => {
      window.clearTimeout(closeTimer);
      void ctx.close().catch(() => undefined);
    };
  }, [gameVolume, room.id, startedAt, sfxEnabled, sfxVolume]);

  const postYouTubeCommand = useCallback(
    (func: string, args: unknown[] = []) => {
      const contentWindow = previewIframeRef.current?.contentWindow;
      if (!contentWindow) return;
      contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*",
      );
    },
    [],
  );

  const clearPreviewVolumeRetryTimers = useCallback(() => {
    previewVolumeRetryTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    previewVolumeRetryTimersRef.current = [];
  }, []);

  const syncPreviewVolume = useCallback(() => {
    if (!previewRecapKey) return;
    clearPreviewVolumeRetryTimers();
    const retryDelays = [0, 120, 360, 800];
    previewVolumeRetryTimersRef.current = retryDelays.map((delay) =>
      window.setTimeout(() => {
        postYouTubeCommand("setVolume", [effectivePreviewVolume]);
      }, delay),
    );
  }, [
    clearPreviewVolumeRetryTimers,
    effectivePreviewVolume,
    postYouTubeCommand,
    previewRecapKey,
  ]);

  useEffect(() => {
    if (!previewRecapKey) return;
    syncPreviewVolume();
    return clearPreviewVolumeRetryTimers;
  }, [
    clearPreviewVolumeRetryTimers,
    effectivePreviewVolume,
    previewRecapKey,
    syncPreviewVolume,
  ]);

  useEffect(
    () => () => {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
      }
      clearPreviewVolumeRetryTimers();
    },
    [clearPreviewVolumeRetryTimers],
  );

  const normalizedRecaps = useMemo<ExtendedRecap[]>(() => {
    if (questionRecaps.length > 0) {
      return questionRecaps.map((recap) => {
        const item = resolveRecapTrack(recap as ExtendedRecap, playlistItems);
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

  const reviewRecapSummary = useMemo(() => {
    const summary = {
      correct: 0,
      wrong: 0,
      unanswered: 0,
    };
    for (const recap of normalizedRecaps) {
      const result = resolveParticipantResult(
        recap,
        effectiveSelectedReviewParticipantClientId,
        meClientId,
      );
      summary[result] += 1;
    }
    return summary;
  }, [effectiveSelectedReviewParticipantClientId, meClientId, normalizedRecaps]);

  const reviewPageCount = Math.max(
    1,
    Math.ceil(normalizedRecaps.length / RECAPS_PER_PAGE),
  );
  const safeReviewPage = Math.min(reviewPage, Math.max(0, reviewPageCount - 1));

  const pagedRecaps = useMemo(() => {
    const start = safeReviewPage * RECAPS_PER_PAGE;
    return normalizedRecaps.slice(start, start + RECAPS_PER_PAGE);
  }, [normalizedRecaps, safeReviewPage]);

  const effectiveSelectedRecapKey =
    selectedRecapKey && pagedRecaps.some((item) => item.key === selectedRecapKey)
      ? selectedRecapKey
      : (pagedRecaps[0]?.key ?? null);

  const selectedRecap = useMemo(() => {
    if (!normalizedRecaps.length) return null;
    if (!effectiveSelectedRecapKey) return normalizedRecaps[0];
    return (
      normalizedRecaps.find((recap) => recap.key === effectiveSelectedRecapKey) ??
      normalizedRecaps[0]
    );
  }, [effectiveSelectedRecapKey, normalizedRecaps]);
  const selectedRecapAnswer = useMemo<{
    choiceIndex: number | null;
    result: "correct" | "wrong" | "unanswered";
    answeredAtMs: number | null;
  }>(() => {
    if (!selectedRecap) {
      return {
        choiceIndex: null as number | null,
        result: "unanswered" as "correct" | "wrong" | "unanswered",
        answeredAtMs: null as number | null,
      };
    }
    const answer = resolveParticipantAnswer(
      selectedRecap,
      effectiveSelectedReviewParticipantClientId,
      meClientId,
    );
    return {
      choiceIndex:
        typeof answer.choiceIndex === "number" ? answer.choiceIndex : null,
      result:
        answer.result === "correct" || answer.result === "wrong"
          ? answer.result
          : "unanswered",
      answeredAtMs:
        typeof answer.answeredAtMs === "number" ? answer.answeredAtMs : null,
    };
  }, [effectiveSelectedReviewParticipantClientId, meClientId, selectedRecap]);
  const reviewContextTransitionKey = `${effectiveSelectedReviewParticipantClientId ?? "none"}:${safeReviewPage}`;
  const reviewDetailTransitionKey = `${reviewContextTransitionKey}:${selectedRecap?.key ?? "none"}`;
  const selectedReviewParticipant = effectiveSelectedReviewParticipantClientId
    ? sortedParticipants.find(
        (participant) => participant.clientId === effectiveSelectedReviewParticipantClientId,
      ) ?? null
    : null;
  const selectedReviewParticipantRank = effectiveSelectedReviewParticipantClientId
    ? sortedParticipants.findIndex(
        (participant) => participant.clientId === effectiveSelectedReviewParticipantClientId,
      ) + 1
    : 0;
  const selectedReviewParticipantIndex = effectiveSelectedReviewParticipantClientId
    ? sortedParticipants.findIndex(
        (participant) => participant.clientId === effectiveSelectedReviewParticipantClientId,
      )
    : -1;

  const goPrevReviewParticipant = useCallback(() => {
    if (sortedParticipants.length <= 1) return;
    const currentIndex =
      selectedReviewParticipantIndex >= 0 ? selectedReviewParticipantIndex : 0;
    const nextIndex =
      (currentIndex - 1 + sortedParticipants.length) % sortedParticipants.length;
    setSelectedReviewParticipantClientId(sortedParticipants[nextIndex]?.clientId ?? null);
  }, [selectedReviewParticipantIndex, sortedParticipants]);

  const goNextReviewParticipant = useCallback(() => {
    if (sortedParticipants.length <= 1) return;
    const currentIndex =
      selectedReviewParticipantIndex >= 0 ? selectedReviewParticipantIndex : 0;
    const nextIndex = (currentIndex + 1) % sortedParticipants.length;
    setSelectedReviewParticipantClientId(sortedParticipants[nextIndex]?.clientId ?? null);
  }, [selectedReviewParticipantIndex, sortedParticipants]);

  const defaultParticipantCount = Math.max(1, participants.length);

  const quickRecommendations = useMemo(() => {
    return normalizedRecaps
      .map((recap) => {
        const participantCount = resolveParticipantCount(recap, defaultParticipantCount);
        const correctCount = Math.max(0, recap.correctCount ?? 0);
        const correctRate = correctCount / participantCount;
        const speed = typeof recap.fastestCorrectMs === "number" ? recap.fastestCorrectMs : 120_000;
        return { recap, correctRate, speed };
      })
      .sort(
        (a, b) =>
          b.correctRate - a.correctRate || a.speed - b.speed || a.recap.order - b.recap.order,
      );
  }, [defaultParticipantCount, normalizedRecaps]);

  const confuseRecommendations = useMemo(() => {
    return normalizedRecaps
      .map((recap) => {
        const answers = recap.answersByClientId
          ? Object.values(recap.answersByClientId)
          : [];
        const changedUsersFromAnswers = answers.filter(
          (answer) => getChangedAnswerCount(answer) > 0,
        ).length;
        const changedTimesFromAnswers = answers.reduce(
          (sum, answer) => sum + getChangedAnswerCount(answer),
          0,
        );
        const changedUsers = Math.max(
          changedUsersFromAnswers,
          Math.max(0, recap.changedAnswerUserCount ?? 0),
        );
        const changedTimes = Math.max(
          changedTimesFromAnswers,
          Math.max(0, recap.changedAnswerCount ?? 0),
        );
        const participantCount = resolveParticipantCount(recap, defaultParticipantCount);
        const confusionRate =
          participantCount > 0 ? changedUsers / participantCount : 0;
        return { recap, changedUsers, changedTimes, confusionRate };
      })
      .sort(
        (a, b) =>
          b.changedUsers - a.changedUsers ||
          b.changedTimes - a.changedTimes ||
          b.confusionRate - a.confusionRate ||
          a.recap.order - b.recap.order,
      );
  }, [defaultParticipantCount, normalizedRecaps]);

  const hardRecommendations = useMemo(() => {
    return normalizedRecaps
      .map((recap) => {
        const participantCount = resolveParticipantCount(recap, defaultParticipantCount);
        const wrongCount = Math.max(0, recap.wrongCount ?? 0);
        const unansweredCount = Math.max(0, recap.unansweredCount ?? 0);
        const hardScore = (wrongCount + unansweredCount * 1.2) / participantCount;
        return { recap, hardScore };
      })
      .sort((a, b) => b.hardScore - a.hardScore || a.recap.order - b.recap.order);
  }, [defaultParticipantCount, normalizedRecaps]);

  const recommendationCardsByCategory = useMemo<
    Record<RecommendCategory, RecommendationCard[]>
  >(() => {
    const totalLimit = Math.min(RECOMMEND_MAX_ITEMS, normalizedRecaps.length);
    const result: Record<RecommendCategory, RecommendationCard[]> = {
      quick: [],
      confuse: [],
      hard: [],
    };
    if (totalLimit <= 0) return result;

    const rowsByCategory = {
      quick: quickRecommendations,
      confuse: confuseRecommendations,
      hard: hardRecommendations,
    };
    const availableCategories = RECOMMEND_CATEGORY_FLOW.filter(
      (category) => rowsByCategory[category].length > 0,
    );
    if (!availableCategories.length) return result;

    const quickStrength =
      quickRecommendations.length > 0
        ? quickRecommendations.slice(0, 3).reduce((sum, row) => {
            const speedBonus =
              row.speed <= 1200 ? 0.28 : row.speed <= 2200 ? 0.2 : row.speed <= 4200 ? 0.1 : 0;
            return sum + row.correctRate + speedBonus;
          }, 0) / Math.min(3, quickRecommendations.length)
        : 0;
    const confuseStrength =
      confuseRecommendations.length > 0
        ? confuseRecommendations.slice(0, 3).reduce((sum, row) => {
            return sum + row.changedUsers * 0.7 + row.changedTimes * 0.3 + row.confusionRate;
          }, 0) / Math.min(3, confuseRecommendations.length)
        : 0;
    const hardStrength =
      hardRecommendations.length > 0
        ? hardRecommendations.slice(0, 3).reduce((sum, row) => sum + row.hardScore, 0) /
          Math.min(3, hardRecommendations.length)
        : 0;
    const strengthByCategory: Record<RecommendCategory, number> = {
      quick: quickStrength,
      confuse: confuseStrength,
      hard: hardStrength,
    };

    const quotas: Record<RecommendCategory, number> = { quick: 0, confuse: 0, hard: 0 };
    let remaining = totalLimit;

    for (const category of availableCategories) {
      if (remaining <= 0) break;
      quotas[category] += 1;
      remaining -= 1;
    }

    while (remaining > 0) {
      const nextTarget = availableCategories
        .map((category) => {
          const maxCount = rowsByCategory[category].length;
          if (quotas[category] >= maxCount) return null;
          const scarcityWeight = 1 / (1 + quotas[category] * 0.65);
          const flowPriority =
            (RECOMMEND_CATEGORY_FLOW.length -
              RECOMMEND_CATEGORY_FLOW.indexOf(category)) *
            0.01;
          return {
            category,
            score: strengthByCategory[category] * scarcityWeight + flowPriority,
          };
        })
        .filter(
          (
            candidate,
          ): candidate is {
            category: RecommendCategory;
            score: number;
          } => candidate !== null,
        )
        .sort((a, b) => b.score - a.score)[0];
      if (!nextTarget) break;
      quotas[nextTarget.category] += 1;
      remaining -= 1;
    }

    const usedRecapKeys = new Set<string>();
    const addQuickEntry = (entry: (typeof quickRecommendations)[number]) => {
      if (usedRecapKeys.has(entry.recap.key)) return false;
      usedRecapKeys.add(entry.recap.key);
      result.quick.push(
        buildRecommendationCard(
          entry.recap,
          `答對率 ${formatPercent(entry.correctRate)}`,
          `最快答對 ${formatMs(entry.recap.fastestCorrectMs)}`,
        ),
      );
      return true;
    };
    const addConfuseEntry = (entry: (typeof confuseRecommendations)[number]) => {
      if (usedRecapKeys.has(entry.recap.key)) return false;
      usedRecapKeys.add(entry.recap.key);
      result.confuse.push(
        buildRecommendationCard(
          entry.recap,
          `換答案 ${entry.changedUsers} 人 · ${entry.changedTimes} 次`,
          "最容易混淆",
        ),
      );
      return true;
    };
    const addHardEntry = (entry: (typeof hardRecommendations)[number]) => {
      if (usedRecapKeys.has(entry.recap.key)) return false;
      usedRecapKeys.add(entry.recap.key);
      result.hard.push(
        buildRecommendationCard(
          entry.recap,
          `答錯 ${entry.recap.wrongCount ?? 0} · 未作答 ${entry.recap.unansweredCount ?? 0}`,
          "高難保留題",
        ),
      );
      return true;
    };

    for (const row of quickRecommendations) {
      if (result.quick.length >= quotas.quick) break;
      addQuickEntry(row);
    }
    for (const row of confuseRecommendations) {
      if (result.confuse.length >= quotas.confuse) break;
      addConfuseEntry(row);
    }
    for (const row of hardRecommendations) {
      if (result.hard.length >= quotas.hard) break;
      addHardEntry(row);
    }

    const pickedCount =
      result.quick.length + result.confuse.length + result.hard.length;
    if (pickedCount < totalLimit) {
      for (const category of RECOMMEND_CATEGORY_FLOW) {
        if (category === "quick") {
          for (const row of quickRecommendations) {
            if (
              result.quick.length + result.confuse.length + result.hard.length >=
              totalLimit
            ) {
              break;
            }
            addQuickEntry(row);
          }
          continue;
        }
        if (category === "confuse") {
          for (const row of confuseRecommendations) {
            if (
              result.quick.length + result.confuse.length + result.hard.length >=
              totalLimit
            ) {
              break;
            }
            addConfuseEntry(row);
          }
          continue;
        }
        for (const row of hardRecommendations) {
          if (
            result.quick.length + result.confuse.length + result.hard.length >=
            totalLimit
          ) {
            break;
          }
          addHardEntry(row);
        }
      }
    }

    return result;
  }, [
    confuseRecommendations,
    hardRecommendations,
    normalizedRecaps.length,
    quickRecommendations,
  ]);
  const recommendationCardsByCategoryRef = useRef(recommendationCardsByCategory);
  useEffect(() => {
    recommendationCardsByCategoryRef.current = recommendationCardsByCategory;
  }, [recommendationCardsByCategory]);

  const availableRecommendCategories = useMemo(
    () =>
      RECOMMEND_CATEGORY_FLOW.filter(
        (category) => recommendationCardsByCategory[category].length > 0,
      ),
    [recommendationCardsByCategory],
  );

  const activeRecommendCategory =
    recommendationCardsByCategory[recommendCategory].length > 0
      ? recommendCategory
      : (availableRecommendCategories[0] ?? "quick");

  const recommendationCards = recommendationCardsByCategory[activeRecommendCategory];
  const safeRecommendIndex =
    recommendationCards.length > 0
      ? Math.min(recommendIndex, recommendationCards.length - 1)
      : 0;
  const currentRecommendation = recommendationCards[safeRecommendIndex] ?? null;
  const currentRecommendationLink = currentRecommendation?.link ?? null;
  const currentRecommendationPreviewUrl = currentRecommendation?.previewUrl ?? null;
  const recommendationTransitionKey = `${activeRecommendCategory}:${currentRecommendation?.recap.key ?? "none"}`;

  const getFirstAutoPlayableIndex = useCallback(
    (cards: RecommendationCard[]) => {
      if (!cards.length) return 0;
      const previewIndex = cards.findIndex((card) => Boolean(card.previewUrl));
      return previewIndex >= 0 ? previewIndex : 0;
    },
    [],
  );

  const jumpToRecommendation = useCallback(
    (
      nextCategory: RecommendCategory,
      nextIndex: number,
      options?: { forcePreview?: boolean },
    ) => {
      const nextCards = recommendationCardsByCategoryRef.current[nextCategory];
      if (!nextCards.length) {
        setPreviewRecapKey(null);
        return;
      }
      const safeIndex = Math.max(0, Math.min(nextIndex, nextCards.length - 1));
      const targetCard = nextCards[safeIndex];
      setRecommendCategory(nextCategory);
      setRecommendIndex(safeIndex);
      setSelectedRecapKey(targetCard?.recap.key ?? null);
      setPreviewCountdownSec(RECOMMEND_PREVIEW_SECONDS);
      if (autoPreviewEnabled || options?.forcePreview) {
        setPreviewRecapKey(targetCard?.previewUrl ? targetCard.recap.key : null);
        setAutoAdvanceAtMs(
          autoPreviewEnabled ? Date.now() + RECOMMEND_PREVIEW_SECONDS * 1000 : null,
        );
      } else {
        setPreviewRecapKey(null);
        setAutoAdvanceAtMs(null);
      }
    },
    [autoPreviewEnabled],
  );

  const jumpToRecapPreview = useCallback(
    (recap: ExtendedRecap) => {
      for (const category of RECOMMEND_CATEGORY_FLOW) {
        const cards = recommendationCardsByCategoryRef.current[category];
        const targetIndex = cards.findIndex((card) => card.recap.key === recap.key);
        if (targetIndex < 0) continue;
        jumpToRecommendation(category, targetIndex, { forcePreview: true });
        return true;
      }
      return false;
    },
    [jumpToRecommendation],
  );

  const activateRecommendationCategory = useCallback(
    (nextCategory: RecommendCategory) => {
      const nextCards = recommendationCardsByCategory[nextCategory];
      if (!nextCards.length) return;
      const nextIndex = getFirstAutoPlayableIndex(nextCards);
      jumpToRecommendation(nextCategory, nextIndex);
    },
    [getFirstAutoPlayableIndex, jumpToRecommendation, recommendationCardsByCategory],
  );

  const goPrevRecommendation = () => {
    const total = recommendationCards.length;
    if (total <= 0) return;
    const next = (Math.min(recommendIndex, total - 1) - 1 + total) % total;
    jumpToRecommendation(activeRecommendCategory, next);
  };

  const goNextRecommendation = () => {
    const total = recommendationCards.length;
    if (total <= 0) return;
    const next = (Math.min(recommendIndex, total - 1) + 1) % total;
    jumpToRecommendation(activeRecommendCategory, next);
  };

  const elapsedLabel = formatElapsed(startedAt, endedAt);

  const gameEndTime = useMemo(() => {
    if (typeof endedAt === "number" && Number.isFinite(endedAt) && endedAt > 0) {
      return endedAt;
    }
    return messages[messages.length - 1]?.timestamp;
  }, [endedAt, messages]);

  const settlementStartGuard = useMemo(() => {
    if (!upcomingGameStartAt || !Number.isFinite(upcomingGameStartAt)) {
      return {
        isPending: false,
        remainingMs: 0,
        remainingSec: 0,
        warnMode: false,
      };
    }
    const effectiveNowMs =
      typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : tickerNowMs;
    const remainingMs = Math.max(0, upcomingGameStartAt - effectiveNowMs);
    return {
      isPending: remainingMs > 0,
      remainingMs,
      remainingSec: Math.ceil(remainingMs / 1000),
      warnMode: remainingMs <= 5000,
    };
  }, [nowMs, tickerNowMs, upcomingGameStartAt]);

  const handleOpenTrackLink = (link: SettlementTrackLink, recap: ExtendedRecap) => {
    if (!link.href) return;
    trackEvent("settlement_outbound_click", {
      surface: "settlement",
      provider: link.provider,
      link_type: link.linkType,
      room_id: room.id,
      track_order: recap.order,
      source_id: link.sourceId ?? "",
    });
    window.open(link.href, "_blank", "noopener,noreferrer");
  };

  const handleOpenRecommendationTitle = () => {
    if (!currentRecommendation || !currentRecommendationLink) return;
    handleOpenTrackLink(currentRecommendationLink, currentRecommendation.recap);
  };

  const goToTab = (tab: LiveSettlementTab) => {
    setTabRenderKey((prev) => prev + 1);
    setActiveTab(tab);
    if (tab === "recommend") {
      setReviewPage(0);
      activateRecommendationCategory(recommendCategory);
      return;
    }
    setPreviewRecapKey(null);
    setAutoAdvanceAtMs(null);
    setPreviewCountdownSec(RECOMMEND_PREVIEW_SECONDS);
  };

  const goNextStep = () => {
    if (stepIndex < TAB_ORDER.length - 1) {
      goToTab(TAB_ORDER[stepIndex + 1]);
      return;
    }
    onBackToLobby?.();
  };

  const goPrevStep = () => {
    if (stepIndex <= 0) return;
    goToTab(TAB_ORDER[stepIndex - 1]);
  };

  const currentRecommendationHint = currentRecommendation?.hint ?? "";

  const isCurrentRecommendationPreviewOpen =
    Boolean(currentRecommendation) &&
    previewRecapKey === currentRecommendation?.recap.key;
  const canAutoGuideLoop =
    activeTab === "recommend" &&
    autoPreviewEnabled &&
    recommendationCards.length > 0 &&
    availableRecommendCategories.length > 0;

  const advanceAutoRecommendationLoop = useCallback(() => {
    if (!canAutoGuideLoop) return;
    const currentCards = recommendationCardsByCategoryRef.current[activeRecommendCategory];
    if (currentCards.length <= 0) return;
    if (safeRecommendIndex < currentCards.length - 1) {
      jumpToRecommendation(activeRecommendCategory, safeRecommendIndex + 1);
      return;
    }
    const currentFlowIdx = RECOMMEND_CATEGORY_FLOW.indexOf(activeRecommendCategory);
    for (let offset = 1; offset <= RECOMMEND_CATEGORY_FLOW.length; offset += 1) {
      const category =
        RECOMMEND_CATEGORY_FLOW[
          (currentFlowIdx + offset + RECOMMEND_CATEGORY_FLOW.length) %
            RECOMMEND_CATEGORY_FLOW.length
        ];
      const cards = recommendationCardsByCategoryRef.current[category];
      if (cards.length <= 0) continue;
      const nextIndex = getFirstAutoPlayableIndex(cards);
      jumpToRecommendation(category, nextIndex);
      return;
    }
  }, [
    activeRecommendCategory,
    canAutoGuideLoop,
    getFirstAutoPlayableIndex,
    jumpToRecommendation,
    safeRecommendIndex,
  ]);

  useEffect(() => {
    if (!canAutoGuideLoop || autoAdvanceAtMs === null) {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      return;
    }
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    const remainingMs = Math.max(0, autoAdvanceAtMs - Date.now());
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      autoAdvanceTimeoutRef.current = null;
      advanceAutoRecommendationLoop();
    }, remainingMs);
    return () => {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [advanceAutoRecommendationLoop, autoAdvanceAtMs, canAutoGuideLoop]);

  useEffect(() => {
    if (!canAutoGuideLoop || autoAdvanceAtMs === null) return;
    const updateCountdown = () => {
      const remainingMs = Math.max(0, autoAdvanceAtMs - Date.now());
      setPreviewCountdownSec(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 200);
    return () => window.clearInterval(timer);
  }, [autoAdvanceAtMs, canAutoGuideLoop]);

  useEffect(() => {
    if (activeTab !== "recommend") return;
    if (typeof window === "undefined") return;
    if (hasAutoCenteredRecommendRef.current) return;
    const media = window.matchMedia("(max-width: 1023px)");
    if (!media.matches) return;
    hasAutoCenteredRecommendRef.current = true;
    const timer = window.setTimeout(() => {
      const target = recommendPreviewStageRef.current ?? recommendSectionRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [activeTab]);

  const activeTabButtonClass = (tab: LiveSettlementTab) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
      activeTab === tab
        ? "border-amber-300/60 bg-amber-300/15 text-amber-100"
        : "border-slate-500/60 bg-slate-900/60 text-slate-300"
    }`;

  const progressPercent = Math.round(((stepIndex + 1) / TAB_ORDER.length) * 100);

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 px-2 pb-4 sm:px-4">
      <section className="relative min-w-0 overflow-hidden rounded-[30px] border border-amber-400/35 bg-slate-950/95 px-4 py-6 shadow-[0_30px_120px_-60px_rgba(245,158,11,0.6)] sm:px-6 sm:py-7">
        <style>
          {`
            @keyframes settlementStageEnter {
              0% { opacity: 0; transform: translateY(10px) scale(0.996); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes settlementChampionGlow {
              0% { box-shadow: 0 0 0 0 rgba(251,191,36,0.0), 0 18px 46px -24px rgba(251,191,36,0.6); }
              50% { box-shadow: 0 0 0 3px rgba(251,191,36,0.18), 0 24px 58px -24px rgba(251,191,36,0.75); }
              100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.0), 0 18px 46px -24px rgba(251,191,36,0.6); }
            }
            @keyframes settlementChampionSpark {
              0% { opacity: 0; transform: translateY(5px) scale(0.75); }
              30% { opacity: 0.95; transform: translateY(0) scale(1); }
              100% { opacity: 0; transform: translateY(-12px) scale(0.82); }
            }
            @keyframes settlementCrownFloat {
              0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.95; }
              50% { transform: translateX(-50%) translateY(-4px); opacity: 1; }
            }
            @keyframes settlementSwapIn {
              0% { opacity: 0; transform: translateY(8px) scale(0.99); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}
        </style>
        <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative space-y-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200">
                Match Settlement
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
                對戰結算
              </h2>
              <p className="mt-1 truncate text-sm text-slate-300">
                {room.name}
                {room.playlist.title ? ` · ${room.playlist.title}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                size="small"
                label={`題數 ${playedQuestionCount}`}
                variant="outlined"
                className="border-amber-300/40 text-amber-100"
              />
              <Chip
                size="small"
                label={`玩家 ${participants.length}`}
                variant="outlined"
                className="border-sky-400/45 text-sky-100"
              />
              {elapsedLabel && (
                <Chip
                  size="small"
                  label={`局長 ${elapsedLabel}`}
                  variant="outlined"
                  className="border-emerald-300/45 text-emerald-100"
                />
              )}
              {gameEndTime && (
                <Chip
                  size="small"
                  label={new Date(gameEndTime).toLocaleString()}
                  variant="outlined"
                  className="border-slate-400/50 text-slate-200"
                />
              )}
            </div>
          </header>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">結算導覽</p>
                <p className="text-sm font-semibold text-slate-100">
                  Step {stepIndex + 1}/{TAB_ORDER.length} · {TAB_HINTS[activeTab]}
                </p>
              </div>
              <div className="text-xs font-semibold text-amber-100">{progressPercent}%</div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300/90 via-amber-200 to-sky-300 transition-[width] duration-500"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {TAB_ORDER.map((tab, index) => (
              <span
                key={tab}
                className={activeTabButtonClass(tab)}
              >
                {index + 1}. {TAB_LABELS[tab]}
              </span>
            ))}
          </nav>

          <div
            key={`${activeTab}-${tabRenderKey}`}
            style={{ animation: "settlementStageEnter 320ms ease-out both" }}
          >
            {settlementStartGuard.isPending && (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  settlementStartGuard.warnMode
                    ? "border-rose-300/55 bg-rose-500/18 text-rose-50"
                    : "border-sky-300/45 bg-sky-500/15 text-sky-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    房主已啟動下一局，仍有玩家正在查看結算畫面
                  </p>
                  <span className="rounded-full border border-current/50 px-2 py-0.5 text-xs font-bold">
                    {settlementStartGuard.remainingSec}s
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-90">
                  將在 {settlementStartGuard.remainingSec} 秒後同步切回遊戲倒數，確保全員同時開始。
                </p>
              </div>
            )}
          {activeTab === "overview" && (
            <section className="grid gap-4 xl:grid-cols-[1.15fr_1.15fr]">
              <article className="relative isolate overflow-hidden rounded-2xl border border-amber-300/45 bg-[radial-gradient(circle_at_50%_-5%,rgba(250,204,21,0.24),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.96))] p-4">
                <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-72 -translate-x-1/2 bg-[radial-gradient(circle,rgba(251,191,36,0.3)_0%,rgba(251,191,36,0.08)_35%,transparent_75%)] blur-2xl" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-sky-400/15 blur-2xl" />
                <div className="relative">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-amber-200/85">
                      Podium
                    </p>
                    <span className="rounded-full border border-amber-200/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                      本局前三
                    </span>
                  </div>

                  {winner ? (
                    <>
                      <div className="mt-4 grid grid-cols-3 items-end gap-2">
                        <div className="rounded-xl border border-slate-600/70 bg-slate-900/70 p-2 text-center">
                          <p className="text-[10px] tracking-[0.15em] text-slate-300">#2</p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-100">
                            {runnerUp
                              ? `${runnerUp.username}${
                                  me && runnerUp.clientId === me.clientId ? "（我）" : ""
                                }`
                              : "--"}
                          </p>
                          <div className="mt-2 h-14 rounded-lg bg-slate-800/80 pt-2 text-sm font-bold text-slate-100">
                            {runnerUp?.score ?? "--"}
                          </div>
                        </div>
                        <div
                          className={`relative rounded-xl border border-amber-300/60 bg-amber-500/12 p-2 text-center shadow-[0_0_0_1px_rgba(252,211,77,0.25),0_18px_46px_-24px_rgba(251,191,36,0.65)] ${
                            me && winner.clientId === me.clientId
                              ? "ring-2 ring-amber-200/70"
                              : ""
                          }`}
                          style={{ animation: "settlementChampionGlow 2.2s ease-in-out infinite" }}
                        >
                          <span
                            className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 text-xl"
                            style={{ animation: "settlementCrownFloat 1.8s ease-in-out infinite" }}
                            aria-hidden
                          >
                            👑
                          </span>
                          <p className="text-[10px] tracking-[0.18em] text-amber-200">#1</p>
                          <p
                            className="mt-1 text-sm font-black text-amber-100"
                            style={MULTILINE_ELLIPSIS_2}
                          >
                            {winner.username}
                            {me && winner.clientId === me.clientId ? "（我）" : ""}
                          </p>
                          <div className="mt-2 h-20 rounded-lg bg-amber-300/20 pt-3 text-lg font-black text-amber-50">
                            {winner.score}
                          </div>
                          {[
                            { left: "16%", top: "16%", delay: "0ms" },
                            { left: "82%", top: "20%", delay: "220ms" },
                            { left: "74%", top: "72%", delay: "420ms" },
                            { left: "24%", top: "74%", delay: "640ms" },
                          ].map((spark) => (
                            <span
                              key={`${spark.left}-${spark.top}`}
                              className="pointer-events-none absolute inline-block h-1.5 w-1.5 rounded-full bg-amber-200/95"
                              style={{
                                left: spark.left,
                                top: spark.top,
                                animation: "settlementChampionSpark 1.8s ease-in-out infinite",
                                animationDelay: spark.delay,
                              }}
                            />
                          ))}
                        </div>
                        <div className="rounded-xl border border-slate-600/70 bg-slate-900/70 p-2 text-center">
                          <p className="text-[10px] tracking-[0.15em] text-slate-300">#3</p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-100">
                            {thirdPlace
                              ? `${thirdPlace.username}${
                                  me && thirdPlace.clientId === me.clientId ? "（我）" : ""
                                }`
                              : "--"}
                          </p>
                          <div className="mt-2 h-10 rounded-lg bg-slate-800/80 pt-2 text-sm font-bold text-slate-100">
                            {thirdPlace?.score ?? "--"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2">
                        <p className="text-sm font-bold text-amber-100">
                          冠軍 #1 {winner.username}
                          {me && winner.clientId === me.clientId ? "（我）" : ""}
                        </p>
                        <p className="mt-1 text-xs text-amber-50/90">
                          分數 {winner.score} · 答對 {winner.correctCount ?? 0}/{playedQuestionCount}
                          {" · "}
                          Combo x{Math.max(winner.maxCombo ?? 0, winner.combo)}
                        </p>
                      </div>
                      {me && (
                        <div className="mt-2 rounded-xl border border-sky-300/35 bg-sky-500/10 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                            你的位置
                          </p>
                          <p className="mt-1 text-sm font-bold text-sky-50">
                            第 {myRank}/{Math.max(1, participants.length)} 名 · 分數 {me.score}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">目前沒有玩家資料</p>
                  )}

                  <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-950/50 p-2.5">
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                      全場關鍵紀錄
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-2">
                        <p className="text-[11px] text-cyan-100/90">最高答對率</p>
                        <div className="mt-1 flex items-end justify-between gap-2">
                          <p className="text-2xl font-black leading-none text-cyan-50">
                            {topAccuracyEntry ? formatPercent(topAccuracyEntry.accuracy) : "--"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-cyan-100/95">
                          {topAccuracyEntry
                            ? `${topAccuracyEntry.participant.username}${
                                meClientId && topAccuracyEntry.participant.clientId === meClientId
                                  ? "（我）"
                                  : ""
                              }`
                            : "尚無資料"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/10 px-3 py-2">
                        <p className="text-[11px] text-fuchsia-100/90">最高 COMBO</p>
                        <div className="mt-1 flex items-end justify-between gap-2">
                          <p className="text-2xl font-black leading-none text-fuchsia-50">
                            {topComboEntry ? `x${topComboEntry.combo}` : "--"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-fuchsia-100/95">
                          {topComboEntry
                            ? `${topComboEntry.participant.username}${
                                meClientId && topComboEntry.participant.clientId === meClientId
                                  ? "（我）"
                                  : ""
                              }`
                            : "尚無資料"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2">
                        <p className="text-[11px] text-amber-100/90">最快答題平均（只算答對）</p>
                        <div className="mt-1 flex items-end justify-between gap-2">
                          <p className="text-2xl font-black leading-none text-amber-50">
                            {fastestAverageAnswerEntry
                              ? formatMs(fastestAverageAnswerEntry.ms)
                              : "--"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-amber-100/95">
                          {fastestAverageAnswerEntry
                            ? `${fastestAverageAnswerEntry.participant.username}${
                                meClientId &&
                                fastestAverageAnswerEntry.participant.clientId === meClientId
                                  ? "（我）"
                                  : ""
                              }`
                            : "尚無資料"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-700/80 pt-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-emerald-300/35 bg-emerald-500/10 px-3 py-2">
                        <p className="text-[11px] text-emerald-100/90">我的分數</p>
                        <p className="mt-1 text-xl font-bold text-emerald-50">
                          {me ? me.score : "--"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-sky-300/35 bg-sky-500/10 px-3 py-2">
                        <p className="text-[11px] text-sky-100/90">我的名次</p>
                        <p className="mt-1 text-xl font-bold text-sky-50">
                          {myRank > 0 ? `${myRank}/${Math.max(1, participants.length)}` : "--"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2">
                        <p className="text-[11px] text-amber-100/90">我的答對</p>
                        <p className="mt-1 text-xl font-bold text-amber-50">
                          {me?.correctCount ?? 0}/{playedQuestionCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">排行榜</p>
                <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {sortedParticipants.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/55 px-3 py-4 text-sm text-slate-400">
                      目前沒有玩家資料
                    </div>
                  ) : (
                    sortedParticipants.map((participant, index) => {
                      const isMe = meClientId && participant.clientId === meClientId;
                      const rank = index + 1;
                      const metrics =
                        participantScoreMeta.metricsByClientId[participant.clientId];
                      const title =
                        participantScoreMeta.byClientId[participant.clientId] ?? "穩定";
                      return (
                        <div
                          key={participant.clientId}
                          className={`rounded-xl border px-3 py-2 transition-colors ${
                            isMe
                              ? "border-sky-300/60 bg-sky-500/14 shadow-[0_0_0_1px_rgba(56,189,248,0.28)]"
                              : "border-slate-700/80 bg-slate-950/55"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
                                  isMe
                                    ? "border-sky-200/70 bg-sky-400/20 text-sky-50"
                                    : "border-slate-500/70 bg-slate-800/70 text-slate-200"
                                }`}
                              >
                                {rank}
                              </span>
                              <p
                                className="text-sm font-semibold text-slate-100"
                                style={MULTILINE_ELLIPSIS_2}
                              >
                                {participant.username}
                                {isMe ? "（你）" : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-slate-500/70 bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                                {title}
                              </span>
                              <p className="text-sm font-bold text-slate-100">{participant.score}</p>
                            </div>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
                            <span className="rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-0.5">
                              答對率 {formatPercent(metrics?.accuracy ?? 0)}
                            </span>
                            <span className="rounded-full border border-sky-300/35 bg-sky-500/12 px-2 py-0.5">
                              平均 {formatMs(metrics?.avgSpeedMs)}
                            </span>
                            <span className="rounded-full border border-fuchsia-300/35 bg-fuchsia-500/12 px-2 py-0.5">
                              Combo x{metrics?.combo ?? Math.max(participant.maxCombo ?? 0, participant.combo)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            </section>
          )}

          {activeTab === "recommend" && (
            <section
              ref={recommendSectionRef}
              className="rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {activeRecommendCategory === "quick"
                      ? "秒猜精選 · 本場熱門歌曲"
                      : activeRecommendCategory === "confuse"
                        ? "易混淆題 · 最多人換答案"
                        : "高難挑戰 · 補完你的曲庫"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-300">
                    {activeRecommendCategory === "quick"
                      ? "這些歌曲在本場最容易被快速識別，適合直接加入你的常聽清單。"
                      : activeRecommendCategory === "confuse"
                        ? "這些題目最容易出現改答案，建議多聽幾次避免下次猶豫。"
                        : "這些歌曲在本場最容易卡關，回聽後更容易記住作者與歌名。"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                    <span className="rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2 py-0.5">
                      秒猜 {recommendationCardsByCategory.quick.length} 首
                    </span>
                    <span className="rounded-full border border-fuchsia-300/35 bg-fuchsia-500/10 px-2 py-0.5">
                      易混淆 {recommendationCardsByCategory.confuse.length} 首
                    </span>
                    <span className="rounded-full border border-amber-300/35 bg-amber-500/10 px-2 py-0.5">
                      高難 {recommendationCardsByCategory.hard.length} 首
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-full border border-slate-600/70 bg-slate-950/70 p-1">
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        activeRecommendCategory === "quick"
                          ? "bg-emerald-500/20 text-emerald-100"
                          : "text-slate-300 hover:text-slate-100"
                      }`}
                      onClick={() => activateRecommendationCategory("quick")}
                    >
                      秒猜精選
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        activeRecommendCategory === "confuse"
                          ? "bg-fuchsia-500/20 text-fuchsia-100"
                          : "text-slate-300 hover:text-slate-100"
                      } ${recommendationCardsByCategory.confuse.length === 0 ? "opacity-45" : ""}`}
                      onClick={() => activateRecommendationCategory("confuse")}
                      disabled={recommendationCardsByCategory.confuse.length === 0}
                    >
                      易混淆
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        activeRecommendCategory === "hard"
                          ? "bg-amber-500/20 text-amber-100"
                          : "text-slate-300 hover:text-slate-100"
                      } ${recommendationCardsByCategory.hard.length === 0 ? "opacity-45" : ""}`}
                      onClick={() => activateRecommendationCategory("hard")}
                      disabled={recommendationCardsByCategory.hard.length === 0}
                    >
                      高難挑戰
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      autoPreviewEnabled
                        ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                        : "border-slate-600/80 bg-slate-900/70 text-slate-300 hover:text-slate-100"
                    }`}
                    onClick={() => {
                      setAutoPreviewEnabled((prev) => {
                        const next = !prev;
                        if (!next) {
                          setPreviewRecapKey(null);
                          setAutoAdvanceAtMs(null);
                        } else {
                          const nextIndex = getFirstAutoPlayableIndex(recommendationCards);
                          jumpToRecommendation(activeRecommendCategory, nextIndex);
                        }
                        setPreviewCountdownSec(RECOMMEND_PREVIEW_SECONDS);
                        return next;
                      });
                    }}
                  >
                    {autoPreviewEnabled ? "自動試聽：開" : "自動試聽：關"}
                  </button>
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      reviewDrawerOpen
                        ? "border-sky-300/60 bg-sky-400/18 text-sky-100"
                        : "border-slate-600/80 bg-slate-900/70 text-slate-300 hover:text-slate-100"
                    }`}
                    onClick={() => setReviewDrawerOpen((prev) => !prev)}
                  >
                    {reviewDrawerOpen ? "隱藏全員作答" : "查看全員作答"}
                  </button>
                </div>
              </div>

              {canAutoGuideLoop && (
                <div className="mt-3 rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-amber-100">
                    <span className="font-semibold">
                      本首 {previewCountdownSec}s 後自動前進（秒猜 → 易混淆 → 高難）
                    </span>
                    <span className="rounded-full border border-amber-300/45 px-2 py-0.5 font-bold">
                      AUTO
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-500/20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-100 transition-[width] duration-500"
                      style={{
                        width: `${Math.max(
                          6,
                          ((RECOMMEND_PREVIEW_SECONDS - previewCountdownSec + 1) /
                            RECOMMEND_PREVIEW_SECONDS) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {!currentRecommendation || !currentRecommendationLink ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-600/70 bg-slate-900/55 px-4 py-6 text-sm text-slate-400">
                  目前沒有可推薦的曲目。
                </div>
              ) : (
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                  <article
                    key={recommendationTransitionKey}
                    className="rounded-2xl border border-cyan-300/35 bg-gradient-to-br from-slate-950/78 via-slate-950/62 to-slate-900/78 p-4 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.16),0_25px_55px_-45px_rgba(56,189,248,0.55)]"
                    style={{ animation: "settlementSwapIn 240ms ease-out both" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                          Artist Spotlight
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenRecommendationTitle}
                          disabled={!currentRecommendationLink.href}
                          className="mt-1 text-left text-2xl font-black leading-tight text-slate-100 underline-offset-4 transition hover:text-cyan-200 hover:underline disabled:cursor-default disabled:opacity-85 disabled:no-underline sm:text-[2rem]"
                          style={MULTILINE_ELLIPSIS_2}
                          title={currentRecommendation.recap.title}
                        >
                          {currentRecommendation.recap.title}
                        </button>
                        <p className="mt-2 text-sm font-semibold text-slate-200">
                          作者：{currentRecommendation.recap.uploader || "Unknown"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full border border-slate-500/55 bg-slate-800/75 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                          {currentRecommendation.providerLabel}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-emerald-300/35 bg-emerald-500/10 px-2.5 py-2">
                        <p className="text-[10px] text-emerald-100/90">本場觀察</p>
                        <p className="mt-1 text-xs font-semibold text-emerald-50">
                          {currentRecommendationHint}
                        </p>
                      </div>
                      <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 px-2.5 py-2">
                        <p className="text-[10px] text-amber-100/90">重點標記</p>
                        <p className="mt-1 text-xs font-semibold text-amber-50">
                          {currentRecommendation.emphasis}
                        </p>
                      </div>
                      <div className="rounded-lg border border-sky-300/35 bg-sky-500/10 px-2.5 py-2">
                        <p className="text-[10px] text-sky-100/90">答對時間（中位數）</p>
                        <p className="mt-1 text-xs font-semibold text-sky-50">
                          {formatMs(currentRecommendation.recap.medianCorrectMs)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-sky-300/45 bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-100 transition hover:bg-sky-400/25"
                        onClick={() =>
                          handleOpenTrackLink(
                            currentRecommendationLink,
                            currentRecommendation.recap,
                          )
                        }
                        disabled={!currentRecommendationLink.href}
                      >
                        如果喜歡這首歌曲，請至 {currentRecommendation.providerLabel} 支持
                      </button>
                      {currentRecommendationPreviewUrl && (
                        <button
                          type="button"
                          className="rounded-full border border-amber-300/45 bg-amber-500/12 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/24"
                          onClick={() => {
                            setPreviewRecapKey((prev) => {
                              const next =
                                prev === currentRecommendation.recap.key
                                  ? null
                                  : currentRecommendation.recap.key;
                              if (next) {
                                setPreviewCountdownSec(RECOMMEND_PREVIEW_SECONDS);
                              }
                              return next;
                            });
                          }}
                        >
                          {isCurrentRecommendationPreviewOpen
                            ? `播放中 ${previewCountdownSec}s`
                            : `直接播放 ${RECOMMEND_PREVIEW_SECONDS} 秒`}
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-[11px] text-slate-400">
                      試聽音量 {effectivePreviewVolume}% ·
                      {settlementPreviewSyncGameVolume ? " 同步遊玩音量" : " 使用自訂音量"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      如果喜歡該歌曲或清單，請至 {currentRecommendation.providerLabel} 支持創作者與平台。
                    </p>

                    <div
                      ref={recommendPreviewStageRef}
                      className="mt-3 overflow-hidden rounded-xl border border-slate-700/80 bg-black/45 scroll-mt-24"
                    >
                      <div className="relative aspect-video w-full">
                        {isCurrentRecommendationPreviewOpen &&
                        currentRecommendationPreviewUrl ? (
                          <iframe
                            ref={previewIframeRef}
                            src={currentRecommendationPreviewUrl}
                            className="absolute inset-0 h-full w-full"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                            title={`preview-${currentRecommendation.recap.key}`}
                            onLoad={() => {
                              syncPreviewVolume();
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                            {currentRecommendation.recap.thumbnail && (
                              <img
                                src={currentRecommendation.recap.thumbnail}
                                alt={currentRecommendation.recap.title}
                                className="absolute inset-0 h-full w-full object-cover opacity-30"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-slate-950/55 to-slate-950/80" />
                            <div className="relative z-10 flex flex-col items-center gap-2">
                            {currentRecommendationPreviewUrl ? (
                              <>
                                <p className="text-sm font-semibold text-slate-200">
                                  按下「直接播放 {RECOMMEND_PREVIEW_SECONDS} 秒」可快速試聽
                                </p>
                                <p className="text-xs text-slate-400">
                                  進入下一首或切換分類時，會保留固定區塊大小避免畫面膨脹。
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-semibold text-slate-200">
                                  此平台不支援嵌入試聽
                                </p>
                                <p className="text-xs text-slate-400">
                                  請使用上方連結前往 {currentRecommendation.providerLabel} 收聽。
                                </p>
                              </>
                            )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>

                  <aside className="flex min-h-[520px] flex-col rounded-2xl border border-slate-700/80 bg-slate-950/45 p-3 xl:min-h-[620px]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        推薦清單
                      </p>
                      <span className="text-xs text-slate-300">
                        {recommendationCards.length === 0
                          ? "0/0"
                          : `${safeRecommendIndex + 1}/${recommendationCards.length}`}
                      </span>
                    </div>
                    <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {recommendationCards.map((card, index) => {
                        const active = index === safeRecommendIndex;
                        return (
                          <button
                            key={card.recap.key}
                            type="button"
                            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                              active
                                ? "border-amber-300/50 bg-amber-400/10"
                                : "border-slate-700/70 bg-slate-900/65 hover:border-slate-500/75"
                            }`}
                            onClick={() => {
                              jumpToRecommendation(activeRecommendCategory, index);
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className="min-w-0 text-xs font-semibold text-slate-100"
                                style={MULTILINE_ELLIPSIS_2}
                              >
                                #{card.recap.order} {card.recap.title}
                              </p>
                              <span className="shrink-0 rounded-full border border-slate-600/70 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-300">
                                {card.providerLabel}
                              </span>
                            </div>
                            <p
                              className="mt-1 text-[11px] text-slate-300"
                              style={MULTILINE_ELLIPSIS_2}
                            >
                              {card.recap.uploader || "Unknown"}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              {card.hint} · {card.emphasis}
                            </p>
                            {card.link?.href && (
                              <button
                                type="button"
                                className="mt-1 rounded-full border border-sky-300/35 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-100 hover:bg-sky-400/20"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!card.link) return;
                                  handleOpenTrackLink(card.link, card.recap);
                                }}
                              >
                                前往 {card.providerLabel}
                              </button>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-400 disabled:opacity-40"
                        onClick={goPrevRecommendation}
                        disabled={recommendationCards.length <= 1}
                      >
                        上一首
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600/70 bg-slate-900/65 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-400 disabled:opacity-40"
                        onClick={goNextRecommendation}
                        disabled={recommendationCards.length <= 1}
                      >
                        下一首
                      </button>
                    </div>
                  </aside>
                </div>
              )}
            </section>
          )}
          {activeTab === "recommend" && reviewDrawerOpen && (
            <section
              className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-900/72 p-4"
              style={{ animation: "settlementStageEnter 220ms ease-out both" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-emerald-300/45 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-100">
                    答對 {reviewRecapSummary.correct}
                  </span>
                  <span className="rounded-full border border-rose-300/45 bg-rose-400/10 px-2 py-0.5 font-semibold text-rose-100">
                    答錯 {reviewRecapSummary.wrong}
                  </span>
                  <span className="rounded-full border border-slate-400/55 bg-slate-700/55 px-2 py-0.5 font-semibold text-slate-100">
                    未作答 {reviewRecapSummary.unanswered}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-500/10 px-2 py-1">
                    <button
                      type="button"
                      className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 transition hover:border-slate-400 disabled:opacity-40"
                      onClick={goPrevReviewParticipant}
                      disabled={sortedParticipants.length <= 1}
                    >
                      上一位
                    </button>
                    <span
                      key={`review-participant-${effectiveSelectedReviewParticipantClientId ?? "none"}`}
                      className="max-w-[200px] truncate px-1 text-[11px] font-semibold text-sky-100"
                      style={{ animation: "settlementSwapIn 200ms ease-out both" }}
                    >
                      {selectedReviewParticipant
                        ? `#${selectedReviewParticipantRank} ${selectedReviewParticipant.username}${
                            meClientId &&
                            selectedReviewParticipant.clientId === meClientId
                              ? "（你）"
                              : ""
                          }`
                        : "未選擇玩家"}
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 transition hover:border-slate-400 disabled:opacity-40"
                      onClick={goNextReviewParticipant}
                      disabled={sortedParticipants.length <= 1}
                    >
                      下一位
                    </button>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 transition hover:border-slate-400 disabled:opacity-40"
                      onClick={() => setReviewPage((prev) => Math.max(0, prev - 1))}
                      disabled={safeReviewPage <= 0}
                    >
                      上一頁
                    </button>
                    <span>
                      {safeReviewPage + 1}/{reviewPageCount}
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-slate-600/70 bg-slate-900/65 px-2 py-1 transition hover:border-slate-400 disabled:opacity-40"
                      onClick={() =>
                        setReviewPage((prev) => Math.min(reviewPageCount - 1, prev + 1))
                      }
                      disabled={safeReviewPage >= reviewPageCount - 1}
                    >
                      下一頁
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
                <div
                  key={`review-list-${reviewContextTransitionKey}`}
                  className="max-h-[500px] space-y-2 overflow-y-auto pr-1"
                  style={{ animation: "settlementSwapIn 220ms ease-out both" }}
                >
                  {pagedRecaps.map((recap) => {
                    const result = resolveParticipantResult(
                      recap,
                      effectiveSelectedReviewParticipantClientId,
                      meClientId,
                    );
                    const tone = RESULT_META[result];
                    const active = selectedRecap?.key === recap.key;
                    return (
                      <button
                        key={recap.key}
                        type="button"
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? "border-amber-300/55 bg-amber-400/10"
                            : "border-slate-700/70 bg-slate-950/55 hover:border-slate-500/80"
                        }`}
                        onClick={() => setSelectedRecapKey(recap.key)}
                        onDoubleClick={() => {
                          setSelectedRecapKey(recap.key);
                          jumpToRecapPreview(recap);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/10 text-xs font-semibold text-amber-100">
                            {recap.order}
                          </span>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                            {recap.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.badgeClass}`}
                          >
                            {tone.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
                  {selectedRecap ? (
                    <div
                      key={reviewDetailTransitionKey}
                      style={{ animation: "settlementSwapIn 240ms ease-out both" }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                            第 {selectedRecap.order} 題
                            {selectedReviewParticipant
                              ? ` · ${selectedReviewParticipant.username}`
                              : ""}
                          </p>
                          <p
                            className="mt-1 text-sm font-semibold text-slate-100"
                            style={MULTILINE_ELLIPSIS_3}
                            title={selectedRecap.title}
                          >
                            {selectedRecap.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{selectedRecap.uploader}</p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            RESULT_META[
                              selectedRecapAnswer.result as keyof typeof RESULT_META
                            ].badgeClass
                          }`}
                        >
                          {
                            RESULT_META[
                              selectedRecapAnswer.result as keyof typeof RESULT_META
                            ].label
                          }
                        </span>
                      </div>
                      <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2">
                        <p className="text-[11px] text-slate-400">作答統計</p>
                        <p className="mt-1 text-xs text-slate-300">
                          答對 {selectedRecap.correctCount ?? 0} · 答錯 {selectedRecap.wrongCount ?? 0}
                          · 未作答 {selectedRecap.unansweredCount ?? 0} · 最快{" "}
                          {formatMs(selectedRecap.fastestCorrectMs)}
                        </p>
                        {selectedReviewParticipant && (
                          <p className="mt-1 text-xs text-sky-100">
                            玩家：第 {selectedReviewParticipantRank}/
                            {Math.max(1, sortedParticipants.length)} 名 · 分數{" "}
                            {selectedReviewParticipant.score} · Combo x
                            {Math.max(
                              selectedReviewParticipant.maxCombo ?? 0,
                              selectedReviewParticipant.combo,
                            )}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2">
                        {selectedRecap.choices.map((choice) => {
                          const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                          const isMine = selectedRecapAnswer.choiceIndex === choice.index;
                          return (
                            <div
                              key={`${selectedRecap.key}-${choice.index}`}
                              className={`rounded-lg border px-3 py-2 ${
                                isCorrect
                                  ? "border-emerald-300/40 bg-emerald-500/10"
                                  : isMine
                                    ? "border-rose-300/40 bg-rose-500/10"
                                    : "border-slate-700/70 bg-slate-900/55"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className="min-w-0 flex-1 text-sm leading-5 text-slate-100"
                                  style={MULTILINE_ELLIPSIS_2}
                                  title={choice.title}
                                >
                                  {choice.title}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {isCorrect && (
                                    <span className="rounded-full border border-emerald-300/45 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                                      正確
                                    </span>
                                  )}
                                  {isMine && (
                                    <span className="rounded-full border border-sky-300/45 bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
                                      玩家選擇
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-4 text-sm text-slate-400">
                      目前沒有可查看的題目內容
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                顯示第 {safeReviewPage * RECAPS_PER_PAGE + 1} -{" "}
                {Math.min(
                  normalizedRecaps.length,
                  (safeReviewPage + 1) * RECAPS_PER_PAGE,
                )}{" "}
                題（共 {normalizedRecaps.length} 題）
              </div>
            </section>
          )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                color="inherit"
                onClick={goPrevStep}
                disabled={stepIndex <= 0}
              >
                上一步
              </Button>
              {stepIndex < TAB_ORDER.length - 1 ? (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={goNextStep}
                >
                  下一步：{TAB_LABELS[TAB_ORDER[stepIndex + 1]]}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  onClick={goNextStep}
                  disabled={!onBackToLobby}
                >
                  完成結算
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onRequestExit && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={onRequestExit}
                >
                  離開房間
                </Button>
              )}
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
};

export default LiveSettlementShowcase;
