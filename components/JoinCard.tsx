"use client";

import { useState } from "react";
import type { SessionView } from "@/lib/view";
import { rememberName, recallName } from "@/lib/client";
import { hasYellowFlower } from "@/lib/flower";
import { Avatar, Button, Card, FlowerNote, FlowerRain } from "./ui";

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
  const flower = hasYellowFlower(name);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    rememberName(name);
    await act("join", { name });
  }

  return (
    <Card className="animate-rise mx-auto max-w-lg overflow-hidden p-0">
      <div className="border-b-[3px] border-ink bg-sun px-6 py-5">
        <p className="text-xs font-extrabold uppercase tracking-widest">
          Sala {view.code}
        </p>
        <h2 className="mt-1 font-display text-3xl leading-tight">
          {host ? `${host.name} te invita a jugar` : "Únete a la partida"}
        </h2>
        <p className="mt-2 font-semibold">
          Adivina qué personaje te tocó preguntando al resto. Tu carta es secreta
          solo para ti.
        </p>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap gap-2">
          {view.players.map((player) => (
            <span
              key={player.id}
              className="flex items-center gap-2 rounded-xl border-[3px] border-ink bg-paper px-3 py-1.5 font-bold"
            >
              <Avatar emoji={player.emoji} size="sm" />
              {player.name}
            </span>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
              Tu nombre
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Luis"
              maxLength={18}
              required
              autoFocus
              className="mt-2 w-full rounded-xl border-[3px] border-ink bg-paper px-4 py-3 text-lg font-bold outline-none placeholder:font-semibold placeholder:text-ink-soft/50 focus:bg-white"
            />
          </label>

          {flower && <FlowerNote name={name.trim()} />}
          <Button type="submit" disabled={busy} className="w-full py-4 text-lg">
            {busy ? "Entrando…" : "Entrar a la sala ▸"}
          </Button>
        </form>

        {view.phase !== "lobby" && (
          <p className="mt-4 rounded-lg border-2 border-ink bg-sun px-3 py-2 text-center text-sm font-bold">
            La partida ya empezó: entrarás en la rotación de turnos.
          </p>
        )}
      </div>
      {flower && <FlowerRain key={name.toLowerCase()} />}
    </Card>
  );
}
