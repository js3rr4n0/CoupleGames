export type CategoryId =
  | "cine-tv"
  | "personajes-series"
  | "musica"
  | "libros"
  | "pokemon"
  | "rick-morty"
  | "disney"
  | "star-wars"
  | "anime"
  | "dreamworks"
  | "pixar"
  | "superheroes"
  | "harry-potter";

export interface Character {
  id: string;
  name: string;
  category: CategoryId;
  hints: string[];
  image: string | null;
  source: string;
}

export type AnswerValue = "si" | "no" | "quiza";

export interface Player {
  id: string;
  name: string;
  emoji: string;
  score: number;
  totalScore: number;
  roundsPlayed: number;
  isHost: boolean;
  /** Se llama como una de las personas del guiño de la flor amarilla. */
  flower: boolean;
  joinedAt: number;
  lastSeen: number;
}

export type Phase = "lobby" | "playing" | "reveal" | "finished";

export interface AnswerEntry {
  id: string;
  playerId: string;
  playerName: string;
  emoji: string;
  value: AnswerValue;
  at: number;
}

/** Una pregunta escrita por quien adivina, con las respuestas que recibió. */
export interface QuestionEntry {
  id: string;
  text: string;
  at: number;
  answers: AnswerEntry[];
}

export interface GuessEntry {
  id: string;
  text: string;
  correct: boolean;
  at: number;
}

export type RoundStatus = "live" | "won" | "timeout" | "passed";

export interface Round {
  index: number;
  actorId: string;
  character: Character;
  startedAt: number;
  endsAt: number;
  /** Respuestas sueltas: las de cuando se pregunta en voz alta. */
  answers: AnswerEntry[];
  questions: QuestionEntry[];
  guesses: GuessEntry[];
  hintsUsed: number;
  status: RoundStatus;
  points: number;
  helperPoints: number;
  solvedAt: number | null;
}

export interface RoundResult {
  index: number;
  gameNumber: number;
  actorId: string;
  actorName: string;
  actorEmoji: string;
  characterName: string;
  category: CategoryId;
  image: string | null;
  source: string;
  status: RoundStatus;
  points: number;
  seconds: number;
  hintsUsed: number;
  guesses: number;
  at: number;
}

export interface Settings {
  categories: CategoryId[];
  roundSeconds: number;
  roundsPerPlayer: number;
}

export interface GameSession {
  code: string;
  createdAt: number;
  hostId: string;
  targetPlayers: number;
  players: Player[];
  settings: Settings;
  phase: Phase;
  deck: Character[];
  used: string[];
  round: Round | null;
  turnOrder: string[];
  turnCursor: number;
  roundsTotal: number;
  roundsDone: number;
  gameNumber: number;
  history: RoundResult[];
  version: number;
  lastActivity: number;
  loadingDeck: boolean;
  deckError: string | null;
}
