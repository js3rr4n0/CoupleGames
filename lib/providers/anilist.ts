import type { Character } from "@/lib/types";
import { randomInt, shuffle } from "./http";

const ENDPOINT = "https://graphql.anilist.co";

/** Sorted by favourites, so the pool is the anime everybody actually knows. */
const QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 25) {
    characters(sort: FAVOURITES_DESC) {
      id
      name { full }
      image { large }
      description(asHtml: false)
      favourites
      media(perPage: 3, sort: POPULARITY_DESC) {
        nodes { title { romaji english } format seasonYear genres }
      }
    }
  }
}`;

interface AniCharacter {
  id: number;
  name: { full: string | null };
  image: { large: string | null };
  description: string | null;
  favourites: number;
  media: {
    nodes: {
      title: { romaji: string | null; english: string | null };
      format: string | null;
      seasonYear: number | null;
      genres: string[];
    }[];
  };
}

const FORMAT_ES: Record<string, string> = {
  TV: "una serie de anime",
  TV_SHORT: "un anime corto",
  MOVIE: "una película de anime",
  OVA: "un OVA",
  ONA: "un anime web",
  SPECIAL: "un especial",
  MANGA: "un manga",
  NOVEL: "una novela ligera",
  ONE_SHOT: "un one-shot",
};

const GENRE_ES: Record<string, string> = {
  Action: "acción",
  Adventure: "aventura",
  Comedy: "comedia",
  Drama: "drama",
  Ecchi: "ecchi",
  Fantasy: "fantasía",
  Horror: "terror",
  "Mahou Shoujo": "mahou shoujo",
  Mecha: "mecha",
  Music: "música",
  Mystery: "misterio",
  Psychological: "psicológico",
  Romance: "romance",
  "Sci-Fi": "ciencia ficción",
  "Slice of Life": "recuentos de la vida",
  Sports: "deportes",
  Supernatural: "sobrenatural",
  Thriller: "suspenso",
};

export async function fetchAnimeCharacters(count: number): Promise<Character[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { page: randomInt(1, 9) } }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = (await res.json()) as {
    data?: { Page?: { characters?: AniCharacter[] } };
  };

  const characters = json.data?.Page?.characters ?? [];
  return shuffle(
    characters.filter((c) => c.name.full && c.image.large && c.media.nodes.length),
  )
    .slice(0, count)
    .map((c) => {
      const [first, second] = c.media.nodes;
      const title = first.title.english ?? first.title.romaji ?? "";
      // The anime and its manga often share a title; a repeated hint is wasted.
      const otherTitle = second?.title.english ?? second?.title.romaji ?? "";
      const alsoIn =
        otherTitle && otherTitle.toLowerCase() !== title.toLowerCase()
          ? otherTitle
          : "";
      const genres = first.genres
        .slice(0, 3)
        .map((g) => GENRE_ES[g] ?? g.toLowerCase());
      return {
        id: `anilist-${c.id}`,
        name: c.name.full!,
        category: "anime" as const,
        image: c.image.large,
        source: "AniList",
        hints: [
          `Sale en ${FORMAT_ES[first.format ?? ""] ?? "una serie"}${
            first.seasonYear ? ` de ${first.seasonYear}` : ""
          }`,
          genres.length ? `Géneros: ${genres.join(", ")}` : "",
          c.favourites > 1000
            ? `Es de los favoritos de ${Math.round(c.favourites / 1000)}K usuarios de AniList`
            : "",
          title ? `Aparece en «${title}»` : "",
          alsoIn ? `También en «${alsoIn}»` : "",
        ].filter(Boolean),
      };
    });
}
