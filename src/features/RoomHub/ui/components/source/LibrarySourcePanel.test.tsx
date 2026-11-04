// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import LibrarySourcePanel from "./LibrarySourcePanel";

vi.mock("motion/react", () => ({
  useReducedMotion: () => true,
  motion: { span: ({ children, className }: { children?: ReactNode; className?: string }) => <span className={className}>{children}</span> },
}));

afterEach(cleanup);
it("passes the clicked locked source without changing the active source", () => {
  const onLockedSourceClick = vi.fn();
  const setCreateLibraryTab = vi.fn();
  render(<LibrarySourcePanel createLeftTab="library" createLibraryTab="public" canUseGoogleLibraries={false} setCreateLibraryTab={setCreateLibraryTab} handleBackToCreateLibrary={vi.fn()} onLockedSourceClick={onLockedSourceClick}><div>公開題庫</div></LibrarySourcePanel>);
  fireEvent.click(screen.getByRole("button", { name: "YouTube 播放清單，登入後使用" }));
  expect(onLockedSourceClick).toHaveBeenLastCalledWith("youtube");
  fireEvent.click(screen.getByRole("button", { name: "私人收藏庫，登入後使用" }));
  expect(onLockedSourceClick).toHaveBeenLastCalledWith("personal");
  expect(setCreateLibraryTab).not.toHaveBeenCalled();
  expect(screen.queryByText("登入後可使用私人收藏與 YouTube")).not.toBeInTheDocument();
});
