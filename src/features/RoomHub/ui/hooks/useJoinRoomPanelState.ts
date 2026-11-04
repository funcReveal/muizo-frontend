import { useEffect, useState } from "react";

import type { RoomSummary } from "@domain/room/types";
import { normalizeRoomCodeInput } from "../roomsHubViewModels";

export type JoinPasswordDialogState = {
  roomId: string;
  roomName: string;
} | null;

export type JoinConfirmDialogState = {
  roomCode: string;
  roomName: string;
  hasPassword: boolean;
  playlistTitle: string;
  playerCount: number;
  maxPlayers?: number | null;
  questionCount?: number;
  currentQuestionNo?: number | null;
  completedQuestionCount?: number;
  totalQuestionCount?: number;
} | null;

const JOIN_VIEW_STORAGE_KEY = "rooms_hub_join_view";

export const useJoinRoomPanelState = () => {
  const [passwordDialog, setPasswordDialog] =
    useState<JoinPasswordDialogState>(null);
  const [joinConfirmDialog, setJoinConfirmDialog] =
    useState<JoinConfirmDialogState>(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [directRoomIdInput, setDirectRoomIdInput] = useState("");
  const [directJoinLoading, setDirectJoinLoading] = useState(false);
  const [directJoinPreviewRoom, setDirectJoinPreviewRoom] =
    useState<RoomSummary | null>(null);
  const [directJoinError, setDirectJoinError] = useState<string | null>(null);
  const [directJoinNeedsPassword, setDirectJoinNeedsPassword] = useState(false);
  const [joinRoomsView, setJoinRoomsView] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    const stored = window.localStorage.getItem(JOIN_VIEW_STORAGE_KEY);
    return stored === "list" ? "list" : "grid";
  });
  const [joinPasswordFilter, setJoinPasswordFilter] = useState<
    "all" | "no_password" | "password_required"
  >("all");
  const [joinStatusFilter, setJoinStatusFilter] = useState<
    "all" | "waiting" | "playing"
  >("all");
  const [joinSortMode, setJoinSortMode] = useState<"latest" | "players_desc">(
    "latest",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(JOIN_VIEW_STORAGE_KEY, joinRoomsView);
  }, [joinRoomsView]);

  const normalizedDirectRoomCode = normalizeRoomCodeInput(directRoomIdInput);
  const resolvedDirectJoinRoom = directJoinPreviewRoom;

  return {
    passwordDialog,
    setPasswordDialog,
    joinConfirmDialog,
    setJoinConfirmDialog,
    passwordDraft,
    setPasswordDraft,
    directRoomIdInput,
    setDirectRoomIdInput,
    directJoinLoading,
    setDirectJoinLoading,
    setDirectJoinPreviewRoom,
    directJoinError,
    setDirectJoinError,
    directJoinNeedsPassword,
    setDirectJoinNeedsPassword,
    joinRoomsView,
    setJoinRoomsView,
    joinPasswordFilter,
    setJoinPasswordFilter,
    joinStatusFilter,
    setJoinStatusFilter,
    joinSortMode,
    setJoinSortMode,
    normalizedDirectRoomCode,
    resolvedDirectJoinRoom,
  };
};
