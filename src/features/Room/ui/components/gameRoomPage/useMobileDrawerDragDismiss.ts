import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, TouchEvent } from "react";

type DrawerDragDirection = "up" | "down";

interface UseMobileDrawerDragDismissOptions {
  open: boolean;
  direction: DrawerDragDirection;
  onDismiss: () => void;
  threshold?: number;
  maxOffset?: number;
  velocityThreshold?: number;
}

interface DragState {
  active: boolean;
  startY: number;
  lastY: number;
  lastTs: number;
  velocity: number;
  pointerId: number | null;
}

const DEFAULT_THRESHOLD = 68;
const DEFAULT_MAX_OFFSET = 180;
const DEFAULT_VELOCITY_THRESHOLD = 0.55;
const SNAP_BACK_TRANSITION = "transform 220ms cubic-bezier(0.2, 0.82, 0.24, 1)";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const useMobileDrawerDragDismiss = ({
  open,
  direction,
  onDismiss,
  threshold = DEFAULT_THRESHOLD,
  maxOffset = DEFAULT_MAX_OFFSET,
  velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
}: UseMobileDrawerDragDismissOptions) => {
  const dragStateRef = useRef<DragState>({
    active: false,
    startY: 0,
    lastY: 0,
    lastTs: 0,
    velocity: 0,
    pointerId: null,
  });
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const projectOffset = useCallback(
    (rawDelta: number): number => {
      if (direction === "up") {
        return clamp(rawDelta, -maxOffset, 0);
      }
      return clamp(rawDelta, 0, maxOffset);
    },
    [direction, maxOffset],
  );

  const beginDrag = useCallback((clientY: number) => {
    const now = performance.now();
    dragStateRef.current.active = true;
    dragStateRef.current.startY = clientY;
    dragStateRef.current.lastY = clientY;
    dragStateRef.current.lastTs = now;
    dragStateRef.current.velocity = 0;
    setIsDragging(true);
  }, []);

  const updateDrag = useCallback(
    (clientY: number) => {
      if (!dragStateRef.current.active) return;
      const now = performance.now();
      const delta = clientY - dragStateRef.current.startY;
      const nextOffset = projectOffset(delta);
      setOffset(nextOffset);

      const dt = Math.max(now - dragStateRef.current.lastTs, 16);
      dragStateRef.current.velocity = (clientY - dragStateRef.current.lastY) / dt;
      dragStateRef.current.lastY = clientY;
      dragStateRef.current.lastTs = now;
    },
    [projectOffset],
  );

  const endDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
    setIsDragging(false);

    const directionalDistance = direction === "up" ? -offset : offset;
    const directionalVelocity =
      direction === "up"
        ? -dragStateRef.current.velocity
        : dragStateRef.current.velocity;
    const shouldDismiss =
      directionalDistance >= threshold || directionalVelocity >= velocityThreshold;

    setOffset(0);
    if (shouldDismiss) {
      onDismiss();
    }
  }, [direction, offset, onDismiss, threshold, velocityThreshold]);

  const cancelDrag = useCallback(() => {
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
    setIsDragging(false);
    setOffset(0);
  }, []);

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
    }),
    [
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

  const paperStyle = useMemo<CSSProperties>(
    () => ({
      transform: offset === 0 ? undefined : `translate3d(0, ${offset}px, 0)`,
      transition: isDragging ? "none" : SNAP_BACK_TRANSITION,
    }),
    [isDragging, offset],
  );

  return {
    dragHandleProps,
    paperStyle,
    isDragging,
  };
};

export default useMobileDrawerDragDismiss;
