"use client";

import Link from "next/link";
import { useState } from "react";
import { useMesa } from "@/lib/mesa-client";
import { rememberName, recallName } from "@/lib/client";
import Conecta4Board from "./games/Conecta4Board";
import BatallaBoard from "./games/BatallaBoard";
import UnoBoard from "./games/UnoBoard";
import CluedoBoard from "./games/CluedoBoard";
import MonopolioBoard from "./games/MonopolioBoard";
import Notepad from "./Notepad";
import RulesButton, { RulesList } from "./RulesPanel";
import { Avatar, Badge, Button, Card, Confetti, ErrorBar, Logo } from "./ui";

export default function Mesa({ code }: { code: string }) {
  const { view, status, error, setError, busy, send, play } = useMesa(code);
  const [name, setName] = useState(recallName());
  const [copied, setCopied] = useState(false);

  if (status === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="text-center">
          <Logo />
          <p className="mt-4 font-bold text-ink-soft">Entrando a la mesa {code}…</p>
        </div>
      </main>
    );
  }

  if (status === "missing" || !view) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <Card className="max-w-md p-8 text-center">
          <p className="text-5xl">🎲</p>
          <h1 className="mt-4 font-display text-3xl">No encontramos la mesa {code}</h1>
          <p className="mt-2 font-semibold text-ink-soft">
            Puede que el código esté mal escrito o que la mesa se haya recogido tras
            varias horas sin actividad.
          </p>
          <Link href="/" className="mt-6 inline-block">
            <Button>Volver al inicio</Button>
          </Link>
        </Card>
      </main>
    );
  }

  async function share() {
    const url = `${window.location.origin}/mesa/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "CoupleGames", url });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* bloqueado */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/">
        <Logo />
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>
          {view.gameEmoji} {view.gameName}
        </Badge>
        <Badge className="font-display tracking-[0.2em]">{view.code}</Badge>
        <div className="flex gap-1">
          {view.players.slice(0, 6).map((player) => (
            <Avatar
              key={player.id}
              emoji={player.emoji}
              size="sm"
              active={view.phase === "playing" && isTurn(view, player.id)}
            />
          ))}
        </div>
        <RulesButton name={view.gameName} emoji={view.gameEmoji} rules={view.rules} />
        <Button variant="plain" className="px-3 py-2 text-sm" onClick={share}>
          {copied ? "¡Copiado!" : "Invitar"}
        </Button>
      </div>
    </header>
  );

  if (!view.you) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        {header}
        <Card className="animate-rise mx-auto mt-8 max-w-lg overflow-hidden p-0">
          <div className="border-b-[3px] border-ink bg-sun px-6 py-5">
            <p className="text-xs font-extrabold uppercase tracking-widest">
              Mesa {view.code}
            </p>
            <h2 className="mt-1 font-display text-3xl">
              {view.gameEmoji} {view.gameName}
            </h2>
            <p className="mt-1 font-semibold">{view.gameTagline}</p>
          </div>
          <form
            className="space-y-4 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              rememberName(name);
              void send("join", { name });
            }}
          >
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
                Tu nombre
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={18}
                required
                autoFocus
                placeholder="Luis"
                className="mt-2 w-full rounded-xl border-[3px] border-ink bg-paper px-4 py-3 text-lg font-bold outline-none focus:bg-white"
              />
            </label>
            <Button type="submit" disabled={busy} className="w-full py-4 text-lg">
              Sentarse a la mesa ▸
            </Button>
            {view.phase === "playing" && (
              <p className="rounded-lg border-2 border-ink bg-sun px-3 py-2 text-center text-sm font-bold">
                La partida ya empezó: podrás entrar en la siguiente.
              </p>
            )}
          </form>
        </Card>
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}
      </main>
    );
  }

  const isHost = view.you.isHost;
  const canStart = view.players.length >= view.minPlayers;

  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-8">
      {header}

      {view.phase === "finished" && view.winner && <Confetti />}

      <div className="mt-5 space-y-5">
        {view.phase === "lobby" && (
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <Card className="animate-rise overflow-hidden p-0">
              <div className="border-b-[3px] border-ink bg-sun px-6 py-5">
                <p className="text-xs font-extrabold uppercase tracking-widest">
                  Código de la mesa
                </p>
                <p className="mt-1 font-display text-5xl tracking-[0.25em]">{view.code}</p>
                <p className="mt-2 font-semibold">
                  {view.gameEmoji} {view.gameName} · de {view.minPlayers} a {view.maxPlayers}{" "}
                  jugadores
                </p>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg">
                  En la mesa ({view.players.length}/{view.targetPlayers})
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {view.players.map((player) => (
                    <li
                      key={player.id}
                      className="animate-pop flex items-center gap-3 rounded-xl border-[3px] border-ink bg-paper px-3 py-2"
                    >
                      <Avatar emoji={player.emoji} />
                      <div className="min-w-0">
                        <p className="truncate font-extrabold">
                          {player.name}
                          {player.id === view.you?.id && (
                            <span className="ml-1 text-xs text-ink-soft">(tú)</span>
                          )}
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                          {player.isHost ? "anfitrión" : "jugador"}
                          {player.wins > 0 && ` · ${player.wins} 🏆`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {isHost ? (
                    <Button
                      className="w-full py-4 text-lg"
                      disabled={!canStart || busy}
                      onClick={() => send("start")}
                    >
                      {canStart
                        ? `Empezar ${view.gameName}`
                        : `Faltan jugadores (mínimo ${view.minPlayers})`}
                    </Button>
                  ) : (
                    <p className="rounded-xl border-[3px] border-dashed border-ink/35 p-4 text-center font-bold text-ink-soft">
                      Esperando a que el anfitrión reparta…
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="animate-rise overflow-hidden p-0">
              <div className="border-b-[3px] border-ink bg-grape px-5 py-3 text-white">
                <h3 className="font-display text-xl">Reglas de {view.gameName}</h3>
              </div>
              <div className="scroll-soft max-h-[26rem] overflow-y-auto p-5">
                <RulesList rules={view.rules} />
              </div>
            </Card>
          </div>
        )}

        {(view.phase === "playing" || view.phase === "finished") && (
          <>
            {view.phase === "finished" && view.winner && (
              <Card className="animate-rise overflow-hidden p-0" tone="sun">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest">
                      Partida {view.round}
                    </p>
                    <p className="font-display text-3xl">
                      🏆{" "}
                      {view.winner.ids.length
                        ? view.winner.ids
                            .map((id) => view.players.find((p) => p.id === id)?.name)
                            .join(" y ")
                        : "Nadie"}{" "}
                      · {view.winner.label}
                    </p>
                  </div>
                  {isHost && (
                    <Button onClick={() => send("rematch")} disabled={busy}>
                      🔁 Otra partida
                    </Button>
                  )}
                </div>
              </Card>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
              <div>
                <Board view={view} play={play} send={send} />
              </div>
              <div className="space-y-4">
                <Notepad
                  text={view.pad.text}
                  onSave={(text) => void send("pad", { text })}
                />
                <Card className="overflow-hidden p-0">
                  <div className="border-b-[3px] border-ink bg-ink px-4 py-2.5 text-white">
                    <h3 className="font-display text-lg">Qué ha pasado</h3>
                  </div>
                  <ul className="scroll-soft max-h-80 space-y-1.5 overflow-y-auto p-3">
                    {view.log.map((entry) => (
                      <li
                        key={entry.id}
                        className="animate-pop rounded-lg border-2 border-ink bg-paper px-2 py-1.5 text-sm font-semibold"
                      >
                        <span className="mr-1">{entry.emoji}</span>
                        {entry.text}
                      </li>
                    ))}
                    {!view.log.length && (
                      <li className="p-2 text-sm font-semibold text-ink-soft">
                        Aquí se va apuntando cada jugada.
                      </li>
                    )}
                  </ul>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {error && <ErrorBar message={error} onClose={() => setError(null)} />}
    </main>
  );
}

function isTurn(view: ReturnType<typeof useMesa>["view"], id: string): boolean {
  const state = view?.state as { turn?: string } | null;
  return state?.turn === id;
}

function Board({
  view,
  play,
  send,
}: {
  view: NonNullable<ReturnType<typeof useMesa>["view"]>;
  play: (move: Record<string, unknown>) => void;
  send: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
}) {
  if (!view.state) return null;
  switch (view.gameId) {
    case "conecta4":
      return <Conecta4Board view={view} play={play} />;
    case "batalla-naval":
      return <BatallaBoard view={view} play={play} />;
    case "uno":
      return <UnoBoard view={view} play={play} />;
    case "cluedo":
      return (
        <CluedoBoard
          view={view}
          play={play}
          marks={view.pad.marks}
          onMark={(key, value) => void send("pad", { mark: { key, value } })}
        />
      );
    case "monopolio":
      return <MonopolioBoard view={view} play={play} />;
    default:
      return null;
  }
}
