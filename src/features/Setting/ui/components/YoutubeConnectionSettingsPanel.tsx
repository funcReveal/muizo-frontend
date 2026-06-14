import React, { useMemo, useState } from "react";
import LinkRounded from "@mui/icons-material/LinkRounded";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { Button, Chip } from "@mui/material";

import { useAuth } from "@shared/auth/AuthContext";
import ConfirmDialog from "@shared/ui/ConfirmDialog";
import SettingsSectionCard from "./SettingsSectionCard";

type YoutubeConnectionSettingsPanelProps = {
  sectionId: string;
};

const isGoogleYouTubeConnected = (
  authUser: ReturnType<typeof useAuth>["authUser"],
) => {
  if (!authUser) return false;
  if (authUser.youtube_connected) return true;
  if (authUser.google_linked_at) return true;
  if (authUser.connected_providers?.includes("google")) return true;
  return authUser.provider === "google" && Boolean(authUser.provider_user_id);
};

const YoutubeConnectionSettingsPanel: React.FC<
  YoutubeConnectionSettingsPanelProps
> = ({ sectionId }) => {
  const {
    authUser,
    authLoading,
    linkGoogleYouTube,
    unlinkGoogleYouTube,
  } = useAuth();
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const connected = isGoogleYouTubeConnected(authUser);
  const providerLabel = useMemo(() => {
    if (!authUser) return "尚未登入";
    if (connected) return "已連結";
    return "未連結";
  }, [authUser, connected]);

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const ok = await unlinkGoogleYouTube();
      if (ok) setUnlinkConfirmOpen(false);
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <SettingsSectionCard
      id={sectionId}
      icon={<YouTubeIcon fontSize="small" />}
      title="YouTube 授權"
      description="Email 登入是 Muizo 帳號，YouTube 授權只用來讀取播放清單。"
      actions={
        <Chip
          size="small"
          label={providerLabel}
          variant="outlined"
          sx={{
            color: connected ? "#d1fae5" : "rgba(226,232,240,0.82)",
            border: connected
              ? "1px solid rgba(16,185,129,0.28)"
              : "1px solid rgba(148,163,184,0.26)",
            background: connected
              ? "rgba(16,185,129,0.08)"
              : "rgba(148,163,184,0.08)",
          }}
        />
      }
    >
      <div className="rounded-2xl border border-slate-700/60 bg-slate-950/45 p-4">
        <div className="grid gap-3 text-sm leading-6 text-slate-300">
          <p>
            貼上公開 YouTube 播放清單連結不需要 Google 授權。只有當你要從自己的
            YouTube 帳號直接選取播放清單時，才需要連結 Google / YouTube。
          </p>
          <p>
            連結後仍會保留目前 Muizo 帳號，不會把 Email 登入切換成 Google 登入。
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={connected ? "outlined" : "contained"}
            startIcon={<LinkRounded />}
            disabled={!authUser || authLoading}
            onClick={linkGoogleYouTube}
            sx={{
              borderRadius: "999px",
              fontWeight: 800,
              textTransform: "none",
              ...(connected
                ? {
                    color: "rgba(226,232,240,0.92)",
                    borderColor: "rgba(148,163,184,0.3)",
                  }
                : {
                    color: "oklch(14% 0.02 205)",
                    background:
                      "linear-gradient(180deg, oklch(80% 0.135 162), oklch(77% 0.145 162))",
                  }),
            }}
          >
            {connected ? "重新授權 Google / YouTube" : "連結 Google / YouTube"}
          </Button>

          {connected ? (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LinkOffRounded />}
              disabled={authLoading || unlinking}
              onClick={() => setUnlinkConfirmOpen(true)}
              sx={{
                borderRadius: "999px",
                borderColor: "rgba(248,113,113,0.32)",
                color: "rgba(254,202,202,0.94)",
                fontWeight: 800,
                textTransform: "none",
              }}
            >
              解除 YouTube 授權
            </Button>
          ) : null}
        </div>

        {!authUser ? (
          <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-xs leading-5 text-amber-100">
            請先登入 Muizo 帳號，再連結 YouTube 授權。
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={unlinkConfirmOpen}
        title="解除 YouTube 授權？"
        description="解除後仍可貼上公開播放清單連結，但無法直接讀取你的 YouTube 帳號播放清單。"
        confirmLabel={unlinking ? "解除中..." : "確認解除"}
        cancelLabel="取消"
        onCancel={() => {
          if (!unlinking) setUnlinkConfirmOpen(false);
        }}
        onConfirm={() => {
          if (!unlinking) void handleUnlink();
        }}
      />
    </SettingsSectionCard>
  );
};

export default YoutubeConnectionSettingsPanel;
