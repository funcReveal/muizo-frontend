import React from "react";
import {
  Badge,
  Box,
  Button,
  IconButton,
  List as MUIList,
  ListItem,
  Popover,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";

import type { RoomParticipant } from "@features/RoomSession";
import useAutoHideScrollbar from "@shared/hooks/useAutoHideScrollbar";
import RoomUiTooltip from "@shared/ui/RoomUiTooltip";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";
import { normalizeDisplayText } from "./roomLobbyDisplayUtils";

interface RoomLobbyParticipantsPanelProps {
  hostClientId?: string | null;
  participants: RoomParticipant[];
  selfClientId: string;
  selfAvatarUrl?: string | null;
  isHost: boolean;
  playerCountLabel: string;
  openSlotCount: number;
  canDecreasePlayers: boolean;
  canIncreasePlayers: boolean;
  avatarEffectLevel: "off" | "simple" | "full";
  actionAnchorEl: HTMLElement | null;
  actionTargetId: string | null;
  closeActionMenu: () => void;
  onOpenPlayerAction: (targetId: string, anchor: HTMLElement) => void;
  onTransferHost: (clientId: string) => void;
  onKickPlayer: (clientId: string, durationMs?: number | null) => void;
  onRemovePlayerSlot: () => void;
  onAddPlayerSlot: () => void;
}

interface RoomLobbyParticipantRowProps {
  participant: RoomParticipant;
  hostClientId?: string | null;
  selfClientId: string;
  selfAvatarUrl?: string | null;
  isHost: boolean;
  avatarEffectLevel: "off" | "simple" | "full";
  isActionOpen: boolean;
  actionAnchorEl: HTMLElement | null;
  closeActionMenu: () => void;
  onOpenPlayerAction: (targetId: string, anchor: HTMLElement) => void;
  onTransferHost: (clientId: string) => void;
  onKickPlayer: (clientId: string, durationMs?: number | null) => void;
}

const RoomLobbyParticipantRow = React.memo(function RoomLobbyParticipantRow({
  participant,
  hostClientId,
  selfClientId,
  selfAvatarUrl,
  isHost,
  avatarEffectLevel,
  isActionOpen,
  actionAnchorEl,
  closeActionMenu,
  onOpenPlayerAction,
  onTransferHost,
  onKickPlayer,
}: RoomLobbyParticipantRowProps) {
  const isSelf = participant.clientId === selfClientId;
  const isParticipantHost = participant.clientId === hostClientId;
  const showActions = isHost && !isSelf;
  const participantName = normalizeDisplayText(participant.username, "玩家");
  const participantAvatarUrl = isSelf
    ? selfAvatarUrl ?? participant.avatar_url ?? participant.avatarUrl ?? null
    : participant.avatar_url ?? participant.avatarUrl ?? null;

  return (
    <Box
      className={`room-lobby-player-row ${isSelf ? "is-self" : ""} ${participant.isOnline ? "is-online" : "is-offline"} ${showActions ? "has-actions" : ""}`}
    >
      <div className="room-lobby-player-row-main">
        <Badge
          variant="dot"
          color={participant.isOnline ? "success" : "default"}
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <PlayerAvatar
            className="room-lobby-player-avatar"
            username={participantName}
            clientId={participant.clientId}
            avatarUrl={participantAvatarUrl ?? undefined}
            size={64}
            effectLevel={avatarEffectLevel}
            isMe={isSelf}
          />
        </Badge>
        <div className="room-lobby-player-copy">
          <div className="room-lobby-player-title-row">
            <strong>{participantName}</strong>
          </div>
          <div className="room-lobby-player-tags">
            {isParticipantHost ? (
              <span className="room-lobby-player-tag is-host">房主</span>
            ) : (
              <span className="room-lobby-player-tag is-player">玩家</span>
            )}
            {!participant.isOnline && (
              <span className="room-lobby-player-tag is-muted">暫離</span>
            )}
          </div>
        </div>
      </div>
      <div className="room-lobby-player-side">
        <span
          className={`room-lobby-player-status ${participant.isOnline ? "is-online" : "is-offline"}`}
        >
          {participant.isOnline ? "在線" : "離線"}
        </span>
        {showActions && (
          <IconButton
            size="small"
            color="inherit"
            className="room-lobby-player-action"
            aria-label="玩家操作"
            title="玩家操作"
            sx={{
              width: 30,
              height: 30,
              borderRadius: "999px",
              "&:hover": {
                backgroundColor: "rgba(148,163,184,0.12)",
              },
            }}
            onClick={(event) => {
              event.stopPropagation();
              onOpenPlayerAction(participant.clientId, event.currentTarget);
            }}
          >
            <MoreHorizRoundedIcon fontSize="small" />
            <span className="room-lobby-toolbar-floating-label" aria-hidden="true">
              玩家操作
            </span>
          </IconButton>
        )}
      </div>
      {showActions && (
        <Popover
          open={isActionOpen}
          anchorEl={actionAnchorEl}
          onClose={closeActionMenu}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <MUIList dense>
            <ListItem>
              <Button
                size="small"
                variant="text"
                color="info"
                disabled={!participant.isOnline}
                onClick={() => {
                  onTransferHost(participant.clientId);
                  closeActionMenu();
                }}
              >
                轉移房主
              </Button>
            </ListItem>
            <ListItem>
              <Button
                size="small"
                variant="text"
                color="warning"
                onClick={() => {
                  onKickPlayer(participant.clientId);
                  closeActionMenu();
                }}
              >
                踢出(5分鐘)
              </Button>
            </ListItem>
            <ListItem>
              <Button
                size="small"
                variant="text"
                color="warning"
                onClick={() => {
                  onKickPlayer(participant.clientId, null);
                  closeActionMenu();
                }}
              >
                踢出(永久封鎖)
              </Button>
            </ListItem>
          </MUIList>
        </Popover>
      )}
    </Box>
  );
}, (prevProps, nextProps) => (
  prevProps.participant === nextProps.participant &&
  prevProps.hostClientId === nextProps.hostClientId &&
  prevProps.selfClientId === nextProps.selfClientId &&
  prevProps.selfAvatarUrl === nextProps.selfAvatarUrl &&
  prevProps.isHost === nextProps.isHost &&
  prevProps.avatarEffectLevel === nextProps.avatarEffectLevel &&
  prevProps.isActionOpen === nextProps.isActionOpen &&
  prevProps.actionAnchorEl === nextProps.actionAnchorEl
));

const RoomLobbyVacantSlotRow = React.memo(function RoomLobbyVacantSlotRow({
  showRemoveSlot,
  onRemovePlayerSlot,
}: {
  showRemoveSlot: boolean;
  onRemovePlayerSlot: () => void;
}) {
  return (
    <div className="room-lobby-player-row room-lobby-player-row--vacant">
      <div className="room-lobby-player-row-main">
        <span className="room-lobby-player-avatar room-lobby-player-avatar--vacant">
          +
        </span>
        <div className="room-lobby-player-copy">
          <div className="room-lobby-player-title-row">
            <strong>可加入空位</strong>
          </div>
          <div className="room-lobby-player-tags">
            <span className="room-lobby-player-tag is-muted">等待玩家加入</span>
          </div>
        </div>
      </div>
      <div className="room-lobby-player-side room-lobby-player-side--vacant">
        {showRemoveSlot ? (
          <RoomUiTooltip title="移除此空位">
            <IconButton
              size="small"
              color="inherit"
              className="room-lobby-player-action room-lobby-player-action--slot"
              aria-label="移除空位"
              onClick={onRemovePlayerSlot}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </RoomUiTooltip>
        ) : (
          <span className="room-lobby-player-side-label">空位</span>
        )}
      </div>
    </div>
  );
});

const RoomLobbyAddSlotRow = React.memo(function RoomLobbyAddSlotRow({
  onAddPlayerSlot,
}: {
  onAddPlayerSlot: () => void;
}) {
  return (
    <button
      type="button"
      className="room-lobby-player-row room-lobby-player-row--vacant room-lobby-player-row--add-slot"
      onClick={onAddPlayerSlot}
    >
      <div className="room-lobby-player-row-main room-lobby-player-row-main--add-slot">
        <span className="room-lobby-player-avatar room-lobby-player-avatar--vacant room-lobby-player-avatar--add">
          <AddRoundedIcon fontSize="small" />
        </span>
        <div className="room-lobby-player-copy room-lobby-player-copy--add-slot">
          <div className="room-lobby-player-title-row">
            <strong>新增空位</strong>
          </div>
        </div>
      </div>
    </button>
  );
});

const RoomLobbyParticipantsPanel = React.memo(function RoomLobbyParticipantsPanel({
  hostClientId,
  participants,
  selfClientId,
  selfAvatarUrl,
  isHost,
  avatarEffectLevel,
  playerCountLabel,
  openSlotCount,
  canDecreasePlayers,
  canIncreasePlayers,
  actionAnchorEl,
  actionTargetId,
  closeActionMenu,
  onOpenPlayerAction,
  onTransferHost,
  onKickPlayer,
  onRemovePlayerSlot,
  onAddPlayerSlot,
}: RoomLobbyParticipantsPanelProps) {
  const playerListRef = useAutoHideScrollbar<HTMLDivElement>();

  return (
    <Box className="room-lobby-participants">
      <div className="room-lobby-panel-head room-lobby-panel-head--players">
        <div className="room-lobby-panel-title room-lobby-panel-title--players">
          <GroupsRoundedIcon fontSize="small" />
          <Typography variant="subtitle2" className="text-slate-100">
            玩家
          </Typography>
        </div>
        <div className="room-lobby-panel-counter">{playerCountLabel}</div>
      </div>

      <div
        ref={playerListRef}
        className="room-lobby-player-list mq-autohide-scrollbar"
      >
        <div
          className={`room-lobby-player-list-inner ${participants.length === 0 ? "room-lobby-player-list-inner--vacant" : ""}`}
        >
          {participants.length === 0 && (
            <div className="room-lobby-roster-empty room-lobby-roster-empty--dashed">
              <Typography variant="body2" className="text-slate-400">
                目前尚無玩家
              </Typography>
            </div>
          )}
          {participants.map((participant) => (
            <RoomLobbyParticipantRow
              key={participant.clientId}
              participant={participant}
              hostClientId={hostClientId}
              selfClientId={selfClientId}
              selfAvatarUrl={selfAvatarUrl}
              isHost={isHost}
              avatarEffectLevel={avatarEffectLevel}
              isActionOpen={
                Boolean(actionAnchorEl) && actionTargetId === participant.clientId
              }
              actionAnchorEl={actionAnchorEl}
              closeActionMenu={closeActionMenu}
              onOpenPlayerAction={onOpenPlayerAction}
              onTransferHost={onTransferHost}
              onKickPlayer={onKickPlayer}
            />
          ))}
          {Array.from({ length: openSlotCount }).map((_, index) => {
            const isLastOpenSlot = index === openSlotCount - 1;
            const showRemoveSlot = canDecreasePlayers && isLastOpenSlot;
            return (
              <RoomLobbyVacantSlotRow
                key={`vacant-seat-${index}`}
                showRemoveSlot={showRemoveSlot}
                onRemovePlayerSlot={onRemovePlayerSlot}
              />
            );
          })}
          {canIncreasePlayers && (
            <RoomLobbyAddSlotRow onAddPlayerSlot={onAddPlayerSlot} />
          )}
        </div>
      </div>
    </Box>
  );
});

export default RoomLobbyParticipantsPanel;
