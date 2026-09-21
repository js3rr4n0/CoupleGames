"use client";

import type { SessionView } from "@/lib/view";
import { HistoryList } from "./Scoreboard";
import { Avatar, Button, Card, Confetti } from "./ui";

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
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="animate-rise overflow-hidden p-0">
          <div className="border-b-[3px] border-ink bg-sun px-6 py-5">
            <p className="text-xs font-extrabold uppercase tracking-widest">
              Partida {view.gameNumber} terminada
            </p>
            <p className="mt-1 font-display text-4xl leading-none">
              {teamScore} puntos en equipo
            </p>
            <p className="mt-2 font-bold">
              {solved} de {gameRounds.length} personajes adivinados
            </p>
          </div>

          <ul className="space-y-3 p-6">
            {ranking.map((player, index) => (
              <li
                key={player.id}
                className={`flex items-center gap-3 rounded-xl border-[3px] border-ink p-3 ${
                  index === 0 ? "bg-sun shadow-hard-sm" : "bg-paper"
                }`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border-[3px] border-ink font-display text-xl ${
                    index === 0
                      ? "bg-white"
                      : index === 1
                        ? "bg-paper-2"
                        : "bg-white/60"
                  }`}
                >
                  {index + 1}
                </span>
                <Avatar emoji={player.emoji} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl leading-tight">
                    {player.name}
                    {player.id === view.you?.id && (
                      <span className="ml-2 text-xs font-bold text-ink-soft">(tú)</span>
                    )}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    {player.roundsPlayed} ronda(s) adivinando
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl leading-none">{player.score}</p>
                  {view.gameNumber > 1 && (
                    <p className="text-[11px] font-bold text-ink-soft">
                      acumulado {player.totalScore}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t-[3px] border-ink bg-paper-2 p-5">
            {view.you?.isHost ? (
              <Button
                onClick={() => act("rematch")}
                disabled={busy}
                className="w-full py-4 text-lg"
              >
                🔁 Revancha con personajes nuevos
              </Button>
            ) : (
              <p className="rounded-xl border-[3px] border-dashed border-ink/35 p-4 text-center font-bold text-ink-soft">
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
