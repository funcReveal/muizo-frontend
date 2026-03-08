import React from "react";
import { Badge, Chip } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";

import type { ChatMessage, RoomParticipant } from "../../../model/types";
import type { TopTwoSwapState } from "./gameRoomPageTypes";
import { resolveComboTier } from "../../gameRoomUiUtils";
import type { ScoreboardRow } from "./gameRoomPageDerivations";
import GameRoomChatPanel from "./GameRoomChatPanel";

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
  className?: string;
  showChat?: boolean;
  onOpenMobileChat?: () => void;
  mobileChatUnread?: number;
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
  className,
  showChat = true,
  onOpenMobileChat,
  mobileChatUnread = 0,
}) => {
  return (
    <aside
      className={`game-room-panel game-room-panel--left game-room-panel--blaze flex h-full w-full flex-col gap-3 overflow-hidden p-3 text-slate-50 ${className ?? ""}`}
    >
      <div className="flex items-center gap-3">
        <div>
          <p className="game-room-kicker">排行榜</p>
          <p className="game-room-title">分數榜</p>
        </div>
        <span className="ml-2 text-[11px] text-slate-400">(前五名 + 自己)</span>
        <div className="ml-auto flex items-center gap-2">
          {!showChat && onOpenMobileChat && (
            <button
              type="button"
              onClick={onOpenMobileChat}
              className="game-room-mobile-chat-entry inline-flex items-center gap-1 rounded-full border border-cyan-300/45 bg-cyan-500/12 px-2 py-1 text-[11px] font-semibold text-cyan-100"
            >
              <Badge
                color="error"
                badgeContent={mobileChatUnread > 99 ? "99+" : mobileChatUnread}
                invisible={mobileChatUnread <= 0}
              >
                <ChatBubbleRoundedIcon className="text-[0.9rem]" />
              </Badge>
              聊天
            </button>
          )}
          <Chip
            label={`已答 ${answeredCount}/${participantCount || 0}`}
            size="small"
            color="success"
            variant="outlined"
            className="game-room-chip"
          />
        </div>
      </div>

      <div className="game-room-scoreboard-stack space-y-1.5">
        {scoreboardRows.length === 0 ? (
          <div className="text-xs text-slate-500">目前沒有玩家</div>
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

            const p = row.player as RoomParticipant;
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
                    ? "已送出答案"
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

            const rowComboTier = resolveComboTier(p.combo ?? 0);
            const rowComboTierClass =
              rowComboTier > 0 ? `game-room-score-row--combo-tier-${rowComboTier}` : "";
            const isMeRow = p.clientId === meClientId;

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
                } ${isMeRow ? "game-room-score-row--me game-room-score-row--me-locate" : ""} ${
                  topSwapRole === "first"
                    ? "game-room-score-row--top-swap-first"
                    : topSwapRole === "second"
                      ? "game-room-score-row--top-swap-second"
                      : ""
                } ${rowComboTierClass} ${
                  rowComboTier > 0 ? "game-room-score-row--combo-flare" : ""
                }`}
              >
                <span className="truncate flex items-center gap-2">
                  {hasAnswered && (
                    <span
                      className={`h-2 w-2 rounded-full ${answerDotClass}`}
                      title={answerDotTitle}
                    />
                  )}
                  <span className="truncate">
                    {idx + 1}. {isMeRow ? `${p.username}（我）` : p.username}
                  </span>
                  {isMeRow && (
                    <span className="game-room-score-row-you-badge" title="你">
                      YOU
                    </span>
                  )}
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
                      {topSwapRole === "first" ? "冠軍" : "亞軍"}
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

      {showChat && (
        <>
          <div className="h-px bg-slate-800/80" />
          <GameRoomChatPanel
            danmuEnabled={danmuEnabled}
            onDanmuEnabledChange={onDanmuEnabledChange}
            messagesLength={messagesLength}
            recentMessages={recentMessages}
            messageInput={messageInput}
            onMessageChange={onMessageChange}
            onSendMessage={onSendMessage}
            chatScrollRef={chatScrollRef}
            variant="sidebar"
          />
        </>
      )}
    </aside>
  );
};

export default GameRoomLeftSidebar;
