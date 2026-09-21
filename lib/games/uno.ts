import type { GameAction, GameContext, GameDefinition, Seat, Winner } from "@/lib/engine/types";
import { GameError, nameOf, shuffled } from "./util";

export type UnoColor = "rojo" | "amarillo" | "verde" | "azul";
export const COLORS: UnoColor[] = ["rojo", "amarillo", "verde", "azul"];

export type UnoKind = "numero" | "salta" | "cambio" | "mas2" | "comodin" | "mas4";

export interface UnoCard {
  id: string;
  color: UnoColor | null;
  kind: UnoKind;
  value: number | null;
}

export interface UnoState {
  order: string[];
  hands: Record<string, UnoCard[]>;
  draw: UnoCard[];
  discard: UnoCard[];
  color: UnoColor;
  turn: string;
  direction: 1 | -1;
  /** Carta recién robada que su dueño aún puede jugar o pasar. */
  pendingCardId: string | null;
  lastPlay: { by: string; card: UnoCard; color: UnoColor } | null;
  winnerId: string | null;
}

function buildDeck(): UnoCard[] {
  const cards: UnoCard[] = [];
  let n = 0;
  const add = (color: UnoColor | null, kind: UnoKind, value: number | null) =>
    cards.push({ id: `c${n++}`, color, kind, value });

  for (const color of COLORS) {
    add(color, "numero", 0);
    for (let value = 1; value <= 9; value++) {
      add(color, "numero", value);
      add(color, "numero", value);
    }
    for (const kind of ["salta", "cambio", "mas2"] as UnoKind[]) {
      add(color, kind, null);
      add(color, kind, null);
    }
  }
  for (let i = 0; i < 4; i++) {
    add(null, "comodin", null);
    add(null, "mas4", null);
  }
  return cards;
}

export function cardLabel(card: UnoCard): string {
  if (card.kind === "numero") return String(card.value);
  if (card.kind === "salta") return "Salta";
  if (card.kind === "cambio") return "Cambio";
  if (card.kind === "mas2") return "+2";
  if (card.kind === "mas4") return "+4";
  return "Comodín";
}

function playable(card: UnoCard, top: UnoCard, color: UnoColor): boolean {
  if (card.kind === "comodin" || card.kind === "mas4") return true;
  if (card.color === color) return true;
  if (card.kind === "numero" && top.kind === "numero") return card.value === top.value;
  return card.kind === top.kind && card.kind !== "numero";
}

function refill(state: UnoState): void {
  if (state.draw.length > 0) return;
  const top = state.discard[state.discard.length - 1];
  const rest = state.discard.slice(0, -1);
  if (!rest.length) return;
  state.draw = shuffled(
    rest.map((card) =>
      card.kind === "comodin" || card.kind === "mas4" ? { ...card, color: null } : card,
    ),
  );
  state.discard = [top];
}

function drawCards(state: UnoState, playerId: string, count: number): UnoCard[] {
  const taken: UnoCard[] = [];
  for (let i = 0; i < count; i++) {
    refill(state);
    const card = state.draw.pop();
    if (!card) break;
    taken.push(card);
  }
  state.hands[playerId] = [...state.hands[playerId], ...taken];
  return taken;
}

function seatAfter(state: UnoState, from: string, step = 1): string {
  const index = state.order.indexOf(from);
  const size = state.order.length;
  return state.order[(((index + step * state.direction) % size) + size) % size];
}

export const uno: GameDefinition<UnoState> = {
  id: "uno",
  name: "UNO",
  emoji: "🃏",
  tagline: "Colores, números y mucha mala idea",
  description:
    "Deshazte de todas tus cartas. Solo tú ves tu mano; el resto sabe cuántas te quedan.",
  chip: "bg-bubblegum text-ink",
  min: 2,
  max: 8,
  minutes: "10-20 min",
  rules: [
    {
      title: "Cómo se juega",
      items: [
        "Cada quien empieza con 7 cartas y solo ve las suyas.",
        "En tu turno juegas una carta que coincida en color, en número o en símbolo con la de arriba del montón.",
        "Los comodines se pueden jugar siempre y tú eliges el color que sigue.",
      ],
    },
    {
      title: "Cartas especiales",
      items: [
        "Salta: quien va después pierde el turno.",
        "Cambio de sentido: se invierte el orden (con dos jugadores funciona como Salta).",
        "+2 y +4: la siguiente persona roba esas cartas y pierde el turno.",
      ],
    },
    {
      title: "Si no puedes jugar",
      items: [
        "Robas una carta. Si esa carta sirve, puedes jugarla en el momento o pasar.",
        "Cuando el mazo se acaba, se baraja el montón de descarte y se sigue.",
        "Al quedarte con una sola carta, la mesa canta tu ¡UNO! automáticamente.",
      ],
    },
    { title: "Victoria", items: ["Gana quien se queda sin cartas."] },
  ],

  create(players: Seat[]): UnoState {
    const order = players.map((p) => p.id);
    const deck = shuffled(buildDeck());
    const hands: Record<string, UnoCard[]> = {};
    for (const id of order) hands[id] = deck.splice(0, 7);

    // La primera carta siempre es un número: así nadie empieza castigado.
    let firstIndex = deck.findIndex((card) => card.kind === "numero");
    if (firstIndex < 0) firstIndex = 0;
    const [first] = deck.splice(firstIndex, 1);

    return {
      order,
      hands,
      draw: deck,
      discard: [first],
      color: (first.color ?? "rojo") as UnoColor,
      turn: order[0],
      direction: 1,
      pendingCardId: null,
      lastPlay: null,
      winnerId: null,
    };
  },

  act(state, action: GameAction, ctx: GameContext): UnoState {
    if (state.winnerId) throw new GameError("La partida ya terminó.");
    if (!state.order.includes(ctx.playerId)) throw new GameError("No estás en la partida.", 403);
    if (state.turn !== ctx.playerId) throw new GameError("No es tu turno.", 403);

    const next: UnoState = {
      ...state,
      hands: { ...state.hands, [ctx.playerId]: [...state.hands[ctx.playerId]] },
      draw: [...state.draw],
      discard: [...state.discard],
    };
    const me = ctx.playerId;
    const myName = nameOf(ctx.players, me);

    if (action.type === "robar") {
      if (next.pendingCardId) throw new GameError("Ya robaste: juega esa carta o pasa.");
      const [card] = drawCards(next, me, 1);
      if (!card) throw new GameError("No quedan cartas para robar.");
      ctx.log(`${myName} roba una carta`, "🫴");
      const top = next.discard[next.discard.length - 1];
      if (playable(card, top, next.color)) {
        next.pendingCardId = card.id;
        return next;
      }
      next.turn = seatAfter(next, me);
      return next;
    }

    if (action.type === "pasar") {
      if (!next.pendingCardId) throw new GameError("Solo puedes pasar después de robar.");
      next.pendingCardId = null;
      next.turn = seatAfter(next, me);
      ctx.log(`${myName} pasa`, "➡️");
      return next;
    }

    if (action.type !== "jugar") throw new GameError("Acción desconocida.");

    const cardId = String(action.cardId);
    if (next.pendingCardId && next.pendingCardId !== cardId)
      throw new GameError("Acabas de robar: solo puedes jugar esa carta o pasar.");

    const hand = next.hands[me];
    const index = hand.findIndex((c) => c.id === cardId);
    if (index < 0) throw new GameError("Esa carta no está en tu mano.");
    const card = hand[index];
    const top = next.discard[next.discard.length - 1];
    if (!playable(card, top, next.color))
      throw new GameError("Esa carta no encaja con el color ni con el símbolo.");

    let color = card.color ?? next.color;
    if (card.kind === "comodin" || card.kind === "mas4") {
      const chosen = String(action.color ?? "");
      if (!COLORS.includes(chosen as UnoColor))
        throw new GameError("Elige un color para el comodín.");
      color = chosen as UnoColor;
    }

    hand.splice(index, 1);
    next.discard.push(card);
    next.color = color;
    next.pendingCardId = null;
    next.lastPlay = { by: me, card, color };
    ctx.log(`${myName} juega ${cardLabel(card)} ${color}`, "🃏");

    if (!hand.length) {
      next.winnerId = me;
      next.turn = me;
      return next;
    }
    if (hand.length === 1) ctx.log(`¡${myName} canta UNO!`, "🔔");

    const victim = seatAfter(next, me);
    if (card.kind === "salta") {
      ctx.log(`${nameOf(ctx.players, victim)} pierde el turno`, "⛔");
      next.turn = seatAfter(next, victim);
    } else if (card.kind === "cambio") {
      next.direction = (next.direction * -1) as 1 | -1;
      ctx.log("Cambia el sentido de la mesa", "🔄");
      next.turn =
        next.order.length === 2 ? me : seatAfter(next, me);
    } else if (card.kind === "mas2" || card.kind === "mas4") {
      const amount = card.kind === "mas2" ? 2 : 4;
      next.hands[victim] = [...next.hands[victim]];
      drawCards(next, victim, amount);
      ctx.log(
        `${nameOf(ctx.players, victim)} roba ${amount} y pierde el turno`,
        "💣",
      );
      next.turn = seatAfter(next, victim);
    } else {
      next.turn = victim;
    }

    return next;
  },

  view(state, playerId, players) {
    const top = state.discard[state.discard.length - 1];
    return {
      order: state.order,
      turn: state.turn,
      direction: state.direction,
      color: state.color,
      top,
      drawCount: state.draw.length,
      discardCount: state.discard.length,
      lastPlay: state.lastPlay,
      winnerId: state.winnerId,
      pendingCardId:
        playerId && state.turn === playerId ? state.pendingCardId : null,
      // Cada quien ve su mano; del resto, solo cuántas cartas llevan.
      hand: playerId ? (state.hands[playerId] ?? []) : [],
      playable: playerId
        ? (state.hands[playerId] ?? [])
            .filter((card) => playable(card, top, state.color))
            .map((card) => card.id)
        : [],
      rivals: state.order
        .filter((id) => id !== playerId)
        .map((id) => ({
          id,
          name: nameOf(players, id),
          cards: state.hands[id]?.length ?? 0,
        })),
      counts: Object.fromEntries(
        state.order.map((id) => [id, state.hands[id]?.length ?? 0]),
      ),
    };
  },

  /**
   * Robot con sentido común: guarda los comodines para el final, castiga a
   * quien va ganando y elige el color del que más cartas tiene.
   */
  bot(state, playerId): GameAction | null {
    if (state.winnerId || state.turn !== playerId) return null;
    const hand = state.hands[playerId] ?? [];
    const top = state.discard[state.discard.length - 1];

    const bestColor = (): UnoColor => {
      const tally: Record<string, number> = {};
      for (const card of hand) if (card.color) tally[card.color] = (tally[card.color] ?? 0) + 1;
      const sorted = COLORS.filter((color) => tally[color]).sort(
        (a, b) => (tally[b] ?? 0) - (tally[a] ?? 0),
      );
      return sorted[0] ?? COLORS[Math.floor(Math.random() * COLORS.length)];
    };

    if (state.pendingCardId) {
      const drawn = hand.find((card) => card.id === state.pendingCardId);
      if (drawn && playable(drawn, top, state.color)) {
        return drawn.kind === "comodin" || drawn.kind === "mas4"
          ? { type: "jugar", cardId: drawn.id, color: bestColor() }
          : { type: "jugar", cardId: drawn.id };
      }
      return { type: "pasar" };
    }

    const options = hand.filter((card) => playable(card, top, state.color));
    if (!options.length) return { type: "robar" };

    // ¿Alguien está a punto de cantar UNO? Entonces toca fastidiar.
    const nextId = seatAfter(state, playerId);
    const nextIsClose = (state.hands[nextId]?.length ?? 9) <= 2;

    const score = (card: UnoCard): number => {
      if (card.kind === "mas4") return nextIsClose ? 95 : 10;
      if (card.kind === "comodin") return 15;
      if (card.kind === "mas2") return nextIsClose ? 90 : 70;
      if (card.kind === "salta") return nextIsClose ? 85 : 65;
      if (card.kind === "cambio") return 60;
      return 40 + (card.value ?? 0);
    };

    const choice = [...options].sort((a, b) => score(b) - score(a))[0];
    return choice.kind === "comodin" || choice.kind === "mas4"
      ? { type: "jugar", cardId: choice.id, color: bestColor() }
      : { type: "jugar", cardId: choice.id };
  },

  winner(state): Winner | null {
    return state.winnerId ? { ids: [state.winnerId], label: "¡Se quedó sin cartas!" } : null;
  },
};
