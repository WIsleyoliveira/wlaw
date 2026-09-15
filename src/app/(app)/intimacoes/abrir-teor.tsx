"use client";

import { useState, useTransition } from "react";
import { abrirTeorAviso } from "@/lib/captura/acoes";

/** Abrir o teor via MNI registra a ciência no tribunal: exige confirmação explícita. */
export function AbrirTeor({ intimacaoId }: { intimacaoId: string }) {
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          const confirmado = window.confirm(
            "Abrir o teor no tribunal registra a ciência desta intimação HOJE, e o prazo passa a correr. Deseja continuar?",
          );
          if (!confirmado) return;
          iniciar(async () => {
            const r = await abrirTeorAviso(intimacaoId);
            setMensagem(r?.mensagem ?? null);
          });
        }}
        className="h-8 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[13px] font-medium text-warn hover:border-amber-400 disabled:opacity-50"
      >
        {pendente ? "Abrindo…" : "Abrir teor"}
      </button>
      {mensagem && <span className="basis-full text-right text-[11px] text-ink-500">{mensagem}</span>}
    </>
  );
}
