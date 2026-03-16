import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  DEFAULT_SERVER_URL,
  connectSocket,
  createPlaylistItems,
  createSocket,
  emitAck,
  formatMs,
  isMainModule,
  numberArg,
  parseArgs,
  percentile,
  printSection,
  sleep,
  stringArg,
} from "./shared.mjs";

const buildCreatePayload = ({
  roomName,
  username,
  questionCount,
  playlistSize,
  visibility,
  maxPlayers,
}) => {
  const items = createPlaylistItems(playlistSize, roomName.replace(/\s+/g, "-"));
  return {
    roomName,
    username,
    visibility,
    maxPlayers,
    gameSettings: {
      questionCount,
      playDurationSec: 20,
      startOffsetSec: 0,
      allowCollectionClipTiming: true,
      playbackExtensionMode: "manual_vote",
    },
    playlist: {
      uploadId: `lt-${roomName}-${Date.now()}`,
      title: `${roomName} Playlist`,
      totalCount: items.length,
      items,
      isLast: true,
      pageSize: items.length,
    },
  };
};

const runSeedRooms = async () => {
  const args = parseArgs(process.argv.slice(2));
  const serverUrl = stringArg(args, "server", DEFAULT_SERVER_URL);
  const count = numberArg(args, "count", 100);
  const concurrency = Math.max(1, numberArg(args, "concurrency", 20));
  const playlistSize = Math.max(1, numberArg(args, "playlistSize", 10));
  const questionCount = Math.max(1, numberArg(args, "questionCount", 10));
  const maxPlayers = numberArg(args, "maxPlayers", 8);
  const visibility = stringArg(args, "visibility", "public");
  const namePrefix = stringArg(args, "namePrefix", "LT Room");
  const hostPrefix = stringArg(args, "hostPrefix", "lt-host");
  const outputFile = stringArg(args, "output", "");
  const keepAlive = stringArg(args, "keepAlive", "true") !== "false";
  const durationSec = numberArg(args, "durationSec", keepAlive ? 0 : 5);

  const sockets = [];
  const createdRooms = [];
  const createLatencies = [];
  const failures = [];

  printSection("Seed Rooms", [
    `server: ${serverUrl}`,
    `count: ${count}`,
    `concurrency: ${concurrency}`,
    `playlistSize: ${playlistSize}`,
    `questionCount: ${questionCount}`,
    `keepAlive: ${keepAlive}`,
  ]);

  const createOne = async (index) => {
    const socket = createSocket(serverUrl);
    const roomLabel = `${namePrefix} ${String(index + 1).padStart(4, "0")}`;
    const username = `${hostPrefix}-${String(index + 1).padStart(4, "0")}`;
    const startedAt = performance.now();
    try {
      await connectSocket(socket);
      const ack = await emitAck(
        socket,
        "createRoom",
        buildCreatePayload({
          roomName: roomLabel,
          username,
          questionCount,
          playlistSize,
          visibility,
          maxPlayers,
        }),
      );
      if (!ack?.ok || !ack?.data?.room?.id) {
        throw new Error(ack?.error || "createRoom returned no room state");
      }
      const latency = performance.now() - startedAt;
      createLatencies.push(latency);
      sockets.push(socket);
      createdRooms.push({
        roomId: ack.data.room.id,
        roomCode: ack.data.room.roomCode,
        roomName: ack.data.room.name,
        hostUsername: username,
      });
      const createdCount = createdRooms.length;
      if (createdCount % 100 === 0 || createdCount === count) {
        console.log(
          `created ${createdCount}/${count} rooms (${formatMs(latency)} last)`,
        );
      }
    } catch (error) {
      socket.disconnect();
      failures.push({
        index,
        roomName: roomLabel,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const workers = Array.from({ length: concurrency }, async (_, workerIndex) => {
    for (let index = workerIndex; index < count; index += concurrency) {
      await createOne(index);
    }
  });

  await Promise.all(workers);

  if (outputFile && createdRooms.length > 0) {
    const absolute = path.resolve(process.cwd(), outputFile);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(
      absolute,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          serverUrl,
          rooms: createdRooms,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`wrote room manifest: ${absolute}`);
  }

  printSection("Seed Summary", [
    `success: ${createdRooms.length}`,
    `failed: ${failures.length}`,
    `p50 create: ${formatMs(percentile(createLatencies, 0.5))}`,
    `p95 create: ${formatMs(percentile(createLatencies, 0.95))}`,
  ]);

  if (failures.length > 0) {
    printSection(
      "Failures",
      failures.slice(0, 10).map((item) => `${item.roomName}: ${item.error}`),
    );
  }

  const shutdown = async () => {
    for (const socket of sockets) {
      socket.disconnect();
    }
    await sleep(50);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (!keepAlive) {
    if (durationSec > 0) {
      console.log(`holding sockets for ${durationSec}s before shutdown...`);
      await sleep(durationSec * 1000);
    }
    await shutdown();
    return;
  }

  console.log("rooms are seeded and hosts are staying connected. Press Ctrl+C to stop.");
  await new Promise(() => {});
};

if (isMainModule(import.meta.url)) {
  runSeedRooms().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { runSeedRooms };
