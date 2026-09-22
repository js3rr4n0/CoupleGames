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
    const page = randomInt(1, 4);
    const res = await cached(`rm:page:${page}`, 60 * 60_000, () =>
      getJSON<{ results: RMCharacter[] }>(
        `https://rickandmortyapi.com/api/character?page=${page}`,
      ),
    );
    // Tres episodios o más: fuera los que aparecen un segundo de fondo. Si la
    // página va escasa, se cogen los que más veces salen.
    const all = res.results ?? [];
    const pool = [...all]
      .sort((a, b) => b.episode.length - a.episode.length)
      .filter((c) => c.episode.length >= 4)
      .slice(0, 12);
    for (const c of shuffle(pool).slice(0, count - out.length)) {
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
          c.gender && c.gender !== "unknown" ? `Género: ${c.gender}` : "",
          c.location?.name && c.location.name !== "unknown"
            ? `Se le ha visto en ${c.location.name}`
            : "",
        ].filter(Boolean),
      });
    }
  }
  return out;
}
