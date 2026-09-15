"use client";

import Link from "next/link";
import { useState } from "react";
import { IconReport } from "@/components/icons";
import { normalizar } from "@/lib/util";

export type GrupoRelatorios = { grupo: string; itens: { nome: string; desc: string; href: string }[] };

export function CatalogoRelatorios({ grupos }: { grupos: GrupoRelatorios[] }) {
  const [busca, setBusca] = useState("");
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  const filtrados = grupos
    .map((g) => ({
      ...g,
      itens: g.itens.filter((it) => {
        const alvo = normalizar(`${g.grupo} ${it.nome} ${it.desc}`);
        return termos.every((t) => alvo.includes(t));
      }),
    }))
    .filter((g) => g.itens.length > 0);

  return (
    <>
      <div className="border-b border-ink-200 px-5 py-3">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 focus-within:border-gold-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar relatório por nome ou área"
            aria-label="Buscar relatório"
            className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="text-ink-400 hover:text-ink-900" aria-label="Limpar busca">
              ✕
            </button>
          )}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-ink-500">Nenhum relatório encontrado para “{busca}”.</p>
      ) : (
        <div className="divide-y divide-ink-200">
          {filtrados.map((g) => (
            <div key={g.grupo} className="px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-display text-[15px] font-semibold">{g.grupo}</h2>
                <span className="gold-rule h-px flex-1" />
                <span className="text-[11px] text-ink-400">
                  {g.itens.length} {g.itens.length === 1 ? "relatório" : "relatórios"}
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-2 *:min-w-0">
                {g.itens.map((it) => (
                  <Link
                    key={it.nome}
                    href={it.href}
                    className="group flex items-start gap-3 rounded-lg border border-ink-200 p-3 text-left transition-colors hover:border-gold-400 hover:bg-gold-50"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-700 group-hover:bg-white group-hover:text-gold-600">
                      <IconReport className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink-950">{it.nome}</span>
                      <span className="block text-xs leading-snug text-ink-500">{it.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
