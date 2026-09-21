"use client";

import { CATEGORY_BY_ID } from "@/lib/categories";
import type { RoundResult } from "@/lib/types";
import type { PlayerView } from "@/lib/view";
import Poster from "./Poster";
import { Avatar, Card } from "./ui";

const STATUS_LABEL: Record<RoundResult["status"], { text: string; tone: string }> = {
  won: { text: "Adivinado", tone: "text-emerald-300" },
  timeout: { text: "Sin tiempo", tone: "text-amber-300" },
  passed: { text: "Rendido", tone: "text-rose-300" },
  live: { text: "En juego", tone: "text-white/60" },
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
  const ordered = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const top = ordered[0]?.score ?? 0;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <span className="text-xs text-white/40">{players.length} jugando</span>
      </div>
      <ul className="mt-4 space-y-2">
        {ordered.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
              player.id === youId ? "bg-glow-500/15 ring-1 ring-glow-400/40" : "bg-white/5"
            }`}
          >
            <span className="w-4 text-center text-xs font-bold text-white/40">
              {index + 1}
            </span>
            <Avatar emoji={player.emoji} size="sm" ring={player.isActor} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {player.name}
                {player.isHost && <span className="ml-1 text-xs text-white/40">· anfitrión</span>}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-glow-400 to-candy-400 transition-all duration-700"
                  style={{ width: `${top > 0 ? (player.score / top) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{player.score}</p>
              {player.totalScore > 0 && (
                <p className="text-[10px] text-white/35">
                  total {player.totalScore + player.score}
                </p>
              )}
            </div>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${player.online ? "bg-mint-400" : "bg-white/20"}`}
              title={player.online ? "Conectado" : "Desconectado"}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function HistoryList({ history }: { history: RoundResult[] }) {
  if (!history.length) {
    return (
      <Card className="p-5">
        <h3 className="font-semibold tracking-tight">Historial</h3>
        <p className="mt-3 text-sm text-white/50">
          Aquí aparecerán los personajes de cada ronda con sus puntos.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold tracking-tight">Historial</h3>
        <span className="text-xs text-white/40">{history.length} rondas</span>
      </div>
      <ul className="scroll-soft mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {history.map((entry) => {
          const meta = CATEGORY_BY_ID.get(entry.category);
          const status = STATUS_LABEL[entry.status];
          return (
            <li
              key={`${entry.gameNumber}-${entry.index}-${entry.at}`}
              className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5"
            >
              <Poster
                src={entry.image}
                alt=""
                emoji={meta?.emoji ?? "🎲"}
                className="h-11 w-11 shrink-0 rounded-xl"
                emojiClassName="text-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{entry.characterName}</p>
                <p className="truncate text-xs text-white/50">
                  {entry.actorEmoji} {entry.actorName} · {meta?.label}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${status.tone}`}>{status.text}</p>
                <p className="text-xs text-white/40 tabular-nums">
                  {entry.points > 0 ? `+${entry.points}` : "0"} pts · {entry.seconds}s
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
