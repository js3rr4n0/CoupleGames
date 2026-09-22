import type { Character } from "@/lib/types";
import { cached, getJSON, shuffle } from "./http";

interface Hero {
  id: number;
  name: string;
  powerstats: Record<string, number>;
  appearance: { race: string | null; gender: string | null };
  biography: {
    fullName: string | null;
    publisher: string | null;
    alignment: string | null;
    firstAppearance: string | null;
    alterEgos: string | null;
  };
  work: { occupation: string | null };
  connections: { groupAffiliation: string | null };
  images: { lg: string | null; md: string | null };
}

const STAT_ES: Record<string, string> = {
  intelligence: "la inteligencia",
  strength: "la fuerza",
  speed: "la velocidad",
  durability: "el aguante",
  power: "el poder",
  combat: "el combate",
};

function bestStat(stats: Record<string, number>): string | null {
  const entries = Object.entries(stats).filter(([, v]) => typeof v === "number");
  if (!entries.length) return null;
  const [key, value] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return `Donde destaca es en ${STAT_ES[key] ?? key} (${value}/100)`;
}

/** 563 comic-book characters served as plain JSON, no key and no sign-up. */
export async function fetchSuperheroes(count: number): Promise<Character[]> {
  const heroes = await cached("superheroes:all", 12 * 60 * 60_000, () =>
    getJSON<Hero[]>(
      "https://akabab.github.io/superhero-api/api/all.json",
      15000,
    ),
  );

  // Los personajes famosos tienen la ficha completa; los de relleno vienen con
  // guiones en casi todo, así que se mide cuánta información real traen.
  const richness = (hero: Hero): number => {
    const filled = (value: string | null | undefined) =>
      value && value !== "-" && value !== "null" && !/^no .* found/i.test(value) ? 1 : 0;
    return (
      filled(hero.biography.fullName) +
      filled(hero.biography.alterEgos) +
      filled(hero.biography.firstAppearance) +
      filled(hero.work.occupation) +
      filled(hero.connections.groupAffiliation) +
      filled(hero.appearance.race) +
      (/(marvel|dc) comics/i.test(hero.biography.publisher ?? "") ? 2 : 0)
    );
  };

  const known = heroes.filter(
    (h) => h.images?.lg && h.name.length <= 28 && richness(h) >= 7,
  );

  return shuffle(known.length >= count ? known : heroes.filter((h) => h.images?.lg))
    .slice(0, count)
    .map((hero) => {
      const group = hero.connections.groupAffiliation
        ?.split(/[,;]/)[0]
        ?.replace(/^(formerly|member of|ally of|leader of)\s+/i, "")
        .trim()
        .slice(0, 60);
      return {
        id: `superhero-${hero.id}`,
        name: hero.name,
        category: "superheroes" as const,
        image: hero.images.lg ?? hero.images.md,
        source: "Superhero API",
        hints: [
          hero.biography.publisher
            ? /comics/i.test(hero.biography.publisher)
              ? `Lo publica ${hero.biography.publisher}`
              : `Viene del mundo de ${hero.biography.publisher}`
            : "Sale en los cómics",
          hero.biography.alignment === "bad"
            ? "Es de los malos"
            : hero.biography.alignment === "good"
              ? "Es de los buenos"
              : "",
          hero.appearance.race && hero.appearance.race !== "null"
            ? `Su especie: ${hero.appearance.race}`
            : "",
          bestStat(hero.powerstats) ?? "",
          group && group.length > 4 ? `Se le relaciona con ${group}` : "",
          hero.biography.firstAppearance &&
          hero.biography.firstAppearance !== "-"
            ? `Apareció por primera vez en ${hero.biography.firstAppearance}`
            : "",
        ].filter(Boolean),
      };
    });
}
