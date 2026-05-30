import React, { useCallback, useMemo } from "react";
import { Badge, Drawer, Switch } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import type { ChatMessage } from "@features/RoomSession";
import ChatMessagesList from "./ChatMessagesList";
import ChatComposer from "./ChatComposer";

const GAME_ROOM_DRAWER_MODAL_PROPS = {
    hideBackdrop: true,
    keepMounted: false,
    disableAutoFocus: true,
    disableEnforceFocus: true,
    disableRestoreFocus: true,
    disableScrollLock: true,
} as const;

const CHAT_DRAWER_TRANSITION_DURATION = {
    enter: 160,
    exit: 120,
} as const;

interface MobileChatDrawerContentProps {
    open: boolean;
    unread: number;
    title?: string;
    variant?: "room" | "hub";
    headerTabs?: React.ReactNode;
    bodyActive: boolean;
    showDanmuToggle: boolean;
    danmuEnabled: boolean;
    onDanmuEnabledChange: (checked: boolean) => void;
    mobileChatDismissState: "idle" | "armed" | "ready";
    dragHandleProps: React.HTMLAttributes<HTMLElement>;
    paperStyle: React.CSSProperties;
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

const MobileChatDrawerContent: React.FC<MobileChatDrawerContentProps> = ({
    open,
    unread,
    title = "聊天室",
    variant = "room",
    headerTabs,
    bodyActive,
    showDanmuToggle,
    danmuEnabled,
    onDanmuEnabledChange,
    mobileChatDismissState,
    dragHandleProps,
    paperStyle,
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
    const paperProps = useMemo(
        () => ({
            className: `game-room-mobile-chat-drawer ${open ? "game-room-mobile-chat-drawer--open" : "game-room-mobile-chat-drawer--closed"
                }`,
            style: paperStyle,
            "data-variant": variant,
        }),
        [open, paperStyle, variant],
    );

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
        <>
            {!suppressTrigger && !open && (
                <button
                    type="button"
                    className="game-room-mobile-chat-drawer-trigger"
                    onClick={onOpen}
                    aria-label={
                        unread > 0 ? `開啟${title}，目前有 ${unread} 則未讀訊息` : `開啟${title}`
                    }
                >
                    <span className="game-room-mobile-chat-drawer-trigger__label">{title}</span>
                    <div className="game-room-mobile-chat-drawer-trigger__actions">
                        <Badge
                            color="error"
                            badgeContent={unread > 99 ? "99+" : unread}
                            invisible={unread <= 0}
                        >
                            <ChatBubbleRoundedIcon fontSize="small" />
                        </Badge>
                        <span
                            className="game-room-mobile-chat-drawer-trigger__toggle"
                            aria-hidden="true"
                        >
                            <ExpandLessRoundedIcon fontSize="small" />
                        </span>
                    </div>
                </button>
            )}

            <Drawer
                className="game-room-mobile-drawer-root game-room-mobile-drawer-root--chat lg:!hidden"
                anchor="bottom"
                open={open}
                onClose={onClose}
                transitionDuration={CHAT_DRAWER_TRANSITION_DURATION}
                ModalProps={GAME_ROOM_DRAWER_MODAL_PROPS}
                PaperProps={paperProps}
            >
                {headerTabs}

                <div
                    className="game-room-mobile-drawer-head game-room-mobile-drawer-head--chat"
                    role="presentation"
                    aria-label="Drag down to collapse chat"
                >
                    <div
                        className={`game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable game-room-mobile-drawer-handle-wrap--${mobileChatDismissState}`}
                        aria-hidden="true"
                        {...dragHandleProps}
                    >
                        <span className="game-room-mobile-drawer-handle-bar" />
                    </div>

                    <div className="game-room-mobile-chat-drawer-headline">
                        <div className="game-room-mobile-chat-drawer-title-group">
                            <span className="game-room-mobile-chat-drawer-title">{title}</span>
                        </div>

                        <div className="game-room-mobile-chat-drawer-actions">
                            {showDanmuToggle ? (
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
                                        onClick={stopInteractivePropagation}
                                        onMouseDown={stopInteractivePropagation}
                                        onPointerDown={stopInteractivePropagation}
                                        onTouchStart={stopInteractivePropagation}
                                    />
                                </div>
                            ) : null}

                            <button
                                type="button"
                                className="game-room-mobile-drawer-close game-room-mobile-drawer-close--icon"
                                onClick={onClose}
                                aria-label="收合聊天室"
                            >
                                <ExpandMoreRoundedIcon fontSize="inherit" />
                            </button>
                        </div>
                    </div>
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
            </Drawer>
        </>
    );
};

export default React.memo(MobileChatDrawerContent);
