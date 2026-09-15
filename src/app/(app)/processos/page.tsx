import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Badge, Card, Tone } from "@/components/ui";
import { BarraFiltros, SeletorOrdem } from "@/components/filtros";
import { BotaoAcao } from "@/components/modal";
import { ler } from "@/lib/db";
import { alternarMonitoramento } from "@/lib/acoes";
import { brlCurto, contem } from "@/lib/util";
import { IconRefresh } from "@/components/icons";

const toneSituacao: Record<string, Tone> = {
  Ativo: "ok",
  Suspenso: "warn",
  Arquivado: "neutral",
  Baixado: "neutral",
};

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const eu = await exigirPagina("processos");
  const podeEditar = pode(eu.perfil, "processos", "editar");
  const b = await ler();
  const chip = sp.situacao ?? "Todos";
  const ordem = sp.ordem ?? "Últimos cadastrados";

  let lista = b.processos.filter((p) => {
    const cliente = b.pessoas.find((x) => x.id === p.clienteId)?.nome ?? "";
    if (!contem([p.pasta, p.numero, p.titulo, p.assunto, p.tribunal, p.orgao, p.contraria, cliente, ...p.marcadores], sp.q ?? "")) return false;
    if (chip === "Ativos") return p.situacao === "Ativo";
    if (chip === "Arquivados") return p.situacao === "Arquivado";
    if (chip === "Monitorados") return p.monitorado;
    return true;
  });

  if (ordem === "Maior valor") lista = [...lista].sort((a, c) => c.valorCausa - a.valorCausa);
  if (ordem === "Cliente") lista = [...lista].sort((a, c) => {
    const na = b.pessoas.find((x) => x.id === a.clienteId)?.nome ?? "";
    const nc = b.pessoas.find((x) => x.id === c.clienteId)?.nome ?? "";
    return na.localeCompare(nc);
  });

  return (
    <>
      <Topbar title="Processos" />
      <main className="p-4 sm:p-6">
        <Card>
          <BarraFiltros
            placeholder="Pesquise por pasta, nº do processo, assunto, tribunal, cliente ou parte contrária"
            chips={["Todos", "Ativos", "Monitorados", "Arquivados"]}
            novoHref={podeEditar ? "/processos/novo" : undefined}
            extra={<SeletorOrdem opcoes={["Últimos cadastrados", "Maior valor", "Cliente"]} />}
          />

          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhum processo encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((p) => {
                const cliente = b.pessoas.find((x) => x.id === p.clienteId);
                const prazos = b.atividades.filter(
                  (a) => a.processoId === p.id && a.situacao !== "Concluída" && a.situacao !== "Cancelada",
                ).length;
                const naoLidos = b.andamentos.filter((a) => a.processoId === p.id && !a.lido).length;

                return (
                  <li key={p.id} className="relative px-5 py-3.5 transition-colors hover:bg-ink-50">
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-ink-950" />
                    <div className="grid gap-4 md:grid-cols-[1.2fr_1.2fr_1fr_120px_130px_80px] md:items-center *:min-w-0">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Cliente</div>
                        <Link href={`/processos/${p.id}`} className="block truncate text-[13px] font-medium hover:text-gold-600 hover:underline">
                          {cliente?.nome ?? "—"}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge>{p.papel}</Badge>
                          {p.marcadores.map((m) => <Badge key={m} tone="gold">{m}</Badge>)}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Processo</div>
                        <Link href={`/processos/${p.id}`} className="block truncate font-mono text-[12px] hover:text-gold-600 hover:underline">
                          {p.numero}
                        </Link>
                        <div className="truncate text-xs text-ink-500">{p.pasta} · {p.titulo}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Órgão</div>
                        <div className="truncate text-[13px]">{p.tribunal}</div>
                        <div className="truncate text-xs text-ink-500">{p.assunto}</div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Valor da causa</div>
                        <div className="text-[13px] tabular-nums">{p.valorCausa ? brlCurto(p.valorCausa) : "—"}</div>
                        <div className="text-[11px] text-ink-500">{p.fase}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 md:justify-end">
                        <Badge tone={toneSituacao[p.situacao]}>{p.situacao}</Badge>
                        {prazos > 0 && <Badge tone="warn">{prazos} prazo{prazos > 1 ? "s" : ""}</Badge>}
                        {naoLidos > 0 && <Badge tone="gold">{naoLidos} novo{naoLidos > 1 ? "s" : ""}</Badge>}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <BotaoAcao permitido={podeEditar}
                          acao={async () => {
                            "use server";
                            await alternarMonitoramento(p.id);
                          }}
                          titulo={p.monitorado ? "Desligar monitoramento" : "Ligar monitoramento"}
                          className={
                            p.monitorado
                              ? "grid h-8 w-8 place-items-center rounded-lg bg-gold-50 text-gold-600"
                              : "grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100"
                          }
                        >
                          <IconRefresh className="h-[18px] w-[18px]" />
                        </BotaoAcao>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
            <span><strong className="text-ink-900">{lista.length}</strong> de {b.processos.length} processos</span>
            <span>{b.processos.filter((p) => p.monitorado).length} monitorados</span>
          </div>
        </Card>
      </main>
    </>
  );
}
