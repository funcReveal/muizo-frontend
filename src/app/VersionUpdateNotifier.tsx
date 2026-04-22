import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

const VERSION_MANIFEST_URL = "/version.json";
const VERSION_TOAST_ID = "app-version-update";
const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_VERSION_CHECK_DELAY_MS = 15 * 1000;

type VersionManifest = {
  buildId: string;
  builtAt: string;
  version: string;
};

function isVersionManifest(value: unknown): value is VersionManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<VersionManifest>;

  return (
    typeof candidate.buildId === "string" &&
    typeof candidate.builtAt === "string" &&
    typeof candidate.version === "string"
  );
}

async function fetchVersionManifest(signal: AbortSignal): Promise<VersionManifest | null> {
  const searchParams = new URLSearchParams({
    t: String(Date.now()),
  });

  const response = await fetch(`${VERSION_MANIFEST_URL}?${searchParams.toString()}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json();

  return isVersionManifest(payload) ? payload : null;
}

function showUpdateToast() {
  toast("Muizo 已有新版本，重新整理即可更新。", {
    id: VERSION_TOAST_ID,
    duration: Number.POSITIVE_INFINITY,
    closeButton: true,
    action: {
      label: "重新整理",
      onClick: () => window.location.reload(),
    },
  });
}

export function VersionUpdateNotifier() {
  const updateDetectedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const lastCheckedAtRef = useRef<number>(0);

  const checkForUpdates = useCallback(async (source: "interval" | "visibility") => {
    if (updateDetectedRef.current || document.visibilityState === "hidden") {
      return;
    }
    // Visibility-triggered checks are debounced to at most once per interval.
    // The periodic timer always runs regardless.
    if (source === "visibility") {
      const now = Date.now();
      if (now - lastCheckedAtRef.current < VERSION_CHECK_INTERVAL_MS) return;
    }
    lastCheckedAtRef.current = Date.now();

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const latestManifest = await fetchVersionManifest(controller.signal);
      if (!latestManifest) return;
      if (latestManifest.buildId !== __APP_BUILD_ID__) {
        updateDetectedRef.current = true;
        showUpdateToast();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }, []);

  useEffect(() => {
    const initialCheckId = window.setTimeout(() => {
      void checkForUpdates("interval");
    }, INITIAL_VERSION_CHECK_DELAY_MS);

    const intervalId = window.setInterval(() => {
      void checkForUpdates("interval");
    }, VERSION_CHECK_INTERVAL_MS);

    // Use only visibilitychange — `focus` fires together with visibilitychange
    // on every foreground return, causing two fetches per switch.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates("visibility");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      requestRef.current?.abort();
      toast.dismiss(VERSION_TOAST_ID);
    };
  }, [checkForUpdates]);

  return null;
}
