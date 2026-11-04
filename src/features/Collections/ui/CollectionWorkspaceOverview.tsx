import { motion, useReducedMotion } from "motion/react";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";
import GraphicEqRounded from "@mui/icons-material/GraphicEqRounded";
import FavoriteBorderRounded from "@mui/icons-material/FavoriteBorderRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import PeopleOutlineRounded from "@mui/icons-material/PeopleOutlineRounded";
import CollectionFeedback from "../shared/components/CollectionFeedback";
import {
  CreatorTrendChart,
  type CreatorDashboard,
  type CreatorRange,
} from "./CreatorAnalytics";
import { formatChange } from "./creatorAnalyticsApi";
import {
  getCollectionIssues,
  type DbCollection,
} from "./collectionWorkspaceModel";

type Props = {
  collections: DbCollection[];
  data: CreatorDashboard | null;
  error: string | null;
  loading: boolean;
  range: CreatorRange;
  mobile: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onBrowse: () => void;
  onOpen: (id: string) => void;
  onCuration: () => void;
  onList: () => void;
  onRetry: () => void;
};

const number = (value: number) => value.toLocaleString("zh-TW");

export function CollectionFirstUse({
  onCreate,
  onBrowse,
  canCreate,
}: Pick<Props, "onCreate" | "onBrowse" | "canCreate">) {
  return (
    <section className="cw-first-use">
      <div className="cw-empty-art" aria-hidden="true">
        <span />
        <span />
        <div>
          <LibraryMusicRounded />
        </div>
      </div>
      <h2>建立你的第一份題庫</h2>
      <p>從喜歡的歌單開始，讓好歌變成新的挑戰。</p>
      <button className="cw-primary" onClick={onCreate} disabled={!canCreate}>
        <AddRounded />
        建立題庫
      </button>
      <button className="cw-text-action" onClick={onBrowse}>
        先看看公開題庫
        <ArrowForwardRounded />
      </button>
      <ol className="cw-start-steps" aria-label="建立流程">
        <li>
          <span>01</span>匯入歌曲
        </li>
        <li>
          <span>02</span>調整答案
        </li>
        <li>
          <span>03</span>建立題庫
        </li>
      </ol>
    </section>
  );
}

function OverviewMetrics({
  data,
  mobile,
  range,
  error,
}: Pick<Props, "data" | "mobile" | "range" | "error">) {
  const metrics = [
    {
      label: "開房次數",
      value: data ? number(data.uses.value) : "—",
      change: data ? formatChange(data.uses) : "",
      icon: <GraphicEqRounded />,
      active: true,
    },
    {
      label: "不重複玩家",
      value: data ? number(data.uniquePlayers.value) : "—",
      change: data ? formatChange(data.uniquePlayers) : "",
      icon: <PeopleOutlineRounded />,
    },
    {
      label: "新增收藏",
      value: data ? number(data.favorites.value) : "—",
      change: data ? formatChange(data.favorites) : "",
      icon: <FavoriteBorderRounded />,
    },
    {
      label: "平均評分",
      value:
        data && data.ratingCount.value > 0 ? data.ratingAvg.toFixed(1) : "—",
      change: data ? `${number(data.ratingCount.value)} 則評分` : "",
      icon: <StarRounded />,
    },
  ];
  return (
    <>
      <div
        className={mobile ? "cw-mobile-metrics" : "cw-desktop-metrics"}
        aria-busy={!data && !error}
      >
        {metrics.map((metric) => (
          <div
            className="cw-metric"
            data-featured={metric.active}
            key={metric.label}
          >
            <div className="cw-metric-label">
              {metric.icon}
              <span>{metric.label}</span>
            </div>
            <strong className={!data ? "cw-value-pending" : ""}>
              {metric.value}
            </strong>
            <span>{metric.change || (error ? "暫無資料" : "讀取中")}</span>
          </div>
        ))}
      </div>
      <p className="cw-period-note">
        近 {range.replace("d", "")} 天 · 與前一期比較
      </p>
    </>
  );
}

function AttentionList({
  collections,
  data,
  onOpen,
  onCuration,
}: Pick<Props, "collections" | "data" | "onOpen" | "onCuration">) {
  const items = collections.filter((item) => getCollectionIssues(item).length);
  const attention =
    data?.attentionItems.filter((item) =>
      collections.some((collection) => collection.id === item.collectionId),
    ) ?? [];
  const entries = items.map((item) => ({
    id: item.id,
    title: item.title,
    reason: getCollectionIssues(item)[0],
  }));
  for (const item of attention)
    if (!entries.some((entry) => entry.id === item.collectionId))
      entries.push({
        id: item.collectionId,
        title: item.title,
        reason: item.reason,
      });
  return (
    <section className="cw-panel cw-attention">
      <div className="cw-section-heading">
        <h2>待處理項目</h2>
        <span className="cw-count" data-warning={entries.length > 0}>
          {entries.length}
        </span>
      </div>
      {entries.length ? (
        <>
          <div className="cw-attention-list">
            {entries.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => onOpen(item.id)}
                className="cw-attention-row"
              >
                <span className="cw-issue-dot" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.reason}</small>
                </span>
                <ArrowForwardRounded />
              </button>
            ))}
          </div>
          <button className="cw-text-action" onClick={onCuration}>
            整理題庫
            <ArrowForwardRounded />
          </button>
        </>
      ) : (
        <div className="cw-all-clear">
          <CheckCircleOutlineRounded />
          <strong>目前沒有待處理項目</strong>
          <span>題庫已準備好迎接玩家</span>
        </div>
      )}
    </section>
  );
}

function TopCollections({
  collections,
  data,
  onOpen,
  onList,
  mobile,
}: Pick<Props, "collections" | "data" | "onOpen" | "onList" | "mobile">) {
  const entries = (data?.topCollections ?? []).filter((item) =>
    collections.some((collection) => collection.id === item.collectionId),
  );
  return (
    <section className="cw-panel cw-top-collections">
      <div className="cw-section-heading">
        <h2>熱門題庫</h2>
        <button className="cw-text-action" onClick={onList}>
          全部
          <ArrowForwardRounded />
        </button>
      </div>
      {entries.length ? (
        <div className="cw-ranking-list">
          {entries.slice(0, mobile ? 3 : 5).map((item, index) => (
            <button
              className="cw-ranking-row"
              key={item.collectionId}
              onClick={() => onOpen(item.collectionId)}
            >
              <span className="cw-rank">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {number(item.uniquePlayers)} 位玩家 · {number(item.favorites)}{" "}
                  收藏
                </small>
              </span>
              <span className="cw-ranking-value">
                <strong>{number(item.uses)}</strong>
                <small>開房</small>
              </span>
              <ArrowForwardRounded />
            </button>
          ))}
        </div>
      ) : (
        <div className="cw-inline-empty">
          <GraphicEqRounded />
          <strong>還沒有遊玩紀錄</strong>
          <span>題庫被用來開房後，表現會顯示在這裡。</span>
        </div>
      )}
    </section>
  );
}

function ContentChecklist({
  collections,
  onCuration,
}: Pick<Props, "collections" | "onCuration">) {
  const checks = [
    {
      label: "已設定分類",
      current: collections.filter((item) => item.category).length,
    },
    {
      label: "已設定語言",
      current: collections.filter((item) => (item.sub_tag_keys ?? []).length)
        .length,
    },
    {
      label: "無待檢查項目",
      current: collections.filter((item) => !getCollectionIssues(item).length)
        .length,
    },
  ];
  return (
    <section className="cw-panel cw-checklist">
      <div className="cw-section-heading">
        <h2>內容檢查</h2>
        <button className="cw-text-action" onClick={onCuration}>
          查看
          <ArrowForwardRounded />
        </button>
      </div>
      {checks.map((check) => (
        <div className="cw-check-item" key={check.label}>
          <span>{check.label}</span>
          <strong>
            {check.current}
            <small> / {collections.length}</small>
          </strong>
          <progress
            aria-label={check.label}
            value={check.current}
            max={Math.max(1, collections.length)}
          />
        </div>
      ))}
    </section>
  );
}

export default function CollectionWorkspaceOverview(props: Props) {
  const { collections, data, error, loading, mobile, range, onRetry } = props;
  const reduce = useReducedMotion();
  if (!collections.length) return <CollectionFirstUse {...props} />;
  const hasActivity = data?.trend.some(
    (point) => point.uses > 0 || point.uniquePlayers > 0,
  );
  const trend = (
    <section className="cw-panel cw-trend">
      <div className="cw-section-heading">
        <h2>遊玩趨勢</h2>
        <div className="cw-chart-legend">
          <span>開房</span>
          <span>玩家</span>
        </div>
      </div>
      {error && !data ? (
        <CollectionFeedback
          title="暫時無法取得趨勢"
          message={error}
          action={{ label: "重新載入", onClick: onRetry, disabled: loading }}
        />
      ) : !data ? (
        <div className="cw-chart-skeleton" aria-label="正在載入趨勢" />
      ) : hasActivity ? (
        <CreatorTrendChart data={data.trend} compact={mobile} />
      ) : (
        <div className="cw-inline-empty">
          <GraphicEqRounded />
          <strong>這段期間還沒有遊玩紀錄</strong>
          <span>可以換個期間，或分享一份題庫給朋友。</span>
        </div>
      )}
    </section>
  );
  return (
    <motion.div
      className={
        mobile
          ? "cw-overview cw-overview-mobile"
          : "cw-overview cw-overview-desktop"
      }
      initial={reduce ? false : { opacity: 0.7 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <OverviewMetrics
        data={data}
        mobile={mobile}
        range={range}
        error={error}
      />
      {error && data && (
        <CollectionFeedback
          title="資料尚未更新"
          message={error}
          action={{ label: "再試一次", onClick: onRetry, disabled: loading }}
        />
      )}
      {mobile ? (
        <>
          <AttentionList {...props} />
          {trend}
          <TopCollections {...props} />
          <details className="cw-mobile-details">
            <summary>內容檢查</summary>
            <ContentChecklist {...props} />
          </details>
        </>
      ) : (
        <>
          <div className="cw-overview-primary">
            {trend}
            <AttentionList {...props} />
          </div>
          <div className="cw-overview-secondary">
            <TopCollections {...props} />
            <ContentChecklist {...props} />
          </div>
        </>
      )}
    </motion.div>
  );
}
