"use client";

import { useEffect, useState } from "react";

/**
 * The server sends the seconds left on every poll; between polls the clock keeps
 * ticking locally from the moment that value arrived.
 */
export function useCountdown(secondsLeft: number, active: boolean) {
  const [left, setLeft] = useState(secondsLeft);

  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();
    const tick = () =>
      setLeft(
        Math.max(0, secondsLeft - Math.round((Date.now() - startedAt) / 1000)),
      );
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [secondsLeft, active]);

  return left;
}

export function TimerBox({
  left,
  total,
  unlimited = false,
}: {
  left: number;
  total: number;
  unlimited?: boolean;
}) {
  const ratio = unlimited ? 1 : total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const urgent = !unlimited && left <= 10;

  return (
    <div
      className={`w-[5.5rem] shrink-0 overflow-hidden rounded-xl border-[3px] border-ink shadow-hard-sm ${
        urgent ? "animate-tick bg-tomato text-white" : "bg-white text-ink"
      }`}
    >
      <p className="pt-1.5 text-center font-display text-4xl leading-none tabular-nums">
        {unlimited ? "∞" : left}
      </p>
      <p className="pb-1.5 text-center text-[10px] font-extrabold uppercase tracking-widest opacity-70">
        {unlimited ? "sin prisa" : "segundos"}
      </p>
      <div className="h-3 border-t-[3px] border-ink bg-paper-2">
        <div
          className={`h-full ${urgent ? "bg-tomato" : "bg-grass"}`}
          style={{ width: `${ratio * 100}%`, transition: "width 1s linear" }}
        />
      </div>
    </div>
  );
}
