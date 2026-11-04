import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Paper } from "@mui/material";
import ChatBubbleRounded from "@mui/icons-material/ChatBubbleRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHAT_POSITION_KEY, chatWindowRect, clampBubble, nearestBubbleCorner, positionFromRatio, positionToRatio, type ChatBounds, type Point } from "../utils/mobileChatPosition";
import "./mobileChatFloatingWindow.css";

type Props = { open: boolean; unread: number; title: string; variant: "room" | "hub"; suppressTrigger?: boolean; onOpen: () => void; onClose: () => void; children: ReactNode };
const readPosition = (): Point => {
  try {
    const value = JSON.parse(localStorage.getItem(CHAT_POSITION_KEY) || "null");
    if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) return { x: Math.max(0, Math.min(1, value.x)), y: Math.max(0, Math.min(1, value.y)) };
  } catch { /* Unavailable storage falls back to the lower right corner. */ }
  return { x: 1, y: 1 };
};

export default function MobileChatFloatingWindow({ open, unread, title, variant, suppressTrigger, onOpen, onClose, children }: Props) {
  const reduceMotion = useReducedMotion();
  const windowId = useId();
  const safeAreaRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [initialRatio] = useState(readPosition);
  const ratioRef = useRef(initialRatio);
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const dragRef = useRef<{ id: number; x: number; y: number; start: Point } | null>(null);
  const movedRef = useRef(false);
  const wasOpenRef = useRef(false);
  const [bounds, setBounds] = useState<ChatBounds>({ left: 12, top: 12, right: window.innerWidth - 12, bottom: window.innerHeight - 12 });
  const [position, setPosition] = useState(() => positionFromRatio(initialRatio, bounds));
  const [dragging, setDragging] = useState(false);

  const move = (next: Point) => { positionRef.current = next; setPosition(next); };
  const remember = (next: Point) => {
    ratioRef.current = positionToRatio(next, bounds);
    try { localStorage.setItem(CHAT_POSITION_KEY, JSON.stringify(ratioRef.current)); } catch { /* Position still survives opening and closing the window. */ }
  };

  useLayoutEffect(() => {
    const measure = () => {
      const viewport = window.visualViewport;
      const safe = safeAreaRef.current ? getComputedStyle(safeAreaRef.current) : null;
      const left = viewport?.offsetLeft || 0;
      const top = viewport?.offsetTop || 0;
      const nextBounds = {
        left: left + (parseFloat(safe?.paddingLeft || "") || 12),
        top: top + (parseFloat(safe?.paddingTop || "") || 12),
        right: left + (viewport?.width || window.innerWidth) - (parseFloat(safe?.paddingRight || "") || 12),
        bottom: top + (viewport?.height || window.innerHeight) - (parseFloat(safe?.paddingBottom || "") || 12),
      };
      const next = positionFromRatio(ratioRef.current, nextBounds);
      positionRef.current = next;
      setBounds(nextBounds);
      setPosition(next);
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, []);

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
    else if (wasOpenRef.current && !suppressTrigger) bubbleRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = open;
  }, [open, suppressTrigger]);

  const rect = chatWindowRect(position, bounds);
  return createPortal(<>
    <div ref={safeAreaRef} className="mobile-chat-safe-area" aria-hidden="true" />
    {(!suppressTrigger || open) && <motion.button
      ref={bubbleRef}
      type="button"
      className="mobile-chat-bubble"
      initial={false}
      animate={{ x: position.x, y: position.y, scale: dragging ? 1.06 : 1 }}
      transition={reduceMotion || dragging ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40 }}
      aria-label={open ? `關閉${title}` : unread > 0 ? `開啟${title}，目前有 ${unread} 則未讀訊息` : `開啟${title}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? windowId : undefined}
      title={`${title} · ${open ? "點擊關閉，" : ""}拖曳可移動位置`}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        movedRef.current = false;
        positionRef.current = position;
        dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: position };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (!movedRef.current && Math.hypot(dx, dy) < 7) return;
        movedRef.current = true;
        setDragging(true);
        move(clampBubble({ x: drag.start.x + dx, y: drag.start.y + dy }, bounds));
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.id !== event.pointerId) return;
        if (movedRef.current) remember(positionRef.current);
        dragRef.current = null;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { if (movedRef.current) remember(positionRef.current); dragRef.current = null; setDragging(false); }}
      onLostPointerCapture={() => { dragRef.current = null; setDragging(false); }}
      onClick={(event) => {
        if (movedRef.current && event.detail !== 0) { event.preventDefault(); return; }
        if (open) onClose();
        else {
          const corner = nearestBubbleCorner(position, bounds);
          move(corner);
          remember(corner);
          onOpen();
        }
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") { event.preventDefault(); onClose(); return; }
        const delta: Record<string, Point> = { ArrowLeft: { x: -16, y: 0 }, ArrowRight: { x: 16, y: 0 }, ArrowUp: { x: 0, y: -16 }, ArrowDown: { x: 0, y: 16 } };
        if (!delta[event.key]) return;
        event.preventDefault();
        const next = clampBubble({ x: position.x + delta[event.key].x, y: position.y + delta[event.key].y }, bounds);
        move(next); remember(next);
      }}
    >
      <span className="mobile-chat-bubble__icon" aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.span key={open ? "close" : "chat"} initial={reduceMotion ? false : { opacity: 0, rotate: -70, scale: .7 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: reduceMotion ? 0 : 70, scale: reduceMotion ? 1 : .7 }} transition={{ duration: reduceMotion ? 0 : .16, ease: [.16, 1, .3, 1] }}>
            {open ? <CloseRounded sx={{ fontSize: 28 }} /> : <ChatBubbleRounded sx={{ fontSize: 25 }} />}
          </motion.span>
        </AnimatePresence>
      </span>
      {!open && unread > 0 && <span className="mobile-chat-bubble__badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
    </motion.button>}
    <AnimatePresence>
      {open && <motion.div className="mobile-chat-window-anchor" key="chat-window" style={{ ...rect, transformOrigin: `${position.x < (bounds.left + bounds.right) / 2 ? "left" : "right"} ${position.y < (bounds.top + bounds.bottom) / 2 ? "top" : "bottom"}` }} initial={reduceMotion ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduceMotion ? 1 : .97 }} transition={{ duration: reduceMotion ? 0 : .18, ease: [.16, 1, .3, 1] }}>
        <Paper id={windowId} ref={panelRef} tabIndex={-1} role="dialog" aria-label={title} aria-modal="false" elevation={0} data-variant={variant} className="mobile-chat-window game-room-mobile-chat-drawer" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>{children}</Paper>
      </motion.div>}
    </AnimatePresence>
  </>, document.body);
}
