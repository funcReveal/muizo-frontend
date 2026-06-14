const CHUNK_RELOAD_STORAGE_KEY = `muizo_chunk_reload:${__APP_BUILD_ID__}`;
const MAX_CHUNK_RELOAD_ATTEMPTS = 2;

const chunkErrorPatterns = [
  "ChunkLoadError",
  "Loading chunk",
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Unable to preload CSS",
];

const toErrorText = (value: unknown): string => {
  if (value instanceof Error) {
    return `${value.name} ${value.message}`.trim();
  }
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [record.name, record.message, record.reason, record.type]
      .filter((item): item is string => typeof item === "string")
      .join(" ");
  }
  return "";
};

export const isChunkLoadError = (value: unknown) => {
  const text = toErrorText(value);
  if (!text) return false;
  return chunkErrorPatterns.some((pattern) =>
    text.toLowerCase().includes(pattern.toLowerCase()),
  );
};

const sessionStorageGet = (key: string) => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const sessionStorageSet = (key: string, value: string) => {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; reloading once is still safer than a blank app.
  }
};

const sessionStorageRemove = (key: string) => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures; the cache-busted navigation can still recover.
  }
};

export const reloadWithCacheBust = () => {
  if (typeof window === "undefined") return false;

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("__muizo_reload", String(Date.now()));
  window.location.replace(nextUrl.toString());
  return true;
};

export const resetChunkReloadAttempts = () => {
  if (typeof window === "undefined") return;
  sessionStorageRemove(CHUNK_RELOAD_STORAGE_KEY);
};

export const reloadOnceForChunkError = () => {
  if (typeof window === "undefined") return false;

  const currentAttempts = Number.parseInt(
    sessionStorageGet(CHUNK_RELOAD_STORAGE_KEY) ?? "0",
    10,
  );
  const attempts = Number.isFinite(currentAttempts) ? currentAttempts : 0;
  if (attempts >= MAX_CHUNK_RELOAD_ATTEMPTS) return false;

  sessionStorageSet(CHUNK_RELOAD_STORAGE_KEY, String(attempts + 1));

  if (attempts === 0) {
    window.location.reload();
    return true;
  }

  return reloadWithCacheBust();
};

export const installChunkLoadRecovery = () => {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    const target = event.target;
    const isScriptFailure = target instanceof HTMLScriptElement;
    const isChunkLinkFailure =
      target instanceof HTMLLinkElement &&
      (target.relList.contains("stylesheet") ||
        target.relList.contains("modulepreload")) &&
      target.href.includes("/assets/");
    if (
      !isScriptFailure &&
      !isChunkLinkFailure &&
      !isChunkLoadError(event.error ?? event.message)
    ) {
      return;
    }
    reloadOnceForChunkError();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event.reason)) return;
    reloadOnceForChunkError();
  });
};
