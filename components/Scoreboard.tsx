"use client";

import { CATEGORY_BY_ID } from "@/lib/categories";
import type { RoundResult } from "@/lib/types";
import type { PlayerView } from "@/lib/view";
import Poster from "./Poster";
import { Avatar, Card } from "./ui";

const STATUS_LABEL: Record<RoundResult["status"], { text: string; tone: string }> = {
  won: { text: "Adivinado", tone: "bg-grass text-white" },
  timeout: { text: "Sin tiempo", tone: "bg-sun text-ink" },
  passed: { text: "Rendido", tone: "bg-tomato text-white" },
  live: { text: "En juego", tone: "bg-white text-ink" },
};

export function Scoreboard({
  players,
  youId,
  title = "Puntuaciones",
}: {
  players: PlayerView[];
  youId: string | null;
  title?: string;
}) {
  const ordered = [...players].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-[3px] border-ink bg-grape px-5 py-3 text-white">
        <h3 className="font-display text-xl">{title}</h3>
        <span className="text-xs font-extrabold uppercase tracking-widest">
          {players.length} jugando
        </span>
      </div>
      <ul className="space-y-2 p-4">
        {ordered.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center gap-3 rounded-xl border-[3px] border-ink px-3 py-2 ${
              player.id === youId ? "bg-sun" : "bg-paper"
            }`}
          >
            <span className="w-4 text-center font-display text-sm text-ink-soft">
              {index + 1}
            </span>
            <Avatar emoji={player.emoji} size="sm" active={player.isActor} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold leading-tight">
                {player.name}
                {player.isHost && (
                  <span className="ml-1 text-[11px] font-bold uppercase text-ink-soft">
                    anfitrión
                  </span>
                )}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                {player.isActor ? "adivinando ahora" : player.online ? "en la mesa" : "ausente"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl leading-none tabular-nums">
                {player.score}
              </p>
              {player.totalScore > 0 && (
                <p className="text-[10px] font-bold text-ink-soft">
                  total {player.totalScore + player.score}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function HistoryList({ history }: { history: RoundResult[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-[3px] border-ink bg-sky px-5 py-3 text-white">
        <h3 className="font-display text-xl">Historial</h3>
        <span className="text-xs font-extrabold uppercase tracking-widest">
          {history.length} ronda(s)
        </span>
      </div>

      {history.length === 0 ? (
        <p className="p-5 font-semibold text-ink-soft">
          Aquí se apuntan los personajes de cada ronda con sus puntos.
        </p>
      ) : (
        <ul className="scroll-soft max-h-80 space-y-2 overflow-y-auto p-4">
          {history.map((entry) => {
            const meta = CATEGORY_BY_ID.get(entry.category);
            const status = STATUS_LABEL[entry.status];
            return (
              <li
                key={`${entry.gameNumber}-${entry.index}-${entry.at}`}
                className="flex items-center gap-3 rounded-xl border-[3px] border-ink bg-paper p-2"
              >
                <Poster
                  src={entry.image}
                  alt=""
                  emoji={meta?.emoji ?? "🎲"}
                  className="h-12 w-12 shrink-0 rounded-lg"
                  emojiClassName="text-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold leading-tight">
                    {entry.characterName}
                  </p>
                  <p className="truncate text-xs font-bold text-ink-soft">
                    {entry.actorEmoji} {entry.actorName} · {meta?.label}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block rounded-md border-2 border-ink px-2 py-0.5 text-[11px] font-extrabold ${status.tone}`}
                  >
                    {status.text}
                  </span>
                  <p className="mt-1 text-xs font-bold tabular-nums text-ink-soft">
                    {entry.points > 0 ? `+${entry.points}` : "0"} pts · {entry.seconds}s
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
