import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  useMediaQuery,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";

import { USERNAME_MAX } from "@domain/room/constants";
import { recordDbActionEvent } from "@shared/analytics/actionEvents";
import { useAuth } from "@shared/auth/AuthContext";

type IdentityProfileDialogProps = {
  needsNicknameConfirm: boolean;
  isProfileEditorOpen: boolean;
  nicknameDraft: string;
  setNicknameDraft: (value: string) => void;
  confirmNickname: () => Promise<boolean> | boolean | void;
  closeProfileEditor: () => void;
};

const IdentityProfileDialog: React.FC<IdentityProfileDialogProps> = ({
  needsNicknameConfirm,
  isProfileEditorOpen,
  nicknameDraft,
  setNicknameDraft,
  confirmNickname,
  closeProfileEditor,
}) => {
  const { authToken, clientId, displayUsername, refreshAuthToken } = useAuth();
  const open = needsNicknameConfirm || isProfileEditorOpen;
  const trackedOpenRef = React.useRef(false);
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm"),
  );

  const recordProfileRenameEvent = React.useCallback(
    (
      eventName:
        | "career.profile.rename.opened"
        | "career.profile.rename.saved",
      profileAction: "rename_open" | "rename_save",
    ) => {
      if (!authToken) return;
      void recordDbActionEvent({
        eventName,
        authToken,
        clientId,
        username: displayUsername,
        refreshAuthToken,
        metadata: {
          source: "career",
          profileAction,
        },
      }).catch((error) => {
        console.error("[profile] failed to record rename event", error);
      });
    },
    [authToken, clientId, displayUsername, refreshAuthToken],
  );

  React.useEffect(() => {
    if (!open) {
      trackedOpenRef.current = false;
      return;
    }
    if (!isProfileEditorOpen || trackedOpenRef.current) return;
    trackedOpenRef.current = true;
    recordProfileRenameEvent("career.profile.rename.opened", "rename_open");
  }, [isProfileEditorOpen, open, recordProfileRenameEvent]);

  const handleClose = () => {
    if (!needsNicknameConfirm) {
      closeProfileEditor();
    }
  };

  const handleConfirmNickname = () => {
    void Promise.resolve(confirmNickname()).then((saved) => {
      if (isProfileEditorOpen && saved !== false) {
        recordProfileRenameEvent("career.profile.rename.saved", "rename_save");
      }
    });
  };

  const content = (
    <>
      <DialogTitle>
        {needsNicknameConfirm ? "請設定暱稱" : "編輯個人資料"}
      </DialogTitle>
      <DialogContent>
        <p className="mb-2 text-sm text-[var(--mc-text-muted)]">
          {needsNicknameConfirm
            ? "你已使用 Google 登入，請設定顯示暱稱。之後可在個人資料中修改。"
            : "請更新顯示暱稱。"}
        </p>
        <input
          className="w-full rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--mc-accent)] focus:ring-1 focus:ring-[var(--mc-glow)]"
          placeholder="請輸入顯示暱稱"
          value={nicknameDraft}
          onChange={(e) =>
            setNicknameDraft(e.target.value.slice(0, USERNAME_MAX))
          }
          maxLength={USERNAME_MAX}
        />
      </DialogContent>
      <DialogActions>
        {!needsNicknameConfirm && (
          <Button onClick={closeProfileEditor} variant="outlined">
            取消
          </Button>
        )}
        <Button onClick={handleConfirmNickname} variant="contained">
          確認
        </Button>
      </DialogActions>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        anchor="bottom"
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            border: "1px solid var(--mc-border)",
            background:
              "linear-gradient(180deg, rgba(20,17,13,0.98), rgba(8,7,5,0.99))",
            color: "var(--mc-text)",
          },
        }}
      >
        <div className="mx-auto w-full max-w-md px-2 pb-[env(safe-area-inset-bottom)]">
          {content}
        </div>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          border: "1px solid var(--mc-border)",
          background:
            "linear-gradient(180deg, rgba(20,17,13,0.98), rgba(8,7,5,0.99))",
          color: "var(--mc-text)",
          boxShadow:
            "0 28px 90px rgba(0,0,0,0.58), 0 0 0 1px rgba(255,255,255,0.04)",
        },
      }}
    >
      {content}
    </Dialog>
  );
};

export default IdentityProfileDialog;
