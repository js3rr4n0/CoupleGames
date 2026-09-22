import type { CategoryId, Character } from "@/lib/types";
import { normalize, redact } from "@/lib/text";
import { CATEGORY_BY_ID, DEFAULT_CATEGORIES } from "@/lib/categories";
import { shuffle } from "./http";
import { fetchActors, fetchTvCharacters } from "./tvmaze";
import { fetchArtists } from "./deezer";
import { fetchAuthors } from "./openlibrary";
import { fetchPokemon } from "./pokeapi";
import { fetchRickAndMorty } from "./rickandmorty";
import { fetchDisney } from "./disney";
import { fetchStarWars } from "./starwars";
import { fetchAnimeCharacters } from "./anilist";
import { fetchDreamWorks, fetchPixar } from "./fandom";
import { fetchSuperheroes } from "./superheroes";
import { fetchHogwarts } from "./harrypotter";

type Fetcher = (count: number) => Promise<Character[]>;

/** Every source below is a free, key-less public API. */
const FETCHERS: Record<CategoryId, Fetcher> = {
  "cine-tv": fetchActors,
  "personajes-series": fetchTvCharacters,
  musica: fetchArtists,
  libros: fetchAuthors,
  pokemon: fetchPokemon,
  "rick-morty": fetchRickAndMorty,
  disney: fetchDisney,
  "star-wars": fetchStarWars,
  anime: fetchAnimeCharacters,
  dreamworks: fetchDreamWorks,
  pixar: fetchPixar,
  superheroes: fetchSuperheroes,
  "harry-potter": fetchHogwarts,
};

export { DEFAULT_CATEGORIES };
export const CATEGORY_MAP = CATEGORY_BY_ID;

function sanitize(character: Character): Character | null {
  const name = character.name.trim();
  if (!name || name.length > 42 || normalize(name).length < 3) return null;
  const hints = character.hints
    .map((h) => redact(h, name))
    .filter((h) => h.replace(/[•\s]/g, "").length > 6)
    .slice(0, 6);
  if (hints.length < 2) return null;
  return { ...character, name, hints };
}

/**
 * Pulls fresh characters from the selected public APIs. Nothing here is a fixed
 * list: every call hits the live endpoints with randomised pages and queries.
 */
export async function buildDeck(
  categories: CategoryId[],
  count: number,
): Promise<{ deck: Character[]; failed: CategoryId[] }> {
  const chosen = categories.length ? categories : DEFAULT_CATEGORIES;
  const perCategory = Math.max(2, Math.ceil(count / chosen.length) + 2);

  const results = await Promise.allSettled(
    chosen.map((id) => FETCHERS[id]?.(perCategory) ?? Promise.resolve([])),
  );

  const failed: CategoryId[] = [];
  const buckets: Character[][] = [];
  results.forEach((res, i) => {
    const clean =
      res.status === "fulfilled"
        ? res.value.map(sanitize).filter((c): c is Character => c !== null)
        : [];
    if (clean.length) buckets.push(shuffle(clean));
    else failed.push(chosen[i]);
  });

  // Round-robin across categories so a session never feels monothematic.
  const deck: Character[] = [];
  const seen = new Set<string>();
  let added = true;
  while (added) {
    added = false;
    for (const bucket of buckets) {
      const next = bucket.shift();
      if (!next) continue;
      added = true;
      const key = normalize(next.name);
      if (seen.has(key)) continue;
      seen.add(key);
      deck.push(next);
    }
  }
  return { deck, failed };
}
