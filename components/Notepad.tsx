"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "./ui";

/**
 * Libreta privada: el texto y las marcas viajan al servidor pero solo vuelven a
 * quien las escribió. Nadie más en la mesa las ve.
 */
export default function Notepad({
  text,
  onSave,
  title = "Tu libreta",
  hint = "Apunta lo que vas descartando. Solo lo ves tú.",
}: {
  text: string;
  onSave: (value: string) => void;
  title?: string;
  hint?: string;
}) {
  const [value, setValue] = useState(text);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remote = useRef(text);

  useEffect(() => {
    // Si el servidor trae algo distinto (otra pestaña), se respeta.
    if (text !== remote.current) {
      remote.current = text;
      setValue(text);
    }
  }, [text]);

  function change(next: string) {
    setValue(next);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      remote.current = next;
      onSave(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 600);
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b-[3px] border-ink bg-sun px-4 py-2.5">
        <h3 className="font-display text-lg">🔒 {title}</h3>
        <span className="text-[11px] font-extrabold uppercase tracking-widest">
          {saved ? "guardado" : "privada"}
        </span>
      </div>
      <div className="p-4">
        <textarea
          value={value}
          onChange={(e) => change(e.target.value)}
          rows={6}
          placeholder={hint}
          className="w-full resize-y rounded-xl border-[3px] border-ink bg-paper px-3 py-2 font-semibold outline-none placeholder:font-normal placeholder:text-ink-soft/60 focus:bg-white"
        />
      </div>
    </Card>
  );
}
