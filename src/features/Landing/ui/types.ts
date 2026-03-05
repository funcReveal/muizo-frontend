export interface LandingPageProps {
  usernameInput: string;
  onInputChange: (value: string) => void;
  onConfirm: () => void;
  onGoogleLogin: () => void;
  googleLoading?: boolean;
  nicknameMaxLength?: number;
}
