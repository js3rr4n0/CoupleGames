"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { createSession, rememberName, recallName } from "@/lib/client";
import { Badge, Button, Card, ErrorBar, Logo } from "./ui";

const STEPS = [
  {
    n: "1",
    tone: "bg-sun",
    title: "Crea la sala",
    text: "Tu nombre y cuántos juegan. Sin registro ni claves.",
  },
  {
    n: "2",
    tone: "bg-sky text-white",
    title: "Pasa el código",
    text: "Cinco letras o un enlace. Se unen desde cualquier móvil.",
  },
  {
    n: "3",
    tone: "bg-tomato text-white",
    title: "Adivina quién eres",
    text: "Tu carta la ve todo el mundo menos tú.",
  },
];

export default function Landing() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(2);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <Badge className="hidden sm:inline-flex">🎲 8 mazos en vivo</Badge>
      </header>

      <section className="mt-10 grid items-start gap-8 lg:mt-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-rise">
          <span className="inline-block -rotate-2 rounded-lg border-[3px] border-ink bg-white px-3 py-1 text-sm font-extrabold shadow-hard-sm">
            Para dos o para el grupo
          </span>

          <h1 className="mt-5 font-display text-6xl leading-[0.95] sm:text-7xl lg:text-8xl">
            ¿QUIÉN
            <br />
            SOY?
          </h1>

          <p className="mt-5 max-w-md text-lg font-semibold text-ink-soft">
            Te toca un personaje real sacado al momento de APIs públicas de cine,
            series, música o libros. Todos lo ven en su pantalla. Tú no. Pregunta,
            deduce y acierta antes de que caiga el reloj.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="sheet-flat overflow-hidden">
                <div
                  className={`flex items-center gap-2 border-b-[3px] border-ink px-3 py-2 ${step.tone}`}
                >
                  <span className="font-display text-lg">{step.n}</span>
                  <span className="text-sm font-extrabold">{step.title}</span>
                </div>
                <p className="px-3 py-3 text-sm font-semibold text-ink-soft">
                  {step.text}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <Card className="animate-rise overflow-hidden p-0">
          <div className="border-b-[3px] border-ink bg-grape px-6 py-4 text-white">
            <h2 className="font-display text-2xl">Crear una sala</h2>
            <p className="text-sm font-semibold opacity-90">
              Te damos un código para invitar a quien quieras.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5 p-6">
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
                Tu nombre
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ana"
                maxLength={18}
                required
                className="mt-2 w-full rounded-xl border-[3px] border-ink bg-paper px-4 py-3 text-lg font-bold outline-none placeholder:font-semibold placeholder:text-ink-soft/50 focus:bg-white"
              />
            </label>

            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
                ¿Cuántos jugarán?
              </span>
              <div className="mt-2 flex items-stretch gap-3">
                <button
                  type="button"
                  onClick={() => setPlayers((p) => Math.max(2, p - 1))}
                  className="press h-14 w-14 shrink-0 rounded-xl border-[3px] border-ink bg-white font-display text-2xl shadow-hard-sm"
                  aria-label="Menos jugadores"
                >
                  −
                </button>
                <div className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-[3px] border-ink bg-paper">
                  <span className="font-display text-3xl leading-none">{players}</span>
                  <span className="text-sm font-bold text-ink-soft">
                    {players === 2 ? "en pareja" : "jugadores"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPlayers((p) => Math.min(12, p + 1))}
                  className="press h-14 w-14 shrink-0 rounded-xl border-[3px] border-ink bg-white font-display text-2xl shadow-hard-sm"
                  aria-label="Más jugadores"
                >
                  +
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-4 text-lg">
              {loading ? "Creando sala…" : "Crear sala ▸"}
            </Button>
          </form>

          <div className="flex items-center gap-3 px-6 text-xs font-extrabold uppercase tracking-widest text-ink-soft">
            <span className="h-[3px] flex-1 bg-ink/15" />o entra con código
            <span className="h-[3px] flex-1 bg-ink/15" />
          </div>

          <form onSubmit={handleJoin} className="flex gap-2 p-6">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCDE"
              maxLength={5}
              className="w-full rounded-xl border-[3px] border-ink bg-paper px-4 py-3 text-center font-display text-2xl uppercase tracking-[0.4em] outline-none placeholder:text-ink-soft/40 focus:bg-white"
            />
            <Button type="submit" variant="plain" className="shrink-0">
              Entrar
            </Button>
          </form>
        </Card>
      </section>

      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">Ocho mazos, cero listas fijas</h2>
            <p className="mt-1 max-w-xl font-semibold text-ink-soft">
              Cada partida consulta en directo estas APIs gratuitas y arma el mazo
              al azar en el servidor. No hay buscador: nadie puede espiar qué
              personajes van a salir.
            </p>
          </div>
          <Badge className="bg-sun">🔒 Sin spoilers</Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_META.map((category, index) => (
            <div
              key={category.id}
              className="sheet-flat overflow-hidden shadow-hard-sm"
              style={{ transform: `rotate(${index % 2 ? 0.7 : -0.7}deg)` }}
            >
              <div
                className={`flex items-center gap-2 border-b-[3px] border-ink px-3 py-2 ${category.chip}`}
              >
                <span className="text-xl">{category.emoji}</span>
                <span className="text-sm font-extrabold">{category.label}</span>
              </div>
              <div className="px-3 py-3">
                <p className="text-sm font-semibold text-ink-soft">
                  {category.description}
                </p>
                <p className="mt-3 text-[11px] font-extrabold uppercase tracking-widest text-ink-soft/70">
                  {category.source}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-16 flex flex-col items-center gap-3 text-center">
        <Logo compact />
        <p className="max-w-xl text-sm font-semibold text-ink-soft">
          Datos de TVmaze, Deezer, Open Library, PokéAPI, Rick and Morty API,
          Disney API y SWAPI. Todas gratuitas y sin API key.
        </p>
      </footer>

      {error && <ErrorBar message={error} onClose={() => setError(null)} />}
    </main>
  );
}
