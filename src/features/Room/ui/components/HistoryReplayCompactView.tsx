import React, { useMemo, useState } from "react";

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

const multiline2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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
      item?.answerText?.trim() ||
      item?.title?.trim() ||
      `第 ${index + 1} 題`;
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
        .sort((a, b) => b.score - a.score || (b.correctCount ?? 0) - (a.correctCount ?? 0)),
    [participants],
  );

  const participantMap = useMemo(
    () => Object.fromEntries(rankedParticipants.map((participant) => [participant.clientId, participant])),
    [rankedParticipants],
  );

  const meParticipant = meClientId
    ? participantMap[meClientId] ?? null
    : null;

  const initialSelectedParticipantId =
    (meClientId && participantMap[meClientId] ? meClientId : rankedParticipants[0]?.clientId) ??
    null;

  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    initialSelectedParticipantId,
  );
  const [selectedRecapKey, setSelectedRecapKey] = useState<string | null>(null);

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
    ? rankedParticipants.findIndex((participant) => participant.clientId === selectedParticipantId) + 1
    : 0;

  const endedAtLabel = endedAt || messages[messages.length - 1]?.timestamp;

  const selectedAnswer = useMemo(() => {
    if (!selectedRecap) {
      return { choiceIndex: null, result: "unanswered" as ParticipantResult, answeredAtMs: null };
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
        width: Math.max(8, Math.round((count / maxCount) * 100)),
      };
    });
  }, [selectedRecap]);

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

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(8,14,24,0.88),rgba(4,8,16,0.96))] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">History Replay</p>
            <p className="truncate text-base font-semibold text-slate-100">
              {room.name}
              {room.playlist.title ? ` · ${room.playlist.title}` : ""}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              玩家 {participants.length} · 題數 {playedQuestionCount} · 局長{" "}
              {formatDuration(startedAt, endedAt)}
              {endedAtLabel ? ` · 結束 ${new Date(endedAtLabel).toLocaleString()}` : ""}
            </p>
          </div>
          <div className="rounded-xl border border-sky-300/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
            你本局：名次{" "}
            {meParticipant
              ? `${rankedParticipants.findIndex((item) => item.clientId === meParticipant.clientId) + 1}/${Math.max(
                  1,
                  rankedParticipants.length,
                )}`
              : "--"}{" "}
            · 分數 {meParticipant?.score ?? "--"}
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[260px_280px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">玩家視角</p>
          <p className="mt-1 text-[11px] text-slate-500">切換玩家可查看該玩家每題實際選項。</p>
          <div className="mt-3 max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {rankedParticipants.map((participant, index) => {
              const active = selectedParticipantId === participant.clientId;
              const isMe = meClientId && meClientId === participant.clientId;
              return (
                <button
                  key={participant.clientId}
                  type="button"
                  onClick={() => setSelectedParticipantId(participant.clientId)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
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

        <aside className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">題目清單</p>
            <span className="text-xs text-slate-400">
              {recaps.length > 0 ? `${recaps.length} 題` : "0 題"}
            </span>
          </div>
          <div className="mt-2 max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {recaps.map((recap) => {
              const answer = getParticipantAnswer(recap, selectedParticipantId, meClientId);
              const tone = RESULT_TONE[answer.result];
              const active = selectedRecap?.key === recap.key;
              return (
                <button
                  key={recap.key}
                  type="button"
                  onClick={() => setSelectedRecapKey(recap.key)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? "border-amber-300/55 bg-amber-500/10"
                      : "border-slate-700/70 bg-slate-900/55 hover:border-slate-500/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 text-xs font-semibold text-amber-100">
                      {recap.order}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-semibold text-slate-100" style={multiline2}>
                      {recap.title}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.className}`}>
                      {tone.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <article className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
          {selectedRecap ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    第 {selectedRecap.order} 題 · {selectedParticipant?.username ?? "玩家視角"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-100" style={multiline2}>
                    {selectedRecap.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{selectedRecap.uploader}</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    RESULT_TONE[selectedAnswer.result].className
                  }`}
                >
                  {RESULT_TONE[selectedAnswer.result].label}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <div className="rounded-lg border border-emerald-300/35 bg-emerald-500/10 px-2.5 py-2">
                  <p className="text-[10px] text-emerald-100/90">玩家分數</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-50">
                    {selectedParticipant?.score ?? "--"}
                  </p>
                </div>
                <div className="rounded-lg border border-sky-300/35 bg-sky-500/10 px-2.5 py-2">
                  <p className="text-[10px] text-sky-100/90">玩家名次</p>
                  <p className="mt-1 text-sm font-semibold text-sky-50">
                    {selectedParticipantRank > 0
                      ? `${selectedParticipantRank}/${Math.max(1, rankedParticipants.length)}`
                      : "--"}
                  </p>
                </div>
                <div className="rounded-lg border border-fuchsia-300/35 bg-fuchsia-500/10 px-2.5 py-2">
                  <p className="text-[10px] text-fuchsia-100/90">玩家最高 COMBO</p>
                  <p className="mt-1 text-sm font-semibold text-fuchsia-50">
                    x
                    {selectedParticipant
                      ? Math.max(selectedParticipant.maxCombo ?? 0, selectedParticipant.combo)
                      : "--"}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 px-2.5 py-2">
                  <p className="text-[10px] text-amber-100/90">玩家最快答題</p>
                  <p className="mt-1 text-sm font-semibold text-amber-50">
                    {formatMs(selectedParticipant?.fastestCorrectMs)}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-slate-700/75 bg-slate-900/60 px-3 py-2">
                <p className="text-[11px] text-slate-400">本題全體統計</p>
                <p className="mt-1 text-xs text-slate-300">
                  答對 {selectedRecap.correctCount ?? 0} · 答錯 {selectedRecap.wrongCount ?? 0} · 未作答{" "}
                  {selectedRecap.unansweredCount ?? 0} · 最快答對 {formatMs(selectedRecap.fastestCorrectMs)}
                </p>
              </div>

              {selectedRecap.choices.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {selectedRecap.choices.map((choice) => {
                    const isCorrect = choice.index === selectedRecap.correctChoiceIndex;
                    const isSelected = selectedAnswer.choiceIndex === choice.index;
                    return (
                      <div
                        key={`${selectedRecap.key}-${choice.index}`}
                        className={`rounded-lg border px-3 py-2 ${
                          isCorrect
                            ? "border-emerald-300/35 bg-emerald-500/10"
                            : isSelected
                              ? "border-sky-300/35 bg-sky-500/10"
                              : "border-slate-700/70 bg-slate-900/45"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm text-slate-100" style={multiline2}>
                            {choice.title}
                          </p>
                          <div className="flex flex-wrap gap-1">
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedRecapDistribution.length > 0 && (
                <div className="mt-3 rounded-lg border border-slate-700/75 bg-slate-900/55 px-3 py-2">
                  <p className="text-[11px] text-slate-400">本題選項分布</p>
                  <div className="mt-2 space-y-2">
                    {selectedRecapDistribution.map((row) => (
                      <div key={`distribution-${selectedRecap.key}-${row.choice.index}`}>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                          <span className="min-w-0 truncate" style={multiline2}>
                            {row.choice.title}
                          </span>
                          <span>{row.count} 人</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                          <div
                            className={`h-full rounded-full ${
                              row.choice.index === selectedRecap.correctChoiceIndex
                                ? "bg-emerald-300/85"
                                : "bg-sky-300/80"
                            }`}
                            style={{ width: `${row.width}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRecapLink?.href && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-700/75 bg-slate-900/65 px-3 py-2">
                  <div className="text-xs text-slate-300">
                    {selectedRecapLink.providerLabel} ·{" "}
                    {selectedRecapLink.linkType === "direct" ? "可直接前往" : "搜尋導向"}
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-sky-300/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-500/20"
                    onClick={() => openLink(selectedRecapLink, selectedRecap)}
                  >
                    前往歌曲頁
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/45 px-4 text-sm text-slate-400">
              目前沒有可查看的題目資料
            </div>
          )}
        </article>
      </section>
    </div>
  );
};

export default HistoryReplayCompactView;
