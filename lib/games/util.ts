import { GameError } from "@/lib/game";
import type { GameContext, Seat } from "@/lib/engine/types";

export { GameError };

export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function roll(sides = 6): number {
  return 1 + Math.floor(Math.random() * sides);
}

export function nameOf(players: Seat[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "alguien";
}

export function emojiOf(players: Seat[], id: string): string {
  return players.find((p) => p.id === id)?.emoji ?? "🎲";
}

/** Lanza si no es el turno de quien intenta jugar. */
export function requireTurn(turn: string, ctx: GameContext): void {
  if (turn !== ctx.playerId) throw new GameError("No es tu turno.", 403);
}

export function nextSeat(order: string[], current: string, step = 1): string {
  const index = order.indexOf(current);
  const size = order.length;
  return order[(((index + step) % size) + size) % size];
}
