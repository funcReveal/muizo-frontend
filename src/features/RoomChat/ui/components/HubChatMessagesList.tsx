import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";

import type { HubChatMessage } from "@features/RoomSession";
import { normalizeRoomDisplayText } from "@shared/utils/text";

type HubChatMessagesListProps = {
  messages: HubChatMessage[];
  setScrollNodeRef: (node: HTMLDivElement | null) => void;
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const HubChatMessagesList = ({
  messages,
  setScrollNodeRef,
}: HubChatMessagesListProps) => {
  if (messages.length === 0) {
    return (
      <div
        ref={setScrollNodeRef}
        className="floating-chat-messages mq-autohide-scrollbar"
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
      className="floating-chat-messages mq-autohide-scrollbar"
    >
      {messages.map((message) => {
        const isAdmin = message.role === "admin";
        return (
          <div
            key={message.id}
            className={`floating-chat-msg${isAdmin ? " floating-chat-msg--admin" : ""}`}
          >
            <div className="floating-chat-msg-row">
              <div className="floating-chat-msg-content">
                <div className="floating-chat-msg-meta">
                  <span className="floating-chat-msg-name">
                    {normalizeRoomDisplayText(message.username, "會員")}
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
