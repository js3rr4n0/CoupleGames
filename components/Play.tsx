"use client";

import { useEffect, useRef, useState } from "react";
import type { AnswerValue, CategoryId } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import type { SessionView } from "@/lib/view";
import Poster from "./Poster";
import { TimerBox, useCountdown } from "./Timer";
import { Avatar, Badge, Button, Card, LetterSlots } from "./ui";

const ANSWERS: Record<AnswerValue, { label: string; emoji: string; color: string }> = {
  si: { label: "Sí", emoji: "👍", color: "bg-grass text-white" },
  no: { label: "No", emoji: "👎", color: "bg-tomato text-white" },
  quiza: { label: "Quizá", emoji: "🤔", color: "bg-sun text-ink" },
};

type Act = (
  action: string,
  payload?: Record<string, unknown>,
) => Promise<{ correct?: boolean } | unknown>;

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
  const unlimited = round.secondsLeft === null;
  const left = useCountdown(round.secondsLeft ?? 0, round.status === "live" && !unlimited);

  return round.youGuess ? (
    <GuesserPanel view={view} act={act} busy={busy} left={left} unlimited={unlimited} />
  ) : (
    <HelperPanel view={view} act={act} busy={busy} left={left} unlimited={unlimited} />
  );
}

function TurnBar({
  view,
  left,
  title,
  tone,
  unlimited,
}: {
  view: SessionView;
  left: number;
  title: string;
  tone: string;
  unlimited: boolean;
}) {
  const round = view.round!;
  return (
    <div className={`flex items-center gap-4 border-b-[3px] border-ink px-5 py-4 ${tone}`}>
      <TimerBox left={left} total={round.totalSeconds} unlimited={unlimited} />
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-widest opacity-80">
          Ronda {view.roundsDone + 1} de {view.roundsTotal}
        </p>
        <p className="mt-0.5 truncate font-display text-2xl leading-tight">{title}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>
            {round.card.categoryEmoji} {round.card.categoryLabel}
          </Badge>
          <Badge className="hidden sm:inline-flex">{round.card.source}</Badge>
        </div>
      </div>
    </div>
  );
}

function AnswerChip({ value }: { value: AnswerValue }) {
  const style = ANSWERS[value];
  return (
    <span
      className={`rounded-lg border-2 border-ink px-2 py-0.5 text-xs font-extrabold ${style.color}`}
    >
      {style.emoji} {style.label}
    </span>
  );
}

/** Las preguntas escritas con lo que contestó cada quien, y debajo las sueltas. */
function QuestionsFeed({ view }: { view: SessionView }) {
  const round = view.round!;
  const { questions, answers } = round;

  return (
    <>
      <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
        Preguntas y respuestas
      </p>
      {!questions.length && !answers.length ? (
        <p className="mt-3 rounded-xl border-[3px] border-dashed border-ink/30 p-4 text-sm font-semibold text-ink-soft">
          Todavía no hay nada. Escribe una pregunta o lánzala en voz alta.
        </p>
      ) : (
        <ul className="scroll-soft mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
          {questions.map((question, index) => (
            <li
              key={question.id}
              className={`animate-pop rounded-xl border-[3px] border-ink p-3 ${
                index === 0 ? "bg-sun" : "bg-paper"
              }`}
            >
              <p className="font-display text-base leading-tight">{question.text}</p>
              {question.answers.length ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {question.answers.map((answer) => (
                    <span key={answer.id} className="flex items-center gap-1">
                      <span className="text-sm">{answer.emoji}</span>
                      <AnswerChip value={answer.value} />
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  esperando respuesta…
                </p>
              )}
            </li>
          ))}

          {answers.map((answer) => (
            <li
              key={answer.id}
              className="animate-pop flex items-center gap-2.5 rounded-xl border-[3px] border-ink bg-paper px-3 py-2"
            >
              <Avatar emoji={answer.emoji} size="sm" />
              <span className="flex-1 truncate text-sm font-bold">
                {answer.playerName}
              </span>
              <AnswerChip value={answer.value} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function GuesserPanel({
  view,
  act,
  busy,
  left,
  unlimited,
}: {
  view: SessionView;
  act: Act;
  busy: boolean;
  left: number;
  unlimited: boolean;
}) {
  const round = view.round!;
  const card = round.card;
  const [guess, setGuess] = useState("");
  const [question, setQuestion] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim().length < 3) return;
    await act("ask", { text: question });
    setQuestion("");
  }

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
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="animate-rise overflow-hidden p-0">
        <TurnBar
          view={view}
          left={left}
          title="Te toca adivinar"
          tone="bg-sun"
          unlimited={unlimited}
        />

        <div className="p-5 sm:p-6">
          <div
            className={`rounded-2xl border-[3px] border-ink bg-ink px-4 py-8 text-center ${
              shake ? "animate-wiggle" : ""
            }`}
          >
            <p className="font-display text-sm uppercase tracking-[0.3em] text-white/70">
              Carta boca abajo
            </p>
            <p className="mt-2 font-display text-5xl text-white">?</p>
            <div className="mt-6">
              <LetterSlots mask={card.mask ?? ""} />
            </div>
            <p className="mt-5 text-sm font-bold text-white/70">
              {card.letters} letras · nadie puede decirte el nombre
            </p>
            {round.swaps > 0 && (
              <p className="mt-1 text-sm font-bold text-sun">
                🔄 El grupo te cambió la carta {round.swaps}{" "}
                {round.swaps === 1 ? "vez" : "veces"}
              </p>
            )}
          </div>

          <form onSubmit={ask} className="mt-5 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Escribe tu pregunta: ¿soy una persona real?"
              maxLength={140}
              className="w-full rounded-xl border-[3px] border-ink bg-white px-4 py-3 font-semibold outline-none placeholder:font-normal placeholder:text-ink-soft/60"
            />
            <Button type="submit" variant="plain" disabled={busy} className="shrink-0">
              Preguntar
            </Button>
          </form>

          <form onSubmit={submit} className="mt-3 flex gap-2">
            <input
              ref={inputRef}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Escribe tu respuesta…"
              maxLength={60}
              className={`w-full rounded-xl border-[3px] px-4 py-3.5 text-lg font-bold outline-none placeholder:font-semibold placeholder:text-ink-soft/50 ${
                shake ? "animate-wiggle border-tomato bg-tomato/10" : "border-ink bg-paper focus:bg-white"
              }`}
            />
            <Button type="submit" disabled={busy} className="shrink-0">
              Adivinar
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="plain"
              disabled={busy || hintsLeft <= 0}
              onClick={() => act("hint")}
            >
              💡 Pedir pista · quedan {hintsLeft} (−15)
            </Button>
            <Button variant="quiet" disabled={busy} onClick={() => act("pass")}>
              🏳️ Me rindo
            </Button>
          </div>

          {card.revealedHints && card.revealedHints.length > 0 && (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {card.revealedHints.map((hint, index) => (
                <li
                  key={hint}
                  className="animate-pop rounded-lg border-[3px] border-ink bg-sun p-3 shadow-hard-sm"
                  style={{ transform: `rotate(${index % 2 ? 1 : -1}deg)` }}
                >
                  <p className="text-[11px] font-extrabold uppercase tracking-widest">
                    Pista {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-bold">{hint}</p>
                </li>
              ))}
            </ul>
          )}

          {round.guesses.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
                Ya lo intentaste con
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {round.guesses.map((g) => (
                  <span
                    key={g.id}
                    className={`rounded-lg border-2 border-ink px-2.5 py-1 text-sm font-bold ${
                      g.correct ? "bg-grass text-white" : "bg-white line-through opacity-60"
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

      <div className="space-y-5">
        <Card className="animate-rise p-5">
          <QuestionsFeed view={view} />
        </Card>
        <Card className="p-5" tone="paper">
          <p className="font-display text-lg">Preguntas para arrancar</p>
          <ul className="mt-2 space-y-1.5 text-sm font-semibold text-ink-soft">
            <li>· ¿Soy una persona real?</li>
            <li>· ¿Salgo en una serie o en una peli?</li>
            <li>· ¿Canto? ¿Escribo? ¿Tengo poderes?</li>
            <li>· ¿Me conocería mi madre?</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function CardPicker({
  view,
  act,
  busy,
}: {
  view: SessionView;
  act: Act;
  busy: boolean;
}) {
  const round = view.round!;
  const [deck, setDeck] = useState<CategoryId>(round.card.categoryId);

  if (round.options.length) {
    return (
      <div className="animate-pop border-t-[3px] border-ink bg-sun p-4">
        <p className="font-display text-lg">Elegid la carta que le toca</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {round.options.map((option) => (
            <button
              key={option.id}
              disabled={busy}
              onClick={() => act("choose", { characterId: option.id })}
              className="press overflow-hidden rounded-xl border-[3px] border-ink bg-white text-left shadow-hard-sm"
            >
              <Poster
                src={option.image}
                alt={option.name}
                emoji={option.categoryEmoji}
                className="h-24 w-full rounded-none border-0 border-b-[3px]"
                emojiClassName="text-3xl"
              />
              <span className="block px-2 py-1.5">
                <span className="block text-sm font-extrabold leading-tight">
                  {option.name}
                </span>
                <span className="mt-0.5 block text-[11px] font-bold text-ink-soft">
                  {option.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
        <Button
          variant="quiet"
          className="mt-3 px-3 py-1.5 text-sm"
          disabled={busy}
          onClick={() => act("cancel-options")}
        >
          Dejarlo como está
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t-[3px] border-ink bg-paper-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
          ¿No os convence la carta?
        </span>
        <select
          value={deck}
          onChange={(event) => setDeck(event.target.value as CategoryId)}
          className="rounded-lg border-2 border-ink bg-white px-2 py-1.5 text-sm font-bold"
        >
          {CATEGORY_META.map((category) => (
            <option key={category.id} value={category.id}>
              {category.emoji} {category.label}
            </option>
          ))}
        </select>
        <Button
          variant="plain"
          className="px-3 py-1.5 text-sm"
          disabled={busy}
          onClick={() => act("swap", { categories: [deck] })}
        >
          🎲 Otra carta
        </Button>
        <Button
          variant="plain"
          className="px-3 py-1.5 text-sm"
          disabled={busy}
          onClick={() => act("options", { categories: [deck] })}
        >
          🗂️ Elegir entre tres
        </Button>
        {round.swaps > 0 && (
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            cambiada {round.swaps} {round.swaps === 1 ? "vez" : "veces"}
          </span>
        )}
      </div>
    </div>
  );
}

function HelperPanel({
  view,
  act,
  busy,
  left,
  unlimited,
}: {
  view: SessionView;
  act: Act;
  busy: boolean;
  left: number;
  unlimited: boolean;
}) {
  const round = view.round!;
  const card = round.card;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="animate-rise overflow-hidden p-0">
        <TurnBar
          view={view}
          left={left}
          title={`${round.actorEmoji} ${round.actorName} adivina`}
          tone="bg-sky text-white"
          unlimited={unlimited}
        />

        <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
          <Poster
            src={card.image}
            alt={card.name ?? ""}
            emoji={card.categoryEmoji}
            className="h-44 w-36 rounded-xl shadow-hard-sm sm:h-52 sm:w-40"
          />
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
              La carta secreta es
            </p>
            <h2 className="mt-1 font-display text-4xl leading-none">{card.name}</h2>
            <p className="mt-3 inline-block rounded-lg border-2 border-ink bg-tomato px-2.5 py-1 text-xs font-extrabold text-white">
              🤫 No lo digas en voz alta
            </p>

            <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-ink-soft">
              Datos que puedes confirmar
            </p>
            <ul className="mt-2 space-y-1.5">
              {card.hints?.map((hint) => (
                <li
                  key={hint}
                  className="rounded-lg border-2 border-ink bg-paper px-3 py-1.5 text-sm font-semibold"
                >
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <CardPicker view={view} act={act} busy={busy} />

        <div className="border-t-[3px] border-ink bg-paper-2 p-5">
          <div
            className={`mb-3 rounded-xl border-[3px] border-ink p-3 ${
              round.questions.length ? "bg-sun" : "border-dashed bg-transparent"
            }`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink-soft">
              {round.questions.length
                ? `${round.actorName} pregunta`
                : `${round.actorName} está preguntando en voz alta`}
            </p>
            <p className="font-display text-lg leading-tight">
              {round.questions[0]?.text ?? "Contesta con los botones cuando pregunte."}
            </p>
            {round.questions[0]?.answers.length ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {round.questions[0].answers.map((answer) => (
                  <span key={answer.id} className="flex items-center gap-1">
                    <span className="text-sm">{answer.emoji}</span>
                    <AnswerChip value={answer.value} />
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
          {(Object.keys(ANSWERS) as AnswerValue[]).map((value) => {
            const style = ANSWERS[value];
            return (
              <button
                key={value}
                disabled={busy}
                onClick={() =>
                  act("answer", {
                    value,
                    questionId: round.questions[0]?.id,
                  })
                }
                className={`press rounded-xl border-[3px] border-ink py-5 font-display text-xl shadow-hard disabled:opacity-50 ${style.color}`}
              >
                <span className="block text-3xl">{style.emoji}</span>
                {style.label}
              </button>
            );
          })}
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="animate-rise p-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
            Intentos de {round.actorName}
          </p>
          {round.guesses.length === 0 ? (
            <p className="mt-3 rounded-xl border-[3px] border-dashed border-ink/30 p-4 text-sm font-semibold text-ink-soft">
              Todavía no arriesga ningún nombre.
            </p>
          ) : (
            <ul className="scroll-soft mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
              {round.guesses.map((g) => (
                <li
                  key={g.id}
                  className={`animate-pop rounded-xl border-[3px] border-ink px-3 py-2 text-sm font-bold ${
                    g.correct ? "bg-grass text-white" : "bg-paper"
                  }`}
                >
                  {g.correct ? "🎉 " : "❌ "}
                  {g.text}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <QuestionsFeed view={view} />
        </Card>
      </div>
    </div>
  );
}
