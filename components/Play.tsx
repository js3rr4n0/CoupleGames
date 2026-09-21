"use client";

import { useEffect, useRef, useState } from "react";
import type { AnswerValue } from "@/lib/types";
import type { SessionView } from "@/lib/view";
import { TimerRing, useCountdown } from "./Timer";
import Poster from "./Poster";
import { Avatar, Badge, Button, Card } from "./ui";

const ANSWER_STYLES: Record<AnswerValue, { label: string; emoji: string; className: string }> = {
  si: {
    label: "Sí",
    emoji: "✅",
    className: "from-emerald-500 to-teal-400 shadow-emerald-500/25",
  },
  no: {
    label: "No",
    emoji: "❌",
    className: "from-rose-500 to-orange-500 shadow-rose-500/25",
  },
  quiza: {
    label: "Quizá",
    emoji: "🤷",
    className: "from-amber-400 to-yellow-500 shadow-amber-500/25",
  },
};

type Act = (action: string, payload?: Record<string, unknown>) => Promise<{ correct?: boolean } | unknown>;

export default function Play({
  view,
  act,
  busy,
}: {
  view: SessionView;
  act: Act;
  busy: boolean;
}) {
  const round = view.round!;
  const left = useCountdown(round.secondsLeft, round.status === "live");

  return round.youGuess ? (
    <GuesserPanel view={view} act={act} busy={busy} left={left} />
  ) : (
    <HelperPanel view={view} act={act} busy={busy} left={left} />
  );
}

function RoundHeader({
  view,
  left,
  subtitle,
}: {
  view: SessionView;
  left: number;
  subtitle: string;
}) {
  const round = view.round!;
  return (
    <div className="flex items-center gap-4">
      <TimerRing left={left} total={round.totalSeconds} />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">
          Ronda {view.roundsDone + 1} de {view.roundsTotal}
        </p>
        <p className="mt-1 truncate text-lg font-bold tracking-tight">{subtitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>
            {round.card.categoryEmoji} {round.card.categoryLabel}
          </Badge>
          <Badge>Fuente: {round.card.source}</Badge>
        </div>
      </div>
    </div>
  );
}

function AnswersFeed({ view }: { view: SessionView }) {
  const answers = view.round!.answers;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
        Respuestas del grupo
      </p>
      {answers.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white/5 p-4 text-sm text-white/45">
          Haz tu primera pregunta en voz alta: ¿soy una persona real?
        </p>
      ) : (
        <ul className="scroll-soft mt-3 flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
          {answers.map((answer) => {
            const style = ANSWER_STYLES[answer.value];
            return (
              <li
                key={answer.id}
                className="animate-pop flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2"
              >
                <Avatar emoji={answer.emoji} size="sm" />
                <span className="flex-1 truncate text-sm text-white/70">
                  {answer.playerName}
                </span>
                <span
                  className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white ${style.className}`}
                >
                  {style.emoji} {style.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GuesserPanel({
  view,
  act,
  busy,
  left,
}: {
  view: SessionView;
  act: Act;
  busy: boolean;
  left: number;
}) {
  const round = view.round!;
  const card = round.card;
  const [guess, setGuess] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (guess.trim().length < 2) return;
    const result = (await act("guess", { text: guess })) as { correct?: boolean };
    setGuess("");
    if (!result?.correct) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  const hintsLeft = round.hintsMax - round.hintsUsed;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="animate-rise overflow-hidden">
        <div className="border-b border-white/10 p-6">
          <RoundHeader view={view} left={left} subtitle="Te toca adivinar" />
        </div>

        <div className="relative p-6">
          <div className="pointer-events-none absolute inset-x-6 top-6 h-44 rounded-3xl bg-gradient-to-br from-glow-500/30 to-candy-500/20 blur-2xl" />
          <div
            className={`relative grid place-items-center rounded-3xl border border-white/15 bg-night-900/60 p-8 text-center ${
              shake ? "animate-pop" : ""
            }`}
          >
            <span className="text-5xl">🙈</span>
            <p className="mt-4 font-mono text-2xl tracking-[0.35em] text-glow-300 sm:text-3xl">
              {card.mask}
            </p>
            <p className="mt-3 text-sm text-white/50">
              {card.letters} letras · nadie puede decirte el nombre
            </p>
          </div>

          <form onSubmit={submit} className="mt-5 flex gap-2">
            <input
              ref={inputRef}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Escribe tu respuesta…"
              maxLength={60}
              className={`w-full rounded-2xl border bg-night-900/60 px-4 py-3.5 text-base outline-none transition placeholder:text-white/30 focus:ring-2 focus:ring-glow-500/30 ${
                shake
                  ? "animate-pop border-rose-400/60"
                  : "border-white/10 focus:border-glow-400"
              }`}
            />
            <Button type="submit" disabled={busy} className="shrink-0">
              Adivinar
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="soft"
              disabled={busy || hintsLeft <= 0}
              onClick={() => act("hint")}
            >
              💡 Pedir pista ({hintsLeft} restantes · −20 pts)
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => act("pass")}>
              🏳️ Me rindo
            </Button>
          </div>

          {card.revealedHints && card.revealedHints.length > 0 && (
            <ul className="mt-4 space-y-2">
              {card.revealedHints.map((hint, index) => (
                <li
                  key={hint}
                  className="animate-pop rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"
                >
                  <span className="mr-2 font-bold">Pista {index + 1}:</span>
                  {hint}
                </li>
              ))}
            </ul>
          )}

          {round.guesses.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                Ya intentaste
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {round.guesses.map((g) => (
                  <span
                    key={g.id}
                    className={`rounded-full px-3 py-1 text-xs ${
                      g.correct
                        ? "bg-emerald-500/25 text-emerald-100"
                        : "bg-white/8 text-white/45 line-through"
                    }`}
                  >
                    {g.text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="animate-rise p-6">
        <AnswersFeed view={view} />
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
          <p className="font-semibold text-white/80">Sugerencias de preguntas</p>
          <p className="mt-2">¿Soy una persona real? ¿Estoy vivo? ¿Salgo en una serie?</p>
          <p className="mt-1">¿Soy de ficción? ¿Canto? ¿Tengo poderes?</p>
        </div>
      </Card>
    </div>
  );
}

function HelperPanel({
  view,
  act,
  busy,
  left,
}: {
  view: SessionView;
  act: Act;
  busy: boolean;
  left: number;
}) {
  const round = view.round!;
  const card = round.card;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="animate-rise overflow-hidden">
        <div className="border-b border-white/10 p-6">
          <RoundHeader
            view={view}
            left={left}
            subtitle={`${round.actorEmoji} ${round.actorName} está adivinando`}
          />
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-[auto_1fr]">
          <Poster
            src={card.image}
            alt={card.name ?? ""}
            emoji={card.categoryEmoji}
            className="h-44 w-36 rounded-3xl shadow-xl shadow-black/40 sm:h-52 sm:w-40"
          />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              El personaje secreto es
            </p>
            <h2 className="mt-2 text-balance-pretty text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {card.name}
            </h2>
            <p className="mt-3 text-sm text-rose-200/80">
              🤫 No lo digas en voz alta. Solo responde a sus preguntas.
            </p>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                Datos que puedes confirmar
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-white/70">
                {card.hints?.map((hint) => (
                  <li key={hint} className="rounded-xl bg-white/5 px-3 py-2">
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-white/10 p-6">
          {(Object.keys(ANSWER_STYLES) as AnswerValue[]).map((value) => {
            const style = ANSWER_STYLES[value];
            return (
              <button
                key={value}
                disabled={busy}
                onClick={() => act("answer", { value })}
                className={`rounded-3xl bg-gradient-to-br py-6 text-lg font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50 ${style.className}`}
              >
                <span className="block text-2xl">{style.emoji}</span>
                {style.label}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="animate-rise p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
            Intentos de {round.actorName}
          </p>
          {round.guesses.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-white/5 p-4 text-sm text-white/45">
              Todavía no arriesga ningún nombre.
            </p>
          ) : (
            <ul className="scroll-soft mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
              {round.guesses.map((g) => (
                <li
                  key={g.id}
                  className={`animate-pop rounded-2xl px-3 py-2 text-sm ${
                    g.correct
                      ? "bg-emerald-500/20 text-emerald-100"
                      : "bg-white/5 text-white/60"
                  }`}
                >
                  {g.correct ? "🎉 " : "❌ "}
                  {g.text}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <AnswersFeed view={view} />
        </Card>
      </div>
    </div>
  );
}
