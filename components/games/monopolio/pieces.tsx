"use client";

export { Die } from "../dice";

/** Colores de ficha: cada quien lleva el suyo por todo el tablero. */
export const TOKEN_COLORS = [
  "#ff4b4b",
  "#3d7bff",
  "#1fbf6b",
  "#7c5cff",
  "#ff7ab8",
  "#ffc83d",
  "#0fb5ae",
  "#8b5a2b",
];

/** La ficha de un jugador. */
export function Token({
  emoji,
  color,
  size = 1.5,
  ring = false,
  hop = false,
  title,
}: {
  emoji: string;
  color: string;
  size?: number;
  ring?: boolean;
  hop?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`grid place-items-center rounded-full border-2 border-ink leading-none shadow-hard-sm ${
        hop ? "animate-hop" : ""
      } ${ring ? "ring-2 ring-ink ring-offset-1" : ""}`}
      style={{
        width: `${size}rem`,
        height: `${size}rem`,
        minWidth: `${size}rem`,
        background: color,
        fontSize: `${size * 0.62}rem`,
      }}
    >
      {emoji}
    </span>
  );
}
