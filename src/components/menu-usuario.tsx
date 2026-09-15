"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sair, sairDeTodosOsDispositivos, trocarSenha } from "@/lib/auth/acoes";
import { iniciais } from "@/lib/util";

const campo = "h-9 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400";
const item = "flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] hover:bg-ink-100";

export function MenuUsuario({ nome, email, perfil }: { nome: string; email: string; perfil: string }) {
  const [aberto, setAberto] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [estado, acao, pendente] = useActionState(trocarSenha, null);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      window.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative ml-1">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Conta de ${nome}`}
        title={nome}
        className="grid h-8 w-8 place-items-center rounded-full bg-ink-950 text-[11px] font-semibold text-gold-400 hover:ring-2 hover:ring-gold-200"
      >
        {iniciais(nome) || nome.slice(0, 2).toUpperCase()}
      </button>

      {aberto && (
        <div role="menu" className="absolute right-0 top-10 z-50 w-72 rounded-card border border-ink-200 bg-white p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-[13px] font-medium">{nome}</p>
            <p className="truncate text-[12px] text-ink-500">{email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-medium text-gold-600">{perfil}</span>
          </div>
          <div className="my-1 h-px bg-ink-200" />

          {trocando ? (
            <form action={acao} className="space-y-2 px-3 py-2">
              <p className="text-[12px] font-medium text-ink-700">Trocar senha</p>
              <input name="atual" type="password" autoComplete="current-password" placeholder="Senha atual" required className={campo} />
              <input name="nova" type="password" autoComplete="new-password" placeholder="Nova senha (10+ caracteres)" required minLength={10} className={campo} />
              <input name="confirmacao" type="password" autoComplete="new-password" placeholder="Confirme a nova senha" required minLength={10} className={campo} />
              {estado && (
                <p role="alert" className={estado.ok ? "text-[12px] text-ok" : "text-[12px] text-danger"}>
                  {estado.mensagem}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setTrocando(false)} className="h-8 rounded-lg px-3 text-[12px] text-ink-500 hover:bg-ink-100">
                  Fechar
                </button>
                <button type="submit" disabled={pendente} className="h-8 rounded-lg bg-ink-950 px-3 text-[12px] font-medium text-white disabled:opacity-60">
                  {pendente ? "Salvando…" : "Salvar senha"}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" role="menuitem" onClick={() => setTrocando(true)} className={item}>
              Trocar senha
            </button>
          )}

          <form action={sairDeTodosOsDispositivos}>
            <button type="submit" role="menuitem" className={item}>
              Sair de todos os dispositivos
            </button>
          </form>
          <form action={sair}>
            <button type="submit" role="menuitem" className={`${item} font-medium text-danger`}>
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
