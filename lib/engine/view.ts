import { GAMES } from "@/lib/games/registry";
import { seatsOf } from "./room";
import type { LogEntry, PrivatePad, Room, RuleSection, Seat } from "./types";

export interface RoomView {
  code: string;
  gameId: string;
  gameName: string;
  gameEmoji: string;
  gameTagline: string;
  rules: RuleSection[];
  phase: Room["phase"];
  version: number;
  serverTime: number;
  targetPlayers: number;
  minPlayers: number;
  maxPlayers: number;
  round: number;
  hostId: string;
  players: (Seat & { wins: number })[];
  you: (Seat & { wins: number }) | null;
  state: unknown;
  /** La libreta es estrictamente personal. */
  pad: PrivatePad;
  log: LogEntry[];
  winner: { ids: string[]; label: string } | null;
}

export function buildRoomView(room: Room, playerId: string | null): RoomView {
  const game = GAMES[room.gameId];
  const seats = seatsOf(room);
  const players = seats.map((seat) => ({
    ...seat,
    wins: room.players.find((p) => p.id === seat.id)?.wins ?? 0,
  }));

  return {
    code: room.code,
    gameId: room.gameId,
    gameName: game.name,
    gameEmoji: game.emoji,
    gameTagline: game.tagline,
    rules: game.rules,
    phase: room.phase,
    version: room.version,
    serverTime: Date.now(),
    targetPlayers: room.targetPlayers,
    minPlayers: game.min,
    maxPlayers: game.max,
    round: room.round,
    hostId: room.hostId,
    players,
    you: players.find((p) => p.id === playerId) ?? null,
    state: room.state ? game.view(room.state, playerId, seats) : null,
    pad: (playerId && room.pads[playerId]) || { text: "", marks: {} },
    log: room.log.slice(0, 30),
    winner: room.state ? game.winner(room.state) : null,
  };
}
