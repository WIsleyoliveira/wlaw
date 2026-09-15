"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import Link from "next/link";

function useParametro() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (chave: string, valor: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (!valor || valor === "Todos" || valor === "Todas") p.delete(chave);
    else p.set(chave, valor);
    router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
  };
}

export function BarraFiltros({
  placeholder,
  chips,
  chaveChip = "situacao",
  novo,
  novoHref,
  extra,
}: {
  placeholder: string;
  chips?: string[];
  chaveChip?: string;
  novo?: React.ReactNode;
  novoHref?: string;
  extra?: React.ReactNode;
}) {
  const params = useSearchParams();
  const definir = useParametro();
  const [busca, setBusca] = useState(params.get("q") ?? "");
  const chipAtivo = params.get(chaveChip) ?? chips?.[0] ?? "";

  useEffect(() => {
    const t = setTimeout(() => definir("q", busca || null), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 px-4 py-3 sm:px-5">
      {novoHref ? (
        <Link
          href={novoHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-950 px-3.5 text-sm font-medium text-white hover:bg-ink-900"
        >
          <IconPlus className="h-4 w-4" /> Novo
        </Link>
      ) : (
        novo
      )}

      <div className="flex h-9 min-w-0 flex-1 basis-full items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 focus-within:border-gold-400 sm:min-w-[240px] sm:basis-0">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
        </svg>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
        />
        {busca && (
          <button onClick={() => setBusca("")} className="text-ink-400 hover:text-ink-900" aria-label="Limpar">✕</button>
        )}
      </div>

      {extra}

      {chips && (
        <div className="scroll-thin flex max-w-full items-center overflow-x-auto rounded-lg border border-ink-200 p-0.5">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => definir(chaveChip, c)}
              className={cx(
                "shrink-0 whitespace-nowrap rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                chipAtivo === c ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SeletorOrdem({ opcoes }: { opcoes: string[] }) {
  const params = useSearchParams();
  const definir = useParametro();
  return (
    <select
      value={params.get("ordem") ?? opcoes[0]}
      onChange={(e) => definir("ordem", e.target.value)}
      className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-[13px] text-ink-700 outline-none focus:border-gold-400"
    >
      {opcoes.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
