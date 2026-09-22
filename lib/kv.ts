/**
 * Almacén compartido opcional (Vercel KV / Upstash Redis) hablado por su API
 * REST, sin dependencias: basta con fetch.
 *
 * Hace falta cuando la web corre en *serverless* (Vercel y compañía), donde
 * cada petición puede atenderla una instancia distinta y la memoria no se
 * comparte. Si no hay variables de entorno configuradas, no se usa y todo
 * sigue funcionando en memoria + disco, como en un servidor normal.
 */
const URL_VAR = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_VAR =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

/** Las salas caducan solas a las 6 horas, igual que en memoria. */
const TTL_SECONDS = 6 * 60 * 60;

export function kvEnabled(): boolean {
  return Boolean(URL_VAR && TOKEN_VAR);
}

/**
 * En Vercel (y similares) cada petición puede tocar una instancia distinta: sin
 * almacén compartido las salas se pierden. Esto lo detecta para poder avisar en
 * pantalla en vez de fallar sin explicación.
 */
export function needsSharedStore(): boolean {
  const serverless = Boolean(
    process.env.VERCEL ?? process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.NETLIFY,
  );
  return serverless && !kvEnabled();
}

async function command<T>(body: unknown[]): Promise<T | null> {
  if (!kvEnabled()) return null;
  try {
    const res = await fetch(URL_VAR!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_VAR}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T };
    return data.result ?? null;
  } catch {
    // Si el almacén no responde, se sigue con lo que haya en memoria.
    return null;
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const raw = await command<string>(["GET", key]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await command(["SET", key, JSON.stringify(value), "EX", TTL_SECONDS]);
}

export async function kvDel(key: string): Promise<void> {
  await command(["DEL", key]);
}
