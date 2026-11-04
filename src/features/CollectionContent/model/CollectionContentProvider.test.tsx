// @vitest-environment jsdom
import { useEffect } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authToken: null as string | null,
  events: [] as string[],
  reset: vi.fn(),
  resetPlaylist: vi.fn(),
  resetRef: { current: undefined as unknown },
}));
vi.mock("../../../shared/auth/AuthContext", () => ({ useAuth: () => ({ authToken: state.authToken }) }));
vi.mock("./useCollectionContentState", () => ({ useCollectionContentState: () => ({ resetCollectionsState: state.reset }) }));
vi.mock("./useCollectionContentAccess", () => ({ useCollectionContentAccess: () => ({}) }));
vi.mock("@features/PlaylistSource", () => ({
  usePlaylistInputControl: () => ({ resetPlaylistState: state.resetPlaylist }),
  usePlaylistSocketBridge: () => ({ onResetCollectionRef: state.resetRef }),
}));
import { CollectionContentProvider } from "./CollectionContentProvider";

const Consumer = ({ token }: { token: string | null }) => {
  useEffect(() => { state.events.push("fetch"); }, [token]);
  return null;
};
const view = () => <CollectionContentProvider><Consumer token={state.authToken} /></CollectionContentProvider>;

beforeEach(() => {
  state.authToken = null;
  state.events = [];
  state.reset.mockReset().mockImplementation(() => state.events.push("reset"));
  state.resetPlaylist.mockReset();
});
afterEach(cleanup);

describe("collection session lifecycle", () => {
  it("does not cancel public collection loading on initial guest mount", () => {
    render(view());
    expect(state.events).toEqual(["fetch"]);
    expect(state.reset).not.toHaveBeenCalled();
  });
  it("clears private state before child requests start on logout", () => {
    state.authToken = "signed-in";
    const { rerender } = render(view());
    state.events = [];
    state.authToken = null;
    rerender(view());
    expect(state.events).toEqual(["reset", "fetch"]);
    expect(state.resetPlaylist).toHaveBeenCalledOnce();
  });
  it("does not clear collections when a signed-in token refreshes", () => {
    state.authToken = "signed-in";
    const { rerender } = render(view());
    state.authToken = "refreshed";
    rerender(view());
    expect(state.reset).not.toHaveBeenCalled();
  });
});
