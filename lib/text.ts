const ACCENTS = /[̀-ͯ]/g;

export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(ACCENTS, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance, capped for short circuiting on long strings. */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * Fuzzy check of a guess against the secret character name. Tolerates accents,
 * typos and partial names ("Di Caprio" for "Leonardo DiCaprio") without ever
 * telling the client anything about the answer beyond true/false.
 */
export function matchesName(guess: string, answer: string): boolean {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g || !a) return false;
  if (g === a) return true;

  const tolerance = (s: string) => (s.length <= 5 ? 1 : s.length <= 10 ? 2 : 3);
  if (distance(g, a) <= tolerance(a)) return true;

  const answerWords = a.split(" ").filter((w) => w.length > 2);
  const guessWords = g.split(" ").filter((w) => w.length > 2);
  if (!answerWords.length || !guessWords.length) return false;

  // Every meaningful word of the guess must land on a word of the answer...
  const hit = (word: string) =>
    answerWords.some((w) => w === word || distance(w, word) <= tolerance(w));
  const allHit = guessWords.every(hit);

  // ...and it must cover the distinctive part (last word, usually the surname).
  const surname = answerWords[answerWords.length - 1];
  const coversSurname = guessWords.some(
    (w) => w === surname || distance(w, surname) <= tolerance(surname),
  );
  const compact = a.replace(/ /g, "");
  const guessCompact = g.replace(/ /g, "");
  if (guessCompact === compact) return true;

  return allHit && (coversSurname || answerWords.length === 1);
}

/** Replaces the answer (and its parts) inside a hint so clues never spoil it. */
export function redact(text: string, answer: string): string {
  let out = text;
  const parts = [answer, ...answer.split(/\s+/)].filter((p) => p.length > 2);
  for (const part of parts) {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "•••");
  }
  return out.replace(/(•••\s*){2,}/g, "••• ").trim();
}

/** Turns "Ada Lovelace" into "•• •••••••• " style blanks for the guesser. */
export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => "•".repeat(Math.min(word.length, 12)))
    .join(" ");
}

export function titleCase(input: string): string {
  return input
    .split(/[\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
