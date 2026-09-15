"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { Entrada } from "@/components/form";

const botaoIcone =
  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent";

/** Lista editável das fases de um processo. Envia `fases` (várias) e `faseAtual`. */
export function EditorFases({ fases: iniciais, atual }: { fases: string[]; atual: string }) {
  const [fases, setFases] = useState(iniciais);
  const [indiceAtual, setIndiceAtual] = useState(Math.max(0, iniciais.indexOf(atual)));
  const [nova, setNova] = useState("");

  const mover = (i: number, j: number) => {
    const lista = [...fases];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    setFases(lista);
    if (indiceAtual === i) setIndiceAtual(j);
    else if (indiceAtual === j) setIndiceAtual(i);
  };

  const remover = (i: number) => {
    setFases(fases.filter((_, k) => k !== i));
    if (indiceAtual === i) setIndiceAtual(0);
    else if (indiceAtual > i) setIndiceAtual(indiceAtual - 1);
  };

  const adicionar = () => {
    const nome = nova.trim();
    if (!nome || fases.includes(nome)) return;
    setFases([...fases, nome]);
    setNova("");
  };

  return (
    <div className="sm:col-span-2">
      <ol className="space-y-1.5">
        {fases.map((f, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIndiceAtual(i)}
              title="Marcar como fase atual"
              className={cx(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums",
                i === indiceAtual
                  ? "border-gold-400 bg-gold-50 text-gold-600"
                  : "border-ink-200 text-ink-400 hover:border-gold-400",
              )}
            >
              {i + 1}
            </button>
            <Entrada
              name="fases"
              value={f}
              onChange={(e) => setFases(fases.map((x, k) => (k === i ? e.target.value : x)))}
              aria-label={`Fase ${i + 1}`}
            />
            <button type="button" className={botaoIcone} onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label="Subir">↑</button>
            <button type="button" className={botaoIcone} onClick={() => mover(i, i + 1)} disabled={i === fases.length - 1} aria-label="Descer">↓</button>
            <button
              type="button"
              className={cx(botaoIcone, "hover:bg-red-50 hover:text-danger")}
              onClick={() => remover(i)}
              disabled={fases.length === 1}
              aria-label="Remover"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex gap-2 border-t border-ink-200 pt-3">
        <Entrada
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            adicionar();
          }}
          placeholder="Nova fase (ex.: Perícia)"
        />
        <button
          type="button"
          onClick={adicionar}
          className="h-10 shrink-0 rounded-lg border border-ink-200 px-3 text-[13px] font-medium hover:border-gold-400"
        >
          Adicionar
        </button>
      </div>

      <input type="hidden" name="faseAtual" value={fases[indiceAtual] ?? ""} />
      <p className="mt-2 text-[11px] leading-snug text-ink-500">
        Clique no número para marcar a fase em curso. As anteriores aparecem como concluídas.
      </p>
    </div>
  );
}
