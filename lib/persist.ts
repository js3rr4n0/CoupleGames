import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Las salas viven en memoria para ir rápidas, pero se copian a disco cada poco.
 * Así un reinicio del servidor —o un despliegue— no se lleva por delante una
 * partida a medias: al arrancar se vuelven a cargar tal cual estaban.
 */
const DIR =
  process.env.COUPLEGAMES_DATA_DIR ?? join(process.cwd(), ".couplegames-data");

let writable: boolean | null = null;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function ensureDir(): boolean {
  if (writable !== null) return writable;
  try {
    mkdirSync(DIR, { recursive: true });
    writable = true;
  } catch {
    try {
      mkdirSync(join(tmpdir(), "couplegames"), { recursive: true });
      writable = true;
    } catch {
      writable = false;
    }
  }
  return writable;
}

function fileFor(name: string): string {
  const base = existsSync(DIR) ? DIR : join(tmpdir(), "couplegames");
  return join(base, `${name}.json`);
}

export function readSnapshot<T>(name: string): T[] {
  if (!ensureDir()) return [];
  try {
    const raw = readFileSync(fileFor(name), "utf8");
    const parsed = JSON.parse(raw) as { items?: T[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    // Primera vez, fichero corrupto o disco de solo lectura: se empieza limpio.
    return [];
  }
}

/** Guardado con retardo: muchas jugadas seguidas escriben una sola vez. */
export function scheduleSnapshot<T>(name: string, collect: () => T[]): void {
  if (!ensureDir()) return;
  if (timers.has(name)) return;
  timers.set(
    name,
    setTimeout(() => {
      timers.delete(name);
      try {
        const target = fileFor(name);
        const temporary = `${target}.tmp`;
        writeFileSync(
          temporary,
          JSON.stringify({ at: Date.now(), items: collect() }),
          "utf8",
        );
        // Renombrar es atómico: nunca se lee un fichero a medio escribir.
        renameSync(temporary, target);
      } catch {
        writable = false;
      }
    }, 700),
  );
}

/** Identifica este arranque del servidor, para detectar reinicios. */
export const BOOT_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
