"use client";

import { useEffect, useState } from "react";
import { BOARD, GROUP_COLORS, type Space } from "@/lib/games/monopolio-board";
import type { RoomView } from "@/lib/engine/view";
import { play as sfx, useSfxOn } from "@/lib/sfx";
import { Button, Card } from "../ui";
import { Die, TOKEN_COLORS, Token } from "./monopolio/pieces";

interface MoneyFlow {
  id: string;
  from: string | null;
  to: string | null;
  amount: number;
  reason: string;
  at: number;
}

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
  diceAt: number | null;
  doubles: number;
  lastCard: { deck: "suerte" | "caja"; text: string; who: string; at: number } | null;
  debt: { from: string; to: string | null; amount: number } | null;
  flows: MoneyFlow[];
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

/** De qué lado del tablero está la casilla, para pintar la banda de color hacia dentro. */
function sideOf(i: number): "abajo" | "izquierda" | "arriba" | "derecha" {
  if (i < 10) return "abajo";
  if (i < 20) return "izquierda";
  if (i < 30) return "arriba";
  return "derecha";
}

const BAND: Record<string, string> = {
  abajo: "left-0 right-0 top-0 h-[20%] border-b-2",
  izquierda: "top-0 bottom-0 right-0 w-[20%] border-l-2",
  arriba: "left-0 right-0 bottom-0 h-[20%] border-t-2",
  derecha: "top-0 bottom-0 left-0 w-[20%] border-r-2",
};

function kindEmoji(space: Space): string {
  switch (space.kind) {
    case "salida":
      return "🏁";
    case "carcel":
      return "🔒";
    case "parking":
      return "🅿️";
    case "ir-carcel":
      return "🚔";
    case "suerte":
      return "🍀";
    case "caja":
      return "📦";
    case "impuesto":
      return "🧾";
    case "estacion":
      return "🚂";
    case "servicio":
      return "💡";
    default:
      return "";
  }
}

const STEP_MS = 160;

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
  const mine = state.you;

  const [detail, setDetail] = useState<number | null>(null);
  const [tradeWith, setTradeWith] = useState<string | null>(null);
  const [give, setGive] = useState<number[]>([]);
  const [get, setGet] = useState<number[]>([]);
  const [cashOffer, setCashOffer] = useState(0);
  const [cashAsk, setCashAsk] = useState(0);
  const [cardOpen, setCardOpen] = useState(true);

  const emojiOf = (id: string) => view.players.find((p) => p.id === id)?.emoji ?? "🎩";
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? "?";
  const colorOf = (id: string) =>
    TOKEN_COLORS[Math.max(0, state.order.indexOf(id)) % TOKEN_COLORS.length];

  /* ---------------- la ficha recorre el tablero casilla a casilla ---------------- */
  const moveKey = state.moved ? `${state.moved.by}-${state.moved.at}` : "";
  const [walk, setWalk] = useState<{ id: string; pos: number } | null>(null);
  const [seenMove, setSeenMove] = useState(moveKey);
  if (seenMove !== moveKey) {
    setSeenMove(moveKey);
    setWalk(
      state.moved && state.moved.from !== state.moved.to
        ? { id: state.moved.by, pos: state.moved.from }
        : null,
    );
  }

  useEffect(() => {
    const moved = state.moved;
    if (!moved || moved.from === moved.to) return;
    let step = moved.from;
    const timer = setInterval(() => {
      step = (step + 1) % 40;
      setWalk({ id: moved.by, pos: step });
      sfx("ficha");
      if (step === moved.to) {
        clearInterval(timer);
        window.setTimeout(() => setWalk(null), STEP_MS);
      }
    }, STEP_MS);
    return () => clearInterval(timer);
    // Solo al cambiar de tirada: la animación se reproduce una vez por movimiento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveKey]);

  const posOf = (id: string) => (walk && walk.id === id ? walk.pos : state.positions[id]);

  /* ---------------- dinero que cambia de manos ---------------- */
  // Cada cobro o pago nuevo sale volando una sola vez y se retira solo.
  const flows = state.flows ?? [];
  const [seenFlows, setSeenFlows] = useState<string[]>(() =>
    flows.map((flow) => flow.id),
  );
  const [fresh, setFresh] = useState<MoneyFlow[]>([]);
  const arrivals = flows.filter((flow) => !seenFlows.includes(flow.id));
  if (arrivals.length) {
    setSeenFlows([...seenFlows, ...arrivals.map((flow) => flow.id)].slice(-24));
    setFresh([...fresh, ...arrivals]);
  }
  useEffect(() => {
    if (!fresh.length) return;
    const timer = window.setTimeout(() => setFresh((list) => list.slice(1)), 4200);
    return () => window.clearTimeout(timer);
  }, [fresh]);

  const lastFlow = flows[flows.length - 1];
  useSfxOn(lastFlow?.id, lastFlow ? (lastFlow.from === me ? "pago" : "moneda") : null);
  useSfxOn(state.dice ? `${state.diceAt}` : null, state.dice ? "dado" : null);
  useSfxOn(state.lastCard?.at, state.lastCard ? "sobre" : null);
  useSfxOn(state.winnerId, state.winnerId ? "victoria" : null);
  useSfxOn(myTurn ? "si" : "no", myTurn ? "turno" : null);

  const cardKey = state.lastCard?.at ?? 0;
  const [seenCard, setSeenCard] = useState(cardKey);
  if (seenCard !== cardKey) {
    setSeenCard(cardKey);
    setCardOpen(true);
  }
  // La carta de Suerte se queda un rato en pantalla y luego se aparta sola.
  useEffect(() => {
    if (!cardKey) return;
    const timer = window.setTimeout(() => setCardOpen(false), 9000);
    return () => window.clearTimeout(timer);
  }, [cardKey]);
  const showCard = Boolean(state.lastCard) && cardOpen;

  const currentSpace = mine ? BOARD[state.positions[mine.id]] : null;
  const iOwe = state.debt && state.debt.from === me ? state.debt : null;

  function toggle(list: number[], set: (v: number[]) => void, index: number) {
    set(list.includes(index) ? list.filter((i) => i !== index) : [...list, index]);
  }

  return (
    <div className="space-y-4">
      {/* ----------------------- la barra de turno y los dados ----------------------- */}
      <Card className="overflow-hidden p-0" tone={myTurn ? "sun" : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <Token
              emoji={emojiOf(state.turn)}
              color={colorOf(state.turn)}
              size={2.6}
              ring
            />
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink-soft">
                {state.winnerId ? "Fin de la partida" : myTurn ? "Te toca" : "Turno de"}
              </p>
              <p className="font-display text-2xl leading-none">
                {state.winnerId ? `🏆 ${nameOf(state.winnerId)}` : nameOf(state.turn)}
              </p>
              {currentSpace && (
                <p className="text-xs font-bold text-ink-soft">
                  {myTurn ? "Estás en" : "Tú estás en"} {kindEmoji(currentSpace)}{" "}
                  {currentSpace.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {state.dice && (
              <div className="flex items-center gap-2">
                <Die value={state.dice[0]} spin={state.diceAt ?? 0} />
                <Die value={state.dice[1]} spin={state.diceAt ?? 0} delay={110} />
                <span className="rounded-lg border-2 border-ink bg-white px-2 py-1 font-display text-xl">
                  {state.dice[0] + state.dice[1]}
                </span>
                {state.doubles > 0 && !state.winnerId && (
                  <span className="animate-wiggle rounded-lg border-2 border-ink bg-tomato px-2 py-1 text-xs font-extrabold text-white">
                    ¡dobles! repites
                  </span>
                )}
              </div>
            )}
            {myTurn && state.stage === "tirar" && (
              <Button
                className="px-6 py-4 text-xl"
                onClick={() => play({ type: "tirar" })}
              >
                🎲 Tirar
              </Button>
            )}
            {myTurn && (state.stage === "gestion" || state.stage === "tirar") && (
              <Button
                variant="plain"
                className="px-4 py-3"
                onClick={() => {
                  sfx("toc");
                  play({ type: "terminar" });
                }}
              >
                Terminar turno ▸
              </Button>
            )}
          </div>
        </div>

        {/* La decisión del momento, bien grande y sin buscarla por la pantalla. */}
        {myTurn && state.stage === "comprar" && currentSpace && (
          <div className="animate-rise flex flex-wrap items-center gap-3 border-t-[3px] border-ink bg-white p-4">
            <span className="font-display text-lg">
              {currentSpace.name} está libre por {currentSpace.price}€
            </span>
            <Button
              variant="success"
              onClick={() => {
                sfx("compra");
                play({ type: "comprar" });
              }}
            >
              🏠 Comprar por {currentSpace.price}€
            </Button>
            <Button variant="plain" onClick={() => play({ type: "no-comprar" })}>
              Paso
            </Button>
          </div>
        )}

        {iOwe && (
          <div className="animate-shake flex flex-wrap items-center gap-3 border-t-[3px] border-ink bg-tomato p-4 text-white">
            <span className="text-3xl">💸</span>
            <div className="flex-1">
              <p className="font-display text-xl leading-tight">
                Tienes que pagar {iOwe.amount}€
                {iOwe.to ? ` a ${nameOf(iOwe.to)}` : " al banco"}
              </p>
              <p className="text-sm font-semibold">
                Si no te llega, hipoteca o vende casas ahí abajo hasta reunirlo.
              </p>
            </div>
            <Button
              variant="plain"
              onClick={() => {
                sfx("pago");
                play({ type: "pagar-deuda" });
              }}
            >
              Pagar {iOwe.amount}€
            </Button>
            <Button variant="danger" onClick={() => play({ type: "quiebra" })}>
              Declararme en quiebra
            </Button>
          </div>
        )}
      </Card>

      {/* ----------------------------- EL TABLERO ----------------------------- */}
      <Card className="relative overflow-hidden p-2 sm:p-4">
        {/* En el móvil el tablero no se encoge hasta ser ilegible: se desliza. */}
        <div className="scroll-soft -mx-1 w-[calc(100%+0.5rem)] max-w-[calc(100%+0.5rem)] overflow-x-auto px-1 pb-2">
          <div
            // Lo más grande que quepa en la pantalla sin tener que perseguirlo con el ratón.
            className="relative mx-auto grid aspect-square w-full min-w-[36rem] max-w-[min(60rem,70vh)] gap-[3px]"
            style={{
              gridTemplateColumns: "repeat(11, minmax(0, 1fr))",
              gridTemplateRows: "repeat(11, minmax(0, 1fr))",
            }}
          >
            {BOARD.map((space) => {
              const { row, col } = gridPos(space.i);
              const prop = state.props[String(space.i)];
              const owner = prop?.owner ?? null;
              const here = state.order.filter((id) => posOf(id) === space.i);
              const side = sideOf(space.i);
              const corner = space.i % 10 === 0;
              return (
                <button
                  key={space.i}
                  onClick={() => {
                    sfx("toc");
                    setDetail(space.i);
                  }}
                  style={{ gridRow: row, gridColumn: col }}
                  title={space.price ? `${space.name} · ${space.price}€` : space.name}
                  className={`group relative flex aspect-square flex-col overflow-hidden rounded-md border-2 border-ink text-left transition hover:z-10 hover:-translate-y-0.5 hover:shadow-hard-sm ${
                    owner ? "bg-paper-2" : corner ? "bg-paper" : "bg-white"
                  }`}
                >
                  {space.group && (
                    <span
                      className={`absolute border-ink ${BAND[side]}`}
                      style={{ background: GROUP_COLORS[space.group] }}
                    />
                  )}
                  {owner && (
                    <span
                      className="absolute inset-0 rounded-md"
                      style={{ boxShadow: `inset 0 0 0 3px ${colorOf(owner)}` }}
                    />
                  )}
                  <span
                    className={`relative z-[1] px-1 text-[8px] font-extrabold leading-[1.15] sm:text-[10px] ${
                      side === "abajo"
                        ? "mt-[22%]"
                        : side === "arriba"
                          ? "mb-[22%] mt-0.5"
                          : "mt-0.5"
                    } ${side === "izquierda" ? "pr-[22%]" : side === "derecha" ? "pl-[22%]" : ""}`}
                  >
                    {corner || !space.price ? (
                      <span className="block text-center text-base sm:text-xl">
                        {kindEmoji(space)}
                      </span>
                    ) : null}
                    {space.name}
                  </span>
                  <span
                    className={`relative z-[1] mt-auto flex items-end justify-between gap-0.5 px-1 pb-0.5 ${
                      side === "izquierda"
                        ? "pr-[22%]"
                        : side === "derecha"
                          ? "pl-[22%]"
                          : side === "arriba"
                            ? "mb-[20%]"
                            : ""
                    }`}
                  >
                    <span className="text-[7px] font-extrabold text-ink-soft sm:text-[9px]">
                      {space.price ? `${space.price}€` : space.tax ? `${space.tax}€` : ""}
                    </span>
                    <span className="flex items-center gap-[1px]">
                      {prop?.houses ? (
                        <span className="text-[8px] sm:text-[11px]">
                          {prop.houses === 5 ? "🏨" : "🏠".repeat(prop.houses)}
                        </span>
                      ) : null}
                      {prop?.mortgaged && (
                        <span className="text-[8px] sm:text-[11px]">🏚️</span>
                      )}
                    </span>
                  </span>

                  <span className="absolute inset-x-0 bottom-0 z-[2] flex flex-wrap justify-center gap-[1px] pb-[2px]">
                    {here.map((id) => (
                      <Token
                        key={id}
                        emoji={emojiOf(id)}
                        color={colorOf(id)}
                        size={1.4}
                        hop={walk?.id === id}
                        ring={state.turn === id}
                        title={nameOf(id)}
                      />
                    ))}
                  </span>
                </button>
              );
            })}

            {/* El centro: logo, dados y la carta que acaba de salir. */}
            <div
              className="relative grid place-items-center rounded-2xl border-[3px] border-ink bg-paper p-3 text-center"
              style={{ gridArea: "2 / 2 / 11 / 11" }}
            >
              <div className="w-full">
                <p className="font-display text-3xl sm:text-5xl">MONOPOLIO</p>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-ink-soft">
                  mesa de {state.order.length}
                </p>

                {state.dice && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <Die value={state.dice[0]} spin={state.diceAt ?? 0} size={4.5} />
                    <Die
                      value={state.dice[1]}
                      spin={state.diceAt ?? 0}
                      size={4.5}
                      delay={110}
                    />
                    <span className="rounded-xl border-[3px] border-ink bg-sun px-3 py-2 font-display text-3xl shadow-hard-sm">
                      {state.dice[0] + state.dice[1]}
                    </span>
                  </div>
                )}

                {showCard && state.lastCard && (
                  <div
                    key={state.lastCard.at}
                    className={`animate-slam mx-auto mt-4 max-w-sm rounded-2xl border-[3px] border-ink p-4 shadow-hard ${
                      state.lastCard.deck === "suerte" ? "bg-sun" : "bg-sky text-white"
                    }`}
                  >
                    <p className="text-[11px] font-extrabold uppercase tracking-widest">
                      {state.lastCard.deck === "suerte"
                        ? "🍀 Suerte"
                        : "📦 Caja de comunidad"}{" "}
                      · {nameOf(state.lastCard.who)}
                    </p>
                    <p className="mt-1 font-display text-lg leading-tight">
                      {state.lastCard.text}
                    </p>
                    <button
                      onClick={() => setCardOpen(false)}
                      className="mt-2 rounded-lg border-2 border-ink bg-white px-2 py-0.5 text-xs font-extrabold text-ink"
                    >
                      vale
                    </button>
                  </div>
                )}

                {/* Los billetes que vuelan cuando alguien cobra o paga. */}
                <div className="pointer-events-none mt-3 flex flex-col items-center gap-1">
                  {fresh.map((flow) => {
                    const mineIn = flow.to === me;
                    const mineOut = flow.from === me;
                    return (
                      <span
                        key={flow.id}
                        className={`animate-cash rounded-xl border-[3px] border-ink px-3 py-1 text-sm font-extrabold shadow-hard-sm ${
                          mineIn
                            ? "bg-grass text-white"
                            : mineOut
                              ? "bg-tomato text-white"
                              : "bg-white"
                        }`}
                      >
                        {flow.from ? nameOf(flow.from) : "La banca"} →{" "}
                        {flow.to ? nameOf(flow.to) : "la banca"} ·{" "}
                        {mineOut ? "−" : mineIn ? "+" : ""}
                        {flow.amount}€
                        <span className="ml-1 font-semibold opacity-80">
                          {flow.reason}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="px-1 text-[11px] font-bold text-ink-soft sm:hidden">
          Desliza el tablero de lado para verlo entero · toca una casilla para ver su
          ficha
        </p>
      </Card>

      {/* ----------------------------- PANELES ----------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0">
          <div className="border-b-[3px] border-ink bg-grass px-4 py-2.5 text-white">
            <h3 className="font-display text-lg">Tu cartera</h3>
          </div>
          <div className="space-y-3 p-4">
            {mine && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border-[3px] border-ink bg-sun px-3 py-1.5 font-display text-2xl">
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

            {myTurn && mine && mine.jail >= 0 && (
              <Button
                variant="plain"
                onClick={() => {
                  sfx("pago");
                  play({ type: "fianza" });
                }}
              >
                {mine.jailCards > 0 ? "🎟️ Usar carta de salida" : "💵 Pagar fianza (50€)"}
              </Button>
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
          <div className="scroll-soft max-h-72 space-y-1.5 overflow-y-auto p-3">
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
                      onClick={() => {
                        sfx("compra");
                        play({ type: "construir", property: index });
                      }}
                      title={`Construir una casa (${space.houseCost}€)`}
                      className="rounded border-2 border-ink bg-grass px-1.5 text-xs font-extrabold text-white"
                    >
                      +🏠
                    </button>
                  )}
                  {myTurn && space.houseCost && prop.houses > 0 && (
                    <button
                      onClick={() => {
                        sfx("moneda");
                        play({ type: "vender-casa", property: index });
                      }}
                      title="Vender una casa por la mitad"
                      className="rounded border-2 border-ink bg-white px-1.5 text-xs font-extrabold"
                    >
                      −🏠
                    </button>
                  )}
                  {myTurn && (
                    <button
                      onClick={() => {
                        sfx("moneda");
                        play({
                          type: prop.mortgaged ? "deshipotecar" : "hipotecar",
                          property: index,
                        });
                      }}
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
                  player.out
                    ? "bg-white opacity-50"
                    : state.turn === player.id
                      ? "bg-sun"
                      : "bg-paper"
                }`}
              >
                <Token emoji={emojiOf(player.id)} color={colorOf(player.id)} size={1.6} />
                <span className="flex-1 text-sm font-extrabold">
                  {player.name}
                  {player.id === me && " (tú)"}
                </span>
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

      {/* ----------------------------- VENTANAS ----------------------------- */}
      {detail !== null && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
          onClick={() => setDetail(null)}
        >
          <Card className="animate-slam w-full max-w-sm overflow-hidden p-0">
            {BOARD[detail].group && (
              <div
                className="h-12 border-b-[3px] border-ink"
                style={{ background: GROUP_COLORS[BOARD[detail].group!] }}
              />
            )}
            <div className="p-5">
              <h3 className="font-display text-2xl">
                {kindEmoji(BOARD[detail])} {BOARD[detail].name}
              </h3>
              {BOARD[detail].price ? (
                <>
                  <p className="mt-1 font-bold">Precio: {BOARD[detail].price}€</p>
                  {BOARD[detail].rents && (
                    <ul className="mt-3 space-y-1 text-sm font-semibold">
                      {[
                        "Sin casas",
                        "1 casa",
                        "2 casas",
                        "3 casas",
                        "4 casas",
                        "Hotel",
                      ].map((line, index) => (
                        <li key={line} className="flex justify-between">
                          <span>{line}</span>
                          <span className="font-extrabold">
                            {BOARD[detail].rents![index]}€
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {BOARD[detail].houseCost && (
                    <p className="mt-3 text-sm font-bold text-ink-soft">
                      Cada casa cuesta {BOARD[detail].houseCost}€
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-2 text-sm font-bold">
                    Dueño:{" "}
                    {state.props[String(detail)]?.owner ? (
                      <>
                        <Token
                          emoji={emojiOf(state.props[String(detail)].owner!)}
                          color={colorOf(state.props[String(detail)].owner!)}
                          size={1.3}
                        />
                        {nameOf(state.props[String(detail)].owner!)}
                      </>
                    ) : (
                      "nadie todavía"
                    )}
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
              {(state.table.find((p) => p.id === tradeWith)?.properties ?? []).map(
                (index) => (
                  <button
                    key={index}
                    onClick={() => toggle(get, setGet, index)}
                    className={`rounded-lg border-2 border-ink px-2 py-1 text-xs font-extrabold ${
                      get.includes(index) ? "bg-sky text-white" : "bg-white"
                    }`}
                  >
                    {BOARD[index].name}
                  </button>
                ),
              )}
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
