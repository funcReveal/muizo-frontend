import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

export type CreatorRange = "7d" | "30d" | "90d";

export type CreatorMetric = { value: number; previousValue: number };
export type CreatorTrendPoint = {
  date: string;
  uses: number;
  uniquePlayers: number;
  favorites: number;
  reviews: number;
};
export type CreatorDashboard = {
  range: CreatorRange;
  uses: CreatorMetric;
  uniquePlayers: CreatorMetric;
  favorites: CreatorMetric;
  ratingCount: CreatorMetric;
  ratingAvg: number;
  trend: CreatorTrendPoint[];
  topCollections: Array<{
    collectionId: string;
    title: string;
    uses: number;
    uniquePlayers: number;
    favorites: number;
    ratingAvg: number;
  }>;
  attentionItems: Array<{
    collectionId: string;
    title: string;
    reason: string;
    severity: "warning" | "info";
  }>;
};
export type CreatorInsights = {
  range: CreatorRange;
  uses: CreatorMetric;
  uniquePlayers: CreatorMetric;
  favorites: CreatorMetric;
  reviews: CreatorMetric;
  ratingAvg: number;
  ratingCount: number;
  casualPlays: number;
  leaderboardPlays: number;
  trend: CreatorTrendPoint[];
  ratingDistribution: Array<{ rating: number; count: number }>;
  contentHealth: {
    itemCount: number;
    playableItemCount: number;
    unavailableItemCount: number;
    hasCategory: boolean;
    hasSubTags: boolean;
  };
};

export function CreatorRangePicker({
  value,
  onChange,
  isLoading = false,
}: {
  value: CreatorRange;
  onChange: (value: CreatorRange) => void;
  isLoading?: boolean;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div
      className="cw-range-picker inline-flex items-center rounded-xl border border-white/10 bg-black/25 p-1"
      role="group"
      aria-label="資料期間"
      aria-busy={isLoading}
    >
      {(["7d", "30d", "90d"] as CreatorRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          disabled={isLoading && value === range}
          aria-pressed={value === range}
          className="cw-range-option"
        >
          {range === value && (
            <motion.span
              className="cw-range-selection"
              layoutId={`${id}-range`}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 36 }
              }
            />
          )}
          {range.replace("d", " 天")}
        </button>
      ))}
      <span
        className={`ml-1 mr-1 inline-flex w-4 gap-0.5 transition-opacity duration-150 ${isLoading ? "opacity-100" : "opacity-0"}`}
        aria-label={isLoading ? "正在更新資料" : undefined}
        aria-hidden={!isLoading}
      >
        <i className="h-1 w-1 animate-pulse rounded-full bg-amber-100 [animation-delay:-160ms]" />
        <i className="h-1 w-1 animate-pulse rounded-full bg-amber-100 [animation-delay:-80ms]" />
        <i className="h-1 w-1 animate-pulse rounded-full bg-amber-100" />
      </span>
    </div>
  );
}

export function CreatorTrendChart({
  data,
  compact = false,
}: {
  data: CreatorTrendPoint[];
  compact?: boolean;
}) {
  if (!data.length)
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
        此期間尚無可顯示的趨勢資料。
      </div>
    );
  return (
    <div
      className={compact ? "h-48" : "h-64"}
      role="img"
      aria-label="每日開房與不重複玩家趨勢圖"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => v.slice(5)}
            tick={{ fill: "#a7ae9e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#a7ae9e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#2c2f28",
              border: "1px solid rgba(255,255,255,.14)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "#f3f4ee" }}
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="uses"
            name="開房"
            stroke="var(--mc-accent)"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="uniquePlayers"
            name="玩家"
            stroke="#9ac9b8"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RatingChart({
  data,
}: {
  data: CreatorInsights["ratingDistribution"];
}) {
  const complete = [1, 2, 3, 4, 5].map((rating) => ({
    rating: `${rating} 星`,
    count: data.find((item) => item.rating === rating)?.count ?? 0,
  }));
  return (
    <div className="h-44" role="img" aria-label="評分分布長條圖">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={complete}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis
            dataKey="rating"
            tick={{ fill: "#a7ae9e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#a7ae9e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#2c2f28",
              border: "1px solid rgba(255,255,255,.14)",
              borderRadius: 12,
            }}
          />
          <Bar
            dataKey="count"
            name="評分人數"
            fill="#fbbf24"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
