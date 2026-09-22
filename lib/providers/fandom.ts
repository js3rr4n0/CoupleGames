import type { CategoryId, Character } from "@/lib/types";
import { cached, getJSON, pick, shuffle } from "./http";

/**
 * Fandom wikis expose the standard MediaWiki API with no key, so the animated
 * film universes can be read the same way for every studio.
 */
interface WikiSource {
  host: string;
  category: CategoryId;
  source: string;
  universe: string;
  /** Seed categories to draw names from. */
  pools?: string[];
  /** …or discover the wiki's per-film character categories on the fly. */
  subcatsOf?: string;
  /**
   * Exact suffix the wiki uses for film categories. DreamWorks writes
   * "Madagascar characters" for sagas and "Singing Characters" for traits, so
   * the capital letter is what tells them apart.
   */
  sagaSuffix: string;
}

interface MemberList {
  query?: { categorymembers?: { title: string; ns: number }[] };
}

interface PageDetail {
  title: string;
  pageid: number;
  /** Article size in bytes: the closest thing a wiki has to "is this famous?". */
  length?: number;
  original?: { source: string };
  categories?: { title: string }[];
}

interface PageQuery {
  query?: { pages?: Record<string, PageDetail> };
}

const SKIP_CATEGORY =
  /^(characters?|males?|females?|adults?|kids?|teenagers?|browse|images?|article stubs?|stubs?|candidates for deletion|pages? .*|.*needing .*|a-z|character list|cameo characters|deceased characters|video game characters)$/i;

/** Wiki housekeeping categories that look like sagas but are not. */
const NOT_A_SAGA = new RegExp(
  "^(" +
    // wiki housekeeping
    "shorts?|pixar popcorn|.*interstitials?|video ?game|game|deceased|cameo|" +
    "minor|major|main|supporting|recurring|unseen|mentioned|live-?action|" +
    "original|upcoming|unnamed|unidentified|" +
    // descriptors that also end in "Characters"
    "male|female|adult|child|teen|animal|human|humanoid|anthropomorphic|" +
    "magical|fictional|tv|movie|film|book|comic|crossover|" +
    // nationalities
    "american|british|english|scottish|irish|welsh|french|german|italian|" +
    "spanish|mexican|chinese|japanese|korean|indian|russian|african|" +
    "australian|canadian|egyptian|greek|norwegian|swedish|danish|dutch|" +
    "brazilian|argentine|asian|european|latino" +
    ")$",
  "i",
);

const TRAIT_ES: Record<string, string> = {
  villains: "Es de los malos",
  villainesses: "Es de las malas",
  heroes: "Es de los buenos",
  heroines: "Es de las buenas",
  protagonists: "Es protagonista de su película",
  antagonists: "Hace de antagonista",
  sidekicks: "Es más bien el acompañante del protagonista",
  leaders: "Lidera a los suyos",
  royalty: "Tiene sangre real",
  "magic users": "Usa magia",
  fighters: "Sabe pelear",
  swordsmen: "Maneja la espada",
  warriors: "Es un guerrero",
  pirates: "Es pirata",
  vikings: "Es vikingo",
  knights: "Es caballero",
  mercenaries: "Trabaja por dinero",
  killers: "Tiene las manos manchadas",
  narrators: "A veces narra la historia",
  "reformed characters": "Empezó mal y acabó bien",
  lovers: "Tiene una historia de amor",
  siblings: "Tiene hermanos",
  twins: "Tiene un gemelo",
  "anthropomorphic characters": "Es un animal que habla",
  robots: "Es un robot",
  toys: "Es un juguete",
  monsters: "Es un monstruo",
  aliens: "No es de este planeta",
  ghosts: "Es un fantasma",
  "talking animals": "Es un animal que habla",
};

const SPECIES_ES: Record<string, string> = {
  bears: "oso",
  cats: "gato",
  dogs: "perro",
  dragons: "dragón",
  donkeys: "burro",
  fish: "pez",
  birds: "ave",
  lions: "león",
  pandas: "panda",
  ogres: "ogro",
  horses: "caballo",
  rats: "rata",
  mice: "ratón",
  wolves: "lobo",
  tigers: "tigre",
  penguins: "pingüino",
  rabbits: "conejo",
  foxes: "zorro",
  insects: "insecto",
  snakes: "serpiente",
  turtles: "tortuga",
  dinosaurs: "dinosaurio",
  humans: "humano",
  trolls: "trol",
};

interface ParsedCategories {
  sagas: string[];
  traits: string[];
  species: string[];
}

function parseCategories(
  categories: string[],
  sagaSuffix: string,
): ParsedCategories {
  const clean = categories
    .map((c) => c.replace(/^Category:/, "").trim())
    .filter((c) => !SKIP_CATEGORY.test(c));

  const sagas: string[] = [];
  const traits: string[] = [];
  const species: string[] = [];

  for (const category of clean) {
    const lower = category.toLowerCase();
    // Traits win over the saga test: "Anthropomorphic characters" is not a film.
    if (TRAIT_ES[lower]) {
      traits.push(TRAIT_ES[lower]);
      continue;
    }
    if (SPECIES_ES[lower]) {
      species.push(SPECIES_ES[lower]);
      continue;
    }
    if (category.endsWith(sagaSuffix)) {
      const title = category.slice(0, -sagaSuffix.length).trim();
      if (title.length > 2 && !NOT_A_SAGA.test(title)) sagas.push(title);
    }
  }

  return { sagas, traits, species };
}

function buildHints(
  parsed: ParsedCategories,
  universe: string,
  isFilm: (title: string) => boolean,
  fallbackFranchise: string | null,
): { hints: string[]; franchise: string | null } {
  // Sequels are separate categories ("Toy Story 2 Characters"), so the saga is
  // the title the others build on, not simply the shortest one.
  const sagas = [...new Set(parsed.sagas)].filter(isFilm);
  const scored = sagas
    .map((saga) => ({
      saga,
      sequels: sagas.filter((other) => other.startsWith(saga)).length,
    }))
    .sort((a, b) => b.sequels - a.sequels || a.saga.length - b.saga.length);
  const franchise = scored[0]?.saga ?? fallbackFranchise;
  const sequels = scored[0]?.sequels ?? 0;

  const hints = [
    `Es un personaje de ${universe}`,
    parsed.species.length ? `Su especie: ${parsed.species[0]}` : "",
    ...parsed.traits.slice(0, 2),
    sequels > 2
      ? "Ha salido en varias entregas de la saga"
      : sequels === 2
        ? "Ha repetido en más de una película"
        : "",
    franchise ? `Sale en «${franchise}»` : "",
  ].filter(Boolean);

  return { hints, franchise };
}

/**
 * Wikis tag characters with plenty of "<something> characters" categories that
 * are traits, not films ("Silent characters"). A film has its own article, a
 * trait does not, so one extra lookup separates them.
 */
const filmCache = new Map<string, boolean>();

async function keepOnlyFilms(host: string, titles: string[]): Promise<void> {
  const unknown = [...new Set(titles)].filter(
    (t) => !filmCache.has(`${host}:${t}`),
  );
  if (!unknown.length) return;

  for (let i = 0; i < unknown.length; i += 50) {
    const batch = unknown.slice(i, i + 50);
    try {
      const res = await getJSON<PageQuery>(
        `https://${host}/api.php?action=query&prop=info&redirects=1&format=json&titles=` +
          encodeURIComponent(batch.join("|")),
        12000,
      );
      const pages = Object.entries(res.query?.pages ?? {});
      for (const [id, page] of pages) {
        filmCache.set(`${host}:${page.title}`, Number(id) > 0);
      }
    } catch {
      // If the check fails, assume the categories were fine.
      for (const title of batch) filmCache.set(`${host}:${title}`, true);
    }
    for (const title of batch) {
      if (!filmCache.has(`${host}:${title}`))
        filmCache.set(`${host}:${title}`, false);
    }
  }
}

async function poolCategory(wiki: WikiSource): Promise<string | null> {
  if (wiki.pools?.length) return pick(wiki.pools);
  if (!wiki.subcatsOf) return null;
  const subcats = await cached(
    `fandom:subcats:${wiki.host}`,
    6 * 60 * 60_000,
    async () => {
      const res = await getJSON<MemberList>(
        `https://${wiki.host}/api.php?action=query&list=categorymembers` +
          `&cmtitle=Category:${encodeURIComponent(wiki.subcatsOf!)}` +
          `&cmtype=subcat&cmlimit=200&format=json`,
        12000,
      );
      return (res.query?.categorymembers ?? [])
        .map((m) => m.title.replace(/^Category:/, ""))
        .filter(
          (t) =>
            / characters$/i.test(t) &&
            !NOT_A_SAGA.test(t.replace(/ characters$/i, "").trim()),
        );
    },
  );
  return subcats.length ? pick(subcats) : null;
}

export async function fetchFromWiki(
  wiki: WikiSource,
  count: number,
): Promise<Character[]> {
  const out: Character[] = [];

  for (let attempt = 0; attempt < 6 && out.length < count; attempt++) {
    try {
      const category = await poolCategory(wiki);
      if (!category) break;
      // In per-film mode the category we drew from already names the film, so it
      // does not need the article check the character's own categories get.
      const drawnFrom =
        wiki.subcatsOf && category.endsWith(wiki.sagaSuffix)
          ? category.slice(0, -wiki.sagaSuffix.length).trim()
          : null;

      const members = await cached(
        `fandom:members:${wiki.host}:${category}`,
        60 * 60_000,
        () =>
          getJSON<MemberList>(
            `https://${wiki.host}/api.php?action=query&list=categorymembers` +
              `&cmtitle=Category:${encodeURIComponent(category)}` +
              `&cmlimit=500&cmnamespace=0&format=json`,
            12000,
          ),
      );

      const titles = shuffle(
        (members.query?.categorymembers ?? [])
          .map((m) => m.title)
          .filter((t) => !/[/(]/.test(t) && t.split(" ").length <= 4),
      ).slice(0, Math.max(20, (count - out.length) * 6));
      if (!titles.length) continue;

      const detail = await getJSON<PageQuery>(
        `https://${wiki.host}/api.php?action=query&prop=pageimages|categories|info` +
          `&piprop=original&cllimit=max&format=json&titles=` +
          encodeURIComponent(titles.slice(0, 50).join("|")),
        12000,
      );

      // Long articles belong to characters people actually remember, while extras
      // get a stub. Keep the biggest ones of this category, then shuffle so the
      // same famous names do not come up every single game.
      const pages = Object.values(detail.query?.pages ?? {})
        .filter((p) => (p.length ?? 0) >= 15000)
        .sort((a, b) => (b.length ?? 0) - (a.length ?? 0));
      const candidates = shuffle(
      (pages.length ? pages : Object.values(detail.query?.pages ?? {}))
        .filter((p) => (p.length ?? 0) >= 6000)
        .slice(0, Math.max(6, count)),
    );

      const parsedByPage = new Map<number, ParsedCategories>();
      for (const page of candidates) {
        parsedByPage.set(
          page.pageid,
          parseCategories(
            (page.categories ?? []).map((c) => c.title),
            wiki.sagaSuffix,
          ),
        );
      }
      await keepOnlyFilms(
        wiki.host,
        [...parsedByPage.values()].flatMap((p) => p.sagas),
      );
      const isFilm = (title: string) =>
        filmCache.get(`${wiki.host}:${title}`) !== false;

      for (const page of candidates) {
        if (out.length >= count) break;
        if (!page.original?.source) continue;
        const parsed = parsedByPage.get(page.pageid);
        if (!parsed) continue;
        const { hints, franchise } = buildHints(
          parsed,
          wiki.universe,
          isFilm,
          drawnFrom,
        );
        if (!franchise || hints.length < 3) continue;
        out.push({
          id: `fandom-${wiki.host}-${page.pageid}`,
          name: page.title,
          category: wiki.category,
          image: page.original.source,
          source: wiki.source,
          hints,
        });
      }
    } catch {
      // A single odd category (or a wiki hiccup) should not sink the round.
      continue;
    }
  }

  return out;
}

export const fetchDreamWorks = (count: number) =>
  fetchFromWiki(
    {
      host: "dreamworks.fandom.com",
      category: "dreamworks",
      source: "DreamWorks Wiki",
      universe: "DreamWorks Animation",
      pools: ["Protagonists", "Heroes", "Villains"],
      sagaSuffix: " characters",
    },
    count,
  );

export const fetchPixar = (count: number) =>
  fetchFromWiki(
    {
      host: "pixar.fandom.com",
      category: "pixar",
      source: "Pixar Wiki",
      universe: "Pixar",
      subcatsOf: "Characters",
      sagaSuffix: " Characters",
    },
    count,
  );
