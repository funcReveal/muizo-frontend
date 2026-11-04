// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import HubChatReportDialog from "./HubChatReportDialog";

vi.mock("@shared/auth/AuthContext", () => ({
  useAuth: () => ({ authToken: "test-token", refreshAuthToken: vi.fn() }),
}));
vi.mock("@shared/auth/token", () => ({
  ensureFreshAuthToken: () => Promise.resolve("test-token"),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const show = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <HubChatReportDialog
        message={{
          id: "report-message",
          userId: "test:author",
          username: "測試",
          content: "功能驗證用訊息",
          timestamp: 1,
          kind: "text",
        }}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  );

it("submits the selected report and shows a clear success state", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: "report-1" } }),
    });
  vi.stubGlobal("fetch", fetchMock);
  show();
  fireEvent.change(screen.getByRole("textbox", { name: "補充說明（選填）" }), {
    target: { value: "提供測試脈絡" },
  });
  fireEvent.click(screen.getByRole("button", { name: "送出檢舉" }));
  await waitFor(() =>
    expect(screen.getByText(/已收到檢舉/)).toBeInTheDocument(),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/api/hub-chat/messages/report-message/report"),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        reason: "inappropriate",
        description: "提供測試脈絡",
      }),
    }),
  );
});
it("keeps the form available when the report fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "暫時無法處理" } }),
      }),
  );
  show();
  fireEvent.click(screen.getByRole("button", { name: "送出檢舉" }));
  await waitFor(() =>
    expect(screen.getByText("暫時無法處理")).toBeInTheDocument(),
  );
  expect(screen.getByRole("button", { name: "送出檢舉" })).toBeEnabled();
});
