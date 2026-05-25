import React, {
  memo,
  useCallback,
  useRef,
  type CSSProperties,
} from "react";
import { Button } from "@mui/material";
import HowToVoteRoundedIcon from "@mui/icons-material/HowToVoteRounded";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";

import type { RestartGameVoteAction } from "@features/RoomSession";

type RestartVoteDockPosition = {
  x: number;
  y: number;
};

type RestartVoteDockProps = {
  action: RestartGameVoteAction;
  requesterName: string;
  approveCount: number;
  rejectCount: number;
  majorityCount: number;
  eligibleCount: number;
  myVote: "approve" | "reject" | null;
  submitPending: "approve" | "reject" | null;
  canVote: boolean;
  collapsed: boolean;
  position: RestartVoteDockPosition;
  onCollapsedChange: (collapsed: boolean) => void;
  onPositionChange: (position: RestartVoteDockPosition) => void;
  onApprove: () => void;
  onReject: () => void;
};

const DOCK_VIEWPORT_MARGIN_PX = 8;
const DEFAULT_DOCK_RAIL_WIDTH_PX = 42;

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

const clampPositionToViewport = (
  position: RestartVoteDockPosition,
  dockElement: HTMLElement | null,
): RestartVoteDockPosition => {
  if (!dockElement) {
    return {
      x: Math.min(0, position.x),
      y: Math.max(0, position.y),
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

  return {
    x: Math.min(maxX, Math.max(minX, position.x)),
    y: Math.min(maxY, Math.max(minY, position.y)),
  };
};

const GameRoomRestartVoteDock = memo(function GameRoomRestartVoteDock({
  action,
  requesterName,
  approveCount,
  rejectCount,
  majorityCount,
  eligibleCount,
  myVote,
  submitPending,
  canVote,
  collapsed,
  position,
  onCollapsedChange,
  onPositionChange,
  onApprove,
  onReject,
}: RestartVoteDockProps) {
  const dockRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressRailClickRef = useRef(false);

  const actionLabel =
    action === "return_to_lobby" ? "\u8fd4\u56de\u623f\u9593" : "\u91cd\u65b0\u958b\u59cb";
  const passProgress =
    majorityCount > 0 ? Math.min(1, approveCount / majorityCount) : 0;
  const votedCount = Math.min(eligibleCount, approveCount + rejectCount);
  const progressSummary = `\u9700\u8981 ${majorityCount} \u7968 / \u5171 ${eligibleCount} \u4eba`;
  const votedSummary = `\u5df2\u6295\u7968 ${votedCount}`;
  const transformX = collapsed
    ? "var(--game-room-restart-vote-dock-collapse-x)"
    : `${position.x}px`;
  const dockStyle = {
    transform: `translate3d(${transformX}, ${position.y}px, 0)`,
  } satisfies CSSProperties;

  const setCollapsed = useCallback(
    (nextCollapsed: boolean) => {
      if (nextCollapsed) {
        onPositionChange({ x: 0, y: position.y });
      }
      onCollapsedChange(nextCollapsed);
    },
    [onCollapsedChange, onPositionChange, position.y],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      dragStartRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        originX: position.x,
        originY: position.y,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [position.x, position.y],
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
      onPositionChange(
        clampPositionToViewport(
          {
            x: collapsed ? 0 : drag.originX + deltaX,
            y: drag.originY + deltaY,
          },
          dockRef.current,
        ),
      );
    },
    [collapsed, onPositionChange],
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragStartRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      suppressRailClickRef.current = drag.moved;
      dragStartRef.current = null;
      if (collapsed) {
        onPositionChange({
          ...clampPositionToViewport(position, dockRef.current),
          x: 0,
        });
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [collapsed, onPositionChange, position],
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
      } game-room-restart-vote-dock--${action}`}
      style={dockStyle}
      aria-label={`${actionLabel}\u6295\u7968`}
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
        aria-label={collapsed ? "\u5c55\u958b\u6295\u7968\u9762\u677f" : "\u6536\u5408\u6295\u7968\u9762\u677f"}
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
            {`${requesterName}\u767c\u8d77 ${actionLabel}\u6295\u7968`}
          </strong>
          <button
            type="button"
            className="game-room-restart-vote-dock__collapse"
            onPointerDown={handleCollapsePointerDown}
            onClick={handleCollapseClick}
            aria-label="\u5f80\u53f3\u6536\u5408\u6295\u7968\u9762\u677f"
          >
            <KeyboardDoubleArrowRightRoundedIcon fontSize="small" />
          </button>
        </div>

        <div className="game-room-restart-vote-dock__content">
          <div className="game-room-restart-vote-dock__stats">
            <span>{progressSummary}</span>
            <span>{votedSummary}</span>
            <span>{`\u540c\u610f ${approveCount}`}</span>
            <span>{`\u62d2\u7d55 ${rejectCount}`}</span>
          </div>
          <div
            className="game-room-restart-vote-dock__progress"
            aria-hidden="true"
          >
            <span
              className="game-room-restart-vote-dock__progress-fill"
              style={{ transform: `scaleX(${passProgress})` }}
            />
          </div>

          <div className="game-room-restart-vote-dock__actions">
            <Button
              onClick={onReject}
              variant={myVote === "reject" ? "contained" : "outlined"}
              color="error"
              size="small"
              disabled={!canVote || submitPending !== null || myVote !== null}
            >
              {submitPending === "reject"
                ? "\u9001\u51fa\u4e2d..."
                : myVote === "reject"
                  ? "\u5df2\u62d2\u7d55"
                  : "\u62d2\u7d55"}
            </Button>
            <Button
              onClick={onApprove}
              variant="contained"
              color={action === "return_to_lobby" ? "info" : "warning"}
              size="small"
              disabled={!canVote || submitPending !== null || myVote !== null}
            >
              {submitPending === "approve"
                ? "\u9001\u51fa\u4e2d..."
                : myVote === "approve"
                  ? "\u5df2\u540c\u610f"
                  : `\u540c\u610f${actionLabel}`}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

export default GameRoomRestartVoteDock;
