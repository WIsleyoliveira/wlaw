import { exigirPagina } from "@/lib/auth/sessao";
import { pode } from "@/lib/permissoes";
import { Topbar } from "@/components/topbar";
import { Badge, Button, Card, Tone } from "@/components/ui";
import { BarraFiltros, SeletorOrdem } from "@/components/filtros";
import { Modal, BotaoAcao } from "@/components/modal";
import { Campo, Entrada, Selecao } from "@/components/form";
import { IconPlus } from "@/components/icons";
import { ler } from "@/lib/db";
import { criarAtividade, excluirAtividade, mudarSituacaoAtividade } from "@/lib/acoes";
import { atrasado, contem, diasAte, paraData } from "@/lib/util";
import { SITUACOES_ATIVIDADE } from "@/lib/tipos";
import Link from "next/link";

const tone: Record<string, Tone> = {
  Pendente: "warn",
  "Em execução": "gold",
  Revisão: "neutral",
  Concluída: "ok",
  "A confirmar": "neutral",
  Cancelada: "danger",
};

export async function FormAtividade() {
  const b = await ler();
  return (
    <>
      <Campo label="Tipo de tarefa" obrigatorio>
        <Selecao name="tipo" opcoes={b.tiposTarefa.map((t) => t.nome)} />
      </Campo>
      <Campo label="Responsável" obrigatorio>
        <Selecao name="responsavel" opcoes={b.usuarios.filter((u) => u.ativo).map((u) => u.nome)} />
      </Campo>
      <Campo label="Descrição" className="sm:col-span-2">
        <Entrada name="descricao" placeholder="O que precisa ser feito" />
      </Campo>
      <Campo label="Processo vinculado" className="sm:col-span-2">
        <select
          name="processoId"
          className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] outline-none focus:border-gold-400"
        >
          <option value="">Sem vínculo</option>
          {b.processos.map((p) => (
            <option key={p.id} value={p.id}>{p.pasta} — {p.numero}</option>
          ))}
        </select>
      </Campo>
      <Campo label="Data prevista" obrigatorio>
        <Entrada name="prevista" placeholder="dd/mm/aaaa" defaultValue="" />
      </Campo>
      <Campo label="Data fatal" obrigatorio dica="Fica em vermelho quando o prazo passa.">
        <Entrada name="fatal" placeholder="dd/mm/aaaa" />
      </Campo>
      <Campo label="Situação">
        <Selecao name="situacao" opcoes={SITUACOES_ATIVIDADE as unknown as string[]} />
      </Campo>
    </>
  );
}

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const eu = await exigirPagina("atividades");
  const podeEditar = pode(eu.perfil, "atividades", "editar");
  const podeExcluir = pode(eu.perfil, "atividades", "excluir");
  const b = await ler();

  const chip = sp.situacao ?? "Todas";
  const ordem = sp.ordem ?? "Mais urgentes";

  let lista = b.atividades.filter((a) => {
    const p = b.processos.find((x) => x.id === a.processoId);
    const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId)?.nome : "";
    if (!contem([a.identificador, a.tipo, a.descricao, a.responsavel, p?.numero, p?.pasta, cliente], sp.q ?? "")) return false;
    if (chip === "Pendentes") return a.situacao === "Pendente" || a.situacao === "Em execução";
    if (chip === "Atrasadas") return atrasado(a.fatal) && a.situacao !== "Concluída" && a.situacao !== "Cancelada";
    if (chip === "Concluídas") return a.situacao === "Concluída";
    return true;
  });

  lista = [...lista].sort((x, y) =>
    ordem === "Mais recentes"
      ? paraData(y.fatal).getTime() - paraData(x.fatal).getTime()
      : paraData(x.fatal).getTime() - paraData(y.fatal).getTime(),
  );

  return (
    <>
      <Topbar
        title="Atividades"
        tabs={[
          { label: "Lista", href: "/atividades" },
          { label: "Kanban", href: "/atividades/kanban" },
        ]}
      />
      <main className="p-4 sm:p-6">
        <Card>
          <BarraFiltros
            placeholder="Pesquise por identificador, tipo, descrição, responsável, processo ou cliente"
            chips={["Todas", "Pendentes", "Atrasadas", "Concluídas"]}
            extra={<SeletorOrdem opcoes={["Mais urgentes", "Mais recentes"]} />}
            novo={
              <Modal permitido={podeEditar}
                titulo="Nova atividade"
                descricao="Prazos e audiências entram na agenda e no kanban automaticamente."
                acao={criarAtividade}
                rotuloEnviar="Criar atividade"
                gatilho={
                  <Button variant="primary">
                    <IconPlus className="h-4 w-4" /> Nova atividade
                  </Button>
                }
              >
                <FormAtividade />
              </Modal>
            }
          />

          {lista.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-ink-500">
              Nenhuma atividade encontrada com esses filtros.
            </p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {lista.map((a) => {
                const p = b.processos.find((x) => x.id === a.processoId);
                const cliente = p ? b.pessoas.find((x) => x.id === p.clienteId) : null;
                const cor = b.tiposTarefa.find((t) => t.nome === a.tipo)?.cor ?? "#71717a";
                const venceu = atrasado(a.fatal) && a.situacao !== "Concluída" && a.situacao !== "Cancelada";
                const dias = diasAte(a.fatal);

                return (
                  <li key={a.id} className="relative px-5 py-3.5 transition-colors hover:bg-ink-50">
                    <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: cor }} />
                    <div className="grid gap-4 md:grid-cols-[150px_1fr_1fr_140px_150px_60px] md:items-center *:min-w-0">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Prevista</div>
                        <div className="text-[13px] font-medium">{a.prevista}</div>
                        <div className={venceu ? "mt-0.5 text-[11px] font-medium text-danger" : "mt-0.5 text-[11px] text-ink-500"}>
                          Fatal {a.fatal}
                          {venceu ? " · vencido" : dias >= 0 && dias <= 7 ? ` · em ${dias}d` : ""}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Vínculo</div>
                        {p ? (
                          <Link href={`/processos/${p.id}`} className="block truncate font-mono text-[12px] hover:text-gold-600 hover:underline">
                            {p.numero}
                          </Link>
                        ) : (
                          <span className="text-[13px] text-ink-400">Sem processo</span>
                        )}
                        <div className="truncate text-xs text-ink-500">{cliente?.nome ?? "—"}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Tarefa</div>
                        <div className="truncate text-[13px] font-medium">{a.tipo}</div>
                        <div className="truncate text-xs text-ink-500">{a.descricao || "—"}</div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-ink-400">Responsável</div>
                        <div className="truncate text-[13px]">{a.responsavel}</div>
                        <div className="font-mono text-[11px] text-ink-400">{a.identificador}</div>
                      </div>

                      <div className="md:justify-self-end">
                        <Badge tone={tone[a.situacao]}>{a.situacao}</Badge>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        {a.situacao !== "Concluída" && (
                          <BotaoAcao permitido={podeEditar}
                            acao={async () => {
                              "use server";
                              await mudarSituacaoAtividade(a.id, "Concluída");
                            }}
                            titulo="Concluir"
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-emerald-50 hover:text-ok"
                          >
                            ✓
                          </BotaoAcao>
                        )}
                        <BotaoAcao permitido={podeExcluir}
                          acao={async () => {
                            "use server";
                            await excluirAtividade(a.id);
                          }}
                          titulo="Excluir"
                          confirmar={`Excluir a atividade ${a.identificador}?`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                        >
                          ✕
                        </BotaoAcao>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
            <span>
              <strong className="text-ink-900">{lista.length}</strong> de {b.atividades.length} atividades
            </span>
            <span>
              {b.atividades.filter((a) => atrasado(a.fatal) && a.situacao !== "Concluída").length} vencidas
            </span>
          </div>
        </Card>
      </main>
    </>
  );
}
