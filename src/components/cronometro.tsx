"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

function fmt(total: number) {
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function Cronometro({
  processos,
  usuarios,
  acao,
}: {
  processos: { id: string; rotulo: string }[];
  usuarios: string[];
  acao: (f: FormData) => Promise<void>;
}) {
  const [segundos, setSegundos] = useState(0);
  const [rodando, setRodando] = useState(false);
  const [lancando, setLancando] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rodando) ref.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [rodando]);

  const minutos = Math.max(1, Math.round(segundos / 60));
  const hhmm = `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-card border border-ink-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-400">Cronômetro</p>
          <p className="font-display text-3xl font-semibold tabular-nums leading-none">{fmt(segundos)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={rodando ? "outline" : "primary"} onClick={() => setRodando((r) => !r)}>
            {rodando ? "Pausar" : "Iniciar"}
          </Button>
          <Button onClick={() => { setRodando(false); setSegundos(0); setLancando(false); }} disabled={segundos === 0}>
            Zerar
          </Button>
          <Button
            variant="gold"
            disabled={segundos === 0}
            onClick={() => { setRodando(false); setLancando(true); }}
          >
            Lançar {segundos > 0 ? fmt(segundos).slice(0, 5) : ""}
          </Button>
        </div>
      </div>

      {lancando && (
        <form
          action={async (dados) => {
            // Data do lançamento = dia em que se clica em salvar, no fuso do escritório.
            dados.set("data", new Date().toLocaleDateString("pt-BR", { timeZone: "America/Belem" }));
            await acao(dados);
            setLancando(false);
            setSegundos(0);
          }}
          className="mt-4 grid gap-3 border-t border-ink-200 pt-4 sm:grid-cols-2 lg:grid-cols-4 *:min-w-0"
        >
          <input type="hidden" name="horas" value={hhmm} />

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-700">Processo</span>
            <select name="processoId" className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
              <option value="">Sem vínculo</option>
              {processos.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-700">Responsável</span>
            <select name="responsavel" className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400">
              {usuarios.map((u) => <option key={u}>{u}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-700">Descrição</span>
            <input name="descricao" placeholder="O que foi feito" className="h-10 w-full rounded-lg border border-ink-200 px-3 text-[13px] outline-none focus:border-gold-400" />
          </label>

          <div className="flex items-end gap-2">
            <label className="flex h-10 items-center gap-2 text-[13px]">
              <input type="checkbox" name="faturavel" defaultChecked className="h-4 w-4 accent-[#b08d3f]" />
              Faturável
            </label>
            <Button type="submit" variant="primary" className="ml-auto">Salvar {minutos} min</Button>
          </div>
        </form>
      )}
    </div>
  );
}
