"use client";

import type { RoomView } from "@/lib/engine/view";
import { play as sfx, useSfxOn } from "@/lib/sfx";
import { Card } from "../ui";

interface C4View {
  board: (string | null)[][];
  order: string[];
  turn: string;
  lastDrop: { row: number; col: number; by: string } | null;
  line: number[][] | null;
  winnerId: string | null;
  draw: boolean;
  youPlay: boolean;
}

const DISC = ["bg-tomato text-white", "bg-sun text-ink"];

export default function Conecta4Board({
  view,
  play,
}: {
  view: RoomView;
  play: (move: Record<string, unknown>) => void;
}) {
  const state = view.state as C4View;
  const me = view.you?.id ?? null;
  const myTurn = state.turn === me && !state.winnerId && !state.draw;
  const winning = new Set((state.line ?? []).map(([r, c]) => `${r},${c}`));
  const seatOf = (id: string) => state.order.indexOf(id);
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? "…";
  const emojiOf = (id: string) => view.players.find((p) => p.id === id)?.emoji ?? "⬤";

  const columnFull = (col: number) => state.board.every((row) => row[col]);

  useSfxOn(state.lastDrop ? `${state.lastDrop.row}-${state.lastDrop.col}` : null, "ficha");
  useSfxOn(state.winnerId, state.winnerId ? "victoria" : null);
  useSfxOn(myTurn ? "si" : "no", myTurn ? "turno" : null);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-sky px-4 py-3 text-white sm:px-5">
          <p className="font-display text-lg sm:text-xl">
            {state.winnerId
              ? `Gana ${nameOf(state.winnerId)}`
              : state.draw
                ? "Tablas"
                : myTurn
                  ? "Te toca: toca una columna"
                  : `Turno de ${nameOf(state.turn)}`}
          </p>
          <div className="flex gap-2">
            {state.order.map((id, index) => (
              <span
                key={id}
                className={`flex items-center gap-1.5 rounded-lg border-2 border-ink px-2 py-1 text-xs font-extrabold ${DISC[index]} ${
                  state.turn === id && !state.winnerId ? "" : "opacity-60"
                }`}
              >
                {emojiOf(id)} {nameOf(id)}
              </span>
            ))}
          </div>
        </div>

        <div className="p-3 sm:p-6">
          {/* Cada columna entera es un botón: en el móvil se acierta con el pulgar. */}
          <div className="mx-auto w-full max-w-[34rem] rounded-2xl border-[3px] border-ink bg-sky p-2 shadow-hard-sm sm:p-3">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: 7 }).map((_, col) => {
                const usable = myTurn && !columnFull(col);
                return (
                  <button
                    key={col}
                    disabled={!usable}
                    onClick={() => {
                      sfx("ficha");
                      play({ type: "drop", col });
                    }}
                    aria-label={`Soltar en la columna ${col + 1}`}
                    className={`flex flex-col gap-1.5 rounded-xl transition sm:gap-2 ${
                      usable ? "cursor-pointer hover:bg-white/25" : "cursor-default"
                    }`}
                  >
                    <span
                      className={`grid h-6 place-items-center rounded-md border-2 border-ink text-[10px] font-extrabold sm:h-7 sm:text-xs ${
                        usable ? "bg-white" : "bg-white/40 text-ink/40"
                      }`}
                    >
                      ▼
                    </span>
                    {state.board.map((row, r) => {
                      const cell = row[col];
                      const isLast =
                        state.lastDrop?.row === r && state.lastDrop?.col === col;
                      const isWin = winning.has(`${r},${col}`);
                      return (
                        <span
                          key={r}
                          className="grid aspect-square w-full place-items-center rounded-full border-[3px] border-ink bg-paper"
                        >
                          {cell && (
                            <span
                              className={`grid h-full w-full place-items-center rounded-full border-[3px] border-ink text-sm sm:text-xl ${
                                DISC[seatOf(cell)]
                              } ${isLast ? "animate-drop" : ""} ${
                                isWin
                                  ? "ring-4 ring-ink ring-offset-2 ring-offset-paper"
                                  : ""
                              }`}
                            >
                              {emojiOf(cell)}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
