import { toast } from "sonner";

type AppToastOptions = {
  id?: string;
  duration?: number;
};

export const appToast = {
  success: (message: string, options?: AppToastOptions) =>
    toast.success(message, {
      duration: options?.duration ?? 2600,
      id: options?.id,
    }),
  error: (message: string, options?: AppToastOptions) =>
    toast.error(message, {
      duration: options?.duration ?? 3600,
      id: options?.id,
    }),
  warning: (message: string, options?: AppToastOptions) =>
    toast.warning(message, {
      duration: options?.duration ?? 3200,
      id: options?.id,
    }),
  info: (message: string, options?: AppToastOptions) =>
    toast(message, {
      duration: options?.duration ?? 2800,
      id: options?.id,
    }),
};
