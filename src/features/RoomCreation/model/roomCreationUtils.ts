import type { Ack, ClientSocket } from "@features/RoomSession";

export const ROOM_CREATION_ACK_TIMEOUT_MS = 20_000;

type UnsafeSocketEmit = (
  event: string,
  payload: unknown,
  callback: (ack: Ack<unknown>) => void,
) => void;

const asUnsafeEmit = (socket: ClientSocket): UnsafeSocketEmit =>
  (socket as unknown as { emit: UnsafeSocketEmit }).emit.bind(socket);

export const computeStableHash = async (value: unknown) => {
  const text = JSON.stringify(value);
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const emitRoomCreationAck = <T>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
): Promise<Ack<T>> =>
  new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        ok: false,
        error: "Room creation request timed out. Please retry.",
      });
    }, ROOM_CREATION_ACK_TIMEOUT_MS);

    asUnsafeEmit(socket)(event, payload, (ack) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ack as Ack<T>);
    });
  });
