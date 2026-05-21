import React from "react";

import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";

import type {
  FeedbackPlayer,
  MobileScoreFeedbackEvent,
} from "../../model/mobileScoreFeedback";

type MobileScoreFeedbackOverlayProps = {
  event: MobileScoreFeedbackEvent | null;
  anchorStyle?: React.CSSProperties;
  placement?: "mobile-fixed" | "mobile-embedded" | "media-embedded";
};

const canRenderFeedbackAvatar = (player: FeedbackPlayer | null) =>
  Boolean(
    player &&
      player.clientId.trim().length > 0 &&
      player.username.trim().length > 0 &&
      Number.isFinite(player.rank) &&
      Number.isFinite(player.score),
  );

function getComboTier(combo: number | null | undefined): string {
  if (!combo || combo < 2) return "normal";
  if (combo < 5) return "hot";
  if (combo < 10) return "great";
  return "legend";
}

function formatCombo(combo: number | null | undefined): string | null {
  if (!combo || combo <= 0) return null;
  return `x${combo}`;
}

function formatScoreGap(gap: number): string {
  return `差 ${gap.toLocaleString("en-US")}`;
}

function formatLeadScore(leadScore: number): string {
  return `領先 ${leadScore.toLocaleString("en-US")}`;
}

const MobileScoreFeedbackOverlay: React.FC<MobileScoreFeedbackOverlayProps> =
  React.memo(({ event, anchorStyle, placement = "mobile-fixed" }) => {
    if (!event) return null;

    const isUnanswered = event.type === "unanswered";
    const isScore = event.type === "score";
    const isPassed = event.type === "passed";
    const isOvertaken = event.type === "overtaken";
    const rankEvent = isPassed || isOvertaken ? event : null;
    const canShowRankAvatars =
      rankEvent !== null &&
      canRenderFeedbackAvatar(rankEvent.me) &&
      canRenderFeedbackAvatar(rankEvent.target);
    const combo = rankEvent?.me?.combo ?? (isScore ? event.me?.combo : null);
    const comboText = formatCombo(combo);
    const comboTier = getComboTier(combo);
    const eventKey = isUnanswered
      ? `${event.scope}-unanswered-${event.questionKey}`
      : rankEvent
        ? `${rankEvent.scope}-${rankEvent.type}-${rankEvent.me.score}-${rankEvent.oldRank}-${rankEvent.newRank}-${rankEvent.target?.clientId ?? "text"}`
        : isScore
          ? `${event.scope}-score-${event.me.score}-${event.scoreGain}-${event.nextTargetGap ?? "nogap"}-${event.nextTargetName ?? "noname"}`
          : `${event.scope}-${event.type}`;
    const cardClassName = [
      "game-room-mobile-score-feedback-card",
      `game-room-mobile-score-feedback-card--${event.type}`,
      rankEvent
        ? "game-room-mobile-score-feedback-card--rank-change"
        : "game-room-mobile-score-feedback-card--bubble",
      rankEvent
        ? `game-room-mobile-score-feedback-card--rank-${event.type}`
        : "",
      `game-room-mobile-score-feedback-card--combo-${comboTier}`,
    ]
      .filter(Boolean)
      .join(" ");
    const isDesktop = placement === "media-embedded";
    const shouldRenderDecorativeEffects = isDesktop;
    const targetSize = isDesktop ? 52 : 34;
    const meSize = isDesktop ? 60 : 38;

    return (
      <div
        className={`game-room-mobile-score-feedback-layer game-room-score-feedback-layer--${placement}`}
        style={anchorStyle}
        aria-live="polite"
      >
        <div key={eventKey} className={cardClassName}>
          {shouldRenderDecorativeEffects ? (
            <>
              <span
                className="game-room-mobile-score-feedback-shockwave"
                aria-hidden="true"
              />
              <span
                className="game-room-mobile-score-feedback-glint"
                aria-hidden="true"
              />
              <span
                className="game-room-mobile-score-feedback-speed-lines"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </span>
              <span
                className="game-room-mobile-score-feedback-sparks"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            </>
          ) : null}
          {isScore ? (
            <>
              <div className="game-room-mobile-score-feedback-gain">
                <span>
                  {event.scoreGain >= 0 ? "+" : ""}
                  {event.scoreGain.toLocaleString("en-US")}
                </span>
                {comboText ? (
                  <span className="game-room-mobile-score-feedback-gain-combo">
                    {comboText}
                  </span>
                ) : null}
              </div>
              {event.me.rank === 1 && event.leadScore !== null ? (
                <div className="game-room-mobile-score-feedback-score-lines game-room-mobile-score-feedback-score-lines--leader">
                  <div className="game-room-mobile-score-feedback-gap">
                    {formatLeadScore(event.leadScore)}
                    {"\u5206"}
                  </div>
                  {event.runnerUp ? (
                    <div className="game-room-mobile-score-feedback-title">
                      第二名 {event.runnerUp.username}
                    </div>
                  ) : null}
                </div>
              ) : event.nextTargetGap !== null &&
                event.nextTargetName?.trim() ? (
                <div className="game-room-mobile-score-feedback-score-lines">
                  <div className="game-room-mobile-score-feedback-gap">
                    {formatScoreGap(event.nextTargetGap)}
                    {"\u5206"}
                  </div>
                  <div className="game-room-mobile-score-feedback-title">
                    超越 {event.nextTargetName.trim()}
                  </div>
                </div>
              ) : event.me.rank === 1 ? (
                <div className="game-room-mobile-score-feedback-score-lines game-room-mobile-score-feedback-score-lines--leader">
                  <div className="game-room-mobile-score-feedback-gap">
                    暫居第 1 名
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {isPassed ? (
            <>
              {canShowRankAvatars && rankEvent?.target ? (
                <div
                  className="game-room-mobile-score-feedback-swap game-room-mobile-score-feedback-swap--passed"
                  aria-hidden="true"
                >
                  <PlayerAvatar
                    username={rankEvent.target.username}
                    clientId={rankEvent.target.clientId}
                    avatarUrl={rankEvent.target.avatarUrl}
                    size={targetSize}
                    hideRankMark
                    effectLevel="off"
                    className="game-room-mobile-score-feedback-swap-avatar game-room-mobile-score-feedback-swap-avatar--target"
                  />
                  <span
                    className="game-room-mobile-score-feedback-swap-arrow"
                    aria-hidden="true"
                  >
                    &rsaquo;
                  </span>
                  <PlayerAvatar
                    username={rankEvent.me.username}
                    clientId={rankEvent.me.clientId}
                    avatarUrl={rankEvent.me.avatarUrl}
                    size={meSize}
                    isMe
                    hideRankMark
                    effectLevel="off"
                    className="game-room-mobile-score-feedback-swap-avatar game-room-mobile-score-feedback-swap-avatar--me"
                  />
                </div>
              ) : null}
              {rankEvent?.target ? (
                <div className="game-room-mobile-score-feedback-title">
                  超越 {rankEvent.target.username}
                </div>
              ) : null}
              <div className="game-room-mobile-score-feedback-detail game-room-mobile-score-feedback-detail--rank-passed">
                #{rankEvent!.oldRank} &rarr; #{rankEvent!.newRank}
              </div>
            </>
          ) : null}

          {isOvertaken ? (
            <>
              {canShowRankAvatars && rankEvent?.target ? (
                <div
                  className="game-room-mobile-score-feedback-swap game-room-mobile-score-feedback-swap--overtaken"
                  aria-hidden="true"
                >
                  <PlayerAvatar
                    username={rankEvent.me.username}
                    clientId={rankEvent.me.clientId}
                    avatarUrl={rankEvent.me.avatarUrl}
                    size={targetSize}
                    isMe
                    hideRankMark
                    effectLevel="off"
                    className="game-room-mobile-score-feedback-swap-avatar game-room-mobile-score-feedback-swap-avatar--me"
                  />
                  <span
                    className="game-room-mobile-score-feedback-swap-arrow game-room-mobile-score-feedback-swap-arrow--danger"
                    aria-hidden="true"
                  >
                    &lsaquo;
                  </span>
                  <PlayerAvatar
                    username={rankEvent.target.username}
                    clientId={rankEvent.target.clientId}
                    avatarUrl={rankEvent.target.avatarUrl}
                    size={meSize}
                    hideRankMark
                    effectLevel="off"
                    className="game-room-mobile-score-feedback-swap-avatar game-room-mobile-score-feedback-swap-avatar--target"
                  />
                </div>
              ) : null}
              {rankEvent?.target ? (
                <div className="game-room-mobile-score-feedback-title game-room-mobile-score-feedback-title--danger">
                  {rankEvent.target.username} 超越你
                </div>
              ) : null}
              <div className="game-room-mobile-score-feedback-detail game-room-mobile-score-feedback-detail--danger">
                #{rankEvent!.oldRank} &rarr; #{rankEvent!.newRank}
              </div>
            </>
          ) : null}

          {isUnanswered ? (
            <>
              <div className="game-room-mobile-score-feedback-gain game-room-mobile-score-feedback-gain--muted">
                未作答
              </div>
              <div className="game-room-mobile-score-feedback-detail">
                本題沒有送出答案
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  });

export default MobileScoreFeedbackOverlay;
