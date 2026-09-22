"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Banderas pequeñas que se recuerdan en el navegador (por ejemplo, «ya leí el
 * tutorial»). Se lee con useSyncExternalStore para que el servidor pinte
 * siempre lo mismo y no haya saltos al hidratar.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSeen(key: string): [boolean, () => void] {
  const seen = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key) === "si";
      } catch {
        return false;
      }
    },
    () => false,
  );

  const mark = useCallback(() => {
    try {
      window.localStorage.setItem(key, "si");
    } catch {
      /* modo privado */
    }
    for (const listener of listeners) listener();
  }, [key]);

  return [seen, mark];
}
