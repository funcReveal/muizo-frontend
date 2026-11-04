// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import GoogleLoginCard from "./GoogleLoginCard";

const props = () => ({
  onGoogleLogin: vi.fn(),
  onEmailLogin: vi.fn(async () => ({ ok: true })),
  onEmailRegister: vi.fn(async () => ({ ok: true })),
  onPasswordResetRequest: vi.fn(async () => true),
  onResendVerification: vi.fn(async () => true),
  authLoading: false,
});
afterEach(cleanup);

it("shows only play and collection creation as member destinations", () => {
  render(<MemoryRouter><GoogleLoginCard {...props()} authUser={{ id: "preview", display_name: "測試玩家" }} /></MemoryRouter>);
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.getByRole("link", { name: /開始玩/ })).toHaveAttribute("href", "/rooms");
  expect(screen.getByRole("link", { name: /建立題庫/ })).toHaveAttribute("href", "/collections/new");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

it("keeps email entry, registration, password reset, and Google available to visitors", async () => {
  const callbacks = props();
  render(<MemoryRouter><GoogleLoginCard {...callbacks} /></MemoryRouter>);
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByLabelText("密碼")).toHaveAttribute("autocomplete", "current-password");
  expect(screen.getByRole("button", { name: "忘記密碼？" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /使用 Google 登入/ }));
  expect(callbacks.onGoogleLogin).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "註冊" }));
  expect(await screen.findByRole("button", { name: "建立帳號" })).toBeInTheDocument();
  expect(screen.getByLabelText("密碼")).toHaveAttribute("minlength", "8");
});

it("suggests matching email domains in both login and registration without restricting custom addresses", async () => {
  render(<MemoryRouter><GoogleLoginCard {...props()} /></MemoryRouter>);
  const suggestions = () => Array.from((screen.getByLabelText("Email") as HTMLInputElement).list!.options).map((option) => option.value);
  expect(suggestions()).toEqual([]);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player" } });
  expect(suggestions()).toContain("player@gmail.com");
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player@out" } });
  expect(suggestions()).toEqual(["player@outlook.com"]);
  fireEvent.click(screen.getByRole("button", { name: "註冊" }));
  await screen.findByRole("button", { name: "建立帳號" });
  expect(suggestions()).toEqual(["player@outlook.com"]);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player@my-domain.test" } });
  expect(suggestions()).toEqual([]);
  expect(screen.getByLabelText("Email")).toHaveValue("player@my-domain.test");
});
