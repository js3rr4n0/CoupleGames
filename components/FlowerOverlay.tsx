"use client";

import { useEffect } from "react";
import { FlowerRain } from "./ui";

/**
 * Pantalla completa con una flor amarilla dibujada a mano: el contorno se traza
 * pétalo a pétalo y el color entra después. Los números llevan un pequeño
 * desorden a propósito (nada de círculos perfectos) y un filtro de ruido remata
 * el temblor del lápiz.
 */
const PETALS = 9;
const WOBBLE = [0, 4, -3, 5, -2, 3, -5, 2, -4];

/** Un pétalo apuntando hacia arriba desde el corazón de la flor (200, 190). */
function petalPath(w: number): string {
  return [
    `M200 ${246 + w}`,
    `C${166 + w} ${206 - w}, ${150 - w} 118, 200 ${50 + w}`,
    `C${250 - w} ${116 + w}, ${236 + w} ${208 + w}, 200 ${246 + w}`,
    "Z",
  ].join(" ");
}

export default function FlowerOverlay({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label="Feliz día de las flores amarillas"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 overflow-hidden bg-paper px-6 py-8"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Ccircle cx='3' cy='3' r='1.6' fill='%2317151f' fill-opacity='0.1'/%3E%3C/svg%3E\")",
      }}
    >
      <div className="opacity-50">
        <FlowerRain />
      </div>

      <svg
        viewBox="0 0 400 480"
        className="h-auto max-h-[62vh] w-[min(84vw,34rem)] drop-shadow-[6px_6px_0_rgba(23,21,31,0.12)]"
        aria-hidden
      >
        <defs>
          <filter id="pencil" x="-12%" y="-12%" width="124%" height="124%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.028"
              numOctaves={2}
              seed={9}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={5}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        <g
          filter="url(#pencil)"
          stroke="#17151f"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flower-sway"
        >
          {/* tallo y hojas */}
          <path
            d="M200 238 C207 302, 193 360, 200 466"
            fill="none"
            className="flower-stroke"
            style={{ ["--d" as string]: "1.05s" }}
          />
          <path
            d="M197 360 C154 330, 108 336, 94 364 C124 394, 172 392, 197 368 Z"
            fill="#1fbf6b"
            className="flower-stroke"
            style={{ ["--d" as string]: "1.2s" }}
          />
          <path
            d="M203 412 C246 388, 292 398, 304 426 C272 452, 226 444, 203 420 Z"
            fill="#1fbf6b"
            className="flower-stroke"
            style={{ ["--d" as string]: "1.35s" }}
          />

          {/* pétalos */}
          {Array.from({ length: PETALS }).map((_, i) => (
            <path
              key={i}
              d={petalPath(WOBBLE[i % WOBBLE.length])}
              fill="#ffc83d"
              transform={`rotate(${(360 / PETALS) * i} 200 190)`}
              className="flower-stroke"
              style={{ ["--d" as string]: `${i * 0.1}s` }}
            />
          ))}

          {/* corazón de la flor */}
          <path
            d="M200 134 C236 134, 262 162, 261 191 C260 225, 232 248, 199 247 C165 246, 140 220, 141 189 C142 157, 168 134, 200 134 Z"
            fill="#f59e0b"
            className="flower-stroke"
            style={{ ["--d" as string]: "0.95s" }}
          />
          <g
            className="flower-in"
            style={{ animationDelay: "1.5s" }}
            strokeWidth={5}
            fill="none"
          >
            <path d="M174 172 C180 178, 180 184, 174 190" />
            <path d="M200 162 C206 168, 206 174, 200 180" />
            <path d="M226 174 C232 180, 232 186, 226 192" />
            <path d="M182 206 C188 212, 188 218, 182 224" />
            <path d="M210 208 C216 214, 216 220, 210 226" />
            <path d="M198 222 C204 228, 204 234, 198 240" />
          </g>
        </g>
      </svg>

      <div className="flower-in text-center" style={{ animationDelay: "1.7s" }}>
        {name && (
          <p className="font-display text-base uppercase tracking-[0.3em] text-ink-soft">
            Para {name}
          </p>
        )}
        <h2 className="mt-1 max-w-2xl font-display text-4xl leading-[1.05] sm:text-5xl">
          ¡Feliz día de las flores
          <br />
          amarillas! 🤭
        </h2>
      </div>

      <button
        onClick={onClose}
        className="flower-in press rounded-xl border-[3px] border-ink bg-sun px-6 py-3 font-display text-lg shadow-hard"
        style={{ animationDelay: "2s" }}
      >
        Gracias 🌼
      </button>
    </div>
  );
}
