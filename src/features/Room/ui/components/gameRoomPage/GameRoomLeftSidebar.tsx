import React from "react";
import { Badge, Chip } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";

import type { ChatMessage, RoomParticipant } from "../../../model/types";
import { normalizeRoomDisplayText } from "../../../model/roomProviderUtils";
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
  mobileMinimalHeader?: boolean;
  swapAnimationEnabled?: boolean;
  swapReplayToken?: number;
}

const RANK_SWAP_DURATION_MS = 960;
const MAX_RANK_SWAP_OFFSET_ROWS = 6;
const DESKTOP_FLIP_BASE_DURATION_MS = 860;
const DESKTOP_FLIP_MAX_DURATION_MS = 1680;
const DESKTOP_FLIP_ROW_HEIGHT_PX = 60;

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
  mobileMinimalHeader = false,
  swapAnimationEnabled = true,
  swapReplayToken = 0,
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
  const rowElementByClientIdRef = React.useRef(new Map<string, HTMLDivElement>());
  const previousDesktopTopByClientIdRef = React.useRef(new Map<string, number>());
  const desktopFlipAnimationsRef = React.useRef<Animation[]>([]);

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

    const previousOrderIndexByClientId = new Map<string, number>(
      previousOrder.map((clientId, index) => [clientId, index]),
    );
    const offsetByClientId: Record<string, number> = {};
    displayedPlayerOrder.forEach((clientId, nextIndex) => {
      const previousIndex = previousOrderIndexByClientId.get(clientId);
      if (typeof previousIndex !== "number" || previousIndex === nextIndex) return;
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
      220,
      70 + Math.max(0, farthestOffsetRows - 1) * 36,
    );
    rankSwapTimerRef.current = window.setTimeout(() => {
      setRankSwapState((current) =>
        current?.key === animationKey ? null : current,
      );
      rankSwapTimerRef.current = null;
    }, RANK_SWAP_DURATION_MS + releaseDelayMs + 160);
  }, [displayedPlayerOrder, swapAnimationEnabled, swapReplayToken]);

  React.useLayoutEffect(() => {
    if (mobileOverlayMode) {
      desktopFlipAnimationsRef.current.forEach((animation) => animation.cancel());
      desktopFlipAnimationsRef.current = [];
      previousDesktopTopByClientIdRef.current.clear();
      return;
    }

    const nextTopByClientId = new Map<string, number>();
    displayedPlayerOrder.forEach((clientId) => {
      const rowElement = rowElementByClientIdRef.current.get(clientId);
      if (!rowElement) return;
      nextTopByClientId.set(clientId, rowElement.getBoundingClientRect().top);
    });

    const previousTopByClientId = previousDesktopTopByClientIdRef.current;
    if (!swapAnimationEnabled || previousTopByClientId.size === 0) {
      previousDesktopTopByClientIdRef.current = nextTopByClientId;
      return;
    }

    const movedRows: Array<{
      element: HTMLDivElement;
      deltaY: number;
    }> = [];
    nextTopByClientId.forEach((nextTop, clientId) => {
      const prevTop = previousTopByClientId.get(clientId);
      if (typeof prevTop !== "number") return;
      const deltaY = prevTop - nextTop;
      if (Math.abs(deltaY) < 1) return;
      const rowElement = rowElementByClientIdRef.current.get(clientId);
      if (!rowElement) return;
      movedRows.push({ element: rowElement, deltaY });
    });

    desktopFlipAnimationsRef.current.forEach((animation) => animation.cancel());
    desktopFlipAnimationsRef.current = [];

    movedRows.forEach(({ element, deltaY }) => {
      const distanceRows = Math.max(
        1,
        Math.min(
          MAX_RANK_SWAP_OFFSET_ROWS,
          Math.abs(deltaY) / DESKTOP_FLIP_ROW_HEIGHT_PX,
        ),
      );
      const durationMs = Math.min(
        DESKTOP_FLIP_MAX_DURATION_MS,
        DESKTOP_FLIP_BASE_DURATION_MS + Math.max(0, distanceRows - 1) * 160,
      );
      const overshootY = deltaY > 0 ? -10 : 10;
      const animation = element.animate(
        [
          {
            transform: `translateY(${deltaY}px)`,
            opacity: 0.88,
            filter: "brightness(0.9) saturate(0.95)",
          },
          {
            transform: `translateY(${Math.round(deltaY * 0.5)}px)`,
            opacity: 1,
            filter: "brightness(1.04) saturate(1.02)",
            offset: 0.48,
          },
          {
            transform: `translateY(${overshootY}px)`,
            opacity: 1,
            filter: "brightness(1.02) saturate(1.01)",
            offset: 0.82,
          },
          {
            transform: "translateY(0)",
            opacity: 1,
            filter: "brightness(1) saturate(1)",
          },
        ],
        {
          duration: Math.round(durationMs),
          easing: "cubic-bezier(0.2, 0.82, 0.24, 1)",
          fill: "both",
        },
      );
      desktopFlipAnimationsRef.current.push(animation);
    });

    previousDesktopTopByClientIdRef.current = nextTopByClientId;
  }, [displayedPlayerOrder, mobileOverlayMode, swapAnimationEnabled, swapReplayToken]);

  React.useEffect(
    () => () => {
      if (rankSwapTimerRef.current !== null) {
        window.clearTimeout(rankSwapTimerRef.current);
        rankSwapTimerRef.current = null;
      }
      desktopFlipAnimationsRef.current.forEach((animation) => animation.cancel());
      desktopFlipAnimationsRef.current = [];
    },
    [],
  );

  return (
    <aside
      className={`game-room-panel game-room-panel--left game-room-panel--blaze flex h-full w-full flex-col gap-3 overflow-hidden p-3 text-slate-50 ${
        mobileOverlayMode ? "game-room-left-sidebar--mobile-overlay" : ""
      } ${mobileMinimalHeader ? "game-room-left-sidebar--mobile-minimal-header" : ""} ${
        className ?? ""
      }`}
    >
      {!mobileMinimalHeader && (
        <>
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
        </>
      )}

      <div className="game-room-scoreboard-stack space-y-1.5">
        {scoreboardRows.length === 0 ? (
          <div className="text-xs text-slate-500">尚無玩家資料</div>
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
                    ? "已作答"
                    : "尚未作答";
            const answerChipColor: "default" | "success" | "error" | "warning" =
              rowAnswerState === "correct"
                ? "success"
                : rowAnswerState === "wrong"
                  ? "error"
                  : rowAnswerState === "answered"
                    ? "warning"
                    : "default";

            const rankSwapOffsetRows =
              rankSwapState?.offsetByClientId[p.clientId] ?? 0;
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
            const shouldUseCssSwapAnimation = mobileOverlayMode;
            const hasTopSwapAnimation = topSwapRole !== null && !mobileOverlayMode;
            const topSwapOffsetRows =
              topSwapRole === "first"
                ? (topTwoSwapState?.firstOffsetRows ?? 1)
                : topSwapRole === "second"
                  ? (topTwoSwapState?.secondOffsetRows ?? -1)
                  : 0;
            const rowSwapOffsetRows =
              rankSwapOffsetRows !== 0 ? rankSwapOffsetRows : topSwapOffsetRows;
            const hasRowSwapAnimation = rowSwapOffsetRows !== 0;
            const isTopSwapParticipant = Boolean(
              topTwoSwapState &&
                (p.clientId === topTwoSwapState.firstClientId ||
                  p.clientId === topTwoSwapState.secondClientId),
            );
            const rowSwapDistanceRows = Math.abs(rowSwapOffsetRows);
            const swapRowHeightPx = mobileOverlayMode ? 58 : 60;
            const rowSwapStartPx = rowSwapOffsetRows * swapRowHeightPx;
            const rowSwapMidPx = Math.round(rowSwapStartPx * 0.52);
            const rowSwapOvershootPx =
              rowSwapOffsetRows > 0
                ? -Math.min(12, 6 + rowSwapDistanceRows * 1.8)
                : Math.min(12, 6 + rowSwapDistanceRows * 1.8);
            const rowSwapDurationMs = Math.min(
              1680,
              RANK_SWAP_DURATION_MS +
                Math.max(0, rowSwapDistanceRows - 1) * 128,
            );
            const rowSwapDelayMs =
              rowSwapOffsetRows < 0
                ? Math.min(
                    260,
                    90 + Math.max(0, rowSwapDistanceRows - 1) * 40,
                  )
                : 0;
            const topSwapDistanceRows = Math.max(1, Math.abs(topSwapOffsetRows));
            const topSwapStartPx = topSwapOffsetRows * swapRowHeightPx;
            const topSwapMidPx = Math.round(topSwapStartPx * 0.42);
            const topSwapOvershootPx =
              topSwapOffsetRows > 0
                ? -Math.min(12, 5 + topSwapDistanceRows * 1.2)
                : Math.min(12, 5 + topSwapDistanceRows * 1.2);
            const topSwapDurationMs = Math.min(
              1880,
              1320 + Math.max(0, topSwapDistanceRows - 1) * 130,
            );
            const topSwapDelayMs = topSwapRole === "second" ? 80 : 0;
            const swapReplayNudgeMs =
              rankSwapState !== null ? (rankSwapState.key % 17) * 0.07 : 0;
            const rowSwapStyle = shouldUseCssSwapAnimation && hasRowSwapAnimation
              ? ({
                  "--game-room-rank-swap-start": `${rowSwapStartPx}px`,
                  "--game-room-rank-swap-mid": `${rowSwapMidPx}px`,
                  "--game-room-rank-swap-overshoot": `${rowSwapOvershootPx}px`,
                  "--game-room-rank-swap-duration": `${rowSwapDurationMs + swapReplayNudgeMs}ms`,
                  "--game-room-rank-swap-delay": `${rowSwapDelayMs}ms`,
                  ...(hasTopSwapAnimation
                    ? {
                        "--game-room-swap-start": `${topSwapStartPx}px`,
                        "--game-room-swap-mid": `${topSwapMidPx}px`,
                        "--game-room-swap-overshoot": `${topSwapOvershootPx}px`,
                        "--game-room-swap-duration": `${topSwapDurationMs}ms`,
                        "--game-room-swap-second-delay": `${topSwapDelayMs}ms`,
                        "--game-room-swap-tilt-start":
                          topSwapRole === "first" ? "-2.2deg" : "1.6deg",
                        "--game-room-swap-tilt-end":
                          topSwapRole === "first" ? "1.1deg" : "-1deg",
                      }
                    : {}),
                } as React.CSSProperties)
              : undefined;

            const rowComboTier = resolveComboTier(p.combo ?? 0);
            const rowComboTierClass =
              rowComboTier > 0 ? `game-room-score-row--combo-tier-${rowComboTier}` : "";
            const shouldShowComboFlare = rowComboTier > 0 && !mobileOverlayMode;
            const isMeRow = p.clientId === meClientId;
            const displayName = normalizeRoomDisplayText(
              p.username,
              `玩家 ${idx + 1}`,
            );
            const username = isMeRow ? `${displayName}（我）` : displayName;

            return (
              <div
                key={p.clientId}
                ref={(node) => {
                  if (node) {
                    rowElementByClientIdRef.current.set(p.clientId, node);
                    return;
                  }
                  rowElementByClientIdRef.current.delete(p.clientId);
                }}
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
                  shouldUseCssSwapAnimation && hasTopSwapAnimation
                    ? topSwapRole === "first"
                      ? "game-room-score-row--top-swap-first"
                      : "game-room-score-row--top-swap-second"
                    : ""
                } ${
                  shouldUseCssSwapAnimation && hasRowSwapAnimation
                    ? rowSwapOffsetRows > 0
                      ? "game-room-score-row--rank-swap-up"
                      : "game-room-score-row--rank-swap-down"
                    : ""
                } ${
                  hasRowSwapAnimation && isTopSwapParticipant
                    ? "game-room-score-row--rank-swap-focus"
                    : ""
                } ${rowComboTierClass} ${
                  shouldShowComboFlare ? "game-room-score-row--combo-flare" : ""
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
                    {idx + 1}. {username}
                  </span>
                  {isMeRow && (
                    <span className="game-room-score-row-you-badge" title="你">
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
