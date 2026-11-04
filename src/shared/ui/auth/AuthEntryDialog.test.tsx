// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AuthEntryDialog, { type AuthFeaturePreview } from "./AuthEntryDialog";
const props = () => ({ open: true, onClose: vi.fn(), onGoogleLogin: vi.fn(), onEmailLogin: vi.fn(async () => ({ok: true})), onEmailRegister: vi.fn(async () => ({ok: true})), onPasswordResetRequest: vi.fn(async () => true), onResendVerification: vi.fn(async () => true), authLoading: false });
afterEach(cleanup);
it("uses a different preview image for every gated feature", () => {
const callbacks = props();
const preview = (kind: AuthFeaturePreview["kind"]) => <MemoryRouter><AuthEntryDialog {...callbacks} featurePreview={{kind, eyebrow: "登入後解鎖", title: kind, description: "功能預覽"}} /></MemoryRouter>;
const view = render(preview("collections"));
for (const kind of ["collections", "rooms", "favorites", "career", "youtube", "personal"] as const) {
view.rerender(preview(kind));
expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute("src", `/feature-previews/${kind}.png`);
}
});
it("continues the pending action only after a successful login", async () => {
  const callbacks = props();
  const onLoginSuccess = vi.fn();
  callbacks.onEmailLogin.mockResolvedValueOnce({ ok: false });
  render(<MemoryRouter><AuthEntryDialog {...callbacks} onLoginSuccess={onLoginSuccess} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player@example.test" } });
  fireEvent.change(screen.getByLabelText("密碼"), { target: { value: "example-password" } });
  fireEvent.click(screen.getAllByRole("button", { name: /^登入$/ }).at(-1)!);
  await screen.findByRole("alert");
  expect(onLoginSuccess).not.toHaveBeenCalled();
  expect(callbacks.onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: /^登入$/ }).at(-1)!);
  await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledOnce());
  expect(callbacks.onClose).toHaveBeenCalledOnce();
});
it("supports Escape and a visible close button", () => {
const callbacks = props();
render(<MemoryRouter><AuthEntryDialog {...callbacks}/></MemoryRouter>);
fireEvent.keyDown(screen.getByRole("dialog"), {key: "Escape", code: "Escape"});
expect(callbacks.onClose).toHaveBeenCalledOnce();
fireEvent.click(screen.getByRole("button", {name: "關閉"}));
expect(callbacks.onClose).toHaveBeenCalledTimes(2);
});
