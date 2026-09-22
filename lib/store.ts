import type { GameSession } from "./types";
import { readSnapshot, scheduleSnapshot } from "./persist";
import { kvDel, kvEnabled, kvGet, kvSet } from "./kv";

/**
 * Sessions live in memory on the server: no database, no API keys, nothing for
 * the player to configure. A global holds them so hot reloads keep the state.
 */
const globalStore = globalThis as unknown as {
  __coupleGames?: Map<string, GameSession>;
};

const SESSIONS: Map<string, GameSession> =
  globalStore.__coupleGames ?? (globalStore.__coupleGames = hydrate());

function hydrate(): Map<string, GameSession> {
  const map = new Map<string, GameSession>();
  for (const session of readSnapshot<GameSession>("sessions")) {
    if (session?.code) map.set(session.code, session);
  }
  return map;
}

function persist(): void {
  scheduleSnapshot("sessions", () => [...SESSIONS.values()]);
}

const MAX_IDLE_MS = 6 * 60 * 60 * 1000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  return Array.from(
    { length: 5 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");
}

export function newCode(): string {
  let code = randomCode();
  while (SESSIONS.has(code)) code = randomCode();
  return code;
}

/** Con almacén compartido hay que comprobar contra él que el código es libre. */
export async function newUniqueCode(taken: (code: string) => Promise<boolean>): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode();
    if (!SESSIONS.has(code) && !(await taken(code))) return code;
  }
  return randomCode();
}

export async function sessionExists(code: string): Promise<boolean> {
  if (SESSIONS.has(code)) return true;
  if (!kvEnabled()) return false;
  return (await kvGet<GameSession>(KEY(code))) !== null;
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

const KEY = (code: string) => `couplegames:session:${code}`;

/** Salas pendientes de escribir en el almacén compartido. */
const dirty = new Set<string>();

export function getSession(code: string): GameSession | undefined {
  return SESSIONS.get(code.toUpperCase());
}

/**
 * Lectura buena: en serverless va al almacén compartido, porque la memoria de
 * esta instancia puede no saber nada de una sala creada en otra.
 */
export async function loadSession(code: string): Promise<GameSession | undefined> {
  const key = code.toUpperCase();
  if (kvEnabled()) {
    const shared = await kvGet<GameSession>(KEY(key));
    if (shared) {
      SESSIONS.set(key, shared);
      return shared;
    }
    return undefined;
  }
  return SESSIONS.get(key);
}

/** Vuelca al almacén compartido lo que haya cambiado en esta petición. */
export async function flushSessions(): Promise<void> {
  if (!kvEnabled() || !dirty.size) {
    dirty.clear();
    return;
  }
  const pending = [...dirty];
  dirty.clear();
  await Promise.all(
    pending.map((code) => {
      const session = SESSIONS.get(code);
      return session ? kvSet(KEY(code), session) : kvDel(KEY(code));
    }),
  );
}

export function saveSession(session: GameSession): void {
  session.lastActivity = Date.now();
  session.version += 1;
  SESSIONS.set(session.code, session);
  dirty.add(session.code);
  persist();
}

export function putSession(session: GameSession): void {
  SESSIONS.set(session.code, session);
  dirty.add(session.code);
  persist();
}

export function sweep(): void {
  const now = Date.now();
  let removed = false;
  for (const [code, session] of SESSIONS) {
    if (now - session.lastActivity > MAX_IDLE_MS) {
      SESSIONS.delete(code);
      removed = true;
    }
  }
  if (removed) persist();
}

export function sessionCount(): number {
  return SESSIONS.size;
}
