import { CATEGORY_BY_ID } from "./categories";
import { needsSharedStore } from "./kv";
import { MAX_HINTS } from "./game";
import { maskName } from "./text";
import type {
  AnswerEntry,
  QuestionEntry,
  CategoryId,
  GameSession,
  GuessEntry,
  Phase,
  RoundResult,
  RoundStatus,
  Settings,
} from "./types";

export interface PlayerView {
  id: string;
  name: string;
  emoji: string;
  score: number;
  totalScore: number;
  roundsPlayed: number;
  isHost: boolean;
  online: boolean;
  isActor: boolean;
  flower: boolean;
}

export interface CardView {
  categoryId: CategoryId;
  categoryLabel: string;
  categoryEmoji: string;
  source: string;
  /** Only ever present for the players who are NOT guessing. */
  name?: string;
  image?: string | null;
  hints?: string[];
  /** Only ever present for the player who is guessing. */
  mask?: string;
  letters?: number;
  revealedHints?: string[];
}

/** Candidato que el grupo puede elegir; quien adivina nunca lo recibe. */
export interface OptionView {
  id: string;
  name: string;
  image: string | null;
  categoryLabel: string;
  categoryEmoji: string;
  hint: string;
}

export interface RoundView {
  index: number;
  actorId: string;
  actorName: string;
  actorEmoji: string;
  status: RoundStatus;
  /** null cuando la ronda es de tiempo ilimitado. */
  secondsLeft: number | null;
  totalSeconds: number;
  hintsUsed: number;
  hintsMax: number;
  answers: AnswerEntry[];
  questions: QuestionEntry[];
  guesses: GuessEntry[];
  card: CardView;
  youGuess: boolean;
  /** Veces que el grupo ha cambiado la carta en esta ronda. */
  swaps: number;
  options: OptionView[];
}

export interface SessionView {
  code: string;
  phase: Phase;
  version: number;
  serverTime: number;
  targetPlayers: number;
  settings: Settings;
  players: PlayerView[];
  you: PlayerView | null;
  round: RoundView | null;
  lastResult: RoundResult | null;
  history: RoundResult[];
  roundsDone: number;
  roundsTotal: number;
  gameNumber: number;
  deckLoading: boolean;
  deckError: string | null;
  deckRemaining: number;
  /** El servidor no puede guardar salas de forma fiable en este alojamiento. */
  needsSharedStore: boolean;
}

const ONLINE_MS = 15_000;

export function buildView(session: GameSession, playerId: string | null): SessionView {
  const now = Date.now();
  const round = session.round;

  const players: PlayerView[] = session.players.map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    score: p.score,
    totalScore: p.totalScore,
    roundsPlayed: p.roundsPlayed,
    isHost: p.isHost,
    flower: p.flower,
    online: now - p.lastSeen < ONLINE_MS,
    isActor: round?.actorId === p.id && session.phase === "playing",
  }));

  let roundView: RoundView | null = null;
  if (round && session.phase === "playing") {
    const meta = CATEGORY_BY_ID.get(round.character.category);
    const youGuess = round.actorId === playerId;
    const card: CardView = {
      categoryId: round.character.category,
      categoryLabel: meta?.label ?? round.character.category,
      categoryEmoji: meta?.emoji ?? "🎲",
      source: round.character.source,
    };
    if (youGuess) {
      // The guesser gets blanks and only the hints they paid for. The name and
      // the picture never leave the server for this player.
      card.mask = maskName(round.character.name);
      card.letters = round.character.name.replace(/\s/g, "").length;
      card.revealedHints = round.character.hints.slice(0, round.hintsUsed);
    } else {
      card.name = round.character.name;
      card.image = round.character.image;
      card.hints = round.character.hints;
    }
    const actor = session.players.find((p) => p.id === round.actorId);
    roundView = {
      index: round.index,
      actorId: round.actorId,
      actorName: actor?.name ?? "?",
      actorEmoji: actor?.emoji ?? "🎭",
      status: round.status,
      secondsLeft:
        session.settings.roundSeconds === 0
          ? null
          : Math.max(0, Math.round((round.endsAt - now) / 1000)),
      totalSeconds: session.settings.roundSeconds,
      hintsUsed: round.hintsUsed,
      hintsMax: Math.min(MAX_HINTS, round.character.hints.length),
      answers: round.answers.slice(0, 12),
      questions: round.questions.slice(0, 12),
      guesses: round.guesses.slice(0, 12),
      card,
      youGuess,
      swaps: round.swaps,
      options: youGuess
        ? []
        : round.options.map((option) => {
            const meta = CATEGORY_BY_ID.get(option.category);
            return {
              id: option.id,
              name: option.name,
              image: option.image,
              categoryLabel: meta?.label ?? option.category,
              categoryEmoji: meta?.emoji ?? "🎲",
              hint: option.hints[0] ?? "",
            };
          }),
    };
  }

  return {
    code: session.code,
    phase: session.phase,
    version: session.version,
    serverTime: now,
    targetPlayers: session.targetPlayers,
    settings: session.settings,
    players,
    you: players.find((p) => p.id === playerId) ?? null,
    round: roundView,
    lastResult: session.phase === "reveal" ? (session.history[0] ?? null) : null,
    history: session.history.slice(0, 40),
    roundsDone: session.roundsDone,
    roundsTotal: session.roundsTotal,
    gameNumber: session.gameNumber,
    deckLoading: session.loadingDeck,
    deckError: session.deckError,
    deckRemaining: session.deck.length,
    needsSharedStore: needsSharedStore(),
  };
}
