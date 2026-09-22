import type { Character } from "@/lib/types";
import { getJSON, pick, randomInt, shuffle } from "./http";

const SUBJECTS = [
  "fantasy",
  "science_fiction",
  "romance",
  "mystery",
  "horror",
  "poetry",
  "historical_fiction",
  "adventure",
  "biography",
  "philosophy",
  "young_adult_fiction",
  "thriller",
];

const SUBJECT_ES: Record<string, string> = {
  fantasy: "fantasía",
  science_fiction: "ciencia ficción",
  romance: "romance",
  mystery: "misterio",
  horror: "terror",
  poetry: "poesía",
  historical_fiction: "novela histórica",
  adventure: "aventuras",
  biography: "biografía",
  philosophy: "filosofía",
  young_adult_fiction: "juvenil",
  thriller: "suspenso",
};

interface Doc {
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  cover_i?: number;
  ratings_count?: number;
}

/** Authors behind real books catalogued by Open Library. */
export async function fetchAuthors(count: number): Promise<Character[]> {
  const out: Character[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < 3 && out.length < count; attempt++) {
    const subject = pick(SUBJECTS);
    const offset = randomInt(0, 90);
    const url =
      `https://openlibrary.org/search.json?q=subject%3A${subject}` +
      `&limit=50&offset=${offset}&sort=readinglog` +
      `&fields=title,author_name,author_key,first_publish_year,cover_i,ratings_count`;
    const res = await getJSON<{ docs: Doc[] }>(url, 12000);
    // El listado viene ordenado por lecturas; además se pide que el libro tenga
    // gente que lo haya valorado, para no sacar autores de nicho.
    const docs = shuffle(
      (res.docs ?? []).filter(
        (d) => d.author_name?.length && d.cover_i && (d.ratings_count ?? 0) >= 5,
      ),
    );
    for (const doc of docs) {
      if (out.length >= count) break;
      const author = doc.author_name![0];
      if (seen.has(author)) continue;
      seen.add(author);
      const others = (res.docs ?? [])
        .filter((d) => d.author_name?.[0] === author && d.title !== doc.title)
        .slice(0, 1)
        .map((d) => d.title);
      out.push({
        id: `openlibrary-${doc.author_key?.[0] ?? author}`,
        name: author,
        category: "libros",
        image: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
        source: "Open Library",
        hints: [
          `Escribió «${doc.title}»${doc.first_publish_year ? ` (${doc.first_publish_year})` : ""}`,
          `Se le encuentra en la estantería de ${SUBJECT_ES[subject] ?? subject}`,
          others.length ? `También firmó «${others[0]}»` : "",
          "Lo suyo son las páginas, no las pantallas",
        ].filter(Boolean),
      });
    }
  }
  return out;
}
