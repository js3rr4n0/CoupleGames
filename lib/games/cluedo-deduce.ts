/**
 * La libreta piensa contigo.
 *
 * Todo lo que aquí se deduce sale de lo que esa persona ha visto con sus
 * propios ojos: sus cartas, las que le han enseñado y quién dijo en voz alta
 * «yo no tengo ninguna de esas tres». La solución nunca se mira.
 */
import { ALL_CARDS, CARD_BY_ID } from "./cluedo-data";

export type Known = "tiene" | "no";
export type Kind = "sospechoso" | "arma" | "habitacion";

export const KINDS: Kind[] = ["sospechoso", "arma", "habitacion"];

export const KIND_LABEL: Record<Kind, string> = {
  sospechoso: "Sospechosos",
  arma: "Armas",
  habitacion: "Habitaciones",
};

export interface HistoryEntry {
  by: string;
  suspect: string;
  weapon: string;
  room: string;
  refutedBy: string | null;
  passed: string[];
  at: number;
}

export interface Deduction {
  /** `${cardId}|${playerId}` → lo que ya consta con certeza. */
  auto: Record<string, Known>;
  /** Por qué consta, para poder explicarlo en pantalla. */
  why: Record<string, string>;
  /** Carta → quién la tiene, cuando se sabe. */
  owners: Record<string, string>;
  /** Cartas que todavía podrían estar en el sobre, por tipo. */
  candidates: Record<Kind, string[]>;
  /** Cuando de un tipo solo queda una, ya es la respuesta. */
  solved: Partial<Record<Kind, string>>;
}

export function deduce(input: {
  playerIds: string[];
  me: string | null;
  nameOf: (id: string) => string;
  hand: string[];
  reveals: { from: string; card: string }[];
  history: HistoryEntry[];
  /** Las marcas puestas a mano: un ✓ también saca la carta del sobre. */
  marks: Record<string, string>;
}): Deduction {
  const { playerIds, me, nameOf, hand, reveals, history, marks } = input;
  const auto: Record<string, Known> = {};
  const why: Record<string, string> = {};
  const owners: Record<string, string> = {};

  /** Solo hay una copia de cada carta: saber quién la tiene descarta al resto. */
  function claim(card: string, owner: string, reason: string): void {
    if (owners[card]) return;
    owners[card] = owner;
    for (const id of playerIds) {
      const key = `${card}|${id}`;
      auto[key] = id === owner ? "tiene" : "no";
      why[key] = id === owner ? reason : `${reason}, así que no la tiene nadie más`;
    }
  }

  if (me) for (const card of hand) claim(card, me, "Es tuya: la tienes en la mano");
  for (const reveal of reveals)
    claim(reveal.card, reveal.from, `${nameOf(reveal.from)} te la enseñó`);

  // Quien no pudo refutar no tiene ninguna de esas tres cartas, y eso lo oyó
  // toda la mesa: se puede anotar sin hacer trampa.
  for (const entry of history) {
    for (const id of entry.passed) {
      for (const card of [entry.suspect, entry.weapon, entry.room]) {
        const key = `${card}|${id}`;
        if (auto[key]) continue;
        auto[key] = "no";
        why[key] = `${nameOf(id)} no pudo refutar esa sospecha`;
      }
    }
  }

  const candidates: Record<Kind, string[]> = {
    sospechoso: [],
    arma: [],
    habitacion: [],
  };
  for (const card of ALL_CARDS) {
    const held =
      owners[card.id] ?? playerIds.find((id) => marks[`${card.id}|${id}`] === "✓");
    if (!held) candidates[card.kind as Kind].push(card.id);
  }

  const solved: Partial<Record<Kind, string>> = {};
  for (const kind of KINDS) {
    if (candidates[kind].length === 1) solved[kind] = candidates[kind][0];
  }

  return { auto, why, owners, candidates, solved };
}

export function cardLabel(id: string): string {
  const card = CARD_BY_ID.get(id);
  return card ? `${card.emoji} ${card.name}` : id;
}
