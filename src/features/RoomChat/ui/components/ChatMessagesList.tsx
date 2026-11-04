import React from "react";
import ChatMessageBody from "./ChatMessageBody";
import type { ChatMessage } from "@features/RoomSession";
import PlayerProfileAvatar from "@features/PlayerProfile/ui/PlayerProfileAvatar";
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

const isSameLocalDate = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

const formatDayDivider = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (isSameLocalDate(date, today)) return "今天";

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (isSameLocalDate(date, yesterday)) return "昨天";

    return date.toLocaleDateString("zh-TW", { month: "long", day: "numeric" });
};

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
            isSameLocalDate(
                new Date(previousMessage.timestamp),
                new Date(message.timestamp),
            ) &&
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
                className="floating-chat-messages floating-chat-messages--room mq-autohide-scrollbar"
            >
                <div className="floating-chat-empty">
                    <span className="floating-chat-empty-dot" aria-hidden="true" />
                    <strong>房間還沒有訊息</strong>
                    <span>打聲招呼，和房內玩家一起準備開局。</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setScrollNodeRef}
            className="floating-chat-messages floating-chat-messages--room mq-autohide-scrollbar"
        >
            {messages.map((msg, index) => {
                const isSystemMessage = isSystemChatMessage(msg);
                const isPresence = msg.userId === "system:presence";
                const previous = messages[index - 1];
                const showDayDivider = !previous || !isSameLocalDate(
                    new Date(previous.timestamp),
                    new Date(msg.timestamp),
                );

                if (isPresence) {
                    return (
                        <div key={msg.id}>
                            {showDayDivider ? (
                                <div className="floating-chat-day-divider">
                                    <span>{formatDayDivider(msg.timestamp)}</span>
                                </div>
                            ) : null}
                            <div className="floating-chat-msg floating-chat-msg--presence">
                                <span className="floating-chat-msg-name">{msg.content}</span>
                                <span className="floating-chat-msg-time">
                                    {formatChatMessageTime(msg.timestamp)}
                                </span>
                            </div>
                        </div>
                    );
                }

                const isMine = msg.userId === clientId;
                const questionProgress = formatChatQuestionProgress(msg);
                const isCompact = shouldCompactMessage(messages, index);

                return (
                    <div key={msg.id}>
                        {showDayDivider ? (
                            <div className="floating-chat-day-divider">
                                <span>{formatDayDivider(msg.timestamp)}</span>
                            </div>
                        ) : null}
                        <div
                            className={[
                                "floating-chat-msg",
                                isMine ? "floating-chat-msg--mine" : "",
                                isSystemMessage ? "floating-chat-msg--system" : "",
                                isCompact ? "floating-chat-msg--compact" : "",
                            ].filter(Boolean).join(" ")}
                        >
                            <div className="floating-chat-msg-row">
                                {!isSystemMessage && !isCompact ? (
                                    <div className="floating-chat-msg-avatar">
                                    <PlayerProfileAvatar
                                        userId={msg.authUserId}
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
                                    <ChatMessageBody content={msg.content} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(ChatMessagesList);
