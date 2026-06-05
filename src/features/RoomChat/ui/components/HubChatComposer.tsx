import SendRoundedIcon from "@mui/icons-material/SendRounded";
import type { RefObject } from "react";

type HubChatComposerProps = {
  isAuthenticated: boolean;
  isConnected: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSend: () => void;
  onLoginRequired: () => void;
  isSending: boolean;
  statusText: string | null;
  isChatCooldownActive: boolean;
  chatCooldownLeft: number;
};

const HubChatComposer = ({
  isAuthenticated,
  isConnected,
  inputRef,
  messageInput,
  setMessageInput,
  handleSend,
  onLoginRequired,
  isSending,
  statusText,
  isChatCooldownActive,
  chatCooldownLeft,
}: HubChatComposerProps) => {
  const canSend =
    isAuthenticated &&
    isConnected &&
    !isSending &&
    !isChatCooldownActive &&
    messageInput.trim().length > 0;
  const sendAndRefocus = () => {
    handleSend();
  };

  return (
    <div className="floating-chat-input-wrap floating-chat-input-wrap--hub">
      {statusText && !isChatCooldownActive ? (
        <div className="floating-chat-cooldown-inline">{statusText}</div>
      ) : null}
      <div className="floating-chat-input-row floating-chat-input-row--hub">
        {!isAuthenticated ? (
          <button
            type="button"
            className="floating-chat-login-btn"
            onClick={onLoginRequired}
          >
            登入後在大廳發言
          </button>
        ) : isChatCooldownActive ? (
          <div className="floating-chat-cooldown-inline">
            輸入過於頻繁，請於 <strong>{chatCooldownLeft}</strong> 秒後重試
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              className="floating-chat-input"
              value={messageInput}
              maxLength={360}
              disabled={!isConnected || isSending}
              placeholder={isConnected ? "輸入大廳訊息..." : "聊天室連線中..."}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendAndRefocus();
                }
              }}
            />
            <button
              type="button"
              className="floating-chat-send-btn"
              onClick={sendAndRefocus}
              disabled={!canSend}
              aria-label="送出大廳訊息"
            >
              <SendRoundedIcon fontSize="small" />
            </button>
          </>
        )}
        {isAuthenticated && isChatCooldownActive ? (
          <button
            type="button"
            className="floating-chat-send-btn"
            onClick={sendAndRefocus}
            disabled
            aria-label="送出大廳訊息"
          >
            <SendRoundedIcon fontSize="small" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default HubChatComposer;
