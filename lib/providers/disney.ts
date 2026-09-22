import type { Character } from "@/lib/types";
import { cached, getJSON, randomInt, shuffle } from "./http";

interface DisneyCharacter {
  _id: number;
  name: string;
  imageUrl: string | null;
  films: string[];
  tvShows: string[];
  shortFilms: string[];
  videoGames: string[];
  allies: string[];
  parkAttractions: string[];
}

/** Cuántas veces ha salido en algo: separa a los protagonistas del relleno. */
function appearances(c: DisneyCharacter): number {
  return (
    c.films.length +
    c.tvShows.length +
    c.shortFilms.length +
    c.videoGames.length +
    c.parkAttractions.length
  );
}

export async function fetchDisney(count: number): Promise<Character[]> {
  const out: Character[] = [];
  // Cuatro páginas a la vez: hay que mirar bastantes fichas para encontrar
  // personajes de verdad conocidos.
  const pages = [randomInt(1, 100), randomInt(1, 100), randomInt(1, 100), randomInt(1, 100)];
  const results = await Promise.allSettled(
    pages.map((page) =>
      cached(`disney:page:${page}`, 60 * 60_000, () =>
        getJSON<{ data: DisneyCharacter[] }>(
          `https://api.disneyapi.dev/character?page=${page}&pageSize=50`,
          12000,
        ),
      ),
    ),
  );

  const pool = results
    .flatMap((res) => (res.status === "fulfilled" ? (res.value.data ?? []) : []))
    .filter(
      (c) =>
        c.imageUrl &&
        c.films.length > 0 &&
        c.films.length + c.tvShows.length >= 2 &&
        appearances(c) >= 12 &&
        c.name.split(" ").length <= 3 &&
        !/\(/.test(c.name),
    );

  {
    const usable = pool;
    for (const c of shuffle(usable).slice(0, count - out.length)) {
      out.push({
        id: `disney-${c._id}`,
        name: c.name,
        category: "disney",
        image: c.imageUrl,
        source: "Disney API",
        hints: [
          `Aparece en «${c.films[0]}»`,
          c.films.length > 1 ? `También sale en «${c.films[1]}»` : "",
          c.tvShows.length ? `Tiene serie: «${c.tvShows[0]}»` : "",
          c.parkAttractions.length
            ? `Hay una atracción del parque dedicada a esto`
            : "Es parte del universo Disney",
          c.allies.length ? `Uno de sus aliados es ${c.allies[0]}` : "",
          c.videoGames.length ? `Sale en ${c.videoGames.length} videojuego(s)` : "",
        ].filter(Boolean),
      });
    }
  }
  return out;
}
