"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomView } from "./engine/view";

export interface MesaResult {
  view?: RoomView;
  error?: string;
  playerId?: string;
  code?: string;
}

async function post(path: string, body: unknown): Promise<MesaResult> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as MesaResult;
  if (!res.ok) throw new Error(data.error ?? "No pudimos completar la jugada.");
  return data;
}

export async function createRoom(gameId: string, name: string, players: number) {
  return post("/api/rooms", { gameId, name, players });
}

export async function lookupCode(code: string): Promise<string> {
  const res = await fetch(`/api/lookup?code=${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as { path?: string; error?: string };
  if (!res.ok || !data.path) throw new Error(data.error ?? "No encontramos esa sala.");
  return data.path;
}

const POLL_MS = 1100;

export function useMesa(code: string) {
  const [view, setView] = useState<RoomView | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(`couplegames:${code.toUpperCase()}`);
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const failures = useRef(0);
  const everLoaded = useRef(false);
  const playerRef = useRef<string | null>(playerId);

  const refresh = useCallback(async () => {
    const query = playerRef.current ? `?playerId=${playerRef.current}` : "";
    const res = await fetch(`/api/rooms/${code}${query}`, { cache: "no-store" });
    if (res.status === 404) {
      // Un 404 suelto (servidor reiniciado, red que parpadea) no debe tirar la
      // pantalla: solo se da la sala por perdida tras varios fallos seguidos.
      failures.current += 1;
      const tolerance = everLoaded.current ? 8 : 2;
      if (failures.current >= tolerance) setStatus("missing");
      else setOffline(true);
      return;
    }
    const data = (await res.json()) as MesaResult;
    if (data.view) {
      failures.current = 0;
      everLoaded.current = true;
      setOffline(false);
      setView(data.view);
      setStatus("ready");
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

  const send = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      setBusy(true);
      setError(null);
      try {
        const data = await post(`/api/rooms/${code}`, {
          action,
          playerId: playerRef.current,
          ...payload,
        });
        if (data.playerId) {
          playerRef.current = data.playerId;
          setPlayerId(data.playerId);
          try {
            window.localStorage.setItem(`couplegames:${code.toUpperCase()}`, data.playerId);
          } catch {
            /* modo privado */
          }
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

  /** Atajo para las jugadas: send("play", { move }). */
  const play = useCallback(
    (move: Record<string, unknown>) => send("play", { move }).catch(() => undefined),
    [send],
  );

  return { view, playerId, status, error, setError, busy, offline, send, play, refresh };
}
