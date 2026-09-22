"use client";

import { useState } from "react";
import type { RuleSection } from "@/lib/engine/types";
import { Button, Card } from "./ui";

export function RulesList({ rules }: { rules: RuleSection[] }) {
  return (
    <div className="space-y-4">
      {rules.map((section) => (
        <div key={section.title}>
          <h4 className="font-display text-lg">{section.title}</h4>
          <ul className="mt-1 space-y-1.5">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm font-semibold text-ink-soft">
                <span className="text-ink">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function RulesButton({
  name,
  emoji,
  rules,
}: {
  name: string;
  emoji: string;
  rules: RuleSection[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="plain"
        className="px-3 py-2 text-sm"
        onClick={() => setOpen(true)}
        title="Ver las reglas"
      >
        📖 <span className="hidden sm:inline">Reglas</span>
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
          onClick={() => setOpen(false)}
        >
          <Card
            className="animate-pop max-h-[85vh] w-full max-w-lg overflow-hidden p-0"
            >
            <div className="flex items-center justify-between border-b-[3px] border-ink bg-grape px-5 py-3 text-white">
              <h3 className="font-display text-2xl">
                {emoji} {name}
              </h3>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="font-bold">
                ✕
              </button>
            </div>
            <div
              className="scroll-soft max-h-[70vh] overflow-y-auto p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <RulesList rules={rules} />
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
