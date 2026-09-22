import type { GameAction, GameContext, GameDefinition, Seat, Winner } from "@/lib/engine/types";
import { GameError, nameOf, roll, shuffled } from "./util";
import type { CluedoCard } from "./cluedo-data";
import {
  ALL_CARDS,
  CARD_BY_ID,
  DOORS,
  PASSAGES,
  ROOMS,
  SUSPECTS,
  WEAPONS,
} from "./cluedo-data";

export * from "./cluedo-data";

function neighbours(room: string): string[] {
  const doors = DOORS[room] ?? [];
  const secret = PASSAGES[room];
  return secret ? [...doors, secret] : doors;
}

function reachableRooms(from: string, steps: number): string[] {
  const seen = new Map<string, number>([[from, 0]]);
  const queue: string[] = [from];
  while (queue.length) {
    const current = queue.shift()!;
    const distance = seen.get(current)!;
    if (distance >= steps) continue;
    for (const next of neighbours(current)) {
      if (!seen.has(next)) {
        seen.set(next, distance + 1);
        queue.push(next);
      }
    }
  }
  seen.delete(from);
  return [...seen.keys()];
}

export interface Suggestion {
  by: string;
  suspect: string;
  weapon: string;
  room: string;
  /** A quién le toca refutar ahora mismo. */
  askingId: string | null;
  asked: string[];
  refutedBy: string | null;
  /** La carta enseñada solo viaja a quien hizo la sugerencia. */
  shownCard: string | null;
}

export interface CluedoState {
  order: string[];
  solution: { suspect: string; weapon: string; room: string };
  hands: Record<string, string[]>;
  positions: Record<string, string>;
  weaponRooms: Record<string, string>;
  turn: string;
  stage: "tirar" | "mover" | "sugerir" | "refutar" | "fin";
  die: number | null;
  reachable: string[];
  suggestion: Suggestion | null;
  history: {
    by: string;
    suspect: string;
    weapon: string;
    room: string;
    refutedBy: string | null;
    /** Quiénes dijeron «yo no tengo ninguna»: eso lo ve toda la mesa. */
    passed: string[];
    at: number;
  }[];
  /** Cartas que le han enseñado a cada quien: privadísimo. */
  reveals: Record<string, { from: string; card: string; at: number }[]>;
  out: string[];
  winnerId: string | null;
}

function alivePlayers(state: CluedoState): string[] {
  return state.order.filter((id) => !state.out.includes(id));
}

function advanceTurn(state: CluedoState): void {
  const order = state.order;
  let index = order.indexOf(state.turn);
  for (let i = 0; i < order.length; i++) {
    index = (index + 1) % order.length;
    if (!state.out.includes(order[index])) break;
  }
  state.turn = order[index];
  state.stage = "tirar";
  state.die = null;
  state.reachable = [];
}

function askNext(state: CluedoState, ctx: GameContext): void {
  const suggestion = state.suggestion;
  if (!suggestion) return;
  const order = state.order;
  const start = order.indexOf(suggestion.by);
  const cards = [suggestion.suspect, suggestion.weapon, suggestion.room];

  for (let step = 1; step < order.length; step++) {
    const candidate = order[(start + step) % order.length];
    if (suggestion.asked.includes(candidate)) continue;
    suggestion.asked.push(candidate);
    const hand = state.hands[candidate] ?? [];
    const matches = cards.filter((card) => hand.includes(card));
    if (!matches.length) continue;
    if (matches.length === 1) {
      suggestion.refutedBy = candidate;
      suggestion.shownCard = matches[0];
      state.reveals[suggestion.by] = [
        ...(state.reveals[suggestion.by] ?? []),
        { from: candidate, card: matches[0], at: Date.now() },
      ];
      ctx.log(
        `${nameOf(ctx.players, candidate)} le enseña una carta a ${nameOf(ctx.players, suggestion.by)}`,
        "🤫",
      );
      state.history.push({
        by: suggestion.by,
        suspect: suggestion.suspect,
        weapon: suggestion.weapon,
        room: suggestion.room,
        refutedBy: candidate,
        passed: suggestion.asked.filter((id) => id !== candidate),
        at: Date.now(),
      });
      state.suggestion = null;
      advanceTurn(state);
      return;
    }
    // Tiene varias: elige cuál enseñar.
    suggestion.askingId = candidate;
    state.stage = "refutar";
    return;
  }

  ctx.log("Nadie puede refutar la sospecha", "😶");
  state.history.push({
    by: suggestion.by,
    suspect: suggestion.suspect,
    weapon: suggestion.weapon,
    room: suggestion.room,
    refutedBy: null,
    passed: [...suggestion.asked],
    at: Date.now(),
  });
  state.suggestion = null;
  advanceTurn(state);
}

export const cluedo: GameDefinition<CluedoState> = {
  id: "cluedo",
  name: "Cluedo",
  emoji: "🕵️",
  tagline: "Quién, con qué y dónde",
  description:
    "Un crimen, tres cartas escondidas y una libreta para ir tachando. Solo tú ves tu mano.",
  chip: "bg-grape text-white",
  min: 3,
  max: 6,
  minutes: "20-30 min",
  rules: [
    {
      title: "El crimen",
      items: [
        "Se apartan en secreto un sospechoso, un arma y una habitación: esa es la solución.",
        "Las otras 18 cartas se reparten entre los jugadores. Solo ves las tuyas.",
      ],
    },
    {
      title: "Tu turno",
      items: [
        "Tiras el dado y te mueves a cualquier habitación a esa distancia o menos.",
        "Las esquinas opuestas están unidas por pasadizos secretos: siempre están a un paso.",
        "Al entrar en una habitación puedes sospechar: eliges sospechoso y arma; la habitación es donde estás.",
      ],
    },
    {
      title: "Refutar",
      items: [
        "Siguiendo el orden de la mesa, la primera persona que tenga alguna de las tres cartas debe enseñarte una.",
        "La mesa ve quién te refutó, pero solo tú ves qué carta era.",
        "Si nadie puede refutar, esa combinación se pone muy interesante.",
      ],
    },
    {
      title: "Acusación",
      items: [
        "En tu turno puedes acusar: si aciertas las tres cartas, ganas.",
        "Si fallas, quedas fuera de la investigación, aunque sigues refutando a los demás.",
      ],
    },
    {
      title: "Tu libreta",
      items: [
        "La cuadrícula de abajo es tuya y nadie más la ve: marca ✓ lo confirmado, ✗ lo descartado y ? lo dudoso.",
        "Lo que ya se sabe seguro se marca solo y sale con candado: tus cartas, las que te enseñan y quien no pudo refutar.",
        "Arriba, el sobre va contando cuántas cartas quedan por tipo. Cuando solo queda una, esa es.",
      ],
    },
  ],

  create(players: Seat[]): CluedoState {
    const order = players.map((p) => p.id);
    const solution = {
      suspect: shuffled(SUSPECTS)[0].id,
      weapon: shuffled(WEAPONS)[0].id,
      room: shuffled(ROOMS)[0].id,
    };
    const deck = shuffled(
      ALL_CARDS.map((card) => card.id).filter(
        (id) => id !== solution.suspect && id !== solution.weapon && id !== solution.room,
      ),
    );
    const hands: Record<string, string[]> = Object.fromEntries(
      order.map((id) => [id, [] as string[]]),
    );
    deck.forEach((card, index) => hands[order[index % order.length]].push(card));

    const startRooms = ["vestibulo", "estudio", "cocina", "invernadero", "salon", "biblioteca"];
    const positions = Object.fromEntries(
      order.map((id, index) => [id, startRooms[index % startRooms.length]]),
    );
    const weaponRooms = Object.fromEntries(
      WEAPONS.map((weapon, index) => [weapon.id, ROOMS[index % ROOMS.length].id]),
    );

    return {
      order,
      solution,
      hands,
      positions,
      weaponRooms,
      turn: order[0],
      stage: "tirar",
      die: null,
      reachable: [],
      suggestion: null,
      history: [],
      reveals: Object.fromEntries(order.map((id) => [id, []])),
      out: [],
      winnerId: null,
    };
  },

  act(state, action: GameAction, ctx: GameContext): CluedoState {
    const next: CluedoState = JSON.parse(JSON.stringify(state)) as CluedoState;
    const me = ctx.playerId;
    if (!next.order.includes(me)) throw new GameError("No estás en la partida.", 403);
    const myName = nameOf(ctx.players, me);

    if (action.type === "refutar") {
      const suggestion = next.suggestion;
      if (!suggestion || suggestion.askingId !== me)
        throw new GameError("Ahora mismo no te toca refutar.", 403);
      const card = String(action.cardId);
      const options = [suggestion.suspect, suggestion.weapon, suggestion.room];
      if (!options.includes(card) || !(next.hands[me] ?? []).includes(card))
        throw new GameError("Esa carta no sirve para refutar.");
      suggestion.refutedBy = me;
      suggestion.shownCard = card;
      suggestion.askingId = null;
      next.reveals[suggestion.by] = [
        ...(next.reveals[suggestion.by] ?? []),
        { from: me, card, at: Date.now() },
      ];
      ctx.log(`${myName} le enseña una carta a ${nameOf(ctx.players, suggestion.by)}`, "🤫");
      next.history.push({
        by: suggestion.by,
        suspect: suggestion.suspect,
        weapon: suggestion.weapon,
        room: suggestion.room,
        refutedBy: me,
        passed: suggestion.asked.filter((id) => id !== me),
        at: Date.now(),
      });
      next.suggestion = null;
      advanceTurn(next);
      return next;
    }

    if (next.turn !== me) throw new GameError("No es tu turno.", 403);
    if (next.out.includes(me)) throw new GameError("Ya estás fuera de la investigación.", 403);

    if (action.type === "tirar") {
      if (next.stage !== "tirar") throw new GameError("Ya tiraste el dado.");
      const value = roll();
      next.die = value;
      next.reachable = reachableRooms(next.positions[me], value);
      next.stage = "mover";
      ctx.log(`${myName} saca un ${value}`, "🎲");
      return next;
    }

    if (action.type === "mover") {
      if (next.stage !== "mover") throw new GameError("Primero tira el dado.");
      const room = String(action.room);
      if (!next.reachable.includes(room))
        throw new GameError("Esa habitación queda demasiado lejos para este dado.");
      next.positions[me] = room;
      next.stage = "sugerir";
      ctx.log(`${myName} entra en ${CARD_BY_ID.get(room)?.name}`, "👣");
      return next;
    }

    if (action.type === "sugerir") {
      if (next.stage !== "sugerir")
        throw new GameError("Primero muévete a una habitación.");
      const suspect = String(action.suspect);
      const weapon = String(action.weapon);
      if (!SUSPECTS.some((s) => s.id === suspect) || !WEAPONS.some((w) => w.id === weapon))
        throw new GameError("Elige un sospechoso y un arma.");
      const room = next.positions[me];
      next.weaponRooms[weapon] = room;
      next.suggestion = {
        by: me,
        suspect,
        weapon,
        room,
        askingId: null,
        asked: [],
        refutedBy: null,
        shownCard: null,
      };
      ctx.log(
        `${myName} sospecha: ${CARD_BY_ID.get(suspect)?.name} con ${CARD_BY_ID.get(weapon)?.name} en ${CARD_BY_ID.get(room)?.name}`,
        "❓",
      );
      askNext(next, ctx);
      return next;
    }

    if (action.type === "pasar") {
      if (next.stage !== "sugerir") throw new GameError("Todavía no puedes pasar turno.");
      advanceTurn(next);
      ctx.log(`${myName} se guarda la sospecha`, "🤐");
      return next;
    }

    if (action.type === "acusar") {
      if (next.stage === "refutar") throw new GameError("Espera a que se resuelva la refutación.");
      const suspect = String(action.suspect);
      const weapon = String(action.weapon);
      const room = String(action.room);
      const right =
        suspect === next.solution.suspect &&
        weapon === next.solution.weapon &&
        room === next.solution.room;
      ctx.log(
        `${myName} acusa: ${CARD_BY_ID.get(suspect)?.name} con ${CARD_BY_ID.get(weapon)?.name} en ${CARD_BY_ID.get(room)?.name}`,
        "⚖️",
      );
      if (right) {
        next.winnerId = me;
        next.stage = "fin";
        ctx.log("¡Caso resuelto!", "🎉");
        return next;
      }
      next.out.push(me);
      ctx.log(`${myName} se equivoca y queda fuera de la investigación`, "💀");
      if (alivePlayers(next).length === 1) {
        next.winnerId = alivePlayers(next)[0];
        next.stage = "fin";
        ctx.log("Solo queda una persona investigando: gana por descarte", "🏅");
        return next;
      }
      advanceTurn(next);
      return next;
    }

    throw new GameError("Acción desconocida.");
  },

  view(state, playerId, players) {
    const suggestion = state.suggestion;
    return {
      order: state.order,
      turn: state.turn,
      stage: state.stage,
      die: state.die,
      reachable: state.turn === playerId ? state.reachable : [],
      positions: state.positions,
      weaponRooms: state.weaponRooms,
      out: state.out,
      winnerId: state.winnerId,
      history: state.history.slice(-12).reverse(),
      // Tu mano y lo que te han enseñado: solo tuyo.
      hand: playerId ? (state.hands[playerId] ?? []) : [],
      reveals: playerId ? (state.reveals[playerId] ?? []) : [],
      handCounts: Object.fromEntries(
        state.order.map((id) => [id, state.hands[id]?.length ?? 0]),
      ),
      suggestion: suggestion
        ? {
            by: suggestion.by,
            byName: nameOf(players, suggestion.by),
            suspect: suggestion.suspect,
            weapon: suggestion.weapon,
            room: suggestion.room,
            askingId: suggestion.askingId,
            // A quién se le ha preguntado ya: público, como en la mesa de verdad.
            asked: suggestion.asked,
            // Si te toca refutar, aquí van solo TUS cartas que encajan.
            options:
              playerId && suggestion.askingId === playerId
                ? [suggestion.suspect, suggestion.weapon, suggestion.room].filter((card) =>
                    (state.hands[playerId] ?? []).includes(card),
                  )
                : [],
          }
        : null,
      solution:
        state.winnerId || state.stage === "fin" ? state.solution : null,
    };
  },

  /**
   * Robot detective. Deduce solo con lo que vería en su silla: sus cartas y las
   * que le han enseñado. Nunca mira la solución ni las manos ajenas.
   */
  bot(state, playerId): GameAction | null {
    if (state.winnerId || state.stage === "fin") return null;

    // Refutar no depende del turno.
    const suggestion = state.suggestion;
    if (suggestion?.askingId === playerId) {
      const hand = state.hands[playerId] ?? [];
      const options = [suggestion.suspect, suggestion.weapon, suggestion.room].filter(
        (card) => hand.includes(card),
      );
      if (!options.length) return null;
      // Enseña siempre la misma carta a la misma persona, como haría cualquiera.
      const pick =
        options[suggestion.by.charCodeAt(suggestion.by.length - 1) % options.length];
      return { type: "refutar", cardId: pick };
    }

    if (state.turn !== playerId || state.out.includes(playerId)) return null;

    const known = new Set([
      ...(state.hands[playerId] ?? []),
      ...(state.reveals[playerId] ?? []).map((reveal) => reveal.card),
    ]);
    const openOnes = (cards: CluedoCard[]) =>
      cards.map((card) => card.id).filter((id) => !known.has(id));

    const suspects = openOnes(SUSPECTS);
    const weapons = openOnes(WEAPONS);
    const rooms = openOnes(ROOMS);

    // Si solo queda una combinación posible, se juega el todo por el todo.
    if (
      suspects.length === 1 &&
      weapons.length === 1 &&
      rooms.length === 1 &&
      state.stage !== "refutar"
    ) {
      return {
        type: "acusar",
        suspect: suspects[0],
        weapon: weapons[0],
        room: rooms[0],
      };
    }

    if (state.stage === "tirar") return { type: "tirar" };

    if (state.stage === "mover") {
      const wanted = state.reachable.filter((room) => rooms.includes(room));
      const pool = wanted.length ? wanted : state.reachable;
      if (!pool.length) return null;
      return { type: "mover", room: pool[Math.floor(Math.random() * pool.length)] };
    }

    if (state.stage === "sugerir") {
      const suspect =
        suspects[Math.floor(Math.random() * suspects.length)] ?? SUSPECTS[0].id;
      const weapon =
        weapons[Math.floor(Math.random() * weapons.length)] ?? WEAPONS[0].id;
      return { type: "sugerir", suspect, weapon };
    }

    return null;
  },

  winner(state): Winner | null {
    return state.winnerId
      ? { ids: [state.winnerId], label: "¡Caso resuelto!" }
      : null;
  },
};
