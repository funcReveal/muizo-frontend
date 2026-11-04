// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, expect, it, vi} from "vitest";
import AuthEntryPanel from "./AuthEntryPanel";

const props = () => ({
  onGoogleLogin: vi.fn(), onEmailLogin: vi.fn(async () => ({ok: true})),
  onEmailRegister: vi.fn(async () => ({ok: true})),
  onPasswordResetRequest: vi.fn(async () => true), onResendVerification: vi.fn(async () => true), authLoading: false,
});
afterEach(cleanup);
it("preserves typed fields when switching modes and resets password visibility", () => {
  render(<MemoryRouter><AuthEntryPanel {...props()} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), {target: {value: "player@example.test"}});
  fireEvent.change(screen.getByLabelText("密碼"), {target: {value: "test-password"}});
  fireEvent.click(screen.getByRole("button", {name: "顯示密碼"}));
  expect(screen.getByLabelText("密碼")).toHaveAttribute("type", "text");
  fireEvent.click(screen.getByRole("button", {name: "註冊"}));
  expect(screen.getByLabelText("Email")).toHaveValue("player@example.test");
  expect(screen.getByLabelText("密碼")).toHaveValue("test-password");
  expect(screen.getByLabelText("密碼")).toHaveAttribute("type", "password");
  expect(screen.getByLabelText("密碼")).toHaveAttribute("autocomplete", "new-password");
  expect(screen.queryByRole("button", {name: "忘記密碼？"})).not.toBeInTheDocument();
});
it("shows a recoverable error for a failed connection and restores the submit button", async () => {
  const callbacks = props();
  callbacks.onEmailLogin.mockRejectedValueOnce(new Error("offline"));
  render(<MemoryRouter><AuthEntryPanel {...callbacks} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), {target: {value: "player@example.test"}});
  fireEvent.change(screen.getByLabelText("密碼"), {target: {value: "test-password"}});
  fireEvent.click(screen.getByRole("button", {name: "登入"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("暫時無法連線");
  expect(screen.getByRole("button", {name: "登入"})).toBeEnabled();
});
