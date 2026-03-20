import { useEffect, useMemo, useState } from "react";

import type { RoomSummary } from "../../../model/types";
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

type UseJoinRoomPanelStateArgs = {
  entryTabStorageKey: string;
};

export const useJoinRoomPanelState = ({
  entryTabStorageKey,
}: UseJoinRoomPanelStateArgs) => {
  const [passwordDialog, setPasswordDialog] =
    useState<JoinPasswordDialogState>(null);
  const [joinConfirmDialog, setJoinConfirmDialog] =
    useState<JoinConfirmDialogState>(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [directRoomIdInput, setDirectRoomIdInput] = useState("");
  const [joinEntryTab, setJoinEntryTab] = useState<"code" | "browser">(() => {
    if (typeof window === "undefined") return "code";
    const stored = window.sessionStorage.getItem(entryTabStorageKey);
    return stored === "browser" ? "browser" : "code";
  });
  const [isDirectRoomCodeFocused, setIsDirectRoomCodeFocused] = useState(false);
  const [directJoinLoading, setDirectJoinLoading] = useState(false);
  const [directJoinPreviewRoom, setDirectJoinPreviewRoom] =
    useState<RoomSummary | null>(null);
  const [directJoinError, setDirectJoinError] = useState<string | null>(null);
  const [directJoinNeedsPassword, setDirectJoinNeedsPassword] = useState(false);
  const [joinRoomsView, setJoinRoomsView] = useState<"grid" | "list">("list");
  const [selectedJoinRoomId, setSelectedJoinRoomId] = useState<string | null>(
    null,
  );
  const [joinPasswordFilter, setJoinPasswordFilter] = useState<
    "all" | "no_password" | "password_required"
  >("all");
  const [joinSortMode, setJoinSortMode] = useState<"latest" | "players_desc">(
    "latest",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(entryTabStorageKey, joinEntryTab);
  }, [entryTabStorageKey, joinEntryTab]);

  const normalizedDirectRoomCode = normalizeRoomCodeInput(directRoomIdInput);
  const directRoomCodeSlots = useMemo(
    () => normalizedDirectRoomCode.padEnd(6, "_").split(""),
    [normalizedDirectRoomCode],
  );
  const activeDirectRoomCodeIndex =
    normalizedDirectRoomCode.length >= 6 ? 5 : normalizedDirectRoomCode.length;
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
    joinEntryTab,
    setJoinEntryTab,
    isDirectRoomCodeFocused,
    setIsDirectRoomCodeFocused,
    directJoinLoading,
    setDirectJoinLoading,
    setDirectJoinPreviewRoom,
    directJoinError,
    setDirectJoinError,
    directJoinNeedsPassword,
    setDirectJoinNeedsPassword,
    joinRoomsView,
    setJoinRoomsView,
    selectedJoinRoomId,
    setSelectedJoinRoomId,
    joinPasswordFilter,
    setJoinPasswordFilter,
    joinSortMode,
    setJoinSortMode,
    normalizedDirectRoomCode,
    directRoomCodeSlots,
    activeDirectRoomCodeIndex,
    resolvedDirectJoinRoom,
  };
};
