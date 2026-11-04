// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { type ComponentProps } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import CollectionWorkspace from "./CollectionWorkspace";
import type { DbCollection } from "./collectionWorkspaceModel";

vi.mock("@shared/auth/AuthContext", () => ({
  useAuth: () => ({ authToken: null, refreshAuthToken: async () => null }),
}));

const items: DbCollection[] = [
  {
    id: "public",
    owner_id: "owner",
    title: "前奏挑戰",
    visibility: "public",
    item_count: 30,
    playable_item_count: 30,
    use_count: 52,
    favorite_count: 7,
    category: { id: "pop", key: "pop", label: "流行音樂" },
    sub_tag_keys: ["ja"],
  },
  {
    id: "private",
    owner_id: "owner",
    title: "夜色練習",
    visibility: "private",
    item_count: 10,
    playable_item_count: 10,
    use_count: 2,
    category: null,
    sub_tag_keys: [],
  },
];
const getProps = (): ComponentProps<typeof CollectionWorkspace> => ({
  mobile: false,
  section: "list",
  onSectionChange: vi.fn(),
  collections: items,
  filteredCollections: items,
  search: "",
  onSearchChange: vi.fn(),
  loading: false,
  error: null,
  onRetryCollections: vi.fn(),
  dashboard: null,
  dashboardError: null,
  dashboardRefreshing: false,
  onRetryDashboard: vi.fn(),
  range: "30d",
  onRangeChange: vi.fn(),
  isAdmin: false,
  canCreate: true,
  onCreate: vi.fn(),
  onBrowse: vi.fn(),
  onOpen: vi.fn(),
  onEdit: vi.fn(),
  onShare: vi.fn(),
  onDelete: vi.fn(),
  onVisibilityChange: vi.fn(),
  onUpdateCategory: vi.fn(),
  onUpdateSubTags: vi.fn(),
  onResubmitted: vi.fn(),
  deletingId: null,
  visibilityUpdatingId: null,
  copiedId: null,
});
function mount(props: ComponentProps<typeof CollectionWorkspace>) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });
  client.setQueryData(["sub-tags"], [{ key: "ja", label: "日文", sort: 1 }]);
  client.setQueryData(
    ["categories"],
    [{ id: "pop", key: "pop", label: "流行音樂", sort: 1, children: [] }],
  );
  return render(
    <QueryClientProvider client={client}>
      <CollectionWorkspace {...props} />
    </QueryClientProvider>,
  );
}
afterEach(cleanup);

it("gives overview, library and curation different empty states", () => {
  const props = {...getProps(), collections: [], filteredCollections: []};
  const view = mount({...props, section: "overview"});
  expect(screen.getByRole("heading", {name: "建立你的第一份題庫"})).toBeInTheDocument();
  view.unmount();
  const list = mount({...props, section: "list"});
  expect(screen.getByRole("heading", {name: "你的題庫會出現在這裡"})).toBeInTheDocument();
  expect(screen.queryByRole("heading", {name: "建立你的第一份題庫"})).not.toBeInTheDocument();
  list.unmount();
  mount({...props, section: "curation"});
  expect(screen.getByRole("heading", {name: "目前沒有待整理項目"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "查看我的題庫"}));
  expect(props.onSectionChange).toHaveBeenCalledWith("list");
});

it("only shows collections with incomplete settings in curation", () => {
  const props = getProps();
  mount({...props, section: "curation"});
  expect(document.querySelectorAll(".cw-desktop-row")).toHaveLength(1);
  expect(screen.getByRole("button", {name: /夜色練習.*10 首歌曲/})).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: /前奏挑戰.*30 首歌曲/})).not.toBeInTheDocument();
});

it("uses different mobile cards and desktop rows, with visible edit actions", () => {
  const props = getProps();
  const view = mount(props);
  expect(document.querySelectorAll(".cw-desktop-row")).toHaveLength(2);
  expect(document.querySelectorAll(".cw-mobile-card")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "編輯 前奏挑戰" }));
  expect(props.onEdit).toHaveBeenCalledWith("public");
  view.unmount();
  mount({ ...props, mobile: true });
  expect(document.querySelectorAll(".cw-mobile-card")).toHaveLength(2);
  expect(document.querySelectorAll(".cw-desktop-row")).toHaveLength(0);
  expect(screen.getByRole("button", { name: "分享 夜色練習" })).toBeDisabled();
});
it("filters public collections without mixing in private entries", () => {
  mount(getProps());
  fireEvent.click(screen.getByRole("button", { name: /^公開\s*1$/ }));
  expect(
    screen.getByRole("button", { name: /前奏挑戰.*30 首歌曲/ }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /夜色練習.*10 首歌曲/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("顯示 1 份題庫");
});
it("applies mobile filters only after the user confirms the sheet", async () => {
  mount({ ...getProps(), mobile: true });
  fireEvent.click(screen.getByRole("button", { name: "篩選題庫" }));
  const sheet = screen.getByRole("dialog", { name: "篩選題庫" });
  fireEvent.click(within(sheet).getByRole("button", { name: /^私人\s*1$/ }));
  expect(document.querySelectorAll(".cw-mobile-card")).toHaveLength(2);
  fireEvent.click(within(sheet).getByRole("button", { name: "顯示 1 份題庫" }));
  await waitFor(() =>
    expect(document.querySelectorAll(".cw-mobile-card")).toHaveLength(1),
  );
  expect(document.querySelector(".cw-mobile-card")).toHaveTextContent(
    "夜色練習",
  );
});
it("delegates visibility changes to the existing confirmation flow", () => {
  const props = getProps();
  mount(props);
  fireEvent.click(screen.getByRole("button", { name: "前奏挑戰 更多操作" }));
  const sheet = screen.getByRole("dialog", { name: "題庫操作" });
  fireEvent.click(within(sheet).getByRole("button", { name: /改為私人/ }));
  expect(props.onVisibilityChange).toHaveBeenCalledWith("public", "private");
});
it("shows first-use guidance instead of zero-value analytics for an empty account", () => {
  mount({
    ...getProps(),
    section: "overview",
    collections: [],
    filteredCollections: [],
  });
  expect(
    screen.getByRole("heading", { name: "建立你的第一份題庫" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("開房次數")).not.toBeInTheDocument();
});
it("offers recovery for a failed initial load instead of claiming the account is empty", () => {
  const props = {
    ...getProps(),
    collections: [],
    filteredCollections: [],
    error: "無法讀取題庫",
  };
  mount(props);
  expect(screen.getByRole("alert")).toHaveTextContent("無法讀取題庫");
  expect(
    screen.queryByRole("heading", { name: "建立你的第一份題庫" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
  expect(props.onRetryCollections).toHaveBeenCalledOnce();
});
