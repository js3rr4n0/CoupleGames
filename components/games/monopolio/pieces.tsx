"use client";

import type { CSSProperties } from "react";

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
  size = "1.5rem",
  ring = false,
  hop = false,
  title,
}: {
  emoji: string;
  color: string;
  /** Medida en cualquier unidad CSS: rem en los paneles, cqw sobre el tablero. */
  size?: string;
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
        width: size,
        height: size,
        minWidth: size,
        background: color,
        fontSize: `calc(${size} * 0.62)`,
      }}
    >
      {emoji}
    </span>
  );
}

/** Un mazo de Suerte o de Caja, apilado en el centro del tablero. */
export function Deck({
  deck,
  className = "",
  style,
}: {
  deck: "suerte" | "caja";
  className?: string;
  style?: CSSProperties;
}) {
  const suerte = deck === "suerte";
  return (
    <span className={className} style={style}>
      <span className="relative block" style={{ width: "13cqw", height: "9cqw" }}>
        {[2, 1, 0].map((capa) => (
          <span
            key={capa}
            className={`absolute inset-0 rounded-lg border-[3px] border-ink ${
              suerte ? "bg-sun" : "bg-sky"
            }`}
            style={{ transform: `translate(${capa * 3}px, ${capa * -3}px)` }}
          />
        ))}
        <span
          className={`absolute inset-0 grid place-items-center rounded-lg border-[3px] border-ink font-display leading-tight ${
            suerte ? "bg-sun text-ink" : "bg-sky text-white"
          }`}
          style={{ fontSize: "1.7cqw" }}
        >
          <span>
            <span className="block" style={{ fontSize: "3.2cqw" }}>
              {suerte ? "🍀" : "📦"}
            </span>
            {suerte ? "Suerte" : "Caja"}
          </span>
        </span>
      </span>
    </span>
  );
}
