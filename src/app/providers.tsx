import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

import { AuthSessionProvider } from "@features/RoomSession";
import { SettingsProvider } from "@features/Setting/model/settingsModel";
import { AppToaster } from "@shared/ui/toast";
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
    primary: { main: "#38bdf8" }, // sky-400
    secondary: { main: "#a855f7" }, // violet-500
    background: {
      default: "#0f172a",
      paper: "#0b1224",
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter","Segoe UI","Noto Sans TC",sans-serif',
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AuthSessionProvider>
            {children}
            <VersionUpdateNotifier />
            <AppToaster />
          </AuthSessionProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
