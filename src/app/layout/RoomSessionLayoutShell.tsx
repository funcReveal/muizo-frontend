import React from "react";

import {
  RoomContentProvider,
  RoomSessionProvider,
  SitePresenceProvider,
} from "@features/RoomSession";
import { usePreconnectOrigins } from "@shared/hooks/usePreconnectOrigins";
import RoomAwareLayoutShell from "./RoomAwareLayoutShell";
import "@features/RoomSession/ui/roomSessionStyles.css";

const YOUTUBE_PRECONNECT_ORIGINS = [
  { href: "https://www.youtube-nocookie.com" },
  { href: "https://i.ytimg.com", crossOrigin: "anonymous" as const },
];

const RoomSessionLayoutShell: React.FC = () => {
  usePreconnectOrigins(YOUTUBE_PRECONNECT_ORIGINS);

  return (
    <SitePresenceProvider>
      <RoomContentProvider>
        <RoomSessionProvider>
          <RoomAwareLayoutShell />
        </RoomSessionProvider>
      </RoomContentProvider>
    </SitePresenceProvider>
  );
};

export default RoomSessionLayoutShell;
