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
}: HubChatComposerProps) => {
  const canSend =
    isAuthenticated && isConnected && !isSending && messageInput.trim().length > 0;

  return (
    <div className="floating-chat-input-wrap">
      {statusText ? (
        <div className="floating-chat-cooldown-inline">{statusText}</div>
      ) : null}
      <div className="floating-chat-input-row">
        {!isAuthenticated ? (
          <button
            type="button"
            className="floating-chat-login-btn"
            onClick={onLoginRequired}
          >
            登入後在大廳發言
          </button>
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
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              className="floating-chat-send-btn"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="送出大廳訊息"
            >
              <SendRoundedIcon fontSize="small" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HubChatComposer;
