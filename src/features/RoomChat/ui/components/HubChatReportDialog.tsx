import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import { API_URL } from "@domain/room/constants";
import type { HubChatMessage } from "@features/RoomSession";

export default function HubChatReportDialog({
  message,
  onClose,
}: {
  message: HubChatMessage;
  onClose: () => void;
}) {
  const { authToken, refreshAuthToken } = useAuth();
  const [reason, setReason] = useState("inappropriate");
  const [description, setDescription] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) throw new Error("請登入後再送出檢舉。");
      const response = await fetch(
        `${API_URL}/api/hub-chat/messages/${encodeURIComponent(message.id)}/report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
            description: description.trim() || null,
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data)
        throw new Error(payload?.error?.message || "檢舉未送出，請稍後再試。");
    },
  });
  return (
    <Dialog
      open
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "#1c1915",
            border: "1px solid rgba(222,195,147,0.24)",
            color: "var(--mc-text)",
          },
        },
      }}
      sx={{
        zIndex: 1600,
        "& .MuiInputLabel-root.Mui-focused": { color: "#e7c384" },
        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
          { borderColor: "#d1ac6e" },
      }}
    >
      <DialogTitle>檢舉訊息</DialogTitle>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {mutation.isSuccess ? (
            <Alert severity="success">
              已收到檢舉，管理員會進行審核。檢舉不會自動將對方停權。
            </Alert>
          ) : (
            <>
              <p className="text-sm text-[var(--mc-text-muted)]">
                檢舉內容僅供管理員審查，對方不會看到你的身分。
              </p>
              <blockquote className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--mc-border)] p-3 text-sm">
                {message.content || "房間邀請"}
              </blockquote>
              <TextField
                select
                label="檢舉原因"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={mutation.isPending}
              >
                <MenuItem value="child_safety">
                  涉及未成年人安全／性招攬
                </MenuItem>
                <MenuItem value="inappropriate">不當或色情內容</MenuItem>
                <MenuItem value="harassment">騷擾、威脅或仇恨言論</MenuItem>
                <MenuItem value="spam">洗版、廣告或垃圾訊息</MenuItem>
                <MenuItem value="other">其他</MenuItem>
              </TextField>
              <TextField
                label="補充說明（選填）"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                multiline
                minRows={2}
                inputProps={{ maxLength: 500 }}
                disabled={mutation.isPending}
                helperText="請提供相關脈絡，避免填入不必要的個人資料。"
              />
              {mutation.isError && (
                <Alert severity="error">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "送出失敗，請重試。"}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {mutation.isSuccess ? "完成" : "取消"}
          </Button>
          {!mutation.isSuccess && (
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: "#dfbb78",
                color: "#211b11",
                "&:hover": { backgroundColor: "#efd299" },
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "送出中…" : "送出檢舉"}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
