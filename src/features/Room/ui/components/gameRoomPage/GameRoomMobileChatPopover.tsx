import React from "react";
import { Badge, SwipeableDrawer, Switch } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";

import type { ChatMessage } from "../../../model/types";
import GameRoomChatPanel from "./GameRoomChatPanel";
import useMobileDrawerDragDismiss from "./useMobileDrawerDragDismiss";

interface GameRoomMobileChatPopoverProps {
  open: boolean;
  unreadCount: number;
  onOpen: () => void;
  onClose: () => void;
  showFab?: boolean;
  chatAlertsEnabled: boolean;
  onChatAlertsEnabledChange: (enabled: boolean) => void;
  heightVh: number;
  minHeightVh: number;
  maxHeightVh: number;
  onHeightChange: (nextHeight: number) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  danmuEnabled: boolean;
  onDanmuEnabledChange: (enabled: boolean) => void;
  recentMessages: ChatMessage[];
  messageInput: string;
  onMessageChange?: (value: string) => void;
  onSendMessage?: () => void;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
}

const GameRoomMobileChatPopover: React.FC<GameRoomMobileChatPopoverProps> = ({
  open,
  unreadCount,
  onOpen,
  onClose,
  showFab = true,
  chatAlertsEnabled,
  onChatAlertsEnabledChange,
  heightVh,
  minHeightVh,
  maxHeightVh,
  onHeightChange,
  onDraggingChange,
  danmuEnabled,
  onDanmuEnabledChange,
  recentMessages,
  messageInput,
  onMessageChange,
  onSendMessage,
  chatScrollRef,
}) => {
  const mobileChatDragDismiss = useMobileDrawerDragDismiss({
    open,
    direction: "down",
    onDismiss: onClose,
    height: heightVh,
    minHeight: minHeightVh,
    maxHeight: maxHeightVh,
    onHeightChange,
    threshold: 34,
  });
  const chatDismissState = mobileChatDragDismiss.canDismiss
    ? "ready"
    : mobileChatDragDismiss.isDismissArmed
      ? "armed"
      : "idle";

  React.useEffect(() => {
    onDraggingChange?.(mobileChatDragDismiss.isDragging);
    return () => {
      onDraggingChange?.(false);
    };
  }, [mobileChatDragDismiss.isDragging, onDraggingChange]);

  return (
    <>
      {showFab && (
        <button
          type="button"
          className="game-room-mobile-chat-fab lg:hidden"
          onClick={onOpen}
          aria-label="開啟聊天室"
        >
          <Badge
            color="error"
            badgeContent={unreadCount > 99 ? "99+" : unreadCount}
            invisible={unreadCount <= 0}
          >
            <ChatBubbleRoundedIcon fontSize="small" />
          </Badge>
          <span>聊天室</span>
        </button>
      )}
      <SwipeableDrawer
        className="game-room-mobile-drawer-root lg:!hidden"
        anchor="bottom"
        open={open}
        onOpen={onOpen}
        onClose={onClose}
        disableSwipeToOpen={false}
        allowSwipeInChildren
        swipeAreaWidth={26}
        keepMounted
        ModalProps={{
          keepMounted: true,
          hideBackdrop: true,
          disableAutoFocus: true,
          disableEnforceFocus: true,
          disableRestoreFocus: true,
          disableScrollLock: true,
        }}
        PaperProps={{
          className: "game-room-mobile-chat-sheet",
          style: mobileChatDragDismiss.paperStyle,
        }}
      >
        <div
          className="game-room-mobile-chat-sheet-head"
          role="presentation"
          aria-label="向下拖曳收合聊天室"
          {...mobileChatDragDismiss.dragHandleProps}
        >
          <div
            className={`game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable game-room-mobile-drawer-handle-wrap--${chatDismissState}`}
            aria-hidden="true"
          >
            <span className="game-room-mobile-drawer-handle-bar" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Match Chat
              </p>
              <p className="truncate text-sm font-semibold text-slate-100">房間聊天室</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="game-room-mobile-chat-alert-toggle">
                <span>冒泡提醒</span>
                <Switch
                  size="small"
                  color="info"
                  checked={chatAlertsEnabled}
                  onChange={(event) =>
                    onChatAlertsEnabledChange(event.target.checked)
                  }
                />
              </label>
              <button
                type="button"
                className="game-room-mobile-drawer-close"
                onClick={onClose}
              >
                收合
              </button>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-3 pt-2">
          <GameRoomChatPanel
            variant="sheet"
            danmuEnabled={danmuEnabled}
            onDanmuEnabledChange={onDanmuEnabledChange}
            recentMessages={recentMessages}
            messageInput={messageInput}
            onMessageChange={onMessageChange}
            onSendMessage={onSendMessage}
            chatScrollRef={chatScrollRef}
          />
        </div>
      </SwipeableDrawer>
    </>
  );
};

export default GameRoomMobileChatPopover;
