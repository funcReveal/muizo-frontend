/**
 * RoomAuthSubProvider
 *
 * Manages shared auth state for the room feature.
 * It owns local username persistence, client id locking, and the bridge
 * between useRoomAuth and the room-specific internal context.
 */
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
import { AUTH_API_URL, USERNAME_MAX } from "../roomConstants";
import { useStatusWrite } from "./RoomStatusContexts";
import {
  RoomAuthInternalContext,
  type RoomAuthInternalContextValue,
} from "./RoomAuthInternalContext";

export const RoomAuthSubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { setStatusText } = useStatusWrite();

  const [usernameInput, setUsernameInputState] = useState(() =>
    (getStoredUsername() ?? "").slice(0, USERNAME_MAX),
  );
  const [username, setUsername] = useState<string | null>(
    () => getStoredUsername() ?? null,
  );

  const [localClientId] = useState<string>(() => getOrCreateClientId());
  const [sessionClientId, setSessionClientId] = useState<string>(
    () => getStoredSessionClientId() ?? localClientId,
  );
  const [sessionClientIdLocked, setSessionClientIdLocked] = useState(() =>
    Boolean(getStoredSessionClientId()),
  );

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
    updateDisplayName,
    openProfileEditor,
    closeProfileEditor,
    loginWithGoogle,
    linkGoogleYouTube,
    unlinkGoogleYouTube,
    loginWithEmail,
    registerWithEmail,
    resendEmailVerification,
    requestPasswordReset,
    logout,
  } = useRoomAuth({
    apiUrl: AUTH_API_URL,
    username,
    persistUsername,
    setStatusText,
    onClearAuth: clearAuth,
  });

  const activeUsername = useMemo(() => {
    const authDisplayName = authUser?.display_name?.trim();
    return authDisplayName
      ? authDisplayName.slice(0, USERNAME_MAX)
      : username;
  }, [authUser?.display_name, username]);

  const displayUsername = useMemo(
    () => activeUsername ?? "(未設定名稱)",
    [activeUsername],
  );

  const previousUsernameRef = useRef<string | null>(username);

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

  const handleSetUsername = useCallback((fallbackName?: string) => {
    const trimmed = (usernameInput.trim() || fallbackName?.trim() || "").slice(
      0,
      USERNAME_MAX,
    );
    if (!trimmed) {
      setStatusText("請先輸入名稱");
      return;
    }
    persistUsername(trimmed);
    setStatusText(null);
  }, [persistUsername, setStatusText, usernameInput]);

  const getDefaultRoomName = useCallback(
    (nextUsername: string | null) =>
      nextUsername ? `${nextUsername}'s room` : "未命名房間",
    [],
  );

  useEffect(() => {
    previousUsernameRef.current = activeUsername;
  }, [activeUsername]);

  const confirmNicknameBaseRef = useRef<() => Promise<boolean>>(
    confirmNicknameInternal,
  );
  const confirmNicknameRef = useRef<() => Promise<boolean>>(
    () => confirmNicknameBaseRef.current(),
  );
  useEffect(() => {
    confirmNicknameBaseRef.current = confirmNicknameInternal;
  }, [confirmNicknameInternal]);

  const confirmNickname = useCallback(
    () => confirmNicknameRef.current(),
    [],
  );

  const authContextValue = useMemo<AuthContextValue>(
    () => ({
      authToken,
      authUser,
      authLoading,
      authExpired,
      refreshAuthToken,
      loginWithGoogle,
      linkGoogleYouTube,
      unlinkGoogleYouTube,
      loginWithEmail,
      registerWithEmail,
      resendEmailVerification,
      requestPasswordReset,
      logout,
      needsNicknameConfirm,
      nicknameDraft,
      setNicknameDraft,
      confirmNickname,
      updateDisplayName,
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
      linkGoogleYouTube,
      unlinkGoogleYouTube,
      loginWithEmail,
      registerWithEmail,
      resendEmailVerification,
      requestPasswordReset,
      logout,
      needsNicknameConfirm,
      nicknameDraft,
      setNicknameDraft,
      confirmNickname,
      updateDisplayName,
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

  const internalContextValue = useMemo<RoomAuthInternalContextValue>(
    () => ({
      confirmNicknameRef,
      confirmNicknameBaseRef,
      activeUsername,
      getDefaultRoomName,
      lockSessionClientId,
      resetSessionClientId,
      persistUsername,
      previousUsernameRef,
    }),
    [
      activeUsername,
      confirmNicknameBaseRef,
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
