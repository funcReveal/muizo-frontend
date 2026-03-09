import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, TouchEvent } from "react";

type DrawerDragDirection = "up" | "down";

interface UseMobileDrawerDragDismissOptions {
  open: boolean;
  direction: DrawerDragDirection;
  onDismiss: () => void;
  threshold?: number;
  velocityThreshold?: number;
  height?: number;
  minHeight?: number;
  maxHeight?: number;
  onHeightChange?: (nextHeight: number) => void;
}

interface DragState {
  active: boolean;
  startY: number;
  startHeight: number;
  latestHeight: number;
  dismissStretchPx: number;
  lastY: number;
  lastTs: number;
  velocity: number;
  pointerId: number | null;
}

const DEFAULT_THRESHOLD = 34;
const DEFAULT_VELOCITY_THRESHOLD = 0.55;
const SNAP_BACK_TRANSITION = "transform 220ms cubic-bezier(0.2, 0.82, 0.24, 1)";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const useMobileDrawerDragDismiss = ({
  open,
  direction,
  onDismiss,
  threshold = DEFAULT_THRESHOLD,
  velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
  height = 0,
  minHeight,
  maxHeight,
  onHeightChange,
}: UseMobileDrawerDragDismissOptions) => {
  const dragStateRef = useRef<DragState>({
    active: false,
    startY: 0,
    startHeight: height,
    latestHeight: height,
    dismissStretchPx: 0,
    lastY: 0,
    lastTs: 0,
    velocity: 0,
    pointerId: null,
  });
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const canResize =
    typeof onHeightChange === "function" &&
    typeof minHeight === "number" &&
    typeof maxHeight === "number" &&
    maxHeight > minHeight;

  const resolveDirectionalDistance = useCallback(
    (rawDelta: number) => (direction === "up" ? -rawDelta : rawDelta),
    [direction],
  );

  const beginDrag = useCallback((clientY: number) => {
    const now = performance.now();
    dragStateRef.current.active = true;
    dragStateRef.current.startY = clientY;
    dragStateRef.current.startHeight = height;
    dragStateRef.current.latestHeight = height;
    dragStateRef.current.dismissStretchPx = 0;
    dragStateRef.current.lastY = clientY;
    dragStateRef.current.lastTs = now;
    dragStateRef.current.velocity = 0;
    setIsDragging(true);
  }, [height]);

  const updateDrag = useCallback(
    (clientY: number) => {
      if (!dragStateRef.current.active) return;
      const now = performance.now();
      const rawDelta = clientY - dragStateRef.current.startY;
      const directionalDistance = resolveDirectionalDistance(rawDelta);

      if (canResize && typeof minHeight === "number" && typeof maxHeight === "number") {
        const viewportHeightPx = Math.max(window.innerHeight || 0, 1);
        const directionalDistanceVh = (directionalDistance / viewportHeightPx) * 100;
        const rawHeightVh = dragStateRef.current.startHeight - directionalDistanceVh;
        const clampedHeightVh = clamp(rawHeightVh, minHeight, maxHeight);
        const dismissStretchVh = Math.max(0, minHeight - rawHeightVh);
        const dismissStretchPx = (dismissStretchVh / 100) * viewportHeightPx;
        const normalizedHeightVh = Number(clampedHeightVh.toFixed(2));
        dragStateRef.current.latestHeight = normalizedHeightVh;
        dragStateRef.current.dismissStretchPx = dismissStretchPx;
        onHeightChange(normalizedHeightVh);
      } else {
        const fallbackOffset = direction === "up"
          ? clamp(rawDelta, -180, 0)
          : clamp(rawDelta, 0, 180);
        setOffset(fallbackOffset);
      }

      const dt = Math.max(now - dragStateRef.current.lastTs, 16);
      dragStateRef.current.velocity = (clientY - dragStateRef.current.lastY) / dt;
      dragStateRef.current.lastY = clientY;
      dragStateRef.current.lastTs = now;
    },
    [canResize, direction, maxHeight, minHeight, onHeightChange, resolveDirectionalDistance],
  );

  const endDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
    setIsDragging(false);

    const directionalVelocity =
      direction === "up"
        ? -dragStateRef.current.velocity
        : dragStateRef.current.velocity;
    let shouldDismiss = false;

    if (canResize && typeof minHeight === "number" && typeof maxHeight === "number") {
      const latestHeight = clamp(dragStateRef.current.latestHeight, minHeight, maxHeight);
      const reachedCloseZone = latestHeight <= minHeight + 0.8;
      shouldDismiss =
        reachedCloseZone &&
        (dragStateRef.current.dismissStretchPx >= threshold ||
          directionalVelocity >= velocityThreshold);
      onHeightChange(latestHeight);
    } else {
      const directionalDistance = direction === "up" ? -offset : offset;
      shouldDismiss =
        directionalDistance >= threshold || directionalVelocity >= velocityThreshold;
      setOffset(0);
    }

    if (shouldDismiss) {
      onDismiss();
    }
  }, [
    canResize,
    direction,
    maxHeight,
    minHeight,
    offset,
    onDismiss,
    onHeightChange,
    threshold,
    velocityThreshold,
  ]);

  const cancelDrag = useCallback(() => {
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
    setIsDragging(false);
    if (canResize && typeof onHeightChange === "function") {
      onHeightChange(height);
      return;
    }
    setOffset(0);
  }, [canResize, height, onHeightChange]);

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!open || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      event.stopPropagation();
      beginDrag(touch.clientY);
    },
    [beginDrag, open],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!dragStateRef.current.active || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      event.stopPropagation();
      updateDrag(touch.clientY);
    },
    [updateDrag],
  );

  const onTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!dragStateRef.current.active) return;
      event.preventDefault();
      event.stopPropagation();
      endDrag();
    },
    [endDrag],
  );

  const onTouchCancel = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!dragStateRef.current.active) return;
      event.preventDefault();
      event.stopPropagation();
      cancelDrag();
    },
    [cancelDrag],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!open) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      dragStateRef.current.pointerId = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      beginDrag(event.clientY);
    },
    [beginDrag, open],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!dragStateRef.current.active) return;
      if (dragStateRef.current.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      updateDrag(event.clientY);
    },
    [updateDrag],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!dragStateRef.current.active) return;
      if (dragStateRef.current.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      endDrag();
    },
    [endDrag],
  );

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!dragStateRef.current.active) return;
      if (dragStateRef.current.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      cancelDrag();
    },
    [cancelDrag],
  );

  const dragHandleProps = useMemo(
    () => ({
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      "data-dragging": isDragging ? "true" : "false",
    }),
    [
      isDragging,
      onPointerCancel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onTouchCancel,
      onTouchEnd,
      onTouchMove,
      onTouchStart,
    ],
  );

  const resizePaperStyle = useMemo<CSSProperties>(
    () =>
      canResize && typeof minHeight === "number" && typeof maxHeight === "number"
        ? {
            height: `${clamp(height, minHeight, maxHeight)}vh`,
            minHeight: `${minHeight}vh`,
            maxHeight: `${maxHeight}vh`,
            transition: isDragging
              ? "none"
              : "height 200ms cubic-bezier(0.2, 0.82, 0.24, 1)",
          }
        : {},
    [canResize, height, isDragging, maxHeight, minHeight],
  );

  const paperStyle = useMemo<CSSProperties>(
    () => ({
      ...resizePaperStyle,
      transform: offset === 0 ? undefined : `translate3d(0, ${offset}px, 0)`,
      transition:
        offset === 0
          ? resizePaperStyle.transition
          : isDragging
            ? "none"
            : SNAP_BACK_TRANSITION,
    }),
    [isDragging, offset, resizePaperStyle],
  );

  return {
    dragHandleProps,
    paperStyle,
    isDragging,
  };
};

export default useMobileDrawerDragDismiss;
