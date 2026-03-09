import React from "react";
import { Badge, IconButton, SwipeableDrawer } from "@mui/material";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import type { ChatMessage } from "../../../model/types";
import GameRoomChatPanel from "./GameRoomChatPanel";

interface GameRoomMobileChatPopoverProps {
  open: boolean;
  unreadCount: number;
  onOpen: () => void;
  onClose: () => void;
  showFab?: boolean;
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
  danmuEnabled,
  onDanmuEnabledChange,
  messagesLength,
  recentMessages,
  messageInput,
  onMessageChange,
  onSendMessage,
  chatScrollRef,
}) => {
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
        disableSwipeToOpen
        keepMounted
        ModalProps={{
          keepMounted: true,
          hideBackdrop: true,
          disableAutoFocus: true,
          disableEnforceFocus: true,
          disableRestoreFocus: true,
        }}
        PaperProps={{
          className: "game-room-mobile-chat-sheet",
        }}
      >
        <div className="game-room-mobile-chat-sheet-head">
          <div className="game-room-mobile-chat-handle" />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Match Chat
              </p>
              <p className="truncate text-sm font-semibold text-slate-100">房間聊天室</p>
            </div>
            <IconButton
              size="medium"
              aria-label="關閉聊天室"
              onClick={onClose}
              className="game-room-mobile-drawer-close game-room-mobile-drawer-close--icon !text-slate-100"
            >
              <CloseRoundedIcon fontSize="inherit" />
            </IconButton>
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
