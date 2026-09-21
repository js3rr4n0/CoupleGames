"use client";

import type { SessionView } from "@/lib/view";
import { HistoryList } from "./Scoreboard";
import { Avatar, Button, Card, Confetti } from "./ui";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Finished({
  view,
  act,
  busy,
}: {
  view: SessionView;
  act: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}) {
  const ranking = [...view.players].sort((a, b) => b.score - a.score);
  const teamScore = ranking.reduce((sum, p) => sum + p.score, 0);
  const gameRounds = view.history.filter((h) => h.gameNumber === view.gameNumber);
  const solved = gameRounds.filter((h) => h.status === "won").length;

  return (
    <>
      <Confetti />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="animate-rise p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
            Partida {view.gameNumber} terminada
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">
            {teamScore} puntos en equipo
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {solved} de {gameRounds.length} personajes adivinados
          </p>

          <ul className="mt-6 space-y-3">
            {ranking.map((player, index) => (
              <li
                key={player.id}
                className={`flex items-center gap-4 rounded-3xl p-4 transition ${
                  index === 0
                    ? "bg-gradient-to-r from-amber-400/25 to-amber-200/10 ring-1 ring-amber-300/40"
                    : "bg-white/5"
                }`}
              >
                <span className="w-8 text-center text-2xl">
                  {MEDALS[index] ?? index + 1}
                </span>
                <Avatar emoji={player.emoji} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">
                    {player.name}
                    {player.id === view.you?.id && (
                      <span className="ml-2 text-xs text-glow-300">(tú)</span>
                    )}
                  </p>
                  <p className="text-xs text-white/50">
                    {player.roundsPlayed} ronda(s) adivinando
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black tabular-nums">{player.score}</p>
                  {view.gameNumber > 1 && (
                    <p className="text-[11px] text-white/40">
                      acumulado {player.totalScore}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            {view.you?.isHost ? (
              <Button
                onClick={() => act("rematch")}
                disabled={busy}
                className="grow py-4 text-base"
              >
                🔁 Revancha con personajes nuevos
              </Button>
            ) : (
              <p className="grow rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                El anfitrión puede lanzar la revancha.
              </p>
            )}
          </div>
        </Card>

        <HistoryList history={view.history} />
      </div>
    </>
  );
}
