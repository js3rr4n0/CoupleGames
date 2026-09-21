import type { GameDefinition, GameId } from "@/lib/engine/types";
import { conecta4 } from "./conecta4";
import { batalla } from "./batalla";
import { uno } from "./uno";
import { cluedo } from "./cluedo";
import { monopolio } from "./monopolio";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const GAMES: Record<GameId, GameDefinition<any>> = {
  conecta4,
  "batalla-naval": batalla,
  uno,
  cluedo,
  monopolio,
};

export const GAME_LIST = Object.values(GAMES).map((game) => ({
  id: game.id,
  name: game.name,
  emoji: game.emoji,
  tagline: game.tagline,
  description: game.description,
  chip: game.chip,
  min: game.min,
  max: game.max,
  minutes: game.minutes,
  rules: game.rules,
}));

export function isGameId(value: string): value is GameId {
  return value in GAMES;
}
