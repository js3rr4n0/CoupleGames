/** Datos puros del Cluedo: los usa tanto el servidor como la interfaz. */
export interface CluedoCard {
  id: string;
  name: string;
  kind: "sospechoso" | "arma" | "habitacion";
  emoji: string;
}

export const SUSPECTS: CluedoCard[] = [
  { id: "escarlata", name: "Señorita Escarlata", kind: "sospechoso", emoji: "🌹" },
  { id: "mostaza", name: "Coronel Mostaza", kind: "sospechoso", emoji: "🎖️" },
  { id: "blanco", name: "Señora Blanco", kind: "sospechoso", emoji: "🤍" },
  { id: "verde", name: "Reverendo Verde", kind: "sospechoso", emoji: "🍀" },
  { id: "azul", name: "Señora Azul", kind: "sospechoso", emoji: "💙" },
  { id: "morado", name: "Profesor Morado", kind: "sospechoso", emoji: "🔮" },
];

export const WEAPONS: CluedoCard[] = [
  { id: "candelabro", name: "Candelabro", kind: "arma", emoji: "🕯️" },
  { id: "cuchillo", name: "Cuchillo", kind: "arma", emoji: "🔪" },
  { id: "tuberia", name: "Tubería", kind: "arma", emoji: "🔧" },
  { id: "revolver", name: "Revólver", kind: "arma", emoji: "🔫" },
  { id: "cuerda", name: "Cuerda", kind: "arma", emoji: "🪢" },
  { id: "llave", name: "Llave inglesa", kind: "arma", emoji: "🛠️" },
];

export const ROOMS: CluedoCard[] = [
  { id: "cocina", name: "Cocina", kind: "habitacion", emoji: "🍳" },
  { id: "baile", name: "Salón de baile", kind: "habitacion", emoji: "🎷" },
  { id: "invernadero", name: "Invernadero", kind: "habitacion", emoji: "🪴" },
  { id: "comedor", name: "Comedor", kind: "habitacion", emoji: "🍽️" },
  { id: "billar", name: "Sala de billar", kind: "habitacion", emoji: "🎱" },
  { id: "biblioteca", name: "Biblioteca", kind: "habitacion", emoji: "📖" },
  { id: "salon", name: "Salón", kind: "habitacion", emoji: "🛋️" },
  { id: "vestibulo", name: "Vestíbulo", kind: "habitacion", emoji: "🚪" },
  { id: "estudio", name: "Estudio", kind: "habitacion", emoji: "🕰️" },
];

export const ALL_CARDS = [...SUSPECTS, ...WEAPONS, ...ROOMS];
export const CARD_BY_ID = new Map(ALL_CARDS.map((card) => [card.id, card]));

/** Pasillos de la mansión. Los pasadizos secretos unen las esquinas opuestas. */
export const DOORS: Record<string, string[]> = {
  cocina: ["baile", "comedor"],
  baile: ["cocina", "invernadero", "billar", "comedor"],
  invernadero: ["baile", "billar"],
  comedor: ["cocina", "baile", "salon", "vestibulo"],
  billar: ["invernadero", "baile", "biblioteca"],
  biblioteca: ["billar", "estudio", "vestibulo"],
  salon: ["comedor", "vestibulo"],
  vestibulo: ["salon", "comedor", "biblioteca", "estudio"],
  estudio: ["vestibulo", "biblioteca"],
};

export const PASSAGES: Record<string, string> = {
  cocina: "estudio",
  estudio: "cocina",
  invernadero: "salon",
  salon: "invernadero",
};

/** Cuadrícula 3x4 que dibuja la mansión en pantalla. */
export const ROOM_GRID: (string | null)[][] = [
  ["cocina", "baile", "invernadero"],
  ["comedor", null, "billar"],
  [null, null, "biblioteca"],
  ["salon", "vestibulo", "estudio"],
];

