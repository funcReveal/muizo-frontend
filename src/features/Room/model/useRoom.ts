import { useContext } from "react";

import { useAuth } from "../../../shared/auth/AuthContext";
import { useRoomCollections } from "./RoomCollectionsContext";
import { useRoomCreate } from "./RoomCreateContext";
import { useRoomGame } from "./RoomGameContext";
import { useRoomPlaylist } from "./RoomPlaylistContext";
import { RoomContext } from "./RoomContext";
import { useRoomSession } from "./RoomSessionContext";

export const useRoom = () => {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  // Sub-context hooks — these will throw if called outside RoomProvider,
  // which matches the existing contract.
  const auth = useAuth();
  const collections = useRoomCollections();
  const playlist = useRoomPlaylist();
  const session = useRoomSession();
  const create = useRoomCreate();
  const game = useRoomGame();

  return {
    ...auth,
    ...collections,
    ...playlist,
    ...session,
    ...create,
    ...game,
    // Spread the base ctx last so any remaining fields not yet in sub-contexts
    // (e.g. RoomUiContext, RoomRealtimeContext fields that live only in ctx)
    // are still accessible, and so duplicate keys from ctx win over sub-contexts
    // for the transition period.
    ...ctx,
  };
};
