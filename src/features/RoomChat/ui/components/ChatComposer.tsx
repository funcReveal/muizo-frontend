import React from "react";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { isImeComposingKeyboardEvent } from "../utils/ime";

interface ChatComposerProps {
    inputRef: React.RefObject<HTMLInputElement | null>;
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSend: () => void;
    onRequestCloseWhenEmpty?: () => void;
    isChatCooldownActive: boolean;
    chatCooldownLeft: number;
    shareAction?: React.ReactNode;
}

const ChatComposer: React.FC<ChatComposerProps> = ({
    inputRef,
    messageInput,
    setMessageInput,
    handleSend,
    onRequestCloseWhenEmpty,
    isChatCooldownActive,
    chatCooldownLeft,
    shareAction,
}) => {
    return (
        <div className="floating-chat-input-wrap floating-chat-input-wrap--room">
            <div className="floating-chat-input-row floating-chat-input-row--room">
                {isChatCooldownActive ? (
                    <div className="floating-chat-cooldown-inline">
                        輸入過於頻繁，請於 <strong>{chatCooldownLeft}</strong> 秒後重試
                    </div>
                ) : (
                    <div className="floating-chat-compose-field">
                    <input
                        ref={inputRef}
                        className="floating-chat-input"
                        aria-label="房間訊息"
                        placeholder="輸入房間訊息..."
                        value={messageInput}
                        maxLength={500}
                        onChange={(event) => {
                            setMessageInput(event.target.value);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                if (isImeComposingKeyboardEvent(event)) return;
                                event.preventDefault();
                                if (!messageInput.trim() && onRequestCloseWhenEmpty) {
                                    event.stopPropagation();
                                    onRequestCloseWhenEmpty();
                                    return;
                                }
                                handleSend();
                                return;
                            }

                            if (event.key === "Escape" && !messageInput.trim() && onRequestCloseWhenEmpty) {
                                event.preventDefault();
                                event.stopPropagation();
                                onRequestCloseWhenEmpty();
                            }
                        }}
                        autoComplete="off"
                    />
                    {shareAction}
                    </div>
                )}

                <button
                    type="button"
                    className="floating-chat-send-btn room-chat-send-action"
                    onClick={handleSend}
                    aria-label="送出訊息"
                    disabled={isChatCooldownActive || !messageInput.trim()}
                >
                    <SendRoundedIcon fontSize="small" />
                    <span>送出</span>
                </button>
            </div>
        </div>
    );
};

export default React.memo(ChatComposer);
