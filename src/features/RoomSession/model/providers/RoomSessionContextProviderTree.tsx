import type { ReactNode } from "react";

import { ChatInputContext } from "../ChatInputContext";
import {
  ChatMessagesContext,
  type ChatMessagesContextValue,
} from "../ChatMessagesContext";
import {
  RoomDirectoryContext,
  type RoomDirectoryContextValue,
} from "../RoomDirectoryContext";
import {
  RoomGameActionsContext,
  RoomGameContext,
  RoomGameStateContext,
  type RoomGameActionsContextValue,
  type RoomGameContextValue,
  type RoomGameStateContextValue,
} from "../RoomGameContext";
import {
  RoomGameStatusContext,
  RoomRealtimeContext,
  RoomUiContext,
  type RoomGameStatusContextValue,
  type RoomRealtimeContextValue,
  type RoomUiContextValue,
} from "../RoomContext";
import {
  PlaylistSourceContext,
  type PlaylistSourceContextValue,
} from "@features/PlaylistSource";
import {
  RoomSessionContext,
  type RoomSessionContextValue,
} from "../RoomSessionContext";
import {
  RoomSessionInternalContext,
  type RoomSessionInternalContextValue,
} from "./RoomSessionInternalContext";
import type { ChatInputContextValue } from "../ChatInputContext";

type RoomSessionContextProviderTreeProps = {
  children: ReactNode;
  values: {
    chatInput: ChatInputContextValue;
    chatMessages: ChatMessagesContextValue;
    directory: RoomDirectoryContextValue;
    game: RoomGameContextValue;
    gameActions: RoomGameActionsContextValue;
    gameState: RoomGameStateContextValue;
    gameStatus: RoomGameStatusContextValue;
    internal: RoomSessionInternalContextValue;
    playlist: PlaylistSourceContextValue;
    realtime: RoomRealtimeContextValue;
    session: RoomSessionContextValue;
    ui: RoomUiContextValue;
  };
};

export const RoomSessionContextProviderTree = ({
  children,
  values,
}: RoomSessionContextProviderTreeProps) => (
  <PlaylistSourceContext.Provider value={values.playlist}>
    <RoomSessionContext.Provider value={values.session}>
      <RoomDirectoryContext.Provider value={values.directory}>
        <ChatMessagesContext.Provider value={values.chatMessages}>
          <RoomGameStateContext.Provider value={values.gameState}>
            <RoomGameActionsContext.Provider value={values.gameActions}>
              <RoomGameContext.Provider value={values.game}>
                <RoomUiContext.Provider value={values.ui}>
                  <RoomGameStatusContext.Provider value={values.gameStatus}>
                    <RoomRealtimeContext.Provider value={values.realtime}>
                      <ChatInputContext.Provider value={values.chatInput}>
                        <RoomSessionInternalContext.Provider value={values.internal}>
                          {children}
                        </RoomSessionInternalContext.Provider>
                      </ChatInputContext.Provider>
                    </RoomRealtimeContext.Provider>
                  </RoomGameStatusContext.Provider>
                </RoomUiContext.Provider>
              </RoomGameContext.Provider>
            </RoomGameActionsContext.Provider>
          </RoomGameStateContext.Provider>
        </ChatMessagesContext.Provider>
      </RoomDirectoryContext.Provider>
    </RoomSessionContext.Provider>
  </PlaylistSourceContext.Provider>
);
