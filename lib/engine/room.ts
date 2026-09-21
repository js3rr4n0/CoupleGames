import { GameError, cleanName, EMOJIS } from "@/lib/game";
import { FLOWER_EMOJI, hasYellowFlower } from "@/lib/flower";
import { GAMES } from "@/lib/games/registry";
import { getRoom, newId, newRoomCode, putRoom, saveRoom } from "./store";
import type {
  GameAction,
  GameContext,
  GameId,
  LogEntry,
  PrivatePad,
  Room,
  RoomPlayer,
  Seat,
} from "./types";

const ONLINE_MS = 15_000;
const MAX_LOG = 60;

function emptyPad(): PrivatePad {
  return { text: "", marks: {} };
}

function freeEmoji(room: Room): string {
  const taken = new Set(room.players.map((p) => p.emoji));
  return (
    EMOJIS.find((e) => !taken.has(e)) ?? EMOJIS[room.players.length % EMOJIS.length]
  );
}

export function seatsOf(room: Room): Seat[] {
  const now = Date.now();
  return room.players.map((player, index) => ({
    id: player.id,
    name: player.name,
    emoji: player.emoji,
    seat: index,
    isHost: player.isHost,
    online: player.isBot || now - player.lastSeen < ONLINE_MS,
    flower: player.flower,
    isBot: player.isBot,
  }));
}

export function createRoom(
  gameId: GameId,
  hostName: string,
  targetPlayers: number,
): { room: Room; player: RoomPlayer } {
  const game = GAMES[gameId];
  if (!game) throw new GameError("Ese juego no existe.", 404);
  const name = cleanName(hostName);
  const now = Date.now();
  const host: RoomPlayer = {
    id: newId("p"),
    name,
    emoji: hasYellowFlower(name) ? FLOWER_EMOJI : EMOJIS[0],
    isHost: true,
    flower: hasYellowFlower(name),
    isBot: false,
    joinedAt: now,
    lastSeen: now,
    wins: 0,
  };
  const room: Room = {
    code: newRoomCode(),
    gameId,
    createdAt: now,
    hostId: host.id,
    targetPlayers: Math.min(game.max, Math.max(game.min, Math.round(targetPlayers) || game.min)),
    players: [host],
    phase: "lobby",
    state: null,
    pads: { [host.id]: emptyPad() },
    log: [],
    round: 1,
    version: 1,
    lastActivity: now,
    botThinkingUntil: 0,
  };
  putRoom(room);
  return { room, player: host };
}

export function joinRoom(room: Room, rawName: string): RoomPlayer {
  const game = GAMES[room.gameId];
  if (room.players.length >= game.max)
    throw new GameError(`Esta mesa admite como mucho ${game.max} jugadores.`);
  if (room.phase === "playing")
    throw new GameError("La partida ya empezó: espera a la siguiente.");
  const name = cleanName(rawName);
  if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
    throw new GameError("Ya hay alguien con ese nombre en la mesa.");
  const now = Date.now();
  const player: RoomPlayer = {
    id: newId("p"),
    name,
    emoji: hasYellowFlower(name) ? FLOWER_EMOJI : freeEmoji(room),
    isHost: false,
    flower: hasYellowFlower(name),
    isBot: false,
    joinedAt: now,
    lastSeen: now,
    wins: 0,
  };
  room.players.push(player);
  room.pads[player.id] = emptyPad();
  saveRoom(room);
  return player;
}

const BOT_NAMES = [
  "Robotín",
  "Chip",
  "Tuerca",
  "Bip-Bip",
  "Circuito",
  "Cabledo",
];

export function addBot(room: Room, player: RoomPlayer): RoomPlayer {
  const game = GAMES[room.gameId];
  if (!player.isHost) throw new GameError("Solo quien creó la mesa puede añadir robots.", 403);
  if (room.phase !== "lobby") throw new GameError("Los robots se añaden antes de empezar.");
  if (room.players.length >= game.max)
    throw new GameError(`Esta mesa admite como mucho ${game.max} jugadores.`);
  if (!game.bot) throw new GameError("Este juego todavía no tiene robots.");

  const used = new Set(room.players.map((p) => p.name));
  const name = BOT_NAMES.find((candidate) => !used.has(candidate)) ?? `Robot ${room.players.length}`;
  const now = Date.now();
  const bot: RoomPlayer = {
    id: newId("bot"),
    name,
    emoji: "🤖",
    isHost: false,
    flower: false,
    isBot: true,
    joinedAt: now,
    lastSeen: now,
    wins: 0,
  };
  room.players.push(bot);
  room.pads[bot.id] = emptyPad();
  if (room.targetPlayers < room.players.length) room.targetPlayers = room.players.length;
  saveRoom(room);
  return bot;
}

export function removeBot(room: Room, player: RoomPlayer, botId?: string): void {
  if (!player.isHost) throw new GameError("Solo quien creó la mesa puede quitar robots.", 403);
  if (room.phase !== "lobby") throw new GameError("Los robots se quitan antes de empezar.");
  const bots = room.players.filter((p) => p.isBot);
  const target = botId ? bots.find((p) => p.id === botId) : bots[bots.length - 1];
  if (!target) throw new GameError("No hay robots en la mesa.");
  room.players = room.players.filter((p) => p.id !== target.id);
  delete room.pads[target.id];
  saveRoom(room);
}

export function requireRoomPlayer(room: Room, playerId: string): RoomPlayer {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("No estás en esta mesa.", 403);
  return player;
}

function pushLog(room: Room, text: string, emoji?: string): void {
  const entry: LogEntry = { id: newId("l"), at: Date.now(), text, emoji };
  room.log.unshift(entry);
  room.log = room.log.slice(0, MAX_LOG);
}

export function startGame(room: Room, player: RoomPlayer): void {
  const game = GAMES[room.gameId];
  if (!player.isHost) throw new GameError("Solo quien creó la mesa puede empezar.", 403);
  if (room.players.length < game.min)
    throw new GameError(`Hacen falta al menos ${game.min} jugadores.`);
  if (room.phase === "playing") throw new GameError("La partida ya está en marcha.");
  room.state = game.create(seatsOf(room));
  room.phase = "playing";
  room.log = [];
  room.botThinkingUntil = 0;
  pushLog(room, `Empieza la partida de ${game.name}`, game.emoji);
  saveRoom(room);
}

export function playAction(
  room: Room,
  player: RoomPlayer,
  action: GameAction,
): void {
  const game = GAMES[room.gameId];
  if (room.phase !== "playing" || room.state === null)
    throw new GameError("La partida no está en juego.");
  const ctx: GameContext = {
    players: seatsOf(room),
    playerId: player.id,
    log: (text, emoji) => pushLog(room, text, emoji),
  };
  room.state = game.act(room.state, action, ctx);
  const winner = game.winner(room.state);
  if (winner) {
    room.phase = "finished";
    for (const id of winner.ids) {
      const champion = room.players.find((p) => p.id === id);
      if (champion) champion.wins += 1;
    }
    pushLog(room, winner.label, "🏆");
  }
  saveRoom(room);
}

export function rematch(room: Room, player: RoomPlayer): void {
  if (!player.isHost) throw new GameError("Solo quien creó la mesa puede repetir.", 403);
  if (room.phase !== "finished")
    throw new GameError("La revancha se pide al terminar la partida.");
  room.phase = "lobby";
  room.state = null;
  room.round += 1;
  room.log = [];
  for (const id of Object.keys(room.pads)) room.pads[id] = emptyPad();
  saveRoom(room);
}

export function writePad(
  room: Room,
  player: RoomPlayer,
  text?: string,
  mark?: { key: string; value: string },
): void {
  const pad = room.pads[player.id] ?? emptyPad();
  if (typeof text === "string") pad.text = text.slice(0, 2000);
  if (mark) {
    if (mark.value) pad.marks[mark.key] = mark.value.slice(0, 4);
    else delete pad.marks[mark.key];
  }
  room.pads[player.id] = pad;
  room.lastActivity = Date.now();
  room.version += 1;
}

export { getRoom };
