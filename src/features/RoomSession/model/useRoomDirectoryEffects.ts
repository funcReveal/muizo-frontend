import { useEffect } from "react";
import type { RoomLookupResult } from "./types";

type UseRoomDirectoryEffectsParams = {
  pathname: string;
  inviteRoomId: string | null;
  fetchRooms: () => Promise<void>;
  fetchRoomById: (roomId: string) => Promise<RoomLookupResult>;
  fetchSitePresence: () => Promise<void>;
  setInviteNotFound: (value: boolean) => void;
  setStatusText: (value: string | null) => void;
};

const ROOM_DIRECTORY_REFRESH_MS = 15_000;

const routeNeedsRoomDirectory = (pathname: string) =>
  pathname.startsWith("/rooms") || pathname.startsWith("/invited");

export const useRoomDirectoryEffects = ({
  pathname,
  inviteRoomId,
  fetchRooms,
  fetchRoomById,
  fetchSitePresence,
  setInviteNotFound,
  setStatusText,
}: UseRoomDirectoryEffectsParams) => {
  useEffect(() => {
    if (!routeNeedsRoomDirectory(pathname)) return;

    void fetchRooms();

    const timer = window.setInterval(() => {
      void fetchRooms();
    }, ROOM_DIRECTORY_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [fetchRooms, pathname]);

  useEffect(() => {
    if (!routeNeedsRoomDirectory(pathname)) return;

    void fetchSitePresence();

    const timer = window.setInterval(() => {
      void fetchSitePresence();
    }, ROOM_DIRECTORY_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [fetchSitePresence, pathname]);

  useEffect(() => {
    if (!inviteRoomId) {
      setInviteNotFound(false);
      return;
    }

    void fetchRoomById(inviteRoomId).then((result) => {
      if (result.ok) {
        setInviteNotFound(false);
        return;
      }

      if (result.reason === "not_found") {
        setInviteNotFound(true);
        setStatusText("找不到邀請房間，請確認連結是否正確。");
        return;
      }

      setInviteNotFound(false);
      setStatusText(result.message);
    });
  }, [fetchRoomById, inviteRoomId, setInviteNotFound, setStatusText]);
};

export default useRoomDirectoryEffects;
