import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ComponentProps, FocusEvent } from "react";
import { Popper, useMediaQuery } from "@mui/material";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { useQuery } from "@tanstack/react-query";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";
import { fetchPublicPlayer, playerProfilePath, playerQueryKey, PlayerProfileError } from "../model/publicPlayerApi";
import "./playerProfile.css";

type Props = ComponentProps<typeof PlayerAvatar> & { userId?: string | null };

export default function PlayerProfileAvatar({ userId, ...avatarProps }: Props) {
  if (!userId || userId.startsWith("system")) return <PlayerAvatar {...avatarProps} />;
  return <InteractiveProfileAvatar userId={userId} {...avatarProps} />;
}

function InteractiveProfileAvatar({ userId, ...avatarProps }: Omit<Props, "userId"> & { userId: string }) {
  const [anchor, setAnchor] = useState<HTMLAnchorElement | null>(null);
  const hoverCapable = useMediaQuery("(hover: hover) and (pointer: fine)");
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocus = useRef(false);
  const cardId = useId();
  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  useEffect(() => {
    if (!anchor) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        clearTimers();
        suppressFocus.current = true;
        triggerRef.current?.focus({ preventScroll: true });
        suppressFocus.current = false;
        setAnchor(null);
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !cardRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        clearTimers(); setAnchor(null);
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [anchor, clearTimers]);

  const query = useQuery({
    queryKey: playerQueryKey(userId ?? ""),
    queryFn: ({ signal }) => fetchPublicPlayer(userId!, signal),
    enabled: Boolean(anchor && userId),
    staleTime: 60_000,
    retry: (attempt, error) => !(error instanceof PlayerProfileError && error.status === 404) && attempt < 1,
  });
  const profile = query.data;
  const unavailable = query.error instanceof PlayerProfileError && query.error.status === 404;
  const href = playerProfilePath(profile?.id ?? userId);
  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setAnchor(null), 180);
  };
  const handleBlur = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && (cardRef.current?.contains(event.relatedTarget) || triggerRef.current?.contains(event.relatedTarget))) return;
    scheduleClose();
  };

  return <>
    <a
      ref={triggerRef}
      className="player-profile-trigger"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`查看${avatarProps.username?.trim() || "玩家"}的個人頁（另開分頁）`}
      aria-describedby={anchor ? cardId : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        clearTimers();
        const target = event.currentTarget;
        openTimer.current = setTimeout(() => setAnchor(target), 300);
      }}
      onPointerLeave={scheduleClose}
      onFocus={(event) => {
        if (suppressFocus.current || !event.currentTarget.matches(":focus-visible")) return;
        clearTimers(); setAnchor(event.currentTarget);
      }}
      onBlur={handleBlur}
      onClick={(event) => {
        event.stopPropagation();
        if (!hoverCapable && !anchor && event.detail > 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault(); clearTimers(); setAnchor(event.currentTarget);
        }
      }}
    ><PlayerAvatar {...avatarProps} title="" /></a>
    <Popper open={Boolean(anchor)} anchorEl={anchor} placement="top-start" modifiers={[{ name: "offset", options: { offset: [0, 10] } }]} sx={{ zIndex: 1600 }}>
      <div ref={cardRef} id={cardId} role="group" aria-label="玩家簡介" className="player-hovercard"
        onPointerEnter={clearTimers} onPointerLeave={scheduleClose} onFocus={clearTimers} onBlur={handleBlur}>
        <div className="player-hovercard__identity">
          <PlayerAvatar username={profile?.displayName ?? avatarProps.username} avatarUrl={profile?.avatarUrl ?? avatarProps.avatarUrl} clientId={userId} size={44} hideRankMark />
          <div><strong>{profile?.displayName ?? avatarProps.username ?? "玩家"}</strong><span>Muizo 玩家</span></div>
        </div>
        {query.isPending ? <p className="player-hovercard__muted" role="status">正在載入個人資料…</p>
          : query.isError ? <div className="player-hovercard__muted" role={unavailable ? "status" : "alert"}><p>{unavailable ? "這位玩家的個人頁目前無法查看。" : query.error.message}</p>{!unavailable ? <button type="button" onClick={() => void query.refetch()}>重新載入</button> : null}</div>
          : profile ? <>
            <p className="player-hovercard__bio">{profile.bio || "還沒寫自我介紹，先從音樂認識彼此。"}</p>
            <dl className="player-hovercard__stats">
              <div><dt>遊玩場次</dt><dd>{profile.totalMatches.toLocaleString()}</dd></div>
              <div><dt>最高連擊</dt><dd>{profile.totalMatches > 0 ? profile.bestCombo.toLocaleString() : <span aria-label="尚無連擊紀錄">—</span>}</dd></div>
              <div><dt>公開題庫</dt><dd>{profile.publicCollectionCount.toLocaleString()}</dd></div>
            </dl>
          </> : null}
        {!unavailable ? <a href={href} target="_blank" rel="noopener noreferrer" className="player-hovercard__link">查看個人頁 <OpenInNewRounded fontSize="inherit" /></a> : null}
      </div>
    </Popper>
  </>;
}
