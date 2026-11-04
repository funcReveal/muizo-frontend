// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createRef, type ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import JoinRoomPanel from "./JoinRoomPanel";
import { normalizeRoomCodeInput } from "../../roomsHubViewModels";

afterEach(cleanup);
const makeProps = (): ComponentProps<typeof JoinRoomPanel> => ({
  directJoinError: null, directJoinLoading: false, normalizedDirectRoomCode: "",
  directRoomCodeInputRef: createRef<HTMLInputElement>(),
  setDirectRoomIdInput: vi.fn(), setDirectJoinPreviewRoom: vi.fn(),
  setDirectJoinError: vi.fn(), setDirectJoinNeedsPassword: vi.fn(),
  normalizeRoomCodeInput, handleDirectJoinById: vi.fn(),
  resolvedDirectJoinRoom: null, directJoinNeedsPassword: false,
  joinPasswordFilter: "all", setJoinPasswordFilter: vi.fn(),
  joinStatusFilter: "all", setJoinStatusFilter: vi.fn(),
  joinSortMode: "latest", setJoinSortMode: vi.fn(),
  filteredJoinRooms: [], viewerAccessByRoomId: {}, serverOffsetMs: 0,
  filteredJoinPlayerTotal: 0, siteOnlineCount: 0,
  joinRoomsView: "grid", setJoinRoomsView: vi.fn(),
  handleJoinRoomEntry: vi.fn(), onBlockedRoomClick: vi.fn(),
  roomRequiresPin: () => false, roomIsLeaderboardChallenge: () => false,
  isRoomCurrentlyPlaying: () => false, getRoomStatusLabel: () => "等待中",
  getRoomPlaylistLabel: () => "", formatRoomCodeDisplay: (value) => value,
  joinConfirmDialog: null, closeJoinConfirmDialog: vi.fn(), handleConfirmJoinInProgress: vi.fn(),
  passwordDialog: null, closePasswordDialog: vi.fn(), passwordDraft: "",
  setPasswordDraft: vi.fn(), handleConfirmJoinWithPassword: vi.fn(),
});

it("shows room-code entry and room browsing together without entry tabs or forced focus", () => {
  render(<JoinRoomPanel {...makeProps()} />);
  expect(screen.getByRole("textbox", { name: "輸入房間代碼" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "瀏覽房間列表" })).toBeInTheDocument();
  expect(screen.queryByRole("tablist")).toBeNull();
  expect(screen.getByRole("textbox", { name: "輸入房間代碼" })).not.toHaveFocus();
  expect(screen.getByRole("textbox", { name: "輸入房間代碼" })).toHaveAttribute("maxlength", "6");
  expect(screen.getByRole("button", { name: "清除房間代碼" })).toBeDisabled();
  expect(screen.getByRole("region", { name: "瀏覽房間列表" })).toContainElement(screen.getByRole("textbox", { name: "輸入房間代碼" }));
});

const demoRoom = {
  id: "demo", roomCode: "ABC123", name: "朋友的猜歌房間", playlistCount: 5,
  playerCount: 1, maxPlayers: 8, createdAt: 1, hasPassword: false,
};

it.each(["grid", "list"] as const)("loads more rooms from the mobile content scroll in %s view", (view) => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("1023.95px"), media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(),
    removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  try {
    const rooms = Array.from({ length: 13 }, (_, index) => ({ ...demoRoom, id: `room-${index}`, name: `房間 ${index + 1}` }));
    render(<JoinRoomPanel {...makeProps()} joinRoomsView={view} filteredJoinRooms={rooms} />);
    expect(screen.queryByText("房間 13")).not.toBeInTheDocument();
    const scrollport = screen.getByRole("region", { name: "瀏覽房間列表" });
    Object.defineProperties(scrollport, {
      scrollHeight: { value: 1000, configurable: true },
      clientHeight: { value: 400, configurable: true },
      scrollTop: { value: 550, configurable: true },
    });
    fireEvent.scroll(scrollport);
    expect(screen.getByText("房間 13")).toBeInTheDocument();
  } finally {
    cleanup();
    vi.unstubAllGlobals();
  }
});

it("replaces the directory with the code match and keeps direct-join behavior", () => {
  const props = makeProps();
  render(<JoinRoomPanel {...props} normalizedDirectRoomCode="ABC123" resolvedDirectJoinRoom={demoRoom} filteredJoinRooms={[{ ...demoRoom, id: "other", name: "其他公開房間" }]} />);
  expect(screen.getByText("找到 1 間房間")).toBeInTheDocument();
  expect(screen.queryByText("其他公開房間")).not.toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: /房間狀態/ })).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(screen.getByRole("button", { name: /朋友的猜歌房間/ }));
  expect(props.handleDirectJoinById).toHaveBeenCalledOnce();
  expect(props.handleJoinRoomEntry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "返回公開房間" }));
  expect(props.setDirectRoomIdInput).toHaveBeenLastCalledWith("");
  expect(props.setDirectJoinPreviewRoom).toHaveBeenLastCalledWith(null);
});

it("shows a lookup skeleton and a recoverable failed-search state in the same result area", () => {
  const props = makeProps();
  const { rerender } = render(<JoinRoomPanel {...props} normalizedDirectRoomCode="ABC123" directJoinLoading />);
  expect(screen.getByRole("status", { name: "正在查詢房間" })).toBeInTheDocument();
  expect(screen.queryByText("目前還沒有公開房間")).not.toBeInTheDocument();
  rerender(<JoinRoomPanel {...props} normalizedDirectRoomCode="ABC123" directJoinError="找不到房間" />);
  expect(screen.getByRole("heading", { name: "無法取得房間資訊" })).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "正在查詢房間" })).not.toBeInTheDocument();
});

it("accepts a pasted separator, removes invalid characters, and limits the result to six characters", () => {
  const props = makeProps();
  render(<JoinRoomPanel {...props} />);
  const input = screen.getByRole("textbox", { name: "輸入房間代碼" });
  fireEvent.paste(input, { clipboardData: { getData: () => "ab-12cd789" } });
  expect(props.setDirectRoomIdInput).toHaveBeenLastCalledWith("AB12CD");
  fireEvent.change(input, { target: { value: "中a!b@12" } });
  expect(props.setDirectRoomIdInput).toHaveBeenLastCalledWith("AB12");
});

it("normalizes code entry and submits only a complete code", () => {
  const props = makeProps();
  const { rerender } = render(<JoinRoomPanel {...props} />);
  const input = screen.getByRole("textbox", { name: "輸入房間代碼" });
  fireEvent.change(input, { target: { value: "ab-1234" } });
  expect(props.setDirectRoomIdInput).toHaveBeenCalledWith("AB1234");
  fireEvent.keyDown(input, { key: "Enter" });
  expect(props.handleDirectJoinById).not.toHaveBeenCalled();
  rerender(<JoinRoomPanel {...props} normalizedDirectRoomCode="AB1234" />);
  fireEvent.keyDown(input, { key: "Enter" });
  expect(props.handleDirectJoinById).toHaveBeenCalledOnce();
});
