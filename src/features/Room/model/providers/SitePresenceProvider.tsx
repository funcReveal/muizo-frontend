import { useCallback, useMemo, useState, type ReactNode } from "react";

import type { SitePresencePayload } from "../types";
import {
  SitePresenceContext,
  SitePresenceWriteContext,
  type SitePresenceContextValue,
  type SitePresenceWriteContextValue,
} from "../SitePresenceContext";

const normalizeSitePresence = (
  payload: SitePresencePayload | null,
): SitePresenceContextValue => {
  if (!payload || !Number.isFinite(payload.onlineCount)) {
    return { siteOnlineCount: null, sitePresenceUpdatedAt: null };
  }
  return {
    siteOnlineCount: Math.max(0, Math.floor(payload.onlineCount)),
    sitePresenceUpdatedAt: Number.isFinite(payload.updatedAt)
      ? payload.updatedAt
      : Date.now(),
  };
};

export const SitePresenceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [sitePresence, setSitePresenceState] =
    useState<SitePresenceContextValue>(() => normalizeSitePresence(null));

  const setSitePresence = useCallback((payload: SitePresencePayload | null) => {
    setSitePresenceState(normalizeSitePresence(payload));
  }, []);

  const readValue = useMemo<SitePresenceContextValue>(
    () => sitePresence,
    [sitePresence],
  );
  const writeValue = useMemo<SitePresenceWriteContextValue>(
    () => ({ setSitePresence }),
    [setSitePresence],
  );

  return (
    <SitePresenceWriteContext.Provider value={writeValue}>
      <SitePresenceContext.Provider value={readValue}>
        {children}
      </SitePresenceContext.Provider>
    </SitePresenceWriteContext.Provider>
  );
};
