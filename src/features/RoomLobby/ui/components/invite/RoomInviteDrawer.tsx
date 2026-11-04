import {
  Divider,
  Drawer,
  IconButton,
  Switch,
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";

type RoomInviteDrawerProps = {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  isHost: boolean;
  allowParticipantInvite: boolean;
  invitePermissionSaving: boolean;
  roomCode?: string | null;
  formattedRoomCode?: string | null;
  inviteLink: string;
  roomCodeCopied: boolean;
  inviteLinkCopied: boolean;
  actionRunning: boolean;
  canUseNativeShare: boolean;
  onToggleInvitePermission: (nextValue: boolean) => void;
  onCopyRoomCode: () => void;
  onCopyInviteLink: () => void;
  onNativeShare: () => void;
  canShareToLobby: boolean;
  onShareToLobby: () => void;
};

const RoomInviteDrawer = ({
  open,
  onClose,
  isMobile,
  isHost,
  allowParticipantInvite,
  invitePermissionSaving,
  roomCode,
  formattedRoomCode,
  inviteLink,
  roomCodeCopied,
  inviteLinkCopied,
  actionRunning,
  canUseNativeShare,
  onToggleInvitePermission,
  onCopyRoomCode,
  onCopyInviteLink,
  onNativeShare,
  canShareToLobby,
  onShareToLobby,
}: RoomInviteDrawerProps) => (
  <Drawer
    anchor={isMobile ? "bottom" : "right"}
    open={open}
    onClose={onClose}
    sx={{ zIndex: 1500 }}
    PaperProps={{
      className: "room-lobby-share-modal room-lobby-share-drawer",
      sx: {
        width: {
          xs: "100%",
          sm: isMobile ? "100%" : 430,
        },
        maxWidth: "100vw",
        borderRadius: isMobile ? "24px 24px 0 0" : "24px 0 0 24px",
        borderLeft: isMobile ? "none" : "1px solid rgba(148,163,184,0.18)",
        borderTop: isMobile ? "1px solid rgba(148,163,184,0.18)" : "none",
      },
    }}
  >
    <div className="room-lobby-share-modal__title">
      <span>邀請玩家</span>
      <IconButton
        type="button"
        onClick={onClose}
        size="small"
        sx={{
          ml: "auto",
          color: "rgba(226,232,240,0.9)",
          backgroundColor: "transparent",
          "&:hover": {
            backgroundColor: "transparent",
            color: "#ffffff",
          },
        }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </div>

    <div className="room-lobby-share-modal__content">
      <section className="room-lobby-share-modal__section room-lobby-share-modal__section--toggle">
        <div className="room-lobby-share-modal__section-copy">
          <strong>允許其他玩家透過代碼邀請</strong>
        </div>
        <Switch
          checked={allowParticipantInvite}
          onChange={(_, checked) => onToggleInvitePermission(checked)}
          disabled={!isHost || invitePermissionSaving}
        />
      </section>

      {!isHost && !allowParticipantInvite ? (
        <div className="room-lobby-share-modal__locked-note">
          房主尚未開啟玩家邀請權限
        </div>
      ) : null}

      <Divider className="!border-white/10" />

      <section className="room-lobby-share-list" aria-label="複製邀請資訊">
        <button
          type="button"
          className={`room-lobby-share-row ${roomCodeCopied ? "is-copied" : ""}`}
          onClick={onCopyRoomCode}
          disabled={!roomCode}
        >
          <span className="room-lobby-share-row__icon" aria-hidden="true">
            {roomCodeCopied ? (
              <span className="room-lobby-share-row__copied-tip">已複製</span>
            ) : null}
            {roomCodeCopied ? (
              <CheckRoundedIcon fontSize="small" />
            ) : (
              <ContentCopyRoundedIcon fontSize="small" />
            )}
          </span>
          <span className="room-lobby-share-row__value">
            {formattedRoomCode ?? "--"}
          </span>
        </button>

        <button
          type="button"
          className={`room-lobby-share-row room-lobby-share-row--link ${
            inviteLinkCopied ? "is-copied" : ""
          }`}
          onClick={onCopyInviteLink}
          disabled={!inviteLink}
        >
          <span className="room-lobby-share-row__icon" aria-hidden="true">
            {inviteLinkCopied ? (
              <span className="room-lobby-share-row__copied-tip">已複製</span>
            ) : null}
            {inviteLinkCopied ? (
              <CheckRoundedIcon fontSize="small" />
            ) : (
              <ContentCopyRoundedIcon fontSize="small" />
            )}
          </span>
          <span className="room-lobby-share-row__value room-lobby-share-row__value--link">
            {inviteLink || "未提供"}
          </span>
        </button>
      </section>

      <Divider className="!border-white/10" />

      <section className="room-lobby-share-actions-grid" aria-label="分享到外部">
        <button
          type="button"
          className="room-lobby-share-action-card"
          onClick={onShareToLobby}
          disabled={!canShareToLobby || actionRunning}
          title={canShareToLobby ? "發送房間邀請卡到大廳聊天室" : "私人房間不能分享到大廳"}
        >
          <span className="room-lobby-share-action-card__icon" aria-hidden="true"><ForumRoundedIcon fontSize="small" /></span>
          <span className="room-lobby-share-action-card__copy"><strong>發送到大廳聊天室</strong></span>
        </button>
        <button
          type="button"
          className={`room-lobby-share-action-card ${
            actionRunning ? "is-pending" : ""
          }`}
          onClick={onNativeShare}
          disabled={!canUseNativeShare || actionRunning}
        >
          <span className="room-lobby-share-action-card__icon" aria-hidden="true">
            <IosShareRoundedIcon fontSize="small" />
          </span>
          <span className="room-lobby-share-action-card__copy">
            <strong>分享連結到外部</strong>
          </span>
        </button>
      </section>
    </div>

  </Drawer>
);

export default RoomInviteDrawer;
