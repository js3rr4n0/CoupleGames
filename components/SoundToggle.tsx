"use client";

import { useMuted } from "@/lib/sfx";

/** Interruptor de sonido de la mesa. Cada quien decide en su propio aparato. */
export default function SoundToggle() {
  const [muted, setMuted] = useMuted();
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={!muted}
      title={muted ? "Activar el sonido" : "Silenciar la mesa"}
      className="press grid h-[2.7rem] w-[2.7rem] place-items-center rounded-xl border-[3px] border-ink bg-white text-lg shadow-hard-sm"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
