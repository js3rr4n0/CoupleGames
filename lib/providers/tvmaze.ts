import type { Character } from "@/lib/types";
import { cached, getJSON, pick, randomInt, shuffle } from "./http";

interface Show {
  id: number;
  name: string;
  type: string;
  genres: string[];
  premiered: string | null;
  language: string | null;
  rating: { average: number | null };
  weight: number;
  network: { name: string; country: { name: string } | null } | null;
}

interface CastEntry {
  voice?: boolean;
  person: {
    id: number;
    name: string;
    country: { name: string } | null;
    birthday: string | null;
    gender: string | null;
    image: { medium: string; original: string } | null;
  };
  character: {
    id: number;
    name: string;
    image: { medium: string; original: string } | null;
  };
}

const PAGES = 12;

/** El mazo de caras reales no quiere animación: ahí solo hay actores de voz. */
function isLiveAction(show: Show): boolean {
  return show.type !== "Animation" && !show.genres.includes("Anime");
}

async function popularShows(): Promise<Show[]> {
  const page = randomInt(0, PAGES);
  const shows = await cached(`tvmaze:shows:${page}`, 30 * 60_000, () =>
    getJSON<Show[]>(`https://api.tvmaze.com/shows?page=${page}`),
  );
  // Se ordenan por tirón (weight) y nos quedamos con la cabecera de la página.
  const good = shows
    .filter((s) => (s.rating?.average ?? 0) >= 7.5 && s.weight >= 95)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 25);
  return good.length >= 3 ? good : shows;
}

async function castOf(show: Show): Promise<CastEntry[]> {
  return cached(`tvmaze:cast:${show.id}`, 30 * 60_000, () =>
    getJSON<CastEntry[]>(`https://api.tvmaze.com/shows/${show.id}/cast`),
  );
}

function showHints(show: Show): string[] {
  const hints: string[] = [];
  const year = show.premiered?.slice(0, 4);
  hints.push(`Sale en la serie «${show.name}»${year ? ` (${year})` : ""}`);
  if (show.genres.length) hints.push(`Género: ${show.genres.join(", ")}`);
  const country = show.network?.country?.name;
  if (country) hints.push(`Es una producción de ${country}`);
  if (show.network?.name) hints.push(`Se emitió en ${show.network.name}`);
  if (show.rating?.average) hints.push(`La serie está valorada con un ${show.rating.average}`);
  return hints;
}

/** Real actors and actresses currently listed on TVmaze. */
export async function fetchActors(count: number): Promise<Character[]> {
  const out: Character[] = [];
  for (let attempt = 0; attempt < 4 && out.length < count; attempt++) {
    const shows = (await popularShows()).filter(isLiveAction);
    if (!shows.length) continue;
    const show = pick(shows);
    // El reparto viene ordenado por importancia: nos quedamos con la cabecera
    // para que no salgan secundarios de una sola escena.
    const cast = (await castOf(show))
      // Sin doblaje: la cara del actor de voz no la reconoce nadie.
      .filter((c) => c.person.image && !c.voice)
      .slice(0, 6);
    for (const entry of shuffle(cast).slice(0, count - out.length)) {
      const birthYear = entry.person.birthday?.slice(0, 4);
      out.push({
        id: `tvmaze-person-${entry.person.id}`,
        name: entry.person.name,
        category: "cine-tv",
        image: entry.person.image?.original ?? null,
        source: "TVmaze",
        hints: [
          ...showHints(show),
          `Interpreta a ${entry.character.name}`,
          entry.person.country?.name
            ? `Nació en ${entry.person.country.name}`
            : "",
          birthYear ? `Año de nacimiento: ${birthYear}` : "",
        ].filter(Boolean),
      });
    }
  }
  return out;
}

/** Fictional characters from TV series. */
export async function fetchTvCharacters(count: number): Promise<Character[]> {
  const out: Character[] = [];
  for (let attempt = 0; attempt < 4 && out.length < count; attempt++) {
    const shows = await popularShows();
    const show = pick(shows);
    const cast = (await castOf(show))
      .filter((c) => c.character.image && c.character.name.split(" ").length <= 4)
      .slice(0, 6);
    for (const entry of shuffle(cast).slice(0, count - out.length)) {
      out.push({
        id: `tvmaze-char-${entry.character.id}`,
        name: entry.character.name,
        category: "personajes-series",
        image: entry.character.image?.original ?? null,
        source: "TVmaze",
        hints: [
          ...showHints(show),
          "Es un personaje de ficción",
          `Lo interpreta ${entry.person.name}`,
        ],
      });
    }
  }
  return out;
}
