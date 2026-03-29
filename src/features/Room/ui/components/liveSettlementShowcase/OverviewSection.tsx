import React from "react";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";

import type { RoomParticipant } from "../../../model/types";
import RoomUiTooltip from "../../../../../shared/ui/RoomUiTooltip";

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
  const username = participant.username ?? "";
  const isLongName = username.length >= 12;
  const participantNameStyle: React.CSSProperties = {
    ...multilineEllipsis2Style,
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <RoomUiTooltip title={username} wrapperClassName="block min-w-0 max-w-full">
        <span
          className={`block min-w-0 text-center ${isLongName ? "text-[1.42rem] leading-[1.12]" : ""}`}
          style={participantNameStyle}
        >
          {username}
        </span>
      </RoomUiTooltip>
      {isMe && useYouBadge && (
        <span className="shrink-0 rounded-full border border-cyan-300/45 bg-cyan-400/16 px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-cyan-50">
          YOU
        </span>
      )}
    </span>
  );
};

const podiumNameClass = (username: string) => {
  if (username.length >= 14) return "text-[1.6rem] leading-[1.08]";
  if (username.length >= 10) return "text-[1.9rem] leading-[1.08]";
  return "text-[2.35rem] leading-[1]";
};

const renderPodiumName = (
  participant: RoomParticipant | null,
  multilineEllipsis2Style?: React.CSSProperties,
) => {
  if (!participant?.username) return <span>--</span>;
  const username = participant.username;
  const style: React.CSSProperties = {
    ...multilineEllipsis2Style,
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    textWrap: "balance",
    wordBreak: "keep-all",
    overflowWrap: "anywhere",
  };

  return (
    <RoomUiTooltip title={username} wrapperClassName="mx-auto block max-w-[10.5rem]">
      <span
        className={`mx-auto block max-w-[10.5rem] text-center font-black tracking-[-0.04em] ${podiumNameClass(username)}`}
        style={style}
      >
        {username}
      </span>
    </RoomUiTooltip>
  );
};

const rankSurfaceClass = (rank: number) => {
  if (rank === 1) {
    return "bg-[linear-gradient(180deg,rgba(255,248,214,0.46)_0%,rgba(253,224,71,0.32)_8%,rgba(250,204,21,0.22)_18%,rgba(181,129,31,0.14)_30%,rgba(58,42,24,0.92)_46%,rgba(25,18,18,0.99)_100%)] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.34),inset_0_1px_0_rgba(255,248,214,0.18),0_42px_96px_-44px_rgba(250,204,21,0.68)]";
  }
  if (rank === 2) {
    return "bg-[linear-gradient(180deg,rgba(248,250,252,0.5)_0%,rgba(226,232,240,0.24)_8%,rgba(191,201,216,0.15)_18%,rgba(124,140,166,0.1)_30%,rgba(32,36,52,0.95)_100%)] shadow-[inset_0_0_0_1px_rgba(226,232,240,0.26),inset_0_1px_0_rgba(248,250,252,0.18),0_26px_60px_-40px_rgba(203,213,225,0.34)]";
  }
  return "bg-[linear-gradient(180deg,rgba(245,158,11,0.22)_0%,rgba(217,119,6,0.2)_8%,rgba(161,98,7,0.14)_18%,rgba(120,74,32,0.1)_30%,rgba(34,22,16,0.97)_100%)] shadow-[inset_0_0_0_1px_rgba(217,119,6,0.2),inset_0_1px_0_rgba(253,186,116,0.1),0_22px_52px_-38px_rgba(180,83,9,0.24)]";
};

const podiumLabel = (rank: number) => {
  if (rank === 1) return "冠軍";
  if (rank === 2) return "亞軍";
  return "季軍";
};

const podiumAuraClass = (rank: number) => {
  if (rank === 1) {
    return "before:absolute before:inset-x-[28%] before:-top-7 before:h-7 before:rounded-full before:bg-amber-200/8 before:blur-[14px] before:content-['']";
  }
  if (rank === 2) {
    return "before:absolute before:inset-x-[28%] before:-top-5 before:h-6 before:rounded-full before:bg-slate-100/8 before:blur-[11px] before:content-['']";
  }
  return "before:absolute before:inset-x-[30%] before:-top-4 before:h-5 before:rounded-full before:bg-orange-200/7 before:blur-[10px] before:content-['']";
};

const statDisplayName = (participant: RoomParticipant | null) => {
  if (!participant?.username) return "尚無資料";
  return participant.username.length > 10 ? `${participant.username.slice(0, 10)}...` : participant.username;
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
    {
      participant: runnerUp,
      rank: 2,
      orderClass: "order-1",
      heightClass: "min-h-[420px]",
      widthClass: "mx-auto w-full",
      topPadClass: "pt-[2rem]",
    },
    {
      participant: winner,
      rank: 1,
      orderClass: "order-2",
      heightClass: "min-h-[450px]",
      widthClass: "mx-auto w-full",
      topPadClass: "pt-3",
    },
    {
      participant: thirdPlace,
      rank: 3,
      orderClass: "order-3",
      heightClass: "min-h-[390px]",
      widthClass: "mx-auto w-full",
      topPadClass: "pt-[2rem]",
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
      <article className="relative overflow-hidden rounded-[28px] border border-amber-300/18 bg-[radial-gradient(circle_at_50%_-8%,rgba(250,204,21,0.24),transparent_32%),radial-gradient(circle_at_20%_100%,rgba(249,115,22,0.08),transparent_24%),linear-gradient(180deg,rgba(52,35,10,0.98),rgba(22,16,24,0.98))] p-5 shadow-[0_28px_80px_-48px_rgba(245,158,11,0.54)]">
        <div className="pointer-events-none absolute inset-x-[28%] top-0 h-16 rounded-full bg-amber-200/8 blur-[38px]" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-3xl font-black tracking-tight text-white">本場冠軍榜</h3>
          </div>
          <span className="rounded-full border border-amber-200/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-100">
            前 3 名玩家
          </span>
        </div>

        <div className="relative mt-6 grid min-h-[430px] grid-cols-3 items-end gap-4 px-1">
          {podium.map(
            ({ participant, rank, orderClass, heightClass, widthClass, topPadClass }) => {
              const combo = participant
                ? Math.max(participant.maxCombo ?? 0, participant.combo)
                : 0;
              const correctCount = participant?.correctCount ?? 0;
              const isChampion = rank === 1;
              const isMe = Boolean(meClientId && participant?.clientId === meClientId);
              const nameToneClass =
                rank === 1
                  ? "text-white"
                  : rank === 2
                    ? "text-slate-50"
                    : "text-orange-50";

              return (
                <div
                  key={`podium-${rank}`}
                  className={`relative overflow-hidden ${orderClass} ${heightClass} ${widthClass} ${topPadClass} rounded-[28px] px-4 pb-4 text-center ${rankSurfaceClass(rank)} ${podiumAuraClass(rank)} ${isMe ? "ring-1 ring-white/18" : ""
                    } ${rank === 1 ? "z-20" : rank === 2 ? "z-10" : "z-0"
                    }`}
                  style={rank === 1 ? { animation: "settlementChampionGlow 2.8s ease-in-out infinite" } : undefined}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/8" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-[linear-gradient(180deg,transparent,rgba(10,10,16,0.08)_55%,rgba(10,10,16,0.14))]" />
                  {isChampion && (
                    <>
                      <div
                        className="pointer-events-none absolute left-1/2 top-0 h-[356px] w-[252px] -translate-x-1/2 opacity-[0.8]"
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(250,204,21,0) 0%, rgba(255,244,194,0.06) 18%, rgba(255,249,226,0.26) 50%, rgba(255,244,194,0.06) 82%, rgba(250,204,21,0) 100%), linear-gradient(180deg, rgba(255,248,214,0.26) 0%, rgba(255,239,170,0.15) 18%, rgba(250,204,21,0.08) 42%, rgba(250,204,21,0.03) 68%, rgba(250,204,21,0) 100%)",
                          clipPath: "polygon(45% 0, 55% 0, 79% 100%, 21% 100%)",
                          filter: "blur(5px)",
                          maskImage:
                            "linear-gradient(180deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.86) 38%, rgba(0,0,0,0.48) 72%, rgba(0,0,0,0.12) 90%, rgba(0,0,0,0) 100%)",
                          animation: "settlementChampionSpotlight 3.8s ease-in-out infinite",
                        }}
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 top-0 h-[310px] w-[196px] -translate-x-1/2 opacity-[0.42]"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(255,250,228,0.18) 0%, rgba(255,245,190,0.08) 28%, rgba(250,204,21,0.03) 64%, rgba(250,204,21,0) 100%)",
                          clipPath: "polygon(46% 0, 54% 0, 72% 100%, 28% 100%)",
                          filter: "blur(9px)",
                          maskImage:
                            "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 56%, rgba(0,0,0,0.08) 90%, rgba(0,0,0,0) 100%)",
                        }}
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 top-5 h-24 w-[68%] -translate-x-1/2 rounded-full border border-amber-200/12 bg-[radial-gradient(circle,rgba(253,224,71,0.08),transparent_66%)] blur-[1px]"
                        style={{ animation: "settlementChampionHalo 3.2s ease-in-out infinite" }}
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 top-[43%] h-24 w-[58%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.12),rgba(250,204,21,0.03)_52%,transparent_74%)] blur-[12px]"
                        style={{ animation: "settlementChampionHalo 3.2s ease-in-out infinite 0.4s" }}
                      />
                      <div className="pointer-events-none absolute inset-x-[24%] top-0 h-8 rounded-[18px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,245,190,0.2),rgba(255,228,136,0.03)_56%,transparent_80%)] blur-[1.5px]" />
                      <div
                        className="pointer-events-none absolute left-[18%] top-20 h-3.5 w-3.5 rounded-full bg-amber-100/60 blur-[1px]"
                        style={{ animation: "settlementChampionSpark 1.8s ease-out infinite" }}
                      />
                      <div
                        className="pointer-events-none absolute right-[18%] top-24 h-3 w-3 rounded-full bg-amber-50/66 blur-[1px]"
                        style={{ animation: "settlementChampionSpark 2.1s ease-out infinite 0.45s" }}
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 top-28 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-amber-200/44 blur-[1px]"
                        style={{ animation: "settlementChampionSpark 1.9s ease-out infinite 0.9s" }}
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-amber-200/22 p-2 shadow-[0_0_38px_rgba(250,204,21,0.5)]"
                        style={{ animation: "settlementCrownFloat 2.1s ease-in-out infinite" }}
                      >
                        <WorkspacePremiumRoundedIcon className="text-[1.15rem] text-amber-50" />
                      </div>
                    </>
                  )}

                  <div
                    className={`relative z-10 mx-auto inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black tracking-[0.18em] ${rank === 1
                      ? "mt-10 border-amber-100/18 bg-black/18 text-amber-50"
                      : rank === 2
                        ? "mt-3 border-slate-200/16 bg-black/12 text-slate-100"
                        : "mt-0 border-orange-200/14 bg-black/10 text-orange-100"
                      }`}
                  >
                    {podiumLabel(rank)}
                  </div>

                  <div className={`relative z-10 mt-4 min-h-[4.9rem] px-1 ${nameToneClass}`}>
                    {renderPodiumName(participant, multilineEllipsis2Style)}
                  </div>

                  <div
                    className={`mx-auto mt-5 flex w-full max-w-[176px] flex-col items-center justify-center rounded-[24px] px-4 py-5 ${
                      rank === 1
                        ? "bg-[linear-gradient(180deg,rgba(11,10,14,0.08),rgba(11,10,14,0.22))] shadow-[inset_0_1px_0_rgba(255,245,190,0.06),0_16px_34px_-28px_rgba(250,204,21,0.14)]"
                        : rank === 2
                          ? "bg-[linear-gradient(180deg,rgba(9,12,20,0.14),rgba(9,12,20,0.24))] shadow-[inset_0_1px_0_rgba(226,232,240,0.04)]"
                          : "bg-[linear-gradient(180deg,rgba(14,10,10,0.12),rgba(14,10,10,0.24))] shadow-[inset_0_1px_0_rgba(249,115,22,0.04)]"
                      }`}
                  >
                    <p className="text-[3.25rem] font-black leading-none text-white">
                      {participant?.score ?? "--"}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold tracking-[0.08em] text-white/78">
                      {correctCount}/{playedQuestionCount || "--"} 題答對
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${comboTierClass(combo)}`}
                    >
                      Combo x{combo}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="mt-3 rounded-[24px] border border-amber-300/10 bg-[linear-gradient(180deg,rgba(251,191,36,0.05),rgba(15,23,42,0.42))] p-4 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.03)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-100/72">
                個人結算
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-[1.6rem] font-black leading-tight text-white">
                  {me ? `${myRank > 0 ? `第 ${myRank} 名` : "未列入排名"}` : "尚無玩家"}
                </p>
                {me && (
                  <p
                    className="min-w-0 text-base font-semibold text-amber-50/88"
                    style={multilineEllipsis2Style}
                  >
                    {me.username}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-full border border-white/5 bg-black/16 px-3 py-1 text-xs font-semibold text-white/76">
              {me ? `${me.correctCount ?? 0}/${playedQuestionCount} 題答對` : "尚無資料"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-white/5 bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <p className="text-[11px] tracking-[0.18em] text-white/58">排名</p>
              <p className="mt-3 text-4xl font-black text-white">
                {myRank > 0 ? `${myRank}/${Math.max(1, participantsLength)}` : "--"}
              </p>
            </div>
            <div className="rounded-[20px] border border-white/5 bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <p className="text-[11px] tracking-[0.18em] text-white/58">分數</p>
              <p className="mt-3 text-4xl font-black text-white">{me?.score ?? 0}</p>
            </div>
            <div className="rounded-[20px] border border-white/5 bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <p className="text-[11px] tracking-[0.18em] text-white/58">COMBO</p>
              <p className="mt-3 text-4xl font-black text-white">
                x{me ? Math.max(me.maxCombo ?? 0, me.combo) : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-cyan-300/10 bg-cyan-500/10 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.04)]">
            <p className="text-[11px] font-semibold text-cyan-100/88">最高準度</p>
            <p className="mt-3 text-4xl font-black text-cyan-50">
              {topAccuracyEntry ? formatPercent(topAccuracyEntry.accuracy) : "--"}
            </p>
            <p className="mt-2 text-sm font-semibold text-cyan-50/90">
              {topAccuracyEntry ? statDisplayName(topAccuracyEntry.participant) : "尚無資料"}
            </p>
          </div>
          <div className="rounded-[22px] border border-fuchsia-300/10 bg-fuchsia-500/10 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(217,70,239,0.04)]">
            <p className="text-[11px] font-semibold text-fuchsia-100/88">最高連擊</p>
            <p className="mt-3 text-4xl font-black text-fuchsia-50">
              {topComboEntry ? `x${topComboEntry.combo}` : "--"}
            </p>
            <p className="mt-2 text-sm font-semibold text-fuchsia-50/90">
              {topComboEntry ? statDisplayName(topComboEntry.participant) : "尚無資料"}
            </p>
          </div>
          <div className="rounded-[22px] border border-amber-300/10 bg-amber-500/10 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.04)]">
            <p className="text-[11px] font-semibold text-amber-100/88">最快平均作答</p>
            <p className="mt-3 text-4xl font-black text-amber-50">
              {fastestAverageAnswerEntry ? formatMs(fastestAverageAnswerEntry.ms) : "--"}
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-50/90">
              {fastestAverageAnswerEntry
                ? statDisplayName(fastestAverageAnswerEntry.participant)
                : "尚無資料"}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[28px] border border-cyan-300/18 bg-[radial-gradient(circle_at_16%_8%,rgba(34,211,238,0.14),transparent_18%),radial-gradient(circle_at_88%_100%,rgba(14,165,233,0.08),transparent_20%),linear-gradient(180deg,rgba(11,18,31,0.98),rgba(9,13,24,0.95))] p-5 shadow-[0_24px_70px_-52px_rgba(34,211,238,0.44)]">
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
              目前沒有可顯示的排行榜資料
            </div>
          ) : (
            sortedParticipants.map((participant, index) => {
              const rank = index + 1;
              const isMe = Boolean(meClientId && participant.clientId === meClientId);
              const metrics = participantScoreMeta.metricsByClientId[participant.clientId];
              const title = participantScoreMeta.byClientId[participant.clientId] ?? "尚無稱號";
              const titleTooltip =
                participantScoreMeta.tooltipByClientId[participant.clientId] ?? "尚無稱號說明";
              const combo =
                metrics?.combo ?? Math.max(participant.maxCombo ?? 0, participant.combo);

              return (
                <div
                  key={participant.clientId}
                  className={`rounded-[24px] border px-4 py-3 ${rank === 1
                    ? "border-amber-300/48 bg-[radial-gradient(circle_at_55%_50%,rgba(250,204,21,0.2),rgba(120,53,15,0.12)_52%,rgba(15,23,42,0.94)_100%)] shadow-[0_16px_40px_-34px_rgba(250,204,21,0.34)]"
                    : isMe
                      ? "border-sky-300/55 bg-sky-500/14 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
                      : "border-slate-700/80 bg-slate-950/58"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black ${rank === 1
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
                      <RoomUiTooltip title={titleTooltip}>
                        <span className="rounded-full border border-white/12 bg-black/26 px-2.5 py-1 text-[10px] font-semibold text-white/84">
                          {title}
                        </span>
                      </RoomUiTooltip>
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

