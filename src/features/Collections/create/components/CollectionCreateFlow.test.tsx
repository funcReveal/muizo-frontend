// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { type ComponentProps } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import "@shared/i18n";
import Source from "./CollectionCreateSourcePanel";
import Actions from "./CollectionCreateActionBar";
import Steps from "./CollectionCreateStepNav";
import CreateHelp from "./CreateHelp";

const sourceProps = (): ComponentProps<typeof Source> => ({
  authUserExists: true,
  hasGoogleYouTubeConnection: false,
  needsGoogleReauth: false,
  onLinkGoogleYouTube: vi.fn(),
  playlistSource: "url",
  onPlaylistSourceChange: vi.fn(),
  sourceSwitchDisabled: false,
  playlistUrl: "https://youtube.com/playlist?list=example",
  trimmedPlaylistUrl: "https://youtube.com/playlist?list=example",
  showPlaylistUrlError: false,
  playlistUrlTooltipMessage: "請使用播放清單連結",
  isPlaylistUrlFocused: false,
  onPlaylistUrlFocusChange: vi.fn(),
  onPlaylistUrlChange: vi.fn(),
  onFetchPlaylist: vi.fn(),
  onClearPlaylistUrl: vi.fn(),
  playlistUrlReadOnly: false,
  hasResolvedPlaylist: false,
  playlistLoading: false,
  playlistError: null,
  youtubePlaylistsLoading: false,
  youtubePlaylistsError: null,
  youtubePlaylists: [],
  selectedYoutubePlaylistId: "",
  onSelectedYoutubePlaylistIdChange: vi.fn(),
  youtubeActionError: null,
  isImportingYoutubePlaylist: false,
  onEnsureYoutubePlaylists: vi.fn(),
  onImportSelectedYoutubePlaylist: vi.fn(async () => {}),
  isImportingFavorites: false,
  favoritesImportError: null,
  hasFavoritesSource: false,
  onImportAllFavorites: vi.fn(async () => {}),
  importSources: [],
  totalImportedItemCount: 0,
  onRemoveImportSource: vi.fn(),
  onClearImportSources: vi.fn(),
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("enables paste only for a recognized clipboard playlist", async () => {
  const props = sourceProps();
  const readText = vi.fn().mockResolvedValue("https://youtube.com/playlist?list=PL_test-42");
  vi.stubGlobal("navigator", { userAgent: navigator.userAgent, clipboard: { readText }, permissions: { query: vi.fn().mockResolvedValue({state: "granted"}) } });
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  render(<Source {...props} />);
  const paste = screen.getByRole("button", {name: "貼上播放清單連結"});
  await waitFor(() => expect(paste).toBeEnabled());
  fireEvent.click(paste);
  await waitFor(() => expect(props.onPlaylistUrlChange).toHaveBeenCalledWith("https://www.youtube.com/playlist?list=PL_test-42"));
  expect(props.onFetchPlaylist).not.toHaveBeenCalled();
});
it("disables paste for unrelated clipboard content", async () => {
  vi.stubGlobal("navigator", {userAgent: navigator.userAgent, clipboard: {readText: vi.fn().mockResolvedValue("unrelated")}, permissions: {query: vi.fn().mockResolvedValue({state: "granted"})}});
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  render(<Source {...sourceProps()} />);
  await waitFor(() => expect(navigator.clipboard.readText).toHaveBeenCalled());
  expect(screen.getByRole("button", {name: "貼上播放清單連結"})).toBeDisabled();
});
it("offers clipboard access when permission is unavailable", async () => {
  vi.stubGlobal("navigator", {userAgent: navigator.userAgent, clipboard: {readText: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"))}, permissions: {query: vi.fn().mockResolvedValue({state: "prompt"})}});
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  render(<Source {...sourceProps()} playlistUrl="" trimmedPlaylistUrl="" />);
  expect(await screen.findByRole("button", {name: "允許並貼上"})).toBeEnabled();
  expect(screen.getByRole("button", {name: "貼上播放清單連結"})).toBeDisabled();
});
it("pastes immediately when clipboard access is granted", async () => {
  const props = sourceProps();
  vi.stubGlobal("navigator", {userAgent: navigator.userAgent, clipboard: {readText: vi.fn().mockResolvedValue("https://youtube.com/playlist?list=PL_new")}, permissions: {query: vi.fn().mockResolvedValue({state: "prompt"})}});
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  render(<Source {...props} playlistUrl="" trimmedPlaylistUrl="" />);
  fireEvent.click(await screen.findByRole("button", {name: "允許並貼上"}));
  await waitFor(() => expect(props.onPlaylistUrlChange).toHaveBeenCalledWith("https://www.youtube.com/playlist?list=PL_new"));
  expect(props.onFetchPlaylist).not.toHaveBeenCalled();
});
it("normalizes a normal paste event from mobile or desktop share text", () => {
  const props = sourceProps();
  render(<Source {...props} />);
  fireEvent.paste(screen.getByRole("textbox", { name: "播放清單連結" }), {
    clipboardData: {
      getData: () =>
        "我的歌單 https://music.youtube.com/playlist?list=PL_share-42",
    },
  });
  expect(props.onPlaylistUrlChange).toHaveBeenCalledWith(
    "https://www.youtube.com/playlist?list=PL_share-42",
  );
  expect(props.onFetchPlaylist).not.toHaveBeenCalled();
});
it("imports only on an explicit action and blocks invalid links", () => {
  const props = sourceProps();
  const view = render(<Source {...props} />);
  expect(props.onFetchPlaylist).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "匯入歌曲" }));
  expect(props.onFetchPlaylist).toHaveBeenCalledOnce();
  view.rerender(<Source {...props} showPlaylistUrlError />);
  expect(screen.getByRole("button", { name: "匯入歌曲" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("請使用播放清單連結");
  view.rerender(<Source {...props} />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "播放清單連結" })).toHaveAttribute(
    "aria-invalid",
    "false",
  );
});
it("supports arrow navigation between source tabs", () => {
  const props = sourceProps();
  render(<Source {...props} />);
  fireEvent.keyDown(screen.getByRole("tab", { name: "貼上連結" }), {
    key: "ArrowRight",
  });
  expect(props.onPlaylistSourceChange).toHaveBeenCalledWith("youtube");
});
it("cannot skip locked steps and advances only when ready", () => {
  const onStepChange = vi.fn();
  const onNext = vi.fn();
  const props = {
    currentStep: "source" as const,
    canGoNext: false,
    canCreate: false,
    isCreating: false,
    onBack: vi.fn(),
    onNext,
    onCreate: vi.fn(),
  };
  const view = render(
    <>
      <Steps
        currentStep="source"
        onStepChange={onStepChange}
        canOpenReview={false}
        canOpenPublish={false}
      />
      <Actions {...props} />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: /02\s*整理題目/ }));
  expect(onStepChange).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /^整理題目$/ })).toBeDisabled();
  view.rerender(<Actions {...props} canGoNext />);
  fireEvent.click(screen.getByRole("button", { name: "整理題目" }));
  expect(onNext).toHaveBeenCalledOnce();
});
it("opens help on tap and dismisses it with Escape", async () => {
  render(<CreateHelp label="查看說明">播放清單說明內容</CreateHelp>);
  const button = screen.getByRole("button", { name: "查看說明" });
  fireEvent.click(button);
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "播放清單說明內容",
  );
  fireEvent.keyDown(button, { key: "Escape" });
  expect(button).toHaveAttribute("aria-expanded", "false");
});
it("shows desktop help on hover without pinning it on click", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("hover: hover"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  try {
    render(<CreateHelp label="查看說明">播放清單說明內容</CreateHelp>);
    const button = screen.getByRole("button", { name: "查看說明" });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.mouseOver(button);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "播放清單說明內容",
    );
    fireEvent.click(button);
    fireEvent.mouseLeave(button);
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-expanded", "false"),
    );
  } finally {
    cleanup();
    vi.unstubAllGlobals();
  }
});
