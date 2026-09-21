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

export function TimerRing({
  left,
  total,
  size = 92,
}: {
  left: number;
  total: number;
  size?: number;
}) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const urgent = left <= 10;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? "#fb7185" : "#a78bfa"}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <span
        className={`absolute text-xl font-bold tabular-nums ${urgent ? "text-rose-300" : "text-white"}`}
      >
        {left}
      </span>
    </div>
  );
}
