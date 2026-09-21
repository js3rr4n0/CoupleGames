"use client";

import type { RoomView } from "@/lib/engine/view";
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
  const emojiOf = (id: string) =>
    view.players.find((p) => p.id === id)?.emoji ?? "⬤";

  const columnFull = (col: number) => state.board.every((row) => row[col]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-sky px-5 py-3 text-white">
          <p className="font-display text-xl">
            {state.winnerId
              ? `Gana ${view.players.find((p) => p.id === state.winnerId)?.name}`
              : state.draw
                ? "Tablas"
                : myTurn
                  ? "Te toca: elige columna"
                  : `Turno de ${view.players.find((p) => p.id === state.turn)?.name ?? "…"}`}
          </p>
          <div className="flex gap-2">
            {state.order.map((id, index) => (
              <span
                key={id}
                className={`flex items-center gap-1.5 rounded-lg border-2 border-ink px-2 py-1 text-xs font-extrabold ${DISC[index]} ${
                  state.turn === id && !state.winnerId ? "" : "opacity-60"
                }`}
              >
                {emojiOf(id)} {view.players.find((p) => p.id === id)?.name}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mx-auto w-fit rounded-2xl border-[3px] border-ink bg-sky p-2 shadow-hard-sm sm:p-3">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: 7 }).map((_, col) => (
                <button
                  key={`head-${col}`}
                  disabled={!myTurn || columnFull(col)}
                  onClick={() => play({ type: "drop", col })}
                  className={`h-7 rounded-lg border-2 border-ink text-xs font-extrabold transition disabled:opacity-30 ${
                    myTurn && !columnFull(col)
                      ? "bg-white hover:-translate-y-0.5 hover:bg-sun"
                      : "bg-white/60"
                  }`}
                  aria-label={`Soltar en la columna ${col + 1}`}
                >
                  ▼
                </button>
              ))}

              {state.board.map((row, r) =>
                row.map((cell, c) => {
                  const isLast =
                    state.lastDrop?.row === r && state.lastDrop?.col === c;
                  const isWin = winning.has(`${r},${c}`);
                  return (
                    <div
                      key={`${r}-${c}`}
                      className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-ink bg-paper sm:h-14 sm:w-14"
                    >
                      {cell && (
                        <span
                          className={`grid h-full w-full place-items-center rounded-full border-[3px] border-ink text-base sm:text-xl ${
                            DISC[seatOf(cell)]
                          } ${isLast ? "animate-drop" : ""} ${
                            isWin ? "ring-4 ring-ink ring-offset-2 ring-offset-paper" : ""
                          }`}
                        >
                          {emojiOf(cell)}
                        </span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
