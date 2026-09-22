import { getSession, newId } from "@/lib/store";
import { readSnapshot, scheduleSnapshot } from "@/lib/persist";
import { kvDel, kvEnabled, kvGet, kvSet } from "@/lib/kv";
import type { Room } from "./types";

/**
 * Las salas de mesa viven en memoria igual que las de «¿Quién soy?», y los
 * códigos no se pisan entre los dos juegos.
 */
const globalStore = globalThis as unknown as {
  __coupleRooms?: Map<string, Room>;
};

const ROOMS: Map<string, Room> =
  globalStore.__coupleRooms ?? (globalStore.__coupleRooms = hydrate());

function hydrate(): Map<string, Room> {
  const map = new Map<string, Room>();
  for (const room of readSnapshot<Room>("rooms")) {
    if (room?.code) map.set(room.code, room);
  }
  return map;
}

function persist(): void {
  scheduleSnapshot("rooms", () => [...ROOMS.values()]);
}

const MAX_IDLE_MS = 6 * 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  return Array.from(
    { length: 5 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");
}

export function newRoomCode(): string {
  let code = randomCode();
  while (ROOMS.has(code) || getSession(code)) code = randomCode();
  return code;
}

const KEY = (code: string) => `couplegames:room:${code}`;
const dirty = new Set<string>();

export function getRoom(code: string): Room | undefined {
  return ROOMS.get(code.toUpperCase());
}

/** En serverless la mesa puede haberse creado en otra instancia. */
export async function loadRoom(code: string): Promise<Room | undefined> {
  const key = code.toUpperCase();
  if (kvEnabled()) {
    const shared = await kvGet<Room>(KEY(key));
    if (shared) {
      ROOMS.set(key, shared);
      return shared;
    }
    return undefined;
  }
  return ROOMS.get(key);
}

export async function flushRooms(): Promise<void> {
  if (!kvEnabled() || !dirty.size) {
    dirty.clear();
    return;
  }
  const pending = [...dirty];
  dirty.clear();
  await Promise.all(
    pending.map((code) => {
      const room = ROOMS.get(code);
      return room ? kvSet(KEY(code), room) : kvDel(KEY(code));
    }),
  );
}

export async function roomExists(code: string): Promise<boolean> {
  if (ROOMS.has(code)) return true;
  if (!kvEnabled()) return false;
  return (await kvGet<Room>(KEY(code))) !== null;
}

export function putRoom(room: Room): void {
  ROOMS.set(room.code, room);
  dirty.add(room.code);
  persist();
}

export function saveRoom(room: Room): void {
  room.lastActivity = Date.now();
  room.version += 1;
  ROOMS.set(room.code, room);
  dirty.add(room.code);
  persist();
}

export function sweepRooms(): void {
  const now = Date.now();
  let removed = false;
  for (const [code, room] of ROOMS) {
    if (now - room.lastActivity > MAX_IDLE_MS) {
      ROOMS.delete(code);
      removed = true;
    }
  }
  if (removed) persist();
}

export { newId };
