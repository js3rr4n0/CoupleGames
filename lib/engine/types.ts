export type GameId =
  | "conecta4"
  | "batalla-naval"
  | "uno"
  | "cluedo"
  | "monopolio";

export interface Seat {
  id: string;
  name: string;
  emoji: string;
  seat: number;
  isHost: boolean;
  online: boolean;
  flower: boolean;
}

export interface LogEntry {
  id: string;
  at: number;
  /** Texto público: lo ve toda la mesa, nunca revela cartas de nadie. */
  text: string;
  emoji?: string;
}

export interface PrivatePad {
  /** Libreta libre: solo la ve quien la escribe. */
  text: string;
  /** Marcas estructuradas (la cuadrícula de descartes del Cluedo, por ejemplo). */
  marks: Record<string, string>;
}

export type Phase = "lobby" | "playing" | "finished";

export interface Room<S = unknown> {
  code: string;
  gameId: GameId;
  createdAt: number;
  hostId: string;
  targetPlayers: number;
  players: RoomPlayer[];
  phase: Phase;
  state: S | null;
  pads: Record<string, PrivatePad>;
  log: LogEntry[];
  round: number;
  version: number;
  lastActivity: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  emoji: string;
  isHost: boolean;
  flower: boolean;
  joinedAt: number;
  lastSeen: number;
  wins: number;
}

export interface GameAction {
  type: string;
  [key: string]: unknown;
}

export interface GameContext {
  players: Seat[];
  playerId: string;
  /** Añade una línea al historial público de la sala. */
  log: (text: string, emoji?: string) => void;
}

export interface RuleSection {
  title: string;
  items: string[];
}

export interface Winner {
  ids: string[];
  label: string;
}

export interface GameDefinition<S> {
  id: GameId;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  chip: string;
  min: number;
  max: number;
  /** Minutos aproximados de partida, solo informativo. */
  minutes: string;
  rules: RuleSection[];
  create(players: Seat[]): S;
  act(state: S, action: GameAction, ctx: GameContext): S;
  /** Aquí se recorta lo privado: cada jugador recibe solo lo que puede ver. */
  view(state: S, playerId: string | null, players: Seat[]): unknown;
  winner(state: S): Winner | null;
}
