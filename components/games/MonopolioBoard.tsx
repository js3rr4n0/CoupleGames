"use client";

import { useState } from "react";
import { BOARD, GROUP_COLORS, type Space } from "@/lib/games/monopolio-board";
import type { RoomView } from "@/lib/engine/view";
import { Button, Card } from "../ui";

interface MonoViewState {
  order: string[];
  cash: Record<string, number>;
  positions: Record<string, number>;
  jail: Record<string, number>;
  jailCards: Record<string, number>;
  props: Record<string, { owner: string | null; houses: number; mortgaged: boolean }>;
  turn: string;
  stage: "tirar" | "comprar" | "gestion" | "deuda" | "fin";
  dice: [number, number] | null;
  lastCard: { deck: "suerte" | "caja"; text: string } | null;
  debt: { from: string; to: string | null; amount: number } | null;
  trade: {
    from: string;
    to: string;
    give: number[];
    get: number[];
    giveCash: number;
    getCash: number;
  } | null;
  out: string[];
  winnerId: string | null;
  moved: { by: string; from: number; to: number; at: number } | null;
  you: {
    id: string;
    cash: number;
    properties: number[];
    jail: number;
    jailCards: number;
    worth: number;
  } | null;
  table: {
    id: string;
    name: string;
    cash: number;
    worth: number;
    properties: number[];
    jail: number;
    out: boolean;
  }[];
}

/** Casilla → posición en la cuadrícula 11×11, empezando por la Salida abajo a la derecha. */
function gridPos(i: number): { row: number; col: number } {
  if (i === 0) return { row: 11, col: 11 };
  if (i < 10) return { row: 11, col: 11 - i };
  if (i === 10) return { row: 11, col: 1 };
  if (i < 20) return { row: 11 - (i - 10), col: 1 };
  if (i === 20) return { row: 1, col: 1 };
  if (i < 30) return { row: 1, col: i - 19 };
  if (i === 30) return { row: 1, col: 11 };
  return { row: i - 29, col: 11 };
}

function kindEmoji(space: Space): string {
  switch (space.kind) {
    case "salida": return "🏁";
    case "carcel": return "🔒";
    case "parking": return "🅿️";
    case "ir-carcel": return "🚔";
    case "suerte": return "🍀";
    case "caja": return "📦";
    case "impuesto": return "🧾";
    case "estacion": return "🚂";
    case "servicio": return "💡";
    default: return "";
  }
}

export default function MonopolioBoard({
  view,
  play,
}: {
  view: RoomView;
  play: (move: Record<string, unknown>) => void;
}) {
  const state = view.state as MonoViewState;
  const me = view.you?.id ?? null;
  const myTurn = state.turn === me && !state.winnerId;
  const [detail, setDetail] = useState<number | null>(null);
  const [tradeWith, setTradeWith] = useState<string | null>(null);
  const [give, setGive] = useState<number[]>([]);
  const [get, setGet] = useState<number[]>([]);
  const [cashOffer, setCashOffer] = useState(0);
  const [cashAsk, setCashAsk] = useState(0);

  const emojiOf = (id: string) => view.players.find((p) => p.id === id)?.emoji ?? "🎩";
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? "?";
  const mine = state.you;
  const currentSpace = mine ? BOARD[state.positions[mine.id]] : null;

  function toggle(list: number[], set: (v: number[]) => void, index: number) {
    set(list.includes(index) ? list.filter((i) => i !== index) : [...list, index]);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden p-2 sm:p-3">
          <div
            className="grid aspect-square w-full gap-[3px]"
            style={{
              gridTemplateColumns: "repeat(11, minmax(0, 1fr))",
              gridTemplateRows: "repeat(11, minmax(0, 1fr))",
            }}
          >
            {BOARD.map((space) => {
              const { row, col } = gridPos(space.i);
              const prop = state.props[String(space.i)];
              const owner = prop?.owner;
              const here = state.order.filter((id) => state.positions[id] === space.i);
              return (
                <button
                  key={space.i}
                  onClick={() => setDetail(space.i)}
                  style={{ gridRow: row, gridColumn: col }}
                  className={`relative flex aspect-square flex-col justify-between overflow-hidden rounded-[5px] border-2 border-ink p-[2px] text-left ${
                    owner ? "bg-paper-2" : "bg-white"
                  }`}
                >
                  {space.group && (
                    <span
                      className="block h-2 w-full rounded-[2px] border border-ink"
                      style={{ background: GROUP_COLORS[space.group] }}
                    />
                  )}
                  <span className="px-[2px] text-[6px] font-extrabold leading-[1.05] sm:text-[8px]">
                    {kindEmoji(space)} {space.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-[1px] px-[2px] pb-[1px]">
                    {prop?.houses ? (
                      <span className="text-[7px]">
                        {prop.houses === 5 ? "🏨" : "🏠".repeat(prop.houses)}
                      </span>
                    ) : null}
                    {prop?.mortgaged && <span className="text-[7px]">🏚️</span>}
                    {owner && (
                      <span
                        className="h-1.5 w-1.5 rounded-full border border-ink"
                        style={{ background: "var(--color-ink)" }}
                        title={nameOf(owner)}
                      />
                    )}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 flex justify-center gap-[1px] pb-[1px]">
                    {here.map((id) => (
                      <span
                        key={id}
                        title={nameOf(id)}
                        className={`grid h-4 w-4 place-items-center rounded-full border-2 border-ink bg-white text-[9px] leading-none sm:h-5 sm:w-5 sm:text-xs ${
                          state.moved?.by === id && state.moved.to === space.i
                            ? "animate-pop"
                            : ""
                        }`}
                      >
                        {emojiOf(id)}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}

            <div
              className="grid place-items-center rounded-xl border-[3px] border-ink bg-paper p-2 text-center"
              style={{ gridArea: "2 / 2 / 11 / 11" }}
            >
              <div>
                <p className="font-display text-2xl sm:text-4xl">MONOPOLIO</p>
                {state.dice && (
                  <p className="mt-2 flex justify-center gap-2">
                    {state.dice.map((die, index) => (
                      <span
                        key={index}
                        className="animate-roll grid h-10 w-10 place-items-center rounded-lg border-[3px] border-ink bg-white font-display text-xl shadow-hard-sm"
                      >
                        {die}
                      </span>
                    ))}
                  </p>
                )}
                {state.lastCard && (
                  <p
                    className={`animate-pop mx-auto mt-3 max-w-[16rem] rounded-xl border-[3px] border-ink p-2 text-xs font-bold ${
                      state.lastCard.deck === "suerte" ? "bg-sun" : "bg-sky text-white"
                    }`}
                  >
                    {state.lastCard.deck === "suerte" ? "🍀 Suerte" : "📦 Caja"}:{" "}
                    {state.lastCard.text}
                  </p>
                )}
                <p className="mt-3 text-sm font-extrabold">
                  {state.winnerId
                    ? `🏆 ${nameOf(state.winnerId)}`
                    : `Turno de ${nameOf(state.turn)}`}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="border-b-[3px] border-ink bg-grass px-4 py-2.5 text-white">
              <h3 className="font-display text-lg">Tu turno</h3>
            </div>
            <div className="space-y-3 p-4">
              {mine && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border-2 border-ink bg-sun px-2 py-1 font-extrabold">
                    {mine.cash}€
                  </span>
                  <span className="rounded-lg border-2 border-ink bg-white px-2 py-1 text-sm font-bold">
                    patrimonio {mine.worth}€
                  </span>
                  {mine.jail >= 0 && (
                    <span className="rounded-lg border-2 border-ink bg-tomato px-2 py-1 text-sm font-bold text-white">
                      🔒 en la cárcel
                    </span>
                  )}
                  {mine.jailCards > 0 && (
                    <span className="rounded-lg border-2 border-ink bg-white px-2 py-1 text-sm font-bold">
                      🎟️ {mine.jailCards}
                    </span>
                  )}
                </div>
              )}

              {currentSpace && (
                <p className="text-sm font-bold text-ink-soft">
                  Estás en {kindEmoji(currentSpace)} {currentSpace.name}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {myTurn && state.stage === "tirar" && (
                  <Button onClick={() => play({ type: "tirar" })}>🎲 Tirar</Button>
                )}
                {myTurn && state.stage === "comprar" && currentSpace && (
                  <>
                    <Button onClick={() => play({ type: "comprar" })}>
                      🏠 Comprar por {currentSpace.price}€
                    </Button>
                    <Button variant="plain" onClick={() => play({ type: "no-comprar" })}>
                      Paso
                    </Button>
                  </>
                )}
                {myTurn && mine && mine.jail >= 0 && (
                  <Button variant="plain" onClick={() => play({ type: "fianza" })}>
                    {mine.jailCards > 0 ? "🎟️ Usar carta" : "💵 Pagar fianza (50€)"}
                  </Button>
                )}
                {myTurn && state.stage === "deuda" && state.debt && (
                  <>
                    <Button onClick={() => play({ type: "pagar-deuda" })}>
                      Pagar {state.debt.amount}€
                    </Button>
                    <Button variant="danger" onClick={() => play({ type: "quiebra" })}>
                      Declararme en quiebra
                    </Button>
                  </>
                )}
                {myTurn && (state.stage === "gestion" || state.stage === "tirar") && (
                  <Button variant="plain" onClick={() => play({ type: "terminar" })}>
                    Terminar turno ▸
                  </Button>
                )}
              </div>

              {state.debt && state.debt.from === me && (
                <p className="rounded-xl border-[3px] border-ink bg-tomato p-2 text-sm font-bold text-white">
                  Debes {state.debt.amount}€
                  {state.debt.to ? ` a ${nameOf(state.debt.to)}` : " al banco"}. Hipoteca o
                  vende casas hasta reunirlos.
                </p>
              )}

              {state.trade && (
                <div className="rounded-xl border-[3px] border-ink bg-sun p-3 text-sm font-bold">
                  <p>
                    {nameOf(state.trade.from)} ofrece:{" "}
                    {state.trade.give.map((i) => BOARD[i].name).join(", ") || "nada"}
                    {state.trade.giveCash ? ` + ${state.trade.giveCash}€` : ""} a cambio de{" "}
                    {state.trade.get.map((i) => BOARD[i].name).join(", ") || "nada"}
                    {state.trade.getCash ? ` + ${state.trade.getCash}€` : ""}
                  </p>
                  {state.trade.to === me && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="success"
                        className="px-3 py-1.5 text-sm"
                        onClick={() => play({ type: "responder-trato", acepta: true })}
                      >
                        Aceptar
                      </Button>
                      <Button
                        variant="danger"
                        className="px-3 py-1.5 text-sm"
                        onClick={() => play({ type: "responder-trato", acepta: false })}
                      >
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b-[3px] border-ink bg-paper-2 px-4 py-2.5">
              <h3 className="font-display text-lg">Tus propiedades</h3>
              <Button
                variant="plain"
                className="px-2 py-1 text-xs"
                onClick={() => setTradeWith(state.order.find((id) => id !== me) ?? null)}
              >
                🤝 Proponer trato
              </Button>
            </div>
            <div className="scroll-soft max-h-64 space-y-1.5 overflow-y-auto p-3">
              {(mine?.properties ?? []).map((index) => {
                const space = BOARD[index];
                const prop = state.props[String(index)];
                return (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-ink bg-paper px-2 py-1.5"
                  >
                    {space.group && (
                      <span
                        className="h-4 w-4 rounded border-2 border-ink"
                        style={{ background: GROUP_COLORS[space.group] }}
                      />
                    )}
                    <span className="flex-1 text-sm font-extrabold">{space.name}</span>
                    {prop.houses > 0 && (
                      <span className="text-xs">
                        {prop.houses === 5 ? "🏨" : "🏠".repeat(prop.houses)}
                      </span>
                    )}
                    {prop.mortgaged && <span className="text-xs">🏚️</span>}
                    {myTurn && space.houseCost && (
                      <button
                        onClick={() => play({ type: "construir", property: index })}
                        className="rounded border-2 border-ink bg-grass px-1.5 text-xs font-extrabold text-white"
                      >
                        +🏠
                      </button>
                    )}
                    {myTurn && space.houseCost && prop.houses > 0 && (
                      <button
                        onClick={() => play({ type: "vender-casa", property: index })}
                        className="rounded border-2 border-ink bg-white px-1.5 text-xs font-extrabold"
                      >
                        −🏠
                      </button>
                    )}
                    {myTurn && (
                      <button
                        onClick={() =>
                          play({
                            type: prop.mortgaged ? "deshipotecar" : "hipotecar",
                            property: index,
                          })
                        }
                        className="rounded border-2 border-ink bg-sun px-1.5 text-xs font-extrabold"
                      >
                        {prop.mortgaged ? "recuperar" : "hipotecar"}
                      </button>
                    )}
                  </div>
                );
              })}
              {!mine?.properties.length && (
                <p className="p-2 text-sm font-semibold text-ink-soft">
                  Todavía no tienes nada. Cae en una calle libre y cómprala.
                </p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b-[3px] border-ink bg-ink px-4 py-2.5 text-white">
              <h3 className="font-display text-lg">La mesa</h3>
            </div>
            <ul className="space-y-1.5 p-3">
              {state.table.map((player) => (
                <li
                  key={player.id}
                  className={`flex items-center gap-2 rounded-lg border-2 border-ink px-2 py-1.5 ${
                    player.out ? "bg-white opacity-50" : state.turn === player.id ? "bg-sun" : "bg-paper"
                  }`}
                >
                  <span>{emojiOf(player.id)}</span>
                  <span className="flex-1 text-sm font-extrabold">{player.name}</span>
                  {player.jail >= 0 && <span className="text-xs">🔒</span>}
                  <span className="text-sm font-bold tabular-nums">{player.cash}€</span>
                  <span className="text-[11px] font-bold text-ink-soft">
                    {player.properties.length} props
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {detail !== null && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
          onClick={() => setDetail(null)}
        >
          <Card className="animate-pop w-full max-w-sm overflow-hidden p-0">
            {BOARD[detail].group && (
              <div
                className="h-10 border-b-[3px] border-ink"
                style={{ background: GROUP_COLORS[BOARD[detail].group!] }}
              />
            )}
            <div className="p-5">
              <h3 className="font-display text-2xl">{BOARD[detail].name}</h3>
              {BOARD[detail].price ? (
                <>
                  <p className="mt-1 font-bold">Precio: {BOARD[detail].price}€</p>
                  {BOARD[detail].rents && (
                    <ul className="mt-3 space-y-1 text-sm font-semibold">
                      {["Sin casas", "1 casa", "2 casas", "3 casas", "4 casas", "Hotel"].map(
                        (line, index) => (
                          <li key={line} className="flex justify-between">
                            <span>{line}</span>
                            <span className="font-extrabold">
                              {BOARD[detail].rents![index]}€
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                  {BOARD[detail].houseCost && (
                    <p className="mt-3 text-sm font-bold text-ink-soft">
                      Cada casa cuesta {BOARD[detail].houseCost}€
                    </p>
                  )}
                  <p className="mt-2 text-sm font-bold">
                    Dueño:{" "}
                    {state.props[String(detail)]?.owner
                      ? nameOf(state.props[String(detail)].owner!)
                      : "nadie todavía"}
                  </p>
                </>
              ) : (
                <p className="mt-2 font-semibold text-ink-soft">
                  {BOARD[detail].kind === "impuesto"
                    ? `Se pagan ${BOARD[detail].tax}€`
                    : "Casilla especial"}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {tradeWith && mine && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4">
          <Card className="animate-pop max-h-[85vh] w-full max-w-lg overflow-y-auto p-5">
            <h3 className="font-display text-2xl">Proponer un trato</h3>
            <label className="mt-3 block text-sm font-extrabold uppercase tracking-widest text-ink-soft">
              Con quién
              <select
                value={tradeWith}
                onChange={(e) => setTradeWith(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-ink bg-paper px-2 py-2 font-bold normal-case tracking-normal"
              >
                {state.table
                  .filter((p) => p.id !== me && !p.out)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>

            <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-ink-soft">
              Tú das
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {mine.properties.map((index) => (
                <button
                  key={index}
                  onClick={() => toggle(give, setGive, index)}
                  className={`rounded-lg border-2 border-ink px-2 py-1 text-xs font-extrabold ${
                    give.includes(index) ? "bg-grass text-white" : "bg-white"
                  }`}
                >
                  {BOARD[index].name}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              value={cashOffer}
              onChange={(e) => setCashOffer(Number(e.target.value))}
              className="mt-2 w-32 rounded-lg border-2 border-ink bg-paper px-2 py-1 font-bold"
              placeholder="€"
            />

            <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-ink-soft">
              Tú pides
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(state.table.find((p) => p.id === tradeWith)?.properties ?? []).map((index) => (
                <button
                  key={index}
                  onClick={() => toggle(get, setGet, index)}
                  className={`rounded-lg border-2 border-ink px-2 py-1 text-xs font-extrabold ${
                    get.includes(index) ? "bg-sky text-white" : "bg-white"
                  }`}
                >
                  {BOARD[index].name}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              value={cashAsk}
              onChange={(e) => setCashAsk(Number(e.target.value))}
              className="mt-2 w-32 rounded-lg border-2 border-ink bg-paper px-2 py-1 font-bold"
              placeholder="€"
            />

            <div className="mt-5 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  play({
                    type: "trato",
                    to: tradeWith,
                    give,
                    get,
                    giveCash: cashOffer,
                    getCash: cashAsk,
                  });
                  setTradeWith(null);
                  setGive([]);
                  setGet([]);
                  setCashOffer(0);
                  setCashAsk(0);
                }}
              >
                Enviar propuesta
              </Button>
              <Button variant="quiet" onClick={() => setTradeWith(null)}>
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
