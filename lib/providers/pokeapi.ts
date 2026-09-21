import type { Character } from "@/lib/types";
import { getJSON, randomInt, shuffle } from "./http";
import { titleCase } from "@/lib/text";

interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  sprites: {
    other?: { "official-artwork"?: { front_default: string | null } };
    front_default: string | null;
  };
}

interface Species {
  names: { name: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  generation: { name: string };
  color: { name: string };
  habitat: { name: string } | null;
  is_legendary: boolean;
  is_mythical: boolean;
}

const TYPE_ES: Record<string, string> = {
  normal: "normal", fire: "fuego", water: "agua", electric: "eléctrico",
  grass: "planta", ice: "hielo", fighting: "lucha", poison: "veneno",
  ground: "tierra", flying: "volador", psychic: "psíquico", bug: "bicho",
  rock: "roca", ghost: "fantasma", dragon: "dragón", dark: "siniestro",
  steel: "acero", fairy: "hada",
};

const GEN_ES: Record<string, string> = {
  "generation-i": "primera", "generation-ii": "segunda",
  "generation-iii": "tercera", "generation-iv": "cuarta",
  "generation-v": "quinta", "generation-vi": "sexta",
  "generation-vii": "séptima", "generation-viii": "octava",
  "generation-ix": "novena",
};

export async function fetchPokemon(count: number): Promise<Character[]> {
  const ids = shuffle(
    Array.from({ length: 60 }, () => randomInt(1, 899)),
  ).slice(0, count);

  const results = await Promise.allSettled(
    ids.map(async (id): Promise<Character> => {
      const [mon, species] = await Promise.all([
        getJSON<Pokemon>(`https://pokeapi.co/api/v2/pokemon/${id}`),
        getJSON<Species>(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
      ]);
      const nameEs =
        species.names.find((n) => n.language.name === "es")?.name ??
        titleCase(mon.name);
      const flavor = species.flavor_text_entries
        .find((f) => f.language.name === "es")
        ?.flavor_text.replace(/[\n\f\r]/g, " ");
      const types = mon.types.map((t) => TYPE_ES[t.type.name] ?? t.type.name);
      return {
        id: `pokemon-${mon.id}`,
        name: nameEs,
        category: "pokemon",
        image:
          mon.sprites.other?.["official-artwork"]?.front_default ??
          mon.sprites.front_default,
        source: "PokéAPI",
        hints: [
          `Es de tipo ${types.join(" y ")}`,
          `Pertenece a la ${GEN_ES[species.generation.name] ?? species.generation.name} generación`,
          `Mide ${mon.height * 10} cm y pesa ${(mon.weight / 10).toFixed(1)} kg`,
          species.is_legendary || species.is_mythical
            ? "Es legendario o singular"
            : species.habitat
              ? `Su hábitat: ${species.habitat.name}`
              : "",
          flavor ? `De la Pokédex: ${flavor}` : "",
        ].filter(Boolean),
      };
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Character> => r.status === "fulfilled")
    .map((r) => r.value);
}
