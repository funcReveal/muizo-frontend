// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter, Outlet, Route, Routes} from "react-router-dom";
import {afterEach, expect, it, vi} from "vitest";
import AuthRequiredPanel from "./AuthRequiredPanel";

vi.mock("@shared/auth/AuthContext", () => ({useAuth: () => ({authLoading: false})}));
afterEach(cleanup);

function mount(source: string | null, explicit = false) {
  render(<MemoryRouter initialEntries={["/collections/new"]}>
    <Routes>
      <Route element={<Outlet context={{authReturnTo: source}} />}>
        <Route path="/collections/new" element={<AuthRequiredPanel secondaryAction={explicit ? {to: "/collections", label: "題庫"} : undefined} />} />
        <Route path="/rooms" element={<h1>房間大廳</h1>} />
      </Route>
    </Routes>
  </MemoryRouter>);
}

it("uses one home return link when the login page is opened directly", () => {
  mount(null);
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link", {name: "回到首頁"})).toHaveAttribute("href", "/");
  expect(screen.queryByRole("navigation", {name: "登入頁導覽"})).not.toBeInTheDocument();
});

it("returns to the known source rather than navigating browser history", () => {
  mount("/rooms");
  fireEvent.click(screen.getByRole("link", {name: "返回大廳"}));
  expect(screen.getByRole("heading", {name: "房間大廳"})).toBeInTheDocument();
});

it("honors the explicit collection destination and rejects unknown sources", () => {
  mount("/rooms", true);
  expect(screen.getByRole("link", {name: "返回題庫"})).toHaveAttribute("href", "/collections");
  cleanup();
  mount("https://example.test");
  expect(screen.getByRole("link", {name: "回到首頁"})).toHaveAttribute("href", "/");
});
