"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { Campo, Secao, Selecao } from "@/components/form";
import { salvarConfig } from "@/lib/acoes";

type StatusIA = {
  online: boolean;
  url: string;
  modelo: string;
  instalado: boolean;
  modelos: { nome: string; tamanho: string; gb: number }[];
};

export function ConfigIA({ modeloAtual }: { modeloAtual: string }) {
  // undefined = verificando; null = falha ao consultar
  const [status, setStatus] = useState<StatusIA | null | undefined>(undefined);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    fetch("/api/ia/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: StatusIA) => vivo && setStatus(s))
      .catch(() => vivo && setStatus(null));
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  const opcoes = status?.modelos.map((m) => m.nome) ?? [];
  if (!opcoes.includes(modeloAtual)) opcoes.unshift(modeloAtual);
  const online = !!status?.online;

  return (
    <form action={salvarConfig}>
      <Card>
        <Secao titulo="Motor de IA" descricao="A IA roda no Ollama, instalado nesta máquina. Nenhum dado de cliente sai do escritório.">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200 px-4 py-3 sm:col-span-2">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">
                {status === undefined ? "Verificando o Ollama…" : online ? `Ollama conectado em ${status!.url}` : "Ollama fora do ar"}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-500">
                {status === undefined ? " " : online ? (
                  `${status!.modelos.length} modelos de texto instalados.`
                ) : (
                  <>Abra o aplicativo do Ollama ou rode <code className="font-mono">ollama serve</code> no terminal.</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {status !== undefined && (
                <Badge tone={online ? (status!.instalado ? "ok" : "warn") : "danger"}>
                  {online ? (status!.instalado ? "Pronto" : "Modelo ausente") : "Offline"}
                </Badge>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setStatus(undefined);
                  setTentativa((t) => t + 1);
                }}
              >
                Verificar
              </Button>
            </div>
          </div>

          <Campo
            label="Modelo de linguagem"
            className="sm:col-span-2"
            dica="Usado no chat, no resumo do processo e na leitura de intimações. Modelos maiores erram menos, mas respondem mais devagar e ocupam mais memória."
          >
            <Selecao name="modeloIA" key={opcoes.join("|")} defaultValue={modeloAtual} opcoes={opcoes} />
          </Campo>

          {online && !status!.instalado && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-warn sm:col-span-2">
              O modelo <strong>{modeloAtual}</strong> não está instalado. Rode{" "}
              <code className="font-mono">ollama pull {modeloAtual}</code> ou escolha outro da lista.
            </p>
          )}

          {online && status!.modelos.length > 0 && (
            <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200 sm:col-span-2">
              {status!.modelos.map((m) => (
                <li key={m.nome} className="flex items-center justify-between gap-3 px-3 py-2 text-[12px]">
                  <span className="font-mono">{m.nome}</span>
                  <span className="text-ink-500">
                    {m.tamanho && `${m.tamanho} parâmetros · `}{m.gb} GB
                    {m.nome === modeloAtual && <Badge tone="gold" >em uso</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="O que a IA faz — e o que não faz" descricao="Para a equipe saber quando confiar.">
          <ul className="space-y-2 text-[13px] leading-snug text-ink-700 sm:col-span-2">
            <li>
              <strong className="font-medium text-ink-900">Lê a intimação e sugere a peça.</strong> A data fatal é
              calculada pelo Wlaw — dias úteis, feriados cadastrados e recesso —, nunca pelo modelo.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Responde com os dados do sistema.</strong> Datas e
              contagens de dias chegam prontas ao modelo; quando algo não consta, ela diz que não consta.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Não substitui a conferência.</strong> Toda sugestão
              passa pelo advogado antes de virar tarefa.
            </li>
          </ul>
        </Secao>

        <div className="flex justify-end gap-2 px-5 py-4">
          <Button type="submit" variant="primary">Salvar alterações</Button>
        </div>
      </Card>
    </form>
  );
}
