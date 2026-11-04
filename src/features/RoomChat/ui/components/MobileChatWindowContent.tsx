import React, { useCallback } from "react";
import { Switch } from "@mui/material";
import MobileChatFloatingWindow from "./MobileChatFloatingWindow";
import type { ChatMessage } from "@features/RoomSession";
import ChatMessagesList from "./ChatMessagesList";
import ChatComposer from "./ChatComposer";

interface MobileChatWindowContentProps {
    open: boolean;
    unread: number;
    title?: string;
    variant?: "room" | "hub";
    headerTabs?: React.ReactNode;
    bodyActive: boolean;
    showDanmuToggle: boolean;
    danmuEnabled: boolean;
    onDanmuEnabledChange: (checked: boolean) => void;
    onOpen: () => void;
    onClose: () => void;
    messages: ChatMessage[];
    clientId: string;
    setScrollNodeRef: (node: HTMLDivElement | null) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSend: () => void;
    isChatCooldownActive: boolean;
    chatCooldownLeft: number;
    suppressTrigger?: boolean;
    children?: React.ReactNode;
    composer?: React.ReactNode;
}

const MobileChatWindowContent: React.FC<MobileChatWindowContentProps> = ({
    open,
    unread,
    title = "聊天室",
    variant = "room",
    headerTabs,
    bodyActive,
    showDanmuToggle,
    danmuEnabled,
    onDanmuEnabledChange,
    onOpen,
    onClose,
    messages,
    clientId,
    setScrollNodeRef,
    inputRef,
    messageInput,
    setMessageInput,
    handleSend,
    isChatCooldownActive,
    chatCooldownLeft,
    suppressTrigger = false,
    children,
    composer,
}) => {
    const stopInteractivePropagation = useCallback((event: React.SyntheticEvent) => {
        event.stopPropagation();
    }, []);

    const handleDanmuSwitchChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            event.stopPropagation();
            onDanmuEnabledChange(event.target.checked);
        },
        [onDanmuEnabledChange],
    );

    return (
        <MobileChatFloatingWindow open={open} unread={unread} title={title} variant={variant} suppressTrigger={suppressTrigger} onOpen={onOpen} onClose={onClose}>
                <div className="game-room-mobile-drawer-head game-room-mobile-drawer-head--chat">
                    <div className="game-room-mobile-chat-drawer-headline">
                        <div className="game-room-mobile-chat-drawer-title-group">
                            <span className="game-room-mobile-chat-drawer-title">{title}</span>
                        </div>

                        {showDanmuToggle && (
                            <div className="game-room-mobile-chat-drawer-actions">
                                <div
                                    className="game-room-mobile-chat-alert-toggle"
                                    onClick={stopInteractivePropagation}
                                    onMouseDown={stopInteractivePropagation}
                                    onPointerDown={stopInteractivePropagation}
                                    onTouchStart={stopInteractivePropagation}
                                    onKeyDown={stopInteractivePropagation}
                                >
                                    <span>彈幕</span>
                                    <Switch
                                        size="small"
                                        color="info"
                                        checked={danmuEnabled}
                                        onChange={handleDanmuSwitchChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {headerTabs}
                </div>

                {bodyActive ? (
                    <div className="game-room-mobile-chat-drawer-body">
                        <div className="game-room-mobile-chat-drawer-panel">
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
                                    isChatCooldownActive={isChatCooldownActive}
                                    chatCooldownLeft={chatCooldownLeft}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="game-room-mobile-chat-drawer-body" aria-hidden="true" />
                )}
        </MobileChatFloatingWindow>
    );
};

export default React.memo(MobileChatWindowContent);
