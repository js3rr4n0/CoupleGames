import type { GameSession } from "./types";

/**
 * Sessions live in memory on the server: no database, no API keys, nothing for
 * the player to configure. A global holds them so hot reloads keep the state.
 */
const globalStore = globalThis as unknown as {
  __coupleGames?: Map<string, GameSession>;
};

const SESSIONS: Map<string, GameSession> =
  globalStore.__coupleGames ?? (globalStore.__coupleGames = new Map());

const MAX_IDLE_MS = 6 * 60 * 60 * 1000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newCode(): string {
  let code = "";
  do {
    code = Array.from(
      { length: 5 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join("");
  } while (SESSIONS.has(code));
  return code;
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function getSession(code: string): GameSession | undefined {
  return SESSIONS.get(code.toUpperCase());
}

export function saveSession(session: GameSession): void {
  session.lastActivity = Date.now();
  session.version += 1;
  SESSIONS.set(session.code, session);
}

export function putSession(session: GameSession): void {
  SESSIONS.set(session.code, session);
}

export function sweep(): void {
  const now = Date.now();
  for (const [code, session] of SESSIONS) {
    if (now - session.lastActivity > MAX_IDLE_MS) SESSIONS.delete(code);
  }
}

export function sessionCount(): number {
  return SESSIONS.size;
}
