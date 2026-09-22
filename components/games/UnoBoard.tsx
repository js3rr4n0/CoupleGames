"use client";

import { useMemo, useState } from "react";
import type { RoomView } from "@/lib/engine/view";
import { play as sfx, useSfxOn } from "@/lib/sfx";
import { Button, Card } from "../ui";
import {
  COLORS,
  COLOR_HEX,
  CardBack,
  CardFace,
  jitter,
  type UnoCard,
  type UnoColor,
} from "./uno/cards";

interface UnoView {
  order: string[];
  turn: string;
  direction: 1 | -1;
  color: UnoColor;
  top: UnoCard;
  pile: UnoCard[];
  drawCount: number;
  discardCount: number;
  lastPlay: { by: string; card: UnoCard; color: UnoColor } | null;
  winnerId: string | null;
  pendingCardId: string | null;
  hand: UnoCard[];
  playable: string[];
  rivals: { id: string; name: string; cards: number }[];
  counts: Record<string, number>;
}

/** Radio de la mesa, en % del lado del tapete. */
const SEAT_RADIUS = 33;

/** Ancho de las cartas del centro, medido contra el propio tapete. */
const CARD = "11cqw";

export default function UnoBoard({
  view,
  play,
}: {
  view: RoomView;
  play: (move: Record<string, unknown>) => void;
}) {
  const state = view.state as UnoView;
  const me = view.you?.id ?? null;
  const myTurn = state.turn === me && !state.winnerId;
  const [wild, setWild] = useState<string | null>(null);

  const playable = new Set(state.playable);
  const mustUsePending = Boolean(state.pendingCardId);

  /** Cada quien se sienta abajo del todo y ve la mesa desde su sitio. */
  const seats = useMemo(() => {
    const ids = state.order;
    const start = me ? Math.max(0, ids.indexOf(me)) : 0;
    const around = [...ids.slice(start), ...ids.slice(0, start)];
    return around.map((id, index) => {
      const angle = 90 + (index * 360) / around.length;
      const rad = (angle * Math.PI) / 180;
      return {
        id,
        angle,
        x: 50 + SEAT_RADIUS * Math.cos(rad),
        y: 50 + SEAT_RADIUS * Math.sin(rad),
        /** Giro para que sus cartas apunten hacia fuera, como si las sostuviera. */
        tilt: angle - 90,
      };
    });
  }, [state.order, me]);

  const seatOf = (id: string) => seats.find((seat) => seat.id === id);
  const turnSeat = seatOf(state.turn);
  const gritones = state.rivals.filter((rival) => rival.cards === 1).length;

  useSfxOn(state.top.id, "carta");
  useSfxOn(gritones, gritones > 0 ? "uno" : null);
  useSfxOn(myTurn ? "si" : "no", myTurn ? "turno" : null);
  useSfxOn(state.winnerId, state.winnerId ? "victoria" : null);

  function attempt(card: UnoCard) {
    if (!myTurn) return;
    if (mustUsePending && card.id !== state.pendingCardId) return;
    if (!playable.has(card.id)) return;
    if (card.kind === "comodin" || card.kind === "mas4") {
      sfx("toc");
      setWild(card.id);
      return;
    }
    sfx("carta");
    play({ type: "jugar", cardId: card.id });
  }

  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? "?";
  const emojiOf = (id: string) => view.players.find((p) => p.id === id)?.emoji ?? "🙂";

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-bubblegum px-5 py-3">
          <p className="font-display text-xl">
            {state.winnerId
              ? `🏆 ¡Gana ${nameOf(state.winnerId)}!`
              : myTurn
                ? mustUsePending
                  ? "Robaste: juega esa carta o pasa"
                  : "Te toca a ti"
                : `Turno de ${nameOf(state.turn)}`}
          </p>
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <span className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-white px-2 py-1">
              color
              <span
                className="h-3.5 w-3.5 rounded-full border-2 border-ink"
                style={{ background: COLOR_HEX[state.color] }}
              />
              {state.color}
            </span>
            <span className="rounded-lg border-2 border-ink bg-white px-2 py-1">
              {state.direction === 1 ? "↻ hacia la izquierda" : "↺ al revés"}
            </span>
          </div>
        </div>

        {/* ------------------------------ EL TAPETE ------------------------------ */}
        <div className="p-3 sm:p-5">
          <div
            className="relative mx-auto aspect-square w-full max-w-[min(44rem,72vh)]"
            // Todo lo que va encima del tapete se mide en cqw (porcentaje del
            // tapete), así que la mesa se encoge entera y nada se sale.
            style={{ containerType: "size" }}
          >
            <div className="felt absolute inset-0 rounded-full border-[6px] border-ink shadow-hard-lg" />
            {/* El aro interior lleva el color que toca: se ve desde cualquier sitio. */}
            <div
              className="absolute inset-[5%] rounded-full border-[10px] transition-colors duration-300"
              style={{ borderColor: COLOR_HEX[state.color] }}
            />

            {/* La aguja que señala a quién le toca y gira hasta el siguiente. */}
            {turnSeat && !state.winnerId && (
              <div
                className="absolute left-1/2 top-1/2 h-0 w-0 transition-transform duration-500"
                style={{ transform: `rotate(${turnSeat.angle - 90}deg)` }}
              >
                <span
                  className="absolute block"
                  style={{ left: "-0.5em", fontSize: "4.5cqw", transform: "translateY(5.6em)" }}
                >
                  🔻
                </span>
              </div>
            )}

            {/* Montones: mazo a la izquierda, descarte a la derecha. */}
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-5 sm:gap-8">
              <button
                onClick={() => {
                  if (!myTurn || mustUsePending) return;
                  sfx("roba");
                  play({ type: "robar" });
                }}
                disabled={!myTurn || mustUsePending}
                title={myTurn ? "Roba una carta" : "Solo puedes robar en tu turno"}
                className={`relative block ${
                  myTurn && !mustUsePending
                    ? "press cursor-pointer hover:-translate-y-1"
                    : "cursor-default"
                }`}
                style={{ width: CARD, height: `calc(${CARD} * 1.5)` }}
              >
                {[0, 1, 2, 3].map((layer) => (
                  <CardBack
                    key={layer}
                    width={CARD}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      transform: `translate(${layer * 2}px, ${-layer * 2}px)`,
                    }}
                  />
                ))}
                <span className="absolute left-1/2 w-max -translate-x-1/2 rounded-lg border-2 border-ink bg-white px-[0.5em] py-[0.15em] text-center font-extrabold"
                  style={{ bottom: "-2.2em", fontSize: "2.6cqw" }}
                >
                  mazo · {state.drawCount}
                </span>
              </button>

              <div className="relative" style={{ width: CARD, height: `calc(${CARD} * 1.5)` }}>
                {/* Las cartas ya jugadas quedan tiradas de cualquier manera. */}
                {state.pile.slice(0, -1).map((card) => (
                  <CardFace
                    key={card.id}
                    card={card}
                    width={CARD}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      transform: `translate(${jitter(`x${card.id}`, 10)}px, ${jitter(
                        `y${card.id}`,
                        10,
                      )}px) rotate(${jitter(`r${card.id}`, 24)}deg)`,
                    }}
                  />
                ))}
                <CardFace
                  key={state.top.id}
                  card={state.top}
                  width={CARD}
                  className="animate-toss shadow-hard-sm"
                  style={
                    {
                      position: "absolute",
                      left: 0,
                      top: 0,
                      "--from-x": tossFrom(state.lastPlay?.by, seatOf).x,
                      "--from-y": tossFrom(state.lastPlay?.by, seatOf).y,
                      "--from-r": "-40deg",
                      "--to-r": `${jitter(`r${state.top.id}`, 12)}deg`,
                    } as React.CSSProperties
                  }
                />
                <span className="absolute left-1/2 w-max -translate-x-1/2 rounded-lg border-2 border-ink bg-white px-[0.5em] py-[0.15em] text-center font-extrabold"
                  style={{ bottom: "-2.2em", fontSize: "2.6cqw" }}
                >
                  montón · {state.discardCount}
                </span>
              </div>
            </div>

            {/* Cada jugador en su sitio, con sus cartas giradas hacia él. */}
            {seats.map((seat) => {
              const mine = seat.id === me;
              const cards = state.counts[seat.id] ?? 0;
              const active = state.turn === seat.id && !state.winnerId;
              return (
                <div
                  key={seat.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
                >
                  <div
                    className="flex flex-col items-center gap-1"
                    style={{ transform: `rotate(${seat.tilt}deg)` }}
                  >
                    {!mine && (
                      <div
                        className="flex items-end justify-center"
                        style={{ height: `calc(${CARD} * 0.85)` }}
                      >
                        {Array.from({ length: Math.min(cards, 7) }).map((_, index, list) => (
                          <CardBack
                            key={index}
                            width={`calc(${CARD} * 0.5)`}
                            style={{
                              marginLeft: index === 0 ? 0 : `calc(${CARD} * -0.32)`,
                              transform: `rotate(${(index - (list.length - 1) / 2) * 7}deg)`,
                            }}
                          />
                        ))}
                        {cards === 0 && (
                          <span className="text-2xl" title="sin cartas">
                            🎉
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        transform: `rotate(${-seat.tilt}deg)`,
                        fontSize: "2.8cqw",
                        padding: "0.35em 0.6em",
                        gap: "0.45em",
                      }}
                      className={`flex items-center whitespace-nowrap rounded-xl border-[3px] border-ink font-extrabold shadow-hard-sm ${
                        active ? "animate-pulse-ring bg-sun" : "bg-white"
                      }`}
                    >
                      <span style={{ fontSize: "1.3em" }}>{emojiOf(seat.id)}</span>
                      <span className="max-w-[4.5em] truncate">
                        {mine ? "tú" : nameOf(seat.id)}
                      </span>
                      <span className="rounded-md border-2 border-ink bg-paper px-[0.35em]">
                        {cards}
                      </span>
                      {cards === 1 && (
                        <span className="animate-wiggle rounded-md border-2 border-ink bg-tomato px-[0.35em] text-white">
                          ¡UNO!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ------------------------------ TU MANO ------------------------------ */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-paper-2 px-4 py-2.5">
          <h3 className="font-display text-lg">
            🔒 Tu mano ({state.hand.length}) · solo la ves tú
          </h3>
          <div className="flex gap-2">
            <Button
              variant="plain"
              className="px-3 py-1.5 text-sm"
              disabled={!myTurn || mustUsePending}
              onClick={() => {
                sfx("roba");
                play({ type: "robar" });
              }}
            >
              🫴 Robar
            </Button>
            <Button
              variant="plain"
              className="px-3 py-1.5 text-sm"
              disabled={!myTurn || !mustUsePending}
              onClick={() => play({ type: "pasar" })}
            >
              ➡️ Pasar
            </Button>
          </div>
        </div>
        {/* Sin solapes: en el móvil las cartas se reparten en filas y cada una
            es un blanco cómodo para el pulgar. */}
        <div className="flex flex-wrap items-end justify-center gap-1.5 px-3 py-5 sm:gap-2">
          {state.hand.map((card) => {
            const usable =
              myTurn &&
              playable.has(card.id) &&
              (!mustUsePending || card.id === state.pendingCardId);
            return (
              <button
                key={card.id}
                onClick={() => attempt(card)}
                disabled={!usable}
                title={usable ? "Jugar esta carta" : "Esta no se puede jugar ahora"}
                className={`animate-deal origin-bottom transition-transform ${
                  usable ? "hover:-translate-y-3" : "opacity-45"
                }`}
                style={{ transform: `rotate(${jitter(`m${card.id}`, 3)}deg)` }}
              >
                <CardFace
                  card={card}
                  width="clamp(3.1rem, 15vw, 4.8rem)"
                  className={usable ? "shadow-hard-sm" : ""}
                />
              </button>
            );
          })}
          {!state.hand.length && (
            <p className="py-6 font-bold text-ink-soft">Sin cartas. 🎉</p>
          )}
        </div>
        {myTurn && !mustUsePending && !state.playable.length && (
          <p className="border-t-2 border-ink/15 bg-sun px-4 py-2 text-sm font-bold">
            No tienes nada jugable: toca el mazo del centro para robar.
          </p>
        )}
      </Card>

      {wild && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4">
          <Card className="animate-slam w-full max-w-sm p-6 text-center">
            <h3 className="font-display text-2xl">¿De qué color sigue?</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    sfx("carta");
                    play({ type: "jugar", cardId: wild, color });
                    setWild(null);
                  }}
                  className="press rounded-xl border-[3px] border-ink py-8 font-display text-lg text-white shadow-hard"
                  style={{ background: COLOR_HEX[color] }}
                >
                  {color}
                </button>
              ))}
            </div>
            <Button variant="quiet" className="mt-4 w-full" onClick={() => setWild(null)}>
              Mejor otra carta
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

/** Desde dónde vuela la carta hasta el montón: desde el sitio de quien la jugó. */
function tossFrom(
  playerId: string | undefined,
  seatOf: (id: string) => { angle: number } | undefined,
): { x: string; y: string } {
  const seat = playerId ? seatOf(playerId) : undefined;
  if (!seat) return { x: "0rem", y: "6rem" };
  const rad = (seat.angle * Math.PI) / 180;
  return {
    x: `${(Math.cos(rad) * 11).toFixed(2)}rem`,
    y: `${(Math.sin(rad) * 11).toFixed(2)}rem`,
  };
}
