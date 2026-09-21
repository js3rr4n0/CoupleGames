import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "plain" | "danger" | "success" | "sky" | "quiet";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-sun text-ink",
  plain: "bg-white text-ink",
  danger: "bg-tomato text-white",
  success: "bg-grass text-white",
  sky: "bg-sky text-white",
  quiet: "bg-transparent text-ink border-dashed",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const shadow = variant === "quiet" ? "" : "shadow-hard press";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-ink px-5 py-3 font-display text-base font-semibold disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-hard-sm ${VARIANTS[variant]} ${shadow} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: "sun" | "sky" | "grape" | "grass" | "tomato" | "paper";
}) {
  const tones = {
    sun: "bg-sun",
    sky: "bg-sky",
    grape: "bg-grape",
    grass: "bg-grass",
    tomato: "bg-tomato",
    paper: "bg-paper-2",
  };
  return (
    <div className={`sheet ${tone ? tones[tone] : ""} ${className}`}>{children}</div>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      // text-ink is explicit so a badge stays readable inside a coloured bar
      // that sets text-white on its children.
      className={`inline-flex items-center gap-1.5 rounded-lg border-[3px] border-ink bg-white px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-ink ${className}`}
    >
      {children}
    </span>
  );
}

export function Avatar({
  emoji,
  size = "md",
  active = false,
}: {
  emoji: string;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}) {
  const sizes = {
    sm: "h-8 w-8 text-base rounded-lg border-2",
    md: "h-11 w-11 text-xl rounded-xl border-[3px]",
    lg: "h-16 w-16 text-3xl rounded-2xl border-[3px]",
  };
  return (
    <span
      className={`grid shrink-0 place-items-center border-ink ${sizes[size]} ${
        active ? "animate-tick bg-sun" : "bg-white"
      }`}
    >
      {emoji}
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-11 w-11 -rotate-3 place-items-center rounded-xl border-[3px] border-ink bg-sun font-display text-2xl font-bold shadow-hard-sm">
        ?
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-xl">¿Quién soy?</span>
          <span className="block text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-soft">
            CoupleGames
          </span>
        </span>
      )}
    </span>
  );
}

export function ErrorBar({
  message,
  onClose,
}: {
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="animate-pop fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(92vw,30rem)] rounded-xl border-[3px] border-ink bg-tomato px-4 py-3 text-sm font-bold text-white shadow-hard">
      <div className="flex items-start gap-3">
        <span>⚠️</span>
        <p className="flex-1">{message}</p>
        {onClose && (
          <button onClick={onClose} aria-label="Cerrar" className="px-1">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function Confetti() {
  const pieces = Array.from({ length: 30 });
  const colors = ["#ffc83d", "#ff4b4b", "#3d7bff", "#1fbf6b", "#ff7ab8"];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="animate-confetti absolute block h-3.5 w-3 border-2 border-ink"
          style={{
            left: `${(i * 31) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 12) * 0.14}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Empty letter slots, one per letter of the hidden name. */
export function LetterSlots({ mask }: { mask: string }) {
  const words = mask.split(" ").filter(Boolean);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="flex gap-1.5">
          {Array.from(word).map((_, letterIndex) => (
            <span
              key={letterIndex}
              className="h-9 w-7 rounded-md border-[3px] border-ink bg-paper-2 sm:h-11 sm:w-8"
            />
          ))}
        </span>
      ))}
    </div>
  );
}
