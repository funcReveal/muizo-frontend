import React from "react";
import { Button, Chip, Switch } from "@mui/material";

import type { ChatMessage, RoomParticipant } from "../../../model/types";
import type { TopTwoSwapState } from "./gameRoomPageTypes";

type ScoreboardRow =
  | { type: "player"; player: RoomParticipant }
  | { type: "placeholder"; key: string };

interface GameRoomLeftSidebarProps {
  answeredCount: number;
  participantCount: number;
  scoreboardRows: ScoreboardRow[];
  answeredClientIdSet: Set<string>;
  answeredRankByClientId: Map<string, number>;
  scorePartsByClientId: Map<string, { base: number; gain: number }>;
  isReveal: boolean;
  meClientId?: string;
  topTwoSwapState: TopTwoSwapState | null;
  danmuEnabled: boolean;
  onDanmuEnabledChange: (enabled: boolean) => void;
  messagesLength: number;
  recentMessages: ChatMessage[];
  messageInput: string;
  onMessageChange?: (value: string) => void;
  onSendMessage?: () => void;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
}

const GameRoomLeftSidebar: React.FC<GameRoomLeftSidebarProps> = ({
  answeredCount,
  participantCount,
  scoreboardRows,
  answeredClientIdSet,
  answeredRankByClientId,
  scorePartsByClientId,
  isReveal,
  meClientId,
  topTwoSwapState,
  danmuEnabled,
  onDanmuEnabledChange,
  messagesLength,
  recentMessages,
  messageInput,
  onMessageChange,
  onSendMessage,
  chatScrollRef,
}) => {
  return (
    <aside className="game-room-panel game-room-panel--left flex h-full flex-col gap-3 overflow-hidden p-3 text-slate-50">
      <div className="flex items-center gap-3">
        <div>
          <p className="game-room-kicker">排行榜</p>
          <p className="game-room-title">分數榜</p>
        </div>
        <span className="ml-2 text-[11px] text-slate-400">(前五名 + 自己)</span>
        <Chip
          label={`已答 ${answeredCount}/${participantCount || 0}`}
          size="small"
          color="success"
          variant="outlined"
          className="ml-auto game-room-chip"
        />
      </div>
      <div className="space-y-2">
        {scoreboardRows.length === 0 ? (
          <div className="text-xs text-slate-500">尚無玩家</div>
        ) : (
          scoreboardRows.map((row, idx) => {
            if (row.type === "placeholder") {
              return (
                <div
                  key={row.key}
                  className="game-room-score-row game-room-score-row--placeholder flex items-center justify-between text-sm"
                  aria-hidden="true"
                >
                  <span className="truncate flex items-center gap-2">
                    {idx + 1}. <span>等待加入</span>
                  </span>
                  <span className="text-[11px] text-slate-500">--</span>
                </div>
              );
            }
            const p = row.player;
            const hasAnswered = answeredClientIdSet.has(p.clientId);
            const answerRank = answeredRankByClientId.get(p.clientId);
            const scoreParts = scorePartsByClientId.get(p.clientId) ?? {
              base: p.score,
              gain: 0,
            };
            const rowAnswerState = isReveal
              ? hasAnswered
                ? scoreParts.gain > 0
                  ? "correct"
                  : "wrong"
                : "unanswered"
              : hasAnswered
                ? "answered"
                : "pending";
            const answerDotClass =
              rowAnswerState === "correct"
                ? "bg-emerald-400"
                : rowAnswerState === "wrong"
                  ? "bg-rose-400"
                  : rowAnswerState === "answered"
                    ? "bg-amber-300"
                    : "bg-slate-500";
            const answerDotTitle =
              rowAnswerState === "correct"
                ? "本題答對"
                : rowAnswerState === "wrong"
                  ? "本題答錯"
                  : rowAnswerState === "answered"
                    ? "已選答案"
                    : "尚未作答";
            const answerChipColor: "default" | "success" | "error" | "warning" =
              rowAnswerState === "correct"
                ? "success"
                : rowAnswerState === "wrong"
                  ? "error"
                  : rowAnswerState === "answered"
                    ? "warning"
                    : "default";
            const topSwapRole =
              topTwoSwapState &&
              idx === 0 &&
              p.clientId === topTwoSwapState.firstClientId
                ? "first"
                : topTwoSwapState &&
                    idx === 1 &&
                    p.clientId === topTwoSwapState.secondClientId
                  ? "second"
                  : null;
            return (
              <div
                key={p.clientId}
                className={`game-room-score-row flex items-center justify-between text-sm ${
                  isReveal ? "game-room-score-row--revealed" : ""
                } ${
                  rowAnswerState === "correct"
                    ? "game-room-score-row--correct"
                    : rowAnswerState === "wrong"
                      ? "game-room-score-row--wrong"
                      : rowAnswerState === "answered"
                        ? "game-room-score-row--answered"
                        : ""
                } ${p.clientId === meClientId ? "game-room-score-row--me" : ""} ${
                  topSwapRole === "first"
                    ? "game-room-score-row--top-swap-first"
                    : topSwapRole === "second"
                      ? "game-room-score-row--top-swap-second"
                      : ""
                }`}
              >
                <span className="truncate flex items-center gap-2">
                  {hasAnswered && (
                    <span
                      className={`h-2 w-2 rounded-full ${answerDotClass}`}
                      title={answerDotTitle}
                    />
                  )}
                  {idx + 1}. {p.clientId === meClientId ? `${p.username}（我）` : p.username}
                </span>
                <div className="flex items-center gap-2">
                  {topSwapRole && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        topSwapRole === "first"
                          ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                          : "border-slate-400/35 bg-slate-700/45 text-slate-200"
                      }`}
                    >
                      {topSwapRole === "first" ? "奪冠" : "交棒"}
                    </span>
                  )}
                  {typeof answerRank === "number" ? (
                    <Chip
                      label={`第${answerRank}答`}
                      size="small"
                      color={answerChipColor}
                      variant="filled"
                    />
                  ) : (
                    <Chip label="未答" size="small" variant="outlined" />
                  )}
                  <span className="font-semibold text-emerald-300 tabular-nums">
                    {p.score.toLocaleString()}
                    {isReveal && scoreParts.gain !== 0 && (
                      <span
                        className={`ml-1 ${
                          scoreParts.gain > 0
                            ? "text-sky-300 game-room-score-gain-pop"
                            : "text-rose-300 game-room-score-loss-pop"
                        }`}
                      >
                        {scoreParts.gain > 0 ? `+${scoreParts.gain}` : scoreParts.gain}
                      </span>
                    )}
                    {p.combo > 0 && <span className="ml-1 text-amber-300">x{p.combo}</span>}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="h-px bg-slate-800/80" />

      <div className="game-room-chat flex min-h-[240px] flex-1 flex-col gap-2 overflow-hidden p-3">
        <div className="game-room-chat-header flex items-center justify-between text-sm font-semibold text-slate-200">
          <div className="flex items-center gap-2">
            <span>聊天室</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">彈幕</span>
            <Switch
              size="small"
              color="info"
              checked={danmuEnabled}
              onChange={(event) => onDanmuEnabledChange(event.target.checked)}
            />
            <span className="text-[11px] text-slate-500">{danmuEnabled ? "開啟" : "關閉"}</span>
            <span className="text-xs text-slate-400">{messagesLength} 則訊息</span>
          </div>
        </div>
        <div className="game-room-chat-divider h-px" />
        <div
          ref={chatScrollRef}
          className="game-room-chat-list flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1 md:max-h-80"
        >
          {recentMessages.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">目前沒有訊息</div>
          ) : (
            recentMessages.map((msg) => {
              const isPresenceSystemMessage = msg.userId === "system:presence";
              if (isPresenceSystemMessage) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="max-w-full rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <span className="font-medium text-slate-200">{msg.content}</span>
                      <span className="ml-2 text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="flex">
                  <div className="game-room-chat-bubble game-room-chat-message max-w-full px-2.5 py-1.5 text-xs">
                    <div className="flex items-center gap-4 text-[11px] text-slate-300">
                      <span className="font-semibold">{msg.username}</span>
                      <span className="text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="mt-1 whitespace-pre-wrap wrap-anywhere leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="game-room-chat-input-field flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            placeholder="輸入訊息..."
            value={messageInput}
            onChange={(e) => onMessageChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSendMessage?.();
              }
            }}
          />
          <Button
            variant="contained"
            color="info"
            size="small"
            className="game-room-chat-send"
            onClick={() => onSendMessage?.()}
          >
            送出
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default GameRoomLeftSidebar;
