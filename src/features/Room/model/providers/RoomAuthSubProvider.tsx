/**
 * RoomAuthSubProvider
 *
 * 摰?函???霅?+ 雿輻?澈隞賢惜?恣??
 *   - useRoomAuth ?券?折???authToken?uthUser?eedsNicknameConfirm 蝑?
 *   - username / usernameInput嚗赤摰Ｚ澈隞踝?
 *   - clientId / sessionClientId 閮?
 *
 * 撠?嚗?靘?AuthContext嚗???鞎餉蝙?函??祇? API嚗? * 撠嚗?靘?RoomAuthInternalContext嚗? SessionCoreProvider / CreateSubProvider 雿輻嚗? *
 * ?隞?provider ??鞈湛?
 *   - 霈??StatusWriteContext ??蝛拙???setStatusText嚗??? statusText 霈?皜脫?嚗? */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AuthContext,
  type AuthContextValue,
} from "../../../../shared/auth/AuthContext";
import { useRoomAuth } from "../useRoomAuth";
import {
  clearStoredSessionClientId,
  clearStoredUsername,
  getOrCreateClientId,
  getStoredSessionClientId,
  getStoredUsername,
  setStoredSessionClientId,
  setStoredUsername,
} from "../roomStorage";
import { API_URL, USERNAME_MAX } from "../roomConstants";
import { useStatusWrite } from "./RoomStatusContexts";
import {
  RoomAuthInternalContext,
  type RoomAuthInternalContextValue,
} from "./RoomAuthInternalContext";


// ??? Provider ????????????????????????????????????????????????????????????????

export const RoomAuthSubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { setStatusText } = useStatusWrite();

  // ?? 閮芸恥頨思遢 ??????????????????????????????????????????????????????????????
  const [usernameInput, setUsernameInputState] = useState(() =>
    (getStoredUsername() ?? "").slice(0, USERNAME_MAX),
  );
  const [username, setUsername] = useState<string | null>(
    () => getStoredUsername() ?? null,
  );

  // ?? Client ID ?????????????????????????????????????????????????????????????
  const [localClientId] = useState<string>(() => getOrCreateClientId());
  const [sessionClientId, setSessionClientId] = useState<string>(
    () => getStoredSessionClientId() ?? localClientId,
  );
  const [sessionClientIdLocked, setSessionClientIdLocked] = useState(() =>
    Boolean(getStoredSessionClientId()),
  );

  // ?? ?折頛 ??????????????????????????????????????????????????????????????
  const persistUsername = useCallback((name: string) => {
    setUsername(name);
    setStoredUsername(name);
  }, []);

  const clearAuth = useCallback(() => {
    setUsername(null);
    clearStoredUsername();
    setUsernameInputState("");
  }, []);

  const setUsernameInput = useCallback((value: string) => {
    setUsernameInputState(value.slice(0, USERNAME_MAX));
  }, []);

  // ?? useRoomAuth ????????????????????????????????????????????????????????????
  const {
    authToken,
    authUser,
    authLoading,
    authExpired,
    needsNicknameConfirm,
    nicknameDraft,
    isProfileEditorOpen,
    setNicknameDraft,
    refreshAuthToken,
    confirmNickname: confirmNicknameInternal,
    openProfileEditor,
    closeProfileEditor,
    loginWithGoogle,
    logout,
  } = useRoomAuth({
    apiUrl: API_URL,
    username,
    persistUsername,
    setStatusText,
    onClearAuth: clearAuth,
  });

  // ?? 憿舐內?典?蝔?????????????????????????????????????????????????????????????
  const activeUsername = useMemo(() => {
    const authDisplayName = authUser?.display_name?.trim();
    return authDisplayName
      ? authDisplayName.slice(0, USERNAME_MAX)
      : username;
  }, [authUser?.display_name, username]);

  const displayUsername = useMemo(
    () => activeUsername ?? "(閮芸恥)",
    [activeUsername],
  );

  const previousUsernameRef = useRef<string | null>(username);

  // ?? clientId 閮? ?????????????????????????????????????????????????????????
  const authClientId = authUser?.id ?? null;
  const clientId = useMemo(
    () =>
      sessionClientIdLocked
        ? sessionClientId
        : (authClientId ?? localClientId),
    [authClientId, localClientId, sessionClientId, sessionClientIdLocked],
  );

  const lockSessionClientId = useCallback((nextClientId: string) => {
    setSessionClientId(nextClientId);
    setStoredSessionClientId(nextClientId);
    setSessionClientIdLocked(true);
  }, []);

  const resetSessionClientId = useCallback(() => {
    clearStoredSessionClientId();
    setSessionClientId(authClientId ?? localClientId);
    setSessionClientIdLocked(false);
  }, [authClientId, localClientId]);

  // ?? handleSetUsername ?????????????????????????????????????????????????????
  const handleSetUsername = useCallback(() => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setStatusText("請先輸入名稱");
      return;
    }
    if (trimmed.length > USERNAME_MAX) {
      setStatusText(`名稱最多 ${USERNAME_MAX} 個字`);
      return;
    }
    persistUsername(trimmed);
    setStatusText(null);
  }, [persistUsername, setStatusText, usernameInput]);

  // ?? getDefaultRoomName ????????????????????????????????????????????????????
  const getDefaultRoomName = useCallback(
    (nextUsername: string | null) =>
      nextUsername ? `${nextUsername}'s room` : "未命名房間",
    [],
  );

  // ?? ?郊 previousUsernameRef ??????????????????????????????????????????????
  useEffect(() => {
    previousUsernameRef.current = activeUsername;
  }, [activeUsername]);

  const confirmNicknameRef = useRef<() => Promise<boolean>>(
    confirmNicknameInternal,
  );
  useEffect(() => {
    confirmNicknameRef.current = confirmNicknameInternal;
  }, [confirmNicknameInternal]);

  // AuthContext.confirmNickname 瘞賊??? ref ?澆嚗Ⅱ靽?SessionCoreProvider
  // 摰?摰??銋甇?Ⅱ閫貊
  const confirmNickname = useCallback(
    () => confirmNicknameRef.current(),
    [],
  );

  // ?? AuthContext value ??????????????????????????????????????????????????????
  const authContextValue = useMemo<AuthContextValue>(
    () => ({
      authToken,
      authUser,
      authLoading,
      authExpired,
      refreshAuthToken,
      loginWithGoogle,
      logout,
      needsNicknameConfirm,
      nicknameDraft,
      setNicknameDraft,
      confirmNickname,
      isProfileEditorOpen,
      openProfileEditor,
      closeProfileEditor,
      clientId,
      username,
      displayUsername,
      usernameInput,
      setUsernameInput,
      handleSetUsername,
    }),
    [
      authToken,
      authUser,
      authLoading,
      authExpired,
      refreshAuthToken,
      loginWithGoogle,
      logout,
      needsNicknameConfirm,
      nicknameDraft,
      setNicknameDraft,
      confirmNickname,
      isProfileEditorOpen,
      openProfileEditor,
      closeProfileEditor,
      clientId,
      username,
      displayUsername,
      usernameInput,
      setUsernameInput,
      handleSetUsername,
    ],
  );

  // ?? Internal context value ?????????????????????????????????????????????????
  const internalContextValue = useMemo<RoomAuthInternalContextValue>(
    () => ({
      confirmNicknameRef,
      activeUsername,
      getDefaultRoomName,
      lockSessionClientId,
      resetSessionClientId,
      persistUsername,
      previousUsernameRef,
    }),
    [
      activeUsername,
      getDefaultRoomName,
      lockSessionClientId,
      persistUsername,
      resetSessionClientId,
    ],
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      <RoomAuthInternalContext.Provider value={internalContextValue}>
        {children}
      </RoomAuthInternalContext.Provider>
    </AuthContext.Provider>
  );
};
