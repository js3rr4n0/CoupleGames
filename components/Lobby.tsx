"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import type { SessionView } from "@/lib/view";
import { Avatar, Badge, Button, Card } from "./ui";

const TIME_OPTIONS = [60, 90, 120, 180, 0];
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
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-5">
        <Card className="animate-rise overflow-hidden p-0">
          <div className="border-b-[3px] border-ink bg-sun px-6 py-5">
            <p className="text-xs font-extrabold uppercase tracking-widest">
              Código de la sala
            </p>
            <p className="mt-1 font-display text-5xl tracking-[0.25em] sm:text-6xl">
              {view.code}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="plain" onClick={nativeShare}>
                Compartir enlace
              </Button>
              <Button variant="plain" onClick={() => copy("link")}>
                {copied === "link" ? "¡Copiado!" : "Copiar link"}
              </Button>
              <Button variant="plain" onClick={() => copy("code")}>
                {copied === "code" ? "¡Copiado!" : "Copiar código"}
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-xl">
                En la mesa ({view.players.length}/{view.targetPlayers})
              </h3>
              {missing > 0 ? (
                <Badge>Faltan {missing}</Badge>
              ) : (
                <Badge className="bg-grass">¡Están todos!</Badge>
              )}
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {view.players.map((player) => (
                <li
                  key={player.id}
                  className="animate-pop flex items-center gap-3 rounded-xl border-[3px] border-ink bg-paper px-3 py-2.5"
                >
                  <Avatar emoji={player.emoji} />
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">
                      {player.name}
                      {player.id === view.you?.id && (
                        <span className="ml-1 text-xs font-bold text-ink-soft">
                          (tú)
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                      {player.isHost ? "Anfitrión" : "Jugador"}
                      {!player.online && " · ausente"}
                    </p>
                  </div>
                </li>
              ))}
              {Array.from({ length: missing }).map((_, i) => (
                <li
                  key={`empty-${i}`}
                  className="flex items-center gap-3 rounded-xl border-[3px] border-dashed border-ink/35 px-3 py-2.5 text-ink-soft"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl border-[3px] border-dashed border-ink/35 text-xl">
                    ⏳
                  </span>
                  <p className="font-bold">Esperando…</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="p-5" tone="paper">
          <h3 className="font-display text-lg">Cómo se juega</h3>
          <ol className="mt-3 space-y-2 text-sm font-semibold">
            <li className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-white font-display text-xs">
                1
              </span>
              Por turnos alguien adivina: su personaje sale en las pantallas del
              resto, nunca en la suya.
            </li>
            <li className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-white font-display text-xs">
                2
              </span>
              Escribe la pregunta (o dila en voz alta) y el grupo contesta con
              los botones Sí / No / Quizá.
            </li>
            <li className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-white font-display text-xs">
                3
              </span>
              Hasta 6 pistas por ronda, a −15 puntos cada una. El tiempo puede
              ser ilimitado (∞).
            </li>
            <li className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-white font-display text-xs">
                4
              </span>
              Acertar rápido da más puntos y el resto también suma por ayudar.
            </li>
            <li className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-white font-display text-xs">
                5
              </span>
              ¿No os convence la carta? El grupo puede cambiarla por otra del
              mismo mazo, de otro, o elegir entre tres. Quien adivina nunca las
              ve.
            </li>
          </ol>
        </Card>
      </div>

      <Card className="animate-rise overflow-hidden p-0">
        <div className="border-b-[3px] border-ink bg-grape px-6 py-4 text-white">
          <h3 className="font-display text-2xl">Preparar partida</h3>
          <p className="text-sm font-semibold opacity-90">
            {isHost
              ? "Elige de qué mazos saldrán los personajes."
              : `Lo decide ${view.players.find((p) => p.isHost)?.name ?? "el anfitrión"}.`}
          </p>
        </div>

        <div className="p-6">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
            Mazos
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORY_META.map((category) => {
              const active = view.settings.categories.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={!isHost || busy}
                  onClick={() => toggleCategory(category.id)}
                  className={`press rounded-xl border-[3px] border-ink px-3 py-2 text-sm font-extrabold disabled:cursor-default ${
                    active
                      ? `${category.chip} shadow-hard-sm`
                      : "bg-white text-ink-soft opacity-60"
                  }`}
                >
                  <span className="mr-1.5">{category.emoji}</span>
                  {category.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
                Tiempo por ronda
              </p>
              <div className="mt-2 flex gap-2">
                {TIME_OPTIONS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    disabled={!isHost || busy}
                    onClick={() => act("settings", { roundSeconds: seconds })}
                    title={seconds === 0 ? "Sin límite de tiempo" : `${seconds} segundos`}
                    className={`press h-11 flex-1 rounded-lg border-[3px] border-ink font-display text-sm ${
                      view.settings.roundSeconds === seconds
                        ? "bg-ink text-white"
                        : "bg-white"
                    }`}
                  >
                    {seconds === 0 ? "∞" : `${seconds}s`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
                Rondas por jugador
              </p>
              <div className="mt-2 flex gap-2">
                {ROUND_OPTIONS.map((rounds) => (
                  <button
                    key={rounds}
                    type="button"
                    disabled={!isHost || busy}
                    onClick={() => act("settings", { roundsPerPlayer: rounds })}
                    className={`press h-11 flex-1 rounded-lg border-[3px] border-ink font-display text-sm ${
                      view.settings.roundsPerPlayer === rounds
                        ? "bg-ink text-white"
                        : "bg-white"
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
                className="w-full py-4 text-lg"
              >
                {busy
                  ? "Repartiendo personajes…"
                  : canStart
                    ? `Empezar · ${view.players.length * view.settings.roundsPerPlayer} rondas`
                    : "Faltan jugadores"}
              </Button>
            ) : (
              <p className="rounded-xl border-[3px] border-dashed border-ink/35 p-4 text-center font-bold text-ink-soft">
                Esperando a que el anfitrión reparta…
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
