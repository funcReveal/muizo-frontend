export const primaryActionSx = {
  borderRadius: "10px",
  minHeight: 40,
  px: 2,
  py: 1,
  fontWeight: 700,
  textTransform: "none",
  color: "var(--mc-accent-ink)",
  background: "var(--mc-accent)",
  boxShadow: "none",
  "&:hover": { background: "var(--mc-accent-hover)", boxShadow: "none" },
  "&:active": { background: "var(--mc-accent-pressed)" },
} as const;

export const secondaryActionSx = {
  borderRadius: "10px",
  minHeight: 40,
  px: 2,
  py: 1,
  fontWeight: 700,
  textTransform: "none",
  color: "var(--mc-text)",
  borderColor: "var(--mc-border)",
  background: "transparent",
  "&:hover": { borderColor: "var(--mc-accent-border)", background: "var(--mc-accent-soft)" },
} as const;

export const quietActionSx = {
  ...secondaryActionSx,
  color: "var(--mc-accent)",
} as const;
