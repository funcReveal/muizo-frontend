import type { FC, ReactNode } from "react";

import { CollectionContentProvider } from "@features/CollectionContent";
import { PlaylistSourceProvider } from "@features/PlaylistSource";
import { useStatusWrite } from "./providers/RoomStatusContexts";

export const RoomContentProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { setStatusText } = useStatusWrite();

  return (
    <PlaylistSourceProvider setStatusText={setStatusText}>
      <CollectionContentProvider setStatusText={setStatusText}>
        {children}
      </CollectionContentProvider>
    </PlaylistSourceProvider>
  );
};
