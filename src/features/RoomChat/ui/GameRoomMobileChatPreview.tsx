import React, { useMemo } from "react";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import HowToVoteRoundedIcon from "@mui/icons-material/HowToVoteRounded";
import KeyboardDoubleArrowUpRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowUpRounded";
import type { ChatMessage } from "@features/RoomSession";
import { useRoomRealtime } from "@features/RoomSession";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";
import {
    formatChatMessageTime,
    formatChatQuestionProgress,
    getChatDisplayName,
} from "./chatMessagePresentation";

const MINI_CHAT_VISIBLE_COUNT = 2;

const isVisibleMiniChatMessage = (message: ChatMessage) => {
    if (message.userId === "system:presence") return true;
    return message.userId !== "system" && !message.userId.startsWith("system:");
};

export interface MobileChatPreviewNotice {
    id: string;
    title: string;
    detail?: string;
    tone?: "vote" | "system";
}

interface GameRoomMobileChatPreviewProps {
    onOpen: () => void;
    notice?: MobileChatPreviewNotice | null;
}

const GameRoomMobileChatPreview: React.FC<GameRoomMobileChatPreviewProps> = ({
    onOpen,
    notice = null,
}) => {
    const { messages } = useRoomRealtime();

    const recentMessages = useMemo(
        () => {
            const visibleMessages = messages.filter(isVisibleMiniChatMessage);
            const messageCount = notice
                ? Math.max(0, MINI_CHAT_VISIBLE_COUNT - 1)
                : MINI_CHAT_VISIBLE_COUNT;
            return visibleMessages.slice(-messageCount);
        },
        [messages, notice],
    );

    const latestMessageId =
        notice?.id ?? recentMessages[recentMessages.length - 1]?.id ?? null;

    return (
        <button
            type="button"
            className={`game-room-mobile-chat-preview${notice ? " game-room-mobile-chat-preview--has-notice" : ""}`}
            onClick={onOpen}
            aria-label="開啟聊天室"
        >
            <span
                className="game-room-mobile-card-expand-hint game-room-mobile-card-expand-hint--chat"
                aria-hidden="true"
            >
                <KeyboardDoubleArrowUpRoundedIcon fontSize="inherit" />
            </span>
            {!notice && recentMessages.length === 0 ? (
                <div className="game-room-mobile-chat-preview__empty">
                    <div className="game-room-mobile-chat-preview__empty-main">
                        <span className="game-room-mobile-chat-preview__empty-icon" aria-hidden="true">
                            <ChatBubbleRoundedIcon fontSize="inherit" />
                        </span>
                        <span className="game-room-mobile-chat-preview__empty-title">
                            尚無訊息
                        </span>
                    </div>

                    <span className="game-room-mobile-chat-preview__empty-subtitle">
                        點開開始聊天
                    </span>
                </div>
            ) : (
                <div
                    key={latestMessageId ?? "empty"}
                    className="game-room-mobile-chat-preview__list"
                >
                    {notice ? (
                        <article
                            key={notice.id}
                            className={`game-room-mobile-chat-preview__item game-room-mobile-chat-preview__item--notice game-room-mobile-chat-preview__item--${notice.tone ?? "system"}`}
                        >
                            <span className="game-room-mobile-chat-preview__notice-icon" aria-hidden="true">
                                <HowToVoteRoundedIcon fontSize="inherit" />
                            </span>
                            <div className="game-room-mobile-chat-preview__bubble">
                                <div className="game-room-mobile-chat-preview__meta">
                                    <strong>{notice.title}</strong>
                                </div>
                                {notice.detail ? <p>{notice.detail}</p> : null}
                            </div>
                        </article>
                    ) : null}
                    {recentMessages.map((message) => {
                        const questionProgress = formatChatQuestionProgress(message);
                        const isPresence = message.userId === "system:presence";

                        return (
                            <article
                                key={message.id}
                                className={`game-room-mobile-chat-preview__item${isPresence ? " game-room-mobile-chat-preview__item--system" : ""}`}
                            >
                                {isPresence ? (
                                    <span className="game-room-mobile-chat-preview__notice-icon" aria-hidden="true">
                                        <ChatBubbleRoundedIcon fontSize="inherit" />
                                    </span>
                                ) : (
                                    <PlayerAvatar
                                        username={message.username}
                                        clientId={message.userId}
                                        avatarUrl={message.avatarUrl ?? undefined}
                                        size={28}
                                        hideRankMark
                                        effectLevel="simple"
                                    />
                                )}

                                <div className="game-room-mobile-chat-preview__bubble">
                                    <div className="game-room-mobile-chat-preview__meta">
                                        <strong>{getChatDisplayName(message)}</strong>
                                        <span>{formatChatMessageTime(message.timestamp)}</span>
                                        {questionProgress ? (
                                            <span className="game-room-mobile-chat-preview__progress">
                                                {questionProgress}
                                            </span>
                                        ) : null}
                                    </div>

                                    <p>{message.content}</p>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </button>
    );
};

export default React.memo(GameRoomMobileChatPreview);
