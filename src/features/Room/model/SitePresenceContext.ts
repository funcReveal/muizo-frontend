import { createContext, useContext } from "react";

import type { SitePresencePayload } from "./types";

export type SitePresenceContextValue = {
  siteOnlineCount: number | null;
  sitePresenceUpdatedAt: number | null;
};

export type SitePresenceWriteContextValue = {
  setSitePresence: (payload: SitePresencePayload | null) => void;
};

export const SitePresenceContext =
  createContext<SitePresenceContextValue | null>(null);

export const SitePresenceWriteContext =
  createContext<SitePresenceWriteContextValue | null>(null);

export const useSitePresence = (): SitePresenceContextValue => {
  const ctx = useContext(SitePresenceContext);
  if (!ctx) {
    throw new Error("useSitePresence must be used within SitePresenceProvider");
  }
  return ctx;
};

export const useSitePresenceWrite = (): SitePresenceWriteContextValue => {
  const ctx = useContext(SitePresenceWriteContext);
  if (!ctx) {
    throw new Error(
      "useSitePresenceWrite must be used within SitePresenceProvider",
    );
  }
  return ctx;
};
