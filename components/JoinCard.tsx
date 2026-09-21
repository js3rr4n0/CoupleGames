"use client";

import { useState } from "react";
import type { SessionView } from "@/lib/view";
import { rememberName, recallName } from "@/lib/client";
import { Avatar, Button, Card } from "./ui";

export default function JoinCard({
  view,
  act,
  busy,
}: {
  view: SessionView;
  act: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}) {
  const [name, setName] = useState(recallName());
  const host = view.players.find((p) => p.isHost);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    rememberName(name);
    await act("join", { name });
  }

  return (
    <Card className="animate-rise mx-auto max-w-lg p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
        Sala {view.code}
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-tight">
        {host ? `${host.name} te invitó a jugar` : "Únete a la partida"}
      </h2>
      <p className="mt-2 text-sm text-white/60">
        Adivina qué personaje te tocó preguntando al resto. Tu carta es secreta
        solo para ti.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {view.players.map((player) => (
          <span
            key={player.id}
            className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm"
          >
            <Avatar emoji={player.emoji} size="sm" />
            {player.name}
          </span>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Tu nombre
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Luis"
            maxLength={18}
            required
            autoFocus
            className="mt-2 w-full rounded-2xl border border-white/10 bg-night-900/60 px-4 py-3 text-base outline-none transition placeholder:text-white/30 focus:border-glow-400 focus:ring-2 focus:ring-glow-500/30"
          />
        </label>
        <Button type="submit" disabled={busy} className="w-full py-4 text-base">
          {busy ? "Entrando…" : "Entrar a la sala"}
        </Button>
      </form>

      {view.phase !== "lobby" && (
        <p className="mt-4 text-center text-xs text-amber-200/80">
          La partida ya empezó: entrarás en la rotación de turnos.
        </p>
      )}
    </Card>
  );
}
