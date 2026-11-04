import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import AddRounded from "@mui/icons-material/AddRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";
import AutoFixHighRounded from "@mui/icons-material/AutoFixHighRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import ShareRounded from "@mui/icons-material/ShareRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import {
  CategoryQuickPicker,
  CollectionMetaChips,
  SubTagQuickPicker,
} from "@features/CollectionCategory";
import { ModerationChip } from "@features/CollectionModeration";
import { MuizoSelect } from "@shared/ui/select";
import SiteTooltip from "@shared/ui/SiteTooltip";
import CollectionToolDrawer from "../shared/components/CollectionToolDrawer";
import CollectionFeedback from "../shared/components/CollectionFeedback";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_PRIVATE_COLLECTIONS_PER_USER,
} from "../shared/model/collectionLimits";
import CollectionWorkspaceOverview from "./CollectionWorkspaceOverview";
import {
  CreatorRangePicker,
  type CreatorDashboard,
  type CreatorRange,
} from "./CreatorAnalytics";
import {
  filterAndSortCollections,
  getCollectionIssues,
  canShareCollection,
  type CollectionSort,
  type CollectionVisibilityFilter,
  type CollectionWorkspaceSection,
  type DbCollection,
} from "./collectionWorkspaceModel";
import "./collectionWorkspace.css";

type Props = {
  mobile: boolean;
  section: CollectionWorkspaceSection;
  onSectionChange: (section: CollectionWorkspaceSection) => void;
  collections: DbCollection[];
  filteredCollections: DbCollection[];
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  onRetryCollections: () => void;
  dashboard: CreatorDashboard | null;
  dashboardError: string | null;
  dashboardRefreshing: boolean;
  onRetryDashboard: () => void;
  range: CreatorRange;
  onRangeChange: (range: CreatorRange) => void;
  isAdmin: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onBrowse: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onShare: (collection: DbCollection) => void;
  onDelete: (id: string) => void;
  onVisibilityChange: (id: string, visibility: "public" | "private") => void;
  onUpdateCategory: (id: string, category: string | null) => void;
  onUpdateSubTags: (id: string, keys: string[]) => void;
  onResubmitted: (id: string) => void;
  deletingId: string | null;
  visibilityUpdatingId: string | null;
  copiedId: string | null;
};

const navItems: Array<{
  key: CollectionWorkspaceSection;
  label: string;
  mobileLabel: string;
  icon: ReactNode;
}> = [
  {
    key: "overview",
    label: "創作概況",
    mobileLabel: "概況",
    icon: <DashboardRounded />,
  },
  {
    key: "list",
    label: "我的題庫",
    mobileLabel: "題庫",
    icon: <LibraryMusicRounded />,
  },
  {
    key: "curation",
    label: "待整理",
    mobileLabel: "待整理",
    icon: <AutoFixHighRounded />,
  },
];
const sortOptions: Array<{ value: CollectionSort; label: string }> = [
  { value: "default", label: "預設順序" },
  { value: "plays", label: "開房次數" },
  { value: "title", label: "題庫名稱" },
];
const number = (value: number | null | undefined) =>
  Math.max(0, value ?? 0).toLocaleString("zh-TW");

function WorkspaceNav({
  mobile,
  section,
  onChange,
  total,
  pending,
}: {
  mobile: boolean;
  section: CollectionWorkspaceSection;
  onChange: Props["onSectionChange"];
  total: number;
  pending: number;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const items = mobile ? [navItems[1], navItems[0], navItems[2]] : navItems;
  return (
    <nav
      className={mobile ? "cw-mobile-nav" : "cw-desktop-nav"}
      aria-label="題庫工作區"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          aria-current={section === item.key ? "page" : undefined}
        >
          {section === item.key && (
            <motion.span
              className="cw-nav-selection"
              layoutId={`${id}-nav`}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 36 }
              }
            />
          )}
          {item.icon}
          <span>{mobile ? item.mobileLabel : item.label}</span>
          {item.key !== "overview" && (
            <small data-attention={item.key === "curation" && pending > 0}>
              {item.key === "list" ? total : pending}
            </small>
          )}
        </button>
      ))}
    </nav>
  );
}

function Capacity({
  collections,
  isAdmin,
}: Pick<Props, "collections" | "isAdmin">) {
  if (isAdmin)
    return (
      <div className="cw-capacity">
        <span>管理員工作區</span>
        <small>題庫數量不限</small>
      </div>
    );
  const privateCount = collections.filter(
    (item) => item.visibility !== "public",
  ).length;
  return (
    <div className="cw-capacity">
      <div>
        <span>題庫空間</span>
        <strong>
          {collections.length}
          <small> / {MAX_COLLECTIONS_PER_USER}</small>
        </strong>
      </div>
      <progress
        aria-label="題庫容量"
        max={MAX_COLLECTIONS_PER_USER}
        value={collections.length}
      />
      <small>
        私人題庫 {privateCount} / {MAX_PRIVATE_COLLECTIONS_PER_USER}
      </small>
    </div>
  );
}

function Cover({ item }: { item: DbCollection }) {
  const thumb =
    item.cover_thumbnail_url ||
    (item.cover_provider === "youtube" && item.cover_source_id
      ? `https://i.ytimg.com/vi/${item.cover_source_id}/hqdefault.jpg`
      : "");
  return (
    <span className="cw-cover">
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" />
      ) : (
        <LibraryMusicRounded />
      )}
    </span>
  );
}

function Visibility({ item }: { item: DbCollection }) {
  if (item.lifecycle_status === "draft")
    return (
      <span className="cw-visibility">
        <EditRounded />
        草稿
      </span>
    );
  return (
    <span className="cw-visibility" data-public={item.visibility === "public"}>
      {item.visibility === "public" ? <PublicOutlined /> : <LockOutlined />}
      {item.visibility === "public" ? "公開" : "私人"}
    </span>
  );
}

function CollectionModeration({
  item,
  onResubmitted,
}: {
  item: DbCollection;
  onResubmitted: Props["onResubmitted"];
}) {
  return (
    <ModerationChip
      size="sm"
      collectionId={item.id}
      moderationStatus={item.moderation_status}
      moderationReason={item.moderation_reason}
      canRequestReview={Boolean(item.moderation_edited)}
      onResubmitted={() => onResubmitted(item.id)}
    />
  );
}

type ItemProps = Pick<
  Props,
  "onOpen" | "onEdit" | "onShare" | "copiedId" | "deletingId" | "onResubmitted"
> & { item: DbCollection; onMore: (id: string) => void; curation: boolean };

function QuickActions({
  item,
  onEdit,
  onShare,
  onMore,
  copiedId,
  deletingId,
  mobile = false,
}: ItemProps & { mobile?: boolean }) {
  return (
    <div className="cw-item-actions">
      <SiteTooltip title="編輯題庫">
        <button
          onClick={() => onEdit(item.id)}
          aria-label={`編輯 ${item.title}`}
        >
          <EditRounded />
          {mobile && (
            <span>
              {item.lifecycle_status === "draft" ? "繼續編輯" : "編輯"}
            </span>
          )}
        </button>
      </SiteTooltip>
      <SiteTooltip
        title={
          canShareCollection(item)
            ? copiedId === item.id
              ? "已複製連結"
              : "分享題庫"
            : item.lifecycle_status === "draft"
              ? "完成發布後即可分享"
              : "設為公開後即可分享"
        }
      >
        <span>
          <button
            onClick={() => onShare(item)}
            disabled={!canShareCollection(item)}
            aria-label={`分享 ${item.title}`}
            data-copied={copiedId === item.id}
          >
            {copiedId === item.id ? <CheckRounded /> : <ShareRounded />}
            {mobile && <span>{copiedId === item.id ? "已複製" : "分享"}</span>}
          </button>
        </span>
      </SiteTooltip>
      <SiteTooltip title="更多操作">
        <button
          onClick={() => onMore(item.id)}
          disabled={deletingId === item.id}
          aria-label={`${item.title} 更多操作`}
        >
          <MoreHorizRounded />
        </button>
      </SiteTooltip>
    </div>
  );
}

function DesktopCollectionRow(props: ItemProps) {
  const { item, onOpen, curation } = props;
  const issues = getCollectionIssues(item);
  return (
    <article className="cw-desktop-row">
      <div className="cw-row-identity">
        <button className="cw-title-button" onClick={() => onOpen(item.id)}>
          <Cover item={item} />
          <span>
            <strong>{item.title || "未命名題庫"}</strong>
            <small>{number(item.item_count)} 首歌曲</small>
          </span>
        </button>
        <div className="cw-row-meta">
          <CollectionMetaChips collection={item} maxVisible={3} />
          {curation && issues.length > 0 && (
            <span className="cw-issue-label">{issues[0]}</span>
          )}
          <CollectionModeration
            item={item}
            onResubmitted={props.onResubmitted}
          />
        </div>
      </div>
      <Visibility item={item} />
      <span className="cw-table-number">{number(item.use_count)}</span>
      <span className="cw-table-number">{number(item.favorite_count)}</span>
      <span className="cw-table-rating">
        {item.rating_count ? (
          <>
            <span>★</span> {Number(item.rating_avg ?? 0).toFixed(1)}
            <small>（{number(item.rating_count)}）</small>
          </>
        ) : (
          <span className="cw-muted">—</span>
        )}
      </span>
      <QuickActions {...props} />
    </article>
  );
}

function MobileCollectionCard(props: ItemProps) {
  const { item, onOpen, curation } = props;
  const issues = getCollectionIssues(item);
  return (
    <article className="cw-mobile-card">
      <div className="cw-mobile-card-heading">
        <button className="cw-title-button" onClick={() => onOpen(item.id)}>
          <Cover item={item} />
          <span>
            <strong>{item.title || "未命名題庫"}</strong>
            <small>
              <Visibility item={item} />
            </small>
          </span>
        </button>
      </div>
      <div className="cw-mobile-card-meta">
        <CollectionMetaChips collection={item} maxVisible={2} />
        <CollectionModeration item={item} onResubmitted={props.onResubmitted} />
      </div>
      {curation && issues.length > 0 && (
        <div className="cw-mobile-issue">
          <span className="cw-issue-dot" />
          {issues.join(" · ")}
        </div>
      )}
      <div className="cw-mobile-card-bottom">
        <div className="cw-mobile-card-stats">
          <span>
            <strong>{number(item.item_count)}</strong>題目
          </span>
          <span>
            <strong>{number(item.use_count)}</strong>開房
          </span>
          <span>
            <strong>
              {item.rating_count
                ? Number(item.rating_avg ?? 0).toFixed(1)
                : "—"}
            </strong>
            評分
          </span>
        </div>
        <QuickActions {...props} mobile />
      </div>
    </article>
  );
}

function VisibilityPicker({
  value,
  onChange,
  collections,
}: {
  value: CollectionVisibilityFilter;
  onChange: (value: CollectionVisibilityFilter) => void;
  collections: DbCollection[];
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div className="cw-visibility-picker" role="group" aria-label="可見範圍">
      {(["all", "public", "private"] as const).map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={key === value}
        >
          {key === value && (
            <motion.span
              className="cw-filter-selection"
              layoutId={`${id}-visibility`}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 380, damping: 34 }
              }
            />
          )}
          <span>
            {key === "all" ? "全部" : key === "public" ? "公開" : "私人"}
          </span>
          <small>
            {
              collections.filter(
                (item) =>
                  key === "all" || (item.visibility ?? "private") === key,
              ).length
            }
          </small>
        </button>
      ))}
    </div>
  );
}

export default function CollectionWorkspace(props: Props) {
  const {
    mobile,
    collections,
    filteredCollections,
    section,
    onSectionChange,
    search,
    onSearchChange,
    error,
    loading,
  } = props;
  const [visibility, setVisibility] =
    useState<CollectionVisibilityFilter>("all");
  const [sort, setSort] = useState<CollectionSort>("default");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState<{
    visibility: CollectionVisibilityFilter;
    sort: CollectionSort;
  }>({ visibility: "all", sort: "default" });
  const [actionId, setActionId] = useState<string | null>(null);
  const actionCollection =
    collections.find((item) => item.id === actionId) ?? null;
  const reduce = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);
  const pending = collections.filter(
    (item) => getCollectionIssues(item).length,
  ).length;
  const scopeCollections =
    section === "curation"
      ? collections.filter((item) => getCollectionIssues(item).length)
      : collections;
  const publicCount = scopeCollections.filter(
    (item) => item.visibility === "public",
  ).length;
  const visible = useMemo(
    () => filterAndSortCollections(
      section === "curation" ? filteredCollections.filter((item) => getCollectionIssues(item).length > 0) : filteredCollections,
      visibility, sort,
    ),
    [filteredCollections, visibility, sort, section],
  );
  const activeFilterCount =
    Number(visibility !== "all") + Number(sort !== "default");
  const title =
    section === "overview"
      ? "創作概況"
      : section === "curation"
        ? "待整理"
        : "我的題庫";
  const mobileFilterCount = filterAndSortCollections(
    filteredCollections,
    draftFilter.visibility,
    draftFilter.sort,
  ).length;
  const selection = (value: CollectionWorkspaceSection) => {
    onSectionChange(value);
    bodyRef.current?.scrollTo?.({ top: 0 });
    if (mobile)
      bodyRef.current
        ?.closest(".collection-edit-mobile-scroll")
        ?.scrollTo?.({ top: 0 });
  };
  const create = (
    <SiteTooltip
      title={
        !props.canCreate ? "題庫數量已達上限，請先整理現有題庫" : "建立題庫"
      }
    >
      <span>
        <motion.button
          className="cw-primary cw-create-button"
          onClick={props.onCreate}
          disabled={!props.canCreate}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          aria-label="建立題庫"
        >
          <AddRounded />
          <span>{mobile ? "建立" : "建立題庫"}</span>
        </motion.button>
      </span>
    </SiteTooltip>
  );
  const overviewProps = {
    collections,
    data: props.dashboard,
    error: props.dashboardError,
    loading: props.dashboardRefreshing,
    range: props.range,
    mobile,
    canCreate: props.canCreate,
    onCreate: props.onCreate,
    onBrowse: props.onBrowse,
    onOpen: props.onOpen,
    onCuration: () => selection("curation"),
    onList: () => selection("list"),
    onRetry: props.onRetryDashboard,
  };
  return (
    <div className={`cw-root ${mobile ? "cw-mobile" : "cw-desktop"}`}>
      {!mobile && (
        <aside className="cw-sidebar">
          <div className="cw-brand">
            <span>
              <LibraryMusicRounded />
            </span>
            <strong>題庫工作室</strong>
          </div>
          <WorkspaceNav
            mobile={false}
            section={section}
            onChange={selection}
            total={collections.length}
            pending={pending}
          />
          <div className="cw-sidebar-create">{create}</div>
          <div className="cw-sidebar-bottom">
            <Capacity collections={collections} isAdmin={props.isAdmin} />
            <button className="cw-browse-link" onClick={props.onBrowse}>
              <PublicOutlined />
              探索公開題庫
              <ArrowForwardRounded />
            </button>
          </div>
        </aside>
      )}
      <main className="cw-main">
        <header className="cw-page-heading">
          <div>
            <span className="cw-eyebrow">
              {mobile ? "題庫工作室" : "你的創作空間"}
            </span>
            <h1>{title}</h1>
          </div>
          {mobile ? (
            create
          ) : section === "overview" && collections.length > 0 ? (
            <CreatorRangePicker
              value={props.range}
              onChange={props.onRangeChange}
              isLoading={props.dashboardRefreshing}
            />
          ) : null}
        </header>
        {mobile && (
          <WorkspaceNav
            mobile
            section={section}
            onChange={selection}
            total={collections.length}
            pending={pending}
          />
        )}
        <div className="cw-body" ref={bodyRef}>
          {mobile && section === "overview" && collections.length > 0 && (
            <div className="cw-mobile-range">
              <span>近況</span>
              <CreatorRangePicker
                value={props.range}
                onChange={props.onRangeChange}
                isLoading={props.dashboardRefreshing}
              />
            </div>
          )}
          {error && (
            <CollectionFeedback
              title={collections.length ? "操作尚未完成" : "暫時無法載入題庫"}
              message={error}
              action={{
                label: "重新載入",
                onClick: props.onRetryCollections,
                disabled: loading,
              }}
            />
          )}
          {loading && !collections.length ? (
            <div className="cw-loading" role="status" aria-label="正在載入題庫">
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : error && !collections.length ? null : section === "overview" ? (
            <CollectionWorkspaceOverview {...overviewProps} />
          ) : collections.length === 0 ? (
            <div className="cw-section-empty" key={section}>
              {section === "curation" ? <AutoFixHighRounded /> : <LibraryMusicRounded />}
              <h2>{section === "curation" ? "目前沒有待整理項目" : "你的題庫會出現在這裡"}</h2>
              <p>{section === "curation" ? "建立題庫後，草稿與缺少的設定會集中在這裡。" : "匯入喜歡的歌單，開始整理第一份題庫。"}</p>
              <button className="cw-text-action" onClick={section === "curation" ? () => selection("list") : props.onCreate}>
                {section === "curation" ? "查看我的題庫" : "建立題庫"}<ArrowForwardRounded />
              </button>
            </div>
          ) : (
            <div className="cw-library">
              <div className="cw-library-summary">
                <span>
                  {section === "curation"
                    ? `${pending} 份題庫需要整理`
                    : `共 ${collections.length} 份題庫`}
                </span>
                <span>
                  公開 {publicCount}
                  <i />
                  私人 {scopeCollections.length - publicCount}
                </span>
              </div>
              <div className="cw-library-toolbar">
                <div className="cw-search">
                  <SearchRounded />
                  <input
                    aria-label="搜尋我的題庫"
                    placeholder="搜尋題庫、分類或語言"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                  />
                  {search && (
                    <button
                      className="cw-icon-button"
                      aria-label="清除搜尋"
                      onClick={() => onSearchChange("")}
                    >
                      <CloseRounded />
                    </button>
                  )}
                  {mobile && (
                    <button
                      className="cw-filter-button"
                      aria-label={`篩選題庫${activeFilterCount ? `，已套用 ${activeFilterCount} 個條件` : ""}`}
                      onClick={() => {
                        setDraftFilter({ visibility, sort });
                        setFilterOpen(true);
                      }}
                      data-active={activeFilterCount > 0}
                    >
                      <TuneRounded />
                      {activeFilterCount > 0 && (
                        <small>{activeFilterCount}</small>
                      )}
                    </button>
                  )}
                </div>
                {!mobile && (
                  <div className="cw-desktop-filters">
                    <VisibilityPicker
                      value={visibility}
                      onChange={setVisibility}
                      collections={filteredCollections}
                    />
                    <MuizoSelect<CollectionSort>
                      value={sort}
                      onChange={setSort}
                      options={sortOptions}
                      placeholder="排序"
                      ariaLabel="題庫排序"
                      size="compact"
                    />
                  </div>
                )}
              </div>
              {mobile && activeFilterCount > 0 && (
                <div className="cw-applied-filters">
                  <span>
                    {visibility === "all"
                      ? "全部"
                      : visibility === "public"
                        ? "公開"
                        : "私人"}{" "}
                    ·{" "}
                    {sortOptions.find((option) => option.value === sort)?.label}
                  </span>
                  <button
                    onClick={() => {
                      setVisibility("all");
                      setSort("default");
                    }}
                    aria-label="清除篩選"
                  >
                    <CloseRounded />
                  </button>
                </div>
              )}
              {!visible.length ? (
                <div className="cw-no-results">
                  {section === "curation" && !search && visibility === "all" ? (
                    <>
                      <CheckRounded />
                      <h2>目前沒有待整理的題庫</h2>
                      <button
                        className="cw-text-action"
                        onClick={() => selection("list")}
                      >
                        查看我的題庫
                        <ArrowForwardRounded />
                      </button>
                    </>
                  ) : (
                    <>
                      <SearchRounded />
                      <h2>沒有符合條件的題庫</h2>
                      <button
                        className="cw-text-action"
                        onClick={() => {
                          onSearchChange("");
                          setVisibility("all");
                          setSort("default");
                        }}
                      >
                        清除搜尋與篩選
                      </button>
                    </>
                  )}
                </div>
              ) : mobile ? (
                <div className="cw-mobile-collection-list cw-section-results" key={section}>
                  {visible.map((item) => (
                    <MobileCollectionCard
                      key={item.id}
                      {...props}
                      item={item}
                      onMore={setActionId}
                      curation={section === "curation"}
                    />
                  ))}
                </div>
              ) : (
                <div className="cw-desktop-collection-list cw-section-results" key={section}>
                  <div className="cw-table-head" aria-hidden="true">
                    <span>題庫</span>
                    <span>可見範圍</span>
                    <span>開房</span>
                    <span>收藏</span>
                    <span>評分</span>
                    <span>操作</span>
                  </div>
                  {visible.map((item) => (
                    <DesktopCollectionRow
                      key={item.id}
                      {...props}
                      item={item}
                      onMore={setActionId}
                      curation={section === "curation"}
                    />
                  ))}
                </div>
              )}
              <div className="cw-result-count" role="status">
                顯示 {visible.length} 份題庫
              </div>
            </div>
          )}
        </div>
      </main>
      {props.copiedId && (
        <span className="sr-only" role="status">
          分享連結已複製
        </span>
      )}
      <CollectionToolDrawer
        open={mobile && filterOpen}
        onClose={() => setFilterOpen(false)}
        label="篩選題庫"
        width={440}
        className="cw-filter-sheet"
      >
        <div className="cw-sheet-inner">
          <header>
            <h2>篩選題庫</h2>
            <button
              className="cw-icon-button"
              aria-label="關閉篩選"
              onClick={() => setFilterOpen(false)}
            >
              <CloseRounded />
            </button>
          </header>
          <div className="cw-sheet-body">
            <h3>可見範圍</h3>
            <VisibilityPicker
              value={draftFilter.visibility}
              onChange={(value) =>
                setDraftFilter((current) => ({ ...current, visibility: value }))
              }
              collections={filteredCollections}
            />
            <h3>排序方式</h3>
            <MuizoSelect<CollectionSort>
              value={draftFilter.sort}
              onChange={(value) =>
                setDraftFilter((current) => ({ ...current, sort: value }))
              }
              options={sortOptions}
              placeholder="排序方式"
              ariaLabel="排序方式"
            />
          </div>
          <footer>
            <button
              className="cw-text-action"
              onClick={() =>
                setDraftFilter({ visibility: "all", sort: "default" })
              }
            >
              重設
            </button>
            <button
              className="cw-primary"
              onClick={() => {
                setVisibility(draftFilter.visibility);
                setSort(draftFilter.sort);
                setFilterOpen(false);
              }}
            >
              顯示 {mobileFilterCount} 份題庫
            </button>
          </footer>
        </div>
      </CollectionToolDrawer>
      <CollectionToolDrawer
        open={Boolean(actionCollection)}
        onClose={() => setActionId(null)}
        label="題庫操作"
        width={440}
        className="cw-action-sheet"
      >
        <div className="cw-sheet-inner">
          <header>
            <h2>題庫操作</h2>
            <button
              className="cw-icon-button"
              aria-label="關閉操作面板"
              onClick={() => setActionId(null)}
            >
              <CloseRounded />
            </button>
          </header>
          {actionCollection && (
            <div className="cw-sheet-body">
              <div className="cw-sheet-collection">
                <Cover item={actionCollection} />
                <div>
                  <strong>{actionCollection.title}</strong>
                  <Visibility item={actionCollection} />
                </div>
              </div>
              <div
                className="cw-sheet-shortcuts"
                data-single={actionCollection.lifecycle_status === "draft"}
              >
                <button
                  onClick={() => {
                    props.onEdit(actionCollection.id);
                    setActionId(null);
                  }}
                >
                  <EditRounded />
                  {actionCollection.lifecycle_status === "draft"
                    ? "繼續編輯"
                    : "編輯題庫"}
                </button>
                {actionCollection.lifecycle_status !== "draft" && (
                  <button
                    onClick={() => {
                      props.onOpen(actionCollection.id);
                      setActionId(null);
                    }}
                  >
                    <DashboardRounded />
                    查看分析
                  </button>
                )}
              </div>
              <h3>分類與語言</h3>
              <div className="cw-metadata-actions">
                <CategoryQuickPicker
                  value={actionCollection.category?.id ?? null}
                  allowClear={false}
                  onChange={(value) =>
                    props.onUpdateCategory(actionCollection.id, value)
                  }
                >
                  {(open) => (
                    <button onClick={(event) => open(event.currentTarget)}>
                      {actionCollection.category?.label ?? "選擇分類"}
                      <EditRounded />
                    </button>
                  )}
                </CategoryQuickPicker>
                <SubTagQuickPicker
                  value={actionCollection.sub_tag_keys ?? []}
                  onChange={(keys) =>
                    props.onUpdateSubTags(actionCollection.id, keys)
                  }
                >
                  {(open) => (
                    <button onClick={(event) => open(event.currentTarget)}>
                      調整語言
                      <EditRounded />
                    </button>
                  )}
                </SubTagQuickPicker>
              </div>
              <CollectionMetaChips collection={actionCollection} />
              {error && (
                <CollectionFeedback title="操作尚未完成" message={error} />
              )}
              <h3>分享設定</h3>
              {actionCollection.lifecycle_status === "draft" ? (
                <p className="cw-draft-note">
                  完成題庫內容後，即可發布與分享。
                </p>
              ) : (
                <>
                  <button
                    className="cw-sheet-row"
                    disabled={
                      props.visibilityUpdatingId === actionCollection.id
                    }
                    onClick={() => {
                      props.onVisibilityChange(
                        actionCollection.id,
                        actionCollection.visibility === "public"
                          ? "private"
                          : "public",
                      );
                      setActionId(null);
                    }}
                  >
                    <Visibility item={actionCollection} />
                    <span>
                      改為
                      {actionCollection.visibility === "public"
                        ? "私人"
                        : "公開"}
                      <ArrowForwardRounded />
                    </span>
                  </button>
                  <button
                    className="cw-sheet-row"
                    disabled={!canShareCollection(actionCollection)}
                    onClick={() => props.onShare(actionCollection)}
                  >
                    <span>
                      <ShareRounded />
                      {props.copiedId === actionCollection.id
                        ? "連結已複製"
                        : "複製分享連結"}
                    </span>
                    <small>
                      {!canShareCollection(actionCollection)
                        ? "需先設為公開"
                        : ""}
                    </small>
                  </button>
                </>
              )}
              <button
                className="cw-sheet-delete"
                disabled={props.deletingId === actionCollection.id}
                onClick={() => {
                  props.onDelete(actionCollection.id);
                  setActionId(null);
                }}
              >
                <DeleteOutlineRounded />
                刪除題庫
              </button>
            </div>
          )}
        </div>
      </CollectionToolDrawer>
    </div>
  );
}
