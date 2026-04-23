export const formatCareerScore = (score: number | null) => {
  if (score === null || !Number.isFinite(score)) return "-";
  return Math.floor(score).toLocaleString("zh-TW");
};

export const formatCareerRank = (rank: number | null) => {
  if (rank === null || !Number.isFinite(rank)) return "-";
  return `#${rank}`;
};

export const formatCareerPercent = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
};

export const formatCareerSignedInt = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value > 0) return `+${Math.round(value)}`;
  if (value < 0) return `${Math.round(value)}`;
  return "±0";
};

export const formatCareerSignedPercent = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100);
  if (rounded > 0) return `+${rounded}%`;
  if (rounded < 0) return `${rounded}%`;
  return "±0%";
};

export const formatCareerPlayTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const formatCareerDelta = (delta: number | null) => {
  if (delta === null || !Number.isFinite(delta)) return "—";
  if (delta > 0) return `↑ +${delta}`;
  if (delta < 0) return `↓ ${delta}`;
  return "→ 0";
};

export const getCareerDeltaClassName = (delta: number | null) => {
  if (delta === null || !Number.isFinite(delta)) return "text-slate-300";
  if (delta > 0) return "text-emerald-300";
  if (delta < 0) return "text-rose-300";
  return "text-slate-300";
};
