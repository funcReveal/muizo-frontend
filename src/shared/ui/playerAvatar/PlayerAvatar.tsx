import React from "react";

import {
  buildAvatarMonogram,
  resolveAvatarDecoration,
  resolvePlayerAvatarPalette,
  type AvatarEffectLevel,
} from "./playerAvatarTheme";

type PlayerAvatarProps = {
  username?: string | null;
  clientId?: string | null;
  avatarUrl?: string | null;
  size?: number;
  rank?: number | null;
  combo?: number | null;
  isMe?: boolean;
  effectLevel?: AvatarEffectLevel;
  stateTone?: "neutral" | "correct" | "wrong" | "unanswered";
  hideRankMark?: boolean;
  className?: string;
  title?: string;
  loading?: "eager" | "lazy";
};

const PlayerAvatar: React.FC<PlayerAvatarProps> = React.memo(
  ({
    username,
    clientId,
    avatarUrl,
    size = 40,
    rank,
    combo = 0,
    isMe = false,
    effectLevel = "simple",
    stateTone = "neutral",
    hideRankMark = false,
    className = "",
    title,
    loading = "lazy",
  }) => {
    const displayName = username?.trim() || "玩家";
    const monogram = React.useMemo(
      () => buildAvatarMonogram(displayName, "P"),
      [displayName],
    );
    const palette = React.useMemo(
      () => resolvePlayerAvatarPalette(clientId, displayName),
      [clientId, displayName],
    );
    const decoration = React.useMemo(
      () =>
        resolveAvatarDecoration({
          rank,
          combo,
          effectLevel,
          stateTone,
        }),
      [combo, effectLevel, rank, stateTone],
    );
    const effectiveSize = Math.max(20, Math.round(size));
    const isCompact = effectiveSize <= 32;
    const monogramFontSize = Math.max(
      isCompact ? 9 : 11,
      Math.round(effectiveSize * (monogram.length >= 2 ? 0.34 : 0.44)),
    );

    const style = {
      width: `${effectiveSize}px`,
      height: `${effectiveSize}px`,
      ["--player-avatar-bg-from" as const]: palette.from,
      ["--player-avatar-bg-to" as const]: palette.to,
      ["--player-avatar-accent" as const]: palette.accent,
      ["--player-avatar-outline" as const]: palette.outline,
      ["--player-avatar-text" as const]: palette.text,
      ["--player-avatar-shadow" as const]: palette.shadow,
      ["--player-avatar-frame" as const]: decoration.frame,
      ["--player-avatar-frame-glow" as const]: decoration.glow,
      ["--player-avatar-badge" as const]: decoration.badge,
      ["--player-avatar-tone-outline" as const]:
        decoration.toneOutline ?? "transparent",
      ["--player-avatar-tone-fill" as const]:
        decoration.toneFill ?? "transparent",
      ["--player-avatar-combo" as const]: decoration.comboAccent,
      ["--player-avatar-combo-glow" as const]: decoration.comboGlow,
    } as React.CSSProperties;

    return (
      <span
        className={[
          "player-avatar",
          `player-avatar--${effectLevel}`,
          avatarUrl ? "player-avatar--image" : "player-avatar--text",
          isMe ? "player-avatar--self" : "",
          combo >= 3 ? "player-avatar--combo-ready" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={style}
        title={title ?? displayName}
        aria-label={title ?? displayName}
      >
        <span className="player-avatar__frame" aria-hidden="true" />
        <span className="player-avatar__tone" aria-hidden="true" />
        <span className="player-avatar__core" aria-hidden="true">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="player-avatar__image"
              loading={loading}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              className="player-avatar__monogram"
              style={{ fontSize: `${monogramFontSize}px` }}
            >
              {monogram}
            </span>
          )}
        </span>
        {!hideRankMark && rank && rank > 0 && rank <= 3 ? (
          <span className="player-avatar__rank-mark" aria-hidden="true">
            {rank}
          </span>
        ) : null}
        {effectLevel === "full" && combo >= 3 ? (
          <span className="player-avatar__combo-mark" aria-hidden="true" />
        ) : null}
      </span>
    );
  },
);

export default PlayerAvatar;
