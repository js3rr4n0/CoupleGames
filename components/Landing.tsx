"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { createSession, rememberName, recallName } from "@/lib/client";
import { Badge, Button, Card, ErrorBar, Logo } from "./ui";

const STEPS = [
  {
    emoji: "🪄",
    title: "Crea la sala",
    text: "Tu nombre, cuántos van a jugar y listo. Sin registro ni claves.",
  },
  {
    emoji: "🔗",
    title: "Pasa el enlace",
    text: "Comparte el link o el código de 5 letras. Se unen desde cualquier móvil.",
  },
  {
    emoji: "🕵️",
    title: "Adivina quién eres",
    text: "Tu personaje es secreto para ti. El resto responde sí, no o quizá.",
  },
];

export default function Landing() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(2);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fillName(value: string) {
    setName(value);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await createSession(name || recallName(), players);
      if (data.playerId && data.view) {
        rememberName(name);
        window.localStorage.setItem(
          `couplegames:${data.view.code}`,
          data.playerId,
        );
        router.push(`/s/${data.view.code}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la sala.");
      setLoading(false);
    }
  }

  function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setError("El código tiene 5 letras, revísalo.");
      return;
    }
    router.push(`/s/${clean}`);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Badge className="hidden sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
          APIs públicas en vivo
        </Badge>
      </header>

      <section className="mt-12 grid items-start gap-10 lg:mt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="animate-rise">
          <Badge className="mb-5">🎲 Juego cooperativo para dos o para el grupo</Badge>
          <h1 className="text-balance-pretty text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            ¿Quién{" "}
            <span className="bg-gradient-to-r from-glow-300 via-candy-400 to-amber-300 bg-clip-text text-transparent">
              soy
            </span>
            ?
          </h1>
          <p className="mt-5 max-w-lg text-balance-pretty text-lg text-white/70">
            Cada ronda reparte un personaje real sacado al vuelo de APIs
            públicas de cine, series, música, libros y más. Tú eres el único que
            no puede verlo: pregunta, deduce y adivina antes de que acabe el
            tiempo.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.title}
                className="glass rounded-2xl p-4 transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <span className="text-2xl">{step.emoji}</span>
                <p className="mt-2 text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/60">
                  {step.text}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <Card className="animate-rise p-6 sm:p-8">
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Crear una sala</h2>
              <p className="mt-1 text-sm text-white/60">
                Se genera un enlace para invitar a quien quieras.
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Tu nombre
              </span>
              <input
                value={name}
                onChange={(e) => fillName(e.target.value)}
                placeholder="Ana"
                maxLength={18}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-night-900/60 px-4 py-3 text-base outline-none transition placeholder:text-white/30 focus:border-glow-400 focus:ring-2 focus:ring-glow-500/30"
              />
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                ¿Cuántos jugarán?
              </span>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPlayers((p) => Math.max(2, p - 1))}
                  className="glass h-12 w-12 rounded-2xl text-xl transition hover:bg-white/15"
                  aria-label="Menos jugadores"
                >
                  −
                </button>
                <div className="glass flex h-12 flex-1 items-center justify-center rounded-2xl text-lg font-bold tabular-nums">
                  {players}
                  <span className="ml-2 text-sm font-medium text-white/50">
                    {players === 2 ? "en pareja" : "jugadores"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPlayers((p) => Math.min(12, p + 1))}
                  className="glass h-12 w-12 rounded-2xl text-xl transition hover:bg-white/15"
                  aria-label="Más jugadores"
                >
                  +
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-4 text-base">
              {loading ? "Creando sala…" : "Crear sala y obtener enlace"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-white/35">
            <span className="h-px flex-1 bg-white/10" />o únete<span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              maxLength={5}
              className="w-full rounded-2xl border border-white/10 bg-night-900/60 px-4 py-3 text-center text-lg font-bold uppercase tracking-[0.35em] outline-none transition placeholder:tracking-normal placeholder:text-white/30 focus:border-glow-400 focus:ring-2 focus:ring-glow-500/30"
            />
            <Button type="submit" variant="soft" className="shrink-0">
              Entrar
            </Button>
          </form>
        </Card>
      </section>

      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Personajes siempre distintos
            </h2>
            <p className="mt-1 max-w-xl text-sm text-white/60">
              No hay lista fija ni buscador: cada partida consulta en directo
              estas APIs gratuitas y el mazo se arma al azar en el servidor.
            </p>
          </div>
          <Badge>🔒 Nadie puede ver el mazo antes de jugar</Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_META.map((category) => (
            <div
              key={category.id}
              className="glass group relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-1"
            >
              <div
                className={`absolute inset-x-0 -top-10 h-24 bg-gradient-to-r ${category.accent} opacity-20 blur-2xl transition group-hover:opacity-40`}
              />
              <span className="relative text-2xl">{category.emoji}</span>
              <p className="relative mt-2 font-semibold">{category.label}</p>
              <p className="relative mt-1 text-xs text-white/60">
                {category.description}
              </p>
              <p className="relative mt-3 text-[11px] uppercase tracking-wider text-white/35">
                {category.source}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-20 flex flex-col items-center gap-3 text-center text-xs text-white/40">
        <Logo compact />
        <p>
          Hecho para jugar en pareja o en grupo · Datos de TVmaze, Deezer, Open
          Library, PokéAPI, Rick and Morty API, Disney API y SWAPI
        </p>
      </footer>

      {error && <ErrorBar message={error} onClose={() => setError(null)} />}
    </main>
  );
}
