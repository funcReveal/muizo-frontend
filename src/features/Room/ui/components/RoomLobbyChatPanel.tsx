import React, { useEffect, useRef } from "react";
import {
  Box,
  Button,
  List as MUIList,
  ListItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { ChatMessage } from "../../model/types";
import {
  formatTime,
  normalizeDisplayText,
  SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX,
} from "./roomLobbyPanelUtils";

interface RoomLobbyChatPanelProps {
  messages: ChatMessage[];
  messageInput: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  latestSettlementRoundKey?: string | null;
  onOpenHistoryDrawer?: () => void;
  onOpenSettlementByRoundKey?: (roundKey: string) => void;
}

const RoomLobbyChatPanel: React.FC<RoomLobbyChatPanelProps> = ({
  messages,
  messageInput,
  onInputChange,
  onSend,
  latestSettlementRoundKey,
  onOpenHistoryDrawer,
  onOpenSettlementByRoundKey,
}) => {
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  return (
    <>
      <Box
        className="room-lobby-chat-log"
        ref={chatScrollRef}
        sx={{
          flex: 1,
          border: "1px solid rgba(245,158,11,0.14)",
          borderRadius: 2,
          background:
            "radial-gradient(260px 160px at 8% 0%, rgba(245,158,11,0.05), transparent 70%), linear-gradient(180deg, rgba(8,12,19,0.92), rgba(6,10,16,0.9))",
          p: 1.5,
          maxHeight: "150px",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {messages.length === 0 ? (
          <Typography variant="body2" className="text-slate-500" align="center">
            目前還沒有訊息，和房間成員打個招呼吧。
          </Typography>
        ) : (
          <MUIList dense disablePadding>
            {messages.map((msg) => {
              const isPresenceSystemMessage = msg.userId === "system:presence";
              const settlementRoundKey =
                msg.userId === "system:settlement-review" &&
                msg.id.startsWith(SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX)
                  ? msg.id.slice(SETTLEMENT_REVIEW_MESSAGE_ID_PREFIX.length)
                  : null;
              const isLatestSettlement =
                settlementRoundKey !== null &&
                latestSettlementRoundKey !== null &&
                settlementRoundKey === latestSettlementRoundKey;
              const canOpenSettlementReview = Boolean(
                settlementRoundKey &&
                  onOpenSettlementByRoundKey &&
                  isLatestSettlement,
              );
              const canOpenHistoryDrawer = Boolean(
                settlementRoundKey &&
                  !isLatestSettlement &&
                  onOpenHistoryDrawer,
              );

              if (isPresenceSystemMessage) {
                return (
                  <ListItem key={msg.id} sx={{ justifyContent: "center" }}>
                    <Box
                      sx={{
                        mx: "auto",
                        maxWidth: "100%",
                        borderRadius: 999,
                        px: 1.25,
                        py: 0.5,
                        border: "1px solid rgba(148,163,184,0.18)",
                        background: "rgba(15,23,42,0.58)",
                        color: "rgba(226,232,240,0.9)",
                        fontSize: 11,
                        lineHeight: 1.35,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{ color: "rgba(248,250,252,0.95)", fontWeight: 600 }}
                      >
                        {msg.content}
                      </Box>
                      <Box
                        component="span"
                        sx={{ ml: 1, color: "rgba(148,163,184,0.85)" }}
                      >
                        {formatTime(msg.timestamp)}
                      </Box>
                    </Box>
                  </ListItem>
                );
              }

              return (
                <ListItem key={msg.id}>
                  <Box
                    className="room-lobby-chat-message"
                    data-settlement={settlementRoundKey ? "true" : "false"}
                    data-archived={canOpenHistoryDrawer ? "true" : "false"}
                    sx={{
                      maxWidth: "100%",
                      borderRadius: 1,
                      px: 1,
                      py: 0.75,
                      border: "none",
                      borderLeft: "2px solid rgba(148,163,184,0.16)",
                      background: "transparent",
                      boxShadow: "none",
                      color: "white",
                    }}
                  >
                    <Stack direction="row" spacing={1}>
                      <Typography variant="caption" fontWeight={600}>
                        {normalizeDisplayText(
                          msg.username,
                          msg.userId.startsWith("system:") ? "對戰紀錄" : "玩家",
                        )}
                      </Typography>
                      <Typography variant="caption" color="rgba(255,255,255,0.7)">
                        {formatTime(msg.timestamp)}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content}
                    </Typography>
                    {canOpenSettlementReview && settlementRoundKey && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        sx={{ mt: 1, borderColor: "rgba(148,163,184,0.6)" }}
                        onClick={() =>
                          onOpenSettlementByRoundKey?.(settlementRoundKey)
                        }
                      >
                        查看上一局
                      </Button>
                    )}
                    {canOpenHistoryDrawer && (
                      <Button
                        size="small"
                        variant="text"
                        color="inherit"
                        sx={{ mt: 1, color: "rgba(191,219,254,0.92)" }}
                        onClick={() => onOpenHistoryDrawer?.()}
                      >
                        查看歷史
                      </Button>
                    )}
                  </Box>
                </ListItem>
              );
            })}
          </MUIList>
        )}
      </Box>

      <Stack direction="row" spacing={1} className="room-lobby-chat-input">
        <TextField
          autoComplete="off"
          fullWidth
          size="small"
          placeholder="輸入訊息，按 Enter 送出"
          value={messageInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button variant="contained" onClick={onSend}>
          送出
        </Button>
      </Stack>
    </>
  );
};

export default RoomLobbyChatPanel;
