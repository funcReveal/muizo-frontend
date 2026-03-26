import React from "react";

export interface DanmuContextValue {
  danmuEnabled: boolean;
  onDanmuEnabledChange: (enabled: boolean) => void;
}

export const DanmuContext = React.createContext<DanmuContextValue | null>(null);
