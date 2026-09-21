import type {
  AnswerValue,
  CategoryId,
  Character,
  GameSession,
  Player,
  Round,
  RoundResult,
  Settings,
} from "./types";
import { newCode, newId, saveSession, putSession } from "./store";
import { buildDeck, CATEGORY_MAP, DEFAULT_CATEGORIES } from "./providers";
import { matchesName } from "./text";
import { FLOWER_EMOJI, hasYellowFlower } from "./flower";

export const EMOJIS = [
  "🦊", "🐼", "🦉", "🐙", "🦄", "🐯", "🦋", "🐨",
  "🦁", "🐸", "🦜", "🐳", "🦔", "🐰", "🦝", "🐝",
];

export const MAX_HINTS = 3;
const BASE_POINTS = 120;
const HINT_COST = 20;
const MIN_WIN_POINTS = 25;
const HELPER_POINTS = 15;
const MIN_DECK_BUFFER = 4;

export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function freeEmoji(session: GameSession): string {
  const taken = new Set(session.players.map((p) => p.emoji));
  return EMOJIS.find((e) => !taken.has(e)) ?? EMOJIS[session.players.length % EMOJIS.length];
}

export function cleanName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 18);
  if (name.length < 2) throw new GameError("El nombre necesita al menos 2 letras.");
  return name;
}

export function createSession(
  hostName: string,
  targetPlayers: number,
): { session: GameSession; player: Player } {
  const name = cleanName(hostName);
  const target = Math.min(12, Math.max(2, Math.round(targetPlayers) || 2));
  const now = Date.now();
  const host: Player = {
    id: newId("p"),
    name,
    emoji: hasYellowFlower(name) ? FLOWER_EMOJI : EMOJIS[0],
    score: 0,
    totalScore: 0,
    roundsPlayed: 0,
    isHost: true,
    flower: hasYellowFlower(name),
    joinedAt: now,
    lastSeen: now,
  };
  const session: GameSession = {
    code: newCode(),
    createdAt: now,
    hostId: host.id,
    targetPlayers: target,
    players: [host],
    settings: {
      categories: [...DEFAULT_CATEGORIES],
      roundSeconds: 90,
      roundsPerPlayer: 2,
    },
    phase: "lobby",
    deck: [],
    used: [],
    round: null,
    turnOrder: [],
    turnCursor: 0,
    roundsTotal: 0,
    roundsDone: 0,
    gameNumber: 1,
    history: [],
    version: 1,
    lastActivity: now,
    loadingDeck: false,
    deckError: null,
  };
  putSession(session);
  return { session, player: host };
}

export function joinSession(session: GameSession, rawName: string): Player {
  if (session.players.length >= 12)
    throw new GameError("La sala está llena (máximo 12 jugadores).");
  const name = cleanName(rawName);
  if (
    session.players.some(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    )
  )
    throw new GameError("Ya hay alguien con ese nombre en la sala.");
  const now = Date.now();
  const player: Player = {
    id: newId("p"),
    name,
    emoji: hasYellowFlower(name) ? FLOWER_EMOJI : freeEmoji(session),
    score: 0,
    totalScore: 0,
    roundsPlayed: 0,
    isHost: false,
    flower: hasYellowFlower(name),
    joinedAt: now,
    lastSeen: now,
  };
  session.players.push(player);
  if (session.phase !== "lobby" && !session.turnOrder.includes(player.id)) {
    session.turnOrder.push(player.id);
    session.roundsTotal += session.settings.roundsPerPlayer;
  }
  saveSession(session);
  return player;
}

export function requirePlayer(session: GameSession, playerId: string): Player {
  const player = session.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("No estás en esta sala.", 403);
  return player;
}

export function updateSettings(
  session: GameSession,
  player: Player,
  patch: Partial<Settings> & { targetPlayers?: number },
): void {
  if (!player.isHost) throw new GameError("Solo quien creó la sala puede cambiar la configuración.", 403);
  if (session.phase !== "lobby")
    throw new GameError("La configuración se cambia antes de empezar.");
  if (patch.categories) {
    const valid = patch.categories.filter((c) => CATEGORY_MAP.has(c));
    if (!valid.length) throw new GameError("Elige al menos una categoría.");
    session.settings.categories = valid as CategoryId[];
  }
  if (patch.roundSeconds)
    session.settings.roundSeconds = Math.min(300, Math.max(30, Math.round(patch.roundSeconds)));
  if (patch.roundsPerPlayer)
    session.settings.roundsPerPlayer = Math.min(5, Math.max(1, Math.round(patch.roundsPerPlayer)));
  if (patch.targetPlayers)
    session.targetPlayers = Math.min(12, Math.max(2, Math.round(patch.targetPlayers)));
  saveSession(session);
}

function shuffleIds(ids: string[]): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function refillDeck(session: GameSession, wanted: number): Promise<void> {
  const { deck, failed } = await buildDeck(session.settings.categories, wanted);
  const fresh = deck.filter((c) => !session.used.includes(c.id));
  session.deck.push(...fresh);
  session.deckError =
    session.deck.length === 0
      ? "No pudimos contactar a las APIs de personajes. Revisa tu conexión e inténtalo de nuevo."
      : failed.length === session.settings.categories.length
        ? "Algunas categorías no respondieron."
        : null;
  session.loadingDeck = false;
  saveSession(session);
}

/** Fire-and-forget top up so a long session never runs out of characters. */
function topUpIfNeeded(session: GameSession): void {
  if (session.loadingDeck || session.deck.length > MIN_DECK_BUFFER) return;
  session.loadingDeck = true;
  void refillDeck(session, MIN_DECK_BUFFER * 2).catch(() => {
    session.loadingDeck = false;
  });
}

function drawCharacter(session: GameSession): Character | null {
  const next = session.deck.shift();
  if (next) session.used.push(next.id);
  topUpIfNeeded(session);
  return next ?? null;
}

function startRound(session: GameSession): void {
  const character = drawCharacter(session);
  if (!character) {
    session.phase = "reveal";
    session.deckError =
      "Nos quedamos sin personajes nuevos. Espera unos segundos o vuelve al lobby.";
    return;
  }
  const actorId = session.turnOrder[session.turnCursor % session.turnOrder.length];
  const now = Date.now();
  const round: Round = {
    index: session.roundsDone,
    actorId,
    character,
    startedAt: now,
    endsAt: now + session.settings.roundSeconds * 1000,
    answers: [],
    guesses: [],
    hintsUsed: 0,
    status: "live",
    points: 0,
    helperPoints: 0,
    solvedAt: null,
  };
  session.round = round;
  session.phase = "playing";
  session.turnCursor += 1;
}

export async function startGame(
  session: GameSession,
  player: Player,
): Promise<void> {
  if (!player.isHost) throw new GameError("Solo quien creó la sala puede empezar.", 403);
  if (session.players.length < 2)
    throw new GameError("Hacen falta al menos 2 jugadores para jugar.");
  if (session.phase === "playing")
    throw new GameError("La partida ya está en marcha.");

  session.turnOrder = shuffleIds(session.players.map((p) => p.id));
  session.turnCursor = 0;
  session.roundsDone = 0;
  session.roundsTotal = session.players.length * session.settings.roundsPerPlayer;
  session.used = [];
  session.deck = [];
  session.deckError = null;
  session.loadingDeck = true;
  saveSession(session);

  await refillDeck(session, session.roundsTotal + MIN_DECK_BUFFER);
  if (!session.deck.length) {
    session.phase = "lobby";
    saveSession(session);
    throw new GameError(
      session.deckError ?? "No pudimos cargar personajes. Inténtalo de nuevo.",
      502,
    );
  }
  startRound(session);
  saveSession(session);
}

function finishRound(
  session: GameSession,
  status: "won" | "timeout" | "passed",
): void {
  const round = session.round;
  if (!round || round.status !== "live") return;
  round.status = status;
  const seconds = Math.round((Date.now() - round.startedAt) / 1000);
  const actor = session.players.find((p) => p.id === round.actorId);

  if (status === "won") {
    round.solvedAt = Date.now();
    const raw = BASE_POINTS - seconds - round.hintsUsed * HINT_COST;
    round.points = Math.max(MIN_WIN_POINTS, raw);
    round.helperPoints = HELPER_POINTS;
    if (actor) actor.score += round.points;
    for (const p of session.players) {
      if (p.id !== round.actorId) p.score += HELPER_POINTS;
    }
  }
  if (actor) actor.roundsPlayed += 1;

  const result: RoundResult = {
    index: round.index,
    gameNumber: session.gameNumber,
    actorId: round.actorId,
    actorName: actor?.name ?? "?",
    actorEmoji: actor?.emoji ?? "🎭",
    characterName: round.character.name,
    category: round.character.category,
    image: round.character.image,
    source: round.character.source,
    status,
    points: round.points,
    seconds: Math.min(seconds, session.settings.roundSeconds),
    hintsUsed: round.hintsUsed,
    guesses: round.guesses.length,
    at: Date.now(),
  };
  session.history.unshift(result);
  session.roundsDone += 1;
  session.phase = "reveal";
}

/** Rounds end on their own when the clock runs out, without server timers. */
export function syncClock(session: GameSession): void {
  const round = session.round;
  if (session.phase === "playing" && round?.status === "live" && Date.now() >= round.endsAt) {
    finishRound(session, "timeout");
    saveSession(session);
  }
}

export function submitAnswer(
  session: GameSession,
  player: Player,
  value: AnswerValue,
): void {
  const round = session.round;
  if (!round || round.status !== "live")
    throw new GameError("Ahora mismo no hay una ronda en juego.");
  if (player.id === round.actorId)
    throw new GameError("¡Tú eres quien adivina! Deja que el resto responda.");
  round.answers.unshift({
    id: newId("a"),
    playerId: player.id,
    playerName: player.name,
    emoji: player.emoji,
    value,
    at: Date.now(),
  });
  round.answers = round.answers.slice(0, 40);
  saveSession(session);
}

export function submitGuess(
  session: GameSession,
  player: Player,
  text: string,
): { correct: boolean } {
  const round = session.round;
  if (!round || round.status !== "live")
    throw new GameError("Ahora mismo no hay una ronda en juego.");
  if (player.id !== round.actorId)
    throw new GameError("Solo quien adivina puede escribir respuestas.", 403);
  const guess = text.trim().slice(0, 60);
  if (guess.length < 2) throw new GameError("Escribe un nombre un poco más largo.");

  const correct = matchesName(guess, round.character.name);
  round.guesses.unshift({ id: newId("g"), text: guess, correct, at: Date.now() });
  round.guesses = round.guesses.slice(0, 30);
  if (correct) finishRound(session, "won");
  saveSession(session);
  return { correct };
}

export function revealHint(session: GameSession, player: Player): void {
  const round = session.round;
  if (!round || round.status !== "live")
    throw new GameError("Ahora mismo no hay una ronda en juego.");
  if (player.id !== round.actorId)
    throw new GameError("Solo quien adivina puede pedir pistas.", 403);
  if (round.hintsUsed >= Math.min(MAX_HINTS, round.character.hints.length))
    throw new GameError("Ya usaste todas las pistas de esta ronda.");
  round.hintsUsed += 1;
  saveSession(session);
}

export function passRound(session: GameSession, player: Player): void {
  const round = session.round;
  if (!round || round.status !== "live")
    throw new GameError("Ahora mismo no hay una ronda en juego.");
  if (player.id !== round.actorId && !player.isHost)
    throw new GameError("Solo quien adivina (o el anfitrión) puede rendirse.", 403);
  finishRound(session, "passed");
  saveSession(session);
}

export function nextRound(session: GameSession): void {
  if (session.phase !== "reveal")
    throw new GameError("Todavía no terminó la ronda.");
  if (session.roundsDone >= session.roundsTotal) {
    session.phase = "finished";
    session.round = null;
    for (const p of session.players) p.totalScore += p.score;
    saveSession(session);
    return;
  }
  startRound(session);
  saveSession(session);
}

export function rematch(session: GameSession, player: Player): void {
  if (session.phase !== "finished")
    throw new GameError("La revancha se pide al terminar la partida.");
  if (!player.isHost) throw new GameError("Solo quien creó la sala puede pedir revancha.", 403);
  session.gameNumber += 1;
  session.phase = "lobby";
  session.round = null;
  session.roundsDone = 0;
  session.roundsTotal = 0;
  session.turnOrder = [];
  session.turnCursor = 0;
  for (const p of session.players) {
    p.score = 0;
    p.roundsPlayed = 0;
  }
  saveSession(session);
}
