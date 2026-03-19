import React from "react";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";

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
  isMobileView?: boolean;
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

const comboTierClass = (combo: number) => {
  if (combo >= 10) {
    return "border-amber-200/55 bg-amber-400/14 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.36),0_0_42px_rgba(250,204,21,0.22)]";
  }
  if (combo >= 7) {
    return "border-cyan-300/45 bg-cyan-400/14 text-cyan-50 shadow-[0_0_0_1px_rgba(56,189,248,0.3),0_0_30px_rgba(56,189,248,0.18)]";
  }
  if (combo >= 4) {
    return "border-violet-300/40 bg-violet-500/14 text-violet-50";
  }
  if (combo >= 1) {
    return "border-slate-400/45 bg-slate-700/55 text-slate-100";
  }
  return "border-slate-600/65 bg-slate-900/68 text-slate-300";
};

const renderParticipantName = (
  participant: RoomParticipant | null,
  meClientId?: string,
  multilineEllipsis2Style?: React.CSSProperties,
  useYouBadge = false,
) => {
  if (!participant) return <span>--</span>;
  const isMe = Boolean(meClientId && participant.clientId === meClientId);

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="min-w-0" style={multilineEllipsis2Style}>
        {participant.username}
      </span>
      {isMe && useYouBadge && (
        <span className="shrink-0 rounded-full border border-cyan-300/45 bg-cyan-400/16 px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-cyan-50">
          YOU
        </span>
      )}
    </span>
  );
};

const rankSurfaceClass = (rank: number) => {
  if (rank === 1) {
    return "border-amber-300/65 bg-[linear-gradient(180deg,rgba(251,191,36,0.42),rgba(88,52,9,0.26)_42%,rgba(28,23,33,0.92)_100%)] shadow-[0_0_0_1px_rgba(251,191,36,0.26),0_34px_72px_-40px_rgba(250,204,21,0.76)]";
  }
  if (rank === 2) {
    return "border-slate-200/34 bg-[linear-gradient(180deg,rgba(203,213,225,0.32),rgba(71,85,105,0.18)_44%,rgba(23,27,38,0.95)_100%)] shadow-[0_26px_60px_-48px_rgba(226,232,240,0.48)]";
  }
  return "border-orange-300/34 bg-[linear-gradient(180deg,rgba(180,83,9,0.34),rgba(120,53,15,0.18)_44%,rgba(30,20,18,0.95)_100%)] shadow-[0_26px_60px_-48px_rgba(180,83,9,0.46)]";
};

const podiumLabel = (rank: number) => {
  if (rank === 1) return "冠軍";
  if (rank === 2) return "亞軍";
  return "季軍";
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
  const podium = [
    { participant: runnerUp, rank: 2, orderClass: "order-1", heightClass: "min-h-[250px]" },
    { participant: winner, rank: 1, orderClass: "order-2", heightClass: "min-h-[302px]" },
    { participant: thirdPlace, rank: 3, orderClass: "order-3", heightClass: "min-h-[232px]" },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
      <article className="relative overflow-hidden rounded-[28px] border border-amber-300/42 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.26),transparent_34%),linear-gradient(180deg,rgba(39,26,10,0.96),rgba(18,14,22,0.98))] p-5 shadow-[0_0_0_1px_rgba(251,191,36,0.14),0_28px_80px_-48px_rgba(245,158,11,0.7)]">
        <div className="pointer-events-none absolute inset-x-[18%] top-7 h-44 rounded-full bg-amber-200/14 blur-[64px]" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-3xl font-black tracking-tight text-white">本場冠軍榜</h3>
            <p className="mt-2 text-sm font-semibold text-amber-100/78">
              以頒獎台呈現本局前三名
            </p>
          </div>
          <span className="rounded-full border border-amber-200/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-100">
            前 3 名玩家
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 items-end gap-3 px-1">
          {podium.map(({ participant, rank, orderClass, heightClass }) => {
            const combo = participant
              ? Math.max(participant.maxCombo ?? 0, participant.combo)
              : 0;
            const correctCount = participant?.correctCount ?? 0;
            const isChampion = rank === 1;
            const isMe = Boolean(meClientId && participant?.clientId === meClientId);

            return (
              <div
                key={`podium-${rank}`}
                className={`relative ${orderClass} ${heightClass} rounded-[28px] border px-4 pb-4 pt-5 text-center ${rankSurfaceClass(rank)} ${
                  isMe ? "ring-2 ring-white/24" : ""
                }`}
              >
                {isChampion && (
                  <>
                    <div className="pointer-events-none absolute inset-x-[16%] top-0 h-24 rounded-b-[44px] bg-[linear-gradient(180deg,rgba(255,243,170,0.42),rgba(255,243,170,0))]" />
                    <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-amber-200/18 p-2 shadow-[0_0_34px_rgba(250,204,21,0.42)]">
                      <WorkspacePremiumRoundedIcon className="text-[1.15rem] text-amber-50" />
                    </div>
                  </>
                )}

                <div
                  className={`mx-auto inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black tracking-[0.18em] ${
                    rank === 1
                      ? "mt-7 border-amber-100/35 bg-amber-100/10 text-amber-50"
                      : rank === 2
                        ? "mt-3 border-slate-200/28 bg-slate-100/10 text-slate-100"
                        : "mt-1.5 border-orange-200/28 bg-orange-200/8 text-orange-100"
                  }`}
                >
                  {podiumLabel(rank)}
                </div>

                <div className="mt-4 min-h-[3.6rem] px-1 text-[1.75rem] font-black leading-tight text-white">
                  {renderParticipantName(participant, meClientId, multilineEllipsis2Style)}
                </div>

                <div
                  className={`mx-auto mt-5 flex w-full max-w-[168px] flex-col items-center justify-center rounded-[24px] border px-4 py-5 ${
                    rank === 1
                      ? "border-amber-200/35 bg-black/26"
                      : rank === 2
                        ? "border-slate-200/20 bg-black/20"
                        : "border-orange-200/18 bg-black/18"
                  }`}
                >
                  <p className="text-[3.1rem] font-black leading-none text-white">
                    {participant?.score ?? "--"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-white/80">
                    {correctCount}/{playedQuestionCount} 題答對
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${comboTierClass(combo)}`}
                  >
                    Combo x{combo}
                  </span>
                  <span className="rounded-full border border-white/12 bg-black/24 px-3 py-1 text-[11px] font-semibold text-white/82">
                    第 {rank} 名
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-[24px] border border-amber-300/25 bg-[linear-gradient(180deg,rgba(251,191,36,0.1),rgba(15,23,42,0.5))] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-100/72">
                個人結算
              </p>
              <p
                className="mt-2 text-[1.6rem] font-black leading-tight text-white"
                style={multilineEllipsis2Style}
              >
                {me ? `${myRank > 0 ? `第 ${myRank} 名` : "本局完成"}・${me.username}` : "等待結果"}
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/76">
              {me ? `${me.correctCount ?? 0}/${playedQuestionCount} 題答對` : "尚無資料"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] tracking-[0.18em] text-white/58">排名</p>
              <p className="mt-3 text-4xl font-black text-white">
                {myRank > 0 ? `${myRank}/${Math.max(1, participantsLength)}` : "--"}
              </p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] tracking-[0.18em] text-white/58">分數</p>
              <p className="mt-3 text-4xl font-black text-white">{me?.score ?? 0}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] tracking-[0.18em] text-white/58">COMBO</p>
              <p className="mt-3 text-4xl font-black text-white">
                x{me ? Math.max(me.maxCombo ?? 0, me.combo) : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-cyan-300/28 bg-cyan-500/10 px-4 py-3">
            <p className="text-[11px] font-semibold text-cyan-100/88">最高準度</p>
            <p className="mt-3 text-4xl font-black text-cyan-50">
              {topAccuracyEntry ? formatPercent(topAccuracyEntry.accuracy) : "--"}
            </p>
            <p className="mt-2 text-sm font-semibold text-cyan-50/90">
              {topAccuracyEntry ? topAccuracyEntry.participant.username : "尚無資料"}
            </p>
          </div>
          <div className="rounded-[22px] border border-fuchsia-300/28 bg-fuchsia-500/10 px-4 py-3">
            <p className="text-[11px] font-semibold text-fuchsia-100/88">最長連擊</p>
            <p className="mt-3 text-4xl font-black text-fuchsia-50">
              {topComboEntry ? `x${topComboEntry.combo}` : "--"}
            </p>
            <p className="mt-2 text-sm font-semibold text-fuchsia-50/90">
              {topComboEntry ? topComboEntry.participant.username : "尚無資料"}
            </p>
          </div>
          <div className="rounded-[22px] border border-amber-300/28 bg-amber-500/10 px-4 py-3">
            <p className="text-[11px] font-semibold text-amber-100/88">最快平均作答</p>
            <p className="mt-3 text-4xl font-black text-amber-50">
              {fastestAverageAnswerEntry ? formatMs(fastestAverageAnswerEntry.ms) : "--"}
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-50/90">
              {fastestAverageAnswerEntry
                ? fastestAverageAnswerEntry.participant.username
                : "尚無資料"}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[28px] border border-cyan-300/22 bg-[radial-gradient(circle_at_16%_8%,rgba(34,211,238,0.12),transparent_18%),linear-gradient(180deg,rgba(11,18,31,0.98),rgba(9,13,24,0.94))] p-5 shadow-[0_24px_70px_-52px_rgba(34,211,238,0.55)]">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-400/12 text-cyan-100">
            <EmojiEventsRoundedIcon />
          </div>
          <div className="min-w-0">
            <h3 className="text-3xl font-black tracking-tight text-cyan-50">排行榜</h3>
          </div>
        </div>

        <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto pr-1">
          {sortedParticipants.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-700 bg-slate-950/55 px-4 py-5 text-sm text-slate-400">
              目前沒有可顯示的排行榜資料。
            </div>
          ) : (
            sortedParticipants.map((participant, index) => {
              const rank = index + 1;
              const isMe = Boolean(meClientId && participant.clientId === meClientId);
              const metrics = participantScoreMeta.metricsByClientId[participant.clientId];
              const title = participantScoreMeta.byClientId[participant.clientId] ?? "參與者";
              const titleTooltip =
                participantScoreMeta.tooltipByClientId[participant.clientId] ?? "本局表現";
              const combo =
                metrics?.combo ?? Math.max(participant.maxCombo ?? 0, participant.combo);

              return (
                <div
                  key={participant.clientId}
                  className={`rounded-[24px] border px-4 py-3 ${
                    rank === 1
                      ? "border-amber-300/55 bg-[radial-gradient(circle_at_55%_50%,rgba(250,204,21,0.24),rgba(120,53,15,0.18)_52%,rgba(15,23,42,0.94)_100%)] shadow-[0_0_0_1px_rgba(251,191,36,0.24),0_20px_50px_-36px_rgba(250,204,21,0.56)]"
                      : isMe
                        ? "border-sky-300/55 bg-sky-500/14 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
                        : "border-slate-700/80 bg-slate-950/58"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                            rank === 1
                              ? "border-amber-200/60 bg-black/30 text-amber-50"
                              : "border-slate-500/70 bg-slate-900/72 text-slate-100"
                          }`}
                        >
                          {rank}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="min-w-0 text-[1.05rem] font-black text-white"
                            style={multilineEllipsis2Style}
                          >
                            {renderParticipantName(
                              participant,
                              meClientId,
                              multilineEllipsis2Style,
                              true,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-100">
                        <span className="rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2.5 py-1">
                          準度 {formatPercent(metrics?.accuracy ?? 0)}
                        </span>
                        <span className="rounded-full border border-sky-300/35 bg-sky-500/12 px-2.5 py-1">
                          平均 {formatMs(metrics?.avgSpeedMs)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 ${comboTierClass(combo)}`}
                        >
                          Combo x{combo}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end justify-between gap-3 text-right">
                      <span
                        className="rounded-full border border-white/12 bg-black/26 px-2.5 py-1 text-[10px] font-semibold text-white/84"
                        title={titleTooltip}
                      >
                        {title}
                      </span>
                      <p className="text-[3.2rem] font-black leading-none text-white">
                        {participant.score}
                      </p>
                    </div>
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
