import { normalize } from "./text";

/**
 * Un guiño para unas cuantas personas: si te llamas así, la sala te recibe con
 * una flor amarilla.
 */
const FLOWER_NAMES = [
  "ari",
  "ariana",
  "arianita",
  "mary",
  "mari",
  "mar",
  "marie",
  "arkytior",
];

export const FLOWER_EMOJI = "🌼";
export const FLOWER_MESSAGE = "¡Feliz día de las flores amarillas! 🤭";

/** Sin distinguir mayúsculas ni acentos: Ari, ARI, Arí o arianita valen igual. */
export function hasYellowFlower(name: string): boolean {
  return FLOWER_NAMES.includes(normalize(name));
}
