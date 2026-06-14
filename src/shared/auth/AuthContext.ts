import { createContext, useContext } from "react";

export type AuthUser = {
  id: string;
  email?: string | null;
  provider?: string;
  provider_user_id?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  plan?: string | null;
  status?: string | null;
};

export interface AuthContextValue {
  // 驗證狀態
  authToken: string | null;
  authUser: AuthUser | null;
  authLoading: boolean;
  authExpired: boolean;
  refreshAuthToken: () => Promise<string | null>;
  loginWithGoogle: () => void;
  loginWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  registerWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | null }>;
  resendEmailVerification: (email: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  logout: () => void;
  // 暱稱 / 個人資料
  needsNicknameConfirm: boolean;
  nicknameDraft: string;
  setNicknameDraft: (value: string) => void;
  confirmNickname: () => Promise<boolean>;
  updateDisplayName: (displayName: string) => Promise<boolean>;
  isProfileEditorOpen: boolean;
  openProfileEditor: () => void;
  closeProfileEditor: () => void;
  // 使用者身份
  clientId: string;
  username: string | null;
  displayUsername: string;
  usernameInput: string;
  setUsernameInput: (value: string) => void;
  handleSetUsername: (fallbackName?: string) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within a RoomProvider");
  return ctx;
};
