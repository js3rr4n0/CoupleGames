import { getSession, newId } from "@/lib/store";
import type { Room } from "./types";

/**
 * Las salas de mesa viven en memoria igual que las de «¿Quién soy?», y los
 * códigos no se pisan entre los dos juegos.
 */
const globalStore = globalThis as unknown as {
  __coupleRooms?: Map<string, Room>;
};

const ROOMS: Map<string, Room> =
  globalStore.__coupleRooms ?? (globalStore.__coupleRooms = new Map());

const MAX_IDLE_MS = 6 * 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newRoomCode(): string {
  let code = "";
  do {
    code = Array.from(
      { length: 5 },
      () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
    ).join("");
  } while (ROOMS.has(code) || getSession(code));
  return code;
}

export function getRoom(code: string): Room | undefined {
  return ROOMS.get(code.toUpperCase());
}

export function putRoom(room: Room): void {
  ROOMS.set(room.code, room);
}

export function saveRoom(room: Room): void {
  room.lastActivity = Date.now();
  room.version += 1;
  ROOMS.set(room.code, room);
}

export function sweepRooms(): void {
  const now = Date.now();
  for (const [code, room] of ROOMS) {
    if (now - room.lastActivity > MAX_IDLE_MS) ROOMS.delete(code);
  }
}

export { newId };
