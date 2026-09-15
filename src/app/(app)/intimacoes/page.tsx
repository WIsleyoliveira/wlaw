import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Badge, Card, Tone } from "@/components/ui";
import { BarraFiltros } from "@/components/filtros";
import { BotaoAcao } from "@/components/modal";
import { Classificador } from "./classificador";
import { AbrirTeor } from "./abrir-teor";
import { ler } from "@/lib/db";
import { arquivarIntimacao, processarIntimacao } from "@/lib/acoes";
import { contem } from "@/lib/util";

const tone: Record<string, Tone> = { Pendente: "warn", Processada: "ok", Arquivada: "neutral" };

export default async function IntimacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const eu = await exigirPagina("intimacoes");
  const podeEditar = pode(eu.perfil, "intimacoes", "editar");
  const b = await ler();
  const chip = sp.situacao ?? "Todas";
  const tipos = b.tiposTarefa.map((t) => t.nome);
  const usuarios = b.usuarios.filter((u) => u.ativo).map((u) => u.nome);

  const lista = b.intimacoes.filter((i) => {
    const p = b.processos.find((x) => x.id === i.processoId);
    const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId)?.nome : "";
    if (!contem([i.numero, i.descricao, i.teor, cliente, p?.pasta], sp.q ?? "")) return false;
    if (chip !== "Todas") return i.situacao === chip.replace("Pendentes", "Pendente").replace("Processadas", "Processada").replace("Arquivadas", "Arquivada");
    return true;
  });

  const pendentes = b.intimacoes.filter((i) => i.situacao === "Pendente").length;

  return (
    <>
      <Topbar title="Intimações" />
      <main className="p-4 sm:p-6">
        <Card>
          <BarraFiltros
            placeholder="Pesquise pela descrição, teor, processo ou cliente"
            chips={["Todas", "Pendentes", "Processadas", "Arquivadas"]}
          />

          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">Nenhuma intimação encontrada.</p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((i) => {
                const p = b.processos.find((x) => x.id === i.processoId);
                const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId) : null;
                return (
                  <li key={i.id} className="relative px-5 py-4 transition-colors hover:bg-ink-50">
                    <span className={`absolute inset-y-0 left-0 w-[3px] ${p ? "bg-gold-400" : "bg-danger"}`} />
                    <div className="grid gap-4 lg:grid-cols-[140px_1fr_240px] lg:items-start *:min-w-0">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Disponibilização</div>
                        <div className="text-[13px] font-medium">{i.disponibilizacao}</div>
                        <div className="mt-0.5 text-[11px] text-ink-500">Publicação {i.publicacao}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {p ? (
                            <Link href={`/processos/${p.id}`} className="font-mono text-[12px] font-medium hover:text-gold-600 hover:underline">
                              {i.numero}
                            </Link>
                          ) : (
                            <>
                              <span className="font-mono text-[12px]">{i.numero}</span>
                              <Badge tone="danger">Processo não localizado</Badge>
                            </>
                          )}
                          <span className="text-xs text-ink-500">{cliente?.nome ?? ""}</span>
                        </div>
                        <p className="mt-1 text-[13px] font-medium">{i.descricao}</p>
                        {(i.origem === "djen" || i.origem === "mni" || i.link || i.canceladaEm) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {i.origem === "djen" && <Badge tone="gold">DJEN</Badge>}
                            {i.origem === "mni" && <Badge tone="gold">PJe · MNI</Badge>}
                            {i.canceladaEm && <Badge tone="danger">Cancelada na origem</Badge>}
                            {i.link && (
                              <a href={i.link} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-gold-600 hover:underline">
                                Ver documento no tribunal ↗
                              </a>
                            )}
                          </div>
                        )}
                        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-500">{i.teor}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Badge tone={tone[i.situacao]}>{i.situacao}</Badge>
                        {podeEditar && i.origem === "mni" && i.teor.startsWith("Teor ainda não aberto") && <AbrirTeor intimacaoId={i.id} />}
                        {/* Aviso do MNI sem teor aberto: não há texto para a IA ler. */}
                        {podeEditar && i.situacao === "Pendente" && !(i.origem === "mni" && i.teor.startsWith("Teor ainda não aberto")) && (
                          <Classificador
                            intimacaoId={i.id}
                            publicacao={i.publicacao}
                            descricao={i.descricao}
                            tipos={tipos}
                            usuarios={usuarios}
                            acao={async (f) => {
                              "use server";
                              await processarIntimacao(i.id, f);
                            }}
                          />
                        )}
                        <BotaoAcao permitido={podeEditar}
                          acao={async () => {
                            "use server";
                            await arquivarIntimacao(i.id);
                          }}
                          className="h-8 rounded-lg border border-ink-200 px-2.5 text-[13px] font-medium text-ink-700 hover:border-ink-400"
                        >
                          {i.situacao === "Arquivada" ? "Reabrir" : "Arquivar"}
                        </BotaoAcao>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
            <span><strong className="text-ink-900">{lista.length}</strong> de {b.intimacoes.length} intimações</span>
            <span>{pendentes} pendentes</span>
          </div>
        </Card>
      </main>
    </>
  );
}
