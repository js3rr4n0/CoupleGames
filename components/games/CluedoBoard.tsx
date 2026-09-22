"use client";

import { useEffect, useState } from "react";
import {
  CARD_BY_ID,
  PASSAGES,
  ROOMS,
  ROOM_GRID,
  SUSPECTS,
  WEAPONS,
} from "@/lib/games/cluedo-data";
import type { HistoryEntry } from "@/lib/games/cluedo-deduce";
import { useSeen } from "@/lib/remember";
import { play, useSfxOn } from "@/lib/sfx";
import type { RoomView } from "@/lib/engine/view";
import { Button, Card } from "../ui";
import { Die } from "./dice";
import Notebook from "./cluedo/Notebook";

interface CluedoViewState {
  order: string[];
  turn: string;
  stage: "tirar" | "mover" | "sugerir" | "refutar" | "fin";
  die: number | null;
  reachable: string[];
  positions: Record<string, string>;
  weaponRooms: Record<string, string>;
  out: string[];
  winnerId: string | null;
  history: HistoryEntry[];
  hand: string[];
  reveals: { from: string; card: string; at: number }[];
  handCounts: Record<string, number>;
  suggestion: {
    by: string;
    byName: string;
    suspect: string;
    weapon: string;
    room: string;
    askingId: string | null;
    asked: string[];
    options: string[];
  } | null;
  solution: { suspect: string; weapon: string; room: string } | null;
}

export default function CluedoBoard({
  view,
  play: send,
  marks,
  onMark,
}: {
  view: RoomView;
  play: (move: Record<string, unknown>) => void;
  marks: Record<string, string>;
  onMark: (key: string, value: string) => void;
}) {
  const state = view.state as CluedoViewState;
  const me = view.you?.id ?? null;
  const myTurn = state.turn === me && !state.winnerId;
  const amOut = me ? state.out.includes(me) : false;
  const mustRefute = state.suggestion?.askingId === me;

  const [suspect, setSuspect] = useState(SUSPECTS[0].id);
  const [weapon, setWeapon] = useState(WEAPONS[0].id);
  const [accusing, setAccusing] = useState(false);
  // En el móvil no caben los cinco paneles a la vez: se pasa de uno a otro.
  const [tab, setTab] = useState<"mansion" | "cartas" | "libreta" | "mesa">("mansion");
  const panel = (id: typeof tab) => `${tab === id ? "block" : "hidden"} lg:block`;
  const [accRoom, setAccRoom] = useState(ROOMS[0].id);

  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? "?";
  const emojiOf = (id: string) => view.players.find((p) => p.id === id)?.emoji ?? "🕵️";
  const myRoom = me ? state.positions[me] : null;

  useSfxOn(state.die, state.die ? "dado" : null);
  useSfxOn(JSON.stringify(state.positions), "ficha");
  useSfxOn(mustRefute ? "si" : "no", mustRefute ? "turno" : null);
  useSfxOn(state.winnerId, state.winnerId ? "victoria" : null);
  useEffect(() => {
    if (myTurn && state.stage === "tirar") play("turno");
  }, [myTurn, state.stage]);

  const coach = buildCoach({ state, myTurn, amOut, mustRefute, nameOf });

  return (
    <div className="space-y-4">
      <HowItWorks />

      {/* La barra que siempre dice, en cristiano, qué toca hacer ahora. */}
      <Card
        className={`animate-rise overflow-hidden p-0 ${coach.urgent ? "animate-pulse-ring" : ""}`}
        tone={coach.urgent ? "sun" : undefined}
      >
        <div className="flex flex-wrap items-center gap-4 p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-[3px] border-ink bg-white text-3xl shadow-hard-sm">
            {coach.emoji}
          </span>
          <div className="min-w-[14rem] flex-1">
            {coach.step && (
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink-soft">
                {coach.step}
              </p>
            )}
            <p className="font-display text-xl leading-tight">{coach.title}</p>
            <p className="text-sm font-semibold text-ink-soft">{coach.detail}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state.die !== null && (
              <Die value={state.die} spin={`${state.turn}-${state.stage}`} size={3.4} />
            )}
            {myTurn && state.stage === "tirar" && (
              <Button
                className="px-5 py-3 text-lg"
                onClick={() => send({ type: "tirar" })}
              >
                🎲 Tirar el dado
              </Button>
            )}
            {myTurn && state.stage === "sugerir" && (
              <Button
                variant="plain"
                className="px-3 py-2 text-sm"
                onClick={() => send({ type: "pasar" })}
              >
                Pasar turno
              </Button>
            )}
            {!amOut && (
              <Button
                variant="danger"
                className="px-3 py-2 text-sm"
                disabled={!myTurn || state.stage === "refutar"}
                onClick={() => setAccusing(true)}
                title="La acusación final: si aciertas ganas, si fallas quedas fuera"
              >
                ⚖️ Acusar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {myTurn && state.stage === "sugerir" && myRoom && (
        <Card className="animate-rise overflow-hidden p-4">
          <p className="font-display text-lg">
            Estás en {CARD_BY_ID.get(myRoom)?.emoji} {CARD_BY_ID.get(myRoom)?.name}.
            ¿Quién lo hizo y con qué?
          </p>
          <p className="text-sm font-semibold text-ink-soft">
            Al sospechar, la mesa entera tendrá que enseñarte una carta si la tiene. La
            habitación es siempre en la que estás.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <PickList
              label="Sospechoso"
              value={suspect}
              onChange={setSuspect}
              options={SUSPECTS}
            />
            <PickList
              label="Arma"
              value={weapon}
              onChange={setWeapon}
              options={WEAPONS}
            />
            <Button
              className="self-end"
              onClick={() => {
                play("carta");
                send({ type: "sugerir", suspect, weapon });
              }}
            >
              ❓ Sospechar
            </Button>
          </div>
        </Card>
      )}

      {/* La sospecha en curso, para que la mesa entera siga el interrogatorio. */}
      {state.suggestion && (
        <Interrogation
          state={state}
          me={me}
          nameOf={nameOf}
          emojiOf={emojiOf}
          send={send}
        />
      )}

      <div className="grid grid-cols-4 gap-1.5 lg:hidden">
        {(
          [
            ["mansion", "🏚️", "Mansión"],
            ["cartas", "🔒", "Tus cartas"],
            ["libreta", "🗂️", "Libreta"],
            ["mesa", "👀", "La mesa"],
          ] as const
        ).map(([id, emoji, label]) => (
          <button
            key={id}
            onClick={() => {
              play("toc");
              setTab(id);
            }}
            className={`rounded-xl border-[3px] border-ink px-1 py-2 text-[11px] font-extrabold leading-tight shadow-hard-sm ${
              tab === id ? "bg-sun" : "bg-white"
            }`}
          >
            <span className="block text-base">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className={`overflow-hidden p-0 ${panel("mansion")}`}>
          <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-2.5 text-white">
            <h3 className="font-display text-lg">🏚️ La mansión</h3>
            <span className="text-[11px] font-extrabold uppercase tracking-widest">
              {myTurn && state.stage === "mover"
                ? "toca una habitación iluminada"
                : "9 habitaciones · 2 pasadizos"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 bg-paper-2/60 p-3">
            {ROOM_GRID.flat().map((room, index) => {
              if (!room)
                return (
                  <div
                    key={`pasillo-${index}`}
                    className="grid min-h-[6.5rem] place-items-center rounded-xl border-[3px] border-dashed border-ink/25 bg-paper/50 text-[10px] font-extrabold uppercase tracking-widest text-ink-soft"
                  >
                    pasillo
                  </div>
                );
              const card = CARD_BY_ID.get(room);
              const canGo =
                myTurn && state.stage === "mover" && state.reachable.includes(room);
              const here = state.order.filter((id) => state.positions[id] === room);
              const guns = Object.entries(state.weaponRooms).filter(
                ([, w]) => w === room,
              );
              return (
                <button
                  key={room}
                  disabled={!canGo}
                  onClick={() => {
                    play("ficha");
                    send({ type: "mover", room });
                  }}
                  className={`relative min-h-[6.5rem] rounded-xl border-[3px] border-ink p-2 text-left transition ${
                    canGo
                      ? "animate-glow cursor-pointer bg-sun shadow-hard-sm hover:-translate-y-1 hover:shadow-hard"
                      : myRoom === room
                        ? "bg-white ring-4 ring-inset ring-grape/40"
                        : "bg-white"
                  }`}
                >
                  <p className="font-display text-base leading-tight">
                    {card?.emoji} {card?.name}
                  </p>
                  {PASSAGES[room] && (
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-grape">
                      ↯ pasadizo a {CARD_BY_ID.get(PASSAGES[room])?.name}
                    </p>
                  )}
                  {myRoom === room && (
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-soft">
                      estás aquí
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {here.map((id) => (
                      <span
                        key={id}
                        title={nameOf(id)}
                        className={`animate-hop grid h-7 w-7 place-items-center rounded-full border-2 border-ink bg-white text-sm shadow-hard-sm ${
                          state.out.includes(id) ? "opacity-40 grayscale" : ""
                        } ${state.turn === id ? "ring-2 ring-sun" : ""}`}
                      >
                        {emojiOf(id)}
                      </span>
                    ))}
                    {guns.map(([id]) => (
                      <span
                        key={id}
                        title={CARD_BY_ID.get(id)?.name}
                        className="grid h-6 w-6 place-items-center rounded-md border-2 border-ink bg-paper-2 text-xs"
                      >
                        {CARD_BY_ID.get(id)?.emoji}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div
          className={`space-y-4 lg:block ${
            tab === "cartas" || tab === "mesa" ? "block" : "hidden"
          }`}
        >
          <Card className={`overflow-hidden p-0 ${panel("cartas")}`}>
            <div className="flex items-center justify-between border-b-[3px] border-ink bg-grape px-4 py-2.5 text-white">
              <h3 className="font-display text-lg">🔒 Tus cartas</h3>
              <span className="text-[11px] font-extrabold uppercase tracking-widest">
                nadie más las ve
              </span>
            </div>
            <div className="flex flex-wrap gap-2 p-3">
              {state.hand.map((cardId, index) => {
                const card = CARD_BY_ID.get(cardId);
                return (
                  <span
                    key={cardId}
                    style={{ animationDelay: `${index * 60}ms` }}
                    className="animate-deal w-[7.2rem] rounded-xl border-[3px] border-ink bg-paper px-2 py-2 text-center shadow-hard-sm"
                  >
                    <span className="block text-2xl">{card?.emoji}</span>
                    <span className="block text-xs font-extrabold leading-tight">
                      {card?.name}
                    </span>
                  </span>
                );
              })}
              {!state.hand.length && (
                <p className="p-2 text-sm font-semibold text-ink-soft">
                  Sin cartas en esta partida.
                </p>
              )}
            </div>
            <p className="border-t-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink-soft">
              Tus cartas <strong>no están en el sobre</strong>: la libreta ya las tacha
              por ti.
            </p>
          </Card>

          <Card className={`overflow-hidden p-0 ${panel("cartas")}`}>
            <div className="border-b-[3px] border-ink bg-white px-4 py-2.5">
              <h3 className="font-display text-lg">🔒 Lo que te han enseñado</h3>
            </div>
            {state.reveals.length === 0 ? (
              <p className="p-3 text-sm font-semibold text-ink-soft">
                Todavía nadie te ha refutado. Sospecha para que empiecen a enseñarte
                cartas.
              </p>
            ) : (
              <ul className="space-y-1.5 p-3">
                {state.reveals
                  .slice()
                  .reverse()
                  .map((reveal, index) => (
                    <li
                      key={`${reveal.card}-${reveal.at}-${index}`}
                      className="animate-flip flex items-center gap-2 rounded-lg border-2 border-ink bg-paper px-2 py-1.5 text-sm font-bold"
                    >
                      <span>{emojiOf(reveal.from)}</span>
                      <span className="text-ink-soft">{nameOf(reveal.from)} tiene</span>
                      <span className="rounded border-2 border-ink bg-white px-1.5">
                        {CARD_BY_ID.get(reveal.card)?.emoji}{" "}
                        {CARD_BY_ID.get(reveal.card)?.name}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <Card className={`overflow-hidden p-0 ${panel("mesa")}`}>
            <div className="border-b-[3px] border-ink bg-paper-2 px-4 py-2.5">
              <h3 className="font-display text-lg">👀 Sospechas de la mesa</h3>
            </div>
            {state.history.length === 0 ? (
              <p className="p-3 text-sm font-semibold text-ink-soft">
                Aquí se apunta cada sospecha y quién pudo refutarla. Es información
                pública: úsala.
              </p>
            ) : (
              <ul className="scroll-soft max-h-72 space-y-1.5 overflow-y-auto p-3">
                {state.history.map((entry, index) => (
                  <li
                    key={`${entry.at}-${index}`}
                    className="rounded-lg border-2 border-ink bg-white px-2 py-1.5 text-sm font-semibold"
                  >
                    <p className="font-extrabold">
                      {emojiOf(entry.by)} {nameOf(entry.by)}:{" "}
                      {CARD_BY_ID.get(entry.suspect)?.name} ·{" "}
                      {CARD_BY_ID.get(entry.weapon)?.name} ·{" "}
                      {CARD_BY_ID.get(entry.room)?.name}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {entry.refutedBy
                        ? `${nameOf(entry.refutedBy)} le enseñó una carta`
                        : "nadie pudo refutar 👀"}
                      {entry.passed.length > 0 &&
                        ` · sin nada: ${entry.passed.map(nameOf).join(", ")}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className={panel("libreta")}>
        <Notebook
          players={view.players.map((player) => ({
            id: player.id,
            name: player.name,
            emoji: player.emoji,
          }))}
          me={me}
          hand={state.hand}
          reveals={state.reveals}
          history={state.history}
          marks={marks}
          onMark={onMark}
        />
      </div>

      {state.solution && (
        <Card className="animate-pop overflow-hidden p-0" tone="sun">
          <div className="p-5 text-center">
            <p className="text-xs font-extrabold uppercase tracking-widest">
              Lo que había en el sobre
            </p>
            <p className="mt-1 font-display text-2xl">
              {CARD_BY_ID.get(state.solution.suspect)?.emoji}{" "}
              {CARD_BY_ID.get(state.solution.suspect)?.name} con{" "}
              {CARD_BY_ID.get(state.solution.weapon)?.emoji}{" "}
              {CARD_BY_ID.get(state.solution.weapon)?.name} en{" "}
              {CARD_BY_ID.get(state.solution.room)?.emoji}{" "}
              {CARD_BY_ID.get(state.solution.room)?.name}
            </p>
          </div>
        </Card>
      )}

      {accusing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4">
          <Card className="animate-slam w-full max-w-md p-6">
            <h3 className="font-display text-2xl">⚖️ Acusación final</h3>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              Esto se dice una sola vez en toda la partida. Si aciertas las tres cartas
              del sobre, ganas. Si fallas, quedas fuera (aunque seguirás refutando a los
              demás).
            </p>
            <div className="mt-4 grid gap-2">
              <PickList
                label="Sospechoso"
                value={suspect}
                onChange={setSuspect}
                options={SUSPECTS}
              />
              <PickList
                label="Arma"
                value={weapon}
                onChange={setWeapon}
                options={WEAPONS}
              />
              <PickList
                label="Habitación"
                value={accRoom}
                onChange={setAccRoom}
                options={ROOMS}
              />
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  send({ type: "acusar", suspect, weapon, room: accRoom });
                  setAccusing(false);
                }}
              >
                Acusar de verdad
              </Button>
              <Button variant="quiet" onClick={() => setAccusing(false)}>
                Mejor no
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PickList({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string; emoji: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border-[3px] border-ink bg-white px-2 py-2 font-bold"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.emoji} {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** El interrogatorio en directo: quién ya contestó y a quién le toca. */
function Interrogation({
  state,
  me,
  nameOf,
  emojiOf,
  send,
}: {
  state: CluedoViewState;
  me: string | null;
  nameOf: (id: string) => string;
  emojiOf: (id: string) => string;
  send: (move: Record<string, unknown>) => void;
}) {
  const suggestion = state.suggestion!;
  const queue = state.order.filter((id) => id !== suggestion.by);
  return (
    <Card className="animate-rise overflow-hidden p-0">
      <div className="border-b-[3px] border-ink bg-grape px-4 py-2.5 text-white">
        <h3 className="font-display text-lg">
          ❓ {suggestion.byName} sospecha… y la mesa tiene que contestar
        </h3>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {[suggestion.suspect, suggestion.weapon, suggestion.room].map((cardId) => (
            <span
              key={cardId}
              className="animate-flip rounded-xl border-[3px] border-ink bg-white px-3 py-2 text-center shadow-hard-sm"
            >
              <span className="block text-2xl">{CARD_BY_ID.get(cardId)?.emoji}</span>
              <span className="text-xs font-extrabold">
                {CARD_BY_ID.get(cardId)?.name}
              </span>
            </span>
          ))}
        </div>

        <ul className="flex flex-wrap gap-2">
          {queue.map((id) => {
            const answered = suggestion.asked.includes(id);
            const asking = suggestion.askingId === id;
            return (
              <li
                key={id}
                className={`rounded-lg border-2 border-ink px-2 py-1 text-xs font-extrabold ${
                  asking
                    ? "animate-nod bg-sun"
                    : answered
                      ? "bg-white text-ink-soft line-through"
                      : "bg-paper"
                }`}
              >
                {emojiOf(id)} {nameOf(id)}
                {asking ? " · pensando…" : answered ? " · no tenía" : " · en la cola"}
              </li>
            );
          })}
        </ul>

        {suggestion.askingId === me && (
          <div className="animate-pop rounded-xl border-[3px] border-ink bg-sun p-3">
            <p className="font-display text-lg">
              Te toca: enséñale <strong>una sola</strong> carta. Solo la verá{" "}
              {suggestion.byName}.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestion.options.map((cardId) => (
                <button
                  key={cardId}
                  onClick={() => {
                    play("carta");
                    send({ type: "refutar", cardId });
                  }}
                  className="press rounded-xl border-[3px] border-ink bg-white px-3 py-2 text-sm font-extrabold shadow-hard-sm"
                >
                  {CARD_BY_ID.get(cardId)?.emoji} {CARD_BY_ID.get(cardId)?.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/** El tutorial: se abre solo la primera vez y luego se queda plegado. */
function HowItWorks() {
  const [seen, markSeen] = useSeen("couplegames:cluedo-visto");
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? !seen;

  function close() {
    setManual(false);
    markSeen();
  }

  return (
    <Card className="overflow-hidden p-0">
      <button
        onClick={() => (open ? close() : setManual(true))}
        className="flex w-full items-center justify-between gap-2 border-ink bg-sky px-4 py-2.5 text-left text-white"
        style={{ borderBottomWidth: open ? 3 : 0 }}
      >
        <span className="font-display text-lg">
          🕵️ ¿Cómo se juega al Cluedo? (30 segundos)
        </span>
        <span className="font-extrabold">{open ? "ocultar ▴" : "leer ▾"}</span>
      </button>
      {open && (
        <div className="animate-rise space-y-3 p-4">
          <p className="font-semibold">
            Ha habido un crimen en la mansión. Se apartan en un sobre{" "}
            <strong>una carta de cada tipo</strong> —quién, con qué y dónde— y{" "}
            <strong>nadie las ve</strong>. Las 18 restantes se reparten entre la mesa.
            Gana quien adivine las tres del sobre.
          </p>
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                emoji: "🎲",
                title: "1. Tira el dado",
                text: "El número dice a cuántas habitaciones de distancia te puedes mover.",
              },
              {
                emoji: "👣",
                title: "2. Entra en una habitación",
                text: "Las iluminadas son las que te dan los pasos. Las esquinas opuestas tienen pasadizo.",
              },
              {
                emoji: "❓",
                title: "3. Sospecha",
                text: "Dices un sospechoso y un arma; la habitación es donde estás. La mesa debe enseñarte una carta si la tiene.",
              },
              {
                emoji: "🗂️",
                title: "4. Tacha en tu libreta",
                text: "Cada carta que ves deja de estar en el sobre. Lo que sobra al final es la solución.",
              },
            ].map((step) => (
              <li
                key={step.title}
                className="rounded-xl border-[3px] border-ink bg-paper p-3 shadow-hard-sm"
              >
                <p className="text-2xl">{step.emoji}</p>
                <p className="font-display text-base">{step.title}</p>
                <p className="text-xs font-semibold text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="rounded-xl border-[3px] border-dashed border-ink/40 p-3 text-sm font-bold">
            💡 Truco: si <strong>nadie</strong> puede refutar una sospecha, casi seguro
            que alguna de esas tres cartas está en el sobre. Y ojo: la libreta de abajo ya
            marca sola todo lo que se sabe seguro.
          </p>
          <Button variant="plain" className="px-3 py-2 text-sm" onClick={close}>
            Entendido, a jugar ▸
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Qué hacer ahora mismo, dicho sin jerga. */
function buildCoach({
  state,
  myTurn,
  amOut,
  mustRefute,
  nameOf,
}: {
  state: CluedoViewState;
  myTurn: boolean;
  amOut: boolean;
  mustRefute: boolean;
  nameOf: (id: string) => string;
}): {
  emoji: string;
  title: string;
  detail: string;
  step?: string;
  urgent: boolean;
} {
  if (state.winnerId)
    return {
      emoji: "🏆",
      title: `${nameOf(state.winnerId)} ha resuelto el caso`,
      detail: "Abajo tienes lo que guardaba el sobre.",
      urgent: false,
    };

  if (mustRefute)
    return {
      emoji: "🤫",
      title: "Te toca refutar",
      detail:
        "Tienes alguna de las cartas que acaban de nombrar. Enseña una: solo la verá quien sospechó.",
      urgent: true,
    };

  if (amOut)
    return {
      emoji: "💀",
      title: "Estás fuera de la investigación",
      detail:
        "Fallaste la acusación, pero sigues refutando cuando te toque. Mira y disfruta.",
      urgent: false,
    };

  if (!myTurn)
    return {
      emoji: "⏳",
      title: `Le toca a ${nameOf(state.turn)}`,
      detail:
        "Aprovecha para tachar en tu libreta: mira quién no pudo refutar en las sospechas de antes.",
      urgent: false,
    };

  if (state.stage === "tirar")
    return {
      emoji: "🎲",
      title: "Tira el dado",
      detail: "El número te dirá a cuántas habitaciones te puedes mover.",
      step: "Paso 1 de 3",
      urgent: true,
    };

  if (state.stage === "mover")
    return {
      emoji: "👣",
      title: `Sacaste ${state.die}: elige habitación`,
      detail: "Las iluminadas en amarillo están a tu alcance. Toca una para entrar.",
      step: "Paso 2 de 3",
      urgent: true,
    };

  if (state.stage === "sugerir")
    return {
      emoji: "❓",
      title: "Sospecha o pasa turno",
      detail:
        "Elige quién y con qué; la habitación es en la que estás. Quien tenga alguna de esas cartas tendrá que enseñártela.",
      step: "Paso 3 de 3",
      urgent: true,
    };

  return {
    emoji: "⏳",
    title: "Esperando a la mesa",
    detail: "Alguien está decidiendo qué carta enseñar.",
    urgent: false,
  };
}
