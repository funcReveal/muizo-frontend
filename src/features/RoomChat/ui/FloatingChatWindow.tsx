import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useChatInput, useChatMessages, useRoomRealtime, useRoomSession } from "@features/RoomSession";
import type { Ack, ChatMessage, HubChatMessage } from "@features/RoomSession";
import { useAuth } from "@shared/auth/AuthContext";
import { DanmuContext } from "@features/RoomChat/model/DanmuContext";
import useMobileDrawerDragDismiss from "@shared/hooks/useMobileDrawerDragDismiss";
import useAutoHideScrollbar from "@shared/hooks/useAutoHideScrollbar";
import { blurActiveInteractiveElement } from "@shared/utils/dom";
import MobileChatDrawerContent from "./components/MobileChatDrawerContent";
import DesktopChatWindowContent from "./components/DesktopChatWindowContent";
import HubChatMessagesList from "./components/HubChatMessagesList";
import HubChatComposer from "./components/HubChatComposer";

const LAST_READ_KEY_PREFIX = "room_chat_last_read_message:";
const HUB_LAST_READ_KEY = "hub_chat_last_read_message";
const HUB_CHAT_MAX_MESSAGES = 80;
const HUB_CHAT_LOAD_RETRY_DELAYS_MS = [120, 360, 900, 1800] as const;
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

const readHubLastReadId = () => {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(HUB_LAST_READ_KEY);
  return value?.trim() ? value : null;
};

const writeHubLastReadId = (id: string | null) => {
  if (typeof window === "undefined") return;
  if (!id) {
    window.sessionStorage.removeItem(HUB_LAST_READ_KEY);
    return;
  }
  window.sessionStorage.setItem(HUB_LAST_READ_KEY, id);
};

const isFromOther = (msg: ChatMessage, clientId: string) =>
  !msg.userId.startsWith("system:") && msg.userId !== clientId;

type ChatTab = "room" | "hub";

const resolveChatRetryAfterMs = (ack: Ack<unknown>): number | null => {
  if (ack.ok) return null;
  if (typeof ack.retryAfterMs === "number" && ack.retryAfterMs > 0) {
    return ack.retryAfterMs;
  }

  const matchedSeconds = ack.error.match(/請\s*(\d+)\s*秒後再試/);
  if (matchedSeconds) {
    return Number(matchedSeconds[1]) * 1000;
  }

  if (
    ack.error === "RATE_LIMITED" ||
    ack.error.includes("頻繁") ||
    ack.error.includes("過快")
  ) {
    return 10_000;
  }

  return null;
};

export interface FloatingChatWindowRef {
  openChat: () => void;
}

const FloatingChatWindow = React.forwardRef<FloatingChatWindowRef, { suppressMobileTrigger?: boolean }>(
  function FloatingChatWindow({ suppressMobileTrigger = false }, ref) {
  const { currentRoom, clientId, gameStatus } = useRoomRealtime();
  const { getSocket, isConnected } = useRoomSession();
  const { authUser, loginWithGoogle } = useAuth();
  const { messages } = useChatMessages();
  const {
    messageInput,
    setMessageInput,
    handleSendMessage,
    isChatCooldownActive,
    chatCooldownLeft,
  } = useChatInput();

  const danmuCtx = React.useContext(DanmuContext);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>(() => currentRoom ? "room" : "hub");
  const [hubMessages, setHubMessages] = useState<HubChatMessage[]>([]);
  const [hubMessageInput, setHubMessageInput] = useState("");
  const [hubStatusText, setHubStatusText] = useState<string | null>(null);
  const [hubSending, setHubSending] = useState(false);
  const [hubCooldownUntil, setHubCooldownUntil] = useState<number | null>(null);
  const [hubCooldownLeft, setHubCooldownLeft] = useState(0);
  const [hubFocusRequestId, setHubFocusRequestId] = useState(0);
  const [hubLastReadId, setHubLastReadId] = useState<string | null>(() => readHubLastReadId());
  const [mobileBodyActive, setMobileBodyActive] = useState(false);
  const [roomReadState, setRoomReadState] = useState<Record<string, string | null>>({});
  const [mobileHeight, setMobileHeight] = useState(MOBILE_CHAT_DEFAULT_HEIGHT_VH);

  const mobileHeightRafRef = useRef<number | null>(null);
  const mobileHeightPendingRef = useRef<number>(MOBILE_CHAT_DEFAULT_HEIGHT_VH);

  const isMobileViewport = useMediaQuery("(max-width: 1023.95px)");
  const isMobileChatMode = isMobileViewport;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useAutoHideScrollbar<HTMLDivElement>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hubInputRef = useRef<HTMLInputElement | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const mobileBodyRafRef = useRef<number | null>(null);
  const hubListRequestSeqRef = useRef(0);
  const hubListRetryTimersRef = useRef<number[]>([]);

  const roomId = currentRoom?.id ?? null;
  const showTabs = Boolean(currentRoom);
  const effectiveTab: ChatTab = currentRoom ? activeTab : "hub";
  const isHubTab = effectiveTab === "hub";
  const isHubCooldownActive = hubCooldownLeft > 0;
  const windowTitle = currentRoom ? "聊天室" : "大廳聊天室";
  const windowVariant = isHubTab ? "hub" : "room";

  const scrollChatToBottom = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, []);

  const setScrollNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      scrollContainerRef(node);
    },
    [scrollContainerRef],
  );

  const clearHubListRetryTimers = useCallback(() => {
    hubListRetryTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    hubListRetryTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (!currentRoom) {
      setActiveTab("hub");
    }
  }, [currentRoom]);

  useEffect(() => {
    if (!hubCooldownUntil) return;

    let timerId: number | null = null;

    const tick = () => {
      const diff = hubCooldownUntil - Date.now();
      if (diff <= 0) {
        setHubCooldownLeft(0);
        setHubCooldownUntil(null);
        timerId = null;
        return;
      }

      const nextSec = Math.ceil(diff / 1000);
      setHubCooldownLeft(nextSec);
      const msToNextBoundary = diff - (nextSec - 1) * 1000;
      timerId = window.setTimeout(tick, Math.max(50, msToNextBoundary));
    };

    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [hubCooldownUntil]);

  const loadHubMessages = useCallback((retryIndex = 0) => {
    const socket = getSocket();
    if (!socket || !isConnected || !socket.connected) {
      if (retryIndex < HUB_CHAT_LOAD_RETRY_DELAYS_MS.length) {
        const timerId = window.setTimeout(() => {
          hubListRetryTimersRef.current = hubListRetryTimersRef.current.filter(
            (id) => id !== timerId,
          );
          loadHubMessages(retryIndex + 1);
        }, HUB_CHAT_LOAD_RETRY_DELAYS_MS[retryIndex]);
        hubListRetryTimersRef.current.push(timerId);
      }
      return;
    }

    clearHubListRetryTimers();

    const requestSeq = hubListRequestSeqRef.current + 1;
    hubListRequestSeqRef.current = requestSeq;
    let settled = false;
    const fallbackDelay =
      HUB_CHAT_LOAD_RETRY_DELAYS_MS[
        Math.min(retryIndex, HUB_CHAT_LOAD_RETRY_DELAYS_MS.length - 1)
      ];
    const fallbackTimerId =
      retryIndex < HUB_CHAT_LOAD_RETRY_DELAYS_MS.length
        ? window.setTimeout(() => {
            if (settled || hubListRequestSeqRef.current !== requestSeq) return;
            hubListRetryTimersRef.current = hubListRetryTimersRef.current.filter(
              (id) => id !== fallbackTimerId,
            );
            loadHubMessages(retryIndex + 1);
          }, fallbackDelay)
        : null;

    if (fallbackTimerId !== null) {
      hubListRetryTimersRef.current.push(fallbackTimerId);
    }

    socket.emit("listHubChatMessages", (ack: Ack<HubChatMessage[]>) => {
      settled = true;
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
        hubListRetryTimersRef.current = hubListRetryTimersRef.current.filter(
          (id) => id !== fallbackTimerId,
        );
      }
      if (hubListRequestSeqRef.current !== requestSeq) return;
      if (!ack) return;
      if (ack.ok) {
        setHubMessages(ack.data.slice(-HUB_CHAT_MAX_MESSAGES));
        setHubStatusText(null);
        return;
      }
      setHubStatusText("無法載入大廳聊天室");
    });
  }, [clearHubListRetryTimers, getSocket, isConnected]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected) return;

    const handleHubChatMessageAdded = (message: HubChatMessage) => {
      setHubMessages((prev) =>
        [...prev, message].slice(-HUB_CHAT_MAX_MESSAGES),
      );
    };

    socket.on("hubChatMessageAdded", handleHubChatMessageAdded);
    socket.on("connect", loadHubMessages);
    socket.io.on("reconnect", loadHubMessages);

    return () => {
      socket.off("hubChatMessageAdded", handleHubChatMessageAdded);
      socket.off("connect", loadHubMessages);
      socket.io.off("reconnect", loadHubMessages);
    };
  }, [getSocket, isConnected, loadHubMessages]);

  useEffect(() => {
    if (!isHubTab) return;
    loadHubMessages();
  }, [isHubTab, loadHubMessages, roomId]);

  useEffect(() => clearHubListRetryTimers, [clearHubListRetryTimers]);

  useEffect(() => {
    if (!open) return;

    const rafId = window.requestAnimationFrame(() => {
      scrollChatToBottom();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [hubMessages.length, messages.length, open, scrollChatToBottom]);

  useEffect(() => {
    if (!open || !isMobileChatMode || !mobileBodyActive) return;

    let innerRafId: number | null = null;
    const rafId = window.requestAnimationFrame(() => {
      scrollChatToBottom();
      innerRafId = window.requestAnimationFrame(scrollChatToBottom);
    });
    const timeoutId = window.setTimeout(scrollChatToBottom, 180);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (innerRafId !== null) {
        window.cancelAnimationFrame(innerRafId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [
    isMobileChatMode,
    hubMessages.length,
    messages.length,
    mobileBodyActive,
    mobileHeight,
    open,
    scrollChatToBottom,
  ]);

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
  const latestHubMessageId = hubMessages[hubMessages.length - 1]?.id ?? null;

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

  const hubUnread = useMemo(() => {
    if ((open && isHubTab) || !latestHubMessageId) return 0;
    if (!hubLastReadId) return hubMessages.length;
    if (hubLastReadId === latestHubMessageId) return 0;
    const lastSeenIndex = hubMessages.findIndex((message) => message.id === hubLastReadId);
    return lastSeenIndex < 0
      ? hubMessages.length
      : Math.max(0, hubMessages.length - (lastSeenIndex + 1));
  }, [hubLastReadId, hubMessages, isHubTab, latestHubMessageId, open]);

  const totalUnread = unread + hubUnread;

  const markRoomRead = useCallback(() => {
    if (!roomId) return;
    setRoomReadState((prev) => ({ ...prev, [roomId]: latestOtherMessageId }));
    writeLastReadId(roomId, latestOtherMessageId);
  }, [latestOtherMessageId, roomId]);

  const markHubRead = useCallback(() => {
    setHubLastReadId(latestHubMessageId);
    writeHubLastReadId(latestHubMessageId);
  }, [latestHubMessageId]);

  const focusActiveInputWithoutScroll = useCallback(() => {
    const input = isHubTab ? hubInputRef.current : inputRef.current;
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  }, [isHubTab]);

  const focusHubInputWithoutScroll = useCallback(() => {
    setHubFocusRequestId((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (hubFocusRequestId <= 0) return;
    if (!open || !isHubTab || !authUser?.id) return;
    if (!isConnected || hubSending || isHubCooldownActive) return;

    let cancelled = false;
    let rafId: number | null = null;
    let timerId: number | null = null;
    let attempts = 0;

    const tryFocus = () => {
      if (cancelled) return;
      attempts += 1;

      const input = hubInputRef.current;
      if (input && !input.disabled) {
        try {
          input.focus({ preventScroll: true });
        } catch {
          input.focus();
        }

        if (document.activeElement === input || attempts >= 8) {
          return;
        }
      }

      if (attempts >= 8) return;
      timerId = window.setTimeout(tryFocus, 40);
    };

    rafId = window.requestAnimationFrame(tryFocus);

    return () => {
      cancelled = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [
    authUser?.id,
    hubFocusRequestId,
    hubSending,
    isConnected,
    isHubCooldownActive,
    isHubTab,
    open,
  ]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    if (isHubTab) {
      markHubRead();
    } else {
      markRoomRead();
    }

    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    if (mobileBodyRafRef.current !== null) {
      window.cancelAnimationFrame(mobileBodyRafRef.current);
      mobileBodyRafRef.current = null;
    }

    if (isMobileChatMode) {
      setMobileBodyActive(false);
      mobileBodyRafRef.current = window.requestAnimationFrame(() => {
        mobileBodyRafRef.current = null;
        setMobileBodyActive(true);
      });
    } else {
      focusTimerRef.current = window.setTimeout(() => {
        focusTimerRef.current = null;
        focusActiveInputWithoutScroll();
      }, 80);
    }
  }, [focusActiveInputWithoutScroll, isHubTab, isMobileChatMode, markHubRead, markRoomRead]);

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
    if (isHubTab) {
      markHubRead();
    } else {
      markRoomRead();
    }
  }, [isHubTab, markHubRead, markRoomRead]);

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

  const handleSendHubMessage = useCallback(() => {
    if (hubSending || isHubCooldownActive) return;
    const trimmed = hubMessageInput.trim();
    if (!trimmed) return;
    const socket = getSocket();
    if (!socket) {
      setHubStatusText("尚未連線到聊天室");
      return;
    }

    setHubSending(true);
    socket.emit("sendHubChatMessage", { content: trimmed }, (ack) => {
      setHubSending(false);
      if (!ack) {
        focusHubInputWithoutScroll();
        return;
      }
      if (ack.ok) {
        setHubMessageInput("");
        setHubStatusText(null);
        focusHubInputWithoutScroll();
        return;
      }
      const retryAfterMs = resolveChatRetryAfterMs(ack);
      if (retryAfterMs) {
        setHubCooldownLeft(Math.ceil(retryAfterMs / 1000));
        setHubCooldownUntil(Date.now() + retryAfterMs);
        setHubStatusText(null);
        return;
      }
      setHubStatusText(
        ack.error === "LOGIN_REQUIRED"
          ? "登入會員後才能在大廳聊天室發言"
          : ack.error,
      );
      focusHubInputWithoutScroll();
    });
  }, [
    focusHubInputWithoutScroll,
    getSocket,
    hubMessageInput,
    hubSending,
    isHubCooldownActive,
  ]);

  const switchTab = useCallback(
    (nextTab: ChatTab) => {
      setActiveTab(nextTab);
      if (nextTab === "hub") {
        markHubRead();
      } else {
        markRoomRead();
      }
      window.requestAnimationFrame(scrollChatToBottom);
    },
    [markHubRead, markRoomRead, scrollChatToBottom],
  );

  const focusInputForTabWithoutScroll = useCallback((nextTab: ChatTab) => {
    window.requestAnimationFrame(() => {
      const input = nextTab === "hub" ? hubInputRef.current : inputRef.current;
      if (!input) return;
      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }
    });
  }, []);

  useEffect(() => {
    if (isMobileChatMode) return;

    const handleDesktopChatKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target;
      const targetElement =
        target instanceof HTMLElement ? target : document.activeElement;

      if (open && showTabs && event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        const nextTab = isHubTab ? "room" : "hub";
        switchTab(nextTab);
        focusInputForTabWithoutScroll(nextTab);
        return;
      }

      if (!open && event.key === "Enter") {
        if (
          targetElement instanceof HTMLElement &&
          targetElement.closest(
            "input, textarea, select, button, a, [contenteditable='true'], [role='button'], [role='textbox']",
          )
        ) {
          return;
        }

        event.preventDefault();
        handleOpen();
        return;
      }

      const activeInput = isHubTab ? hubMessageInput : messageInput;
      if (open && !activeInput.trim() && (event.key === "Enter" || event.key === "Escape")) {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleDesktopChatKeyDown);
    return () => {
      window.removeEventListener("keydown", handleDesktopChatKeyDown);
    };
  }, [
    focusInputForTabWithoutScroll,
    handleClose,
    handleOpen,
    hubMessageInput,
    isHubTab,
    isMobileChatMode,
    messageInput,
    open,
    showTabs,
    switchTab,
  ]);

  useEffect(() => {
    if (!open || !isHubTab || isHubCooldownActive || !authUser?.id) return;
    focusHubInputWithoutScroll();
  }, [
    authUser?.id,
    focusHubInputWithoutScroll,
    isHubCooldownActive,
    isHubTab,
    open,
  ]);

  React.useImperativeHandle(ref, () => ({ openChat: handleOpen }), [handleOpen]);

  const mobileChatDragDismiss = useMobileDrawerDragDismiss({
    open: isMobileChatMode && open,
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
    currentRoom && isMobileChatMode && gameStatus === "playing" && !danmuCtx,
  );
  const showDanmuToggle = Boolean(!isHubTab && gameStatus === "playing" && danmuCtx);

  const handleDanmuEnabledChange = useCallback(
    (checked: boolean) => {
      danmuCtx?.onDanmuEnabledChange(checked);
    },
    [danmuCtx],
  );

  const headerTabs = (
    <div
      className="floating-chat-tabs"
      role={showTabs ? "tablist" : undefined}
      aria-label={showTabs ? "聊天室分頁" : undefined}
    >
      <button
        type="button"
        role={showTabs ? "tab" : undefined}
        aria-selected={showTabs ? !isHubTab : undefined}
        className="floating-chat-tab"
        data-active={!isHubTab || !showTabs ? "true" : "false"}
        tabIndex={showTabs ? -1 : undefined}
        onClick={
          showTabs
            ? (event) => {
                event.stopPropagation();
                switchTab("room");
              }
            : undefined
        }
      >
        {showTabs ? "房間" : windowTitle}
        {unread > 0 ? <span className="floating-chat-tab-badge">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {showTabs ? (
        <button
          type="button"
          role="tab"
          aria-selected={isHubTab}
          className="floating-chat-tab"
          data-active={isHubTab ? "true" : "false"}
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            switchTab("hub");
          }}
        >
          大廳
          {hubUnread > 0 ? <span className="floating-chat-tab-badge">{hubUnread > 99 ? "99+" : hubUnread}</span> : null}
        </button>
      ) : null}
    </div>
  );

  const chatBody = isHubTab ? (
    <HubChatMessagesList
      messages={hubMessages}
      setScrollNodeRef={setScrollNodeRef}
    />
  ) : undefined;

  const chatComposer = isHubTab ? (
    <HubChatComposer
      isAuthenticated={Boolean(authUser?.id)}
      isConnected={isConnected}
      inputRef={hubInputRef}
      messageInput={hubMessageInput}
      setMessageInput={setHubMessageInput}
      handleSend={handleSendHubMessage}
      onLoginRequired={loginWithGoogle}
      isSending={hubSending}
      statusText={hubStatusText}
      isChatCooldownActive={isHubCooldownActive}
      chatCooldownLeft={hubCooldownLeft}
    />
  ) : undefined;

  if (shouldSuppressGameChatOutsideDanmuBridge) {
    return null;
  }

  if (isMobileChatMode) {
    return (
      <MobileChatDrawerContent
        open={open}
        unread={totalUnread}
        title={windowTitle}
        variant={windowVariant}
        headerTabs={headerTabs}
        bodyActive={mobileBodyActive}
        showDanmuToggle={showDanmuToggle}
        danmuEnabled={Boolean(danmuCtx?.danmuEnabled)}
        onDanmuEnabledChange={handleDanmuEnabledChange}
        mobileChatDismissState={mobileChatDismissState}
        dragHandleProps={mobileChatDragDismiss.dragHandleProps}
        paperStyle={mobileChatDragDismiss.paperStyle}
        onOpen={handleOpen}
        onClose={handleClose}
        messages={isHubTab ? [] : messages}
        clientId={clientId}
        setScrollNodeRef={setScrollNodeRef}
        inputRef={inputRef}
        messageInput={isHubTab ? hubMessageInput : messageInput}
        setMessageInput={setMessageInput}
        handleSend={isHubTab ? handleSendHubMessage : handleSend}
        isChatCooldownActive={isChatCooldownActive}
        chatCooldownLeft={chatCooldownLeft}
        suppressTrigger={suppressMobileTrigger}
        composer={chatComposer}
      >
        {chatBody}
      </MobileChatDrawerContent>
    );
  }

  return (
    <DesktopChatWindowContent
      open={open}
      unread={totalUnread}
      title={windowTitle}
      variant={windowVariant}
      headerTabs={headerTabs}
      onToggle={toggleOpen}
      messages={isHubTab ? [] : messages}
      clientId={clientId}
      setScrollNodeRef={setScrollNodeRef}
      inputRef={inputRef}
      messageInput={isHubTab ? hubMessageInput : messageInput}
      setMessageInput={setMessageInput}
      handleSend={isHubTab ? handleSendHubMessage : handleSend}
      onCloseWhenEmpty={handleClose}
      isChatCooldownActive={isChatCooldownActive}
      chatCooldownLeft={chatCooldownLeft}
      composer={chatComposer}
    >
      {chatBody}
    </DesktopChatWindowContent>
  );
});

export default React.memo(FloatingChatWindow);
