import type { GameAction, GameContext, GameDefinition, Seat, Winner } from "@/lib/engine/types";
import { GameError, nameOf, roll, shuffled } from "./util";
import {
  BOARD,
  CAJA,
  GROUP_SIZE,
  SUERTE,
  type ChanceCard,
} from "./monopolio-board";

const START_CASH = 1500;
const JAIL = 10;
const BAIL = 50;

export interface PropertyState {
  owner: string | null;
  houses: number;
  mortgaged: boolean;
}

export interface Trade {
  from: string;
  to: string;
  give: number[];
  get: number[];
  giveCash: number;
  getCash: number;
}

export interface MonoState {
  order: string[];
  cash: Record<string, number>;
  positions: Record<string, number>;
  /** Turnos que lleva en la cárcel, o -1 si está libre. */
  jail: Record<string, number>;
  jailCards: Record<string, number>;
  props: Record<number, PropertyState>;
  turn: string;
  stage: "tirar" | "comprar" | "gestion" | "deuda" | "fin";
  dice: [number, number] | null;
  doubles: number;
  lastCard: { deck: "suerte" | "caja"; text: string } | null;
  debt: { from: string; to: string | null; amount: number } | null;
  trade: Trade | null;
  decks: { suerte: string[]; caja: string[] };
  out: string[];
  winnerId: string | null;
  moved: { by: string; from: number; to: number; at: number } | null;
}

const CARD_BY_ID = new Map<string, ChanceCard>(
  [...SUERTE, ...CAJA].map((card) => [card.id, card]),
);

function ownedBy(state: MonoState, playerId: string): number[] {
  return Object.entries(state.props)
    .filter(([, prop]) => prop.owner === playerId)
    .map(([index]) => Number(index));
}

function ownsGroup(state: MonoState, playerId: string, group: string): boolean {
  const spaces = BOARD.filter((space) => space.group === group);
  return spaces.every((space) => state.props[space.i]?.owner === playerId);
}

export function netWorth(state: MonoState, playerId: string): number {
  return ownedBy(state, playerId).reduce((total, index) => {
    const space = BOARD[index];
    const prop = state.props[index];
    const base = prop.mortgaged ? (space.price ?? 0) / 2 : (space.price ?? 0);
    return total + base + prop.houses * ((space.houseCost ?? 0) / 2);
  }, state.cash[playerId] ?? 0);
}

function rentFor(state: MonoState, index: number, diceSum: number): number {
  const space = BOARD[index];
  const prop = state.props[index];
  if (!prop?.owner || prop.mortgaged) return 0;

  if (space.kind === "estacion") {
    const owned = BOARD.filter(
      (s) => s.kind === "estacion" && state.props[s.i]?.owner === prop.owner,
    ).length;
    return [0, 25, 50, 100, 200][owned] ?? 0;
  }
  if (space.kind === "servicio") {
    const owned = BOARD.filter(
      (s) => s.kind === "servicio" && state.props[s.i]?.owner === prop.owner,
    ).length;
    return diceSum * (owned === 2 ? 10 : 4);
  }
  const rents = space.rents ?? [0];
  if (prop.houses > 0) return rents[Math.min(prop.houses, 5)];
  const doubled = space.group && ownsGroup(state, prop.owner, space.group);
  return doubled ? rents[0] * 2 : rents[0];
}

function pay(
  state: MonoState,
  ctx: GameContext,
  from: string,
  to: string | null,
  amount: number,
): void {
  if (amount <= 0) return;
  if (state.cash[from] >= amount) {
    state.cash[from] -= amount;
    if (to) state.cash[to] += amount;
    return;
  }
  // No llega con lo que tiene en mano: queda a deber hasta que venda o hipoteque.
  state.debt = { from, to, amount };
  state.stage = "deuda";
  ctx.log(
    `${nameOf(ctx.players, from)} debe ${amount}€ y tiene que hacer caja`,
    "⚠️",
  );
}

function sendToJail(state: MonoState, ctx: GameContext, playerId: string): void {
  state.positions[playerId] = JAIL;
  state.jail[playerId] = 0;
  state.doubles = 0;
  ctx.log(`${nameOf(ctx.players, playerId)} va a la cárcel`, "🚔");
}

function drawCard(state: MonoState, deck: "suerte" | "caja"): ChanceCard {
  if (!state.decks[deck].length) {
    state.decks[deck] = shuffled((deck === "suerte" ? SUERTE : CAJA).map((c) => c.id));
  }
  const id = state.decks[deck].shift()!;
  return CARD_BY_ID.get(id)!;
}

function applyCard(
  state: MonoState,
  ctx: GameContext,
  playerId: string,
  card: ChanceCard,
  deck: "suerte" | "caja",
): void {
  state.lastCard = { deck, text: card.text };
  ctx.log(`${nameOf(ctx.players, playerId)}: ${card.text}`, deck === "suerte" ? "🍀" : "📦");
  const effect = card.effect;

  if (effect.type === "cobrar") state.cash[playerId] += effect.amount;
  else if (effect.type === "pagar") pay(state, ctx, playerId, null, effect.amount);
  else if (effect.type === "carcel") sendToJail(state, ctx, playerId);
  else if (effect.type === "salir-carcel") state.jailCards[playerId] += 1;
  else if (effect.type === "cobrar-cada") {
    for (const other of state.order) {
      if (other === playerId || state.out.includes(other)) continue;
      pay(state, ctx, other, playerId, effect.amount);
    }
  } else if (effect.type === "pagar-cada") {
    for (const other of state.order) {
      if (other === playerId || state.out.includes(other)) continue;
      pay(state, ctx, playerId, other, effect.amount);
    }
  } else if (effect.type === "reparaciones") {
    const owned = ownedBy(state, playerId);
    const houses = owned.reduce(
      (sum, i) => sum + (state.props[i].houses < 5 ? state.props[i].houses : 0),
      0,
    );
    const hotels = owned.filter((i) => state.props[i].houses === 5).length;
    pay(state, ctx, playerId, null, houses * effect.casa + hotels * effect.hotel);
  } else if (effect.type === "mover" || effect.type === "avanzar") {
    const from = state.positions[playerId];
    const to =
      effect.type === "mover"
        ? effect.to
        : (((from + effect.steps) % 40) + 40) % 40;
    if (effect.type === "mover" && to <= from && to !== JAIL) {
      state.cash[playerId] += 200;
      ctx.log(`${nameOf(ctx.players, playerId)} pasa por la Salida y cobra 200`, "💰");
    }
    state.positions[playerId] = to;
    state.moved = { by: playerId, from, to, at: Date.now() };
    resolveLanding(state, ctx, playerId, 0);
  }
}

function resolveLanding(
  state: MonoState,
  ctx: GameContext,
  playerId: string,
  diceSum: number,
): void {
  const index = state.positions[playerId];
  const space = BOARD[index];
  const who = nameOf(ctx.players, playerId);

  if (space.kind === "ir-carcel") {
    sendToJail(state, ctx, playerId);
    state.stage = "gestion";
    return;
  }
  if (space.kind === "impuesto") {
    ctx.log(`${who} paga ${space.tax}€ de ${space.name.toLowerCase()}`, "🧾");
    pay(state, ctx, playerId, null, space.tax ?? 0);
    if (state.stage !== "deuda") state.stage = "gestion";
    return;
  }
  if (space.kind === "suerte" || space.kind === "caja") {
    const deck = space.kind === "suerte" ? "suerte" : "caja";
    applyCard(state, ctx, playerId, drawCard(state, deck), deck);
    if (state.stage !== "deuda") state.stage = "gestion";
    return;
  }
  if (space.price) {
    const prop = state.props[index];
    if (!prop.owner) {
      state.stage = "comprar";
      return;
    }
    if (prop.owner !== playerId && !prop.mortgaged) {
      const rent = rentFor(state, index, diceSum);
      ctx.log(`${who} paga ${rent}€ a ${nameOf(ctx.players, prop.owner)} por ${space.name}`, "💸");
      pay(state, ctx, playerId, prop.owner, rent);
    }
  }
  if (state.stage !== "deuda") state.stage = "gestion";
}

function endTurn(state: MonoState): void {
  const order = state.order;
  let index = order.indexOf(state.turn);
  for (let i = 0; i < order.length; i++) {
    index = (index + 1) % order.length;
    if (!state.out.includes(order[index])) break;
  }
  state.turn = order[index];
  state.stage = "tirar";
  state.dice = null;
  state.doubles = 0;
  state.lastCard = null;
}

function bankrupt(state: MonoState, ctx: GameContext, playerId: string): void {
  const debt = state.debt;
  const creditor = debt?.to ?? null;
  for (const index of ownedBy(state, playerId)) {
    const prop = state.props[index];
    if (creditor) {
      prop.owner = creditor;
    } else {
      prop.owner = null;
      prop.mortgaged = false;
    }
    prop.houses = 0;
  }
  if (creditor) state.cash[creditor] += Math.max(0, state.cash[playerId]);
  state.cash[playerId] = 0;
  state.out.push(playerId);
  state.debt = null;
  ctx.log(`${nameOf(ctx.players, playerId)} se declara en quiebra`, "🪦");

  const alive = state.order.filter((id) => !state.out.includes(id));
  if (alive.length === 1) {
    state.winnerId = alive[0];
    state.stage = "fin";
    return;
  }
  if (state.turn === playerId) endTurn(state);
  else state.stage = "gestion";
}

export const monopolio: GameDefinition<MonoState> = {
  id: "monopolio",
  name: "Monopolio",
  emoji: "🏦",
  tagline: "Calles, alquileres y alguna ruina",
  description:
    "Compra calles, construye casas y despluma a quien caiga en ellas. Con hipotecas, cárcel y tratos.",
  chip: "bg-grass text-white",
  min: 2,
  max: 6,
  minutes: "40-60 min",
  rules: [
    {
      title: "Tu turno",
      items: [
        "Tiras dos dados y avanzas. Al pasar por la Salida cobras 200€.",
        "Si sacas dobles repites turno; tres dobles seguidos te llevan a la cárcel.",
        "Cada vuelta puedes construir, hipotecar o proponer tratos antes de pasar el turno.",
      ],
    },
    {
      title: "Propiedades",
      items: [
        "Si caes en una calle libre puedes comprarla al precio marcado. Si la rechazas, se queda sin dueño (esta mesa no hace subastas).",
        "Si caes en una calle ajena pagas el alquiler; si está hipotecada, no se paga nada.",
        "Tener todo un color duplica el alquiler base y te deja construir.",
      ],
    },
    {
      title: "Casas y hoteles",
      items: [
        "Solo se construye con el color completo y sin hipotecas, de forma pareja: nunca más de una casa de diferencia entre calles del mismo grupo.",
        "La quinta casa es el hotel. Vender devuelve la mitad de lo que costó.",
      ],
    },
    {
      title: "Cárcel",
      items: [
        "Sales pagando 50€, usando una carta de salida o sacando dobles.",
        "Al tercer turno dentro, pagas la fianza y sales igualmente.",
      ],
    },
    {
      title: "Deudas",
      items: [
        "Si no te llega el dinero, hipoteca o vende casas hasta cubrirlo.",
        "Si aun así no puedes pagar, te declaras en quiebra y tus propiedades pasan a quien te cobraba.",
        "Gana quien quede en pie.",
      ],
    },
  ],

  create(players: Seat[]): MonoState {
    const order = players.map((p) => p.id);
    const props: Record<number, PropertyState> = {};
    for (const space of BOARD) {
      if (space.price) props[space.i] = { owner: null, houses: 0, mortgaged: false };
    }
    return {
      order,
      cash: Object.fromEntries(order.map((id) => [id, START_CASH])),
      positions: Object.fromEntries(order.map((id) => [id, 0])),
      jail: Object.fromEntries(order.map((id) => [id, -1])),
      jailCards: Object.fromEntries(order.map((id) => [id, 0])),
      props,
      turn: order[0],
      stage: "tirar",
      dice: null,
      doubles: 0,
      lastCard: null,
      debt: null,
      trade: null,
      decks: {
        suerte: shuffled(SUERTE.map((c) => c.id)),
        caja: shuffled(CAJA.map((c) => c.id)),
      },
      out: [],
      winnerId: null,
      moved: null,
    };
  },

  act(state, action: GameAction, ctx: GameContext): MonoState {
    const next: MonoState = JSON.parse(JSON.stringify(state)) as MonoState;
    const me = ctx.playerId;
    if (!next.order.includes(me)) throw new GameError("No estás en la partida.", 403);
    if (next.out.includes(me)) throw new GameError("Estás en quiebra: ya solo miras.", 403);
    const myName = nameOf(ctx.players, me);

    // Tratos: los puede contestar quien los recibe, aunque no sea su turno.
    if (action.type === "trato") {
      const to = String(action.to);
      if (!next.order.includes(to) || to === me) throw new GameError("Ese jugador no está en la mesa.");
      if (next.trade) throw new GameError("Ya hay un trato encima de la mesa.");
      const give = (action.give as number[] | undefined) ?? [];
      const get = (action.get as number[] | undefined) ?? [];
      const giveCash = Math.max(0, Number(action.giveCash ?? 0));
      const getCash = Math.max(0, Number(action.getCash ?? 0));
      if (give.some((i) => next.props[i]?.owner !== me))
        throw new GameError("Estás ofreciendo algo que no es tuyo.");
      if (get.some((i) => next.props[i]?.owner !== to))
        throw new GameError("Estás pidiendo algo que no es suyo.");
      if (giveCash > next.cash[me]) throw new GameError("No tienes ese dinero.");
      next.trade = { from: me, to, give, get, giveCash, getCash };
      ctx.log(`${myName} propone un trato a ${nameOf(ctx.players, to)}`, "🤝");
      return next;
    }

    if (action.type === "responder-trato") {
      const trade = next.trade;
      if (!trade) throw new GameError("No hay ningún trato pendiente.");
      if (trade.to !== me) throw new GameError("Ese trato no es para ti.", 403);
      if (!action.acepta) {
        next.trade = null;
        ctx.log(`${myName} rechaza el trato`, "🙅");
        return next;
      }
      if (trade.getCash > next.cash[me]) throw new GameError("No tienes ese dinero.");
      if (trade.giveCash > next.cash[trade.from])
        throw new GameError("Quien propuso el trato ya no tiene ese dinero.");
      if (trade.give.some((i) => next.props[i]?.houses))
        throw new GameError("No se pueden traspasar calles con casas.");
      if (trade.get.some((i) => next.props[i]?.houses))
        throw new GameError("No se pueden traspasar calles con casas.");
      for (const index of trade.give) next.props[index].owner = trade.to;
      for (const index of trade.get) next.props[index].owner = trade.from;
      next.cash[trade.from] += trade.getCash - trade.giveCash;
      next.cash[trade.to] += trade.giveCash - trade.getCash;
      next.trade = null;
      ctx.log(`${myName} acepta el trato`, "✅");
      return next;
    }

    if (next.turn !== me) throw new GameError("No es tu turno.", 403);

    if (action.type === "tirar") {
      if (next.stage !== "tirar") throw new GameError("Ya tiraste este turno.");
      const a = roll();
      const b = roll();
      next.dice = [a, b];
      const isDouble = a === b;
      const sum = a + b;

      if (next.jail[me] >= 0) {
        if (isDouble) {
          next.jail[me] = -1;
          ctx.log(`${myName} saca dobles y sale de la cárcel`, "🎲");
        } else {
          next.jail[me] += 1;
          if (next.jail[me] >= 3) {
            ctx.log(`${myName} paga la fianza tras tres turnos`, "💸");
            pay(next, ctx, me, null, BAIL);
            next.jail[me] = -1;
          } else {
            ctx.log(`${myName} sigue en la cárcel (${a} y ${b})`, "🔒");
            next.stage = "gestion";
            return next;
          }
        }
      } else if (isDouble) {
        next.doubles += 1;
        if (next.doubles >= 3) {
          sendToJail(next, ctx, me);
          next.stage = "gestion";
          return next;
        }
      }

      const from = next.positions[me];
      const to = (from + sum) % 40;
      if (to < from) {
        next.cash[me] += 200;
        ctx.log(`${myName} pasa por la Salida y cobra 200`, "💰");
      }
      next.positions[me] = to;
      next.moved = { by: me, from, to, at: Date.now() };
      ctx.log(`${myName} saca ${a}+${b} y cae en ${BOARD[to].name}`, "🎲");
      resolveLanding(next, ctx, me, sum);
      return next;
    }

    if (action.type === "comprar") {
      if (next.stage !== "comprar") throw new GameError("Ahora no hay nada que comprar.");
      const index = next.positions[me];
      const space = BOARD[index];
      const price = space.price ?? 0;
      if (next.cash[me] < price) throw new GameError("No te llega el dinero.");
      next.cash[me] -= price;
      next.props[index].owner = me;
      ctx.log(`${myName} compra ${space.name} por ${price}€`, "🏠");
      next.stage = "gestion";
      return next;
    }

    if (action.type === "no-comprar") {
      if (next.stage !== "comprar") throw new GameError("Ahora no hay nada que comprar.");
      ctx.log(`${myName} no compra ${BOARD[next.positions[me]].name}`, "🙃");
      next.stage = "gestion";
      return next;
    }

    if (action.type === "construir" || action.type === "vender-casa") {
      const index = Number(action.property);
      const space = BOARD[index];
      const prop = next.props[index];
      if (!prop || prop.owner !== me) throw new GameError("Esa calle no es tuya.");
      if (!space.group || !space.houseCost) throw new GameError("Ahí no se puede construir.");
      if (!ownsGroup(next, me, space.group))
        throw new GameError("Necesitas todas las calles de ese color.");
      const group = BOARD.filter((s) => s.group === space.group);
      if (group.some((s) => next.props[s.i].mortgaged))
        throw new GameError("No puedes construir con calles hipotecadas.");

      if (action.type === "construir") {
        if (prop.houses >= 5) throw new GameError("Ahí ya hay un hotel.");
        const min = Math.min(...group.map((s) => next.props[s.i].houses));
        if (prop.houses > min) throw new GameError("Hay que construir parejo dentro del color.");
        if (next.cash[me] < space.houseCost) throw new GameError("No te llega el dinero.");
        next.cash[me] -= space.houseCost;
        prop.houses += 1;
        ctx.log(
          `${myName} ${prop.houses === 5 ? "levanta un hotel" : "construye una casa"} en ${space.name}`,
          "🏗️",
        );
      } else {
        if (prop.houses <= 0) throw new GameError("Ahí no hay nada que vender.");
        const max = Math.max(...group.map((s) => next.props[s.i].houses));
        if (prop.houses < max) throw new GameError("Hay que vender parejo dentro del color.");
        prop.houses -= 1;
        next.cash[me] += space.houseCost / 2;
        ctx.log(`${myName} vende una casa de ${space.name}`, "🧱");
      }
      return next;
    }

    if (action.type === "hipotecar" || action.type === "deshipotecar") {
      const index = Number(action.property);
      const space = BOARD[index];
      const prop = next.props[index];
      if (!prop || prop.owner !== me) throw new GameError("Esa propiedad no es tuya.");
      const value = (space.price ?? 0) / 2;
      if (action.type === "hipotecar") {
        if (prop.mortgaged) throw new GameError("Ya está hipotecada.");
        if (prop.houses) throw new GameError("Primero vende las casas.");
        prop.mortgaged = true;
        next.cash[me] += value;
        ctx.log(`${myName} hipoteca ${space.name} por ${value}€`, "🏚️");
      } else {
        if (!prop.mortgaged) throw new GameError("Esa no está hipotecada.");
        const cost = Math.round(value * 1.1);
        if (next.cash[me] < cost) throw new GameError("No te llega el dinero.");
        next.cash[me] -= cost;
        prop.mortgaged = false;
        ctx.log(`${myName} recupera ${space.name}`, "🏡");
      }
      return next;
    }

    if (action.type === "fianza") {
      if (next.jail[me] < 0) throw new GameError("No estás en la cárcel.");
      if (next.jailCards[me] > 0) {
        next.jailCards[me] -= 1;
        ctx.log(`${myName} usa su carta de salida`, "🎟️");
      } else {
        if (next.cash[me] < BAIL) throw new GameError("No tienes los 50€ de la fianza.");
        next.cash[me] -= BAIL;
        ctx.log(`${myName} paga la fianza`, "💵");
      }
      next.jail[me] = -1;
      return next;
    }

    if (action.type === "pagar-deuda") {
      const debt = next.debt;
      if (!debt || debt.from !== me) throw new GameError("No tienes deudas pendientes.");
      if (next.cash[me] < debt.amount)
        throw new GameError("Todavía no te llega: hipoteca o vende algo.");
      next.cash[me] -= debt.amount;
      if (debt.to) next.cash[debt.to] += debt.amount;
      next.debt = null;
      next.stage = "gestion";
      ctx.log(`${myName} salda su deuda de ${debt.amount}€`, "✅");
      return next;
    }

    if (action.type === "quiebra") {
      if (!next.debt || next.debt.from !== me)
        throw new GameError("Solo puedes declararte en quiebra si debes dinero.");
      bankrupt(next, ctx, me);
      return next;
    }

    if (action.type === "terminar") {
      if (next.stage === "deuda") throw new GameError("Primero resuelve lo que debes.");
      if (next.stage === "comprar") throw new GameError("Decide antes si compras o no.");
      if (next.dice && next.dice[0] === next.dice[1] && next.jail[me] < 0 && next.doubles > 0) {
        next.stage = "tirar";
        next.dice = null;
        ctx.log(`${myName} repite turno por dobles`, "🔁");
        return next;
      }
      endTurn(next);
      return next;
    }

    throw new GameError("Acción desconocida.");
  },

  view(state, playerId, players) {
    return {
      ...state,
      board: BOARD,
      groupSize: GROUP_SIZE,
      you: playerId
        ? {
            id: playerId,
            cash: state.cash[playerId] ?? 0,
            properties: ownedBy(state, playerId),
            jail: state.jail[playerId] ?? -1,
            jailCards: state.jailCards[playerId] ?? 0,
            worth: netWorth(state, playerId),
          }
        : null,
      // El dinero y las propiedades son públicos en Monopolio: no hay nada que ocultar.
      table: state.order.map((id) => ({
        id,
        name: nameOf(players, id),
        cash: state.cash[id] ?? 0,
        worth: netWorth(state, id),
        properties: ownedBy(state, id),
        jail: state.jail[id] ?? -1,
        out: state.out.includes(id),
      })),
    };
  },

  /**
   * Robot inversor: compra con cabeza, construye cuando tiene un color entero,
   * hipoteca antes de arruinarse y solo acepta tratos que le convienen.
   */
  bot(state, playerId): GameAction | null {
    if (state.winnerId || state.out.includes(playerId)) return null;

    // Un trato se contesta aunque no sea su turno.
    const trade = state.trade;
    if (trade && trade.to === playerId) {
      const value = (list: number[]) =>
        list.reduce((sum, index) => {
          const prop = state.props[index];
          const price = BOARD[index].price ?? 0;
          return sum + (prop?.mortgaged ? price / 2 : price);
        }, 0);
      const gets = value(trade.give) + trade.giveCash;
      const gives = value(trade.get) + trade.getCash;
      const affordable = trade.getCash <= state.cash[playerId];
      return {
        type: "responder-trato",
        acepta: affordable && gets >= gives * 1.15,
      };
    }

    if (state.turn !== playerId) return null;
    const cash = state.cash[playerId] ?? 0;
    const owned = Object.entries(state.props)
      .filter(([, prop]) => prop.owner === playerId)
      .map(([index]) => Number(index));

    if (state.stage === "deuda") {
      const debt = state.debt;
      if (!debt) return { type: "terminar" };
      if (cash >= debt.amount) return { type: "pagar-deuda" };
      const mortgageable = owned.find(
        (index) => !state.props[index].mortgaged && !state.props[index].houses,
      );
      if (mortgageable !== undefined)
        return { type: "hipotecar", property: mortgageable };
      const withHouses = owned.find((index) => state.props[index].houses > 0);
      if (withHouses !== undefined)
        return { type: "vender-casa", property: withHouses };
      return { type: "quiebra" };
    }

    if (state.jail[playerId] >= 0 && state.stage === "tirar") {
      if (state.jailCards[playerId] > 0) return { type: "fianza" };
      if (cash > 400) return { type: "fianza" };
      return { type: "tirar" };
    }

    if (state.stage === "tirar") return { type: "tirar" };

    if (state.stage === "comprar") {
      const index = state.positions[playerId];
      const space = BOARD[index];
      const price = space.price ?? 0;
      if (cash < price) return { type: "no-comprar" };
      const completes =
        space.group &&
        BOARD.filter((other) => other.group === space.group).every(
          (other) => other.i === index || state.props[other.i]?.owner === playerId,
        );
      const reserve = space.kind === "calle" ? 150 : 80;
      return cash - price >= reserve || completes
        ? { type: "comprar" }
        : { type: "no-comprar" };
    }

    if (state.stage === "gestion") {
      for (const index of owned) {
        const space = BOARD[index];
        const prop = state.props[index];
        if (!space.group || !space.houseCost || prop.mortgaged || prop.houses >= 5) continue;
        const group = BOARD.filter((other) => other.group === space.group);
        const complete = group.every((other) => state.props[other.i]?.owner === playerId);
        if (!complete) continue;
        if (group.some((other) => state.props[other.i].mortgaged)) continue;
        const min = Math.min(...group.map((other) => state.props[other.i].houses));
        if (prop.houses > min) continue;
        if (cash - space.houseCost < 250) continue;
        return { type: "construir", property: index };
      }
      const recoverable = owned.find(
        (index) =>
          state.props[index].mortgaged &&
          cash > Math.round(((BOARD[index].price ?? 0) / 2) * 1.1) + 400,
      );
      if (recoverable !== undefined)
        return { type: "deshipotecar", property: recoverable };
      return { type: "terminar" };
    }

    return null;
  },

  winner(state): Winner | null {
    return state.winnerId
      ? { ids: [state.winnerId], label: "¡Se queda con todo el tablero!" }
      : null;
  },
};
