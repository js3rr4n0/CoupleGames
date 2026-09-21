import { GAMES } from "@/lib/games/registry";
import { seatsOf } from "./room";
import type { GameContext, LogEntry, Room } from "./types";
import { newId } from "./store";

/** Lo que tarda un robot en "pensar" antes de mover (ajustable para pruebas). */
const THINK_MS = Number(process.env.COUPLEGAMES_BOT_MS ?? 900);
const MAX_CHAIN = 40;

export function hasBots(room: Room): boolean {
  return room.players.some((player) => player.isBot);
}

/**
 * Mueve a los robots que tengan algo que hacer. Se llama en cada petición, así
 * que no hacen falta temporizadores: el robot juega en cuanto pasa su pausa.
 */
export function runBots(room: Room): boolean {
  if (room.phase !== "playing" || !room.state) return false;
  const game = GAMES[room.gameId];
  if (!game.bot) return false;

  const bots = room.players.filter((player) => player.isBot);
  if (!bots.length) return false;

  let moved = false;

  for (let step = 0; step < MAX_CHAIN; step++) {
    const seats = seatsOf(room);
    let acted = false;

    for (const bot of bots) {
      if (room.phase !== "playing" || !room.state) break;
      const action = game.bot(room.state, bot.id, seats);
      if (!action) continue;

      // La primera vez que le toca, el robot "piensa" un momento.
      if (Date.now() < room.botThinkingUntil) return moved;
      room.botThinkingUntil = Date.now() + THINK_MS;

      const ctx: GameContext = {
        players: seats,
        playerId: bot.id,
        log: (text, emoji) => {
          const entry: LogEntry = { id: newId("l"), at: Date.now(), text, emoji };
          room.log.unshift(entry);
          room.log = room.log.slice(0, 60);
        },
      };

      try {
        room.state = game.act(room.state, action, ctx);
      } catch {
        // Si el robot se equivoca de jugada, se queda quieto antes que romper
        // la partida; en el siguiente tick lo vuelve a intentar.
        return moved;
      }

      acted = true;
      moved = true;

      const winner = game.winner(room.state);
      if (winner) {
        room.phase = "finished";
        for (const id of winner.ids) {
          const champion = room.players.find((player) => player.id === id);
          if (champion) champion.wins += 1;
        }
        room.log.unshift({
          id: newId("l"),
          at: Date.now(),
          text: winner.label,
          emoji: "🏆",
        });
        return moved;
      }
      break;
    }

    if (!acted) break;
  }

  return moved;
}
