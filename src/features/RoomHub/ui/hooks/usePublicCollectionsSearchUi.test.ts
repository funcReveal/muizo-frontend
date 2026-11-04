// @vitest-environment jsdom
import { createRef } from "react";
import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePublicCollectionsSearchUi } from "./usePublicCollectionsSearchUi";

afterEach(() => { cleanup(); document.body.innerHTML = ""; });
it("keeps a portal filter open on option interaction and closes on an outside click", () => {
  const setIsExpanded = vi.fn();
  const panelRef = createRef<HTMLDivElement>();
  const { result } = renderHook(() => usePublicCollectionsSearchUi({ createLibraryTab: "public", isExpanded: true, setIsExpanded, setCreateLibrarySearch: vi.fn(), panelRef }));
  const drawer = document.createElement("section");
  drawer.setAttribute("data-public-collection-filters", "");
  const option = document.createElement("button");
  drawer.append(option); document.body.append(drawer);
  fireEvent.mouseDown(option);
  expect(setIsExpanded).not.toHaveBeenCalled();
  fireEvent.mouseDown(document.body);
  expect(setIsExpanded).toHaveBeenLastCalledWith(false);
  act(() => result.current.closePublicLibrarySearch());
  expect(setIsExpanded).toHaveBeenLastCalledWith(false);
});
