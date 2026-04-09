import type { ReactNode } from "react";

import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  BookmarkBorderRounded,
  ChevronLeftRounded,
  LinkRounded,
  LockOutlined,
  PublicOutlined,
  YouTube,
} from "@mui/icons-material";

type CreateLibraryTab = "public" | "personal" | "youtube" | "link";
type CreateLeftTab = "library" | "settings";

type LibrarySourcePanelProps = {
  createLeftTab: CreateLeftTab;
  createLibraryTab: CreateLibraryTab;
  canUseGoogleLibraries: boolean;
  setCreateLibraryTab: (value: CreateLibraryTab) => void;
  handleBackToCreateLibrary: () => void;
  onLockedSourceClick: () => void;
  sidebarContent?: ReactNode;
  children: ReactNode;
};

const sourceItems: Array<{
  key: CreateLibraryTab;
  label: string;
  icon: ReactNode;
}> = [
  {
    key: "public",
    label: "公開收藏庫",
    icon: <PublicOutlined fontSize="small" />,
  },
  {
    key: "personal",
    label: "私人收藏庫",
    icon: <BookmarkBorderRounded fontSize="small" />,
  },
  {
    key: "youtube",
    label: "從 Youtube 匯入清單",
    icon: <YouTube fontSize="small" />,
  },
  {
    key: "link",
    label: "貼上清單連結",
    icon: <LinkRounded fontSize="small" />,
  },
];

const LibrarySourcePanel = ({
  createLeftTab,
  createLibraryTab,
  canUseGoogleLibraries,
  setCreateLibraryTab,
  handleBackToCreateLibrary,
  onLockedSourceClick,
  sidebarContent,
  children,
}: LibrarySourcePanelProps) => {
  const selectedSource =
    sourceItems.find((item) => item.key === createLibraryTab) ?? sourceItems[0];

  const handleMobileSelectChange = (event: SelectChangeEvent<CreateLibraryTab>) => {
    const nextValue = event.target.value as CreateLibraryTab;
    const isLocked =
      !canUseGoogleLibraries && nextValue !== "public" && nextValue !== "link";

    if (isLocked) {
      onLockedSourceClick();
      return;
    }

    setCreateLibraryTab(nextValue);
  };

  return (
    <div className="grid min-h-0 min-w-0 gap-2 lg:flex-1 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-3">
      <aside className="min-w-0 px-0 py-1 lg:flex lg:min-h-0 lg:flex-col lg:pr-2 lg:pb-2 lg:pl-0 lg:pt-2">
        <div className="mb-2 hidden items-center gap-1 lg:mb-0 lg:flex">
          {createLeftTab === "settings" ? (
            <button
              type="button"
              onClick={handleBackToCreateLibrary}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-cyan-100 transition hover:text-cyan-200"
              aria-label="返回題庫來源"
            >
              <ChevronLeftRounded sx={{ fontSize: 24 }} />
            </button>
          ) : null}
          <p className="text-base font-semibold tracking-[0.18em] text-[var(--mc-text)] sm:text-lg">
            {createLeftTab === "library" ? "題庫來源" : "房間設定"}
          </p>
        </div>

        {createLeftTab === "settings" && sidebarContent ? (
          <div className="hidden lg:mt-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            {sidebarContent}
          </div>
        ) : null}

        {createLeftTab === "library" ? (
          <>
            <div className="lg:hidden">
              <FormControl fullWidth size="small">
                <Select<CreateLibraryTab>
                  value={createLibraryTab}
                  onChange={handleMobileSelectChange}
                  displayEmpty
                  renderValue={() => (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          borderRadius: "10px",
                          color: "rgba(186, 230, 253, 0.96)",
                          background:
                            "linear-gradient(180deg, rgba(34,211,238,0.16), rgba(14,165,233,0.1))",
                          border: "1px solid rgba(103, 232, 249, 0.18)",
                          flex: "0 0 auto",
                        }}
                      >
                        {selectedSource.icon}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#e2e8f0",
                            fontWeight: 700,
                            lineHeight: 1.3,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {selectedSource.label}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  sx={{
                    borderRadius: "16px",
                    color: "#e2e8f0",
                    background:
                      "linear-gradient(180deg, rgba(15,23,42,0.78), rgba(2,6,23,0.72))",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 30px -24px rgba(14,165,233,0.55)",
                    "& .MuiSelect-select": {
                      px: 1.5,
                      py: 1.25,
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(148, 163, 184, 0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(148, 163, 184, 0.2)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(148, 163, 184, 0.2)",
                    },
                    "& .MuiSelect-icon": {
                      color: "rgba(186, 230, 253, 0.88)",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        mt: 1,
                        borderRadius: 2,
                        border: "1px solid rgba(148,163,184,0.18)",
                        background:
                          "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
                        boxShadow:
                          "0 22px 40px rgba(2,6,23,0.48), 0 0 0 1px rgba(34,211,238,0.06)",
                        backdropFilter: "blur(14px)",
                      },
                    },
                    MenuListProps: {
                      dense: true,
                      sx: { py: 0.5 },
                    },
                  }}
                  inputProps={{ "aria-label": "題庫來源" }}
                >
                  {sourceItems.map((item) => {
                    const disabled =
                      !canUseGoogleLibraries &&
                      item.key !== "public" &&
                      item.key !== "link";

                    return (
                      <MenuItem
                        key={item.key}
                        value={item.key}
                        onClick={() => {
                          if (disabled) {
                            onLockedSourceClick();
                          }
                        }}
                        sx={{
                          gap: 1.25,
                          py: 1.2,
                          px: 1.5,
                          minHeight: 0,
                          opacity: disabled ? 0.72 : 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            borderRadius: "10px",
                            color: disabled
                              ? "rgba(148,163,184,0.54)"
                              : "rgba(186,230,253,0.92)",
                            background: disabled
                              ? "rgba(51, 65, 85, 0.3)"
                              : "linear-gradient(180deg, rgba(34,211,238,0.14), rgba(14,165,233,0.08))",
                            border: disabled
                              ? "1px solid rgba(148,163,184,0.12)"
                              : "1px solid rgba(103,232,249,0.14)",
                            flex: "0 0 auto",
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: disabled ? "rgba(148,163,184,0.7)" : "#e2e8f0",
                              fontWeight: 600,
                              lineHeight: 1.3,
                            }}
                          >
                            {item.label}
                          </Typography>
                        </Box>
                        {disabled ? (
                          <LockOutlined sx={{ fontSize: 14, color: "#fbbf24" }} />
                        ) : null}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </div>

            <div className="mt-2 hidden flex-col gap-2 lg:flex">
              {sourceItems.map((item) => {
                const isActive = createLibraryTab === item.key;
                const disabled =
                  !canUseGoogleLibraries &&
                  item.key !== "public" &&
                  item.key !== "link";

                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-disabled={disabled}
                    onClick={() => {
                      if (disabled) {
                        onLockedSourceClick();
                        return;
                      }
                      setCreateLibraryTab(item.key);
                    }}
                    className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                      disabled
                        ? "cursor-pointer bg-slate-900/40 text-slate-400 hover:bg-slate-900/55 hover:text-slate-200"
                        : isActive
                          ? "cursor-pointer bg-cyan-500/10 text-cyan-100 shadow-[inset_3px_0_0_0_rgba(34,211,238,0.85)]"
                          : "cursor-pointer bg-[var(--mc-surface)]/35 text-[var(--mc-text)] hover:bg-cyan-500/10 hover:text-cyan-100"
                    }`}
                  >
                    <span className="inline-flex w-full items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-cyan-200/90">{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      {disabled ? (
                        <Tooltip title="點擊即可登入後使用" placement="top">
                          <LockOutlined sx={{ fontSize: 14, color: "#fbbf24" }} />
                        </Tooltip>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
};

export default LibrarySourcePanel;
