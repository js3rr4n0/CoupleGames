"use client";

import { CATEGORY_BY_ID } from "@/lib/categories";
import type { SessionView } from "@/lib/view";
import Poster from "./Poster";
import { Button, Card, Confetti } from "./ui";

const HEADLINE = {
  won: { title: "¡Acertó!", emoji: "🎉", tone: "text-emerald-300" },
  timeout: { title: "Se acabó el tiempo", emoji: "⏰", tone: "text-amber-300" },
  passed: { title: "Ronda rendida", emoji: "🏳️", tone: "text-rose-300" },
  live: { title: "Ronda", emoji: "🎭", tone: "text-white" },
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
      <Card className="p-8 text-center">
        <p className="text-white/70">{view.deckError ?? "Preparando la siguiente ronda…"}</p>
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
      <Card className="animate-rise mx-auto max-w-3xl overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <Poster
            src={result.image}
            alt={result.characterName}
            emoji={meta?.emoji ?? "🎲"}
            className="h-52 w-44 rounded-3xl shadow-2xl shadow-black/50"
            emojiClassName="text-6xl"
          />

          <div>
            <p className={`text-sm font-bold uppercase tracking-[0.2em] ${headline.tone}`}>
              {headline.emoji} {headline.title}
            </p>
            <h2 className="mt-2 text-balance-pretty text-4xl font-black leading-tight tracking-tight">
              {result.characterName}
            </h2>
            <p className="mt-2 text-sm text-white/55">
              {meta?.emoji} {meta?.label} · datos de {result.source}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-black tabular-nums text-glow-300">
                  +{result.points}
                </p>
                <p className="text-xs text-white/45">puntos</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-black tabular-nums">{result.seconds}s</p>
                <p className="text-xs text-white/45">tardó</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-black tabular-nums">{result.hintsUsed}</p>
                <p className="text-xs text-white/45">pistas</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-white/60">
              Adivinaba {result.actorEmoji} <strong>{result.actorName}</strong> ·{" "}
              {result.guesses} intento(s)
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 p-6">
          <Button
            onClick={() => act("next")}
            disabled={busy}
            className="w-full py-4 text-base"
          >
            {isLast ? "Ver resultados finales 🏆" : "Siguiente ronda →"}
          </Button>
          {view.deckLoading && (
            <p className="mt-3 text-center text-xs text-white/40">
              Trayendo más personajes de las APIs…
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
