"use client";

import { useEffect, useRef, useState } from "react";
import { Button, cx } from "@/components/ui";

export function Modal({
  titulo,
  descricao,
  gatilho,
  acao,
  rotuloEnviar = "Salvar",
  largura = "max-w-lg",
  children,
  permitido = true,
}: {
  titulo: string;
  descricao?: string;
  gatilho: React.ReactNode;
  acao: (f: FormData) => Promise<void>;
  rotuloEnviar?: string;
  largura?: string;
  children: React.ReactNode;
  /** Falso quando o perfil não pode usar a ação: o gatilho nem aparece. */
  permitido?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  if (!permitido) return null;

  return (
    <>
      <span onClick={() => setAberto(true)} className="contents">
        {gatilho}
      </span>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="fixed inset-0 bg-ink-950/30" onClick={() => setAberto(false)} />
          <div className={cx("relative w-full rounded-card border border-ink-200 bg-white shadow-2xl", largura)}>
            <header className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
              <div>
                <h2 className="font-display text-[17px] font-semibold tracking-tight">{titulo}</h2>
                {descricao && <p className="mt-0.5 text-[12px] text-ink-500">{descricao}</p>}
              </div>
              <button
                onClick={() => setAberto(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </header>

            <form
              ref={form}
              action={async (dados) => {
                setEnviando(true);
                await acao(dados);
                setEnviando(false);
                setAberto(false);
                form.current?.reset();
              }}
            >
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 *:min-w-0">{children}</div>
              <footer className="flex justify-end gap-2 border-t border-ink-200 px-5 py-3.5">
                <Button type="button" onClick={() => setAberto(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={enviando}>
                  {enviando ? "Salvando…" : rotuloEnviar}
                </Button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** Botão que dispara uma server action sem formulário visível. */
export function BotaoAcao({
  acao,
  children,
  className,
  titulo,
  confirmar,
  permitido = true,
  desativado = false,
}: {
  acao: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  titulo?: string;
  confirmar?: string;
  /** Falso: o botão não aparece. */
  permitido?: boolean;
  /** Verdadeiro: aparece, mas só para leitura (ex.: trilha de fases para quem não edita). */
  desativado?: boolean;
}) {
  const [ocupado, setOcupado] = useState(false);
  if (!permitido) return null;
  return (
    <button
      type="button"
      title={titulo}
      disabled={ocupado || desativado}
      onClick={async () => {
        if (desativado) return;
        if (confirmar && !window.confirm(confirmar)) return;
        setOcupado(true);
        await acao();
        setOcupado(false);
      }}
      className={cx(className, ocupado && "opacity-50")}
    >
      {children}
    </button>
  );
}
