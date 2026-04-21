import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useChatInput, useRoomRealtime } from "@features/RoomSession";
import type { ChatMessage } from "@features/RoomSession";
import { DanmuContext } from "@features/RoomChat/model/DanmuContext";
import useMobileDrawerDragDismiss from "@shared/hooks/useMobileDrawerDragDismiss";
import useAutoHideScrollbar from "@shared/hooks/useAutoHideScrollbar";
import { blurActiveInteractiveElement } from "@shared/utils/dom";
import MobileChatDrawerContent from "./components/MobileChatDrawerContent";
import DesktopChatWindowContent from "./components/DesktopChatWindowContent";

const LAST_READ_KEY_PREFIX = "room_chat_last_read_message:";
const MOBILE_CHAT_MIN_HEIGHT_VH = 26;
const MOBILE_CHAT_MAX_HEIGHT_VH = 72;
const MOBILE_CHAT_DEFAULT_HEIGHT_VH = 48;

const readLastReadId = (roomId: string | null): string | null => {
  if (!roomId || typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(`${LAST_READ_KEY_PREFIX}${roomId}`);
  return value?.trim() ? value : null;
};

const writeLastReadId = (roomId: string | null, id: string | null) => {
  if (!roomId || typeof window === "undefined") return;
  const key = `${LAST_READ_KEY_PREFIX}${roomId}`;
  if (!id) {
    window.sessionStorage.removeItem(key);
    return;
  }
  window.sessionStorage.setItem(key, id);
};

const isFromOther = (msg: ChatMessage, clientId: string) =>
  !msg.userId.startsWith("system:") && msg.userId !== clientId;

const FloatingChatWindow: React.FC = () => {
  const { currentRoom, messages, clientId, gameState } = useRoomRealtime();
  const {
    messageInput,
    setMessageInput,
    handleSendMessage,
    isChatCooldownActive,
    chatCooldownLeft,
  } = useChatInput();

  const danmuCtx = React.useContext(DanmuContext);

  const [open, setOpen] = useState(false);
  const [mobileBodyActive, setMobileBodyActive] = useState(false);
  const [roomReadState, setRoomReadState] = useState<Record<string, string | null>>({});
  const [mobileHeight, setMobileHeight] = useState(MOBILE_CHAT_DEFAULT_HEIGHT_VH);

  const mobileHeightRafRef = useRef<number | null>(null);
  const mobileHeightPendingRef = useRef<number>(MOBILE_CHAT_DEFAULT_HEIGHT_VH);

  const isMobileViewport = useMediaQuery("(max-width: 1023.95px)");
  const isMobileRoomMode = Boolean(currentRoom && isMobileViewport);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useAutoHideScrollbar<HTMLDivElement>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const mobileBodyRafRef = useRef<number | null>(null);

  const roomId = currentRoom?.id ?? null;

  const focusInputWithoutScroll = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  }, []);

  const setScrollNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      scrollContainerRef(node);
    },
    [scrollContainerRef],
  );

  useEffect(() => {
    if (!open || !scrollRef.current) return;

    const node = scrollRef.current;
    const rafId = window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [messages.length, open]);

  const clampMobileHeight = useCallback((value: number) => {
    return Math.min(MOBILE_CHAT_MAX_HEIGHT_VH, Math.max(MOBILE_CHAT_MIN_HEIGHT_VH, value));
  }, []);

  const handleMobileHeightChange = useCallback(
    (nextHeight: number) => {
      const clamped = clampMobileHeight(nextHeight);
      mobileHeightPendingRef.current = clamped;

      if (mobileHeightRafRef.current !== null) return;

      mobileHeightRafRef.current = window.requestAnimationFrame(() => {
        mobileHeightRafRef.current = null;
        setMobileHeight((prev) => {
          const next = mobileHeightPendingRef.current;
          return Math.abs(prev - next) < 0.05 ? prev : next;
        });
      });
    },
    [clampMobileHeight],
  );

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }

      if (mobileBodyRafRef.current !== null) {
        window.cancelAnimationFrame(mobileBodyRafRef.current);
        mobileBodyRafRef.current = null;
      }

      if (mobileHeightRafRef.current !== null) {
        window.cancelAnimationFrame(mobileHeightRafRef.current);
        mobileHeightRafRef.current = null;
      }
    };
  }, []);

  const otherMessages = useMemo(
    () => messages.filter((message) => isFromOther(message, clientId)),
    [clientId, messages],
  );

  const persistedLastReadId = useMemo(() => readLastReadId(roomId), [roomId]);
  const latestOtherMessageId = otherMessages[otherMessages.length - 1]?.id ?? null;

  const unread = useMemo(() => {
    if (open || !roomId || !latestOtherMessageId) return 0;

    const hasRoomSnapshot = Object.prototype.hasOwnProperty.call(roomReadState, roomId);
    const lastSeenId = hasRoomSnapshot ? roomReadState[roomId] : persistedLastReadId;

    if (!lastSeenId) return otherMessages.length;
    if (lastSeenId === latestOtherMessageId) return 0;

    const lastSeenIndex = otherMessages.findIndex((message) => message.id === lastSeenId);
    return lastSeenIndex < 0
      ? otherMessages.length
      : Math.max(0, otherMessages.length - (lastSeenIndex + 1));
  }, [latestOtherMessageId, open, otherMessages, persistedLastReadId, roomId, roomReadState]);

  const markRoomRead = useCallback(() => {
    if (!roomId) return;
    setRoomReadState((prev) => ({ ...prev, [roomId]: latestOtherMessageId }));
    writeLastReadId(roomId, latestOtherMessageId);
  }, [latestOtherMessageId, roomId]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    markRoomRead();

    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    if (mobileBodyRafRef.current !== null) {
      window.cancelAnimationFrame(mobileBodyRafRef.current);
      mobileBodyRafRef.current = null;
    }

    if (isMobileRoomMode) {
      setMobileBodyActive(false);
      mobileBodyRafRef.current = window.requestAnimationFrame(() => {
        mobileBodyRafRef.current = null;
        setMobileBodyActive(true);
      });
    } else {
      focusTimerRef.current = window.setTimeout(() => {
        focusTimerRef.current = null;
        focusInputWithoutScroll();
      }, 80);
    }
  }, [focusInputWithoutScroll, isMobileRoomMode, markRoomRead]);

  const handleClose = useCallback(() => {
    blurActiveInteractiveElement();

    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    if (mobileBodyRafRef.current !== null) {
      window.cancelAnimationFrame(mobileBodyRafRef.current);
      mobileBodyRafRef.current = null;
    }

    setMobileBodyActive(false);
    setOpen(false);
    markRoomRead();
  }, [markRoomRead]);

  const toggleOpen = useCallback(() => {
    if (open) {
      handleClose();
      return;
    }
    handleOpen();
  }, [handleClose, handleOpen, open]);

  const handleSend = useCallback(() => {
    if (isChatCooldownActive) return;
    if (!messageInput.trim()) return;
    handleSendMessage();
  }, [handleSendMessage, isChatCooldownActive, messageInput]);

  const mobileChatDragDismiss = useMobileDrawerDragDismiss({
    open: isMobileRoomMode && open,
    direction: "down",
    onDismiss: handleClose,
    height: mobileHeight,
    minHeight: MOBILE_CHAT_MIN_HEIGHT_VH,
    maxHeight: MOBILE_CHAT_MAX_HEIGHT_VH,
    onHeightChange: handleMobileHeightChange,
    threshold: 52,
    thresholdBuffer: 24,
  });

  const mobileChatDismissState = mobileChatDragDismiss.canDismiss
    ? "ready"
    : mobileChatDragDismiss.isDismissArmed
      ? "armed"
      : "idle";

  const shouldSuppressGameChatOutsideDanmuBridge = Boolean(
    isMobileRoomMode && gameState?.status === "playing" && !danmuCtx,
  );
  const showDanmuToggle = Boolean(gameState?.status === "playing" && danmuCtx);

  const handleDanmuEnabledChange = useCallback(
    (checked: boolean) => {
      danmuCtx?.onDanmuEnabledChange(checked);
    },
    [danmuCtx],
  );

  if (shouldSuppressGameChatOutsideDanmuBridge) {
    return null;
  }

  if (isMobileRoomMode) {
    return (
      <MobileChatDrawerContent
        open={open}
        unread={unread}
        bodyActive={mobileBodyActive}
        showDanmuToggle={showDanmuToggle}
        danmuEnabled={Boolean(danmuCtx?.danmuEnabled)}
        onDanmuEnabledChange={handleDanmuEnabledChange}
        mobileChatDismissState={mobileChatDismissState}
        dragHandleProps={mobileChatDragDismiss.dragHandleProps}
        paperStyle={mobileChatDragDismiss.paperStyle}
        onOpen={handleOpen}
        onClose={handleClose}
        messages={messages}
        clientId={clientId}
        setScrollNodeRef={setScrollNodeRef}
        inputRef={inputRef}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        handleSend={handleSend}
        isChatCooldownActive={isChatCooldownActive}
        chatCooldownLeft={chatCooldownLeft}
      />
    );
  }

  return (
    <DesktopChatWindowContent
      open={open}
      unread={unread}
      showDanmuToggle={showDanmuToggle}
      danmuEnabled={Boolean(danmuCtx?.danmuEnabled)}
      onDanmuEnabledChange={handleDanmuEnabledChange}
      onToggle={toggleOpen}
      messages={messages}
      clientId={clientId}
      setScrollNodeRef={setScrollNodeRef}
      inputRef={inputRef}
      messageInput={messageInput}
      setMessageInput={setMessageInput}
      handleSend={handleSend}
      isChatCooldownActive={isChatCooldownActive}
      chatCooldownLeft={chatCooldownLeft}
    />
  );
};

export default React.memo(FloatingChatWindow);
