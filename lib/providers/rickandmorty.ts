import type { Character } from "@/lib/types";
import { cached, getJSON, randomInt, shuffle } from "./http";

interface RMCharacter {
  id: number;
  name: string;
  status: string;
  species: string;
  gender: string;
  image: string;
  origin: { name: string };
  location: { name: string };
  episode: string[];
}

const STATUS_ES: Record<string, string> = {
  Alive: "sigue vivo",
  Dead: "ya murió",
  unknown: "nadie sabe si sigue vivo",
};

export async function fetchRickAndMorty(count: number): Promise<Character[]> {
  const out: Character[] = [];
  for (let attempt = 0; attempt < 3 && out.length < count; attempt++) {
    const page = randomInt(1, 43);
    const res = await cached(`rm:page:${page}`, 60 * 60_000, () =>
      getJSON<{ results: RMCharacter[] }>(
        `https://rickandmortyapi.com/api/character?page=${page}`,
      ),
    );
    for (const c of shuffle(res.results ?? []).slice(0, count - out.length)) {
      out.push({
        id: `rm-${c.id}`,
        name: c.name,
        category: "rick-morty",
        image: c.image,
        source: "The Rick and Morty API",
        hints: [
          `Especie: ${c.species}`,
          `Según la serie, ${STATUS_ES[c.status] ?? c.status}`,
          c.origin.name !== "unknown" ? `Viene de ${c.origin.name}` : "",
          `Aparece en ${c.episode.length} episodio(s)`,
        ].filter(Boolean),
      });
    }
  }
  return out;
}
