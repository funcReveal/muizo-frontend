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
}

const ChatComposer: React.FC<ChatComposerProps> = ({
    inputRef,
    messageInput,
    setMessageInput,
    handleSend,
    onRequestCloseWhenEmpty,
    isChatCooldownActive,
    chatCooldownLeft,
}) => {
    return (
        <div className="floating-chat-input-wrap">
            <div className="floating-chat-input-row">
                {isChatCooldownActive ? (
                    <div className="floating-chat-cooldown-inline">
                        輸入過於頻繁，請於 <strong>{chatCooldownLeft}</strong> 秒後重試
                    </div>
                ) : (
                    <input
                        ref={inputRef}
                        className="floating-chat-input"
                        placeholder="輸入訊息"
                        value={messageInput}
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
                )}

                <button
                    type="button"
                    className="floating-chat-send-btn"
                    onClick={handleSend}
                    aria-label="送出訊息"
                    disabled={isChatCooldownActive || !messageInput.trim()}
                >
                    <SendRoundedIcon fontSize="small" />
                </button>
            </div>
        </div>
    );
};

export default React.memo(ChatComposer);
