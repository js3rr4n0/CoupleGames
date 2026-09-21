import type { Character } from "@/lib/types";
import { cached, getJSON, shuffle } from "./http";

interface Person {
  name: string;
  height: string;
  gender: string;
  birth_year: string;
  homeworld: string;
  films: string[];
  starships: string[];
  species: string[];
  url: string;
}

interface Planet {
  name: string;
  climate: string;
  terrain: string;
  url: string;
}

export async function fetchStarWars(count: number): Promise<Character[]> {
  const [people, planets] = await Promise.all([
    cached("swapi:people", 12 * 60 * 60_000, () =>
      getJSON<Person[]>("https://swapi.info/api/people", 12000),
    ),
    cached("swapi:planets", 12 * 60 * 60_000, () =>
      getJSON<Planet[]>("https://swapi.info/api/planets", 12000).catch(
        () => [] as Planet[],
      ),
    ),
  ]);

  const byUrl = new Map(planets.map((p) => [p.url, p]));

  return shuffle(people)
    .slice(0, count)
    .map((p) => {
      const home = byUrl.get(p.homeworld);
      return {
        id: `swapi-${p.url.split("/").pop()}`,
        name: p.name,
        category: "star-wars" as const,
        image: null,
        source: "SWAPI",
        hints: [
          `Aparece en ${p.films.length} película(s) de la saga`,
          home ? `Su planeta natal es ${home.name} (${home.terrain})` : "",
          p.height !== "unknown" ? `Mide ${p.height} cm` : "",
          p.birth_year !== "unknown" ? `Nació en el año ${p.birth_year}` : "",
          p.starships.length ? `Ha pilotado ${p.starships.length} nave(s)` : "",
        ].filter(Boolean),
      };
    });
}
