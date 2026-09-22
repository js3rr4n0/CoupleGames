"use client";

import type { CSSProperties } from "react";

export type UnoColor = "rojo" | "amarillo" | "verde" | "azul";

export interface UnoCard {
  id: string;
  color: UnoColor | null;
  kind: "numero" | "salta" | "cambio" | "mas2" | "comodin" | "mas4";
  value: number | null;
}

export const COLORS: UnoColor[] = ["rojo", "amarillo", "verde", "azul"];

export const COLOR_HEX: Record<UnoColor, string> = {
  rojo: "#ff4b4b",
  amarillo: "#ffc83d",
  verde: "#1fbf6b",
  azul: "#3d7bff",
};

export const COLOR_NAME: Record<UnoColor, string> = {
  rojo: "rojo",
  amarillo: "amarillo",
  verde: "verde",
  azul: "azul",
};

export function faceOf(card: UnoCard): string {
  switch (card.kind) {
    case "numero":
      return String(card.value);
    case "salta":
      return "🚫";
    case "cambio":
      return "⇄";
    case "mas2":
      return "+2";
    case "mas4":
      return "+4";
    default:
      return "★";
  }
}

export function cornerOf(card: UnoCard): string {
  const face = faceOf(card);
  return face === "🚫" ? "⃠" : face;
}

/** Un número entre -spread y +spread, siempre el mismo para la misma carta. */
export function jitter(seed: string, spread: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (((hash >>> 0) % 2000) / 1000 - 1) * spread;
}

/**
 * Una carta de UNO de las de verdad: cuerpo de color, óvalo blanco torcido en
 * medio y el símbolo repetido en las dos esquinas.
 */
export function CardFace({
  card,
  width = "4.4rem",
  className = "",
  style,
}: {
  card: UnoCard;
  /** Ancho en cualquier unidad CSS (rem, cqw…); el alto y la letra salen solos. */
  width?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const wild = card.color === null;
  const body = wild ? "#17151f" : COLOR_HEX[card.color as UnoColor];
  const face = faceOf(card);
  const corner = cornerOf(card);

  return (
    <span
      className={`block shrink-0 overflow-hidden rounded-[0.55em] border-[3px] border-ink ${className}`}
      style={{
        // En estilo, no en clase: así quien la coloca puede ponerla «absolute».
        position: "relative",
        width,
        height: `calc(${width} * 1.5)`,
        background: body,
        fontSize: `calc(${width} * 0.26)`,
        ...style,
      }}
    >
      <span
        className="absolute inset-[11%] rounded-[50%] border-2 border-ink"
        style={{ background: wild ? "transparent" : "#fff", transform: "rotate(-22deg)" }}
      >
        {wild && (
          <span className="absolute inset-0 grid grid-cols-2 overflow-hidden rounded-[50%]">
            {COLORS.map((color) => (
              <span key={color} style={{ background: COLOR_HEX[color] }} />
            ))}
          </span>
        )}
      </span>
      <span
        className="absolute inset-0 grid place-items-center font-display leading-none"
        style={{
          fontSize: `calc(${width} * 0.42)`,
          color: wild ? "#fff" : "#17151f",
          textShadow: wild ? "0 2px 0 #17151f" : "none",
        }}
      >
        {face}
      </span>
      <span
        className="absolute left-[6%] top-[3%] font-display leading-none text-white"
        style={{ fontSize: `calc(${width} * 0.22)` }}
      >
        {corner}
      </span>
      <span
        className="absolute bottom-[3%] right-[6%] rotate-180 font-display leading-none text-white"
        style={{ fontSize: `calc(${width} * 0.22)` }}
      >
        {corner}
      </span>
    </span>
  );
}

/** El dorso: lo que ve la mesa de las cartas ajenas. */
export function CardBack({
  width = "4.4rem",
  className = "",
  style,
}: {
  width?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`block shrink-0 overflow-hidden rounded-[0.55em] border-[3px] border-ink bg-ink ${className}`}
      style={{
        position: "relative",
        width,
        height: `calc(${width} * 1.5)`,
        ...style,
      }}
    >
      <span
        className="absolute inset-[11%] grid place-items-center rounded-[50%] border-2 border-ink bg-sun font-display leading-none text-ink"
        style={{ transform: "rotate(-22deg)", fontSize: `calc(${width} * 0.3)` }}
      >
        UNO
      </span>
    </span>
  );
}
