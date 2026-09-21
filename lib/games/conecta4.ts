import type { GameAction, GameContext, GameDefinition, Seat, Winner } from "@/lib/engine/types";
import { GameError, emojiOf, nameOf } from "./util";

const ROWS = 6;
const COLS = 7;

export interface Conecta4State {
  board: (string | null)[][];
  order: string[];
  turn: string;
  lastDrop: { row: number; col: number; by: string } | null;
  line: number[][] | null;
  winnerId: string | null;
  draw: boolean;
  moves: number;
}

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function findLine(
  board: (string | null)[][],
  row: number,
  col: number,
): number[][] | null {
  const token = board[row][col];
  if (!token) return null;
  for (const [dr, dc] of DIRECTIONS) {
    const cells = [[row, col]];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        r >= 0 && r < ROWS && c >= 0 && c < COLS &&
        board[r][c] === token
      ) {
        cells.push([r, c]);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

export const conecta4: GameDefinition<Conecta4State> = {
  id: "conecta4",
  name: "Conecta 4",
  emoji: "🔴",
  tagline: "Cuatro en raya, pero con gravedad",
  description: "Deja caer fichas y forma una línea de cuatro antes que la otra persona.",
  chip: "bg-tomato text-white",
  min: 2,
  max: 2,
  minutes: "5 min",
  rules: [
    {
      title: "Objetivo",
      items: [
        "Alinear cuatro fichas propias en horizontal, vertical o diagonal.",
        "Si el tablero se llena sin línea, la partida queda en tablas.",
      ],
    },
    {
      title: "Turnos",
      items: [
        "Se juega por turnos: eliges una columna y la ficha cae hasta la casilla libre más baja.",
        "No se puede jugar en una columna llena.",
      ],
    },
  ],

  create(players: Seat[]): Conecta4State {
    const order = players.slice(0, 2).map((p) => p.id);
    return {
      board: Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null)),
      order,
      turn: order[0],
      lastDrop: null,
      line: null,
      winnerId: null,
      draw: false,
      moves: 0,
    };
  },

  act(state, action: GameAction, ctx: GameContext): Conecta4State {
    if (action.type !== "drop") throw new GameError("Acción desconocida.");
    if (state.winnerId || state.draw) throw new GameError("La partida ya terminó.");
    if (!state.order.includes(ctx.playerId))
      throw new GameError("Solo juegan las dos personas sentadas a la mesa.", 403);
    if (state.turn !== ctx.playerId) throw new GameError("No es tu turno.", 403);

    const col = Number(action.col);
    if (!Number.isInteger(col) || col < 0 || col >= COLS)
      throw new GameError("Esa columna no existe.");

    const board = state.board.map((row) => [...row]);
    let landed = -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!board[row][col]) {
        board[row][col] = ctx.playerId;
        landed = row;
        break;
      }
    }
    if (landed < 0) throw new GameError("Esa columna está llena.");

    const line = findLine(board, landed, col);
    const moves = state.moves + 1;
    const draw = !line && moves === ROWS * COLS;

    ctx.log(
      `${nameOf(ctx.players, ctx.playerId)} juega en la columna ${col + 1}`,
      emojiOf(ctx.players, ctx.playerId),
    );

    return {
      ...state,
      board,
      moves,
      lastDrop: { row: landed, col, by: ctx.playerId },
      line,
      draw,
      winnerId: line ? ctx.playerId : null,
      turn: line || draw
        ? state.turn
        : state.order[(state.order.indexOf(state.turn) + 1) % state.order.length],
    };
  },

  view(state, playerId) {
    // Conecta 4 es información perfecta: todo el mundo ve lo mismo.
    return { ...state, youPlay: playerId ? state.order.includes(playerId) : false };
  },

  /**
   * Robot de dos jugadas: gana si puede, tapa si le van a ganar, evita regalar
   * la jugada siguiente y, si todo da igual, tira al centro.
   */
  bot(state, playerId): GameAction | null {
    if (state.winnerId || state.draw) return null;
    if (state.turn !== playerId) return null;
    const rival = state.order.find((id) => id !== playerId)!;

    const free = (board: (string | null)[][], col: number) => {
      for (let row = ROWS - 1; row >= 0; row--) if (!board[row][col]) return row;
      return -1;
    };
    const drop = (board: (string | null)[][], col: number, who: string) => {
      const next = board.map((row) => [...row]);
      const row = free(next, col);
      if (row < 0) return null;
      next[row][col] = who;
      return { board: next, row };
    };
    const columns = Array.from({ length: COLS }, (_, col) => col).filter(
      (col) => free(state.board, col) >= 0,
    );
    if (!columns.length) return null;

    for (const who of [playerId, rival]) {
      for (const col of columns) {
        const played = drop(state.board, col, who);
        if (played && findLine(played.board, played.row, col)) {
          return { type: "drop", col };
        }
      }
    }

    const safe = columns.filter((col) => {
      const played = drop(state.board, col, playerId);
      if (!played) return false;
      return !columns.some((answer) => {
        const reply = drop(played.board, answer, rival);
        return reply ? Boolean(findLine(reply.board, reply.row, answer)) : false;
      });
    });

    const pool = safe.length ? safe : columns;
    const byCentre = [...pool].sort(
      (a, b) => Math.abs(a - 3) - Math.abs(b - 3) || Math.random() - 0.5,
    );
    return { type: "drop", col: byCentre[0] };
  },

  winner(state): Winner | null {
    if (state.winnerId) return { ids: [state.winnerId], label: "¡Cuatro en raya!" };
    if (state.draw) return { ids: [], label: "Tablas: el tablero se llenó" };
    return null;
  },
};
