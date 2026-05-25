import React from "react";
import { Badge, Switch } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import type { ChatMessage } from "@features/RoomSession";
import ChatMessagesList from "./ChatMessagesList";
import ChatComposer from "./ChatComposer";

interface DesktopChatWindowContentProps {
    open: boolean;
    unread: number;
    showDanmuToggle: boolean;
    danmuEnabled: boolean;
    onDanmuEnabledChange: (checked: boolean) => void;
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
}

const DesktopChatWindowContent: React.FC<DesktopChatWindowContentProps> = ({
    open,
    unread,
    showDanmuToggle,
    danmuEnabled,
    onDanmuEnabledChange,
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
}) => {
    return (
        <div
            className="floating-chat-root floating-chat-root--desktop"
            data-open={open ? "true" : "false"}
        >
            {!open && (
                <button
                    type="button"
                    className="floating-chat-fab"
                    onClick={onToggle}
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
                    <span className="floating-chat-key-hint" aria-hidden="true">
                        Enter
                    </span>
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
                        onClick={onToggle}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onToggle();
                            }
                        }}
                    >
                        <div className="floating-chat-header-title">
                            <ChatBubbleRoundedIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                            <span>聊天室</span>
                            <span className="floating-chat-key-hint" aria-hidden="true">
                                Esc
                            </span>
                        </div>

                        <div className="floating-chat-header-actions">
                            {showDanmuToggle ? (
                                <label
                                    className="floating-chat-danmu-toggle"
                                    onClick={(event) => event.stopPropagation()}
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onTouchStart={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => event.stopPropagation()}
                                >
                                    <span>彈幕</span>
                                    <Switch
                                        size="small"
                                        color="info"
                                        checked={danmuEnabled}
                                        onChange={(event) => onDanmuEnabledChange(event.target.checked)}
                                        onClick={(event) => event.stopPropagation()}
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onTouchStart={(event) => event.stopPropagation()}
                                    />
                                </label>
                            ) : null}

                            <span className="floating-chat-toggle-icon" aria-hidden="true">
                                <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />
                            </span>
                        </div>
                    </div>

                    <ChatMessagesList
                        messages={messages}
                        clientId={clientId}
                        setScrollNodeRef={setScrollNodeRef}
                    />

                    <ChatComposer
                        inputRef={inputRef}
                        messageInput={messageInput}
                        setMessageInput={setMessageInput}
                        handleSend={handleSend}
                        onRequestCloseWhenEmpty={onCloseWhenEmpty}
                        isChatCooldownActive={isChatCooldownActive}
                        chatCooldownLeft={chatCooldownLeft}
                    />
                </div>
            )}
        </div>
    );
};

export default React.memo(DesktopChatWindowContent);
