"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

function fmt(total: number) {
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function Cronometro() {
  const [segundos, setSegundos] = useState(0);
  const [rodando, setRodando] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rodando) {
      ref.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [rodando]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-ink-200 bg-white px-5 py-4">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-ink-400">Cronômetro</p>
        <p className="font-display text-3xl font-semibold tabular-nums leading-none">{fmt(segundos)}</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant={rodando ? "outline" : "primary"} onClick={() => setRodando((r) => !r)}>
          {rodando ? "Pausar" : "Iniciar"}
        </Button>
        <Button onClick={() => { setRodando(false); setSegundos(0); }} disabled={segundos === 0}>
          Zerar
        </Button>
        <Button variant="gold" disabled={segundos === 0}>
          Lançar {segundos > 0 && fmt(segundos).slice(0, 5)}
        </Button>
      </div>
    </div>
  );
}
