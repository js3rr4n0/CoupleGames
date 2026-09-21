import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "soft" | "danger" | "success";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-glow-500 to-candy-500 text-white shadow-lg shadow-glow-500/25 hover:brightness-110",
  soft: "glass text-white/90 hover:bg-white/15",
  ghost: "text-white/70 hover:text-white hover:bg-white/10",
  danger:
    "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25 hover:brightness-110",
  success:
    "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25 hover:brightness-110",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold tracking-tight transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rounded-3xl shadow-2xl shadow-black/30 ${className}`}>
      {children}
    </div>
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
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ${className}`}
    >
      {children}
    </span>
  );
}

export function Avatar({
  emoji,
  size = "md",
  ring = false,
}: {
  emoji: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
}) {
  const sizes = {
    sm: "h-8 w-8 text-base",
    md: "h-11 w-11 text-xl",
    lg: "h-16 w-16 text-3xl",
  };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-white/20 to-white/5 ${sizes[size]} ${
        ring ? "ring-2 ring-glow-400 animate-pulse-ring" : "ring-1 ring-white/10"
      }`}
    >
      {emoji}
    </span>
  );
}

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="animate-float absolute -left-32 top-[-10%] h-[38rem] w-[38rem] rounded-full bg-glow-500/25 blur-3xl" />
      <div
        className="animate-float absolute -right-24 top-[12%] h-[30rem] w-[30rem] rounded-full bg-candy-500/20 blur-3xl"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="animate-float absolute bottom-[-18%] left-1/3 h-[34rem] w-[34rem] rounded-full bg-sky-500/15 blur-3xl"
        style={{ animationDelay: "-8s" }}
      />
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-glow-400 to-candy-500 text-xl shadow-lg shadow-glow-500/30">
        🎭
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          Couple<span className="text-glow-300">Games</span>
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
    <div className="animate-pop fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(92vw,30rem)] rounded-2xl border border-rose-400/30 bg-rose-500/20 px-4 py-3 text-sm text-rose-50 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span>⚠️</span>
        <p className="flex-1">{message}</p>
        {onClose && (
          <button onClick={onClose} className="text-rose-100/70 hover:text-white">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function Confetti() {
  const pieces = Array.from({ length: 28 });
  const colors = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="animate-confetti absolute block h-3 w-2 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}
