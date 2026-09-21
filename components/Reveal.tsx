"use client";

import { CATEGORY_BY_ID } from "@/lib/categories";
import type { SessionView } from "@/lib/view";
import Poster from "./Poster";
import { Button, Card, Confetti } from "./ui";

const HEADLINE = {
  won: { title: "¡Acertó!", emoji: "🎉", tone: "bg-grass text-white" },
  timeout: { title: "Se acabó el tiempo", emoji: "⏰", tone: "bg-sun text-ink" },
  passed: { title: "Ronda rendida", emoji: "🏳️", tone: "bg-tomato text-white" },
  live: { title: "Ronda", emoji: "🎭", tone: "bg-white text-ink" },
};

export default function Reveal({
  view,
  act,
  busy,
}: {
  view: SessionView;
  act: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}) {
  const result = view.lastResult;
  if (!result) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="font-bold text-ink-soft">
          {view.deckError ?? "Preparando la siguiente ronda…"}
        </p>
        <Button className="mt-5" onClick={() => act("next")} disabled={busy}>
          Continuar
        </Button>
      </Card>
    );
  }

  const meta = CATEGORY_BY_ID.get(result.category);
  const headline = HEADLINE[result.status];
  const isLast = view.roundsDone >= view.roundsTotal;

  return (
    <>
      {result.status === "won" && <Confetti />}
      <Card className="animate-rise mx-auto max-w-3xl overflow-hidden p-0">
        <div
          className={`border-b-[3px] border-ink px-6 py-3 font-display text-2xl ${headline.tone}`}
        >
          {headline.emoji} {headline.title}
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
          <Poster
            src={result.image}
            alt={result.characterName}
            emoji={meta?.emoji ?? "🎲"}
            className="h-52 w-44 rounded-xl shadow-hard-sm"
            emojiClassName="text-6xl"
          />

          <div>
            <h2 className="font-display text-4xl leading-none">
              {result.characterName}
            </h2>
            <p className="mt-2 text-sm font-bold text-ink-soft">
              {meta?.emoji} {meta?.label} · datos de {result.source}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border-[3px] border-ink bg-sun p-3">
                <p className="font-display text-3xl leading-none">+{result.points}</p>
                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-widest">
                  puntos
                </p>
              </div>
              <div className="rounded-xl border-[3px] border-ink bg-white p-3">
                <p className="font-display text-3xl leading-none">{result.seconds}s</p>
                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-widest">
                  tardó
                </p>
              </div>
              <div className="rounded-xl border-[3px] border-ink bg-white p-3">
                <p className="font-display text-3xl leading-none">{result.hintsUsed}</p>
                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-widest">
                  pistas
                </p>
              </div>
            </div>

            <p className="mt-4 font-semibold text-ink-soft">
              Adivinaba {result.actorEmoji} <strong>{result.actorName}</strong> ·{" "}
              {result.guesses} intento(s)
            </p>
          </div>
        </div>

        <div className="border-t-[3px] border-ink bg-paper-2 p-5">
          <Button
            onClick={() => act("next")}
            disabled={busy}
            className="w-full py-4 text-lg"
          >
            {isLast ? "Ver resultados 🏆" : "Siguiente ronda ▸"}
          </Button>
          {view.deckLoading && (
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-widest text-ink-soft">
              Trayendo más personajes…
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
