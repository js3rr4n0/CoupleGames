import type { GameAction, GameContext, GameDefinition, Seat, Winner } from "@/lib/engine/types";
import { GameError, nameOf } from "./util";

export const SIZE = 10;

export const SHIP_TYPES = [
  { id: "portaaviones", name: "Portaaviones", size: 5 },
  { id: "acorazado", name: "Acorazado", size: 4 },
  { id: "crucero", name: "Crucero", size: 3 },
  { id: "submarino", name: "Submarino", size: 3 },
  { id: "destructor", name: "Destructor", size: 2 },
];

export interface Ship {
  id: string;
  name: string;
  size: number;
  row: number;
  col: number;
  horizontal: boolean;
  hits: number;
}

export interface Fleet {
  ships: Ship[];
  ready: boolean;
  /** Disparos recibidos: null, "agua" o "tocado". */
  grid: (null | "agua" | "tocado")[][];
}

export interface BatallaState {
  order: string[];
  stage: "colocando" | "combate";
  fleets: Record<string, Fleet>;
  turn: string;
  lastShot: {
    by: string;
    row: number;
    col: number;
    result: "agua" | "tocado" | "hundido";
    ship?: string;
  } | null;
  winnerId: string | null;
}

function emptyGrid(): (null | "agua" | "tocado")[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

export function shipCells(ship: Ship): number[][] {
  return Array.from({ length: ship.size }, (_, i) =>
    ship.horizontal ? [ship.row, ship.col + i] : [ship.row + i, ship.col],
  );
}

function fits(ship: Ship, others: Ship[]): boolean {
  const cells = shipCells(ship);
  if (cells.some(([r, c]) => r < 0 || c < 0 || r >= SIZE || c >= SIZE)) return false;
  const taken = new Set(
    others.flatMap((other) => shipCells(other).map(([r, c]) => `${r},${c}`)),
  );
  return cells.every(([r, c]) => !taken.has(`${r},${c}`));
}

function randomFleet(): Ship[] {
  const ships: Ship[] = [];
  for (const type of SHIP_TYPES) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const horizontal = Math.random() < 0.5;
      const ship: Ship = {
        ...type,
        horizontal,
        row: Math.floor(Math.random() * (horizontal ? SIZE : SIZE - type.size + 1)),
        col: Math.floor(Math.random() * (horizontal ? SIZE - type.size + 1 : SIZE)),
        hits: 0,
      };
      if (fits(ship, ships)) {
        ships.push(ship);
        break;
      }
    }
  }
  return ships;
}

function sunk(ship: Ship): boolean {
  return ship.hits >= ship.size;
}

export const batalla: GameDefinition<BatallaState> = {
  id: "batalla-naval",
  name: "Batalla naval",
  emoji: "🚢",
  tagline: "Coloca tu flota y hunde la del otro",
  description:
    "Cada quien coloca cinco barcos en su mar. Nadie ve la flota ajena: solo el agua y los tocados.",
  chip: "bg-sky text-white",
  min: 2,
  max: 2,
  minutes: "10-15 min",
  rules: [
    {
      title: "Preparación",
      items: [
        "Cada jugador coloca 5 barcos: portaaviones (5), acorazado (4), crucero (3), submarino (3) y destructor (2).",
        "Los barcos no pueden salirse del tablero ni pisarse entre ellos.",
        "Puedes girarlos o pedir una colocación al azar. Nadie ve tu flota, ni siquiera el servidor se la enseña al rival.",
      ],
    },
    {
      title: "Disparos",
      items: [
        "Por turnos se dispara a una casilla del mar contrario.",
        "Si aciertas, vuelves a disparar. Si es agua, pasa el turno.",
        "Cuando un barco recibe tantos impactos como su tamaño, se hunde y se revela entero.",
      ],
    },
    {
      title: "Victoria",
      items: ["Gana quien hunde los cinco barcos del rival."],
    },
  ],

  create(players: Seat[]): BatallaState {
    const order = players.slice(0, 2).map((p) => p.id);
    const fleets: Record<string, Fleet> = {};
    for (const id of order) {
      fleets[id] = { ships: randomFleet(), ready: false, grid: emptyGrid() };
    }
    return {
      order,
      stage: "colocando",
      fleets,
      turn: order[0],
      lastShot: null,
      winnerId: null,
    };
  },

  act(state, action: GameAction, ctx: GameContext): BatallaState {
    if (!state.order.includes(ctx.playerId))
      throw new GameError("Solo juegan las dos personas sentadas a la mesa.", 403);
    const fleets = { ...state.fleets };
    const mine = { ...fleets[ctx.playerId] };

    if (action.type === "place") {
      if (state.stage !== "colocando") throw new GameError("La flota ya está en el agua.");
      if (mine.ready) throw new GameError("Ya diste tu flota por lista.");
      const id = String(action.shipId);
      const ship = mine.ships.find((s) => s.id === id);
      if (!ship) throw new GameError("Ese barco no existe.");
      const moved: Ship = {
        ...ship,
        row: Number(action.row),
        col: Number(action.col),
        horizontal: Boolean(action.horizontal),
      };
      if (!fits(moved, mine.ships.filter((s) => s.id !== id)))
        throw new GameError("Ahí no cabe: se sale del mar o pisa otro barco.");
      mine.ships = mine.ships.map((s) => (s.id === id ? moved : s));
      fleets[ctx.playerId] = mine;
      return { ...state, fleets };
    }

    if (action.type === "azar") {
      if (state.stage !== "colocando" || mine.ready)
        throw new GameError("Ya no puedes recolocar la flota.");
      mine.ships = randomFleet();
      fleets[ctx.playerId] = mine;
      return { ...state, fleets };
    }

    if (action.type === "listo") {
      if (state.stage !== "colocando") throw new GameError("La partida ya empezó.");
      mine.ready = true;
      fleets[ctx.playerId] = mine;
      ctx.log(`${nameOf(ctx.players, ctx.playerId)} tiene la flota lista`, "⚓");
      const everyoneReady = state.order.every((id) => fleets[id].ready);
      if (everyoneReady) ctx.log("¡Fuego a discreción!", "💥");
      return {
        ...state,
        fleets,
        stage: everyoneReady ? "combate" : "colocando",
      };
    }

    if (action.type === "disparo") {
      if (state.stage !== "combate") throw new GameError("Todavía se están colocando las flotas.");
      if (state.winnerId) throw new GameError("La partida ya terminó.");
      if (state.turn !== ctx.playerId) throw new GameError("No es tu turno.", 403);
      const row = Number(action.row);
      const col = Number(action.col);
      if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= SIZE || col >= SIZE)
        throw new GameError("Esa casilla no existe.");

      const rivalId = state.order.find((id) => id !== ctx.playerId)!;
      const rival: Fleet = {
        ...fleets[rivalId],
        grid: fleets[rivalId].grid.map((line) => [...line]),
        ships: fleets[rivalId].ships.map((s) => ({ ...s })),
      };
      if (rival.grid[row][col]) throw new GameError("Ya disparaste ahí.");

      const target = rival.ships.find((ship) =>
        shipCells(ship).some(([r, c]) => r === row && c === col),
      );
      let result: "agua" | "tocado" | "hundido" = "agua";
      if (target) {
        target.hits += 1;
        rival.grid[row][col] = "tocado";
        result = sunk(target) ? "hundido" : "tocado";
      } else {
        rival.grid[row][col] = "agua";
      }
      fleets[rivalId] = rival;

      const coord = `${String.fromCharCode(65 + col)}${row + 1}`;
      const who = nameOf(ctx.players, ctx.playerId);
      ctx.log(
        result === "agua"
          ? `${who} dispara a ${coord}: agua`
          : result === "tocado"
            ? `${who} dispara a ${coord}: ¡tocado!`
            : `${who} hunde el ${target?.name} en ${coord}`,
        result === "agua" ? "💦" : result === "tocado" ? "💥" : "🔥",
      );

      const allSunk = rival.ships.every(sunk);
      return {
        ...state,
        fleets,
        lastShot: { by: ctx.playerId, row, col, result, ship: target?.name },
        winnerId: allSunk ? ctx.playerId : null,
        // Acertar da derecho a repetir; el agua pasa el turno.
        turn: allSunk || result !== "agua" ? state.turn : rivalId,
      };
    }

    throw new GameError("Acción desconocida.");
  },

  view(state, playerId, players) {
    const rivalId = state.order.find((id) => id !== playerId) ?? null;
    const mine = playerId ? state.fleets[playerId] : null;
    const rival = rivalId ? state.fleets[rivalId] : null;

    return {
      stage: state.stage,
      order: state.order,
      turn: state.turn,
      lastShot: state.lastShot,
      winnerId: state.winnerId,
      youPlay: playerId ? state.order.includes(playerId) : false,
      rivalName: rivalId ? nameOf(players, rivalId) : null,
      rivalReady: rival?.ready ?? false,
      you: mine
        ? {
            ready: mine.ready,
            ships: mine.ships,
            grid: mine.grid,
            remaining: mine.ships.filter((s) => !sunk(s)).length,
          }
        : null,
      // Del mar contrario solo viajan los disparos propios; los barcos, solo al hundirse.
      enemy: rival
        ? {
            grid: rival.grid,
            sunkShips: rival.ships
              .filter(sunk)
              .map((ship) => ({ name: ship.name, cells: shipCells(ship) })),
            fleet: rival.ships.map((ship) => ({
              name: ship.name,
              size: ship.size,
              sunk: sunk(ship),
            })),
          }
        : null,
    };
  },

  /**
   * Robot artillero: coloca al azar y luego caza. Solo usa lo que vería
   * cualquiera en su silla: sus propios disparos y los barcos ya hundidos.
   */
  bot(state, playerId): GameAction | null {
    const mine = state.fleets[playerId];
    if (!mine) return null;
    if (state.stage === "colocando") return mine.ready ? null : { type: "listo" };
    if (state.winnerId || state.turn !== playerId) return null;

    const rivalId = state.order.find((id) => id !== playerId)!;
    const rival = state.fleets[rivalId];
    const grid = rival.grid;
    const sunkCells = new Set(
      rival.ships
        .filter(sunk)
        .flatMap((ship) => shipCells(ship).map(([r, c]) => `${r},${c}`)),
    );

    const open = (r: number, c: number) =>
      r >= 0 && c >= 0 && r < SIZE && c < SIZE && !grid[r][c];

    // Impactos de barcos que siguen a flote: hay que rematarlos.
    const live: number[][] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === "tocado" && !sunkCells.has(`${r},${c}`)) live.push([r, c]);
      }
    }

    if (live.length) {
      const targets: number[][] = [];
      for (const [r, c] of live) {
        // Si dos impactos están alineados, se sigue por esa línea.
        for (const [dr, dc] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          const alignedHit =
            live.some(([r2, c2]) => r2 === r + dr && c2 === c + dc) ||
            live.some(([r2, c2]) => r2 === r - dr && c2 === c - dc);
          if (open(r + dr, c + dc)) targets.push([r + dr, c + dc, alignedHit ? 0 : 1]);
        }
      }
      if (targets.length) {
        targets.sort((a, b) => a[2] - b[2] || Math.random() - 0.5);
        const [row, col] = targets[0];
        return { type: "disparo", row, col };
      }
    }

    // Sin rastro: se barre en damero, que es donde caen todos los barcos.
    const free: number[][] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) if (open(r, c)) free.push([r, c]);
    }
    if (!free.length) return null;
    const checker = free.filter(([r, c]) => (r + c) % 2 === 0);
    const pool = checker.length ? checker : free;
    const [row, col] = pool[Math.floor(Math.random() * pool.length)];
    return { type: "disparo", row, col };
  },

  winner(state): Winner | null {
    return state.winnerId
      ? { ids: [state.winnerId], label: "¡Flota hundida!" }
      : null;
  },
};
