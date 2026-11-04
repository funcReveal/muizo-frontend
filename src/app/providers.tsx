import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

import { AuthSessionProvider } from "@features/RoomSession";
import { OnboardingGate } from "@features/Onboarding";
import { SettingsProvider } from "@features/Setting/model/settingsModel";
import { AppToaster } from "@shared/ui/toast";
import { I18nProvider } from "@shared/i18n/I18nProvider";
import { VersionUpdateNotifier } from "./VersionUpdateNotifier";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic refetch on window focus/visibility — the app manages
      // its own real-time sync. Without this, every foreground return fires a
      // network request for every active query (rooms, site-presence, etc.).
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#ffb000", light: "#ffc233", dark: "#e69700", contrastText: "#251900" },
    secondary: { main: "#2dd4bf", contrastText: "#102b27" },
    background: {
      default: "#141512",
      paper: "#20221d",
    },
    text: { primary: "#f3f4ee", secondary: "#b9beb1" },
    divider: "rgba(188, 197, 177, 0.18)",
    action: { selected: "rgba(255,176,0,0.16)", hover: "rgba(255,176,0,0.08)" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"OpenHuninn","Noto Sans TC",sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { minHeight: 44, textTransform: "none", fontWeight: 500, borderRadius: "var(--mc-radius-control)", "&:focus-visible": { outline: "2px solid var(--mc-accent)", outlineOffset: 3 } },
        containedPrimary: {
          backgroundColor: "#ffb000",
          color: "#251900",
          boxShadow: "none",
          "&:hover": { backgroundColor: "#ffc233", boxShadow: "none" },
          "&:active": { backgroundColor: "#e69700" },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: "var(--mc-radius-control)", "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 1, borderColor: "var(--mc-accent)" } } },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: "var(--mc-radius-chip)" } } },
    MuiModal: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiPopover: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiDialog: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiDrawer: {
      defaultProps: {
        ModalProps: {
          disableScrollLock: true,
        },
      },
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <SettingsProvider>
            <AuthSessionProvider>
              {children}
              <OnboardingGate />
              <VersionUpdateNotifier />
              <AppToaster />
            </AuthSessionProvider>
          </SettingsProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
