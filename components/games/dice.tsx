"use client";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Un dado de verdad, con sus puntos, que da tumbos al caer. */
export function Die({
  value,
  spin,
  delay = 0,
  size = "3.6rem",
}: {
  value: number;
  /** Cambia en cada tirada para que la animación se repita. */
  spin: string | number;
  delay?: number;
  /** Medida en cualquier unidad CSS: rem fuera del tablero, cqw encima de él. */
  size?: string;
}) {
  const pips = PIPS[value] ?? [];
  return (
    <span
      key={`${spin}-${value}`}
      className="animate-tumble inline-grid shrink-0 grid-cols-3 grid-rows-3 rounded-xl border-[3px] border-ink bg-white shadow-hard-sm"
      style={{
        // Medidas fijas: los porcentajes dentro de un flex hacían crecer el dado.
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        padding: `calc(${size} * 0.11)`,
        gap: `calc(${size} * 0.08)`,
        animationDelay: `${delay}ms`,
      }}
      aria-label={`dado: ${value}`}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className={pips.includes(index) ? "rounded-full bg-ink" : ""}
        />
      ))}
    </span>
  );
}
