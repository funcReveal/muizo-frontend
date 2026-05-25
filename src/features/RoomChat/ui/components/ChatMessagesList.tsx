import React from "react";
import type { ChatMessage } from "@features/RoomSession";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";
import {
    formatChatMessageTime,
    formatChatQuestionProgress,
    getChatDisplayName,
} from "../chatMessagePresentation";

interface ChatMessagesListProps {
    messages: ChatMessage[];
    clientId: string;
    setScrollNodeRef: (node: HTMLDivElement | null) => void;
}

const COMPACT_SENDER_REPEAT_WINDOW_MS = 5 * 60 * 1000;

const isSystemChatMessage = (message: ChatMessage) =>
    message.userId === "system" || message.userId.startsWith("system:");

const shouldCompactMessage = (messages: ChatMessage[], index: number) => {
    const message = messages[index];
    if (!message || isSystemChatMessage(message)) return false;

    for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
        const previousMessage = messages[previousIndex];
        if (isSystemChatMessage(previousMessage)) continue;

        return (
            previousMessage.userId === message.userId &&
            message.timestamp - previousMessage.timestamp <= COMPACT_SENDER_REPEAT_WINDOW_MS
        );
    }

    return false;
};

const ChatMessagesList: React.FC<ChatMessagesListProps> = ({
    messages,
    clientId,
    setScrollNodeRef,
}) => {
    if (messages.length === 0) {
        return (
            <div
                ref={setScrollNodeRef}
                className="floating-chat-messages mq-autohide-scrollbar"
            >
                <div className="floating-chat-empty">
                    <span className="floating-chat-empty-dot" aria-hidden="true" />
                    <span>目前還沒有新訊息</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setScrollNodeRef}
            className="floating-chat-messages mq-autohide-scrollbar"
        >
            {messages.map((msg, index) => {
                const isSystemMessage = isSystemChatMessage(msg);
                const isPresence = msg.userId === "system:presence";

                if (isPresence) {
                    return (
                        <div key={msg.id} className="floating-chat-msg floating-chat-msg--presence">
                            <span className="floating-chat-msg-name">{msg.content}</span>
                            <span className="floating-chat-msg-time">
                                {formatChatMessageTime(msg.timestamp)}
                            </span>
                        </div>
                    );
                }

                const isMine = msg.userId === clientId;
                const questionProgress = formatChatQuestionProgress(msg);
                const isCompact = shouldCompactMessage(messages, index);

                return (
                    <div
                        key={msg.id}
                        className={[
                            "floating-chat-msg",
                            isMine ? "floating-chat-msg--mine" : "",
                            isCompact ? "floating-chat-msg--compact" : "",
                        ].filter(Boolean).join(" ")}
                    >
                        <div className="floating-chat-msg-row">
                            {!isSystemMessage && !isCompact ? (
                                <div className="floating-chat-msg-avatar">
                                    <PlayerAvatar
                                        username={msg.username}
                                        clientId={msg.userId}
                                        avatarUrl={msg.avatarUrl ?? undefined}
                                        size={30}
                                        isMe={isMine}
                                        hideRankMark
                                        effectLevel="simple"
                                    />
                                </div>
                            ) : null}
                            <div className="floating-chat-msg-content">
                                {!isCompact ? (
                                    <div className="floating-chat-msg-meta">
                                        <span className="floating-chat-msg-name">{getChatDisplayName(msg)}</span>
                                        <span className="floating-chat-msg-time">
                                            {formatChatMessageTime(msg.timestamp)}
                                        </span>
                                        {questionProgress ? (
                                            <span className="floating-chat-msg-progress">{questionProgress}</span>
                                        ) : null}
                                    </div>
                                ) : null}
                                <p className="floating-chat-msg-body">{msg.content}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(ChatMessagesList);
