import React from "react";
import { Badge, SwipeableDrawer } from "@mui/material";
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
  heightVh: number;
  minHeightVh: number;
  maxHeightVh: number;
  onHeightChange: (nextHeight: number) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  danmuEnabled: boolean;
  onDanmuEnabledChange: (enabled: boolean) => void;
  messagesLength: number;
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
  heightVh,
  minHeightVh,
  maxHeightVh,
  onHeightChange,
  onDraggingChange,
  danmuEnabled,
  onDanmuEnabledChange,
  messagesLength,
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
            className="game-room-mobile-drawer-handle-wrap game-room-mobile-drawer-handle-wrap--draggable"
            aria-hidden="true"
          >
            <span className="game-room-mobile-drawer-handle-bar" />
            <span className="game-room-mobile-drawer-handle-direction">
              向下拖曳收合
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Match Chat
              </p>
              <p className="truncate text-sm font-semibold text-slate-100">房間聊天室</p>
            </div>
            <span className="game-room-mobile-drawer-gesture-hint game-room-mobile-drawer-gesture-hint--minimal">
              {messagesLength} 則訊息
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-3 pt-2">
          <GameRoomChatPanel
            variant="sheet"
            danmuEnabled={danmuEnabled}
            onDanmuEnabledChange={onDanmuEnabledChange}
            messagesLength={messagesLength}
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
