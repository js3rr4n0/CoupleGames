"use client";

import { useState } from "react";
import type { RoomView } from "@/lib/engine/view";
import { Button, Card } from "../ui";

type Color = "rojo" | "amarillo" | "verde" | "azul";

interface UnoCard {
  id: string;
  color: Color | null;
  kind: "numero" | "salta" | "cambio" | "mas2" | "comodin" | "mas4";
  value: number | null;
}

interface UnoView {
  order: string[];
  turn: string;
  direction: 1 | -1;
  color: Color;
  top: UnoCard;
  drawCount: number;
  lastPlay: { by: string; card: UnoCard; color: Color } | null;
  winnerId: string | null;
  pendingCardId: string | null;
  hand: UnoCard[];
  playable: string[];
  rivals: { id: string; name: string; cards: number }[];
  counts: Record<string, number>;
}

const COLOR_BG: Record<Color, string> = {
  rojo: "bg-tomato text-white",
  amarillo: "bg-sun text-ink",
  verde: "bg-grass text-white",
  azul: "bg-sky text-white",
};

const COLOR_DOT: Record<Color, string> = {
  rojo: "bg-tomato",
  amarillo: "bg-sun",
  verde: "bg-grass",
  azul: "bg-sky",
};

const COLORS: Color[] = ["rojo", "amarillo", "verde", "azul"];

function label(card: UnoCard): string {
  if (card.kind === "numero") return String(card.value);
  if (card.kind === "salta") return "⃠";
  if (card.kind === "cambio") return "⇄";
  if (card.kind === "mas2") return "+2";
  if (card.kind === "mas4") return "+4";
  return "★";
}

function CardFace({
  card,
  size = "md",
  className = "",
}: {
  card: UnoCard;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-16 w-11 text-lg",
    md: "h-24 w-16 text-2xl",
    lg: "h-32 w-22 text-4xl",
  };
  const wild = card.color === null;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl border-[3px] border-ink font-display ${
        sizes[size]
      } ${wild ? "bg-ink text-white" : COLOR_BG[card.color as Color]} ${className}`}
    >
      <span className="grid h-3/5 w-3/4 place-items-center rounded-lg border-2 border-ink/20 bg-white/25">
        {label(card)}
      </span>
    </span>
  );
}

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
  const canOnlyPlayPending = Boolean(state.pendingCardId);

  function attempt(card: UnoCard) {
    if (!myTurn) return;
    if (canOnlyPlayPending && card.id !== state.pendingCardId) return;
    if (!playable.has(card.id)) return;
    if (card.kind === "comodin" || card.kind === "mas4") {
      setWild(card.id);
      return;
    }
    play({ type: "jugar", cardId: card.id });
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-bubblegum px-5 py-3">
          <p className="font-display text-xl">
            {state.winnerId
              ? `¡Gana ${view.players.find((p) => p.id === state.winnerId)?.name}!`
              : myTurn
                ? canOnlyPlayPending
                  ? "Robaste: juega esa carta o pasa"
                  : "Te toca jugar"
                : `Turno de ${view.players.find((p) => p.id === state.turn)?.name ?? "…"}`}
          </p>
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <span className="rounded-lg border-2 border-ink bg-white px-2 py-1">
              {state.direction === 1 ? "↻ sentido normal" : "↺ sentido invertido"}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-white px-2 py-1">
              color <span className={`h-3 w-3 rounded-full border border-ink ${COLOR_DOT[state.color]}`} />
              {state.color}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-end gap-4">
            <div className="text-center">
              <div className="grid h-24 w-16 place-items-center rounded-xl border-[3px] border-ink bg-ink font-display text-2xl text-white">
                UNO
              </div>
              <p className="mt-1 text-[11px] font-extrabold uppercase tracking-widest text-ink-soft">
                {state.drawCount} cartas
              </p>
            </div>
            <div className="text-center">
              <CardFace
                card={state.top}
                size="lg"
                className={state.lastPlay ? "animate-flip" : ""}
              />
              <p className="mt-1 text-[11px] font-extrabold uppercase tracking-widest text-ink-soft">
                montón
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {state.rivals.map((rival) => (
              <div
                key={rival.id}
                className={`rounded-xl border-[3px] border-ink px-3 py-2 ${
                  state.turn === rival.id ? "bg-sun shadow-hard-sm" : "bg-paper"
                }`}
              >
                <p className="font-extrabold">
                  {view.players.find((p) => p.id === rival.id)?.emoji} {rival.name}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: Math.min(rival.cards, 8) }).map((_, i) => (
                    <span
                      key={i}
                      className="h-6 w-4 rounded border-2 border-ink bg-ink"
                    />
                  ))}
                  <span className="ml-1 text-xs font-extrabold">{rival.cards}</span>
                  {rival.cards === 1 && (
                    <span className="ml-1 rounded border-2 border-ink bg-tomato px-1 text-[10px] font-extrabold text-white">
                      ¡UNO!
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-paper-2 px-4 py-2.5">
          <h3 className="font-display text-lg">
            🔒 Tu mano ({state.hand.length}) · solo la ves tú
          </h3>
          <div className="flex gap-2">
            <Button
              variant="plain"
              className="px-3 py-1.5 text-sm"
              disabled={!myTurn || canOnlyPlayPending}
              onClick={() => play({ type: "robar" })}
            >
              🫴 Robar
            </Button>
            <Button
              variant="plain"
              className="px-3 py-1.5 text-sm"
              disabled={!myTurn || !canOnlyPlayPending}
              onClick={() => play({ type: "pasar" })}
            >
              ➡️ Pasar
            </Button>
          </div>
        </div>
        <div className="scroll-soft flex gap-2 overflow-x-auto p-4">
          {state.hand.map((card) => {
            const usable =
              myTurn &&
              playable.has(card.id) &&
              (!canOnlyPlayPending || card.id === state.pendingCardId);
            return (
              <button
                key={card.id}
                onClick={() => attempt(card)}
                disabled={!usable}
                className={`transition ${
                  usable
                    ? "press -translate-y-1 shadow-hard-sm hover:-translate-y-2"
                    : "opacity-45"
                }`}
              >
                <CardFace card={card} />
              </button>
            );
          })}
          {!state.hand.length && (
            <p className="py-6 font-bold text-ink-soft">Sin cartas. 🎉</p>
          )}
        </div>
      </Card>

      {wild && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4">
          <Card className="animate-pop w-full max-w-sm p-6 text-center">
            <h3 className="font-display text-2xl">¿De qué color sigue?</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    play({ type: "jugar", cardId: wild, color });
                    setWild(null);
                  }}
                  className={`press rounded-xl border-[3px] border-ink py-6 font-display text-lg shadow-hard ${COLOR_BG[color]}`}
                >
                  {color}
                </button>
              ))}
            </div>
            <Button
              variant="quiet"
              className="mt-4 w-full"
              onClick={() => setWild(null)}
            >
              Mejor otra carta
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
