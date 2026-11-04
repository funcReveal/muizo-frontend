import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { useState } from "react";
import ChatMessageBody from "./ChatMessageBody";
import HubChatReportDialog from "./HubChatReportDialog";

import type { HubChatMessage } from "@features/RoomSession";
import { normalizeRoomDisplayText } from "@shared/utils/text";
import PlayerProfileAvatar from "@features/PlayerProfile/ui/PlayerProfileAvatar";
import { isImeComposingKeyboardEvent } from "../utils/ime";

type HubChatMessagesListProps = {
  messages: HubChatMessage[];
  setScrollNodeRef: (node: HTMLDivElement | null) => void;
  viewerId?: string | null;
  currentRoomCode?: string | null;
  canModerate?: boolean;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onJoinRoom?: (roomCode: string) => void;
  hasOlderMessages?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => void;
  loadState?: "loading" | "ready" | "error";
  onRetry?: () => void;
};

const ChatGuidelines = () => (
  <div className="hub-chat-guidelines" role="note">
    <LockRoundedIcon fontSize="inherit" aria-hidden="true" />
    <span><strong>聊天守則：</strong>友善聊天、避免洗版，不分享個資或令人不舒服的內容。</span>
  </div>
);

const isSameLocalDate = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isSameLocalDate(date, today)) return time;

  const dateLabel = date.toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  });

  return `${dateLabel} ${time}`;
};

const formatDayDivider = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  if (isSameLocalDate(date, today)) return "今天";
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameLocalDate(date, yesterday)) return "昨天";
  return date.toLocaleDateString("zh-TW", { month: "long", day: "numeric" });
};

const COMPACT_SENDER_REPEAT_WINDOW_MS = 5 * 60 * 1000;

const shouldCompactMessage = (messages: HubChatMessage[], index: number) => {
  const message = messages[index];
  if (!message) return false;

  for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
    const previousMessage = messages[previousIndex];
    if (!previousMessage) continue;

    return (
      previousMessage.userId === message.userId &&
      message.timestamp - previousMessage.timestamp <= COMPACT_SENDER_REPEAT_WINDOW_MS
    );
  }

  return false;
};

const HubChatMessagesList = ({
  messages,
  setScrollNodeRef,
  viewerId,
  currentRoomCode,
  canModerate = false,
  onEditMessage,
  onDeleteMessage,
  onJoinRoom,
  hasOlderMessages = false,
  isLoadingOlder = false,
  onLoadOlder,
  loadState = "ready",
  onRetry,
}: HubChatMessagesListProps) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<HubChatMessage | null>(null);
  const stopEditing = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };
  const submitEdit = () => {
    const nextContent = editingContent.trim();
    if (!editingMessageId || !nextContent) return;
    const original = messages.find((message) => message.id === editingMessageId);
    if (original && nextContent !== original.content) {
      onEditMessage?.(editingMessageId, nextContent);
    }
    stopEditing();
  };
  if (messages.length === 0) {
    return (
      <div
        ref={setScrollNodeRef}
        className="floating-chat-messages floating-chat-messages--hub mq-autohide-scrollbar"
      >
        <ChatGuidelines />
        <div className="floating-chat-empty" role={loadState === "error" ? "alert" : "status"}>
          <span className="floating-chat-empty-dot" aria-hidden="true" />
          <strong>{loadState === "loading" ? "正在載入大廳訊息…" : loadState === "error" ? "暫時無法載入訊息" : "大廳還沒有訊息"}</strong>
          <p>{loadState === "loading" ? "正在連接聊天室，請稍候。" : loadState === "error" ? "請確認連線後重試，你的輸入內容會保留。" : "聊聊喜歡的歌，或分享你做的題庫。"}</p>
          {loadState === "error" && onRetry ? <button type="button" onClick={onRetry}>重新載入訊息</button> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setScrollNodeRef}
      className="floating-chat-messages floating-chat-messages--hub mq-autohide-scrollbar"
    >
      <ChatGuidelines />
      {hasOlderMessages ? (
        <button
          type="button"
          className="hub-chat-load-older"
          onClick={onLoadOlder}
          disabled={isLoadingOlder}
        >
          {isLoadingOlder ? "載入中…" : "載入更早訊息"}
        </button>
      ) : null}
      {messages.map((message, index) => {
        const isAdmin = message.role === "admin";
        const displayName = normalizeRoomDisplayText(message.username, "會員");
        const isCompact = shouldCompactMessage(messages, index);
        const canManage = message.userId === viewerId || canModerate;
        const canReport = Boolean(viewerId && message.userId !== viewerId);
        const isCurrentRoom = Boolean(
          currentRoomCode &&
          message.roomInvite?.roomCode.trim().toUpperCase() === currentRoomCode.trim().toUpperCase(),
        );
        const previous = messages[index - 1];
        const showDayDivider = !previous || !isSameLocalDate(
          new Date(previous.timestamp),
          new Date(message.timestamp),
        );
        return (
          <div key={message.id}>
            {showDayDivider ? <div className="hub-chat-day-divider"><span>{formatDayDivider(message.timestamp)}</span></div> : null}
          <div
            className={[
              "floating-chat-msg",
              message.userId === viewerId ? "floating-chat-msg--mine" : "",
              isAdmin ? "floating-chat-msg--admin" : "",
              isCompact ? "floating-chat-msg--compact" : "",
              (canManage || canReport) && !message.deletedAt
                ? "floating-chat-msg--manageable"
                : "",
            ].filter(Boolean).join(" ")}
          >
            <div className="floating-chat-msg-row">
              {!isCompact ? (
                <div className="floating-chat-msg-avatar">
                  <PlayerProfileAvatar
                    userId={message.userId}
                    username={message.username}
                    clientId={message.userId}
                    avatarUrl={message.avatarUrl ?? undefined}
                    size={30}
                    hideRankMark
                    effectLevel="simple"
                  />
                </div>
              ) : null}
              <div className="floating-chat-msg-content">
                {!isCompact ? (
                  <div className="floating-chat-msg-meta">
                    <span className="floating-chat-msg-name">
                      {displayName}
                    </span>
                    {isAdmin ? (
                      <span className="floating-chat-admin-badge">
                        <AdminPanelSettingsRounded sx={{ fontSize: 12 }} />
                        管理員
                      </span>
                    ) : null}
                    <span className="floating-chat-msg-time">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.editedAt && !message.deletedAt ? (
                      <span className="hub-chat-edited-label">已編輯</span>
                    ) : null}
                  </div>
                ) : null}
                {message.deletedAt ? <p className="hub-chat-message-removed">此訊息已移除</p> : message.kind === "sticker" ? (
                  <p className="hub-chat-message-removed">此貼圖已不再支援。</p>
                ) : message.kind === "room_invite" && message.roomInvite?.status === "unavailable" ? (
                  <p className="hub-chat-invite-unavailable" role="status">
                    房間邀請已失效
                  </p>
                ) : message.kind === "room_invite" && message.roomInvite ? (
                  <section className="hub-room-invite-card">
                    <div className="hub-room-invite-card__hero">
                      {message.roomInvite.playlistCoverThumbnailUrl ? <img src={message.roomInvite.playlistCoverThumbnailUrl} alt="" /> : <div className="hub-room-invite-card__cover-fallback" aria-hidden="true">♫</div>}
                      <span className={`hub-room-invite-card__mode ${message.roomInvite.isRanked ? "is-ranked" : ""}`}>{message.roomInvite.modeLabel}</span>
                    </div>
                    <strong>{message.roomInvite.playlistTitle ?? "尚未設定收藏庫"}</strong>
                    <p>{message.roomInvite.name}</p>
                    <div className="hub-room-invite-meta">
                      <span>{message.roomInvite.playerCount}/{message.roomInvite.maxPlayers ?? "∞"} 人</span>
                      <span>{message.roomInvite.questionCount} 題</span>
                      <span>{message.roomInvite.isPlaying ? "進行中" : "等待開局"}</span>
                      {message.roomInvite.status === "full" ? <span>房間已滿</span> : null}
                      {message.roomInvite.hasPin ? <span>需要 PIN</span> : null}
                    </div>
                    <button
                      type="button"
                      disabled={message.roomInvite.status === "full" || isCurrentRoom}
                      onClick={() => {
                        if (!isCurrentRoom) onJoinRoom?.(message.roomInvite?.roomCode ?? "");
                      }}
                    >
                      {isCurrentRoom
                        ? "目前所在房間"
                        : message.roomInvite.status === "full"
                          ? "房間已滿"
                          : "查看並加入"}
                    </button>
                  </section>
                ) : message.kind === "room_invite" ? (
                  <p className="hub-chat-invite-unavailable" role="status">
                    房間邀請已失效
                  </p>
                ) : editingMessageId === message.id ? (
                  <div className="hub-chat-message-editor" role="group" aria-label="編輯訊息">
                    <div className="hub-chat-message-editor-header">
                      <strong>編輯訊息</strong>
                      <span aria-hidden="true">{editingContent.length} / 360</span>
                    </div>
                    <textarea
                      autoFocus
                      rows={2}
                      value={editingContent}
                      maxLength={360}
                      aria-label="編輯大廳訊息"
                      aria-describedby={`hub-chat-edit-help-${message.id}`}
                      ref={(node) => {
                        if (!node) return;
                        node.style.height = "auto";
                        node.style.height = `${Math.min(node.scrollHeight, 132)}px`;
                      }}
                      onChange={(event) => setEditingContent(event.target.value)}
                      onInput={(event) => {
                        event.currentTarget.style.height = "auto";
                        event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 132)}px`;
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (isImeComposingKeyboardEvent(event)) return;
                        if (event.key === "Escape") {
                          event.preventDefault();
                          stopEditing();
                        }
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          submitEdit();
                        }
                      }}
                    />
                    <div className="hub-chat-message-editor-footer">
                      <small id={`hub-chat-edit-help-${message.id}`}>Enter 儲存 · Shift + Enter 換行<br />Esc 取消</small>
                      <div className="hub-chat-message-editor-actions">
                        <button type="button" onClick={stopEditing} aria-label="取消編輯">
                          <CloseRoundedIcon fontSize="inherit" />
                          取消
                        </button>
                        <button
                          type="button"
                          className="is-primary"
                          onClick={submitEdit}
                          disabled={!editingContent.trim() || editingContent.trim() === message.content}
                          aria-label="儲存編輯"
                        >
                          <CheckRoundedIcon fontSize="inherit" />
                          儲存
                        </button>
                      </div>
                    </div>
                  </div>
                ) : <ChatMessageBody content={message.content} />}
                {(canManage || canReport) && !message.deletedAt && editingMessageId !== message.id ? (
                  <div className="hub-chat-message-actions" aria-label="訊息操作">
                    {message.userId === viewerId && message.kind === "text" ? (
                      <IconButton
                        size="small"
                        aria-label="編輯訊息"
                        data-action="edit"
                        title="編輯"
                        onClick={() => {
                          setEditingMessageId(message.id);
                          setEditingContent(message.content);
                        }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    {canManage ? <IconButton
                      size="small"
                      aria-label="刪除訊息"
                      data-action="delete"
                      title="刪除"
                      onClick={() => setDeleteMessageId(message.id)}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton> : null}
                    {canReport ? <IconButton size="small" data-action="report" aria-label="檢舉訊息" title="檢舉訊息" onClick={() => setReportMessage(message)}><FlagOutlinedIcon fontSize="small" /></IconButton> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          </div>
        );
      })}
      <Dialog open={Boolean(deleteMessageId)} onClose={() => setDeleteMessageId(null)}>
        <DialogTitle>刪除訊息？</DialogTitle>
        <DialogContent>這則訊息會從大廳聊天室中移除，且無法復原。</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteMessageId(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={() => {
            if (deleteMessageId) onDeleteMessage?.(deleteMessageId);
            setDeleteMessageId(null);
          }}>刪除</Button>
        </DialogActions>
      </Dialog>
      {reportMessage ? <HubChatReportDialog key={reportMessage.id} message={reportMessage} onClose={() => setReportMessage(null)} /> : null}
    </div>
  );
};

export default HubChatMessagesList;
