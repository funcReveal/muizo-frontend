import React, { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Switch } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

import { useRoom } from "../../model/useRoom";
import { useChatInput } from "../../model/ChatInputContext";
import type { ChatMessage } from "../../model/types";
import { DanmuContext } from "./gameRoomPage/DanmuContext";

const LAST_READ_KEY_PREFIX = "mq_room_chat_last_read_message:";

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
  const { currentRoom, messages, clientId } = useRoom();
  const { messageInput, setMessageInput, handleSendMessage } = useChatInput();

  const danmuCtx = React.useContext(DanmuContext);
  const [open, setOpen] = useState(false);
  const [roomReadState, setRoomReadState] = useState<Record<string, string | null>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const roomId = currentRoom?.id ?? null;

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, open]);

  const otherMessages = React.useMemo(
    () => messages.filter((message) => isFromOther(message, clientId)),
    [clientId, messages],
  );
  const persistedLastReadId = React.useMemo(() => readLastReadId(roomId), [roomId]);
  const latestOtherMessageId = otherMessages[otherMessages.length - 1]?.id ?? null;
  const unread = React.useMemo(() => {
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

  const handleOpen = useCallback(() => {
    setOpen(true);
    if (roomId) {
      setRoomReadState((prev) => ({ ...prev, [roomId]: latestOtherMessageId }));
      writeLastReadId(roomId, latestOtherMessageId);
    }
    if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
    focusTimerRef.current = window.setTimeout(() => {
      focusTimerRef.current = null;
      inputRef.current?.focus();
    }, 80);
  }, [latestOtherMessageId, roomId]);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (roomId) {
      setRoomReadState((prev) => ({ ...prev, [roomId]: latestOtherMessageId }));
      writeLastReadId(roomId, latestOtherMessageId);
    }
  }, [latestOtherMessageId, roomId]);

  const toggleOpen = useCallback(() => {
    if (open) {
      handleClose();
      return;
    }
    handleOpen();
  }, [handleClose, handleOpen, open]);

  const handleSend = useCallback(() => {
    if (!messageInput.trim()) return;
    handleSendMessage();
  }, [handleSendMessage, messageInput]);

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
            {messages.length === 0 ? (
              <div className="floating-chat-empty">
                <span className="floating-chat-empty-dot" aria-hidden="true" />
                <span>目前還沒有訊息</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isPresence = msg.userId === "system:presence";
                if (isPresence) {
                  return (
                    <div
                      key={msg.id}
                      className="floating-chat-msg floating-chat-msg--presence"
                    >
                      <span className="floating-chat-msg-name">{msg.content}</span>
                      <span className="floating-chat-msg-time">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="floating-chat-msg">
                    <div className="floating-chat-msg-meta">
                      <span className="floating-chat-msg-name">
                        {msg.username ||
                          (msg.userId.startsWith("system:") ? "系統" : "玩家")}
                      </span>
                      <span className="floating-chat-msg-time">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="floating-chat-msg-body">{msg.content}</p>
                  </div>
                );
              })
            )}
          </div>

          <div className="floating-chat-input-row">
            <input
              ref={inputRef}
              className="floating-chat-input"
              placeholder="輸入訊息"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              autoComplete="off"
            />
            <button
              type="button"
              className="floating-chat-send-btn"
              onClick={handleSend}
            >
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChatWindow;
