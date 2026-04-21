import React from "react";

import {
  RoomContentProvider,
  RoomSessionProvider,
  SitePresenceProvider,
} from "@features/RoomSession";
import RoomAwareLayoutShell from "./RoomAwareLayoutShell";
import "@features/RoomSession/ui/roomSessionStyles.css";

const RoomSessionLayoutShell: React.FC = () => (
  <SitePresenceProvider>
    <RoomContentProvider>
      <RoomSessionProvider>
        <RoomAwareLayoutShell />
      </RoomSessionProvider>
    </RoomContentProvider>
  </SitePresenceProvider>
);

export default RoomSessionLayoutShell;
