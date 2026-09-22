import type { Character } from "@/lib/types";
import { cached, getJSON, pick, shuffle } from "./http";

interface Genre {
  id: number;
  name: string;
}
interface Artist {
  id: number;
  name: string;
  picture_big: string | null;
  picture_xl: string | null;
  nb_fan?: number;
}
interface Track {
  title: string;
  album?: { title: string };
  release_date?: string;
}

function fans(n: number | undefined): string | null {
  if (!n) return null;
  if (n >= 1_000_000) return `Tiene ${(n / 1_000_000).toFixed(1)}M de fans en Deezer`;
  if (n >= 1_000) return `Tiene ${Math.round(n / 1000)}K fans en Deezer`;
  return `Tiene ${n} fans en Deezer`;
}

/** Music artists taken from the live Deezer charts, genre by genre. */
export async function fetchArtists(count: number): Promise<Character[]> {
  const genres = await cached("deezer:genres", 6 * 60 * 60_000, async () => {
    const res = await getJSON<{ data: Genre[] }>("https://api.deezer.com/genre");
    return res.data.filter((g) => g.id !== 0);
  });

  const out: Character[] = [];
  const pool = shuffle(genres).slice(0, 4);
  for (const genre of pool) {
    if (out.length >= count) break;
    const chart = await cached(`deezer:chart:${genre.id}`, 30 * 60_000, () =>
      getJSON<{ data: Artist[] }>(
        `https://api.deezer.com/chart/${genre.id}/artists?limit=100`,
      ),
    );
    // Solo la parte alta del top: más abajo empiezan los desconocidos.
    const artists = shuffle((chart.data ?? []).slice(0, 40)).slice(
      0,
      count - out.length,
    );
    for (const artist of artists) {
      let track: string | null = null;
      try {
        const top = await getJSON<{ data: Track[] }>(
          `https://api.deezer.com/artist/${artist.id}/top?limit=1`,
          6000,
        );
        if (top.data?.[0]) track = top.data[0].title;
      } catch {
        // top tracks are a nice-to-have, never a blocker
      }
      out.push({
        id: `deezer-${artist.id}`,
        name: artist.name,
        category: "musica",
        image: artist.picture_xl ?? artist.picture_big ?? null,
        source: "Deezer",
        hints: [
          `Aparece en el top de Deezer del género ${genre.name}`,
          fans(artist.nb_fan) ?? "",
          track ? `Una de sus canciones más escuchadas: «${track}»` : "",
          "Se le escucha en plataformas de streaming",
        ].filter(Boolean),
      });
    }
  }
  return out;
}

export { pick };
