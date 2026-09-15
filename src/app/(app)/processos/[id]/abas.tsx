"use client";

import { useState } from "react";
import { cx } from "@/components/ui";

export function Abas({ paineis }: { paineis: { nome: string; conteudo: React.ReactNode }[] }) {
  const [ativa, setAtiva] = useState(paineis[0].nome);
  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-t border-ink-200 px-3">
        {paineis.map((p) => (
          <button
            key={p.nome}
            onClick={() => setAtiva(p.nome)}
            className={cx(
              "relative shrink-0 px-3 py-2.5 text-[13px] font-medium transition-colors",
              ativa === p.nome ? "text-ink-950" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {p.nome}
            {ativa === p.nome && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-gold-400" />}
          </button>
        ))}
      </div>
      <div className="mt-4">{paineis.find((p) => p.nome === ativa)?.conteudo}</div>
    </>
  );
}
