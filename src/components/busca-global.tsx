"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function BuscaGlobal() {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const campo = useRef<HTMLInputElement>(null);

  // ⌘K no Mac, Ctrl+K no Windows/Linux: foca a busca de qualquer tela.
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        campo.current?.focus();
        campo.current?.select();
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valor.trim()) return;
        router.push(`/processos?q=${encodeURIComponent(valor.trim())}`);
        campo.current?.blur();
      }}
      className="mx-auto hidden w-full max-w-md items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 focus-within:border-gold-400 lg:flex"
    >
      <button type="submit" aria-label="Buscar" className="shrink-0">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
        </svg>
      </button>
      <input
        ref={campo}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && campo.current?.blur()}
        placeholder="Buscar processo, cliente, prazo…"
        aria-label="Busca global"
        className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
      />
      <kbd className="rounded border border-ink-200 px-1.5 text-[10px] text-ink-400">⌘K</kbd>
    </form>
  );
}
