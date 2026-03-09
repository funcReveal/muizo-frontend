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
  mobileOverlayMode?: boolean;
  swapAnimationEnabled?: boolean;
}

const RANK_SWAP_DURATION_MS = 1180;
const MAX_RANK_SWAP_OFFSET_ROWS = 6;

type RankSwapState = {
  key: number;
  offsetByClientId: Record<string, number>;
};

const clampRankSwapOffsetRows = (value: number) =>
  Math.max(-MAX_RANK_SWAP_OFFSET_ROWS, Math.min(MAX_RANK_SWAP_OFFSET_ROWS, value));

const resolveScoreboardPlayerOrder = (rows: ScoreboardRow[]) =>
  rows.flatMap((row) => (row.type === "player" ? [row.player.clientId] : []));

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
  mobileOverlayMode = false,
  swapAnimationEnabled = true,
}) => {
  const displayedPlayerOrder = React.useMemo(
    () => resolveScoreboardPlayerOrder(scoreboardRows),
    [scoreboardRows],
  );
  const [rankSwapState, setRankSwapState] = React.useState<RankSwapState | null>(
    null,
  );
  const lastDisplayedPlayerOrderRef = React.useRef<string[]>([]);
  const rankSwapTimerRef = React.useRef<number | null>(null);
  const rankSwapKeyRef = React.useRef(0);

  React.useLayoutEffect(() => {
    if (displayedPlayerOrder.length === 0) {
      lastDisplayedPlayerOrderRef.current = [];
      if (rankSwapTimerRef.current !== null) {
        window.clearTimeout(rankSwapTimerRef.current);
        rankSwapTimerRef.current = null;
      }
      setRankSwapState(null);
      return;
    }

    const previousOrder = lastDisplayedPlayerOrderRef.current;
    if (previousOrder.length === 0) {
      lastDisplayedPlayerOrderRef.current = displayedPlayerOrder;
      return;
    }

    if (!swapAnimationEnabled) {
      if (rankSwapTimerRef.current !== null) {
        window.clearTimeout(rankSwapTimerRef.current);
        rankSwapTimerRef.current = null;
      }
      setRankSwapState(null);
      return;
    }

    const offsetByClientId: Record<string, number> = {};
    displayedPlayerOrder.forEach((clientId, nextIndex) => {
      const previousIndex = previousOrder.indexOf(clientId);
      if (previousIndex < 0 || previousIndex === nextIndex) return;
      const offsetRows = clampRankSwapOffsetRows(previousIndex - nextIndex);
      if (offsetRows !== 0) {
        offsetByClientId[clientId] = offsetRows;
      }
    });

    lastDisplayedPlayerOrderRef.current = displayedPlayerOrder;
    const movedOffsets = Object.values(offsetByClientId);
    if (movedOffsets.length === 0) return;

    if (rankSwapTimerRef.current !== null) {
      window.clearTimeout(rankSwapTimerRef.current);
      rankSwapTimerRef.current = null;
    }
    rankSwapKeyRef.current += 1;
    const animationKey = rankSwapKeyRef.current;
    setRankSwapState({
      key: animationKey,
      offsetByClientId,
    });
    const farthestOffsetRows = movedOffsets.reduce(
      (max, offsetRows) => Math.max(max, Math.abs(offsetRows)),
      1,
    );
    const releaseDelayMs = Math.min(
      260,
      80 + Math.max(0, farthestOffsetRows - 1) * 40,
    );
    rankSwapTimerRef.current = window.setTimeout(() => {
      setRankSwapState((current) =>
        current?.key === animationKey ? null : current,
      );
      rankSwapTimerRef.current = null;
    }, RANK_SWAP_DURATION_MS + releaseDelayMs + 220);
  }, [displayedPlayerOrder, swapAnimationEnabled]);

  React.useEffect(
    () => () => {
      if (rankSwapTimerRef.current !== null) {
        window.clearTimeout(rankSwapTimerRef.current);
        rankSwapTimerRef.current = null;
      }
    },
    [],
  );

  return (
    <aside
      className={`game-room-panel game-room-panel--left game-room-panel--blaze flex h-full w-full flex-col gap-3 overflow-hidden p-3 text-slate-50 ${
        mobileOverlayMode ? "game-room-left-sidebar--mobile-overlay" : ""
      } ${className ?? ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="game-room-kicker">排行榜</p>
          <p className="game-room-title">分數榜</p>
        </div>
        {!mobileOverlayMode && (
          <span className="ml-2 text-[11px] text-slate-400">(前五名 + 自己)</span>
        )}
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

      {mobileOverlayMode && (
        <p className="-mt-1 text-[11px] text-slate-400">(前五名 + 自己)</p>
      )}

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

            const rowSwapOffsetRows =
              rankSwapState?.offsetByClientId[p.clientId] ?? 0;
            const hasRowSwapAnimation = rowSwapOffsetRows !== 0;
            const isTopSwapParticipant = Boolean(
              topTwoSwapState &&
                (p.clientId === topTwoSwapState.firstClientId ||
                  p.clientId === topTwoSwapState.secondClientId),
            );
            const rowSwapDistanceRows = Math.abs(rowSwapOffsetRows);
            const swapRowHeightPx = mobileOverlayMode ? 58 : 44;
            const rowSwapStartPx = rowSwapOffsetRows * swapRowHeightPx;
            const rowSwapMidPx = Math.round(rowSwapStartPx * 0.34);
            const rowSwapOvershootPx =
              rowSwapOffsetRows > 0
                ? -Math.min(14, 6 + rowSwapDistanceRows * 1.6)
                : Math.min(14, 6 + rowSwapDistanceRows * 1.6);
            const rowSwapDurationMs = Math.min(
              1520,
              RANK_SWAP_DURATION_MS +
                Math.max(0, rowSwapDistanceRows - 1) * 120,
            );
            const rowSwapDelayMs =
              rowSwapOffsetRows < 0
                ? Math.min(
                    260,
                    90 + Math.max(0, rowSwapDistanceRows - 1) * 42,
                  )
                : 0;
            const rowSwapStyle = hasRowSwapAnimation
              ? ({
                  "--game-room-rank-swap-start": `${rowSwapStartPx}px`,
                  "--game-room-rank-swap-mid": `${rowSwapMidPx}px`,
                  "--game-room-rank-swap-overshoot": `${rowSwapOvershootPx}px`,
                  "--game-room-rank-swap-duration": `${rowSwapDurationMs}ms`,
                  "--game-room-rank-swap-delay": `${rowSwapDelayMs}ms`,
                } as React.CSSProperties)
              : undefined;

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
                  hasRowSwapAnimation
                    ? rowSwapOffsetRows > 0
                      ? "game-room-score-row--rank-swap-up"
                      : "game-room-score-row--rank-swap-down"
                    : ""
                } ${
                  hasRowSwapAnimation && isTopSwapParticipant
                    ? "game-room-score-row--rank-swap-focus"
                    : ""
                } ${rowComboTierClass} ${
                  rowComboTier > 0 ? "game-room-score-row--combo-flare" : ""
                }`}
                style={rowSwapStyle}
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
                    <span className="game-room-score-row-you-badge" title="你的位置">
                      YOU
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
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
