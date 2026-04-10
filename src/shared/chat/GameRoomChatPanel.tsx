import React from "react";
import { Button, Switch } from "@mui/material";

import type { ChatMessage } from "../../features/Room/model/types";
import { useChatInput } from "./ChatInputContext";
import {
  formatChatMessageFullTime,
  formatChatMessageTime,
  formatChatQuestionProgress,
  getChatDisplayName,
} from "./chatMessagePresentation";

interface GameRoomChatPanelProps {
  danmuEnabled: boolean;
  onDanmuEnabledChange: (enabled: boolean) => void;
  recentMessages: ChatMessage[];
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  variant?: "sidebar" | "sheet";
}

const GameRoomChatPanel: React.FC<GameRoomChatPanelProps> = ({
  danmuEnabled,
  onDanmuEnabledChange,
  recentMessages,
  chatScrollRef,
  variant = "sidebar",
}) => {
  const {
    messageInput,
    setMessageInput,
    handleSendMessage,
    isChatCooldownActive,
    chatCooldownLeft,
    currentClientId,
  } = useChatInput();
  const isSheet = variant === "sheet";

  const handleDanmuChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onDanmuEnabledChange(event.target.checked),
    [onDanmuEnabledChange],
  );
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isChatCooldownActive) return;
      setMessageInput(e.target.value);
    },
    [isChatCooldownActive, setMessageInput],
  );
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (isChatCooldownActive) return;
        handleSendMessage();
      }
    },
    [handleSendMessage, isChatCooldownActive],
  );
  const renderedMessages = React.useMemo(() => {
    return recentMessages.map((msg) => {
      return {
        ...msg,
        shortTime: formatChatMessageTime(msg.timestamp),
        fullTime: formatChatMessageFullTime(msg.timestamp),
        questionProgress: formatChatQuestionProgress(msg),
        displayName: getChatDisplayName(msg),
        isMine: msg.userId === currentClientId,
      };
    });
  }, [currentClientId, recentMessages]);

  return (
    <div
      className={`game-room-chat flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 ${isSheet ? "game-room-chat--sheet h-full" : "min-h-[240px]"
        }`}
    >
      <div className="game-room-chat-header flex items-center justify-between text-sm font-semibold text-slate-200">
        <div className="flex items-center gap-2">
          <span>聊天室</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">彈幕</span>
          <Switch
            size="small"
            color="info"
            checked={danmuEnabled}
            onChange={handleDanmuChange}
          />
          <span className="text-[11px] text-slate-500">{danmuEnabled ? "開啟" : "關閉"}</span>
        </div>
      </div>
      <div className="game-room-chat-divider h-px" />
      <div
        ref={chatScrollRef}
        className={`game-room-chat-list flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1 ${isSheet ? "" : "md:max-h-80"
          }`}
      >
        {renderedMessages.length === 0 ? (
          <div className="game-room-chat-empty-state">
            <div className="room-chat-empty-note room-chat-empty-note--game">
              <span className="room-chat-empty-meta">
                <span className="room-chat-empty-dot" aria-hidden="true" />
                聊天室
              </span>
              <p className="room-chat-empty-copy">
                目前還沒有新訊息，先和房間成員打聲招呼吧。
              </p>
            </div>
          </div>
        ) : (
          renderedMessages.map((msg) => {
            const isPresenceSystemMessage = msg.userId === "system:presence";
            if (isPresenceSystemMessage) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="max-w-full rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <span className="font-medium text-slate-200">{msg.content}</span>
                    <span className="ml-2 text-slate-500">
                      {msg.shortTime}
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="flex">
                <div className="game-room-chat-bubble game-room-chat-message max-w-full px-2.5 py-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-300">
                    <span
                      className={`font-semibold ${msg.isMine
                        ? "text-cyan-100"
                        : "text-amber-100/90"
                      }`}
                    >
                      {msg.displayName}
                    </span>
                    <span className="text-slate-500">{msg.fullTime}</span>
                    {msg.questionProgress ? (
                      <span className="rounded-full border border-slate-600/55 bg-slate-900/65 px-1.5 py-0.5 font-semibold tabular-nums text-slate-300">
                        {msg.questionProgress}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap wrap-anywhere leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-2">
        {isChatCooldownActive ? (
          <div className="flex-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-2 text-center text-xs font-medium text-amber-300/95">
            輸入過於頻繁，請於 <strong>{chatCooldownLeft}</strong> 秒後重試
          </div>
        ) : (
          <input
            className="game-room-chat-input-field flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            placeholder="輸入訊息..."
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
        )}
        <Button
          variant="contained"
          color="info"
          size="small"
          className="game-room-chat-send"
          onClick={handleSendMessage}
          disabled={isChatCooldownActive || !messageInput.trim()}
        >
          送出
        </Button>
      </div>
    </div>
  );
};

export default React.memo(GameRoomChatPanel);
