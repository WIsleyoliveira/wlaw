"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { Campo, Entrada, Selecao } from "@/components/form";
import { IconAlert, IconSpark } from "@/components/icons";

type Sugestao = {
  peca: string;
  tipo: string;
  resumo: string;
  providencia: string;
  trecho: string;
  urgente: boolean;
  dias: number | null;
  uteis: boolean;
  origem: "teor" | "lei" | "data" | "nenhum";
  fundamento: string;
  fatal: string;
  prevista: string;
  avisos: string[];
  modelo: string;
};

const chip = "rounded-full bg-white/10 px-2 py-0.5 text-[11px]";

export function Classificador({
  intimacaoId,
  publicacao,
  descricao,
  tipos,
  usuarios,
  acao,
}: {
  intimacaoId: string;
  publicacao: string;
  descricao: string;
  tipos: string[];
  usuarios: string[];
  acao: (f: FormData) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function classificar() {
    setCarregando(true);
    setErro("");
    try {
      const r = await fetch("/api/ia/classificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intimacaoId }),
      });
      const j = await r.json();
      if (j.erro) setErro(j.erro);
      else setSugestao(j.sugestao);
    } catch {
      setErro("Não consegui falar com a IA local.");
    } finally {
      setCarregando(false);
    }
  }

  function abrir() {
    setAberto(true);
    if (!sugestao && !carregando) classificar();
  }

  const prazo = !sugestao
    ? ""
    : sugestao.dias !== null
      ? `${sugestao.dias} dias ${sugestao.uteis ? "úteis" : "corridos"}`
      : sugestao.origem === "data"
        ? "ato com data marcada"
        : "sem prazo";

  return (
    <>
      <Button size="sm" variant="gold" onClick={abrir}>
        <IconSpark className="h-4 w-4" /> Processar
      </Button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="fixed inset-0 bg-ink-950/30" onClick={() => setAberto(false)} />
          <div className="relative w-full max-w-xl rounded-card border border-ink-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
              <div>
                <h2 className="font-display text-[17px] font-semibold tracking-tight">Processar intimação</h2>
                <p className="mt-0.5 text-[12px] text-ink-500">{descricao} · publicada em {publicacao}</p>
              </div>
              <button onClick={() => setAberto(false)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label="Fechar">✕</button>
            </header>

            <div className="border-b border-ink-200 bg-ink-950 px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <IconSpark className="h-4 w-4 text-gold-400" />
                  <span className="text-[11px] uppercase tracking-[0.12em] text-gold-400">Leitura pela IA local</span>
                  {sugestao && <span className="text-[10px] text-white/40">· {sugestao.modelo}</span>}
                </div>
                <button
                  onClick={classificar}
                  disabled={carregando}
                  className="h-8 rounded-lg bg-gold-400 px-3 text-[13px] font-semibold text-ink-950 hover:bg-gold-200 disabled:opacity-60"
                >
                  {carregando ? "Lendo o teor…" : sugestao ? "Ler de novo" : "Classificar com IA"}
                </button>
              </div>

              {carregando && !sugestao && (
                <p className="mt-3 flex items-center gap-2 text-[12px] text-white/60">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" />
                  Identificando a peça e contando o prazo…
                </p>
              )}

              {sugestao && (
                <div className="mt-3 space-y-2.5">
                  {sugestao.providencia && <p className="text-[14px] font-medium leading-snug text-gold-200">{sugestao.providencia}</p>}
                  {sugestao.resumo && <p className="text-[13px] leading-relaxed text-white/80">{sugestao.resumo}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={chip}>{sugestao.peca}</span>
                    <span className={chip}>{prazo}</span>
                    {sugestao.fatal && <span className={chip}>fatal {sugestao.fatal}</span>}
                    {sugestao.urgente && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-semibold text-ink-950">urgente</span>}
                  </div>
                  <p className="text-[12px] leading-snug text-white/60">{sugestao.fundamento}</p>
                  {sugestao.trecho && (
                    <blockquote className="border-l-2 border-gold-400/60 pl-3 text-[12px] italic leading-snug text-white/65">
                      “{sugestao.trecho}”
                    </blockquote>
                  )}
                  {sugestao.avisos.length > 0 && (
                    <ul className="space-y-1">
                      {sugestao.avisos.map((a) => (
                        <li key={a} className="flex gap-1.5 text-[12px] leading-snug text-amber-200">
                          <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {!sugestao && !carregando && !erro && (
                <p className="mt-2 text-[12px] leading-snug text-white/60">
                  A IA lê o teor e sugere a peça cabível. A data fatal é calculada pelo Wlaw — dias úteis,
                  feriados cadastrados e recesso —, não pelo modelo. Você confere e confirma.
                </p>
              )}

              {erro && <p className="mt-2 text-[12px] text-red-300">{erro}</p>}
            </div>

            <form
              action={async (dados) => {
                await acao(dados);
                setAberto(false);
              }}
            >
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 *:min-w-0">
                <Campo label="Tipo de tarefa" obrigatorio>
                  <Selecao name="tipo" key={sugestao?.tipo} defaultValue={sugestao?.tipo} opcoes={tipos} />
                </Campo>
                <Campo label="Responsável" obrigatorio>
                  <Selecao name="responsavel" opcoes={usuarios} />
                </Campo>
                <Campo label="Data prevista" obrigatorio dica="Fatal menos a margem de segurança, em dias úteis.">
                  <Entrada name="prevista" key={`p${sugestao?.prevista}`} defaultValue={sugestao?.prevista} placeholder="dd/mm/aaaa" required />
                </Campo>
                <Campo label="Data fatal" obrigatorio dica="Feriados locais só contam se cadastrados em Configurações.">
                  <Entrada name="fatal" key={`f${sugestao?.fatal}`} defaultValue={sugestao?.fatal} placeholder="dd/mm/aaaa" required />
                </Campo>
                <Campo label="Descrição da tarefa" className="sm:col-span-2">
                  <Entrada name="descricao" key={sugestao?.providencia} defaultValue={sugestao?.providencia || sugestao?.resumo || descricao} />
                </Campo>
              </div>

              <footer className="flex items-center justify-between gap-2 border-t border-ink-200 px-5 py-3.5">
                {sugestao?.urgente ? <Badge tone="danger">urgente</Badge> : <span />}
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setAberto(false)}>Cancelar</Button>
                  <Button type="submit" variant="primary">Criar tarefa e dar baixa</Button>
                </div>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
