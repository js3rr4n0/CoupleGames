export type SpaceKind =
  | "salida"
  | "calle"
  | "estacion"
  | "servicio"
  | "suerte"
  | "caja"
  | "impuesto"
  | "carcel"
  | "parking"
  | "ir-carcel";

export interface Space {
  i: number;
  name: string;
  kind: SpaceKind;
  group?: string;
  price?: number;
  rents?: number[];
  houseCost?: number;
  tax?: number;
}

export const GROUP_COLORS: Record<string, string> = {
  marron: "#8b5a2b",
  celeste: "#7dd3fc",
  rosa: "#f472b6",
  naranja: "#fb923c",
  rojo: "#ff4b4b",
  amarillo: "#ffc83d",
  verde: "#1fbf6b",
  azul: "#3d7bff",
};

export const BOARD: Space[] = [
  { i: 0, name: "Salida", kind: "salida" },
  { i: 1, name: "Calle Sicilia", kind: "calle", group: "marron", price: 60, rents: [2, 10, 30, 90, 160, 250], houseCost: 50 },
  { i: 2, name: "Caja de comunidad", kind: "caja" },
  { i: 3, name: "Calle Cerdeña", kind: "calle", group: "marron", price: 60, rents: [4, 20, 60, 180, 320, 450], houseCost: 50 },
  { i: 4, name: "Impuesto sobre el capital", kind: "impuesto", tax: 200 },
  { i: 5, name: "Estación de Francia", kind: "estacion", price: 200 },
  { i: 6, name: "Calle Zaragoza", kind: "calle", group: "celeste", price: 100, rents: [6, 30, 90, 270, 400, 550], houseCost: 50 },
  { i: 7, name: "Suerte", kind: "suerte" },
  { i: 8, name: "Calle Valencia", kind: "calle", group: "celeste", price: 100, rents: [6, 30, 90, 270, 400, 550], houseCost: 50 },
  { i: 9, name: "Calle Alicante", kind: "calle", group: "celeste", price: 120, rents: [8, 40, 100, 300, 450, 600], houseCost: 50 },
  { i: 10, name: "Cárcel", kind: "carcel" },
  { i: 11, name: "Calle Cádiz", kind: "calle", group: "rosa", price: 140, rents: [10, 50, 150, 450, 625, 750], houseCost: 100 },
  { i: 12, name: "Compañía de electricidad", kind: "servicio", price: 150 },
  { i: 13, name: "Calle Écija", kind: "calle", group: "rosa", price: 140, rents: [10, 50, 150, 450, 625, 750], houseCost: 100 },
  { i: 14, name: "Calle Sevilla", kind: "calle", group: "rosa", price: 160, rents: [12, 60, 180, 500, 700, 900], houseCost: 100 },
  { i: 15, name: "Estación Delicias", kind: "estacion", price: 200 },
  { i: 16, name: "Calle Cáceres", kind: "calle", group: "naranja", price: 180, rents: [14, 70, 200, 550, 750, 950], houseCost: 100 },
  { i: 17, name: "Caja de comunidad", kind: "caja" },
  { i: 18, name: "Calle Badajoz", kind: "calle", group: "naranja", price: 180, rents: [14, 70, 200, 550, 750, 950], houseCost: 100 },
  { i: 19, name: "Calle Córdoba", kind: "calle", group: "naranja", price: 200, rents: [16, 80, 220, 600, 800, 1000], houseCost: 100 },
  { i: 20, name: "Parking gratuito", kind: "parking" },
  { i: 21, name: "Calle Salamanca", kind: "calle", group: "rojo", price: 220, rents: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
  { i: 22, name: "Suerte", kind: "suerte" },
  { i: 23, name: "Calle Zamora", kind: "calle", group: "rojo", price: 220, rents: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
  { i: 24, name: "Calle Toledo", kind: "calle", group: "rojo", price: 240, rents: [20, 100, 300, 750, 925, 1100], houseCost: 150 },
  { i: 25, name: "Estación Chamartín", kind: "estacion", price: 200 },
  { i: 26, name: "Calle Valladolid", kind: "calle", group: "amarillo", price: 260, rents: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
  { i: 27, name: "Calle Burgos", kind: "calle", group: "amarillo", price: 260, rents: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
  { i: 28, name: "Compañía de aguas", kind: "servicio", price: 150 },
  { i: 29, name: "Calle Segovia", kind: "calle", group: "amarillo", price: 280, rents: [24, 120, 360, 850, 1025, 1200], houseCost: 150 },
  { i: 30, name: "Ve a la cárcel", kind: "ir-carcel" },
  { i: 31, name: "Calle Fuencarral", kind: "calle", group: "verde", price: 300, rents: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
  { i: 32, name: "Calle Barquillo", kind: "calle", group: "verde", price: 300, rents: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
  { i: 33, name: "Caja de comunidad", kind: "caja" },
  { i: 34, name: "Calle Serrano", kind: "calle", group: "verde", price: 320, rents: [28, 150, 450, 1000, 1200, 1400], houseCost: 200 },
  { i: 35, name: "Estación Atocha", kind: "estacion", price: 200 },
  { i: 36, name: "Suerte", kind: "suerte" },
  { i: 37, name: "Paseo del Prado", kind: "calle", group: "azul", price: 350, rents: [35, 175, 500, 1100, 1300, 1500], houseCost: 200 },
  { i: 38, name: "Impuesto de lujo", kind: "impuesto", tax: 100 },
  { i: 39, name: "Paseo de la Castellana", kind: "calle", group: "azul", price: 400, rents: [50, 200, 600, 1400, 1700, 2000], houseCost: 200 },
];

export const GROUP_SIZE: Record<string, number> = BOARD.reduce(
  (acc, space) => {
    if (space.group) acc[space.group] = (acc[space.group] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);

export interface ChanceCard {
  id: string;
  text: string;
  effect:
    | { type: "cobrar"; amount: number }
    | { type: "pagar"; amount: number }
    | { type: "mover"; to: number }
    | { type: "avanzar"; steps: number }
    | { type: "carcel" }
    | { type: "salir-carcel" }
    | { type: "cobrar-cada"; amount: number }
    | { type: "pagar-cada"; amount: number }
    | { type: "reparaciones"; casa: number; hotel: number };
}

export const SUERTE: ChanceCard[] = [
  { id: "s1", text: "Avanza hasta la Salida y cobra 200", effect: { type: "mover", to: 0 } },
  { id: "s2", text: "Ve a Paseo de la Castellana", effect: { type: "mover", to: 39 } },
  { id: "s3", text: "Ve a la Calle Sevilla", effect: { type: "mover", to: 14 } },
  { id: "s4", text: "Ve a la Estación de Francia", effect: { type: "mover", to: 5 } },
  { id: "s5", text: "El banco te paga un dividendo de 50", effect: { type: "cobrar", amount: 50 } },
  { id: "s6", text: "Quedas libre de la cárcel: guarda esta carta", effect: { type: "salir-carcel" } },
  { id: "s7", text: "Retrocede tres casillas", effect: { type: "avanzar", steps: -3 } },
  { id: "s8", text: "Ve a la cárcel sin pasar por la Salida", effect: { type: "carcel" } },
  { id: "s9", text: "Multa por exceso de velocidad: paga 15", effect: { type: "pagar", amount: 15 } },
  { id: "s10", text: "Obras en tus casas: paga 25 por casa y 100 por hotel", effect: { type: "reparaciones", casa: 25, hotel: 100 } },
  { id: "s11", text: "Te eligen presidente del consejo: paga 50 a cada jugador", effect: { type: "pagar-cada", amount: 50 } },
  { id: "s12", text: "Tu edificio gana un premio: cobra 150", effect: { type: "cobrar", amount: 150 } },
  { id: "s13", text: "Devolución de Hacienda: cobra 20", effect: { type: "cobrar", amount: 20 } },
  { id: "s14", text: "Avanza hasta la Calle Córdoba", effect: { type: "mover", to: 19 } },
];

export const CAJA: ChanceCard[] = [
  { id: "c1", text: "Error del banco a tu favor: cobra 200", effect: { type: "cobrar", amount: 200 } },
  { id: "c2", text: "Factura del médico: paga 50", effect: { type: "pagar", amount: 50 } },
  { id: "c3", text: "Venta de acciones: cobra 50", effect: { type: "cobrar", amount: 50 } },
  { id: "c4", text: "Quedas libre de la cárcel: guarda esta carta", effect: { type: "salir-carcel" } },
  { id: "c5", text: "Ve a la cárcel sin pasar por la Salida", effect: { type: "carcel" } },
  { id: "c6", text: "Es tu cumpleaños: cobra 10 de cada jugador", effect: { type: "cobrar-cada", amount: 10 } },
  { id: "c7", text: "Vence tu seguro de vida: cobra 100", effect: { type: "cobrar", amount: 100 } },
  { id: "c8", text: "Paga la factura del hospital: 100", effect: { type: "pagar", amount: 100 } },
  { id: "c9", text: "Paga la matrícula del colegio: 50", effect: { type: "pagar", amount: 50 } },
  { id: "c10", text: "Ganas el segundo premio de belleza: cobra 10", effect: { type: "cobrar", amount: 10 } },
  { id: "c11", text: "Recibes una herencia de 100", effect: { type: "cobrar", amount: 100 } },
  { id: "c12", text: "Avanza hasta la Salida y cobra 200", effect: { type: "mover", to: 0 } },
  { id: "c13", text: "Derrama de la comunidad: paga 40 por casa y 115 por hotel", effect: { type: "reparaciones", casa: 40, hotel: 115 } },
  { id: "c14", text: "Devolución del impuesto: cobra 25", effect: { type: "cobrar", amount: 25 } },
];

/**
 * Nombre corto para el tablero. En una casilla de un dedo de ancho no cabe
 * «Impuesto sobre el capital»; el nombre entero sigue estando en su ficha.
 */
const SHORT: Record<string, string> = {
  "Impuesto sobre el capital": "Impuesto",
  "Impuesto de lujo": "Lujo",
  "Compañía de electricidad": "Luz",
  "Compañía de aguas": "Aguas",
  "Caja de comunidad": "Caja",
  "Paseo de la Castellana": "Castellana",
  "Paseo del Prado": "Prado",
  "Parking gratuito": "Parking",
  "Ve a la cárcel": "A la cárcel",
};

export function boardLabel(space: Space): string {
  if (SHORT[space.name]) return SHORT[space.name];
  // «Calle Salamanca» se lee igual de bien como «Salamanca» y cabe el doble;
  // en las estaciones ya lo dice el 🚂, así que basta el nombre.
  return space.name.replace(/^Calle /, "").replace(/^Estación (de )?/, "");
}

/**
 * Cuerpo de letra para que el nombre quepa en su casilla sin partirse.
 * Se mide en cqw (porcentaje del tablero), así que vale para cualquier tamaño.
 */
export function labelSize(label: string, vertical: boolean): string {
  const longest = Math.max(...label.split(" ").map((word) => word.length));
  // Ancho útil de la casilla: 9,09 cqw menos el borde y, de lado, la banda.
  const box = vertical ? 7.1 : 8.7;
  const fit = box / (longest * 0.58);
  return `min(1.32cqw, ${fit.toFixed(2)}cqw)`;
}
