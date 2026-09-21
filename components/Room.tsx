"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/lib/client";
import Finished from "./Finished";
import JoinCard from "./JoinCard";
import Lobby from "./Lobby";
import Play from "./Play";
import Reveal from "./Reveal";
import { HistoryList, Scoreboard } from "./Scoreboard";
import { Avatar, Badge, Button, Card, ErrorBar, Logo } from "./ui";

export default function Room({ code }: { code: string }) {
  const { view, playerId, status, error, setError, busy, act } = useSession(code);
  const [copied, setCopied] = useState(false);

  if (status === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="animate-pulse text-center">
          <Logo />
          <p className="mt-4 text-sm text-white/50">Conectando con la sala {code}…</p>
        </div>
      </main>
    );
  }

  if (status === "missing" || !view) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <Card className="max-w-md p-8 text-center">
          <p className="text-5xl">🕵️</p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            No encontramos la sala {code}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Puede que el código esté mal escrito o que la sala haya expirado tras
            varias horas sin actividad.
          </p>
          <Link href="/" className="mt-6 inline-block">
            <Button>Crear una sala nueva</Button>
          </Link>
        </Card>
      </main>
    );
  }

  if (!view.you) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <RoomHeader view={view} copied={copied} setCopied={setCopied} />
        <div className="mt-8">
          <JoinCard view={view} act={act} busy={busy} />
        </div>
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <RoomHeader view={view} copied={copied} setCopied={setCopied} />

      {view.phase !== "lobby" && view.roundsTotal > 0 && (
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-glow-400 to-candy-400 transition-all duration-700"
            style={{ width: `${(view.roundsDone / view.roundsTotal) * 100}%` }}
          />
        </div>
      )}

      <div className="mt-6 space-y-6">
        {view.phase === "lobby" && <Lobby view={view} act={act} busy={busy} />}
        {view.phase === "playing" && view.round && (
          <Play view={view} act={act} busy={busy} />
        )}
        {view.phase === "reveal" && <Reveal view={view} act={act} busy={busy} />}
        {view.phase === "finished" && <Finished view={view} act={act} busy={busy} />}

        {view.phase !== "lobby" && view.phase !== "finished" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Scoreboard players={view.players} youId={playerId} />
            <HistoryList history={view.history} />
          </div>
        )}
      </div>

      {view.deckError && view.phase === "lobby" && (
        <p className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          {view.deckError}
        </p>
      )}

      {error && <ErrorBar message={error} onClose={() => setError(null)} />}
    </main>
  );
}

function RoomHeader({
  view,
  copied,
  setCopied,
}: {
  view: import("@/lib/view").SessionView;
  copied: boolean;
  setCopied: (value: boolean) => void;
}) {
  async function share() {
    const url = `${window.location.origin}/s/${view.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "¿Quién soy?", url });
        return;
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="transition hover:opacity-80">
        <Logo />
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="font-mono tracking-[0.2em]">{view.code}</Badge>
        {view.phase !== "lobby" && view.roundsTotal > 0 && (
          <Badge>
            Ronda {Math.min(view.roundsDone + 1, view.roundsTotal)}/{view.roundsTotal}
          </Badge>
        )}
        <div className="flex -space-x-2">
          {view.players.slice(0, 5).map((player) => (
            <span key={player.id} className="ring-2 ring-night-950 rounded-2xl">
              <Avatar emoji={player.emoji} size="sm" ring={player.isActor} />
            </span>
          ))}
        </div>
        <Button variant="soft" onClick={share} className="px-3 py-2 text-xs">
          {copied ? "¡Link copiado!" : "Invitar"}
        </Button>
      </div>
    </header>
  );
}
