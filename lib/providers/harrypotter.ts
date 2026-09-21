import type { Character } from "@/lib/types";
import { cached, getJSON, shuffle } from "./http";

interface HPCharacter {
  id: string;
  name: string;
  species: string;
  gender: string;
  house: string;
  ancestry: string;
  patronus: string;
  actor: string;
  wand: { wood: string; core: string };
  hogwartsStudent: boolean;
  hogwartsStaff: boolean;
  alive: boolean;
  image: string;
}

const SPECIES_ES: Record<string, string> = {
  human: "humano",
  "half-giant": "semigigante",
  ghost: "fantasma",
  cat: "gato",
  werewolf: "hombre lobo",
  "half-human": "medio humano",
  goblin: "duende",
  "house-elf": "elfo doméstico",
  giant: "gigante",
  centaur: "centauro",
  owl: "lechuza",
  dog: "perro",
};

const ANCESTRY_ES: Record<string, string> = {
  "half-blood": "es mestizo",
  "pure-blood": "es de sangre limpia",
  muggleborn: "nació de muggles",
  squib: "es squib",
  "half-veela": "tiene sangre veela",
};

const WOOD_ES: Record<string, string> = {
  walnut: "nogal",
  vine: "viña",
  holly: "acebo",
  elder: "saúco",
  ash: "fresno",
  oak: "roble",
  hawthorn: "espino",
  willow: "sauce",
  yew: "tejo",
  cherry: "cerezo",
  chestnut: "castaño",
  cypress: "ciprés",
  hornbeam: "carpe",
  blackthorn: "endrino",
  mahogany: "caoba",
  elm: "olmo",
  rosewood: "palo de rosa",
  pine: "pino",
  birch: "abedul",
  alder: "aliso",
  cedar: "cedro",
  ebony: "ébano",
  maple: "arce",
  larch: "alerce",
  aspen: "álamo",
  beech: "haya",
  fir: "abeto",
  sycamore: "sicomoro",
};

const CORE_ES: Record<string, string> = {
  "dragon heartstring": "fibra de corazón de dragón",
  "phoenix feather": "pluma de fénix",
  "unicorn hair": "pelo de unicornio",
  "unicorn tail hair": "pelo de la cola de unicornio",
  "thestral tail hair": "crin de thestral",
  "veela hair": "pelo de veela",
  "dragon heartstring core": "fibra de corazón de dragón",
};

const PATRONUS_ES: Record<string, string> = {
  otter: "una nutria",
  stag: "un ciervo",
  "jack russell terrier": "un terrier",
  doe: "una cierva",
  hare: "una liebre",
  horse: "un caballo",
  lynx: "un lince",
  swan: "un cisne",
  wolf: "un lobo",
  weasel: "una comadreja",
  goat: "una cabra",
  phoenix: "un fénix",
};

/** Wand cores arrive with loose punctuation ("unicorn tail-hair core"). */
function coreEs(core: string): string {
  const key = core.toLowerCase().replace(/-/g, " ").replace(/\s+core$/, "").trim();
  return CORE_ES[key] ?? key;
}

export async function fetchHogwarts(count: number): Promise<Character[]> {
  const all = await cached("hp:characters", 12 * 60 * 60_000, () =>
    getJSON<HPCharacter[]>("https://hp-api.onrender.com/api/characters", 15000),
  );

  return shuffle(all.filter((c) => c.image && c.name))
    .slice(0, count)
    .map((c) => ({
      id: `hp-${c.id}`,
      name: c.name,
      category: "harry-potter" as const,
      image: c.image,
      source: "HP-API",
      hints: [
        c.hogwartsStaff
          ? "Da clase en Hogwarts"
          : c.hogwartsStudent
            ? "Es estudiante de Hogwarts"
            : "No estudia ni enseña en Hogwarts",
        c.species && c.species !== "human"
          ? `Su especie: ${SPECIES_ES[c.species] ?? c.species}`
          : ANCESTRY_ES[c.ancestry]
            ? `En cuanto a sangre, ${ANCESTRY_ES[c.ancestry]}`
            : "",
        c.house ? `Es de la casa ${c.house}` : "No tiene casa en Hogwarts",
        c.patronus && !/non-?corporeal|none/i.test(c.patronus)
          ? `Su patronus es ${PATRONUS_ES[c.patronus] ?? c.patronus}`
          : "",
        c.wand?.wood
          ? `Su varita es de ${WOOD_ES[c.wand.wood] ?? c.wand.wood}${
              c.wand.core
                ? ` con núcleo de ${coreEs(c.wand.core)}`
                : ""
            }`
          : "",
        c.actor ? `En las películas le pone cara ${c.actor}` : "",
      ].filter(Boolean),
    }));
}
