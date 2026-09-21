import type { CategoryId } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  emoji: string;
  description: string;
  source: string;
  /** Solid colour classes for the category chip: no gradients anywhere. */
  chip: string;
}

/** Client-safe catalogue: the UI never learns which characters exist, only the themes. */
export const CATEGORY_META: CategoryMeta[] = [
  {
    id: "cine-tv",
    label: "Actores y actrices",
    emoji: "🎬",
    description: "Caras reales del cine y la tele",
    source: "TVmaze",
    chip: "bg-tomato text-white",
  },
  {
    id: "personajes-series",
    label: "Personajes de series",
    emoji: "📺",
    description: "Protagonistas y villanos de ficción",
    source: "TVmaze",
    chip: "bg-grape text-white",
  },
  {
    id: "musica",
    label: "Música",
    emoji: "🎧",
    description: "Artistas que suenan ahora mismo",
    source: "Deezer",
    chip: "bg-grass text-white",
  },
  {
    id: "libros",
    label: "Libros",
    emoji: "📚",
    description: "Autores y autoras de todo el mundo",
    source: "Open Library",
    chip: "bg-sun text-ink",
  },
  {
    id: "pokemon",
    label: "Pokémon",
    emoji: "⚡",
    description: "Las criaturas de la Pokédex",
    source: "PokéAPI",
    chip: "bg-bubblegum text-ink",
  },
  {
    id: "rick-morty",
    label: "Rick and Morty",
    emoji: "🛸",
    description: "El multiverso entero",
    source: "Rick and Morty API",
    chip: "bg-teal text-white",
  },
  {
    id: "disney",
    label: "Disney",
    emoji: "🏰",
    description: "Clásicos y modernos del castillo",
    source: "Disney API",
    chip: "bg-sky text-white",
  },
  {
    id: "star-wars",
    label: "Star Wars",
    emoji: "✨",
    description: "Una galaxia muy, muy lejana",
    source: "SWAPI",
    chip: "bg-ink text-white",
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORY_META.map((c) => [c.id, c]));

export const DEFAULT_CATEGORIES: CategoryId[] = [
  "cine-tv",
  "personajes-series",
  "musica",
  "disney",
];
