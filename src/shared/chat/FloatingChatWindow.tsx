import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Drawer, Switch } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { useRoomRealtime } from "../../features/Room/model/useRoomRealtime";
import { useChatInput } from "./ChatInputContext";
import type { ChatMessage } from "../../features/Room/model/types";
import { DanmuContext } from "../../features/GameRoom/model/DanmuContext";
import useMobileDrawerDragDismiss from "../../features/GameRoom/ui/lib/useMobileDrawerDragDismiss";
import { blurActiveInteractiveElement } from "../utils/dom";

const LAST_READ_KEY_PREFIX = "room_chat_last_read_message:";
const MOBILE_CHAT_MIN_HEIGHT_VH = 26;
const MOBILE_CHAT_MAX_HEIGHT_VH = 62;
const MOBILE_CHAT_DEFAULT_HEIGHT_VH = 38;
const GAME_ROOM_DRAWER_MODAL_PROPS = {
  hideBackdrop: true,
  keepMounted: true,
  disableAutoFocus: true,
  disableEnforceFocus: true,
  disableRestoreFocus: true,
  disableScrollLock: true,
} as const;

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

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const isFromOther = (msg: ChatMessage, clientId: string) =>
  !msg.userId.startsWith("system:") && msg.userId !== clientId;

const FloatingChatWindow: React.FC = () => {
  const {
    currentRoom,
    messages,
    clientId,
    gameState,
  } = useRoomRealtime();
  const {
    messageInput,
    setMessageInput,
    handleSendMessage,
    isChatCooldownActive,
    chatCooldownLeft,
  } = useChatInput();

  const danmuCtx = React.useContext(DanmuContext);
  const [open, setOpen] = useState(false);
  const [roomReadState, setRoomReadState] = useState<Record<string, string | null>>({});
  const [mobileHeight, setMobileHeight] = useState(MOBILE_CHAT_DEFAULT_HEIGHT_VH);
  const isMobileViewport = useMediaQuery("(max-width: 1023.95px)");
  const isMobileRoomMode = Boolean(currentRoom && isMobileViewport);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const roomId = currentRoom?.id ?? null;

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, open]);

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
    if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
    focusTimerRef.current = window.setTimeout(() => {
      focusTimerRef.current = null;
      inputRef.current?.focus();
    }, 80);
  }, [markRoomRead]);

  const handleClose = useCallback(() => {
    blurActiveInteractiveElement();
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
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
    onHeightChange: setMobileHeight,
    threshold: 52,
    thresholdBuffer: 24,
  });
  const mobileChatDismissState = mobileChatDragDismiss.canDismiss
    ? "ready"
    : mobileChatDragDismiss.isDismissArmed
      ? "armed"
      : "idle";

  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="floating-chat-empty">
          <span className="floating-chat-empty-dot" aria-hidden="true" />
          <span>目前還沒有新訊息</span>
        </div>
      );
    }

    return messages.map((msg) => {
      const isPresence = msg.userId === "system:presence";
      if (isPresence) {
        return (
          <div key={msg.id} className="floating-chat-msg floating-chat-msg--presence">
            <span className="floating-chat-msg-name">{msg.content}</span>
            <span className="floating-chat-msg-time">{formatTime(msg.timestamp)}</span>
          </div>
        );
      }
      return (
        <div key={msg.id} className="floating-chat-msg">
          <div className="floating-chat-msg-meta">
            <span className="floating-chat-msg-name">
              {msg.username || (msg.userId.startsWith("system:") ? "系統" : "玩家")}
            </span>
            <span className="floating-chat-msg-time">{formatTime(msg.timestamp)}</span>
          </div>
          <p className="floating-chat-msg-body">{msg.content}</p>
        </div>
      );
    });
  };

  if (isMobileRoomMode) {
    return (
      <>
        {!open && (
          <button
            type="button"
            className="game-room-mobile-chat-drawer-trigger"
            onClick={handleOpen}
            aria-label={
              unread > 0 ? `開啟聊天室，目前有 ${unread} 則未讀訊息` : "開啟聊天室"
            }
          >
            <span className="game-room-mobile-chat-drawer-trigger__label">聊天室</span>
            <div className="game-room-mobile-chat-drawer-trigger__actions">
              <Badge
                color="error"
                badgeContent={unread > 99 ? "99+" : unread}
                invisible={unread <= 0}
              >
                <ChatBubbleRoundedIcon fontSize="small" />
              </Badge>
              <span
                className="game-room-mobile-chat-drawer-trigger__toggle"
                aria-hidden="true"
              >
                <ExpandLessRoundedIcon fontSize="small" />
              </span>
            </div>
          </button>
        )}

        <Drawer
          className="game-room-mobile-drawer-root game-room-mobile-drawer-root--chat lg:!hidden"
          anchor="bottom"
          open={open}
          onClose={handleClose}
          ModalProps={GAME_ROOM_DRAWER_MODAL_PROPS}
          PaperProps={{
            className: `game-room-mobile-chat-drawer ${open
              ? "game-room-mobile-chat-drawer--open"
              : "game-room-mobile-chat-drawer--closed"
              }`,
            style: mobileChatDragDismiss.paperStyle,
          }}
        >
          <div
            className="game-room-mobile-drawer-head game-room-mobile-drawer-head--chat"
            role="presentation"
            aria-label="Drag down to collapse chat"
          >
            <div
              className={`game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable game-room-mobile-drawer-handle-wrap--${mobileChatDismissState}`}
              aria-hidden="true"
              {...mobileChatDragDismiss.dragHandleProps}
            >
              <span className="game-room-mobile-drawer-handle-bar" />
            </div>
            <div className="game-room-mobile-chat-drawer-headline">
              <div className="game-room-mobile-chat-drawer-title-group">
                <span className="game-room-mobile-chat-drawer-title">聊天室</span>
              </div>
              <div className="game-room-mobile-chat-drawer-actions">
                {gameState && danmuCtx && (
                  <label
                    className="game-room-mobile-chat-alert-toggle"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <span>彈幕</span>
                    <Switch
                      size="small"
                      color="info"
                      checked={danmuCtx.danmuEnabled}
                      onChange={(event) =>
                        danmuCtx.onDanmuEnabledChange(event.target.checked)
                      }
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="game-room-mobile-drawer-close game-room-mobile-drawer-close--icon"
                  onClick={handleClose}
                  aria-label="收合聊天室"
                >
                  <ExpandMoreRoundedIcon fontSize="inherit" />
                </button>
              </div>
            </div>
          </div>
          <div className="game-room-mobile-chat-drawer-body">
            <div className="game-room-mobile-chat-drawer-panel">
              <div ref={scrollRef} className="floating-chat-messages">
                {renderMessages()}
              </div>

              <div className="floating-chat-input-wrap">
                <div className="floating-chat-input-row">
                  {isChatCooldownActive ? (
                    <div className="floating-chat-cooldown-inline">
                      輸入過於頻繁，請於 <strong>{chatCooldownLeft}</strong> 秒後重試
                    </div>
                  ) : (
                    <input
                      ref={inputRef}
                      className="floating-chat-input"
                      placeholder="輸入訊息"
                      value={messageInput}
                      onChange={(event) => {
                        setMessageInput(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      autoComplete="off"
                    />
                  )}
                  <button
                    type="button"
                    className="floating-chat-send-btn"
                    onClick={handleSend}
                    disabled={isChatCooldownActive || !messageInput.trim()}
                  >
                    送出
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Drawer>
      </>
    );
  }

  return (
    <div className="floating-chat-root" data-open={open ? "true" : "false"}>
      {!open && (
        <button
          type="button"
          className="floating-chat-fab"
          onClick={toggleOpen}
          aria-label={
            unread > 0 ? `展開聊天室，目前有 ${unread} 則未讀訊息` : "展開聊天室"
          }
        >
          <Badge
            color="error"
            badgeContent={unread > 99 ? "99+" : unread}
            invisible={unread <= 0}
          >
            <ChatBubbleRoundedIcon fontSize="small" />
          </Badge>
          <span className="floating-chat-fab-label">聊天室</span>
          <span className="floating-chat-fab-toggle-icon" aria-hidden="true">
            <ExpandLessRoundedIcon fontSize="small" />
          </span>
        </button>
      )}

      {open && (
        <div className="floating-chat-window" role="dialog" aria-label="聊天室">
          <div
            className="floating-chat-header"
            role="button"
            tabIndex={0}
            aria-expanded={open}
            aria-label="收合聊天室"
            onClick={toggleOpen}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleOpen();
              }
            }}
          >
            <div className="floating-chat-header-title">
              <ChatBubbleRoundedIcon sx={{ fontSize: 14, opacity: 0.8 }} />
              <span>聊天室</span>
            </div>
            <div className="floating-chat-header-actions">
              {danmuCtx && (
                <label
                  className="floating-chat-danmu-toggle"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <span>彈幕</span>
                  <Switch
                    size="small"
                    color="info"
                    checked={danmuCtx.danmuEnabled}
                    onChange={(event) =>
                      danmuCtx.onDanmuEnabledChange(event.target.checked)
                    }
                  />
                </label>
              )}
              <span className="floating-chat-toggle-icon" aria-hidden="true">
                <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />
              </span>
            </div>
          </div>

          <div ref={scrollRef} className="floating-chat-messages">
            {renderMessages()}
          </div>

          <div className="floating-chat-input-wrap">
            <div className="floating-chat-input-row">
              {isChatCooldownActive ? (
                <div className="floating-chat-cooldown-inline">
                  輸入過於頻繁，請於 <strong>{chatCooldownLeft}</strong> 秒後重試
                </div>
              ) : (
                <input
                  ref={inputRef}
                  className="floating-chat-input"
                  placeholder="輸入訊息"
                  value={messageInput}
                  onChange={(event) => {
                    setMessageInput(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  autoComplete="off"
                />
              )}
              <button
                type="button"
                className="floating-chat-send-btn"
                onClick={handleSend}
                disabled={isChatCooldownActive || !messageInput.trim()}
              >
                {isChatCooldownActive ? `${chatCooldownLeft}s` : "送出"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChatWindow;
