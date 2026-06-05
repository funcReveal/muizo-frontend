import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";

import type { HubChatMessage } from "@features/RoomSession";
import { normalizeRoomDisplayText } from "@shared/utils/text";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";

type HubChatMessagesListProps = {
  messages: HubChatMessage[];
  setScrollNodeRef: (node: HTMLDivElement | null) => void;
};

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
}: HubChatMessagesListProps) => {
  if (messages.length === 0) {
    return (
      <div
        ref={setScrollNodeRef}
        className="floating-chat-messages floating-chat-messages--hub mq-autohide-scrollbar"
      >
        <div className="floating-chat-empty">
          <span className="floating-chat-empty-dot" aria-hidden="true" />
          <span>大廳還沒有訊息</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setScrollNodeRef}
      className="floating-chat-messages floating-chat-messages--hub mq-autohide-scrollbar"
    >
      {messages.map((message, index) => {
        const isAdmin = message.role === "admin";
        const displayName = normalizeRoomDisplayText(message.username, "會員");
        const isCompact = shouldCompactMessage(messages, index);
        return (
          <div
            key={message.id}
            className={[
              "floating-chat-msg",
              isAdmin ? "floating-chat-msg--admin" : "",
              isCompact ? "floating-chat-msg--compact" : "",
            ].filter(Boolean).join(" ")}
          >
            <div className="floating-chat-msg-row">
              {!isCompact ? (
                <div className="floating-chat-msg-avatar">
                  <PlayerAvatar
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
                  </div>
                ) : null}
                <p className="floating-chat-msg-body">{message.content}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HubChatMessagesList;
