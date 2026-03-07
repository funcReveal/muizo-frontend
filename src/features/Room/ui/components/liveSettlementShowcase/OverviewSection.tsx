import React from "react";

import type { RoomParticipant } from "../../../model/types";

interface ScoreMetrics {
  accuracy: number;
  avgSpeedMs: number | null;
  combo: number;
}

interface ParticipantScoreMeta {
  byClientId: Record<string, string>;
  tooltipByClientId: Record<string, string>;
  metricsByClientId: Record<string, ScoreMetrics>;
}

interface OverviewSectionProps {
  winner: RoomParticipant | null;
  runnerUp: RoomParticipant | null;
  thirdPlace: RoomParticipant | null;
  me: RoomParticipant | null;
  myRank: number;
  participantsLength: number;
  playedQuestionCount: number;
  sortedParticipants: RoomParticipant[];
  meClientId?: string;
  topAccuracyEntry: { participant: RoomParticipant; accuracy: number } | null;
  topComboEntry: { participant: RoomParticipant; combo: number } | null;
  fastestAverageAnswerEntry: { participant: RoomParticipant; ms: number } | null;
  participantScoreMeta: ParticipantScoreMeta;
  formatPercent: (value: number) => string;
  formatMs: (value: number | null | undefined) => string;
  multilineEllipsis2Style: React.CSSProperties;
}

const renderName = (
  participant: RoomParticipant | null,
  meClientId?: string,
  style?: React.CSSProperties,
) => {
  if (!participant) return "--";
  return (
    <span style={style}>
      {participant.username}
      {meClientId && participant.clientId === meClientId ? "（你）" : ""}
    </span>
  );
};

const OverviewSection: React.FC<OverviewSectionProps> = ({
  winner,
  runnerUp,
  thirdPlace,
  me,
  myRank,
  participantsLength,
  playedQuestionCount,
  sortedParticipants,
  meClientId,
  topAccuracyEntry,
  topComboEntry,
  fastestAverageAnswerEntry,
  participantScoreMeta,
  formatPercent,
  formatMs,
  multilineEllipsis2Style,
}) => {
  return (
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
              本局結果
            </span>
          </div>

          {winner ? (
            <>
              <div className="mt-4 grid grid-cols-3 items-end gap-2">
                <div className="flex min-h-[154px] flex-col items-center rounded-xl border border-slate-600/70 bg-slate-900/70 p-2 text-center">
                  <p className="text-[10px] tracking-[0.15em] text-slate-300">
                    #2
                  </p>
                  <p
                    className="mt-2 min-h-[2.5rem] w-full px-1 text-xs font-semibold leading-tight text-slate-100"
                    style={multilineEllipsis2Style}
                  >
                    {renderName(runnerUp, meClientId, multilineEllipsis2Style)}
                  </p>
                  <div className="mt-auto flex h-14 w-full items-center justify-center rounded-lg bg-slate-800/80 text-2xl font-black leading-none text-slate-100">
                    {runnerUp?.score ?? "--"}
                  </div>
                </div>
                <div
                  className={`relative flex min-h-[172px] flex-col items-center rounded-xl border border-amber-300/60 bg-amber-500/12 px-2 pb-2 pt-3 text-center shadow-[0_0_0_1px_rgba(252,211,77,0.25),0_18px_46px_-24px_rgba(251,191,36,0.65)] ${
                    me && winner.clientId === me.clientId
                      ? "ring-2 ring-amber-200/70"
                      : ""
                  }`}
                  style={{
                    animation: "settlementChampionGlow 2.2s ease-in-out infinite",
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-x-0 -top-4 flex justify-center text-[1.35rem]"
                    aria-hidden
                  >
                    <span
                      className="drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]"
                      style={{
                        animation: "settlementCrownFloat 1.8s ease-in-out infinite",
                      }}
                    >
                      👑
                    </span>
                  </span>
                  <p className="text-[10px] tracking-[0.18em] text-amber-200">#1</p>
                  <p
                    className="mt-1 min-h-[2.5rem] w-full px-1 text-center text-sm font-black leading-tight text-amber-100"
                    style={multilineEllipsis2Style}
                  >
                    {renderName(winner, meClientId, multilineEllipsis2Style)}
                  </p>
                  <div className="mt-auto flex h-20 w-full items-center justify-center rounded-lg bg-amber-300/20 text-[2rem] font-black leading-none text-amber-50">
                    <span>{winner.score}</span>
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
                        animation:
                          "settlementChampionSpark 1.8s ease-in-out infinite",
                        animationDelay: spark.delay,
                      }}
                    />
                  ))}
                </div>
                <div className="flex min-h-[142px] flex-col items-center rounded-xl border border-slate-600/70 bg-slate-900/70 p-2 text-center">
                  <p className="text-[10px] tracking-[0.15em] text-slate-300">
                    #3
                  </p>
                  <p
                    className="mt-2 min-h-[2.5rem] w-full px-1 text-xs font-semibold leading-tight text-slate-100"
                    style={multilineEllipsis2Style}
                  >
                    {renderName(thirdPlace, meClientId, multilineEllipsis2Style)}
                  </p>
                  <div className="mt-auto flex h-12 w-full items-center justify-center rounded-lg bg-slate-800/80 text-xl font-black leading-none text-slate-100">
                    {thirdPlace?.score ?? "--"}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-center">
                <p className="text-sm font-bold text-amber-100">
                  冠軍 #1 {winner.username}
                  {me && winner.clientId === me.clientId ? "（你）" : ""}
                </p>
                <p className="mt-1 text-xs text-amber-50/90">
                  分數 {winner.score} · 答對 {winner.correctCount ?? 0}/
                  {playedQuestionCount} · Combo x
                  {Math.max(winner.maxCombo ?? 0, winner.combo)}
                </p>
              </div>
              {me && (
                <div className="mt-2 rounded-xl border border-sky-300/35 bg-sky-500/10 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                    你的排名
                  </p>
                  <p className="mt-1 text-sm font-bold text-sky-50">
                    第 {myRank}/{Math.max(1, participantsLength)} 名 · 分數 {me.score}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">目前尚無可用結果資料</p>
          )}

          <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-950/50 p-2.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              本場觀察
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-2">
                <p className="text-[11px] text-cyan-100/90" title="本場答對率最高的玩家">
                  最高答對率
                </p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-2xl font-black leading-none text-cyan-50">
                    {topAccuracyEntry ? formatPercent(topAccuracyEntry.accuracy) : "--"}
                  </p>
                </div>
                <p className="mt-1 text-xs font-semibold text-cyan-100/95">
                  {topAccuracyEntry
                    ? `${topAccuracyEntry.participant.username}${
                        meClientId &&
                        topAccuracyEntry.participant.clientId === meClientId
                          ? "（你）"
                          : ""
                      }`
                    : "尚無資料"}
                </p>
              </div>
              <div className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/10 px-3 py-2">
                <p className="text-[11px] text-fuchsia-100/90" title="本場最高連續答對數">
                  最高 Combo
                </p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-2xl font-black leading-none text-fuchsia-50">
                    {topComboEntry ? `x${topComboEntry.combo}` : "--"}
                  </p>
                </div>
                <p className="mt-1 text-xs font-semibold text-fuchsia-100/95">
                  {topComboEntry
                    ? `${topComboEntry.participant.username}${
                        meClientId &&
                        topComboEntry.participant.clientId === meClientId
                          ? "（你）"
                          : ""
                      }`
                    : "尚無資料"}
                </p>
              </div>
              <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2">
                <p
                  className="text-[11px] text-amber-100/90"
                  title="僅計算有答對題目的玩家"
                >
                  最快平均答對時長
                </p>
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
                          ? "（你）"
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
                <p className="text-[11px] text-emerald-100/90">你的分數</p>
                <p className="mt-1 text-xl font-bold text-emerald-50">
                  {me ? me.score : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-sky-300/35 bg-sky-500/10 px-3 py-2">
                <p className="text-[11px] text-sky-100/90">你的名次</p>
                <p className="mt-1 text-xl font-bold text-sky-50">
                  {myRank > 0 ? `${myRank}/${Math.max(1, participantsLength)}` : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2">
                <p className="text-[11px] text-amber-100/90">你的答對題數</p>
                <p className="mt-1 text-xl font-bold text-amber-50">
                  {me?.correctCount ?? 0}/{playedQuestionCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-cyan-300/30 bg-[radial-gradient(circle_at_92%_8%,rgba(56,189,248,0.16),transparent_38%),linear-gradient(175deg,rgba(3,10,28,0.96),rgba(4,16,34,0.9))] p-4 shadow-[0_24px_52px_-40px_rgba(56,189,248,0.65)]">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">排行榜</p>
        <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {sortedParticipants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/55 px-3 py-4 text-sm text-slate-400">
              目前尚無玩家資料
            </div>
          ) : (
            sortedParticipants.map((participant, index) => {
              const isMe = meClientId && participant.clientId === meClientId;
              const rank = index + 1;
              const metrics =
                participantScoreMeta.metricsByClientId[participant.clientId];
              const title =
                participantScoreMeta.byClientId[participant.clientId] ?? "競技者";
              const titleTooltip =
                participantScoreMeta.tooltipByClientId[participant.clientId] ??
                "本場綜合表現";
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
                        style={multilineEllipsis2Style}
                      >
                        {participant.username}
                        {isMe ? "（你）" : ""}
                      </p>
                    </div>
                    <div className="flex min-w-[98px] shrink-0 self-center flex-col items-center justify-center gap-2 py-1 text-center">
                      <span
                        className="rounded-full border border-slate-500/70 bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold leading-none text-slate-200"
                        title={titleTooltip}
                      >
                        {title}
                      </span>
                      <p className="text-2xl font-black leading-none text-slate-100 sm:text-[1.7rem]">
                        {participant.score}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
                    <span
                      className="rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-0.5"
                      title="此玩家在本場所有題目的答對率"
                    >
                      答對率 {formatPercent(metrics?.accuracy ?? 0)}
                    </span>
                    <span
                      className="rounded-full border border-sky-300/35 bg-sky-500/12 px-2 py-0.5"
                      title="此玩家答對題目的平均作答時間"
                    >
                      平均答對時長 {formatMs(metrics?.avgSpeedMs)}
                    </span>
                    <span
                      className="rounded-full border border-fuchsia-300/35 bg-fuchsia-500/12 px-2 py-0.5"
                      title="此玩家在本場的最高連續答對數"
                    >
                      Combo x
                      {metrics?.combo ??
                        Math.max(participant.maxCombo ?? 0, participant.combo)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </article>
    </section>
  );
};

export default OverviewSection;

