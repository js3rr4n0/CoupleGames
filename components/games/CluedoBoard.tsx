"use client";

import { Fragment, useState } from "react";
import {
  ALL_CARDS,
  CARD_BY_ID,
  PASSAGES,
  ROOMS,
  ROOM_GRID,
  SUSPECTS,
  WEAPONS,
} from "@/lib/games/cluedo-data";
import type { RoomView } from "@/lib/engine/view";
import { Button, Card } from "../ui";

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
  history: { by: string; suspect: string; weapon: string; room: string; refutedBy: string | null }[];
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
    options: string[];
  } | null;
  solution: { suspect: string; weapon: string; room: string } | null;
}

const MARKS = ["", "✓", "✗", "?"];

export default function CluedoBoard({
  view,
  play,
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
  const [suspect, setSuspect] = useState(SUSPECTS[0].id);
  const [weapon, setWeapon] = useState(WEAPONS[0].id);
  const [accusing, setAccusing] = useState(false);
  const [accRoom, setAccRoom] = useState(ROOMS[0].id);

  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? "?";
  const emojiOf = (id: string) => view.players.find((p) => p.id === id)?.emoji ?? "🕵️";
  const myRoom = me ? state.positions[me] : null;

  function cycle(cardId: string, playerId: string) {
    const key = `${cardId}|${playerId}`;
    const current = marks[key] ?? "";
    const next = MARKS[(MARKS.indexOf(current) + 1) % MARKS.length];
    onMark(key, next);
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-grape px-5 py-3 text-white">
          <p className="font-display text-xl">
            {state.winnerId
              ? `¡${nameOf(state.winnerId)} resuelve el caso!`
              : state.stage === "refutar" && state.suggestion?.askingId === me
                ? "Te toca refutar"
                : myTurn
                  ? state.stage === "tirar"
                    ? "Tira el dado"
                    : state.stage === "mover"
                      ? "Elige habitación"
                      : "Sospecha o pasa"
                  : `Turno de ${nameOf(state.turn)}`}
          </p>
          <div className="flex items-center gap-2">
            {state.die && (
              <span className="animate-roll grid h-9 w-9 place-items-center rounded-lg border-[3px] border-ink bg-white font-display text-lg text-ink">
                {state.die}
              </span>
            )}
            {myTurn && state.stage === "tirar" && (
              <Button className="px-3 py-1.5 text-sm" onClick={() => play({ type: "tirar" })}>
                🎲 Tirar
              </Button>
            )}
            {myTurn && state.stage === "sugerir" && (
              <Button
                variant="plain"
                className="px-3 py-1.5 text-sm"
                onClick={() => play({ type: "pasar" })}
              >
                Pasar turno
              </Button>
            )}
            <Button
              variant="danger"
              className="px-3 py-1.5 text-sm"
              disabled={!myTurn || state.stage === "refutar"}
              onClick={() => setAccusing(true)}
            >
              ⚖️ Acusar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid grid-cols-3 gap-2">
            {ROOM_GRID.flat().map((room, index) =>
              room ? (
                <button
                  key={room}
                  disabled={!(myTurn && state.stage === "mover" && state.reachable.includes(room))}
                  onClick={() => play({ type: "mover", room })}
                  className={`min-h-[5.5rem] rounded-xl border-[3px] border-ink p-2 text-left transition ${
                    myTurn && state.stage === "mover" && state.reachable.includes(room)
                      ? "bg-sun shadow-hard-sm hover:-translate-y-0.5"
                      : myRoom === room
                        ? "bg-paper-2"
                        : "bg-white"
                  }`}
                >
                  <p className="text-sm font-extrabold leading-tight">
                    {CARD_BY_ID.get(room)?.emoji} {CARD_BY_ID.get(room)?.name}
                  </p>
                  {PASSAGES[room] && (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                      pasadizo → {CARD_BY_ID.get(PASSAGES[room])?.name}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {state.order
                      .filter((id) => state.positions[id] === room)
                      .map((id) => (
                        <span
                          key={id}
                          title={nameOf(id)}
                          className={`grid h-6 w-6 place-items-center rounded-md border-2 border-ink bg-white text-xs ${
                            state.out.includes(id) ? "opacity-40" : ""
                          }`}
                        >
                          {emojiOf(id)}
                        </span>
                      ))}
                    {Object.entries(state.weaponRooms)
                      .filter(([, where]) => where === room)
                      .map(([id]) => (
                        <span key={id} title={CARD_BY_ID.get(id)?.name} className="text-sm">
                          {CARD_BY_ID.get(id)?.emoji}
                        </span>
                      ))}
                  </div>
                </button>
              ) : (
                <div
                  key={`hueco-${index}`}
                  className="min-h-[5.5rem] rounded-xl border-[3px] border-dashed border-ink/20 bg-paper-2/40"
                />
              ),
            )}
          </div>

          <div className="space-y-3">
            {myTurn && state.stage === "sugerir" && myRoom && (
              <div className="rounded-xl border-[3px] border-ink bg-paper p-3">
                <p className="font-display text-lg">
                  Sospecha en {CARD_BY_ID.get(myRoom)?.name}
                </p>
                <div className="mt-2 grid gap-2">
                  <select
                    value={suspect}
                    onChange={(e) => setSuspect(e.target.value)}
                    className="rounded-lg border-2 border-ink bg-white px-2 py-1.5 font-bold"
                  >
                    {SUSPECTS.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.emoji} {card.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={weapon}
                    onChange={(e) => setWeapon(e.target.value)}
                    className="rounded-lg border-2 border-ink bg-white px-2 py-1.5 font-bold"
                  >
                    {WEAPONS.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.emoji} {card.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="py-2 text-sm"
                    onClick={() => play({ type: "sugerir", suspect, weapon })}
                  >
                    ❓ Sospechar
                  </Button>
                </div>
              </div>
            )}

            {state.suggestion && state.suggestion.askingId === me && (
              <div className="animate-pop rounded-xl border-[3px] border-ink bg-sun p-3">
                <p className="font-display text-lg">
                  {state.suggestion.byName} sospecha. Enséñale una carta:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {state.suggestion.options.map((cardId) => (
                    <button
                      key={cardId}
                      onClick={() => play({ type: "refutar", cardId })}
                      className="press rounded-lg border-[3px] border-ink bg-white px-3 py-2 text-sm font-extrabold shadow-hard-sm"
                    >
                      {CARD_BY_ID.get(cardId)?.emoji} {CARD_BY_ID.get(cardId)?.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border-[3px] border-ink bg-white p-3">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
                🔒 Tus cartas
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {state.hand.map((cardId) => (
                  <span
                    key={cardId}
                    className="animate-flip rounded-lg border-2 border-ink bg-paper px-2 py-1 text-xs font-extrabold"
                  >
                    {CARD_BY_ID.get(cardId)?.emoji} {CARD_BY_ID.get(cardId)?.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border-[3px] border-ink bg-white p-3">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
                🔒 Lo que te han enseñado
              </p>
              {state.reveals.length === 0 ? (
                <p className="mt-2 text-sm font-semibold text-ink-soft">
                  Todavía nadie te ha refutado.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {state.reveals
                    .slice()
                    .reverse()
                    .map((reveal, index) => (
                      <li key={index} className="text-sm font-bold">
                        {nameOf(reveal.from)} → {CARD_BY_ID.get(reveal.card)?.emoji}{" "}
                        {CARD_BY_ID.get(reveal.card)?.name}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-sun px-4 py-2.5">
          <h3 className="font-display text-lg">🔒 Tu cuadrícula de descartes</h3>
          <span className="text-[11px] font-extrabold uppercase tracking-widest">
            toca para marcar ✓ ✗ ?
          </span>
        </div>
        <div className="scroll-soft max-h-96 overflow-auto p-3">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white p-1 text-left text-xs font-extrabold uppercase text-ink-soft">
                  Carta
                </th>
                {view.players.map((player) => (
                  <th key={player.id} className="p-1 text-center text-xs font-extrabold">
                    {player.emoji}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["sospechoso", "arma", "habitacion"] as const).map((kind) => (
                <Fragment key={kind}>
                  <tr>
                    <td
                      colSpan={view.players.length + 1}
                      className="bg-paper-2 px-1 py-0.5 text-[11px] font-extrabold uppercase tracking-widest"
                    >
                      {kind === "sospechoso" ? "Sospechosos" : kind === "arma" ? "Armas" : "Habitaciones"}
                    </td>
                  </tr>
                  {ALL_CARDS.filter((card) => card.kind === kind).map((card) => (
                    <tr key={card.id} className="border-t-2 border-ink/10">
                      <td className="sticky left-0 whitespace-nowrap bg-white p-1 font-bold">
                        {card.emoji} {card.name}
                        {state.hand.includes(card.id) && (
                          <span className="ml-1 rounded border border-ink bg-sun px-1 text-[10px]">
                            tuya
                          </span>
                        )}
                      </td>
                      {view.players.map((player) => {
                        const key = `${card.id}|${player.id}`;
                        const mark = marks[key] ?? "";
                        return (
                          <td key={player.id} className="p-0.5 text-center">
                            <button
                              onClick={() => cycle(card.id, player.id)}
                              className={`h-7 w-7 rounded-md border-2 border-ink font-extrabold ${
                                mark === "✓"
                                  ? "bg-grass text-white"
                                  : mark === "✗"
                                    ? "bg-tomato text-white"
                                    : mark === "?"
                                      ? "bg-sun"
                                      : "bg-white"
                              }`}
                            >
                              {mark}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {accusing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4">
          <Card className="animate-pop w-full max-w-md p-6">
            <h3 className="font-display text-2xl">Acusación final</h3>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              Si aciertas las tres, ganas. Si fallas, quedas fuera (pero sigues refutando).
            </p>
            <div className="mt-4 grid gap-2">
              <select
                value={suspect}
                onChange={(e) => setSuspect(e.target.value)}
                className="rounded-lg border-2 border-ink bg-paper px-2 py-2 font-bold"
              >
                {SUSPECTS.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.emoji} {card.name}
                  </option>
                ))}
              </select>
              <select
                value={weapon}
                onChange={(e) => setWeapon(e.target.value)}
                className="rounded-lg border-2 border-ink bg-paper px-2 py-2 font-bold"
              >
                {WEAPONS.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.emoji} {card.name}
                  </option>
                ))}
              </select>
              <select
                value={accRoom}
                onChange={(e) => setAccRoom(e.target.value)}
                className="rounded-lg border-2 border-ink bg-paper px-2 py-2 font-bold"
              >
                {ROOMS.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.emoji} {card.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  play({ type: "acusar", suspect, weapon, room: accRoom });
                  setAccusing(false);
                }}
              >
                Acusar
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
