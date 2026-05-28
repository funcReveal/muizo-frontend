import React from "react";
import { Badge } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import type { ChatMessage } from "@features/RoomSession";
import ChatMessagesList from "./ChatMessagesList";
import ChatComposer from "./ChatComposer";

interface DesktopChatWindowContentProps {
    open: boolean;
    unread: number;
    title?: string;
    variant?: "room" | "hub";
    headerTabs?: React.ReactNode;
    onToggle: () => void;
    messages: ChatMessage[];
    clientId: string;
    setScrollNodeRef: (node: HTMLDivElement | null) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSend: () => void;
    onCloseWhenEmpty: () => void;
    isChatCooldownActive: boolean;
    chatCooldownLeft: number;
    children?: React.ReactNode;
    composer?: React.ReactNode;
}

const DesktopChatWindowContent: React.FC<DesktopChatWindowContentProps> = ({
    open,
    unread,
    title = "聊天室",
    variant = "room",
    headerTabs,
    onToggle,
    messages,
    clientId,
    setScrollNodeRef,
    inputRef,
    messageInput,
    setMessageInput,
    handleSend,
    onCloseWhenEmpty,
    isChatCooldownActive,
    chatCooldownLeft,
    children,
    composer,
}) => {
    return (
        <div
            className="floating-chat-root floating-chat-root--desktop"
            data-open={open ? "true" : "false"}
            data-variant={variant}
        >
            {!open && (
                <button
                    type="button"
                    className="floating-chat-fab"
                    onClick={onToggle}
                    aria-label={
                        unread > 0 ? `展開${title}，目前有 ${unread} 則未讀訊息` : `展開${title}`
                    }
                >
                    <Badge
                        color="error"
                        badgeContent={unread > 99 ? "99+" : unread}
                        invisible={unread <= 0}
                    >
                        <ChatBubbleRoundedIcon fontSize="small" />
                    </Badge>
                    <span className="floating-chat-fab-label">{title}</span>
                    <span className="floating-chat-key-hint" aria-hidden="true">
                        Enter
                    </span>
                    <span className="floating-chat-fab-toggle-icon" aria-hidden="true">
                        <ExpandLessRoundedIcon fontSize="small" />
                    </span>
                </button>
            )}

            {open && (
                <div className="floating-chat-window-shell">
                    <div
                        className="floating-chat-topbar"
                        role="button"
                        tabIndex={0}
                        aria-label={`收合${title}`}
                        onClick={onToggle}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onToggle();
                            }
                        }}
                    >
                        {headerTabs}
                    </div>
                    <div className="floating-chat-window" role="dialog" aria-label={title}>
                        {children ?? (
                            <ChatMessagesList
                                messages={messages}
                                clientId={clientId}
                                setScrollNodeRef={setScrollNodeRef}
                            />
                        )}

                        {composer ?? (
                            <ChatComposer
                                inputRef={inputRef}
                                messageInput={messageInput}
                                setMessageInput={setMessageInput}
                                handleSend={handleSend}
                                onRequestCloseWhenEmpty={onCloseWhenEmpty}
                                isChatCooldownActive={isChatCooldownActive}
                                chatCooldownLeft={chatCooldownLeft}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(DesktopChatWindowContent);
