import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";

const require = createRequire(import.meta.url);
const { io } = require(
  path.resolve(process.cwd(), "node_modules/socket.io-client/build/cjs/index.js"),
);

export const DEFAULT_SERVER_URL = "http://127.0.0.1:3000";

export const isMainModule = (metaUrl) => {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(entry).href === metaUrl;
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const nextToken = argv[index + 1];
    const value =
      inlineValue !== undefined
        ? inlineValue
        : nextToken && !nextToken.startsWith("--")
          ? (index += 1, nextToken)
          : "true";
    args[rawKey] = value;
  }
  return args;
};

export const numberArg = (args, key, fallback) => {
  const raw = args[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${key} must be a finite number`);
  }
  return parsed;
};

export const stringArg = (args, key, fallback) => {
  const raw = args[key];
  return raw === undefined ? fallback : String(raw);
};

export const createPlaylistItems = (count, prefix = "LT") =>
  Array.from({ length: count }, (_, index) => {
    const no = index + 1;
    return {
      title: `${prefix} Track ${String(no).padStart(3, "0")}`,
      url: `https://example.com/${prefix.toLowerCase()}-${no}`,
      uploader: "Load Test",
      duration: "01:30",
      thumbnail: "https://img.youtube.com/vi/default/hqdefault.jpg",
      videoId: `${prefix.toLowerCase()}-${String(no).padStart(6, "0")}`,
      provider: "manual",
      sourceId: `${prefix.toLowerCase()}-${String(no).padStart(6, "0")}`,
    };
  });

export const createSocket = (serverUrl, extraOptions = {}) =>
  io(serverUrl, {
    transports: ["websocket"],
    reconnection: false,
    timeout: 10000,
    ...extraOptions,
  });

export const connectSocket = (socket) =>
  new Promise((resolve, reject) => {
    const handleConnect = () => {
      cleanup();
      resolve(socket);
    };
    const handleError = (error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const cleanup = () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
    };
    socket.once("connect", handleConnect);
    socket.once("connect_error", handleError);
  });

export const emitAck = (socket, event, payload) =>
  new Promise((resolve, reject) => {
    socket.timeout(20000).emit(event, payload, (err, response) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      resolve(response);
    });
  });

export const emitAckNoPayload = (socket, event) =>
  new Promise((resolve, reject) => {
    socket.timeout(20000).emit(event, (err, response) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      resolve(response);
    });
  });

export const percentile = (values, ratio) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index];
};

export const formatMs = (value) => `${Math.round(value)}ms`;

export const printSection = (title, lines) => {
  console.log(`\n[${title}]`);
  for (const line of lines) {
    console.log(line);
  }
};
