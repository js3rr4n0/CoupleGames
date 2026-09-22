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
import type { SessionView } from "@/lib/view";
import FlowerOverlay from "./FlowerOverlay";
import { Avatar, Badge, Button, Card, ErrorBar, FlowerNote, Logo, OfflineBar } from "./ui";

export default function Room({ code }: { code: string }) {
  const { view, playerId, status, error, setError, busy, offline, act } = useSession(code);
  const [copied, setCopied] = useState(false);
  const [flowerOpen, setFlowerOpen] = useState(true);
  // La pantalla completa se muestra una vez por visita a la sala.
  const [bloomed, setBloomed] = useState(() => {
    try {
      return window.sessionStorage.getItem(`couplegames:bloom:${code}`) === "1";
    } catch {
      return false;
    }
  });
  const flower = Boolean(view?.you?.flower) && flowerOpen;
  const bloom = Boolean(view?.you?.flower) && !bloomed;

  function closeBloom() {
    try {
      window.sessionStorage.setItem(`couplegames:bloom:${code}`, "1");
    } catch {
      /* modo privado: simplemente se volverá a ver en la próxima visita */
    }
    setBloomed(true);
  }

  if (status === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="text-center">
          <Logo />
          <p className="mt-4 font-bold text-ink-soft">Entrando a la sala {code}…</p>
        </div>
      </main>
    );
  }

  if (status === "missing" || !view) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <Card className="max-w-md p-8 text-center">
          <p className="text-5xl">🕵️</p>
          <h1 className="mt-4 font-display text-3xl">
            No encontramos la sala {code}
          </h1>
          <p className="mt-2 font-semibold text-ink-soft">
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
      <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <RoomHeader view={view} copied={copied} setCopied={setCopied} />
        <div className="mt-8">
          <JoinCard view={view} act={act} busy={busy} />
        </div>
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <RoomHeader view={view} copied={copied} setCopied={setCopied} />

      {bloom && <FlowerOverlay name={view.you.name} onClose={closeBloom} />}

      {flower && !bloom && (
        <div className="mt-4">
          <FlowerNote name={view.you.name} onClose={() => setFlowerOpen(false)} />
        </div>
      )}

      {view.phase !== "lobby" && view.roundsTotal > 0 && (
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: view.roundsTotal }).map((_, index) => (
            <span
              key={index}
              className={`h-3 flex-1 rounded-full border-2 border-ink ${
                index < view.roundsDone
                  ? "bg-grass"
                  : index === view.roundsDone
                    ? "bg-sun"
                    : "bg-white"
              }`}
            />
          ))}
        </div>
      )}

      <div className="mt-5 space-y-5">
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
        <p className="mt-6 rounded-xl border-[3px] border-ink bg-sun p-4 font-bold">
          {view.deckError}
        </p>
      )}

      {offline && <OfflineBar />}
      {error && <ErrorBar message={error} onClose={() => setError(null)} />}
    </main>
  );
}

function RoomHeader({
  view,
  copied,
  setCopied,
}: {
  view: SessionView;
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
      <Link href="/">
        <Logo />
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="font-display text-sm tracking-[0.2em]">{view.code}</Badge>
        {view.phase !== "lobby" && view.roundsTotal > 0 && (
          <Badge>
            Ronda {Math.min(view.roundsDone + 1, view.roundsTotal)}/{view.roundsTotal}
          </Badge>
        )}
        <div className="flex gap-1">
          {view.players.slice(0, 5).map((player) => (
            <Avatar key={player.id} emoji={player.emoji} size="sm" active={player.isActor} />
          ))}
        </div>
        <Button variant="plain" onClick={share} className="px-3 py-2 text-sm">
          {copied ? "¡Copiado!" : "Invitar"}
        </Button>
      </div>
    </header>
  );
}
