"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionView } from "./view";

export interface ApiResult {
  view?: SessionView;
  error?: string;
  correct?: boolean;
  playerId?: string;
}

async function post(path: string, body: unknown): Promise<ApiResult> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as ApiResult;
  if (!res.ok) throw new Error(data.error ?? "No pudimos completar la acción.");
  return data;
}

export const storageKey = (code: string) => `couplegames:${code.toUpperCase()}`;

export function readPlayerId(code: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(code));
  } catch {
    return null;
  }
}

export function writePlayerId(code: string, playerId: string): void {
  try {
    window.localStorage.setItem(storageKey(code), playerId);
    window.localStorage.setItem("couplegames:name", "");
  } catch {
    /* private mode: the session still works, it just will not be remembered */
  }
}

export function rememberName(name: string): void {
  try {
    window.localStorage.setItem("couplegames:name", name);
  } catch {
    /* ignore */
  }
}

export function recallName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("couplegames:name") ?? "";
  } catch {
    return "";
  }
}

export async function createSession(name: string, players: number) {
  return post("/api/sessions", { name, players });
}

const POLL_MS = 1200;

export function useSession(code: string) {
  const [view, setView] = useState<SessionView | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => readPlayerId(code));
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const failures = useRef(0);
  const everLoaded = useRef(false);
  const playerRef = useRef<string | null>(playerId);

  const refresh = useCallback(async () => {
    const query = playerRef.current ? `?playerId=${playerRef.current}` : "";
    const res = await fetch(`/api/sessions/${code}${query}`, { cache: "no-store" });
    if (res.status === 404) {
      // Un 404 suelto (servidor reiniciado, red que parpadea) no debe tirar la
      // pantalla: solo se da la sala por perdida tras varios fallos seguidos.
      failures.current += 1;
      const tolerance = everLoaded.current ? 8 : 2;
      if (failures.current >= tolerance) setStatus("missing");
      else setOffline(true);
      return;
    }
    const data = (await res.json()) as ApiResult;
    if (data.view) {
      failures.current = 0;
      everLoaded.current = true;
      setOffline(false);
      setView(data.view);
      setStatus("ready");
      // The stored id may belong to a session that was restarted.
      if (playerRef.current && !data.view.you) {
        playerRef.current = null;
        setPlayerId(null);
      }
    }
  }, [code]);

  useEffect(() => {
    let active = true;
    void refresh().catch(() => undefined);
    const onFail = () => {
      failures.current += 1;
      if (failures.current >= 2) setOffline(true);
    };
    const timer = setInterval(() => {
      if (!active || document.hidden) return;
      void refresh().catch(onFail);
    }, POLL_MS);
    const onFocus = () => void refresh().catch(onFail);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const act = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      setBusy(true);
      setError(null);
      try {
        const data = await post(`/api/sessions/${code}`, {
          action,
          playerId: playerRef.current,
          ...payload,
        });
        if (data.playerId) {
          playerRef.current = data.playerId;
          setPlayerId(data.playerId);
          writePlayerId(code, data.playerId);
        }
        if (data.view) setView(data.view);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error inesperado";
        setError(message);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [code],
  );

  return { view, playerId, status, error, setError, busy, offline, act, refresh };
}
