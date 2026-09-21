"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import type { SessionView } from "@/lib/view";
import { Avatar, Badge, Button, Card } from "./ui";

const TIME_OPTIONS = [60, 90, 120, 180];
const ROUND_OPTIONS = [1, 2, 3, 4];

export default function Lobby({
  view,
  act,
  busy,
}: {
  view: SessionView;
  act: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const isHost = view.you?.isHost ?? false;
  const missing = Math.max(0, view.targetPlayers - view.players.length);
  const canStart = view.players.length >= 2;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${view.code}`
      : `/s/${view.code}`;

  async function copy(kind: "link" | "code") {
    const text = kind === "link" ? shareUrl : view.code;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard can be blocked; the code is visible on screen anyway */
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "¿Quién soy? · CoupleGames",
          text: "Únete a mi sala y adivinemos personajes",
          url: shareUrl,
        });
        return;
      } catch {
        /* user dismissed the share sheet */
      }
    }
    void copy("link");
  }

  function toggleCategory(id: CategoryId) {
    const current = view.settings.categories;
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    if (!next.length) return;
    void act("settings", { categories: next });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="animate-rise overflow-hidden">
        <div className="relative border-b border-white/10 bg-gradient-to-br from-glow-500/25 to-candy-500/15 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
            Código de la sala
          </p>
          <p className="mt-2 font-mono text-5xl font-black tracking-[0.3em] sm:text-6xl">
            {view.code}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={nativeShare} className="grow sm:grow-0">
              🔗 Compartir enlace
            </Button>
            <Button variant="soft" onClick={() => copy("link")}>
              {copied === "link" ? "¡Copiado!" : "Copiar link"}
            </Button>
            <Button variant="soft" onClick={() => copy("code")}>
              {copied === "code" ? "¡Copiado!" : "Copiar código"}
            </Button>
          </div>
          <p className="mt-3 break-all text-xs text-white/50">{shareUrl}</p>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold tracking-tight">
              En la sala ({view.players.length}/{view.targetPlayers})
            </h3>
            {missing > 0 ? (
              <Badge>Faltan {missing}</Badge>
            ) : (
              <Badge className="border-mint-400/30 bg-mint-400/15 text-mint-400">
                ¡Están todos!
              </Badge>
            )}
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {view.players.map((player) => (
              <li
                key={player.id}
                className="animate-pop flex items-center gap-3 rounded-2xl bg-white/5 p-3"
              >
                <Avatar emoji={player.emoji} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {player.name}
                    {player.id === view.you?.id && (
                      <span className="ml-1 text-xs text-glow-300">(tú)</span>
                    )}
                  </p>
                  <p className="text-xs text-white/45">
                    {player.isHost ? "Anfitrión" : "Jugador"} ·{" "}
                    {player.online ? "conectado" : "ausente"}
                  </p>
                </div>
              </li>
            ))}
            {Array.from({ length: missing }).map((_, i) => (
              <li
                key={`empty-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-white/15 p-3 text-white/35"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 text-xl">
                  ⏳
                </span>
                <p className="text-sm">Esperando…</p>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="animate-rise p-6">
          <h3 className="font-semibold tracking-tight">Configuración</h3>
          <p className="mt-1 text-sm text-white/55">
            {isHost
              ? "Elige de dónde saldrán los personajes."
              : `Lo decide ${view.players.find((p) => p.isHost)?.name ?? "el anfitrión"}.`}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_META.map((category) => {
              const active = view.settings.categories.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={!isHost || busy}
                  onClick={() => toggleCategory(category.id)}
                  className={`rounded-2xl border px-3 py-2 text-sm transition disabled:cursor-default ${
                    active
                      ? "border-glow-400/60 bg-glow-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
                  }`}
                >
                  <span className="mr-1.5">{category.emoji}</span>
                  {category.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                Tiempo por ronda
              </p>
              <div className="mt-2 flex gap-2">
                {TIME_OPTIONS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    disabled={!isHost || busy}
                    onClick={() => act("settings", { roundSeconds: seconds })}
                    className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition ${
                      view.settings.roundSeconds === seconds
                        ? "bg-white text-night-900"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                Rondas por jugador
              </p>
              <div className="mt-2 flex gap-2">
                {ROUND_OPTIONS.map((rounds) => (
                  <button
                    key={rounds}
                    type="button"
                    disabled={!isHost || busy}
                    onClick={() => act("settings", { roundsPerPlayer: rounds })}
                    className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition ${
                      view.settings.roundsPerPlayer === rounds
                        ? "bg-white text-night-900"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {rounds}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {isHost ? (
              <Button
                onClick={() => act("start")}
                disabled={!canStart || busy}
                className="w-full py-4 text-base"
              >
                {busy
                  ? "Buscando personajes en las APIs…"
                  : canStart
                    ? `Empezar partida · ${view.players.length * view.settings.roundsPerPlayer} rondas`
                    : "Necesitas al menos 2 jugadores"}
              </Button>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                Esperando a que el anfitrión empiece la partida…
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold tracking-tight">Cómo se juega</h3>
          <ol className="mt-3 space-y-2 text-sm text-white/60">
            <li>
              <span className="mr-2 text-white/40">1.</span>Por turnos, alguien
              adivina: su personaje aparece en las pantallas del resto, nunca en
              la suya.
            </li>
            <li>
              <span className="mr-2 text-white/40">2.</span>Hace preguntas en voz
              alta y el resto responde con los botones Sí / No / Quizá.
            </li>
            <li>
              <span className="mr-2 text-white/40">3.</span>Puede gastar hasta 3
              pistas (−20 puntos cada una) antes de arriesgar el nombre.
            </li>
            <li>
              <span className="mr-2 text-white/40">4.</span>Acertar rápido da más
              puntos y el resto del grupo también suma por ayudar.
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
