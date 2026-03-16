import { readFile } from "fs/promises";
import path from "path";
import {
  DEFAULT_SERVER_URL,
  connectSocket,
  createSocket,
  emitAck,
  emitAckNoPayload,
  formatMs,
  isMainModule,
  numberArg,
  parseArgs,
  percentile,
  printSection,
  sleep,
  stringArg,
} from "./shared.mjs";

const loadRoomsFromManifest = async (manifestPath) => {
  if (!manifestPath) return null;
  const absolute = path.resolve(process.cwd(), manifestPath);
  const raw = await readFile(absolute, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.rooms) ? parsed.rooms : null;
};

const fetchRoomsFromServer = async (serverUrl) => {
  const socket = createSocket(serverUrl);
  try {
    await connectSocket(socket);
    const ack = await emitAckNoPayload(socket, "listRooms");
    if (!ack?.ok || !Array.isArray(ack?.data)) {
      throw new Error(ack?.error || "listRooms failed");
    }
    return ack.data;
  } finally {
    socket.disconnect();
  }
};

const chooseTargetRoom = (rooms, index, strategy, hotspotCount) => {
  if (strategy === "hotspot") {
    const pool = rooms.slice(0, Math.max(1, Math.min(hotspotCount, rooms.length)));
    return pool[index % pool.length];
  }
  return rooms[index % rooms.length];
};

const runSocketBots = async () => {
  const args = parseArgs(process.argv.slice(2));
  const serverUrl = stringArg(args, "server", DEFAULT_SERVER_URL);
  const users = numberArg(args, "users", 200);
  const concurrency = Math.max(1, numberArg(args, "concurrency", 50));
  const strategy = stringArg(args, "strategy", "distributed");
  const hotspotCount = Math.max(1, numberArg(args, "hotspots", 5));
  const manifestPath = stringArg(args, "manifest", "");
  const probeEveryMs = Math.max(0, numberArg(args, "probeEveryMs", 0));
  const keepAlive = stringArg(args, "keepAlive", "true") !== "false";
  const durationSec = numberArg(args, "durationSec", keepAlive ? 0 : 30);
  const usernamePrefix = stringArg(args, "usernamePrefix", "lt-user");

  const manifestRooms = await loadRoomsFromManifest(manifestPath);
  const listedRooms = manifestRooms ?? (await fetchRoomsFromServer(serverUrl));
  const candidateRooms = listedRooms.filter((room) => room.roomCode);
  if (candidateRooms.length === 0) {
    throw new Error("no rooms available for bots");
  }

  const sockets = [];
  const botStates = [];
  const joinLatencies = [];
  const probeLatencies = [];
  const failures = [];

  printSection("Socket Bots", [
    `server: ${serverUrl}`,
    `users: ${users}`,
    `strategy: ${strategy}`,
    `candidateRooms: ${candidateRooms.length}`,
    `concurrency: ${concurrency}`,
    `probeEveryMs: ${probeEveryMs}`,
  ]);

  const connectAndJoin = async (index) => {
    const socket = createSocket(serverUrl);
    const targetRoom = chooseTargetRoom(
      candidateRooms,
      index,
      strategy,
      hotspotCount,
    );
    const username = `${usernamePrefix}-${String(index + 1).padStart(5, "0")}`;
    const joinedAt = performance.now();
    try {
      await connectSocket(socket);
      const ack = await emitAck(socket, "joinRoom", {
        roomCode: targetRoom.roomCode,
        username,
      });
      if (!ack?.ok || !ack?.data?.room?.id) {
        throw new Error(ack?.error || "joinRoom failed");
      }
      joinLatencies.push(performance.now() - joinedAt);
      const state = {
        socket,
        roomId: ack.data.room.id,
        roomCode: targetRoom.roomCode,
        username,
        joined: true,
      };
      sockets.push(socket);
      botStates.push(state);
      const joinedCount = botStates.length;
      if (joinedCount % 100 === 0 || joinedCount === users) {
        console.log(`joined ${joinedCount}/${users} bots`);
      }
    } catch (error) {
      socket.disconnect();
      failures.push({
        username,
        roomCode: targetRoom.roomCode,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const workers = Array.from({ length: concurrency }, async (_, workerIndex) => {
    for (let index = workerIndex; index < users; index += concurrency) {
      await connectAndJoin(index);
    }
  });
  await Promise.all(workers);

  printSection("Join Summary", [
    `joined: ${botStates.length}`,
    `failed: ${failures.length}`,
    `p50 join: ${formatMs(percentile(joinLatencies, 0.5))}`,
    `p95 join: ${formatMs(percentile(joinLatencies, 0.95))}`,
  ]);

  if (failures.length > 0) {
    printSection(
      "Join Failures",
      failures.slice(0, 10).map((item) => `${item.username}@${item.roomCode}: ${item.error}`),
    );
  }

  let probeTimer = null;
  if (probeEveryMs > 0 && botStates.length > 0) {
    probeTimer = setInterval(async () => {
      const sample = botStates[Math.floor(Math.random() * botStates.length)];
      if (!sample?.joined) return;
      const startedAt = performance.now();
      try {
        const ack = await emitAck(sample.socket, "latencyProbe", {
          roomId: sample.roomId,
        });
        if (ack?.ok) {
          probeLatencies.push(performance.now() - startedAt);
        }
      } catch {
        // ignore transient probe failures in load mode
      }
    }, probeEveryMs);
  }

  const shutdown = async () => {
    if (probeTimer) clearInterval(probeTimer);
    for (const state of botStates) {
      state.socket.disconnect();
      state.joined = false;
    }
    await sleep(50);
    if (probeLatencies.length > 0) {
      printSection("Probe Summary", [
        `samples: ${probeLatencies.length}`,
        `p50 probe: ${formatMs(percentile(probeLatencies, 0.5))}`,
        `p95 probe: ${formatMs(percentile(probeLatencies, 0.95))}`,
      ]);
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (!keepAlive) {
    if (durationSec > 0) {
      console.log(`holding joined bots for ${durationSec}s before shutdown...`);
      await sleep(durationSec * 1000);
    }
    await shutdown();
    return;
  }

  console.log("bots are connected. Press Ctrl+C to stop.");
  await new Promise(() => {});
};

if (isMainModule(import.meta.url)) {
  runSocketBots().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { runSocketBots };
