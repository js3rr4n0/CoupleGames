"use client";

import { Fragment, useState } from "react";
import type { RoomView } from "@/lib/engine/view";
import { Button, Card } from "../ui";

interface Ship {
  id: string;
  name: string;
  size: number;
  row: number;
  col: number;
  horizontal: boolean;
  hits: number;
}

interface BatallaView {
  stage: "colocando" | "combate";
  order: string[];
  turn: string;
  lastShot: { by: string; row: number; col: number; result: string; ship?: string } | null;
  winnerId: string | null;
  youPlay: boolean;
  rivalName: string | null;
  rivalReady: boolean;
  you: { ready: boolean; ships: Ship[]; grid: (null | "agua" | "tocado")[][]; remaining: number } | null;
  enemy: {
    grid: (null | "agua" | "tocado")[][];
    sunkShips: { name: string; cells: number[][] }[];
    fleet: { name: string; size: number; sunk: boolean }[];
  } | null;
}

const LETTERS = "ABCDEFGHIJ".split("");

function cellsOf(ship: Ship): string[] {
  return Array.from({ length: ship.size }, (_, i) =>
    ship.horizontal ? `${ship.row},${ship.col + i}` : `${ship.row + i},${ship.col}`,
  );
}

export default function BatallaBoard({
  view,
  play,
}: {
  view: RoomView;
  play: (move: Record<string, unknown>) => void;
}) {
  const state = view.state as BatallaView;
  const me = view.you?.id ?? null;
  const [selected, setSelected] = useState<string>("portaaviones");
  const [horizontal, setHorizontal] = useState(true);

  if (!state.you) {
    return (
      <Card className="p-6 text-center font-bold text-ink-soft">
        Esta partida es de dos. Puedes mirar desde la orilla 🌊
      </Card>
    );
  }

  const mine = state.you;
  const myCells = new Map<string, Ship>();
  for (const ship of mine.ships) {
    for (const cell of cellsOf(ship)) myCells.set(cell, ship);
  }
  const sunkCells = new Set(
    (state.enemy?.sunkShips ?? []).flatMap((ship) =>
      ship.cells.map(([r, c]) => `${r},${c}`),
    ),
  );
  const myTurn = state.turn === me && state.stage === "combate" && !state.winnerId;

  return (
    <div className="space-y-4">
      {state.stage === "colocando" ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b-[3px] border-ink bg-sky px-5 py-3 text-white">
            <p className="font-display text-xl">Coloca tu flota</p>
            <p className="text-sm font-semibold opacity-90">
              Elige un barco, gíralo si hace falta y toca una casilla de tu mar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {mine.ships.map((ship) => (
              <button
                key={ship.id}
                disabled={mine.ready}
                onClick={() => setSelected(ship.id)}
                className={`press rounded-xl border-[3px] border-ink px-3 py-2 text-sm font-extrabold disabled:opacity-50 ${
                  selected === ship.id ? "bg-sun shadow-hard-sm" : "bg-white"
                }`}
              >
                {ship.name} · {ship.size}
              </button>
            ))}
            <Button
              variant="plain"
              disabled={mine.ready}
              onClick={() => setHorizontal((h) => !h)}
              className="px-3 py-2 text-sm"
            >
              {horizontal ? "↔️ Horizontal" : "↕️ Vertical"}
            </Button>
            <Button
              variant="plain"
              disabled={mine.ready}
              onClick={() => play({ type: "azar" })}
              className="px-3 py-2 text-sm"
            >
              🎲 Al azar
            </Button>
            <Button
              disabled={mine.ready}
              onClick={() => play({ type: "listo" })}
              className="px-3 py-2 text-sm"
            >
              {mine.ready ? "Esperando…" : "⚓ Flota lista"}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b-[3px] border-ink bg-paper-2 px-4 py-2.5">
            <h3 className="font-display text-lg">Tu mar 🌊</h3>
            <span className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
              {mine.remaining} barcos a flote
            </span>
          </div>
          <Grid
            onCell={(row, col) =>
              state.stage === "colocando" && !mine.ready
                ? play({ type: "place", shipId: selected, row, col, horizontal })
                : undefined
            }
            render={(row, col) => {
              const key = `${row},${col}`;
              const ship = myCells.get(key);
              const shot = mine.grid[row][col];
              const isSelected =
                ship?.id === selected && state.stage === "colocando" && !mine.ready;
              return (
                <span
                  className={`grid h-full w-full place-items-center text-xs ${
                    shot === "tocado"
                      ? "bg-tomato text-white"
                      : shot === "agua"
                        ? "bg-sky/40"
                        : ship
                          ? isSelected
                            ? "bg-sun"
                            : "bg-ink-soft/70"
                          : "bg-white"
                  }`}
                >
                  {shot === "tocado" ? "💥" : shot === "agua" ? "•" : ship ? "▣" : ""}
                </span>
              );
            }}
          />
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-2.5 text-white">
            <h3 className="font-display text-lg">
              Mar de {state.rivalName ?? "…"} 🎯
            </h3>
            <span className="text-xs font-extrabold uppercase tracking-widest">
              {myTurn ? "¡dispara!" : state.stage === "combate" ? "espera" : "preparando"}
            </span>
          </div>
          <Grid
            onCell={(row, col) =>
              myTurn && !state.enemy?.grid[row][col]
                ? play({ type: "disparo", row, col })
                : undefined
            }
            render={(row, col) => {
              const shot = state.enemy?.grid[row][col];
              const sunk = sunkCells.has(`${row},${col}`);
              const isLast =
                state.lastShot?.by === me &&
                state.lastShot.row === row &&
                state.lastShot.col === col;
              return (
                <span
                  className={`relative grid h-full w-full place-items-center text-xs ${
                    sunk
                      ? "bg-ink text-white"
                      : shot === "tocado"
                        ? "bg-tomato text-white"
                        : shot === "agua"
                          ? "bg-sky/40"
                          : myTurn
                            ? "bg-white hover:bg-sun"
                            : "bg-white"
                  } ${isLast ? "animate-shake" : ""}`}
                >
                  {sunk ? "🔥" : shot === "tocado" ? "💥" : shot === "agua" ? "•" : ""}
                  {isLast && (
                    <span className="animate-splash pointer-events-none absolute inset-0 rounded-full border-[3px] border-ink" />
                  )}
                </span>
              );
            }}
          />
          <div className="flex flex-wrap gap-1.5 border-t-[3px] border-ink bg-paper-2 p-3">
            {(state.enemy?.fleet ?? []).map((ship) => (
              <span
                key={ship.name}
                className={`rounded-lg border-2 border-ink px-2 py-1 text-[11px] font-extrabold ${
                  ship.sunk ? "bg-tomato text-white line-through" : "bg-white"
                }`}
              >
                {ship.name} {ship.size}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Grid({
  render,
  onCell,
}: {
  render: (row: number, col: number) => React.ReactNode;
  onCell: (row: number, col: number) => void;
}) {
  return (
    <div className="p-3">
      <div className="grid grid-cols-[1.2rem_repeat(10,1fr)] gap-[2px] text-[10px] font-extrabold text-ink-soft">
        <span />
        {LETTERS.map((letter) => (
          <span key={letter} className="text-center">
            {letter}
          </span>
        ))}
        {Array.from({ length: 10 }).map((_, row) => (
          <Fragment key={`row-${row}`}>
            <span className="grid place-items-center">
              {row + 1}
            </span>
            {Array.from({ length: 10 }).map((_, col) => (
              <button
                key={`${row}-${col}`}
                onClick={() => onCell(row, col)}
                className="aspect-square overflow-hidden rounded-[4px] border-2 border-ink"
              >
                {render(row, col)}
              </button>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
