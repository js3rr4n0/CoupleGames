"use client";

import { Fragment, useMemo, useState } from "react";
import { ALL_CARDS, CARD_BY_ID } from "@/lib/games/cluedo-data";
import {
  KINDS,
  KIND_LABEL,
  cardLabel,
  deduce,
  type HistoryEntry,
  type Kind,
} from "@/lib/games/cluedo-deduce";
import { play } from "@/lib/sfx";
import { Card } from "../../ui";

const CYCLE = ["", "✓", "✗", "?"];

export interface NotebookPlayer {
  id: string;
  name: string;
  emoji: string;
}

/**
 * La cuadrícula de descartes.
 *
 * Dos capas: lo que ya se sabe seguro (se marca solo y no se puede tocar) y lo
 * que cada quien anota a ojo. Las marcas a mano se pintan al instante y solo
 * después viajan al servidor, así que no parpadean ni se pierden.
 */
export default function Notebook({
  players,
  me,
  hand,
  reveals,
  history,
  marks,
  onMark,
}: {
  players: NotebookPlayer[];
  me: string | null;
  hand: string[];
  reveals: { from: string; card: string }[];
  history: HistoryEntry[];
  marks: Record<string, string>;
  onMark: (key: string, value: string) => void;
}) {
  const [pending, setPending] = useState<Record<string, string>>({});
  const [explain, setExplain] = useState<string | null>(null);

  // Las marcas se pintan al momento y viajan al servidor por detrás. Cuando el
  // servidor confirma una, se suelta la copia local; así nunca parpadean ni se
  // pierden aunque el sondeo llegue a destiempo.
  const stamp = JSON.stringify(marks);
  const [seenStamp, setSeenStamp] = useState(stamp);
  if (seenStamp !== stamp) {
    setSeenStamp(stamp);
    setPending((previous) => {
      const next: Record<string, string> = {};
      let changed = false;
      for (const [key, value] of Object.entries(previous)) {
        if ((marks[key] ?? "") === value) changed = true;
        else next[key] = value;
      }
      return changed ? next : previous;
    });
  }

  const shown = useMemo(() => ({ ...marks, ...pending }), [marks, pending]);

  const nameOf = useMemo(() => {
    const table = new Map(players.map((player) => [player.id, player.name]));
    return (id: string) => table.get(id) ?? "alguien";
  }, [players]);

  const brain = useMemo(
    () =>
      deduce({
        playerIds: players.map((player) => player.id),
        me,
        nameOf,
        hand,
        reveals,
        history,
        marks: shown,
      }),
    [players, me, nameOf, hand, reveals, history, shown],
  );

  function cycle(cardId: string, playerId: string) {
    const key = `${cardId}|${playerId}`;
    if (brain.auto[key]) {
      setExplain(brain.why[key] ?? null);
      play("toc");
      return;
    }
    const current = shown[key] ?? "";
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    setPending((previous) => ({ ...previous, [key]: next }));
    play("toc");
    onMark(key, next);
  }

  const total = ALL_CARDS.length;
  const known = ALL_CARDS.filter((card) => brain.owners[card.id]).length;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="border-b-[3px] border-ink bg-grape px-4 py-3 text-white">
          <h3 className="font-display text-xl">🗂️ El sobre: qué puede quedar dentro</h3>
          <p className="text-sm font-semibold">
            Van {known} de {total} cartas localizadas. Lo que no tiene nadie, está en el
            sobre.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {KINDS.map((kind) => {
            const list = brain.candidates[kind];
            const done = brain.solved[kind];
            return (
              <div
                key={kind}
                className={`rounded-xl border-[3px] border-ink p-3 ${
                  done ? "animate-pop bg-grass text-white" : "bg-paper"
                }`}
              >
                <p className="text-[11px] font-extrabold uppercase tracking-widest">
                  {KIND_LABEL[kind]}
                </p>
                {done ? (
                  <>
                    <p className="mt-1 font-display text-lg leading-tight">
                      {cardLabel(done)}
                    </p>
                    <p className="text-xs font-bold">¡Solo queda esta! 🎯</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-display text-2xl">{list.length}</p>
                    <p className="text-xs font-bold text-ink-soft">
                      {list.length === 0
                        ? "algo no cuadra: revisa tus ✓"
                        : `posibles: ${list
                            .slice(0, 3)
                            .map((id) => CARD_BY_ID.get(id)?.name)
                            .join(", ")}${list.length > 3 ? "…" : ""}`}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-sun px-4 py-2.5">
          <h3 className="font-display text-lg">🔒 Tu cuadrícula · solo la ves tú</h3>
          <span className="text-[11px] font-extrabold uppercase tracking-widest">
            toca una casilla para ir cambiando ✓ ✗ ?
          </span>
        </div>

        <div className="flex flex-wrap gap-2 border-b-2 border-ink/15 px-4 py-2 text-[11px] font-bold">
          <Chip className="bg-grass text-white">✓ la tiene</Chip>
          <Chip className="bg-tomato text-white">✗ no la tiene</Chip>
          <Chip className="bg-sun">? sospecho</Chip>
          <Chip className="bg-ink text-white">🔒 lo sabemos seguro (se marca solo)</Chip>
        </div>

        {explain && (
          <p className="animate-pop border-b-2 border-ink/15 bg-paper-2 px-4 py-2 text-sm font-bold">
            🔒 {explain}
          </p>
        )}

        <div className="scroll-soft max-h-[30rem] overflow-auto p-3">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white p-1 text-left text-xs font-extrabold uppercase text-ink-soft">
                  Carta
                </th>
                {players.map((player) => (
                  <th key={player.id} className="p-1 text-center">
                    <span className="block text-base leading-none">{player.emoji}</span>
                    <span className="block max-w-[4.5rem] truncate text-[10px] font-extrabold">
                      {player.id === me ? "tú" : player.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KINDS.map((kind) => (
                <Fragment key={kind}>
                  <tr>
                    <td
                      colSpan={players.length + 1}
                      className="bg-paper-2 px-1 py-1 text-[11px] font-extrabold uppercase tracking-widest"
                    >
                      {KIND_LABEL[kind]}
                    </td>
                  </tr>
                  {ALL_CARDS.filter((card) => card.kind === kind).map((card) => {
                    const owner = brain.owners[card.id];
                    const isAnswer = brain.solved[kind as Kind] === card.id;
                    return (
                      <tr
                        key={card.id}
                        className={`border-t-2 border-ink/10 ${
                          owner ? "opacity-55" : isAnswer ? "bg-grass/15" : ""
                        }`}
                      >
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-white p-1 font-bold">
                          <span className={owner ? "line-through decoration-2" : ""}>
                            {card.emoji} {card.name}
                          </span>
                          {hand.includes(card.id) && (
                            <span className="ml-1 rounded border-2 border-ink bg-sun px-1 text-[10px] font-extrabold">
                              tuya
                            </span>
                          )}
                          {isAnswer && (
                            <span className="ml-1 rounded border-2 border-ink bg-grass px-1 text-[10px] font-extrabold text-white">
                              ¡en el sobre!
                            </span>
                          )}
                        </td>
                        {players.map((player) => {
                          const key = `${card.id}|${player.id}`;
                          const locked = brain.auto[key];
                          const mark = locked
                            ? locked === "tiene"
                              ? "✓"
                              : "✗"
                            : (shown[key] ?? "");
                          return (
                            <td key={player.id} className="p-0.5 text-center">
                              <button
                                type="button"
                                title={locked ? brain.why[key] : "Toca para marcar"}
                                onClick={() => cycle(card.id, player.id)}
                                className={`h-8 w-8 rounded-md border-2 border-ink font-extrabold transition active:translate-y-px ${
                                  mark === "✓"
                                    ? "bg-grass text-white"
                                    : mark === "✗"
                                      ? "bg-tomato text-white"
                                      : mark === "?"
                                        ? "bg-sun"
                                        : "bg-white"
                                } ${locked ? "cursor-help opacity-90 ring-2 ring-inset ring-ink/60" : "hover:-translate-y-px"}`}
                              >
                                {mark}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded-md border-2 border-ink px-1.5 py-0.5 ${className}`}>
      {children}
    </span>
  );
}
