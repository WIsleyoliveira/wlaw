"use client";

import { useRef, useState } from "react";
import { IconSpark } from "@/components/icons";
import { BotaoIA, TextoIA, lerFluxo } from "@/components/ia";

export function ResumoIA({
  processoId,
  inicial,
}: {
  processoId: string;
  inicial?: { texto: string; geradoEm: string };
}) {
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [geradoEm, setGeradoEm] = useState(inicial?.geradoEm ?? "");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const controle = useRef<AbortController | null>(null);

  async function gerar() {
    const ac = new AbortController();
    controle.current = ac;
    const anterior = { texto, geradoEm };
    setCarregando(true);
    setErro("");
    setTexto("");
    try {
      const r = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processoId, modo: "resumo" }),
        signal: ac.signal,
      });
      if (!r.ok || !r.body) {
        setErro(await r.text());
        setTexto(anterior.texto);
        return;
      }
      await lerFluxo(r, setTexto);
      setGeradoEm(new Date().toISOString());
    } catch {
      if (ac.signal.aborted) {
        setTexto(anterior.texto);
        setGeradoEm(anterior.geradoEm);
      } else {
        setErro("Não consegui falar com a IA local.");
      }
    } finally {
      setCarregando(false);
      controle.current = null;
    }
  }

  return (
    <section className="rounded-card border border-ink-950 bg-ink-950 p-5 text-white">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IconSpark className="h-4 w-4 text-gold-400" />
          <p className="text-[11px] uppercase tracking-[0.12em] text-gold-400">Resumo da IA</p>
        </div>
        {geradoEm && !carregando && (
          <p className="text-[10px] text-white/45">
            {new Date(geradoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        )}
      </div>

      {texto ? (
        <TextoIA texto={texto} className="mt-2.5 text-[13px] leading-relaxed text-white/85" />
      ) : erro ? (
        <p className="mt-2.5 text-[13px] leading-relaxed text-red-300">{erro}</p>
      ) : carregando ? (
        <p className="mt-2.5 flex items-center gap-2 text-[13px] text-white/60">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" /> Lendo andamentos, prazos e intimações…
        </p>
      ) : (
        <p className="mt-2.5 text-[13px] leading-relaxed text-white/70">
          A IA lê andamentos, prazos, intimações e valores deste processo e devolve onde ele está, o próximo
          passo e o principal risco. O resumo fica salvo na ficha.
        </p>
      )}
      {erro && texto && <p className="mt-2 text-[12px] text-red-300">{erro}</p>}

      <div className="mt-4 flex gap-2">
        {carregando ? (
          <button
            onClick={() => controle.current?.abort()}
            className="h-9 flex-1 rounded-lg border border-white/25 text-sm font-semibold text-white hover:bg-white/10"
          >
            Parar
          </button>
        ) : (
          <button
            onClick={gerar}
            className="h-9 flex-1 rounded-lg bg-gold-400 text-sm font-semibold text-ink-950 hover:bg-gold-200"
          >
            {texto ? "Atualizar resumo" : "Gerar resumo"}
          </button>
        )}
        <BotaoIA
          processoId={processoId}
          className="h-9 rounded-lg border border-white/20 px-3 text-sm font-medium text-white hover:bg-white/10"
        >
          Perguntar
        </BotaoIA>
      </div>
    </section>
  );
}
