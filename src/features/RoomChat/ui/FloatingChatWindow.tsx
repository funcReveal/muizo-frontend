import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import { useChatInput, useChatMessages, useRoomCreate, useRoomRealtime, useRoomSession } from "@features/RoomSession";
import type { Ack, ChatMessage, HubChatMessage, RoomSummary } from "@features/RoomSession";
import { useAuth } from "@shared/auth/AuthContext";
import { DanmuContext } from "@features/RoomChat/model/DanmuContext";
import useAutoHideScrollbar from "@shared/hooks/useAutoHideScrollbar";
import { blurActiveInteractiveElement } from "@shared/utils/dom";
import MobileChatWindowContent from "./components/MobileChatWindowContent";
import DesktopChatWindowContent from "./components/DesktopChatWindowContent";
import HubChatMessagesList from "./components/HubChatMessagesList";
import HubChatComposer from "./components/HubChatComposer";
import ChatComposer from "./components/ChatComposer";
import CollectionShareButton from "./components/CollectionShareButton";
import "./chatSurface.css";
import { isGlobalChatShortcutTarget } from "./utils/keyboard";
import { countUnreadMessages } from "./utils/unread";

const LAST_READ_KEY_PREFIX = "room_chat_last_read_message:";
const HUB_LAST_READ_KEY = "hub_chat_last_read_message";
const HUB_CHAT_MAX_MESSAGES = 80;
const HUB_CHAT_LOAD_RETRY_DELAYS_MS = [120, 360, 900, 1800] as const;
const ROOM_INVITE_COOLDOWN_MS = 30_000;

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

const applyLatestRoomStateToInvites = (
  messages: HubChatMessage[],
  rooms: RoomSummary[] | null,
): HubChatMessage[] => {
  if (!rooms) return messages;

  const roomsByCode = new Map(rooms.map((room) => [room.roomCode, room]));
  return messages.map<HubChatMessage>((message) => {
    if (message.kind !== "room_invite" || !message.roomInvite) return message;

    const room = roomsByCode.get(message.roomInvite.roomCode);
    if (!room) {
      return {
        ...message,
        roomInvite: { ...message.roomInvite, status: "unavailable" },
      };
    }

    const isFull = room.maxPlayers != null && room.playerCount >= room.maxPlayers;
    return {
      ...message,
      roomInvite: {
        ...message.roomInvite,
        name: room.name || message.roomInvite.name,
        playerCount: room.playerCount,
        maxPlayers: room.maxPlayers ?? null,
        playlistTitle: room.playlistTitle ?? message.roomInvite.playlistTitle,
        playlistCoverThumbnailUrl:
          room.playlistCoverThumbnailUrl ?? message.roomInvite.playlistCoverThumbnailUrl,
        questionCount:
          room.gameSettings?.questionCount ?? message.roomInvite.questionCount,
        isPlaying: room.isPlaying ?? room.gameStatus === "playing",
        status: isFull ? "full" : "available",
      },
    };
  });
};

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
  const { getSocket, isConnected, participants } = useRoomSession();
  const { handleJoinRoom } = useRoomCreate();
  const { authUser, loginWithGoogle } = useAuth();
  const { messages } = useChatMessages();
  const profileMessages = useMemo(() => {
    const identities = new Map(participants.map((participant) => [participant.clientId, participant.authUserId]));
    return messages.map((message) => message.authUserId || !identities.get(message.userId)
      ? message : { ...message, authUserId: identities.get(message.userId) });
  }, [messages, participants]);
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
  const [hubListState, setHubListState] = useState<"loading" | "ready" | "error">("loading");
  const [hubMessageInput, setHubMessageInput] = useState("");
  const [hubStatusText, setHubStatusText] = useState<string | null>(null);
  const [hubSending, setHubSending] = useState(false);
  const [hubCooldownUntil, setHubCooldownUntil] = useState<number | null>(null);
  const [hubCooldownLeft, setHubCooldownLeft] = useState(0);
  const [shareCooldownUntil, setShareCooldownUntil] = useState<number | null>(null);
  const [shareCooldownLeft, setShareCooldownLeft] = useState(0);
  const [hubHistoryCursor, setHubHistoryCursor] = useState<string | null>(null);
  const [hubHistoryLoading, setHubHistoryLoading] = useState(false);
  const [hubFocusRequestId, setHubFocusRequestId] = useState(0);
  const [hubLastReadId, setHubLastReadId] = useState<string | null>(() => readHubLastReadId());
  const [mobileBodyActive, setMobileBodyActive] = useState(false);
  const [roomReadState, setRoomReadState] = useState<Record<string, string | null>>({});


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
  const loadHubMessagesRef = useRef<(retryIndex?: number) => void>(() => undefined);
  const previousRoomIdRef = useRef<string | null>(currentRoom?.id ?? null);
  const latestPublicRoomsRef = useRef<RoomSummary[] | null>(null);
  const preserveHubScrollRef = useRef<{ height: number; top: number } | null>(null);

  const roomId = currentRoom?.id ?? null;
  const showTabs = Boolean(currentRoom);
  const effectiveTab: ChatTab = currentRoom ? activeTab : "hub";
  const isHubTab = effectiveTab === "hub";
  const isHubCooldownActive = hubCooldownLeft > 0;
  const isShareCooldownActive = shareCooldownLeft > 0;
  const canHubChat = Boolean(authUser?.id);
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

  const syncHubInviteStates = useCallback((rooms: RoomSummary[]) => {
    latestPublicRoomsRef.current = rooms;
    setHubMessages((previous) => applyLatestRoomStateToInvites(previous, rooms));
  }, []);

  const requestHubInviteStates = useCallback(() => {
    const socket = getSocket();
    if (!socket || !isConnected || !socket.connected) return;

    socket.emit("listRooms", (ack) => {
      if (ack?.ok) syncHubInviteStates(ack.data.rooms);
    });
  }, [getSocket, isConnected, syncHubInviteStates]);

  useEffect(() => {
    const nextRoomId = currentRoom?.id ?? null;
    let rafId: number | null = null;
    if (nextRoomId && nextRoomId !== previousRoomIdRef.current) {
      rafId = window.requestAnimationFrame(() => setActiveTab("room"));
    } else if (!nextRoomId) {
      rafId = window.requestAnimationFrame(() => setActiveTab("hub"));
    }
    previousRoomIdRef.current = nextRoomId;
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [currentRoom?.id]);


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

  useEffect(() => {
    if (!shareCooldownUntil) return;

    let timerId: number | null = null;
    const tick = () => {
      const diff = shareCooldownUntil - Date.now();
      if (diff <= 0) {
        setShareCooldownLeft(0);
        setShareCooldownUntil(null);
        timerId = null;
        return;
      }

      const nextSec = Math.ceil(diff / 1000);
      setShareCooldownLeft(nextSec);
      const msToNextBoundary = diff - (nextSec - 1) * 1000;
      timerId = window.setTimeout(tick, Math.max(50, msToNextBoundary));
    };

    tick();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [shareCooldownUntil]);

  const loadHubMessages = useCallback((retryIndex = 0) => {
    if (retryIndex === 0) {
      clearHubListRetryTimers();
      hubListRequestSeqRef.current += 1;
      setHubListState("loading");
    }
    const socket = getSocket();
    if (!socket || !isConnected || !socket.connected) {
      if (retryIndex < HUB_CHAT_LOAD_RETRY_DELAYS_MS.length) {
        const timerId = window.setTimeout(() => {
          hubListRetryTimersRef.current = hubListRetryTimersRef.current.filter(
            (id) => id !== timerId,
          );
          loadHubMessagesRef.current(retryIndex + 1);
        }, HUB_CHAT_LOAD_RETRY_DELAYS_MS[retryIndex]);
        hubListRetryTimersRef.current.push(timerId);
      } else {
        setHubListState("error");
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
    const fallbackTimerId = window.setTimeout(() => {
            if (settled || hubListRequestSeqRef.current !== requestSeq) return;
            hubListRetryTimersRef.current = hubListRetryTimersRef.current.filter(
              (id) => id !== fallbackTimerId,
            );
            if (retryIndex < HUB_CHAT_LOAD_RETRY_DELAYS_MS.length) loadHubMessagesRef.current(retryIndex + 1);
            else setHubListState("error");
          }, retryIndex < HUB_CHAT_LOAD_RETRY_DELAYS_MS.length ? fallbackDelay : 5000);

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
      if (!ack) { setHubListState("error"); return; }
      if (ack.ok) {
        setHubListState("ready");
        const latestMessages = ack.data.slice(-HUB_CHAT_MAX_MESSAGES);
        setHubMessages(
          applyLatestRoomStateToInvites(
            latestMessages,
            latestPublicRoomsRef.current,
          ),
        );
        setHubHistoryCursor(
          latestMessages.length >= HUB_CHAT_MAX_MESSAGES && latestMessages[0]
            ? new Date(latestMessages[0].timestamp).toISOString()
            : null,
        );
        requestHubInviteStates();
        setHubStatusText(null);
        return;
      }
      setHubStatusText("無法載入大廳聊天室");
      setHubListState("error");
    });
  }, [
    clearHubListRetryTimers,
    getSocket,
    isConnected,
    requestHubInviteStates,
  ]);

  useEffect(() => {
    loadHubMessagesRef.current = loadHubMessages;
  }, [loadHubMessages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected) return;

    const handleHubChatMessageAdded = (message: HubChatMessage) => {
      setHubMessages((prev) =>
        applyLatestRoomStateToInvites(
          [...prev, message].slice(-HUB_CHAT_MAX_MESSAGES),
          latestPublicRoomsRef.current,
        ),
      );
    };
    const handleRoomsUpdated = (rooms: RoomSummary[]) => {
      syncHubInviteStates(rooms);
    };
    const handleHubChatMessageUpdated = (updated: HubChatMessage) => {
      setHubMessages((previous) =>
        applyLatestRoomStateToInvites(
          previous.map((message) => message.id === updated.id ? updated : message),
          latestPublicRoomsRef.current,
        ),
      );
    };

    socket.on("hubChatMessageAdded", handleHubChatMessageAdded);
    socket.on("hubChatMessageUpdated", handleHubChatMessageUpdated);
    socket.on("roomsUpdated", handleRoomsUpdated);
    socket.on("connect", loadHubMessages);
    socket.io.on("reconnect", loadHubMessages);

    return () => {
      socket.off("hubChatMessageAdded", handleHubChatMessageAdded);
      socket.off("hubChatMessageUpdated", handleHubChatMessageUpdated);
      socket.off("roomsUpdated", handleRoomsUpdated);
      socket.off("connect", loadHubMessages);
      socket.io.off("reconnect", loadHubMessages);
    };
  }, [getSocket, isConnected, loadHubMessages, syncHubInviteStates]);

  useEffect(() => {
    if (!isHubTab) return;
    const frame = window.requestAnimationFrame(() => loadHubMessages());
    return () => window.cancelAnimationFrame(frame);
  }, [isHubTab, loadHubMessages, roomId]);

  useEffect(() => clearHubListRetryTimers, [clearHubListRetryTimers]);

  useEffect(() => {
    if (!open) return;

    const rafId = window.requestAnimationFrame(() => {
      const preserve = preserveHubScrollRef.current;
      if (preserve) {
        const node = scrollRef.current;
        preserveHubScrollRef.current = null;
        if (node) {
          node.scrollTop = preserve.top + (node.scrollHeight - preserve.height);
        }
        return;
      }
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
    open,
    scrollChatToBottom,
  ]);

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
    if (!roomId || !latestOtherMessageId) return 0;

    const hasRoomSnapshot = Object.prototype.hasOwnProperty.call(roomReadState, roomId);
    const lastSeenId = hasRoomSnapshot ? roomReadState[roomId] : persistedLastReadId;
    return countUnreadMessages(otherMessages, lastSeenId, open && !isHubTab);
  }, [isHubTab, latestOtherMessageId, open, otherMessages, persistedLastReadId, roomId, roomReadState]);

  const hubUnread = useMemo(() => {
    return countUnreadMessages(hubMessages, hubLastReadId, open && isHubTab);
  }, [hubLastReadId, hubMessages, isHubTab, open]);

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

  useEffect(() => {
    if (!open) return;
    const rafId = window.requestAnimationFrame(() => {
      if (isHubTab) {
        markHubRead();
        return;
      }
      markRoomRead();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [isHubTab, markHubRead, markRoomRead, open]);

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
    if (hubSending || isHubCooldownActive || !canHubChat) return;
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
    isHubCooldownActive, canHubChat,
  ]);

  const handleShareCurrentRoom = useCallback(() => {
    if (
      hubSending ||
      isHubCooldownActive ||
      isShareCooldownActive ||
      !canHubChat ||
      !currentRoom?.roomCode ||
      currentRoom.visibility !== "public"
    ) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      setHubStatusText("尚未連線到聊天室");
      return;
    }

    setHubSending(true);
    socket.emit(
      "sendHubChatMessage",
      { kind: "room_invite", roomCode: currentRoom.roomCode },
      (ack) => {
        setHubSending(false);
        if (!ack) return;
        if (ack.ok) {
          setHubStatusText("已分享房間到大廳聊天室");
          setShareCooldownLeft(Math.ceil(ROOM_INVITE_COOLDOWN_MS / 1000));
          setShareCooldownUntil(Date.now() + ROOM_INVITE_COOLDOWN_MS);
          return;
        }
        const retryAfterMs = resolveChatRetryAfterMs(ack);
        if (retryAfterMs) {
          setShareCooldownLeft(Math.ceil(retryAfterMs / 1000));
          setShareCooldownUntil(Date.now() + retryAfterMs);
          setHubStatusText(ack.error);
          return;
        }
        setHubStatusText(ack.error);
      },
    );
  }, [
    canHubChat,
    currentRoom,
    getSocket,
    hubSending,
    isHubCooldownActive,
    isShareCooldownActive,
  ]);

  const loadOlderHubMessages = useCallback(() => {
    if (!hubHistoryCursor || hubHistoryLoading) return;
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    const scrollNode = scrollRef.current;
    if (scrollNode) {
      preserveHubScrollRef.current = {
        height: scrollNode.scrollHeight,
        top: scrollNode.scrollTop,
      };
    }

    setHubHistoryLoading(true);
    socket.emit(
      "listHubChatHistory",
      { cursor: hubHistoryCursor, limit: 50 },
      (ack) => {
        setHubHistoryLoading(false);
        if (!ack?.ok) {
          preserveHubScrollRef.current = null;
          setHubStatusText("無法載入更早的訊息");
          return;
        }

        setHubHistoryCursor(ack.data.nextCursor);
        setHubMessages((previous) => {
          const existingIds = new Set(previous.map((message) => message.id));
          const older = ack.data.messages.filter((message) => !existingIds.has(message.id));
          return applyLatestRoomStateToInvites(
            [...older, ...previous],
            latestPublicRoomsRef.current,
          );
        });
      },
    );
  }, [getSocket, hubHistoryCursor, hubHistoryLoading]);

  const switchTab = useCallback(
    (nextTab: ChatTab) => {
      if (isHubTab) {
        markHubRead();
      } else {
        markRoomRead();
      }
      setActiveTab(nextTab);
      if (nextTab === "hub") {
        markHubRead();
      } else {
        markRoomRead();
      }
      window.requestAnimationFrame(scrollChatToBottom);
    },
    [isHubTab, markHubRead, markRoomRead, scrollChatToBottom],
  );

  useEffect(() => {
    if (isMobileChatMode) return;

    const handleDesktopChatKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target;
      const targetElement =
        target instanceof HTMLElement ? target : document.activeElement;

      const isInteractiveTarget = isGlobalChatShortcutTarget(targetElement);

      if (!open && event.key === "Enter") {
        if (isInteractiveTarget) return;

        event.preventDefault();
        handleOpen();
        return;
      }

      if (open && event.key === "Escape" && !isInteractiveTarget) {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleDesktopChatKeyDown);
    return () => {
      window.removeEventListener("keydown", handleDesktopChatKeyDown);
    };
  }, [
    handleClose,
    handleOpen,
    isMobileChatMode,
    open,
  ]);

  useEffect(() => {
    if (!open || !isHubTab || isHubCooldownActive || !authUser?.id) return;
    const rafId = window.requestAnimationFrame(() => {
      const input = hubInputRef.current;
      if (!input || input.disabled) return;
      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [
    authUser?.id,
    isHubCooldownActive,
    isHubTab,
    open,
  ]);

  React.useImperativeHandle(ref, () => ({ openChat: handleOpen }), [handleOpen]);

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

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!showTabs || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const tabList = event.currentTarget.parentElement;
    const nextTab: ChatTab = event.key === "Home"
      ? "room"
      : event.key === "End"
        ? "hub"
        : isHubTab
          ? "room"
          : "hub";
    switchTab(nextTab);
    window.requestAnimationFrame(() => {
      tabList
        ?.querySelector<HTMLButtonElement>(`[data-chat-tab="${nextTab}"]`)
        ?.focus();
    });
  };

  const headerTabs = showTabs ? (
    <div
      className="floating-chat-tabs"
      role="tablist"
      aria-label="聊天室分頁"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isHubTab}
        className="floating-chat-tab"
        data-chat-tab="room"
        data-active={!isHubTab ? "true" : "false"}
        tabIndex={!isHubTab ? 0 : -1}
        onKeyDown={handleTabKeyDown}
        onClick={(event) => {
          event.stopPropagation();
          switchTab("room");
        }}
      >
        <MeetingRoomRoundedIcon fontSize="inherit" />
        <span>房間</span>
        {unread > 0 ? <span className="floating-chat-tab-badge">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      <button
          type="button"
          role="tab"
          aria-selected={isHubTab}
          className="floating-chat-tab"
          data-chat-tab="hub"
          data-active={isHubTab ? "true" : "false"}
          tabIndex={isHubTab ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={(event) => {
            event.stopPropagation();
            switchTab("hub");
          }}
        >
          <PublicRoundedIcon fontSize="inherit" />
          <span>大廳</span>
          {hubUnread > 0 ? <span className="floating-chat-tab-badge">{hubUnread > 99 ? "99+" : hubUnread}</span> : null}
      </button>
    </div>
  ) : (
    <div className="floating-chat-context-label">
      <PublicRoundedIcon fontSize="inherit" />
      <span>{windowTitle}</span>
    </div>
  );

  const chatBody = isHubTab ? (
    <HubChatMessagesList
      messages={hubMessages}
      setScrollNodeRef={setScrollNodeRef}
      viewerId={authUser?.id}
      canModerate={authUser?.role === "admin"}
      currentRoomCode={currentRoom?.roomCode ?? null}
      onEditMessage={(messageId, content) => getSocket()?.emit("editHubChatMessage", { messageId, content }, (ack) => {
        if (!ack.ok) setHubStatusText(ack.error);
      })}
      onDeleteMessage={(messageId) => getSocket()?.emit("deleteHubChatMessage", { messageId }, (ack) => {
        if (!ack.ok) setHubStatusText(ack.error);
      })}
      onJoinRoom={(roomCode) => handleJoinRoom(roomCode, false)}
      hasOlderMessages={Boolean(hubHistoryCursor)}
      isLoadingOlder={hubHistoryLoading}
      onLoadOlder={loadOlderHubMessages}
      loadState={hubListState}
      onRetry={() => loadHubMessages()}
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
      canShareRoom={Boolean(currentRoom?.roomCode && currentRoom.visibility === "public")}
      onShareRoom={handleShareCurrentRoom}
      shareCooldownLeft={shareCooldownLeft}
      onLoginRequired={loginWithGoogle}
      isSending={hubSending}
      statusText={hubStatusText}
      isChatCooldownActive={isHubCooldownActive}
      chatCooldownLeft={hubCooldownLeft}
      shareAction={<CollectionShareButton disabled={!isConnected || hubSending || isHubCooldownActive} messageInput={hubMessageInput} setMessageInput={setHubMessageInput} inputRef={hubInputRef} maxLength={360} />}
    />
  ) : (
    <ChatComposer
      inputRef={inputRef}
      messageInput={messageInput}
      setMessageInput={setMessageInput}
      handleSend={handleSend}
      onRequestCloseWhenEmpty={handleClose}
      isChatCooldownActive={isChatCooldownActive}
      chatCooldownLeft={chatCooldownLeft}
      shareAction={<CollectionShareButton disabled={!isConnected || isChatCooldownActive} messageInput={messageInput} setMessageInput={setMessageInput} inputRef={inputRef} maxLength={500} />}
    />
  );

  if (shouldSuppressGameChatOutsideDanmuBridge) {
    return null;
  }

  if (isMobileChatMode) {
    return (
      <MobileChatWindowContent
        open={open}
        unread={totalUnread}
        title={windowTitle}
        variant={windowVariant}
        headerTabs={showTabs ? headerTabs : undefined}
        bodyActive={mobileBodyActive}
        showDanmuToggle={showDanmuToggle}
        danmuEnabled={Boolean(danmuCtx?.danmuEnabled)}
        onDanmuEnabledChange={handleDanmuEnabledChange}
        onOpen={handleOpen}
        onClose={handleClose}
        messages={isHubTab ? [] : profileMessages}
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
      </MobileChatWindowContent>
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
      messages={isHubTab ? [] : profileMessages}
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
