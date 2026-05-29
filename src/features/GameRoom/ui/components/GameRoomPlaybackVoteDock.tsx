import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Button } from "@mui/material";
import HowToVoteRoundedIcon from "@mui/icons-material/HowToVoteRounded";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";

type PlaybackVoteDockPosition = {
  x: number;
  y: number;
};

type PlaybackVoteDockDragBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type GameRoomPlaybackVoteDockProps = {
  voteKey: string;
  requesterName: string;
  proposalSeconds: number;
  approveCount: number;
  rejectCount: number;
  majorityCount: number;
  eligibleCount: number;
  myVote: "approve" | "reject" | null;
  submitPending: "approve" | "reject" | null;
  canVote: boolean;
  hasPendingVoteAttention: boolean;
  collapsed: boolean;
  position: PlaybackVoteDockPosition;
  onCollapsedChange: (collapsed: boolean) => void;
  onPositionChange: (position: PlaybackVoteDockPosition) => void;
  onApprove: () => void;
  onReject: () => void;
};

const DOCK_VIEWPORT_MARGIN_PX = 8;
const DEFAULT_DOCK_RAIL_WIDTH_PX = 42;
const AUTO_COLLAPSE_DELAY_MS = 10_000;

const getDockRailWidth = (dockElement: HTMLElement) => {
  const value = Number.parseFloat(
    window
      .getComputedStyle(dockElement)
      .getPropertyValue("--game-room-restart-vote-dock-rail-width"),
  );
  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_DOCK_RAIL_WIDTH_PX;
};

const getViewportSize = () => ({
  width: window.visualViewport?.width ?? window.innerWidth,
  height: window.visualViewport?.height ?? window.innerHeight,
});

const getDragBounds = (
  dockElement: HTMLElement | null,
): PlaybackVoteDockDragBounds => {
  if (!dockElement) {
    return {
      minX: Number.NEGATIVE_INFINITY,
      maxX: 0,
      minY: 0,
      maxY: Number.POSITIVE_INFINITY,
    };
  }

  const { width: viewportWidth, height: viewportHeight } = getViewportSize();
  const parentRect = dockElement.parentElement?.getBoundingClientRect();
  const dockWidth = dockElement.offsetWidth;
  const dockHeight = dockElement.offsetHeight;
  const railWidth = getDockRailWidth(dockElement);
  const baseLeft =
    (parentRect?.right ?? viewportWidth - DOCK_VIEWPORT_MARGIN_PX) - dockWidth;
  const baseTop = parentRect?.top ?? DOCK_VIEWPORT_MARGIN_PX;
  const minX = DOCK_VIEWPORT_MARGIN_PX - (baseLeft - railWidth);
  const maxX = Math.max(minX, 0);
  const minY = DOCK_VIEWPORT_MARGIN_PX - baseTop;
  const maxY = Math.max(
    minY,
    viewportHeight - DOCK_VIEWPORT_MARGIN_PX - baseTop - dockHeight,
  );

  return { minX, maxX, minY, maxY };
};

const clampPositionToBounds = (
  position: PlaybackVoteDockPosition,
  bounds: PlaybackVoteDockDragBounds,
): PlaybackVoteDockPosition => ({
  x: Math.min(bounds.maxX, Math.max(bounds.minX, position.x)),
  y: Math.min(bounds.maxY, Math.max(bounds.minY, position.y)),
});

const getDockTransform = (
  position: PlaybackVoteDockPosition,
  collapsed: boolean,
) => {
  const transformX = collapsed
    ? "var(--game-room-restart-vote-dock-collapse-x)"
    : `${position.x}px`;
  return `translate3d(${transformX}, ${position.y}px, 0)`;
};

const applyDockTransform = (
  dockElement: HTMLElement | null,
  position: PlaybackVoteDockPosition,
  collapsed: boolean,
) => {
  if (!dockElement) return;
  dockElement.style.transform = getDockTransform(position, collapsed);
};

const GameRoomPlaybackVoteDock = memo(function GameRoomPlaybackVoteDock({
  voteKey,
  requesterName,
  proposalSeconds,
  approveCount,
  rejectCount,
  majorityCount,
  eligibleCount,
  myVote,
  submitPending,
  canVote,
  hasPendingVoteAttention,
  collapsed,
  position,
  onCollapsedChange,
  onPositionChange,
  onApprove,
  onReject,
}: GameRoomPlaybackVoteDockProps) {
  const dockRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    originX: number;
    originY: number;
    bounds: PlaybackVoteDockDragBounds;
    latestPosition: PlaybackVoteDockPosition;
    moved: boolean;
  } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const pendingTransformRef = useRef<PlaybackVoteDockPosition | null>(null);
  const autoCollapseTimeoutRef = useRef<number | null>(null);
  const previousMyVoteRef = useRef<typeof myVote>(myVote);
  const suppressRailClickRef = useRef(false);

  const approvePercent =
    eligibleCount > 0 ? Math.round((approveCount / eligibleCount) * 100) : 0;
  const votedCount = Math.min(eligibleCount, approveCount + rejectCount);
  const progressSummary = `需要 ${majorityCount} 票 / 共 ${eligibleCount} 人`;
  const votedSummary = `已投票 ${votedCount}`;

  useEffect(() => {
    if (dragStartRef.current) return;
    applyDockTransform(dockRef.current, position, collapsed);
  }, [collapsed, position]);

  useEffect(
    () => () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
    },
    [],
  );

  const scheduleDockTransform = useCallback(
    (nextPosition: PlaybackVoteDockPosition) => {
      pendingTransformRef.current = nextPosition;
      if (dragRafRef.current !== null) return;
      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pendingPosition = pendingTransformRef.current;
        if (!pendingPosition) return;
        applyDockTransform(dockRef.current, pendingPosition, collapsed);
      });
    },
    [collapsed],
  );

  const setCollapsed = useCallback(
    (nextCollapsed: boolean) => {
      const nextPosition = nextCollapsed ? { x: 0, y: position.y } : position;
      applyDockTransform(dockRef.current, nextPosition, nextCollapsed);
      if (nextCollapsed) {
        onPositionChange(nextPosition);
      }
      onCollapsedChange(nextCollapsed);
    },
    [onCollapsedChange, onPositionChange, position],
  );

  const clearAutoCollapseTimer = useCallback(() => {
    if (autoCollapseTimeoutRef.current === null) return;
    window.clearTimeout(autoCollapseTimeoutRef.current);
    autoCollapseTimeoutRef.current = null;
  }, []);

  const armAutoCollapseTimer = useCallback(() => {
    clearAutoCollapseTimer();
    if (collapsed) return;
    autoCollapseTimeoutRef.current = window.setTimeout(() => {
      autoCollapseTimeoutRef.current = null;
      setCollapsed(true);
    }, AUTO_COLLAPSE_DELAY_MS);
  }, [clearAutoCollapseTimer, collapsed, setCollapsed]);

  useEffect(() => {
    armAutoCollapseTimer();
    return clearAutoCollapseTimer;
  }, [armAutoCollapseTimer, clearAutoCollapseTimer, voteKey]);

  useEffect(() => {
    const previousVote = previousMyVoteRef.current;
    previousMyVoteRef.current = myVote;
    if (previousVote === null && myVote !== null) {
      clearAutoCollapseTimer();
      setCollapsed(true);
    }
  }, [clearAutoCollapseTimer, myVote, setCollapsed]);

  const handleDockInteraction = useCallback(() => {
    armAutoCollapseTimer();
  }, [armAutoCollapseTimer]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      dragStartRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        originX: position.x,
        originY: position.y,
        bounds: getDragBounds(dockRef.current),
        latestPosition: position,
        moved: false,
      };
      dockRef.current?.classList.add("game-room-restart-vote-dock--dragging");
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [position],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragStartRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - drag.clientX;
      const deltaY = event.clientY - drag.clientY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        drag.moved = true;
      }
      const nextPosition = clampPositionToBounds(
        {
          x: collapsed ? 0 : drag.originX + deltaX,
          y: drag.originY + deltaY,
        },
        drag.bounds,
      );
      drag.latestPosition = nextPosition;
      scheduleDockTransform(nextPosition);
    },
    [collapsed, scheduleDockTransform],
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragStartRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      suppressRailClickRef.current = drag.moved;
      dragStartRef.current = null;
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      pendingTransformRef.current = null;
      dockRef.current?.classList.remove("game-room-restart-vote-dock--dragging");
      if (collapsed) {
        const nextPosition = { ...drag.latestPosition, x: 0 };
        applyDockTransform(dockRef.current, nextPosition, true);
        onPositionChange(nextPosition);
      } else {
        applyDockTransform(dockRef.current, drag.latestPosition, false);
        onPositionChange(drag.latestPosition);
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [collapsed, onPositionChange],
  );

  const handleRailClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressRailClickRef.current) {
        suppressRailClickRef.current = false;
        event.preventDefault();
        return;
      }
      setCollapsed(!collapsed);
    },
    [collapsed, setCollapsed],
  );

  const handleCollapsePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
    },
    [],
  );

  const handleCollapseClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setCollapsed(true);
    },
    [setCollapsed],
  );

  return (
    <section
      ref={dockRef}
      className={`game-room-restart-vote-dock ${
        collapsed ? "game-room-restart-vote-dock--collapsed" : ""
      } ${
        hasPendingVoteAttention ? "game-room-restart-vote-dock--attention" : ""
      } game-room-restart-vote-dock--playback_extension`}
      onPointerDownCapture={handleDockInteraction}
      onKeyDownCapture={handleDockInteraction}
      aria-label="延長播放投票"
      data-vote-state={myVote ?? (canVote ? "pending" : "watching")}
    >
      <button
        type="button"
        className="game-room-restart-vote-dock__rail"
        onClick={handleRailClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label={collapsed ? "展開投票面板" : "收合投票面板"}
      >
        <HowToVoteRoundedIcon fontSize="small" />
        <span>{approveCount}/{majorityCount || eligibleCount}</span>
      </button>

      <div className="game-room-restart-vote-dock__body">
        <div
          className="game-room-restart-vote-dock__handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <strong className="game-room-restart-vote-dock__title">
            {`${requesterName} 發起延長播放投票`}
          </strong>
          <button
            type="button"
            className="game-room-restart-vote-dock__collapse"
            onPointerDown={handleCollapsePointerDown}
            onClick={handleCollapseClick}
            aria-label="往右收合投票面板"
          >
            <KeyboardDoubleArrowRightRoundedIcon fontSize="small" />
          </button>
        </div>

        <div className="game-room-restart-vote-dock__content">
          <div className="game-room-restart-vote-dock__stats">
            <span>{`延長 ${proposalSeconds} 秒`}</span>
            <span>{progressSummary}</span>
            <span>{votedSummary}</span>
            <span>{`同意 ${approveCount}`}</span>
            <span>{`拒絕 ${rejectCount}`}</span>
          </div>
          <div
            className="game-room-restart-vote-dock__progress"
            aria-hidden="true"
          >
            <div className="game-room-restart-vote-dock__progress-track">
              {Array.from({ length: eligibleCount }, (_, i) => (
                <span
                  key={i}
                  className={`game-room-restart-vote-dock__progress-seg${
                    i < approveCount
                      ? " game-room-restart-vote-dock__progress-seg--approve"
                      : i < approveCount + rejectCount
                        ? " game-room-restart-vote-dock__progress-seg--reject"
                        : ""
                  }`}
                />
              ))}
            </div>
            <span className="game-room-restart-vote-dock__progress-pct">
              {approvePercent}%
            </span>
          </div>

          <div className="game-room-restart-vote-dock__actions">
            <Button
              onClick={onReject}
              variant={myVote === "reject" ? "contained" : "outlined"}
              color="error"
              size="small"
              className="game-room-vote-chip game-room-vote-chip--reject"
              disabled={!canVote || submitPending !== null || myVote !== null}
            >
              {submitPending === "reject"
                ? "送出中..."
                : myVote === "reject"
                  ? "已拒絕"
                  : "不同意延長"}
            </Button>
            <Button
              onClick={onApprove}
              variant="contained"
              color="warning"
              size="small"
              className="game-room-vote-chip game-room-vote-chip--approve-warn"
              disabled={!canVote || submitPending !== null || myVote !== null}
            >
              {submitPending === "approve"
                ? "送出中..."
                : myVote === "approve"
                  ? "已同意"
                  : `同意延長 ${proposalSeconds} 秒`}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

export default GameRoomPlaybackVoteDock;
