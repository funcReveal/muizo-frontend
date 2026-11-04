import SendRoundedIcon from "@mui/icons-material/SendRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import { isImeComposingKeyboardEvent } from "../utils/ime";
import type { ReactNode, RefObject } from "react";

type HubChatComposerProps = {
  isAuthenticated: boolean;
  isConnected: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSend: () => void;
  canShareRoom: boolean;
  onShareRoom: () => void;
  shareCooldownLeft: number;
  onLoginRequired: () => void;
  isSending: boolean;
  statusText: string | null;
  isChatCooldownActive: boolean;
  chatCooldownLeft: number;
  shareAction?: ReactNode;
};

const HubChatComposer = ({
  isAuthenticated,
  isConnected,
  inputRef,
  messageInput,
  setMessageInput,
  handleSend,
  canShareRoom,
  onShareRoom,
  shareCooldownLeft,
  onLoginRequired,
  isSending,
  statusText,
  isChatCooldownActive,
  chatCooldownLeft,
  shareAction,
}: HubChatComposerProps) => {
  const isShareCooldownActive = shareCooldownLeft > 0;
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
            {canShareRoom ? (
              <button
                type="button"
                className="hub-chat-quick-action hub-chat-quick-action--invite"
                onClick={onShareRoom}
                disabled={!isConnected || isSending || isShareCooldownActive}
                aria-label={isShareCooldownActive
                  ? `房間分享冷卻中，${shareCooldownLeft} 秒後可再次分享`
                  : "分享目前房間到大廳聊天室"}
                title={isShareCooldownActive
                  ? `${shareCooldownLeft} 秒後可再次分享`
                  : "分享目前房間"}
              >
                <IosShareRoundedIcon fontSize="small" />
                <span>{isShareCooldownActive ? `${shareCooldownLeft} 秒` : "分享房間"}</span>
              </button>
            ) : null}
            <div className="floating-chat-compose-field">
            <input
              ref={inputRef}
              className="floating-chat-input"
              aria-label="大廳訊息"
              value={messageInput}
              maxLength={360}
              disabled={!isConnected || isSending}
              placeholder={isConnected ? "輸入大廳訊息..." : "聊天室連線中..."}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={(event) => {
                if (isImeComposingKeyboardEvent(event)) return;
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendAndRefocus();
                }
              }}
            />
            {shareAction}
            </div>
            <button
              type="button"
              className="floating-chat-send-btn hub-chat-send-action"
              onClick={sendAndRefocus}
              disabled={!canSend}
              aria-label="送出大廳訊息"
            >
              <SendRoundedIcon fontSize="small" />
              <span>送出</span>
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
