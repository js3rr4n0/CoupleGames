const UA =
  "CoupleGames/1.0 (juego cooperativo Quien Soy; https://github.com/js3rr4n0/CoupleGames)";

export class ProviderError extends Error {}

export async function getJSON<T>(url: string, timeoutMs = 9000): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new ProviderError(`${res.status} ${url}`);
  return (await res.json()) as T;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, maxExclusive: number): number {
  return min + Math.floor(Math.random() * (maxExclusive - min));
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Simple in-process memo so repeated rounds do not hammer the public APIs. */
const memo = new Map<string, { at: number; value: unknown }>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  memo.set(key, { at: Date.now(), value });
  return value;
}
