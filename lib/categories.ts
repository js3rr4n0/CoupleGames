import type { CategoryId } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  emoji: string;
  description: string;
  source: string;
  accent: string;
}

/** Client-safe catalogue: the UI never learns which characters exist, only the themes. */
export const CATEGORY_META: CategoryMeta[] = [
  {
    id: "cine-tv",
    label: "Actores y actrices",
    emoji: "🎬",
    description: "Caras reales del cine y la tele",
    source: "TVmaze",
    accent: "from-rose-500 to-orange-400",
  },
  {
    id: "personajes-series",
    label: "Personajes de series",
    emoji: "📺",
    description: "Protagonistas y villanos de ficción",
    source: "TVmaze",
    accent: "from-violet-500 to-fuchsia-400",
  },
  {
    id: "musica",
    label: "Música",
    emoji: "🎧",
    description: "Artistas que suenan ahora mismo",
    source: "Deezer",
    accent: "from-emerald-500 to-teal-400",
  },
  {
    id: "libros",
    label: "Libros",
    emoji: "📚",
    description: "Autores y autoras de todo el mundo",
    source: "Open Library",
    accent: "from-amber-500 to-yellow-400",
  },
  {
    id: "pokemon",
    label: "Pokémon",
    emoji: "⚡",
    description: "Las criaturas de la Pokédex",
    source: "PokéAPI",
    accent: "from-yellow-400 to-amber-500",
  },
  {
    id: "rick-morty",
    label: "Rick and Morty",
    emoji: "🛸",
    description: "El multiverso entero",
    source: "Rick and Morty API",
    accent: "from-lime-400 to-green-500",
  },
  {
    id: "disney",
    label: "Disney",
    emoji: "🏰",
    description: "Clásicos y modernos del castillo",
    source: "Disney API",
    accent: "from-sky-500 to-blue-400",
  },
  {
    id: "star-wars",
    label: "Star Wars",
    emoji: "✨",
    description: "Una galaxia muy, muy lejana",
    source: "SWAPI",
    accent: "from-slate-400 to-zinc-500",
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORY_META.map((c) => [c.id, c]));

export const DEFAULT_CATEGORIES: CategoryId[] = [
  "cine-tv",
  "personajes-series",
  "musica",
  "disney",
];
